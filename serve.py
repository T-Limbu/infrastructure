"""Local launch server for Siboasi B2202A Court Commander Web App."""

import os
import sys
import socket
import http.server

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

def get_local_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(('8.8.8.8', 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return '127.0.0.1'

def main():
    port = 8000
    host = '0.0.0.0'
    local_ip = get_local_ip()

    os.chdir(os.path.dirname(os.path.abspath(__file__)))

    print("=" * 65)
    print("[*] SIBOASI B2202A COURT COMMANDER - LOCAL SERVER")
    print("=" * 65)
    print(f"Local URL:         http://localhost:{port}")
    print(f"On Phone (Wi-Fi):  http://{local_ip}:{port}")
    print()
    print("How to use on your phone:")
    print("  - Android: Open Chrome -> go to http://192.168.0.12:8000")
    print("  - iPhone:  Open in 'Bluefy' or 'WebBLE' -> go to http://192.168.0.12:8000")
    print("=" * 65)

    handler = http.server.SimpleHTTPRequestHandler
    with http.server.ThreadingHTTPServer((host, port), handler) as httpd:
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nShutting down server.")

if __name__ == '__main__':
    main()
