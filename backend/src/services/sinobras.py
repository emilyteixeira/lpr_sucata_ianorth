import os
import requests
import urllib3

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

def consultar_truck_arrival(placa: str):
    """
    Consome o endpoint /TruckArrival da Sinobras
    """
    
    base_url = os.getenv("SINOBRAS_API_URL") 
    api_key = os.getenv("SINOBRAS_API_KEY")  
    
    if not base_url or not api_key:
        print("ERRO: Variáveis SINOBRAS_API_URL ou SINOBRAS_API_KEY não configuradas.")
        return None

    url = f"{base_url}/TruckArrival"
    headers = {
        "X-API-KEY": api_key,
        "Content-Type": "application/json"
    }
    params = {
        "plate": placa
    }

    print(f" [SINOBRAS] Consultando Placa {placa} em {url}")

    try:
        response = requests.get(url, headers=headers, params=params, verify=False, timeout=10)
        
        if response.status_code == 200:
            dados = response.json()
            print(f"[SINOBRAS] Sucesso: Ticket {dados.get('ticket')}")
            return dados
        elif response.status_code == 404:
            print(f"[SINOBRAS] Placa {placa} não tem chegada registrada (404).")
            return None
        elif response.status_code == 401:
            print("[SINOBRAS] Erro de Autenticação (401). Verifique a API KEY.")
            return None
        else:
            print(f"[SINOBRAS] Erro desconhecido: {response.status_code} - {response.text}")
            return None

    except Exception as e:
        print(f"[SINOBRAS] Erro de Conexão: {e}")
        return None
