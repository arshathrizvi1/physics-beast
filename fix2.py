import sys

path_tsx = r'C:\Projects\Brilliant Academy\physics-beast\src\app\course\[id]\page.tsx'
with open(path_tsx, 'r', encoding='utf-8') as f:
    content = f.read()

idx = content.find("<iframe")
end_idx = content.find("/>", idx) + 2

old_iframe = content[idx:end_idx]

new_block = '''bunnyEmbedUrl === 'CRACKED' ? (
                                <div className="w-full h-full bg-black flex flex-col items-center justify-center p-6 text-center pointer-events-auto relative z-[60]">
                                    <h3 className="text-2xl font-bold text-red-600 mb-2">APP INTEGRITY COMPROMISED</h3>
                                    <p className="text-zinc-400">Video playback has been permanently blocked due to unauthorized modification of the app.</p>
                                </div>
                            ) : (
                                <iframe 
                                  src={bunnyEmbedUrl || activeVideo.url} 
                                  className="w-full h-full border-0 relative z-[50]"
                                  allow="accelerometer;gyroscope;autoplay;encrypted-media;picture-in-picture;"
                                  allowFullScreen={true}
                                />
                            )'''

content = content.replace(old_iframe, new_block)
with open(path_tsx, 'w', encoding='utf-8') as f:
    f.write(content)
print("Replaced iframe with conditional cracked block!")
