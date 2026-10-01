import fetch from "node-fetch";
import crypto from "crypto";

const token = "5QPmp_3gSyWDinZnR2I3lQ";
const payload = {
  "event": "meeting.created",
  "payload": {
    "object": {
      "id": "9999999999",
      "topic": "Test Old Token",
      "start_time": "2026-10-01T10:00:00Z",
      "join_url": "https://zoom.us/j/9999999999"
    }
  }
};

const timestamp = Date.now().toString();
const message = `v0:${timestamp}:${JSON.stringify(payload)}`;
const hash = crypto.createHmac('sha256', token).update(message).digest('hex');
const signature = `v0=${hash}`;

async function run() {
  const res = await fetch("https://www.brillliantacademy.site/api/zoom/webhook", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-zm-signature": signature,
      "x-zm-request-timestamp": timestamp
    },
    body: JSON.stringify(payload)
  });
  console.log(res.status);
  console.log(await res.text());
}
run();
