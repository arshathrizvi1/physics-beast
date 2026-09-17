const fs = require('fs');
let content = fs.readFileSync('src/components/PremiumNavbar.tsx', 'utf8');

const oldLink = 'href={pathname === "/login" ? "#pfp" : (user.role === "admin" || user.role === "teacher") ? "/admin#myprofile" : "/login"}';
const newLink = 'href={pathname === "/login" ? "?pfp=true" : (user.role === "admin" || user.role === "teacher") ? "/admin#myprofile" : "/login"}';

content = content.replace(oldLink, newLink);
fs.writeFileSync('src/components/PremiumNavbar.tsx', content);
