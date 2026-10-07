const fs = require('fs');
let c = fs.readFileSync('/home/opc/rtmp-server/server.js', 'utf8');
c = c.replace(/'youtube:player_client=ios,web'/g, "'youtube:player_client=android,tv'");
fs.writeFileSync('/home/opc/rtmp-server/server.js', c);
