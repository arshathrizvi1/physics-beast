import sys

path_tsx = r'C:\Projects\Brilliant Academy\physics-beast\src\app\course\[id]\page.tsx'
with open(path_tsx, 'r', encoding='utf-8') as f:
    content = f.read()

# Make Zoom open in iframe as 'video' not 'resource'
content = content.replace(
    "type: cls.platform === 'zoom' ? 'resource' : 'video' // If zoom, make it a resource so it opens in a new tab",
    "type: 'video' // Zoom should now be 'video' so it loads inline in iframe"
)

# Update iframe allow attribute to support WebRTC
old_allow = 'allow="accelerometer;gyroscope;autoplay;encrypted-media;picture-in-picture;"'
new_allow = 'allow="camera *; microphone *; display-capture *; accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"'
content = content.replace(old_allow, new_allow)

# We also need to conditionally render the iframe for Zoom differently so it doesn't use bunnyEmbedUrl logic if it's Zoom.
# But wait, bunnyEmbedUrl logic triggers if activeVideo.platform === 'bunny'. 
# Wait, let's look at the bunnyEmbedUrl effect.
