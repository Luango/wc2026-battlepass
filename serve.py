import http.server
import socketserver
import os

class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()
    def log_message(self, format, *args):
        pass  # Silence logs to avoid crashing on encoding issues

os.chdir(os.path.dirname(os.path.abspath(__file__)))

class ThreadedServer(socketserver.ThreadingMixIn, http.server.HTTPServer):
    daemon_threads = True

print("Threaded no-cache server on :8080", flush=True)
ThreadedServer(('127.0.0.1', 8080), NoCacheHandler).serve_forever()
