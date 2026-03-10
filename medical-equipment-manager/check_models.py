import urllib.request
import json

API_KEY = "PEGA_AQUI_TU_API_KEY"  # <-- pon tu key aqui

url = f"https://generativelanguage.googleapis.com/v1beta/models?key={API_KEY}"
req = urllib.request.Request(url)
with urllib.request.urlopen(req) as resp:
    data = json.loads(resp.read())

print("\nModelos disponibles que soportan generateContent:\n")
for m in data.get("models", []):
    if "generateContent" in m.get("supportedGenerationMethods", []):
        print(" ✅", m["name"])
