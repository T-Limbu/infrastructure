"""Local sync server for Siboasi B2202A Court Commander & Virtual Machine Twin."""

import os
import sys
import json
import socket
import threading
import queue
import http.server

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

# In-memory subscriber queues for real-time SSE broadcast
SUBSCRIBERS = []
SUB_LOCK = threading.Lock()

def get_local_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(('8.8.8.8', 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return '127.0.0.1'

class SyncServerHandler(http.server.SimpleHTTPRequestHandler):
    def do_POST(self):
        if self.path == '/api/send':
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length)
            try:
                data = json.loads(body.decode('utf-8'))
                raw_bytes = data.get('bytes', [])
                
                # Broadcast to all SSE listeners (simulators)
                with SUB_LOCK:
                    dead = []
                    for q in SUBSCRIBERS:
                        try:
                            q.put_nowait(json.dumps({'bytes': raw_bytes}))
                        except Exception:
                            dead.append(q)
                    for d in dead:
                        SUBSCRIBERS.remove(d)

                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(b'{"status":"ok"}')
            except Exception as e:
                self.send_response(400)
                self.end_headers()
                self.wfile.write(str(e).encode('utf-8'))
            return

        super().do_POST()

    def do_GET(self):
        # Server-Sent Events Endpoint for live cross-device simulator syncing
        if self.path == '/api/stream':
            self.send_response(200)
            self.send_header('Content-Type', 'text/event-stream')
            self.send_header('Cache-Control', 'no-cache')
            self.send_header('Connection', 'keep-alive')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()

            q = queue.Queue(maxsize=100)
            with SUB_LOCK:
                SUBSCRIBERS.append(q)

            try:
                # Send initial ping
                self.wfile.write(b"data: {\"type\":\"connected\"}\n\n")
                self.wfile.flush()
                while True:
                    msg = q.get(timeout=25.0)
                    self.wfile.write(f"data: {msg}\n\n".encode('utf-8'))
                    self.wfile.flush()
            except (queue.Empty, BrokenPipeError, ConnectionResetError):
                pass
            finally:
                with SUB_LOCK:
                    if q in SUBSCRIBERS:
                        SUBSCRIBERS.remove(q)
            return

        super().do_GET()

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

def main():
    port = 8000
    host = '0.0.0.0'
    local_ip = get_local_ip()

    os.chdir(os.path.dirname(os.path.abspath(__file__)))

    print("=" * 70)
    print("🏸 SIBOASI B2202A LOCAL SYNC SERVER & VIRTUAL SIMULATOR")
    print("=" * 70)
    print(f"Controller Web App:         http://localhost:{port}")
    print(f"Dedicated Simulator Arena:  http://localhost:{port}/sim.html")
    print(f"Phone Access on Wi-Fi:      http://{local_ip}:{port}")
    print("-" * 70)
    print("Multi-Device Setup:")
    print("  1. Open http://localhost:8000/sim.html on your PC/Monitor (Court Arena).")
    print("  2. Open http://localhost:8000 on your phone (Court Remote).")
    print("  3. Every shot and drill you trigger will shoot live on the PC arena!")
    print("=" * 70)

    with http.server.ThreadingHTTPServer((host, port), SyncServerHandler) as httpd:
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nShutting down server.")

if __name__ == '__main__':
    main()
