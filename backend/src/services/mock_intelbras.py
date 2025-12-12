import threading
import time
import random

class MockIntelbrasListener:
    def __init__(self, ip, user, password, callback):
        self.callback = callback
        self.running = False

    def start(self):
        self.running = True
        threading.Thread(target=self._loop, daemon=True).start()
        print("MOCK CAMERA - Simulador Iniciado.")

    def stop(self):
        self.running = False

    def _loop(self):
        placas = ["SNO-2025", "ABC-1234", "IAN-001", "TEST-999"]
        while self.running:
            time.sleep(random.randint(5, 10))
            self.callback(random.choice(placas), "Camera-Simulada")
