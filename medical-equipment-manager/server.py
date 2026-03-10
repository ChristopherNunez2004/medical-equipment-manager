"""
server.py — Mini servidor para el proyecto Mantenimiento Predictivo
Ejecutar: python server.py
Luego abrir: http://localhost:3000
"""

import http.server
import json
import os
import ssl
import urllib.request
import urllib.error
from http.server import SimpleHTTPRequestHandler

API_KEY = os.getenv("GROQ_API_KEY")
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
MODEL    = "llama-3.3-70b-versatile"

class Handler(SimpleHTTPRequestHandler):

    def log_message(self, format, *args):
        print(f"  {self.address_string()} → {format % args}")

    def do_OPTIONS(self):
        self.send_response(200)
        self._cors()
        self.end_headers()

    def do_POST(self):
        if self.path == "/api/claude":
            self._proxy_groq()
        else:
            self.send_response(404)
            self.end_headers()

    def _proxy_groq(self):
        try:
            length      = int(self.headers.get("Content-Length", 0))
            body        = json.loads(self.rfile.read(length))
            system_text = body.get("system", "")
            messages    = body.get("messages", [])

            groq_messages = []
            if system_text:
                groq_messages.append({"role": "system", "content": system_text})
            for msg in messages:
                groq_messages.append({
                    "role":    msg["role"],
                    "content": msg["content"]
                })

            groq_body = json.dumps({
                "model":       MODEL,
                "messages":    groq_messages,
                "max_tokens":  1000,
                "temperature": 0.7
            }).encode()

            ctx = ssl.create_default_context()
            opener = urllib.request.build_opener(
                urllib.request.HTTPSHandler(context=ctx)
            )

            req = urllib.request.Request(
                GROQ_URL,
                data=groq_body,
                headers={
                    "Content-Type":  "application/json",
                    "Authorization": f"Bearer {API_KEY}",
                    "User-Agent":    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                    "Accept":        "application/json",
                    "Origin":        "https://console.groq.com"
                },
                method="POST"
            )

            with opener.open(req) as resp:
                groq_data = json.loads(resp.read())

            reply_text = (
                groq_data
                .get("choices", [{}])[0]
                .get("message", {})
                .get("content", "Sin respuesta")
            )

            response_body = json.dumps({
                "content": [{"type": "text", "text": reply_text}]
            }).encode()

            self.send_response(200)
            self._cors()
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(response_body)
            print("  ✅ Respuesta de Groq enviada al navegador")

        except urllib.error.HTTPError as e:
            err = e.read().decode()
            print(f"  ❌ Error Groq API: {e.code} — {err}")
            self.send_response(e.code)
            self._cors()
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(err.encode())

        except Exception as e:
            print(f"  ❌ Error interno: {e}")
            self.send_response(500)
            self._cors()
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(e)}).encode())

    def _cors(self):
        self.send_header("Access-Control-Allow-Origin",  "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")


if __name__ == "__main__":
    PORT = 3000
    os.chdir(os.path.dirname(os.path.abspath(__file__)))

    print("=" * 52)
    print("  🏥 Servidor Mantenimiento Predictivo")
    print(f"  🌐 http://localhost:{PORT}")
    print(f"  🤖 Modelo: Llama 3.3 70B via Groq (gratuito)")
    print(f"  🔑 API Key: {'configurada ✅' if API_KEY != 'PEGA_AQUI_TU_API_KEY_DE_GROQ' else '⚠️  FALTA CONFIGURAR'}")
    print("  Ctrl+C para detener")
    print("=" * 52)

    if API_KEY == "PEGA_AQUI_TU_API_KEY_DE_GROQ":
        print("\n  ⚠️  Abre server.py y reemplaza PEGA_AQUI_TU_API_KEY_DE_GROQ\n")

    with http.server.HTTPServer(("", PORT), Handler) as httpd:
        httpd.serve_forever()
