const axios = require('axios');
const admin = require('firebase-admin');

// 1. FIREBASE INITIALIZATION
if (!admin.apps.length) {
    try {
        const rawData = process.env.FIREBASE_SERVICE_ACCOUNT;
        const serviceAccount = JSON.parse(rawData.replace(/\\n/g, '\n'));
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
    } catch (e) {
        console.error("Firebase Init Error:", e.message);
    }
}
const db = admin.firestore();

// 2. CONFIGURATION
const token = "8711347335:AAFdZV11arLIR898b1Sh2zW7Ajdqp_P8RHM";
const telegramUrl = `https://api.telegram.org/bot${token}/sendMessage`;
const AD_LINK = "https://horizontallyresearchpolar.com/r0wbx3kyf?key=8b0a2298684c7cea730312add326101b";

module.exports = async (req, res) => {
    if (req.method !== 'POST') return res.status(200).send('Bot is Live! 🟢');

    try {
        const { message } = req.body;
        if (!message || !message.text) return res.status(200).send('OK');

        const chatId = message.chat.id.toString();
        const text = message.text;
        const name = message.from.first_name || "User";
        const userRef = db.collection('users').doc(chatId);

        const doc = await userRef.get();
        const userData = doc.exists ? doc.data() : { points: 0, step: 'idle', refers: 0, lastVideo: 0, lastDaily: 0 };

        // --- A. WITHDRAWAL HANDLER ---
        if (userData.step === 'awaiting_upi' && text !== '🏦 Withdraw') {
            await db.collection('withdrawals').add({
                chatId, userName: name, upi: text, amount: userData.points, status: 'pending', date: new Date().toISOString()
            });
            await userRef.update({ points: 0, step: 'idle' });
            await sendMessage(chatId, "✅ <b>Request Sent!</b> 24 ghante mein payment mil jayegi.", mainKeyboard());
            return res.status(200).send('OK');
        }

        // --- B. MAIN COMMANDS ---
        if (text.startsWith('/start')) {
            if (!doc.exists) {
                const refCode = text.split(' ')[1];
                await userRef.set({ points: 0, lastVideo: 0, lastDaily: 0, refers: 0, step: 'idle', name: name });
                
                // Referral Bonus Logic
                if (refCode && refCode !== chatId) {
                    const rRef = db.collection('users').doc(refCode);
                    await rRef.update({ 
                        points: admin.firestore.FieldValue.increment(50), 
                        refers: admin.firestore.FieldValue.increment(1) 
                    });
                }
            }
            await sendMessage(chatId, `<b>Namaste ${name}! 🙏</b>\n\nIndia ke No.1 Earning Bot mein swagat hai!`, mainKeyboard());
        }

        else if (text === '📺 Watch Video') {
            const now = Date.now();
            if (now - (userData.lastVideo || 0) < 1800000) { // 30 Min Cooldown
                const wait = Math.ceil((1800000 - (now - userData.lastVideo)) / 60000);
                await sendMessage(chatId, `⏳ Wait <b>${wait} min</b> for next video.`);
            } else {
                await userRef.update({ points: admin.firestore.FieldValue.increment(20), lastVideo: now });
                const inlineKb = { inline_keyboard: [[{ text: "🚀 Open Video Ad", url: AD_LINK }]] };
                await sendMessage(chatId, "<b>Task:</b> Click and watch for 15s to get 20 Points.", null, inlineKb);
            }
        }

        else if (text === '📅 Daily Bonus') {
            const now = Date.now();
            if (now - (userData.lastDaily || 0) < 86400000) {
                await sendMessage(chatId, "❌ Aaj ka bonus le chuke hain.");
            } else {
                await userRef.update({ points: admin.firestore.FieldValue.increment(10), lastDaily: now });
                await sendMessage(chatId, "✅ <b>10 Points</b> Added!");
            }
        }

        else if (text === '👤 Profile') {
            await sendMessage(chatId, `<b>📊 Stats</b>\n\n💰 Balance: ${userData.points} Pts\n👥 Refers: ${userData.refers || 0}`);
        }

        else if (text === '🏦 Withdraw') {
            if (userData.points < 1000) {
                await sendMessage(chatId, `❌ Min 1000 Pts (₹50) required. Current: ${userData.points}`);
            } else {
                await userRef.update({ step: 'awaiting_upi' });
                await sendMessage(chatId, "<b>🏦 Withdraw</b>\n\nApna UPI ID type karke bhejein:");
            }
        }

    } catch (e) { 
        console.error("Critical Error:", e.message); 
    }
    res.status(200).send('OK');
};

async function sendMessage(chatId, text, kb, inline) {
    await axios.post(telegramUrl, { chat_id: chatId, text, parse_mode: 'HTML', reply_markup: inline || kb });
}

function mainKeyboard() {
    return {
        keyboard: [[{ text: '📺 Watch Video' }, { text: '📅 Daily Bonus' }], [{ text: '👤 Profile' }, { text: '🏦 Withdraw' }]],
        resize_keyboard: true
    };
}
