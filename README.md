# iWeb Ops Center

Una plataforma ligera de observabilidad y orquestación de contenedores (Docker Dashboard).

## Características
- **Monitoreo en Tiempo Real**: CPU, RAM, Disco y Carga del sistema host.
- **Gestión de Contenedores**: Listado, Start/Stop/Restart y Logs.
- **Hot-Update**: Actualización dinámica de límites de recursos (CPU/RAM).
- **Alertas**: Notificaciones a Telegram si se superan umbrales de seguridad.

## Requisitos
- Windows / Linux / Mac
- Python 3.10+
- Node.js 18+
- Docker Desktop (ejecutándose localmente para gestionar los contenedores)

## Instalación y Ejecución (Local)

El proyecto está configurado para ejecutarse directamente en el host (sin contenedores para la propia app).

### 1. Backend (API)
Usa el script automático:
```bash
start_backend.bat
```
O manualmente:
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```
La API estará disponible en `http://localhost:8000`.

### 2. Frontend (Dashboard)
Usa el script automático:
```bash
start_frontend.bat
```
O manualmente:
```bash
cd frontend
npm install
npm run dev
```
El panel estará disponible en `http://localhost:3000`.

## Configuración
Para activar las alertas de Telegram, crea un archivo `.env` en la carpeta `backend/` con:
```env
TELEGRAM_BOT_TOKEN=tu_token
TELEGRAM_CHAT_ID=tu_chat_id
```