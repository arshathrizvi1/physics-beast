const fs = require('fs');
const file = 'C:\\Projects\\Brilliant Academy\\physics-beast\\src\\components\\PremiumNavbar.tsx';
let content = fs.readFileSync(file, 'utf8');

const regex = /<Link href="\/" className="flex items-center gap-3 shrink-0 group">[\s\S]*?<\/Link>/;

const newCode = <Link href="/" className="flex items-center shrink-0 group">
                <div className="relative w-[180px] h-[55px] sm:w-[220px] sm:h-[65px] transition-transform duration-500 group-hover:scale-[1.02]">
                  <Image src="/website_logo_new.jpg" alt="Brilliant Academy" fill sizes="(max-width: 768px) 180px, 220px" className="object-contain drop-shadow-[0_0_8px_rgba(212,175,55,0.3)]" priority />
                </div>
              </Link>;

content = content.replace(regex, newCode);
fs.writeFileSync(file, content);
console.log('Done replacing.');