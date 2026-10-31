import os

secret = os.environ.get("BUNNY_DRM_SECRET", "")
if not secret:
    raise SystemExit("Set BUNNY_DRM_SECRET environment variable before running XOR key encoder.")

xor_key = 42
enc = [ord(c) ^ xor_key for c in secret]
print(enc)
