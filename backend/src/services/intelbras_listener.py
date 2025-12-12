import requests
from requests.auth import HTTPDigestAuth
import re
import time
import threading

class IntelbrasLPRListener:
    def __init__(self, ip, user, password, callback):
        self.ip = ip
        self.user = user
        self.password = password
        self.callback = callback
        self.running = False

    def start(self):
        self.running = True
        t = threading.Thread(target=self._loop)
        t.daemon = True
        t.start()
        print(f" Câmera {self.ip} - Monitoramento Iniciado.")

    def stop(self):
        self.running = False

    def _loop(self):
        url = f"http://{self.ip}/cgi-bin/eventManager.cgi?action=attach&codes=TrafficSnap&heartbeat=5"
        while self.running:
            try:
                with requests.get(url, auth=HTTPDigestAuth(self.user, self.password), stream=True, timeout=70) as r:
                    if r.status_code != 200:
                        time.sleep(5)
                        continue
                    print(f" Conectado em {self.ip}")
                    for line in r.iter_lines():
                        if not self.running: break
                        if line:
                            decoded = line.decode('utf-8', errors='ignore')
                            if "PlateNumber" in decoded:
                                match = re.search(r'PlateNumber(?:":\s*|:|=)(["\w]+)', decoded)
                                if match:
                                    self.callback(match.group(1).replace('"', '').strip(), f"Cam-{self.ip}")
            except:
                time.sleep(5)
