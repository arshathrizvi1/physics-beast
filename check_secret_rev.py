key_str = 'BrilliantAcademy_SuperSecretKey_2026!$'
encrypted = []
for c in key_str:
    encrypted.append(ord(c) ^ 42)
print("Should be:", encrypted)
