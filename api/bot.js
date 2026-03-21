const axios = require('axios');
const admin = require('firebase-admin');

// 1. Firebase Initialization
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT))
    });
}
const db = admin.firestore();
const token = process.env.BOT_TOKEN; 
const telegramUrl = `https://api.telegram.org/bot${token}/sendMessage`;
const AD_LINK = "https://horizontallyresearchpolar.com/r0wbx3kyf?key=8b0a2298684c7cea730312add326101b";

module.exports = async (req, res) => {
    if (req.method !== 'POST') return res.status(200).send('Bot Active!');

    try {
        const { message } = req.body;
        if (!message || !message.text) return res.status(200).send('OK');

        const chatId = message.chat.id.toString();
        const text = message.text;
        const name = message.from.first_name || "User";
        const userRef = db.collection('users').doc(chatId);

        const doc = await userRef.get();
        const userData = doc.exists ? doc.data() : { points: 0, step: 'idle' };

        // --- WITHDRAWAL STEP HANDLING ---
        if (userData.step === 'awaiting_upi' && text !== '🏦 Withdraw') {
            const upiId = text;
            const points = userData.points;

            // Request Save karein
            await db.collection('withdrawals').add({
                chatId: chatId,
                name: name,
                upi: upiId,
                amount: points,
                status: 'Pending',
                timestamp: admin.firestore.FieldValue.serverTimestamp()
            });

            // Points zero aur step reset karein
            await userRef.update({ points: 0, step: 'idle' });
            await sendMessage(chatId, `✅ <b>Success!</b>\n\nAapki ₹${(points/20).toFixed(2)} ki request admin ko bhej di gayi hai.`, mainKeyboard());
            return res.status(200).send('OK');
        }

        // --- COMMANDS ---
        if (text.startsWith('/start')) {
            if (!doc.exists) {
                const refCode = text.split(' ')[1];
                await userRef.set({ points: 0, lastVideo: 0, lastDaily: 0, refers: 0, step: 'idle' });
                if (refCode && refCode !== chatId) {
                    const rRef = db.collection('users').doc(refCode);
                    await rRef.update({ points: admin.firestore.FieldValue.increment(50), refers: admin.firestore.FieldValue.increment(1) });
                }
            }
            await sendMessage(chatId, `<b>Namaste ${name}! 🙏</b>\n\nIndia ke No.1 Earning Bot mein swagat hai.`, mainKeyboard());
        }

        else if (text === '📺 Watch Video') {
            const now = Date.now();
            if (now - (userData.lastVideo || 0) < 1800000) { // 30 Min cooldown
                await sendMessage(chatId, `⏳ Sabar karein! Agli video thodi der baad dekhein.`);
            } else {
                await userRef.update({ points: admin.firestore.FieldValue.increment(20), lastVideo: now });
                const inlineKb = { inline_keyboard: [[{ text: "🚀 Open Video Ad", url: AD_LINK }]] };
                await sendMessage(chatId, `<b>📺 Reward Task</b>\n\n15 second tak video dekhein tabhi points valid honge.`, null, inlineKb);
            }
        }

        else if (text === '👤 Profile') {
            await sendMessage(chatId, `<b>📊 My Profile</b>\n\n💰 Balance: ${userData.points} Pts\n👥 Refers: ${userData.refers || 0}`);
        }

        else if (text === '🏦 Withdraw') {
            if (userData.points < 1000) {
                await sendMessage(chatId, `❌ Minimum withdrawal 1000 Points (₹50) hai. Aapke paas abhi ${userData.points} points hain.`);
            } else {
                await userRef.update({ step: 'awaiting_upi' });
                await sendMessage(chatId, "<b>🏦 Withdraw</b>\n\nApna UPI ID ya PhonePe number yahan type karke bhejein:");
            }
        }

    } catch (e) { console.error(e); }
    res.status(200).send('OK');
};

async function sendMessage(chatId, text, kb, inline) {
    await axios.post(telegramUrl, { chat_id: chatId, text: text, parse_mode: 'HTML', reply_markup: inline || kb });
}

function mainKeyboard() {
    return { keyboard: [[{ text: '📺 Watch Video' }, { text: '📅 Daily Bonus' }], [{ text: '👤 Profile' }, { text: '👫 Refer & Earn' }], [{ text: '🏦 Withdraw' }]], resize_keyboard: true };
}
