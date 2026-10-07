const fs = require('fs');
let c = fs.readFileSync('/home/opc/rtmp-server/server.js', 'utf8');
c = c.replace(/'--proxy', warpProxy,/g, "");
fs.writeFileSync('/home/opc/rtmp-server/server.js', c);
