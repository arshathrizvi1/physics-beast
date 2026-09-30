import sys
import re

path_cpp = r'C:\Projects\Brilliant Academy\physics-beast\android\app\src\main\cpp\secure-player-lib.cpp'
with open(path_cpp, 'r', encoding='utf-8') as f:
    content = f.read()

old_sec = '''const std::vector<int> ENC_CLOUD_SECRET = {
    104, 90, 83, 86, 86, 83, 75, 72, 94, 107, 73, 75, 79, 77, 87, 121, 
    105, 95, 94, 77, 90, 105, 77, 75, 90, 77, 94, 115, 77, 83, 121, 
    26, 24, 26, 28, 11, 14
};'''

new_sec = '''const std::vector<int> ENC_CLOUD_SECRET = {
    104, 88, 67, 70, 70, 67, 75, 68, 94, 107, 73, 75, 78, 79, 71, 83, 117, 121, 95, 90, 79, 88, 121, 79, 73, 88, 79, 94, 97, 79, 83, 117, 24, 26, 24, 28, 11, 14
};'''

old_sig = '''const std::vector<int> ENC_OFFICIAL_SIG = {
    26, 27, 20, 22, 26, 20, 26, 22, 20, 22, 14, 20, 27, 13, 20, 22, 
    34, 20, 104, 37, 20, 15, 23, 20, 111, 27, 20, 104, 36, 20, 106, 
    22, 20, 104, 38, 20, 26, 25, 20, 27, 34, 20, 25, 25, 20, 105, 
    22, 20, 105, 37, 20, 26, 27, 20, 26, 26
};'''

new_sig = '''const std::vector<int> ENC_OFFICIAL_SIG = {
    26, 31, 16, 30, 26, 16, 24, 28, 16, 30, 110, 16, 31, 105, 16, 30, 18, 16, 104, 108, 16, 19, 108, 16, 111, 31, 16, 108, 27, 16, 104, 108, 16, 107, 30, 16, 104, 24, 16, 110, 107, 16, 30, 29, 16, 31, 18, 16, 25, 25, 16, 105, 25, 16, 26, 104, 16, 27, 108, 16, 19, 29, 16, 108, 27, 16, 31, 30, 16, 108, 111, 16, 105, 24, 16, 28, 27, 16, 107, 107, 16, 29, 111, 16, 108, 27, 16, 19, 30, 16, 24, 30, 16, 25, 30
};'''

content = content.replace(old_sec, new_sec)
content = content.replace(old_sig, new_sig)

with open(path_cpp, 'w', encoding='utf-8') as f:
    f.write(content)
print("Keys updated successfully!")
