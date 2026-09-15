"""Serve this exported game locally using Python's standard library."""
import argparse
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import threading
import webbrowser


class GameHandler(SimpleHTTPRequestHandler):
    extensions_map = {**SimpleHTTPRequestHandler.extensions_map,
                      '.js': 'text/javascript', '.mjs': 'text/javascript',
                      '.wasm': 'application/wasm'}

    def do_GET(self):
        if self.headers.get('Host') not in (f'127.0.0.1:{self.server.server_port}',
                                             f'localhost:{self.server.server_port}'):
            self.send_error(403)
            return
        super().do_GET()

    def do_HEAD(self):
        if self.headers.get('Host') not in (f'127.0.0.1:{self.server.server_port}',
                                             f'localhost:{self.server.server_port}'):
            self.send_error(403)
            return
        super().do_HEAD()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--port', type=int, default=0, help='Local port (default: choose a free port)')
    parser.add_argument('--no-browser', action='store_true')
    args = parser.parse_args()
    directory = Path(__file__).resolve().parent
    with ThreadingHTTPServer(('127.0.0.1', args.port), partial(GameHandler, directory=str(directory))) as server:
        address = f'http://127.0.0.1:{server.server_port}/'
        print(f'Play your game: {address}', flush=True)
        print('Keep this window open. Press Ctrl+C to stop.', flush=True)
        if not args.no_browser:
            threading.Timer(0.3, lambda: webbrowser.open(address)).start()
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            pass


if __name__ == '__main__':
    main()
