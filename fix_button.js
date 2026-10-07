const fs = require('fs');
let c = fs.readFileSync('src/app/admin/live/page.tsx', 'utf8');

c = c.replace(/<Label>Target Audience<\/Label>[\s\S]*?<div className="flex gap-2">[\s\S]*?<button[\s\S]*?onClick=\{\(\) => setIsCourseModalOpen\(true\)\}[\s\S]*?className=[\s\S]*?>[\s\S]*?<span className="truncate text-foreground font-medium">[\s\S]*?<\/span>[\s\S]*?<ChevronDown className="w-4 h-4 opacity-50 shrink-0" \/>[\s\S]*?<\/button>[\s\S]*?<\/div>/m, 
`<Label>Target Audience</Label>
                  <div className="flex gap-2">
                    <button 
                      type="button"
                      onClick={() => setIsTargetAudienceModalOpen(true)}
                      className="flex h-10 flex-1 items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm text-left hover:bg-secondary/10 transition-colors"
                    >
                      <span className="truncate text-foreground font-medium flex items-center gap-2">
                        {audienceFolderId === "all" ? (
                          "Global (All Students)"
                        ) : (
                          <>
                            <span className="text-primary">{folders.find(f => f.id === audienceFolderId)?.name || 'Select Folder...'}</span>
                            <span className="text-muted-foreground text-xs font-normal">
                              {courseId !== "all" && "(" + (courses.find(c => c.id === courseId)?.name || "") + ")"}
                            </span>
                          </>
                        )}
                      </span>
                      <ChevronDown className="w-4 h-4 opacity-50 shrink-0" />
                    </button>
                  </div>`);

fs.writeFileSync('src/app/admin/live/page.tsx', c);
console.log('Fixed button!');
