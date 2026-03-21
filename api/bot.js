const axios = require('axios');
const admin = require('firebase-admin');

// Firebase Initialization with Safety Check
try {
    if (!admin.apps.length) {
        const serviceAccountVar = process.env.FIREBASE_SERVICE_ACCOUNT;
        if (serviceAccountVar) {
            // Newline characters (\n) ko handle karne ke liye replace function
            const serviceAccount = JSON.parse(serviceAccountVar.replace(/\\n/g, '\n'));
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount)
            });
            console.log("Firebase Admin Initialized ✅");
        } else {
            console.error("FIREBASE_SERVICE_ACCOUNT is missing in Environment Variables!");
        }
    }
} catch (error) {
    console.error("Firebase Init Error:", error.message);
}

const db = admin.firestore();
const BOT_TOKEN = process.env.BOT_TOKEN || "8711347335:AAFdZV11arLIR898b1Sh2zW7Ajdqp_P8RHM"; //

module.exports = async (req, res) => {
    // Check if request is POST (from Telegram)
    if (req.method !== 'POST') {
        return res.status(200).send('Bot is Live! Waiting for Telegram Webhook... 🟢');
    }

    try {
        const { message } = req.body;

        // Message validation
        if (!message || !message.text) {
            return res.status(200).send('OK');
        }

        const chatId = message.chat.id.toString();
        const text = message.text;
        const firstName = message.from.first_name || "User";

        // Handle /start command
        if (text.startsWith('/start')) {
            // Store user in Firestore
            await db.collection('users').doc(chatId).set({
                userId: chatId,
                name: firstName,
                points: 0,
                isAgreed: true,
                joinedAt: new Date().toISOString()
            }, { merge: true });

            // Send Welcome Message with Keyboard
            await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
                chat_id: chatId,
                text: `<b>Namaste ${firstName}! 🙏</b>\n\nRefer Earning Bot mein aapka swagat hai.\n\nAap doston ko invite karke points kama sakte hain aur unhe UPI ke zariye withdraw kar sakte hain.`,
                parse_mode: 'HTML',
                reply_markup: {
                    keyboard: [
                        [{ text: '👤 Profile' }, { text: '🔗 Refer Link' }],
                        [{ text: '🏦 Withdraw' }, { text: '📊 Statistics' }]
                    ],
                    resize_keyboard: true
                }
            });
        }

        // Handle '👤 Profile' button
        if (text === '👤 Profile') {
            const userDoc = await db.collection('users').doc(chatId).get();
            const userData = userDoc.data();
            const points = userData ? userData.points : 0;

            await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
                chat_id: chatId,
                text: `<b>👤 Aapka Profile</b>\n\n<b>Naam:</b> ${firstName}\n<b>Points:</b> ${points}\n<b>Status:</b> Active ✅`,
                parse_mode: 'HTML'
            });
        }

    } catch (err) {
        // Log error and send 200 to Telegram to prevent retry loops
        console.error("Bot Logic Error:", err.message);
    }

    // Always send 200 OK to Telegram
    return res.status(200).send('OK');
};
