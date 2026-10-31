const { AccessToken } = require('livekit-server-sdk');

async function test() {
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  if (!apiKey || !apiSecret) {
    throw new Error('Set LIVEKIT_API_KEY and LIVEKIT_API_SECRET environment variables');
  }
  const at = new AccessToken(apiKey, apiSecret, { identity: 'test1' });
  at.addGrant({ roomJoin: true, room: 'test' });
  const token = await at.toJwt();
  console.log('Generated local JWT length:', token.length);
}

test();
