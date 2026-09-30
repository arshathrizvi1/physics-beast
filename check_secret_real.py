def decryptString(encrypted, key):
    decrypted = ""
    for e in encrypted:
        decrypted += chr(e ^ key)
    return decrypted

ENC_CLOUD_SECRET = [104, 90, 83, 86, 86, 83, 75, 72, 94, 107, 73, 75, 79, 77, 87, 121, 105, 95, 94, 77, 90, 105, 77, 75, 90, 77, 94, 115, 77, 83, 121, 26, 24, 26, 28, 11, 14]
print("Secret:", decryptString(ENC_CLOUD_SECRET, 42))
