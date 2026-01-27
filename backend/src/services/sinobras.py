import os
import requests
import urllib3
from datetime import datetime

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

def consultar_truck_arrival(placa: str, data_iso: str | None = None):
    base_url = os.getenv("SINOBRAS_API_URL") 
    api_key = os.getenv("SINOBRAS_API_KEY")

    if not base_url or not api_key:
        return None

    url = f"{base_url}/TruckArrival"
    headers = { "X-API-KEY": api_key }
    
    if not data_iso:
        data_iso = datetime.now().strftime("%Y-%m-%d")

    params = { 
        "plate": placa,
        "date": data_iso 
    }

    try:
        print(f"Consultando Sinobras: Placa {placa} na data {data_iso}")
            
        response = requests.get(url, headers=headers, params=params, verify=False, timeout=10)

        if response.status_code == 200:
            return response.json()
        elif response.status_code == 404:
            print(f"Sinobras 404: Placa {placa} não encontrada na data {data_iso}")
            return None
        else:
            print(f"Erro Sinobras: {response.status_code} - {response.text}")
            return None

    except Exception as e:
        print(f"Erro de conexão: {e}")
        return None
