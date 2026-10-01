import json
import os

paths = [
    r'C:\Projects\Brilliant Academy\physics-beast\capacitor.config.json',
    r'C:\Projects\Brilliant Academy\physics-beast\android\app\src\main\assets\capacitor.config.json'
]

for path in paths:
    if os.path.exists(path):
        with open(path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        # Update server url
        if 'server' in data and 'url' in data['server']:
            if data['server']['url'] == 'https://brilliantacademy.vercel.app':
                data['server']['url'] = 'https://brillliantacademy.site'
        
        # Update allowNavigation
        if 'server' in data and 'allowNavigation' in data['server']:
            navs = data['server']['allowNavigation']
            if "brillliantacademy.site" not in navs:
                navs.append("brillliantacademy.site")
            if "*.brillliantacademy.site" not in navs:
                navs.append("*.brillliantacademy.site")
        
        # Update CapacitorPasskey origin
        if 'plugins' in data and 'CapacitorPasskey' in data['plugins']:
            if 'origin' in data['plugins']['CapacitorPasskey']:
                data['plugins']['CapacitorPasskey']['origin'] = 'https://brillliantacademy.site'
        
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=4)
        print(f"Updated {os.path.basename(path)}")

