from fastapi import FastAPI, HTTPException, Request, Response, Depends, status, APIRouter
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from contextlib import asynccontextmanager
import logging
from typing import Annotated
from sqlite3 import Connection
import sqlite3
import os
import psutil
import time
from typing import Optional, Dict, Any
import docker
import threading

# Docker client
DOCKER = docker.from_env()

# Local imports
from monitor import get_system_metrics, check_health
from docker_manager import (
    get_containers, 
    get_container_details, 
    perform_action, 
    update_container_resources
)
from alerts import AlertDaemon

# Setup Logging
logging.basicConfig(level=logging.INFO)

# Global Daemon Reference
alert_daemon = AlertDaemon()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    alert_daemon.start()
    yield
    # Shutdown
    alert_daemon.stop()

app = FastAPI(title="iWeb Ops Center API", lifespan=lifespan)

# CORS
app.add_middleware(
    CORSMiddleware,
    # In production, specify exact origin to allow cookies
    allow_origins=["http://localhost:3000", "https://ops.iwebtecnology.com"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Auth Models & Credentials
ADMIN_USER = "admin"
ADMIN_PASS = "iweb2026"
COOKIE_NAME = "iweb_session"

class LoginRequest(BaseModel):
    username: str
    password: str

class ContainerAction(BaseModel):
    action: str # start, stop, restart

class ContainerUpdate(BaseModel):
    memory_mb: int | None = None
    cpu_quota: float | None = None

# Configuración de base de datos
DB_FILE = "metrics.db"

def init_db():
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    # Tabla Host
    c.execute('''CREATE TABLE IF NOT EXISTS host_metrics 
                 (ts INTEGER, cpu REAL, ram REAL, disk REAL)''')
    # Tabla Contenedores
    c.execute('''CREATE TABLE IF NOT EXISTS container_metrics 
                 (ts INTEGER, name TEXT, cpu REAL, ram REAL, rx REAL, tx REAL)''')
    conn.commit()
    conn.close()

# --- INICIO BLOQUE DE FUNCIONES DOCKER ---

def _container_mem_pct(stat: Dict[str, Any]) -> float:
    # Calcula porcentaje de uso de RAM basado en Usage vs Limit
    mem = stat.get("memory_stats", {})
    usage = float(mem.get("usage", 0.0))
    limit = float(mem.get("limit", 0.0)) or 1.0
    return (usage / limit) * 100.0

def _container_cpu_pct(stat: Dict[str, Any]) -> float:
    # Calcula porcentaje de CPU usando los deltas de Docker stats
    cpu = stat.get("cpu_stats", {})
    precpu = stat.get("precpu_stats", {})

    # Delta de uso total
    cpu_delta = cpu.get("cpu_usage", {}).get("total_usage", 0) - precpu.get("cpu_usage", {}).get("total_usage", 0)
    # Delta de uso del sistema
    sys_delta = cpu.get("system_cpu_usage", 0) - precpu.get("system_cpu_usage", 0)

    if sys_delta <= 0 or cpu_delta <= 0:
        return 0.0

    # Ajuste por cantidad de cores online
    online_cpus = cpu.get("online_cpus") or len(cpu.get("cpu_usage", {}).get("percpu_usage") or []) or 1
    return (cpu_delta / sys_delta) * online_cpus * 100.0

def _get_containers_snapshot():
    out = []
    # DOCKER debe estar definido arriba como: DOCKER = docker.from_env()
    try:
        container_list = DOCKER.containers.list(all=True)
    except Exception as e:
        print(f"Error conectando con Docker: {e}")
        return []

    for c in container_list:
        # Info básica
        info = {
            "id": c.id[:12], 
            "name": c.name, 
            "status": c.status, 
            "image": (c.image.tags[0] if c.image.tags else "untagged")
        }
        
        try:
            # Stats snapshot (stream=False es vital para que no se quede colgado)
            stat = c.stats(stream=False)
            
            info["cpu_pct"] = round(_container_cpu_pct(stat), 2)
            info["mem_pct"] = round(_container_mem_pct(stat), 2)

            mem_usage = stat.get("memory_stats", {}).get("usage", 0)
            mem_limit = stat.get("memory_stats", {}).get("limit", 0)
            
            # Convertimos Bytes a MB
            info["mem_usage_mb"] = round(mem_usage / (1024 * 1024), 1)
            info["mem_limit_mb"] = round(mem_limit / (1024 * 1024), 1) if mem_limit else 0

            # Red (Suma de todas las interfaces)
            net = stat.get("networks", {}) or {}
            rx = sum(v.get("rx_bytes", 0) for v in net.values())
            tx = sum(v.get("tx_bytes", 0) for v in net.values())
            
            info["rx_mb"] = round(rx / (1024 * 1024), 2)
            info["tx_mb"] = round(tx / (1024 * 1024), 2)
            
        except Exception:
            # Si el contenedor está apagado o falla stats, rellenamos con 0
            info.update({
                "cpu_pct": 0.0, "mem_pct": 0.0, 
                "mem_usage_mb": 0.0, "mem_limit_mb": 0.0, 
                "rx_mb": 0.0, "tx_mb": 0.0
            })

        out.append(info)
    
    # Ordenamos: los que más RAM consumen primero
    out.sort(key=lambda x: x.get("mem_usage_mb", 0), reverse=True)
    return out

# --- FIN BLOQUE DE FUNCIONES ---

def _save_metrics_snapshot():
    """Guarda una foto del estado actual en DB"""
    ts = int(time.time())
    
    # 1. Host Stats
    host_mem = psutil.virtual_memory()
    disk = psutil.disk_usage("/")
    load = psutil.getloadavg()[0] if hasattr(psutil, "getloadavg") else 0
    
    # Nota: psutil.cpu_percent necesita un intervalo o haber sido llamado antes
    host_cpu = psutil.cpu_percent(interval=None) 

    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    
    c.execute("INSERT INTO host_metrics VALUES (?, ?, ?, ?)", 
              (ts, host_cpu, host_mem.percent, disk.percent))
    
    # 2. Container Stats
    containers = _get_containers_snapshot() # Tu función existente
    for cont in containers:
        c.execute("INSERT INTO container_metrics VALUES (?, ?, ?, ?, ?, ?)",
                  (ts, cont['name'], cont.get('cpu_pct', 0), cont.get('mem_pct', 0), 
                   cont.get('rx_mb', 0), cont.get('tx_mb', 0)))
    
    conn.commit()
    conn.close()

# Modificamos tu loop de alertas para que TAMBIÉN guarde datos
def _background_task_loop():
    while True:
        try:
            # 1. Chequear Alertas (tu lógica actual)
            # ... (tu código de alertas va aquí) ...
            
            # 2. Guardar Métricas Históricas
            _save_metrics_snapshot()
            
        except Exception as e:
            print(f"Error bg loop: {e}")
            
        time.sleep(60) # Guardamos cada 60 segundos

@app.on_event("startup")
def startup():
    init_db()
    t = threading.Thread(target=_background_task_loop, daemon=True)
    t.start()

# NUEVO ENDPOINT PARA GRAFICOS
@app.get("/api/history/{metric_type}")
def get_history(metric_type: str, range: str = "1h", container: Optional[str] = None):
    """
    range: 1h, 24h, 7d, 30d, 90d, 1y
    """
    now = int(time.time())
    
    # Calcular ventana de tiempo
    seconds_map = {
        "1h": 3600,
        "24h": 86400,
        "7d": 604800,
        "30d": 2592000,
        "3m": 7776000,
        "6m": 15552000,
        "1y": 31536000
    }
    delta = seconds_map.get(range, 3600)
    start_ts = now - delta
    
    # Agrupación (Downsampling) para no explotar el frontend con 1 millón de puntos
    # Si es 1h -> Raw data (cada 1 min)
    # Si es 1y -> Promedio por día
    group_by = ""
    if range in ["1h", "24h"]:
        group_by = "" # Sin agrupar, mandamos cada minuto
    elif range == "7d":
        group_by = "GROUP BY (ts / 3600)" # Agrupar por hora
    else:
        group_by = "GROUP BY (ts / 86400)" # Agrupar por día

    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    
    data = []
    
    if metric_type == "host":
        query = f"""
        SELECT 
            avg(ts) as timestamp, 
            avg(cpu) as cpu, 
            avg(ram) as ram 
        FROM host_metrics 
        WHERE ts > ? 
        {group_by} 
        ORDER BY ts ASC
        """
        c.execute(query, (start_ts,))
        rows = c.fetchall()
        data = [{"ts": r["timestamp"], "cpu": r["cpu"], "ram": r["ram"]} for r in rows]
        
    elif metric_type == "container" and container:
        query = f"""
        SELECT 
            avg(ts) as timestamp, 
            avg(cpu) as cpu, 
            avg(ram) as ram,
            avg(rx) as rx,
            avg(tx) as tx
        FROM container_metrics 
        WHERE ts > ? AND name = ?
        {group_by} 
        ORDER BY ts ASC
        """
        c.execute(query, (start_ts, container))
        rows = c.fetchall()
        data = [{"ts": r["timestamp"], "cpu": r["cpu"], "ram": r["ram"], "rx": r["rx"], "tx": r["tx"]} for r in rows]

    conn.close()
    return data

# Dependencies
def get_current_user(request: Request):
    session = request.cookies.get(COOKIE_NAME)
    if session != "valid_session_token":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    return session

# --- API ROUTER DEFINITION ---
api_router = APIRouter()

# Routes: Auth
@api_router.post("/auth/login")
def login(creds: LoginRequest, response: Response, request: Request):
    if creds.username == ADMIN_USER and creds.password == ADMIN_PASS:
        # Determine if we should set secure cookie based on header or origin
        is_secure = request.url.scheme == "https" or "https" in request.headers.get("origin", "")
        
        response.set_cookie(
            key=COOKIE_NAME, 
            value="valid_session_token", 
            httponly=True, 
            samesite="lax",
            secure=True # Always secure for prod on https
        )
        return {"message": "Login successful"}
    raise HTTPException(status_code=401, detail="Invalid credentials")

@api_router.post("/auth/logout")
def logout(response: Response):
    response.delete_cookie(COOKIE_NAME)
    return {"message": "Logged out"}

@api_router.get("/auth/me")
def check_auth(user: str = Depends(get_current_user)):
    return {"status": "authenticated", "user": ADMIN_USER}

# Routes: Host (Protected by Depends)
@api_router.get("/host/stats")
def get_host_stats(user: str = Depends(get_current_user)):
    return get_system_metrics()

@api_router.get("/host/health")
def get_host_health(user: str = Depends(get_current_user)):
    return check_health()

# Routes: Containers (Protected)
@api_router.get("/containers")
def list_containers(user: str = Depends(get_current_user)):
    return get_containers()

@api_router.get("/containers/{container_id}")
def container_details(container_id: str, user: str = Depends(get_current_user)):
    details = get_container_details(container_id)
    if not details:
        raise HTTPException(status_code=404, detail="Container not found")
    return details

@api_router.post("/containers/{container_id}/action")
def do_container_action(container_id: str, body: ContainerAction, user: str = Depends(get_current_user)):
    success = perform_action(container_id, body.action)
    if not success:
        raise HTTPException(status_code=500, detail="Action failed")
    return {"status": "success"}

@api_router.post("/containers/{container_id}/update")
def update_container(container_id: str, body: ContainerUpdate, user: str = Depends(get_current_user)):
    success = update_container_resources(container_id, body.memory_mb or 0, body.cpu_quota or 0.0)
    if not success:
        raise HTTPException(status_code=500, detail="Update failed")
    return {"status": "success"}

# --- MOUNT ROUTER TWICE ---
# 1. Mount with /api prefix (Desired behavior)
app.include_router(api_router, prefix="/api")

# 2. Mount at root (Fallback for Nginx stripping prefix)
app.include_router(api_router)

@app.get("/")
def read_root():
    return {"message": "iWeb Ops Center API is running"}
