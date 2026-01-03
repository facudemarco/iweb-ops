import psutil
import os

def get_system_metrics():
    """
    Returns a dictionary with host system metrics:
    - RAM (total, used, percent)
    - Disk (total, used, percent)
    - Load Average (1m, 5m, 15m)
    - CPU Usage (%)
    """
    # Memory
    mem = psutil.virtual_memory()
    
    # Disk (usage of root /)
    # On Windows, path should be 'C:\\' or similar if specific, but psutil.disk_usage('/') usually works or checks current drive
    try:
        disk = psutil.disk_usage(os.path.abspath(os.sep))
    except Exception:
        disk = psutil.disk_usage('/')

    # Load Average
    # maintain compatibility with Windows (psutil.getloadavg works on Unix, might need fallback or alternative on Windows)
    try:
        load_avg = psutil.getloadavg()
    except AttributeError:
        # Windows doesn't have load avg in the same way, we can simulate or return 0s
        # Or use cpu_percent as a proxy for "load" in this simple context
        load_avg = (0.0, 0.0, 0.0)

    # CPU Percent
    cpu_percent = psutil.cpu_percent(interval=None)

    return {
        "memory": {
            "total_gb": round(mem.total / (1024**3), 2),
            "used_gb": round(mem.used / (1024**3), 2),
            "percent": mem.percent
        },
        "disk": {
            "total_gb": round(disk.total / (1024**3), 2),
            "used_gb": round(disk.used / (1024**3), 2),
            "percent": disk.percent
        },
        "load_avg": load_avg,
        "cpu_percent": cpu_percent
    }

def check_health(threshold_ram=85.0, threshold_disk=90.0):
    metrics = get_system_metrics()
    status = "Healthy"
    issues = []

    if metrics["memory"]["percent"] > threshold_ram:
        status = "Critical"
        issues.append("High Memory Usage")
    
    if metrics["disk"]["percent"] > threshold_disk:
        status = "Critical"
        issues.append("High Disk Usage")

    return {
        "status": status,
        "issues": issues,
        "metrics": metrics
    }
