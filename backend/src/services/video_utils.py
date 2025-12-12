import cv2
import threading
import os
import time

def gravar_video_evento(ip, user, password, nome_arquivo, duracao=15):


    def _gravar():
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        pasta_destino = os.path.join(base_dir, "static", "videos")
        os.makedirs(pasta_destino, exist_ok=True)
        
        caminho_completo = os.path.join(pasta_destino, nome_arquivo)
        
        rtsp_url = f"rtsp://{user}:{password}@{ip}:554/cam/realmonitor?channel=1&subtype=1"
        
        print(f" Iniciando gravação: {nome_arquivo}...")
        
        cap = cv2.VideoCapture(rtsp_url)
        
        if not cap.isOpened():
            print(f" Erro ao abrir vídeo RTSP: {ip}")
            return

        fps = cap.get(cv2.CAP_PROP_FPS) or 25
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        
        fourcc = cv2.VideoWriter_fourcc(*'mp4v')
        out = cv2.VideoWriter(caminho_completo, fourcc, fps, (width, height))
        
        inicio = time.time()
        
        while int(time.time() - inicio) < duracao:
            ret, frame = cap.read()
            if not ret:
                print(" Perda de pacote ou fim do stream.")
                break
            out.write(frame)
            
        cap.release()
        out.release()
        print(f" Vídeo salvo com sucesso: {nome_arquivo}")

    threading.Thread(target=_gravar).start()
