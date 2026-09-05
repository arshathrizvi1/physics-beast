const fs = require('fs');
let content = fs.readFileSync('src/app/globals.css', 'utf8');
content += \n@keyframes slideUpFade {
  0% { opacity: 0; transform: translateY(40px); }
  100% { opacity: 1; transform: translateY(0); }
}
.animate-slide-up-fade {
  animation: slideUpFade 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  opacity: 0;
}
;
fs.writeFileSync('src/app/globals.css', content);
