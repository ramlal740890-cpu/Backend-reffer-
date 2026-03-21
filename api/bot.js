const axios = require('axios');
const admin = require('firebase-admin');

// Firebase ko initialize karne ka sabse safe tarika
try {
    if (!admin.apps.length && process.env.FIREBASE_SERVICE_ACCOUNT) {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT.replace(/\\n/g, '\n'));
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
        console.log("Firebase Initialized Successfully ✅");
    }
} catch (e) {
    console.error("Firebase Auth Fail:", e.message);
}

const db = admin.firestore();
const token = "8711347335:AAFdZV11arLIR898b1Sh2zW7Ajdqp_P8RHM";

module.exports = async (req, res) => {
    // Ye check zaroori hai
    if (req.method !== 'POST') {
        return res.status(200).send('Bot is Live and Waiting for Telegram! 🟢');
    }

    try {
        const { message } = req.body;
        if (!message || !message.text) return res.status(200).send('OK');

        const chatId = message.chat.id.toString();
        
        if (message.text.startsWith('/start')) {
            // User entry in Firestore
            await db.collection('users').doc(chatId).set({
                name: message.from.first_name,
                points: 0,
                joinedAt: new Date().toISOString()
            }, { merge: true });

            await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
                chat_id: chatId,
                text: "<b>Setup Complete! 🚀</b>\nAapka bot ab kaam kar raha hai.",
                parse_mode: 'HTML',
                reply_markup: {
                    keyboard: [[{ text: '👤 Profile' }, { text: '🏦 Withdraw' }]],
                    resize_keyboard: true
                }
            });
        }
    } catch (err) {
        console.error("Bot Error:", err.message);
    }
    return res.status(200).send('OK');
};

