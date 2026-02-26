import requests
from requests.auth import HTTPDigestAuth
import os
from datetime import datetime

def salvar_snapshot_camera(ip, user, password, placa, nome_fixo=None):
    """
    Conecta na câmera, baixa o snapshot e salva na pasta estática.
    Se nome_fixo for passado, usa ele. Se não, gera um automático.
    """
    url = f"http://{ip}/cgi-bin/snapshot.cgi?channel=1&subtype=0"
    
    try:
        response = requests.get(url, auth=HTTPDigestAuth(user, password), timeout=10)
        
        if response.status_code == 200:
            base_dir = os.path.dirname(os.path.abspath(__file__))
            destino_dir = os.path.join(base_dir, "..", "static", "snapshots")
            
            os.makedirs(destino_dir, exist_ok=True)
            
            if nome_fixo:
                nome_arquivo = nome_fixo
            else:
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                nome_arquivo = f"{placa}_{timestamp}.jpg"
            
            caminho_arquivo = os.path.join(destino_dir, nome_arquivo)
            
            with open(caminho_arquivo, "wb") as f:
                f.write(response.content)
                
            print(f" Snapshot salvo: {nome_arquivo}")
            
            return caminho_arquivo
            
        else:
            print(f" Erro ao obter snapshot: Status {response.status_code}")
            return None

    except Exception as e:
        print(f" Exceção ao capturar snapshot: {e}")
        return None
