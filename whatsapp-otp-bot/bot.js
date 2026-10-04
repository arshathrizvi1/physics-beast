const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const admin = require('firebase-admin');

// Initialize Firebase using the Service Account Key
const serviceAccount = require('./serviceAccountKey.json');
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore();

// Initialize WhatsApp Client (Configured for AWS Linux Servers)
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: { 
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'] 
    }
});

client.on('qr', (qr) => {
    console.log("\n=========================================================");
    console.log("SCAN THIS QR CODE WITH YOUR NEW OTP WHATSAPP NUMBER!");
    console.log("=========================================================\n");
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('OTP WhatsApp Bot is READY and listening to academy_whatsapp_queue!');
    startQueueListener();
});

client.on('disconnected', (reason) => {
    console.log('WhatsApp was logged out!', reason);
    process.exit(0);
});

let isProcessingQueue = false;

function startQueueListener() {
    // Listen to the new completely isolated queue
    db.collection('academy_whatsapp_queue').where('status', '==', 'pending').onSnapshot(async (snapshot) => {
        if (snapshot.empty || isProcessingQueue) return;
        
        isProcessingQueue = true; // Lock the queue
        
        try {
            while (true) {
                const nextBatch = await db.collection('academy_whatsapp_queue')
                    .where('status', '==', 'pending')
                    .limit(1)
                    .get();

                if (nextBatch.empty) break; 

                const doc = nextBatch.docs[0];
                const { phone, message } = doc.data();
                
                if (!message || !phone) {
                    await doc.ref.update({ status: 'failed', error: 'Missing phone or message' });
                    continue;
                }
                
                try {
                    let formattedPhone = phone.replace(/[^0-9]/g, '');
                    if (formattedPhone.startsWith('0')) formattedPhone = '94' + formattedPhone.substring(1);
                    else if (!formattedPhone.startsWith('94')) formattedPhone = '94' + formattedPhone; 
                    
                    await client.sendMessage(formattedPhone + '@c.us', message);
                    await doc.ref.update({ status: 'sent' });
                    
                    console.log(`✅ Sent OTP to ${formattedPhone}`);
                    
                    // Small delay to prevent spam detection on the new number
                    await new Promise(r => setTimeout(r, 2000)); 
                    
                } catch (error) {
                    console.error("Failed to send OTP:", error.message);
                    await doc.ref.update({ status: 'failed', error: error.message });
                }
            }
        } finally {
            isProcessingQueue = false; // Unlock queue
        }
    });
}

client.initialize();
