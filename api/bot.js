const axios = require('axios');
const admin = require('firebase-admin');

// 1. Firebase Admin Setup
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT))
    });
}
const db = admin.firestore();

// 2. Configuration Variables
const token = process.env.BOT_TOKEN || "8711347335:AAFdZV11arLIR898b1Sh2zW7Ajdqp_P8RHM";
const telegramUrl = `https://api.telegram.org/bot${token}/sendMessage`;
const AD_LINK = "https://horizontallyresearchpolar.com/r0wbx3kyf?key=8b0a2298684c7cea730312add326101b";

module.exports = async (req, res) => {
    if (req.method !== 'POST') return res.status(200).send('Earning Bot Active! 🚀');

    try {
        const { message } = req.body;
        if (!message || !message.text) return res.status(200).send('OK');

        const chatId = message.chat.id.toString();
        const text = message.text;
        const firstName = message.from.first_name || "User";
        const userRef = db.collection('users').doc(chatId);

        // --- COMMAND LOGIC ---

        // START & REFERRAL (50 Points)
        if (text.startsWith('/start')) {
            const doc = await userRef.get();
            if (!doc.exists) {
                const referralCode = text.split(' ')[1];
                await userRef.set({ points: 0, lastVideo: 0, lastDaily: 0, refers: 0 });

                if (referralCode && referralCode !== chatId) {
                    const referrerRef = db.collection('users').doc(referralCode);
                    await referrerRef.update({ 
                        points: admin.firestore.FieldValue.increment(50), 
                        refers: admin.firestore.FieldValue.increment(1) 
                    });
                }
            }
            const welcomeMsg = `<b>Namaste ${firstName}! 🙏</b>\n\nIndia ke No.1 Earning Bot mein aapka swagat hai.\n\n💰 <b>Rewards Guide:</b>\n📺 Video Ad: 20 Points\n👫 Per Refer: 50 Points\n📅 Daily Check-in: 10 Points`;
            await sendMessage(chatId, welcomeMsg, mainKeyboard());
        }

        // WATCH VIDEO (20 Points + 15s Cooldown)
        else if (text === '📺 Watch Video') {
            const doc = await userRef.get();
            const userData = doc.data();
            const now = Date.now();
            const cooldown = 30 * 60 * 1000; // 30 Minute gap for safety

            if (now - (userData.lastVideo || 0) < cooldown) {
                const wait = Math.ceil((cooldown - (now - userData.lastVideo)) / 60000);
                await sendMessage(chatId, `⏳ Agli video <b>${wait} minute</b> baad dekhein.`);
            } else {
                await userRef.update({ points: admin.firestore.FieldValue.increment(20), lastVideo: now });
                const adMsg = `<b>📺 Video Task!</b>\n\nNiche link par click karein aur 15 Second tak video dekhein.\n\n👉 <a href="${AD_LINK}">Watch Ad Now</a>\n\nReward automatic add kar diya gaya hai!`;
                await sendMessage(chatId, adMsg, mainKeyboard());
            }
        }

        // DAILY BONUS (10 Points)
        else if (text === '📅 Daily Bonus') {
            const doc = await userRef.get();
            const userData = doc.data();
            const now = Date.now();
            if (now - (userData.lastDaily || 0) < 86400000) {
                await sendMessage(chatId, "❌ Aap aaj ka bonus pehle hi le chuke hain.");
            } else {
                await userRef.update({ points: admin.firestore.FieldValue.increment(10), lastDaily: now });
                await sendMessage(chatId, "✅ 10 Points Daily Bonus added!");
            }
        }

        // PROFILE & WITHDRAW
        else if (text === '👤 Profile') {
            const doc = await userRef.get();
            const data = doc.data() || { points: 0, refers: 0 };
            await sendMessage(chatId, `<b>📊 My Dashboard</b>\n\n💰 Balance: ${data.points} Points\n👥 Total Refers: ${data.refers}\n🆔 User ID: <code>${chatId}</code>`, mainKeyboard());
        }

        else if (text === '👫 Refer & Earn') {
            const link = `https://t.me/Real_Case_earning_bot?start=${chatId}`;
            await sendMessage(chatId, `<b>👫 Refer & Earn</b>\n\nPer Refer: 50 Points\nLink: <code>${link}</code>`, mainKeyboard());
        }

    } catch (err) { console.error(err); }
    res.status(200).send('OK');
};

async function sendMessage(chatId, text, kb) {
    await axios.post(telegramUrl, {
        chat_id: chatId,
        text: text,
        parse_mode: 'HTML',
        reply_markup: kb,
        disable_web_page_preview: true
    });
}

function mainKeyboard() {
    return {
        keyboard: [
            [{ text: '📺 Watch Video' }, { text: '📅 Daily Bonus' }],
            [{ text: '👤 Profile' }, { text: '👫 Refer & Earn' }]
        ],
        resize_keyboard: true
    };
}
