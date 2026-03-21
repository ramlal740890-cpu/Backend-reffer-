const axios = require('axios');
const admin = require('firebase-admin');

// 1. Firebase Admin Setup
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT))
    });
}
const db = admin.firestore();

// 2. Configuration
const token = "8711347335:AAFdZV11arLIR898b1Sh2zW7Ajdqp_P8RHM";
const telegramUrl = `https://api.telegram.org/bot${token}/sendMessage`;
const AD_LINK = "https://horizontallyresearchpolar.com/r0wbx3kyf?key=8b0a2298684c7cea730312add326101b";

module.exports = async (req, res) => {
    if (req.method !== 'POST') return res.status(200).send('Bot Active! 🚀');

    try {
        const { message } = req.body;
        if (!message || !message.text) return res.status(200).send('OK');

        const chatId = message.chat.id.toString();
        const text = message.text;
        const name = message.from.first_name || "User";
        const userRef = db.collection('users').doc(chatId);

        const doc = await userRef.get();
        const userData = doc.exists ? doc.data() : { points: 0, step: 'idle', refers: 0, lastVideo: 0, lastDaily: 0 };

        // --- A. WITHDRAWAL STEP HANDLING ---
        if (userData.step === 'awaiting_upi' && text !== '🏦 Withdraw') {
            await db.collection('withdrawals').add({
                chatId: chatId,
                userName: name,
                upi: text,
                amount: userData.points,
                status: 'pending',
                date: new Date().toISOString()
            });

            await userRef.update({ points: 0, step: 'idle' });
            await sendMessage(chatId, "✅ <b>Success!</b> Aapki request admin ko bhej di gayi hai. 24 ghante mein payment mil jayegi.", mainKeyboard());
            return res.status(200).send('OK');
        }

        // --- B. COMMANDS LOGIC --- 

        // 1. Welcome & Referral
        if (text.startsWith('/start')) {
            if (!doc.exists) {
                const refCode = text.split(' ')[1];
                await userRef.set({ points: 0, lastVideo: 0, lastDaily: 0, refers: 0, step: 'idle' });
                
                if (refCode && refCode !== chatId) {
                    const rRef = db.collection('users').doc(refCode);
                    await rRef.update({ 
                        points: admin.firestore.FieldValue.increment(50), 
                        refers: admin.firestore.FieldValue.increment(1) 
                    });
                }
            }
            const welcomeMsg = `<b>Namaste ${name}! 🙏</b>\n\n<b>Real Case Earning Bot</b> mein swagat hai! 🇮🇳\n\n💰 <b>Rewards:</b>\n📺 Video: 20 Points (₹1)\n👫 Refer: 50 Points (₹2.5)\n📅 Daily: 10 Points\n\n🚀 Shuru karein!`;
            await sendMessage(chatId, welcomeMsg, mainKeyboard());
        }

        // 2. Watch Video (30m Cooldown)
        else if (text === '📺 Watch Video') {
            const now = Date.now();
            if (now - (userData.lastVideo || 0) < 1800000) {
                const wait = Math.ceil((1800000 - (now - userData.lastVideo)) / 60000);
                await sendMessage(chatId, `⏳ Agli video <b>${wait} min</b> baad available hogi.`);
            } else {
                await userRef.update({ points: admin.firestore.FieldValue.increment(20), lastVideo: now });
                const inlineKb = { inline_keyboard: [[{ text: "🚀 Open Video Ad", url: AD_LINK }]] };
                await sendMessage(chatId, "<b>📺 Task:</b> Niche click karein aur 15s video dekhein tabhi points milenge.", null, inlineKb);
            }
        }

        // 3. Daily Bonus (24h Cooldown)
        else if (text === '📅 Daily Bonus') {
            const now = Date.now();
            if (now - (userData.lastDaily || 0) < 86400000) {
                await sendMessage(chatId, "❌ Aaj ka bonus aap le chuke hain. Kal wapis aayein!");
            } else {
                await userRef.update({ points: admin.firestore.FieldValue.increment(10), lastDaily: now });
                await sendMessage(chatId, "✅ <b>10 Points</b> Daily Bonus add kar diya gaya hai!");
            }
        }

        // 4. Profile
        else if (text === '👤 Profile') {
            await sendMessage(chatId, `<b>📊 My Dashboard</b>\n\n👤 Name: ${name}\n💰 Balance: <b>${userData.points} Points</b>\n👥 Refers: ${userData.refers || 0}`);
        }

        // 5. Refer & Earn
        else if (text === '👫 Refer & Earn') {
            const link = `https://t.me/Real_Case_earning_bot?start=${chatId}`;
            await sendMessage(chatId, `<b>👫 Refer & Earn</b>\n\nPer Refer: 50 Points\nLink: <code>${link}</code>`);
        }

        // 6. Withdraw System
        else if (text === '🏦 Withdraw') {
            if (userData.points < 1000) {
                await sendMessage(chatId, `❌ Minimum 1000 Points (₹50) hona zaroori hai. Aapke paas ${userData.points} points hain.`);
            } else {
                await userRef.update({ step: 'awaiting_upi' });
                await sendMessage(chatId, "<b>🏦 Withdraw</b>\n\nApna UPI ID (GPay/PhonePe) type karke bhejein:");
            }
        }

    } catch (e) { console.error("Bot Error:", e); }
    res.status(200).send('OK');
};

async function sendMessage(chatId, text, kb, inline) {
    await axios.post(telegramUrl, {
        chat_id: chatId,
        text: text,
        parse_mode: 'HTML',
        reply_markup: inline || kb,
        disable_web_page_preview: true
    });
}

function mainKeyboard() {
    return {
        keyboard: [
            [{ text: '📺 Watch Video' }, { text: '📅 Daily Bonus' }],
            [{ text: '👤 Profile' }, { text: '👫 Refer & Earn' }],
            [{ text: '🏦 Withdraw' }]
        ],
        resize_keyboard: true
    };
}
