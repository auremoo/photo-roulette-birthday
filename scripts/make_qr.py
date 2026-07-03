"""Génère un QR code (PNG + ASCII dans le terminal) pour une URL donnée.

Usage : python scripts/make_qr.py https://xxxx.trycloudflare.com
"""
import sys
from pathlib import Path

import qrcode

url = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8000"

qr = qrcode.QRCode(border=2)
qr.add_data(url)
qr.make(fit=True)

# affichage direct dans le terminal (scannable tel quel)
qr.print_ascii(invert=True)

# fichier PNG à imprimer / afficher en grand
root = Path(__file__).resolve().parent.parent
out = root / "bin" / "qr.png"
out.parent.mkdir(exist_ok=True)
img = qr.make_image(fill_color="black", back_color="white")
img.save(out)

# copie servie par le serveur, pour afficher le QR sur l'écran /display
web_qr = root / "web" / "qr.png"
img.save(web_qr)

# URL publique lue par le serveur (endpoint /api/info -> QR + lien à l'écran)
(root / "bin" / "public_url.txt").write_text(url, encoding="utf-8")

print()
print(f"URL   : {url}")
print(f"QR PNG: {out}")
