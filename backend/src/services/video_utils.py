import subprocess
import os

def gravar_video_evento(ip, user, password, nome_arquivo, duracao=15):
    """
    GRAVAÇÃO VIA FFMPEG 
    - Garante compatibilidade com navegadores (H.264).
    - Mais leve para o servidor.
    """
    
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    pasta_destino = os.path.join(base_dir, "static", "videos")
    os.makedirs(pasta_destino, exist_ok=True)
    
    caminho_completo = os.path.join(pasta_destino, nome_arquivo)
    
    rtsp_url = f"rtsp://{user}:{password}@{ip}:554/cam/realmonitor?channel=1&subtype=0"
    
    comando = [
        "ffmpeg",
        "-y",                     # Sobrescreve se existir
        "-t", str(duracao),       # Duração em segundos
        "-rtsp_transport", "tcp", # Usa TCP para não falhar a imagem
        "-i", rtsp_url,           # Entrada
        "-c:v", "libx264",        # CODEC OBRIGATÓRIO PARA CHROME/WEB
        "-preset", "ultrafast", # Grava rápido
        "-movflags", "+faststart",
        "-an",                    # Remove áudio (opcional, evita erros de sync)
        caminho_completo
    ]
    
    try:
        subprocess.Popen(comando, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        print(f" (FFmpeg) Iniciada gravação: {nome_arquivo}")
    except FileNotFoundError:
        print("ERRO: FFmpeg não encontrado. Verifique se instalou no Dockerfile!")
    except Exception as e:
        print(f"Erro ao iniciar gravação: {e}")
