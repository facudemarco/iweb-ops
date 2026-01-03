import docker
import time
import logging

try:
    client = docker.from_env()
except Exception as e:
    print(f"Error connecting to Docker: {e}")
    exit(1)

def create_test_containers():
    print("🚀 Setting up Test Environment...")

    # Define test containers
    containers = [
        {
            "name": "iweb-nginx-proxy",
            "image": "nginx:alpine",
            "ports": {'80/tcp': 8081},
            "mem_limit": "256m"
        },
        {
            "name": "iweb-redis-cache",
            "image": "redis:alpine",
            "mem_limit": "128m"
        },
        {
            "name": "iweb-worker-load",
            "image": "alpine",
            "command": "sh -c 'while true; do :; done'", # Infinite loop to generate some CPU load
            "mem_limit": "64m",
            "cpu_quota": 50000 # 0.5 CPU
        }
    ]

    for c in containers:
        try:
            # Remove existing if any
            try:
                old = client.containers.get(c["name"])
                print(f"Removing existing {c['name']}...")
                old.remove(force=True)
            except docker.errors.NotFound:
                pass

            print(f"Starting {c['name']}...")
            client.containers.run(
                c["image"],
                name=c["name"],
                detach=True,
                ports=c.get("ports"),
                mem_limit=c.get("mem_limit"),
                cpu_quota=c.get("cpu_quota"),
                command=c.get("command"),
                restart_policy={"Name": "on-failure"}
            )
        except Exception as e:
            print(f"Failed to start {c['name']}: {e}")

    print("✅ Test containers are running!")

if __name__ == "__main__":
    create_test_containers()
