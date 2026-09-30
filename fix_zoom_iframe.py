import sys

path_tsx = r'C:\Projects\Brilliant Academy\physics-beast\src\app\course\[id]\page.tsx'
with open(path_tsx, 'r', encoding='utf-8') as f:
    content = f.read()

# Make Zoom open in iframe as 'video' not 'resource'
content = content.replace(
    "type: cls.platform === 'zoom' ? 'resource' : 'video' // If zoom, make it a resource so it opens in a new tab",
    "type: 'video' // Zoom should now be 'video' so it loads inline in iframe"
)

# Add conditional rendering for Zoom iframe right before ReactPlayer
old_react_player_block = "                          <div className={bsolute inset-0 pointer-events-none w-full h-full scale-[1.05]"
new_zoom_iframe_block = """                          {activeVideo.platform === 'zoom' && (
                              <iframe 
                                src={activeVideo.url} 
                                className="w-full h-full border-0 relative z-[60] pointer-events-auto bg-black"
                                allow="camera *; microphone *; display-capture *; accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
                                allowFullScreen={true}
                              />
                          )}
                          <div className={bsolute inset-0 pointer-events-none w-full h-full scale-[1.05]"""

content = content.replace(old_react_player_block, new_zoom_iframe_block)

# Hide ReactPlayer if Zoom is active
old_hidden_logic = ""
new_hidden_logic = ""
content = content.replace(old_hidden_logic, new_hidden_logic)

with open(path_tsx, 'w', encoding='utf-8') as f:
    f.write(content)

print("Zoom iframe logic added.")
