const axios = require('axios');
const admin = require('firebase-admin');

// Firebase ko safe tarike se init karne ke liye
if (!admin.apps.length) {
    try {
        const rawKey = process.env.FIREBASE_SERVICE_ACCOUNT;
        // Check karein ki key exit karti hai ya nahi
        if (rawKey) {
            const serviceAccount = JSON.parse(rawKey.replace(/\\n/g, '\n'));
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount)
            });
        }
    } catch (e) {
        console.error("Firebase Init Error:", e.message);
    }
}

const db = admin.firestore();
const token = process.env.BOT_TOKEN || "8711347335:AAFdZV11arLIR898b1Sh2zW7Ajdqp_P8RHM"; //

module.exports = async (req, res) => {
    // Vercel check taaki function sleep na kare
    if (req.method !== 'POST') {
        return res.status(200).send('Bot is Running... 🟢');
    }

    try {
        const { message } = req.body;

        // Agar message nahi hai toh respond karein aur exit karein
        if (!message || !message.text) {
            return res.status(200).send('OK');
        }

        const chatId = message.chat.id.toString();
        const text = message.text;

        if (text.startsWith('/start')) {
            // User data Firestore mein save karein
            await db.collection('users').doc(chatId).set({
                name: message.from.first_name || "User",
                points: 0,
                isAgreed: true
            }, { merge: true });

            // Welcome Message bhejien
            await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
                chat_id: chatId,
                text: "<b>Namaste! 🙏\n\nRefer Earning Bot mein aapka swagat hai.</b>\n\nNiche diye gaye buttons ka use karein:",
                parse_mode: 'HTML',
                reply_markup: {
                    keyboard: [[{ text: '👤 Profile' }, { text: '🏦 Withdraw' }]],
                    resize_keyboard: true
                }
            });
        }
    } catch (err) {
        // Crash se bachne ke liye logs check karein
        console.error("Internal Error:", err.message);
    }

    // Har halat mein 200 response dena zaroori hai
    return res.status(200).send('OK');
};
