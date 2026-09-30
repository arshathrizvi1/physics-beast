def decryptString(encrypted, key):
    decrypted = ""
    for e in encrypted:
        decrypted += chr(e ^ key)
    return decrypted

ENC_OFFICIAL_SIG = [26, 27, 20, 22, 26, 20, 26, 22, 20, 22, 14, 20, 27, 13, 20, 22, 34, 20, 104, 37, 20, 15, 23, 20, 111, 27, 20, 104, 36, 20, 106, 22, 20, 104, 38, 20, 26, 25, 20, 27, 34, 20, 25, 25, 20, 105, 22, 20, 105, 37, 20, 26, 27, 20, 26, 26]
print("Sig:", decryptString(ENC_OFFICIAL_SIG, 42))

sig_str = '05:40:26:4D:5C:48:BF:9F:E5:F1:BF:A4:B2:DA:47:58:33:C3:0B:1F:97:F1:54:FE:C2:61:AA:7E:F1:94:24:34'
enc_sig = []
for c in sig_str:
    enc_sig.append(ord(c) ^ 42)
print("Should be:", enc_sig)
