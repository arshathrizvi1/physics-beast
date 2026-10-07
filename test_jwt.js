const { AccessToken } = require('livekit-server-sdk');

async function test() {
  const at = new AccessToken('APIbrilliant', 'esDs-h5uEpAMt5oGWOJXx20TO5kcP7-mQPYVXwbBwro', { identity: 'test1' });
  at.addGrant({ roomJoin: true, room: 'test' });
  const token = await at.toJwt();
  
  const res = await fetch('https://live.brillliantacademy.site/rtc/v1/validate?access_token=' + token);
  const text = await res.text();
  console.log('Server response to valid local token:', text);

  // Now fetch Vercel's token and test it
  const vercelRes = await fetch('https://www.brillliantacademy.site/api/livekit/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ roomName: 'test', participantIdentity: '123' })
  });
  const vercelData = await vercelRes.json();
  const vercelToken = vercelData.token;

  const res2 = await fetch('https://live.brillliantacademy.site/rtc/v1/validate?access_token=' + vercelToken);
  const text2 = await res2.text();
  console.log('Server response to Vercel token:', text2);
}

test();
