import docker
import logging

try:
    client = docker.from_env()
except Exception as e:
    logging.error(f"Error connecting to Docker: {e}")
    client = None

def get_containers():
    if not client:
        return []
    
    containers = client.containers.list(all=True)
    results = []
    for c in containers:
        results.append({
            "id": c.id[:12],
            "short_id": c.short_id,
            "name": c.name,
            "image": c.image.tags[0] if c.image.tags else c.image.id[:12],
            "status": c.status,
            "state": c.attrs['State']
        })
    return results

def calculate_cpu_percent(d):
    try:
        cpu_count = len(d["cpu_stats"]["cpu_usage"]["percpu_usage"])
        cpu_percent = 0.0
        cpu_delta = float(d["cpu_stats"]["cpu_usage"]["total_usage"]) - \
                    float(d["precpu_stats"]["cpu_usage"]["total_usage"])
        system_delta = float(d["cpu_stats"]["system_cpu_usage"]) - \
                       float(d["precpu_stats"]["system_cpu_usage"])
        if system_delta > 0.0:
            cpu_percent = cpu_delta / system_delta * 100.0 * cpu_count
        return cpu_percent
    except KeyError:
        return 0.0

def get_container_details(container_id):
    if not client:
        return None
    try:
        container = client.containers.get(container_id)
        stats = container.stats(stream=False)
        
        # CPU
        cpu_usage = calculate_cpu_percent(stats)
        
        # Memory
        mem_usage = stats["memory_stats"].get("usage", 0)
        mem_limit = stats["memory_stats"].get("limit", 0)
        mem_percent = (mem_usage / mem_limit * 100.0) if mem_limit > 0 else 0.0
        
        # Network I/O (sum of all networks)
        net_rx = 0
        net_tx = 0
        if "networks" in stats:
            for net in stats["networks"].values():
                net_rx += net["rx_bytes"]
                net_tx += net["tx_bytes"]
        
        return {
            "id": container.id,
            "name": container.name,
            "status": container.status,
            "metrics": {
                "cpu_percent": round(cpu_usage, 2),
                "memory_usage_mb": round(mem_usage / (1024*1024), 2),
                "memory_limit_mb": round(mem_limit / (1024*1024), 2),
                "memory_percent": round(mem_percent, 2),
                "net_rx_mb": round(net_rx / (1024*1024), 2),
                "net_tx_mb": round(net_tx / (1024*1024), 2),
            },
            "logs": container.logs(tail=200).decode('utf-8', errors='ignore')
        }
    except Exception as e:
        logging.error(f"Error fetching stats for {container_id}: {e}")
        return None

def perform_action(container_id, action):
    if not client:
        return False
    try:
        container = client.containers.get(container_id)
        if action == "start":
            container.start()
        elif action == "stop":
            container.stop()
        elif action == "restart":
            container.restart()
        return True
    except Exception as e:
        logging.error(f"Error performing {action} on {container_id}: {e}")
        return False

def update_container_resources(container_id, memory_mb: int = 0, cpu_quota: float = 0):
    """
    Hot update container resources.
    memory_mb: Memory limit in MB
    cpu_quota: CPU quota (1.0 = 1 CPU)
    """
    if not client:
        return False
    try:
        container = client.containers.get(container_id)
        
        kwargs = {}
        if memory_mb:
            kwargs["mem_limit"] = f"{memory_mb}m"
        
        # Docker API update takes nano_cpus or cpu_quota/period
        # Here we simplify: if cpu_quota is passed, we treat it as portion of CPU
        # standard period is 100000 microseconds
        if cpu_quota:
            # cpu_quota of 100000 = 1 CPU
            # So if input is 1.5 (1.5 CPUs), quota should be 150000
            quota_val = int(cpu_quota * 100000)
            kwargs["cpu_quota"] = quota_val
        
        if kwargs:
            container.update(**kwargs)
            return True
        return False
    except Exception as e:
        logging.error(f"Error updating resources for {container_id}: {e}")
        return False
