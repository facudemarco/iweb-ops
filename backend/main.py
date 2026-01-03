from fastapi import FastAPI, HTTPException, Request, Response, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from contextlib import asynccontextmanager
import logging
from typing import Annotated

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

app = FastAPI(title="iWeb Ops Center API", lifespan=lifespan, prefix="/api")

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

# Dependencies
def get_current_user(request: Request):
    session = request.cookies.get(COOKIE_NAME)
    if session != "valid_session_token":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    return session

# Routes: Auth
@app.post("/api/auth/login")
def login(creds: LoginRequest, response: Response):
    if creds.username == ADMIN_USER and creds.password == ADMIN_PASS:
        # Secure, simple "token"
        response.set_cookie(
            key=COOKIE_NAME, 
            value="valid_session_token", 
            httponly=True, 
            samesite="lax",
            secure=False # Set True in https
        )
        return {"message": "Login successful"}
    raise HTTPException(status_code=401, detail="Invalid credentials")

@app.post("/api/auth/logout")
def logout(response: Response):
    response.delete_cookie(COOKIE_NAME)
    return {"message": "Logged out"}

@app.get("/api/auth/me")
def check_auth(user: str = Depends(get_current_user)):
    return {"status": "authenticated", "user": ADMIN_USER}

# Routes: Host (Protected by Depends)
@app.get("/api/host/stats")
def get_host_stats(user: str = Depends(get_current_user)):
    return get_system_metrics()

@app.get("/api/host/health")
def get_host_health(user: str = Depends(get_current_user)):
    return check_health()

# Routes: Containers (Protected)
@app.get("/api/containers")
def list_containers(user: str = Depends(get_current_user)):
    return get_containers()

@app.get("/api/containers/{container_id}")
def container_details(container_id: str, user: str = Depends(get_current_user)):
    details = get_container_details(container_id)
    if not details:
        raise HTTPException(status_code=404, detail="Container not found")
    return details

@app.post("/api/containers/{container_id}/action")
def do_container_action(container_id: str, body: ContainerAction, user: str = Depends(get_current_user)):
    success = perform_action(container_id, body.action)
    if not success:
        raise HTTPException(status_code=500, detail="Action failed")
    return {"status": "success"}

@app.post("/api/containers/{container_id}/update")
def update_container(container_id: str, body: ContainerUpdate, user: str = Depends(get_current_user)):
    success = update_container_resources(container_id, body.memory_mb, body.cpu_quota)
    if not success:
        raise HTTPException(status_code=500, detail="Update failed")
    return {"status": "success"}

@app.get("/")
def read_root():
    return {"message": "iWeb Ops Center API is running"}
