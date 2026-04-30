import requests
from requests.auth import HTTPDigestAuth
import re
import time
import threading
import json

class IntelbrasLPRListener:
    def __init__(self, ip, user, password, callback):
        self.ip = ip
        self.user = user
        self.password = password
        self.callback = callback
        self.running = False
        
        self.ultima_placa = None
        self.ultimo_horario = 0

    def start(self):
        self.running = True
        t = threading.Thread(target=self._loop)
        t.daemon = True
        t.start()
        print(f"📡 Câmera {self.ip} - Monitoramento Iniciado.")

    def stop(self):
        self.running = False

    def _loop(self):
        url = f"http://{self.ip}/cgi-bin/eventManager.cgi?action=attach&codes=[All]&heartbeat=5"
        
        print(f" Conectando com Anti-Duplicidade: {url}")

        while self.running:
            try:
                with requests.get(url, auth=HTTPDigestAuth(self.user, self.password), stream=True, timeout=120) as r:
                    if r.status_code != 200:
                        print(f" Erro conexão {self.ip}: Status {r.status_code}. Tentando novamente...")
                        time.sleep(5)
                        continue
                    
                    print(f" CONEXÃO ESTÁVEL! Aguardando veículos...")
                    
                    buffer = ""

                    for line in r.iter_lines():
                        if not self.running: break
                        
                        if line:
                            decoded = line.decode('utf-8', errors='ignore').strip()
                            
                            if any(x in decoded for x in ["Heartbeat", "--myboundary", "Content-Type", "Content-Length"]):
                                continue

                            buffer += decoded

                            if "Plate" in buffer or "Number" in buffer:
                                
                                if '"PlateNumber" : ""' in buffer or '"PlateNumber":""' in buffer:
                                    if len(buffer) > 1000: buffer = ""
                                    continue

                                match = re.search(r'PlateNumber"?:?\s*"?\s*[:=]\s*"?([A-Z0-9]{7})"?', buffer)
                                if not match:
                                    match = re.search(r'Number"?:?\s*"?\s*[:=]\s*"?([A-Z0-9]{7})"?', buffer)

                                if match:
                                    placa = match.group(1)
                                    agora = time.time()

                                    if placa == self.ultima_placa and (agora - self.ultimo_horario) < 30:
                                        buffer = "" 
                                        continue
                                    
                                    print(f" SUCESSO! NOVA PLACA: {placa}")
                                    self.callback(placa, f"Cam-{self.ip}", self.user, self.password)
                                    
                                    self.ultima_placa = placa
                                    self.ultimo_horario = agora
                                    buffer = "" 
                            
                            if len(buffer) > 5000: buffer = ""

            except Exception as e:
                print(f"Conexão caiu: {e}. Reconectando...")
                time.sleep(5)
