import time
import threading
import requests
import logging
import os
from monitor import get_system_metrics
from docker_manager import get_containers, get_container_details

# Configuration
TELEGRAM_BOT_TOKEN = "8411276425:AAEjNtdj-j8kbRK2P04SLx-YHU-3Ffdqs4U"
TELEGRAM_CHAT_ID = "993573885"
CHECK_INTERVAL = 30 # seconds
HOST_RAM_THRESHOLD = 85.0
CONTAINER_RAM_THRESHOLD = 85.0

def send_telegram_alert(message):
    if not TELEGRAM_BOT_TOKEN or not TELEGRAM_CHAT_ID:
        logging.warning("Telegram credentials not set. Alert skipped.")
        print(f"ALERT: {message}")
        return

    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
    payload = {
        "chat_id": TELEGRAM_CHAT_ID,
        "text": f"🚨 **iWeb Ops Alert** 🚨\n\n{message}"
    }
    try:
        requests.post(url, json=payload, timeout=5)
    except Exception as e:
        logging.error(f"Failed to send Telegram alert: {e}")

class AlertDaemon(threading.Thread):
    def __init__(self):
        super().__init__()
        self.daemon = True
        self.running = True

    def run(self):
        logging.info("Alert Daemon started.")
        while self.running:
            try:
                self.check_host()
                self.check_containers()
            except Exception as e:
                logging.error(f"Error in Alert Daemon: {e}")
            
            time.sleep(CHECK_INTERVAL)

    def check_host(self):
        metrics = get_system_metrics()
        ram_percent = metrics["memory"]["percent"]
        if ram_percent > HOST_RAM_THRESHOLD:
            send_telegram_alert(f"HOST RAM Critical: {ram_percent}% used!")

    def check_containers(self):
        # iterate containers and check memory
        # Note: Fetching stats for ALL containers might be slow if there are many.
        containers = get_containers()
        for c in containers:
            if c["state"] == "running":
                details = get_container_details(c["id"])
                if details and details["metrics"]["memory_percent"] > CONTAINER_RAM_THRESHOLD:
                    send_telegram_alert(f"Container {c['name']} RAM Critical: {details['metrics']['memory_percent']}% used!")

    def stop(self):
        self.running = False
