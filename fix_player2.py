import sys

path = r'C:\Projects\Brilliant Academy\physics-beast\src\app\course\[id]\page.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

old_block = '''                        <>
                          {activeServer === 'bunny' && activeVideo.platform === 'bunny' && ('''

new_block = '''                        <>
                          {activeVideo.platform === 'zoom' && (
                              <iframe 
                                src={activeVideo.url.replace(/\/j\/(\d+)/, '/wc/join/')} 
                                className="w-full h-full border-0 relative z-[60] pointer-events-auto bg-black"
                                allow="camera *; microphone *; display-capture *; accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
                                allowFullScreen={true}
                              />
                          )}

                          {activeServer === 'bunny' && activeVideo.platform === 'bunny' && ('''

content = content.replace(old_block, new_block)

old_react_player_hidden = '''<div className={bsolute inset-0 pointer-events-none w-full h-full scale-[1.05] 
}>'''

# Need to fix the formatting in Python string since it has newlines
old_hidden_1 = "<div className={bsolute inset-0 pointer-events-none w-full h-full scale-[1.05] "
old_hidden_2 = "}>"
new_hidden_2 = "}>"

content = content.replace(old_hidden_1 + "\n" + old_hidden_2, old_hidden_1 + "\n" + new_hidden_2)
content = content.replace(old_hidden_1 + old_hidden_2, old_hidden_1 + new_hidden_2)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Zoom iframe logic successfully injected!")
