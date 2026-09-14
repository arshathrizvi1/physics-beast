async function test() {
  console.log('Fetching presigned URL from prod...');
  const res = await fetch('https://brilliantacademy.vercel.app/api/bunny/s3-upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filename: 'test.pdf', contentType: 'application/pdf' })
  });
  
  if (!res.ok) {
    console.log('Error fetching presigned url:', res.status, await res.text());
    return;
  }
  
  const data = await res.json();
  console.log('Presigned URL:', data.presignedUrl);
  
  console.log('Uploading to presigned URL...');
  const putRes = await fetch(data.presignedUrl, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/pdf' },
    body: Buffer.from('hello pdf')
  });
  
  console.log('PUT Status:', putRes.status, putRes.statusText);
  if (!putRes.ok) {
    console.log('Error body:', await putRes.text());
  }
}
test();
