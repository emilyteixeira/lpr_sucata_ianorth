import requests
from requests.auth import HTTPDigestAuth
import os
from datetime import datetime

def salvar_snapshot_camera(ip, user, password, placa):

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    nome_arquivo = f"{placa}_{timestamp}.jpg"

    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    pasta_destino = os.path.join(base_dir, "static", "snapshots")

    os.makedirs(pasta_destino, exist_ok=True)

    caminho_completo = os.path.join(pasta_destino, nome_arquivo)

    url_snapshot = f"http://{ip}/cgi-bin/snapshot.cgi"

    try:
        print(f"Baixando foto de {placa}...")
        response = requests.get(
            url_snapshot, 
            auth=HTTPDigestAuth(user, password), 
            timeout=5
        )

        if response.status_code == 200:
            with open(caminho_completo, 'wb') as f:
                f.write(response.content)

            print(f"Foto salva em: {caminho_completo}")

            return f"/imagens/snapshots/{nome_arquivo}"
    
        else:
            print(f"Erro HTTP ao baixar foto: {response.status_code}")
            return None
    except Exception as e:
        print(f"Erro de conexão ao baixar o snapshot: {e}")
        return None
