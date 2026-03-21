const axios = require('axios');
const admin = require('firebase-admin');

// 1. Firebase Setup
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT))
    });
}
const db = admin.firestore();
const token = process.env.BOT_TOKEN; 
const telegramUrl = `https://api.telegram.org/bot${token}/sendMessage`;

module.exports = async (req, res) => {
    if (req.method !== 'POST') return res.status(200).send('Bot Active!');

    try {
        const { message } = req.body;
        if (!message || !message.text) return res.status(200).send('OK');

        const chatId = message.chat.id.toString();
        const text = message.text;
        const name = message.from.first_name || "User";
        const userRef = db.collection('users').doc(chatId);

        // --- COMMANDS ---

        if (text.startsWith('/start')) {
            const doc = await userRef.get();
            if (!doc.exists) {
                const refCode = text.split(' ')[1];
                await userRef.set({ points: 0, lastVideo: 0, lastDaily: 0, refers: 0, step: 'idle' });
                // Referral Logic
                if (refCode && refCode !== chatId) {
                    const rRef = db.collection('users').doc(refCode);
                    await rRef.update({ points: admin.firestore.FieldValue.increment(50), refers: admin.firestore.FieldValue.increment(1) });
                }
            }
            await sendMessage(chatId, `<b>Namaste ${name}! 🙏</b>\n\nWelcome to <b>Real Case Earning Bot</b>.`, mainKeyboard());
        }

        // --- WITHDRAW LOGIC ---
        else if (text === '🏦 Withdraw') {
            const doc = await userRef.get();
            const data = doc.data();
            if (data.points < 1000) {
                await sendMessage(chatId, `❌ Aapka balance <b>${data.points} Points</b> hai. Minimum payout 1000 Points (₹50) hai.`);
            } else {
                await userRef.update({ step: 'awaiting_upi' });
                await sendMessage(chatId, "<b>🏦 Withdrawal Request</b>\n\nApna <b>UPI ID</b> ya <b>PhonePe Number</b> niche type karke bhejein:");
            }
        }

        // User jab UPI details bhejta hai
        else {
            const doc = await userRef.get();
            const data = doc.data();

            if (data.step === 'awaiting_upi') {
                const upiDetails = text;
                const pointsToDeduct = data.points;

                // Points zero karke request save karna
                await userRef.update({ points: 0, step: 'idle' });
                
                // Admin ko notification bhej sakte hain ya Firebase mein alag collection bana sakte hain
                await db.collection('withdrawals').add({
                    chatId: chatId,
                    name: name,
                    details: upiDetails,
                    amount: pointsToDeduct,
                    status: 'Pending',
                    date: new Date().toISOString()
                });

                await sendMessage(chatId, `✅ <b>Request Sent!</b>\n\nAapki ₹${(pointsToDeduct/20).toFixed(2)} ki request check ki ja rahi hai. 24 ghante mein payment mil jayegi.`);
            }
        }

        // --- PROFILE & VIDEO (Purana logic) ---
        else if (text === '👤 Profile') {
            const doc = await userRef.get();
            const d = doc.data() || { points: 0, refers: 0 };
            await sendMessage(chatId, `<b>📊 My Dashboard</b>\n\n💰 Balance: ${d.points} Pts\n👥 Refers: ${d.refers}`);
        }

    } catch (e) { console.error(e); }
    res.status(200).send('OK');
};

async function sendMessage(chatId, text, kb) {
    await axios.post(telegramUrl, { chat_id: chatId, text: text, parse_mode: 'HTML', reply_markup: kb });
}

function mainKeyboard() {
    return {
        keyboard: [[{ text: '📺 Watch Video' }, { text: '📅 Daily Bonus' }], [{ text: '👤 Profile' }, { text: '👫 Refer & Earn' }], [{ text: '🏦 Withdraw' }]],
        resize_keyboard: true
    };
}
