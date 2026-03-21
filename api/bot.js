const axios = require('axios');
const admin = require('firebase-admin');

// 1. Firebase Admin Initialization
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT))
    });
}
const db = admin.firestore();

// 2. Configuration
const token = process.env.BOT_TOKEN; 
const telegramUrl = `https://api.telegram.org/bot${token}/sendMessage`;
const AD_LINK = "https://horizontallyresearchpolar.com/r0wbx3kyf?key=8b0a2298684c7cea730312add326101b";

module.exports = async (req, res) => {
    if (req.method !== 'POST') return res.status(200).send('Earning Bot is Live! 🚀');

    try {
        const { message } = req.body;
        if (!message || !message.text) return res.status(200).send('OK');

        const chatId = message.chat.id.toString();
        const text = message.text;
        const name = message.from.first_name || "User";
        const userRef = db.collection('users').doc(chatId);

        // --- BOT LOGIC ---

        // START & REFERRAL (50 Points)
        if (text.startsWith('/start')) {
            const doc = await userRef.get();
            if (!doc.exists) {
                const refCode = text.split(' ')[1];
                await userRef.set({ points: 0, lastVideo: 0, lastDaily: 0, refers: 0 });
                
                if (refCode && refCode !== chatId) {
                    const rRef = db.collection('users').doc(refCode);
                    await rRef.update({ 
                        points: admin.firestore.FieldValue.increment(50), 
                        refers: admin.firestore.FieldValue.increment(1) 
                    });
                }
            }
            const welcomeMsg = `<b>Namaste ${name}! 🙏</b>\n\nIndia ke No.1 Earning Bot mein swagat hai.\n\n💰 <b>Rewards Guide:</b>\n📺 Video Ad: 20 Points\n👫 Per Refer: 50 Points\n📅 Daily Check-in: 10 Points`;
            await sendMessage(chatId, welcomeMsg, mainKeyboard());
        }

        // WATCH VIDEO (20 Points + 15s Timer Instruction)
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
                const adMsg = `<b>📺 Reward Task!</b>\n\nNiche button par click karein aur 15 Second tak video dekhein.\n\nReward automatic add kar diya gaya hai!`;
                const inlineKb = { inline_keyboard: [[{ text: "🚀 Open Video Ad", url: AD_LINK }]] };
                await sendMessage(chatId, adMsg, null, inlineKb);
            }
        }

        // DAILY BONUS (10 Points)
        else if (text === '📅 Daily Bonus') {
            const doc = await userRef.get();
            const userData = doc.data();
            const now = Date.now();
            if (now - (userData.lastDaily || 0) < 86400000) {
                await sendMessage(chatId, "❌ Aap aaj ka bonus pehle hi le chuke hain. Kal wapis aayein!");
            } else {
                await userRef.update({ points: admin.firestore.FieldValue.increment(10), lastDaily: now });
                await sendMessage(chatId, "✅ <b>10 Points</b> Daily Bonus add kar diya gaya hai!");
            }
        }

        // PROFILE & STATISTICS
        else if (text === '👤 Profile') {
            const doc = await userRef.get();
            const d = doc.data() || { points: 0, refers: 0 };
            const profileMsg = `<b>📊 My Dashboard</b>\n\n👤 Name: ${name}\n💰 Balance: <b>${d.points} Points</b>\n👥 Total Refers: ${d.refers}\n🆔 User ID: <code>${chatId}</code>`;
            await sendMessage(chatId, profileMsg, mainKeyboard());
        }

        // REFER & EARN
        else if (text === '👫 Refer & Earn') {
            const link = `https://t.me/Real_Case_earning_bot?start=${chatId}`;
            await sendMessage(chatId, `<b>👫 Refer & Earn</b>\n\nEk dost ko join karwane par <b>50 Points</b> milenge!\n\nAapka Link: <code>${link}</code>`, mainKeyboard());
        }

        // WITHDRAW
        else if (text === '🏦 Withdraw') {
            await sendMessage(chatId, "<b>🏦 Withdraw Panel</b>\n\nMinimum Withdrawal: 1000 Points (₹50).\n\nApne points badhane ke liye refer aur video dekhte rahein!", mainKeyboard());
        }

    } catch (e) { console.error("Bot Error:", e); }
    res.status(200).send('OK');
};

// Helper function to send messages
async function sendMessage(chatId, text, kb, inlineKb) {
    await axios.post(telegramUrl, {
        chat_id: chatId,
        text: text,
        parse_mode: 'HTML',
        reply_markup: inlineKb || kb,
        disable_web_page_preview: true
    });
}

// Main Menu Buttons
function mainKeyboard() {
    return {
        keyboard: [
            [{ text: '📅 Daily Bonus' }, { text: '📺 Watch Video' }],
            [{ text: '👤 Profile' }, { text: '👫 Refer & Earn' }],
            [{ text: '🏦 Withdraw' }]
        ],
        resize_keyboard: true
    };
}
