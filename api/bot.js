const axios = require('axios');
const admin = require('firebase-admin');

// Firebase Initialization
if (!admin.apps.length) {
    try {
        const serviceAccountVar = process.env.FIREBASE_SERVICE_ACCOUNT;
        if (serviceAccountVar) {
            const serviceAccount = JSON.parse(serviceAccountVar.replace(/\\n/g, '\n'));
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount)
            });
            console.log("Firebase Connected! ✅");
        }
    } catch (e) {
        console.error("Firebase Init Error:", e.message);
    }
}

const db = admin.firestore();
const BOT_TOKEN = "8711347335:AAFdZV11arLIR898b1Sh2zW7Ajdqp_P8RHM"; //

module.exports = async (req, res) => {
    if (req.method !== 'POST') return res.status(200).send('Bot is Running... 🟢');

    try {
        const { message } = req.body;
        if (!message || !message.text) return res.status(200).send('OK');

        const chatId = message.chat.id.toString();
        const text = message.text;
        const firstName = message.from.first_name || "User";

        // Handle /start and Referral logic
        if (text.startsWith('/start')) {
            const inviteCode = text.split(' ')[1]; // Get referrer ID from link
            
            const userRef = db.collection('users').doc(chatId);
            const doc = await userRef.get();

            if (!doc.exists) {
                // New user logic
                await userRef.set({
                    userId: chatId,
                    name: firstName,
                    points: 0,
                    referredBy: inviteCode || null,
                    joinedAt: new Date().toISOString()
                });

                // Give points to referrer if exists
                if (inviteCode && inviteCode !== chatId) {
                    const referrerRef = db.collection('users').doc(inviteCode);
                    await referrerRef.update({
                        points: admin.firestore.FieldValue.increment(50) // 50 points per refer
                    });
                }
            }

            await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
                chat_id: chatId,
                text: `<b>Namaste ${firstName}! 🙏</b>\n\nRefer Earning Bot mein swagat hai.`,
                parse_mode: 'HTML',
                reply_markup: {
                    keyboard: [
                        [{ text: '👤 Profile' }, { text: '🔗 Refer Link' }],
                        [{ text: '🏦 Withdraw' }]
                    ],
                    resize_keyboard: true
                }
            });
        }

        // Handle '🔗 Refer Link' button
        if (text === '🔗 Refer Link') {
            const referLink = `https://t.me/refer_earning_robot?start=${chatId}`;
            await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
                chat_id: chatId,
                text: `<b>Aapka Referral Link:</b>\n\n${referLink}\n\nHar dost ko join karane par aapko 50 points milenge! 💰`,
                parse_mode: 'HTML'
            });
        }

        // Handle '👤 Profile' button
        if (text === '👤 Profile') {
            const userDoc = await db.collection('users').doc(chatId).get();
            const points = userDoc.exists ? userDoc.data().points : 0;
            await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
                chat_id: chatId,
                text: `<b>👤 Aapka Account</b>\n\n<b>Balance:</b> ${points} Points`,
                parse_mode: 'HTML'
            });
        }

    } catch (err) {
        console.error("Bot Error:", err.message);
    }
    return res.status(200).send('OK');
};
