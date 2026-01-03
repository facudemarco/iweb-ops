# Deployment Guide for iWeb Ops Center

This guide assumes you have a Linux VPS (Ubuntu/Debian) with Docker and Docker Compose installed.

## 1. Prepare your Files
You need to upload the project to your VPS. You can use `scp` (Secure Copy) or Git.

### Option A: Using SCP (Easiest for local folder)
Run this command from your local terminal (PowerShell or CMD) in the project root:

```powershell
# Replace user@your-vps-ip with your actual VPS login
scp -r . user@your-vps-ip:~/iweb-ops
```

## 2. Connect to your VPS
SSH into your server:
```powershell
ssh user@your-vps-ip
cd iweb-ops
```

## 3. Launch with Docker Compose
Run the following command to build and start the containers in the background:

```bash
docker compose up -d --build
```

## 4. Verification
- Access the dashboard at `http://your-vps-ip:3000`.
- Verify the backend is running by checking logs: `docker compose logs -f backend`.

## Troubleshooting
- **Permission Denied (Docker)**: If the backend says "permission denied" for `/var/run/docker.sock`, ensure the database/backend container has access or run with `user: root` in docker-compose (not recommended for prod but works for testing) OR add your user to the docker group.
- **Firewall**: Ensure ports `3000` and `8000` are open in your VPS firewall (UFW/AWS Security Groups).
