$content = Get-Content -Raw src\app\courses\page.tsx
$index = $content.IndexOf("        ) : (`n        <div className=""space-y-10"">")

if ($index -ne -1) {
    $newContent = $content.Substring(0, $index) + @"
        ) : (
        <div className="space-y-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold flex items-center gap-2">
              Available Courses
            </h3>
            <div className="flex bg-secondary/20 p-1 rounded-lg border border-secondary/30">
              <button onClick={() => setViewStyle('grid')} className={`p-1.5 rounded-md ${viewStyle === 'grid' ? 'bg-background shadow text-primary' : 'text-muted-foreground hover:text-foreground'}`} title="Grid View">
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button onClick={() => setViewStyle('list')} className={`p-1.5 rounded-md ${viewStyle === 'list' ? 'bg-background shadow text-primary' : 'text-muted-foreground hover:text-foreground'}`} title="List View">
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          <div className={viewStyle === 'grid' ? "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6" : "flex flex-col gap-4"}>
            {/* PREMIUM MONTHLY COURSES */}
            {topMonthlyCourses.map((course) => (
              <Link key={course.id} href={`/course/${course.id}`}>
                <Card className={`overflow-hidden bg-gradient-to-br from-[#1a1a1a] to-[#252525] border-[var(--gold)]/40 hover:border-[var(--gold)] transition-all duration-300 flex group shadow-lg hover:shadow-[var(--gold)]/20 relative ${viewStyle === 'grid' ? 'flex-col h-full' : 'flex-col sm:flex-row h-auto'}`}>
                  <div className="absolute top-0 right-0 p-2 z-20">
                    <span className="bg-gradient-to-r from-[var(--gold)] to-[var(--light-gold)] text-black text-[10px] sm:text-xs font-bold px-2 py-1 sm:px-3 sm:py-1 rounded-bl-lg rounded-tr-lg uppercase tracking-wider shadow-md">Premium Live</span>
                  </div>
                  <div className={`relative overflow-hidden bg-black flex items-center justify-center border-[var(--gold)]/20 ${viewStyle === 'grid' ? 'aspect-video border-b' : 'w-full sm:w-64 aspect-video sm:border-r border-b sm:border-b-0 shrink-0'}`}>
                    {course.image || course.thumbnailUrl ? (
                      <img 
                        src={course.image || course.thumbnailUrl} 
                        alt={course.name || course.title}
                        className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500 opacity-90 group-hover:opacity-100"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[var(--gold)]/20 to-[var(--silver)]/20 flex items-center justify-center text-[var(--gold)]/60 border border-[var(--gold)]/30 group-hover:scale-110 transition-transform duration-500">
                        <BookOpen className="w-8 h-8" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#111111] to-transparent opacity-80" />
                    <div className="absolute bottom-3 right-3 bg-[var(--gold)] text-black rounded-full p-2 shadow-lg group-hover:scale-110 transition-transform duration-300">
                      <Play className="w-4 h-4 fill-current ml-0.5" />
                    </div>
                  </div>
                  <div className="flex flex-col flex-1 min-w-0">
                    <CardHeader className={`p-4 sm:p-5 flex-1 relative z-10 ${viewStyle === 'list' ? 'pb-2' : ''}`}>
                      <CardTitle className="text-lg leading-tight group-hover:text-[var(--gold)] transition-colors text-white line-clamp-2">
                        {course.name || course.title}
                      </CardTitle>
                      {course.description && (
                        <p className={`text-xs text-zinc-400 mt-2 ${viewStyle === 'grid' ? 'line-clamp-2' : 'line-clamp-3'}`}>
                          {course.description}
                        </p>
                      )}
                    </CardHeader>
                    <CardContent className={`p-4 sm:p-5 pt-0 mt-auto flex justify-between items-end ${viewStyle === 'grid' ? 'flex-col sm:flex-row' : ''}`}>
                      <div className="flex flex-col gap-1 text-xs mb-3 text-zinc-400">
                        {course.subjectName && (
                          <span className="flex items-center gap-1.5 font-medium text-[var(--gold)]/80">
                            <BookOpen className="w-3.5 h-3.5" /> {course.subjectName}
                          </span>
                        )}
                        {course.teacherName && (
                          <span className="flex items-center gap-1.5 font-medium text-[var(--silver)]">
                            <GraduationCap className="w-3.5 h-3.5" /> {course.teacherName}
                          </span>
                        )}
                      </div>
                      <div className={`bg-gradient-to-r from-[var(--gold)] to-[var(--light-gold)] text-black hover:opacity-90 transition-opacity font-bold rounded-md flex items-center justify-center ${viewStyle === 'grid' ? 'w-full h-9 text-xs mt-3 sm:mt-0 sm:w-auto sm:px-4' : 'h-10 text-sm px-6 mb-2 shrink-0'}`}>
                        Enter Live Class
                      </div>
                    </CardContent>
                  </div>
                </Card>
              </Link>
            ))}

            {/* ACTIVE COURSES */}
            {activeCourses.map((course) => (
              <Link key={course.id} href={`/course/${course.id}`}>
                <Card className={`overflow-hidden border-secondary/50 bg-card hover:border-primary/50 transition-colors flex group relative ${viewStyle === 'grid' ? 'flex-col h-full' : 'flex-col sm:flex-row h-auto'}`}>
                  <div className={`relative overflow-hidden bg-secondary/20 flex items-center justify-center border-secondary/30 ${viewStyle === 'grid' ? 'aspect-video border-b' : 'w-full sm:w-64 aspect-video sm:border-r border-b sm:border-b-0 shrink-0'}`}>
                    {course.image || course.thumbnailUrl ? (
                      <img 
                        src={course.image || course.thumbnailUrl} 
                        alt={course.name || course.title}
                        className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <BookOpen className="w-10 h-10 sm:w-16 sm:h-16 text-primary/30" />
                    )}
                    {/* Teacher Badge overlay on card */}
                    {course.teacherName && (
                      <div 
                        onClick={(e) => {
                          e.preventDefault();
                          if (course.teacherId) setSelectedTeacherId(course.teacherId);
                        }}
                        className="absolute top-2 right-2 sm:top-3 sm:right-3 bg-black/80 backdrop-blur-md border border-white/10 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[9px] sm:text-[11px] font-medium text-white flex items-center gap-1 sm:gap-1.5 shadow cursor-pointer hover:border-primary/50 transition-colors"
                        title={`Click to filter by ${course.teacherName}`}
                      >
                        <GraduationCap className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-primary" />
                        <span className="hidden sm:inline">{course.teacherName}</span>
                        <span className="sm:hidden">{course.teacherName.split(' ')[0]}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col flex-1 min-w-0">
                    <CardHeader className={`flex-grow p-3 sm:p-6 ${viewStyle === 'list' ? 'pb-2' : ''}`}>
                      <CardTitle className="text-sm sm:text-lg leading-tight line-clamp-2">{course.name || course.title}</CardTitle>
                      {course.teacherName && (
                        <div className="flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs text-primary font-medium mt-1">
                          <GraduationCap className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                          <span className="truncate">By {course.teacherName}</span>
                        </div>
                      )}
                      <CardDescription className={`mt-1 text-xs hidden sm:block ${viewStyle === 'grid' ? 'line-clamp-2' : 'line-clamp-3'}`}>{course.description || "A comprehensive learning path."}</CardDescription>
                    </CardHeader>
                    <CardContent className={`bg-secondary/5 border-t border-secondary/20 p-3 sm:p-4 mt-auto ${viewStyle === 'list' ? 'border-t-0 bg-transparent pt-0 flex justify-end pb-4 pr-6' : ''}`}>
                      <div className={`flex items-center justify-center bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium rounded-md ${viewStyle === 'grid' ? 'w-full h-8 sm:h-10 text-xs sm:text-sm' : 'h-10 text-sm px-6'}`}>
                        <PlayCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" /> Start
                      </div>
                    </CardContent>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function CoursesPage() {
  return (
    <Suspense fallback={<div className="flex min-h-[50vh] items-center justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" /></div>}>
      <CoursesContent />
    </Suspense>
  );
}
"@
    Set-Content -Path src\app\courses\page.tsx -Value $newContent
    Write-Host "Success"
} else {
    Write-Host "Could not find index"
}
