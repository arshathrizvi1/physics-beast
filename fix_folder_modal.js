const fs = require('fs');
let c = fs.readFileSync('src/components/FolderManagerModal.tsx', 'utf8');

c = c.replace(
  '      </div>\r\n    </div>\r\n  );\r\n}',
  `      </div>
      <TargetCourseModal 
        isOpen={isCopyModalOpen} 
        onClose={() => setIsCopyModalOpen(false)} 
        onSelect={handleCopySubmit} 
        batches={allBatches} 
        courses={allCourses} 
        title="Copy Folder to Target Course" 
      />
    </div>
  );
}`
);
c = c.replace(
  '      </div>\n    </div>\n  );\n}',
  `      </div>
      <TargetCourseModal 
        isOpen={isCopyModalOpen} 
        onClose={() => setIsCopyModalOpen(false)} 
        onSelect={handleCopySubmit} 
        batches={allBatches} 
        courses={allCourses} 
        title="Copy Folder to Target Course" 
      />
    </div>
  );
}`
);

fs.writeFileSync('src/components/FolderManagerModal.tsx', c);
console.log('Fixed exactly!');
