def decryptString(encrypted, key):
    decrypted = ""
    for e in encrypted:
        decrypted += chr(e ^ key)
    return decrypted

ENC_CLOUD_SECRET = [104, 90, 83, 86, 86, 83, 75, 84, 122, 73, 75, 74, 79, 87, 107, 117, 123, 73, 79, 74, 95, 121, 79, 107, 75, 121, 107, 117, 95, 10, 88, 10, 92, 25, 6]
print("Secret:", decryptString(ENC_CLOUD_SECRET, 42))
