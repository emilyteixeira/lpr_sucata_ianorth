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
        url = f"http://{self.ip}/cgi-bin/eventManager.cgi?action=attach&codes=[All]&heartbeat=5"
        
        print(f" Tentando conectar em: {url}")

        while self.running:
            try:
                with requests.get(url, auth=HTTPDigestAuth(self.user, self.password), stream=True, timeout=120) as r:
                    if r.status_code != 200:
                        print(f" Erro conexão {self.ip}: Status {r.status_code}")
                        time.sleep(5)
                        continue
                    
                    print(f" Conectado com sucesso em {self.ip} (Stream Aberto)")
                    
                    for line in r.iter_lines():
                        if not self.running: break
                        
                        if line:
                            decoded = line.decode('utf-8', errors='ignore')
                            

                            placa_encontrada = None

                            if "PlateNumber" in decoded:
                                match = re.search(r'PlateNumber(?:":\s*|:|=)(["\w]+)', decoded)
                                if match: placa_encontrada = match.group(1).replace('"', '').strip()
                            
                            elif "Number" in decoded and "Plate" in decoded: 
                                match = re.search(r'"Number"\s*:\s*"([\w]+)"', decoded)
                                if match: placa_encontrada = match.group(1)

                            if placa_encontrada and len(placa_encontrada) > 3:
                                print(f" PLACA DETECTADA: {placa_encontrada}")
                                self.callback(placa_encontrada, f"Cam-{self.ip}")

            except Exception as e:
                print(f" Conexão caiu ({self.ip}): {e}. Tentando reconectar em 5s...")
                time.sleep(5)
