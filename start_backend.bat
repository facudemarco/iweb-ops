@echo off
echo Starting iWeb Ops Center Backend...
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
pause
