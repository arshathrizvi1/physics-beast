const fs = require('fs');
let c = fs.readFileSync('/home/opc/rtmp-server/server.js', 'utf8');
c = c.replace(/'youtube:player_client=[^']+'/g, "'youtube:player_client=mweb,tv'");
fs.writeFileSync('/home/opc/rtmp-server/server.js', c);
