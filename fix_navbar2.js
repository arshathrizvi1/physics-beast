const fs = require('fs');
let content = fs.readFileSync('src/components/PremiumNavbar.tsx', 'utf8');

const oldLink = 'href={pathname === "/login" ? "?pfp=true" : (user.role === "admin" || user.role === "teacher") ? "/admin#myprofile" : "/login"}';
const newLink = `href={pathname === "/login" ? "#" : (user.role === "admin" || user.role === "teacher") ? "/admin#myprofile" : "/login"}
                      onClick={(e) => {
                        if (pathname === "/login") {
                          e.preventDefault();
                          window.dispatchEvent(new CustomEvent('open-pfp-modal'));
                        }
                      }}`;

content = content.replace(oldLink, newLink);
fs.writeFileSync('src/components/PremiumNavbar.tsx', content);
