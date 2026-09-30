import sys

path = r'C:\Projects\Brilliant Academy\physics-beast\src\app\course\[id]\page.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# We will completely replace the player container block to guarantee clean, perfect behavior.
import re

start_marker = "                  <div \n                    ref={playerContainerRef} "
end_marker = "                        <div ref={wmRef} className=\"absolute top-8 left-8"

# Find start index
start_idx = content.find(start_marker)
if start_idx == -1:
    print("Could not find start marker")
    sys.exit(1)

# Find end index
end_idx = content.find(end_marker, start_idx)
if end_idx == -1:
    print("Could not find end marker")
    sys.exit(1)

new_block = '''                  <div 
                    ref={playerContainerRef} 
                    className="w-full h-full absolute inset-0 z-0 bg-black group/player overflow-hidden"
                    onMouseEnter={() => setShowControls(true)}
                    onMouseLeave={() => setShowControls(false)}
                  >
                        <>
                          {activeVideo.platform === 'zoom' && (
                              <iframe 
                                src={activeVideo.url.replace(/\/j\/(\\d+)/, '/wc/join/')} 
                                className="w-full h-full border-0 relative z-[60] pointer-events-auto bg-black"
                                allow="camera *; microphone *; display-capture *; accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
                                allowFullScreen={true}
                              />
                          )}

                          {activeServer === 'bunny' && activeVideo.platform === 'bunny' && (
                            bunnyEmbedUrl.startsWith('CRACKED') ? (
                                  <div className="w-full h-full bg-black flex flex-col items-center justify-center p-6 text-center pointer-events-auto relative z-[60]">
                                      <h3 className="text-2xl font-bold text-red-600 mb-2">APP INTEGRITY COMPROMISED</h3>
                                      <p className="text-zinc-400">Video playback has been permanently blocked due to unauthorized modification of the app.</p><p className="text-red-500 mt-4 text-xs">{bunnyEmbedUrl}</p>
                                  </div>
                              ) : (
                                  <iframe 
                                    src={bunnyEmbedUrl || activeVideo.url} 
                                    className="w-full h-full border-0 relative z-[50]"
                                    allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
                                    allowFullScreen={true}
                                  />
                              )
                          )}

                          <div className={bsolute inset-0 pointer-events-none w-full h-full scale-[1.05] }>
                            {typeof window !== 'undefined' && (window as any).AndroidNative?.checkAppIntegrity?.() === 'CRACKED' ? (
                                <div className="w-full h-full bg-black flex flex-col items-center justify-center p-6 text-center pointer-events-auto">
                                    <h3 className="text-2xl font-bold text-red-600 mb-2">APP INTEGRITY COMPROMISED</h3>
                                    <p className="text-zinc-400">YouTube playback has been permanently blocked due to unauthorized modification of the app.</p>
                                </div>
                            ) : (
                            <ReactPlayer
                              ref={playerRef}
                              url={activeServer === 'youtube' && activeVideo.originalYoutubeUrl ? activeVideo.originalYoutubeUrl : activeVideo.url}
                              width="100%"
                              height="100%"
                              playing={playing}
                              playbackRate={playbackRate}
                              volume={volume}
                              muted={muted}
                              onProgress={(state) => {
                                setPlayed(state.played);
                                if (activeVideo && user?.uid) {
                                  localStorage.setItem(ideo_progress__, state.playedSeconds.toString());
                                }
                              }}
                              onDuration={(duration) => setDuration(duration)}
                              config={{
                                youtube: {
                                  playerVars: { 
                                    showinfo: 0, 
                                    controls: 0, 
                                    rel: 0, 
                                    modestbranding: 1,
                                    disablekb: 1,
                                    iv_load_policy: 3,
                                    cc_load_policy: 3
                                  }
                                }
                              }}
                            />
                            )}
                          </div>
                        </>

'''

content = content[:start_idx] + new_block + content[end_idx:]

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Player block fully rewritten.")
