import sys
import re

path_tsx = r'C:\Projects\Brilliant Academy\physics-beast\src\app\course\[id]\page.tsx'
with open(path_tsx, 'r', encoding='utf-8') as f:
    content_tsx = f.read()

# Let's use regex to find and replace the iframe block
pattern = r"<>\s*\{activeServer === 'bunny' && activeVideo\.platform === 'bunny' && \(\s*<iframe[^>]+>\s*\)\}\s*</>"
match = re.search(pattern, content_tsx)
if match:
    old_block = match.group(0)
    new_block = '''<>
                          {activeServer === 'bunny' && activeVideo.platform === 'bunny' && (
                            bunnyEmbedUrl === 'CRACKED' ? (
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
                            )
                          )}
                        </>'''
    content_tsx = content_tsx.replace(old_block, new_block)
    with open(path_tsx, 'w', encoding='utf-8') as f:
        f.write(content_tsx)
    print("Fixed page.tsx with regex!")
else:
    print("Could not find iframe block with regex. Let me find where iframe is")
    # print surrounding 50 chars of <iframe
    idx = content_tsx.find('<iframe')
    if idx != -1:
        print(content_tsx[idx-100:idx+200])
    
