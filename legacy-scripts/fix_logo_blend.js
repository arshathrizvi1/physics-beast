const fs = require('fs');
const file = 'C:\\Projects\\Brilliant Academy\\physics-beast\\src\\components\\PremiumNavbar.tsx';
let content = fs.readFileSync(file, 'utf8');

const oldImageTag = '<Image src="/website_logo_new.jpg" alt="Brilliant Academy" fill sizes="(max-width: 768px) 180px, 220px" className="object-contain drop-shadow-[0_0_8px_rgba(212,175,55,0.3)]" priority />';
const newImageTag = '<Image src="/website_logo_new.jpg" alt="Brilliant Academy" fill sizes="(max-width: 768px) 180px, 220px" className="object-contain mix-blend-screen hover:brightness-125 transition-all duration-300" priority />';

content = content.replace(oldImageTag, newImageTag);
fs.writeFileSync(file, content);
console.log('Done replacing.');