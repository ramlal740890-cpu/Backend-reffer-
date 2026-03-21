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

module.exports = async (req, res) => {
    if (req.method !== 'POST') return res.status(200).send('Bot is Live! 🚀');

    try {
        const { message } = req.body;
        if (!message || !message.text) return res.status(200).send('OK');

        const chatId = message.chat.id.toString();
        const text = message.text;
        const firstName = message.from.first_name || "User";
        const userRef = db.collection('users').doc(chatId);

        // --- COMMANDS ---

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
            await sendMessage(chatId, `<b>Namaste ${firstName}! 🙏</b>\n\nIndia ke sabse trusted earning bot mein aapka swagat hai.\n\n💰 <b>Rewards:</b>\n📺 Video: 20 Points\n👫 Refer: 50 Points\n📅 Daily: 10 Points`, mainKeyboard());
        }

        // WATCH VIDEO (20 Points + 15s Timer Logic)
        else if (text === '📺 Watch Video') {
            const doc = await userRef.get();
            const userData = doc.data();
            const now = Date.now();
            const cooldown = 30 * 60 * 1000; // 30 Minute ka gap

            if (now - (userData.lastVideo || 0) < cooldown) {
                const remain = Math.ceil((cooldown - (now - userData.lastVideo)) / 60000);
                await sendMessage(chatId, `⏳ Agli video <b>${remain} min</b> baad dekhein.`);
            } else {
                const adLink = "https://horizontallyresearchpolar.com/r0wbx3kyf?key=8b0a2298684c7cea730312add326101b";
                await userRef.update({ points: admin.firestore.FieldValue.increment(20), lastVideo: now });
                await sendMessage(chatId, `<b>📺 Video Task Started!</b>\n\n1. Niche diye link par click karein.\n2. Video ko <b>15 Second</b> tak dekhein.\n3. Reward automatic add ho chuka hai!\n\n👉 <a href="${adLink}">Watch Video Now</a>`, mainKeyboard());
            }
        }

        // DAILY BONUS (10 Points)
        else if (text === '📅 Daily Bonus') {
            const doc = await userRef.get();
            const userData = doc.data();
            const now = Date.now();
            const oneDay = 24 * 60 * 60 * 1000;

            if (now - (userData.lastDaily || 0) < oneDay) {
                await sendMessage(chatId, "❌ Aap aaj ka bonus le chuke hain! Kal wapis aana.");
            } else {
                await userRef.update({ points: admin.firestore.FieldValue.increment(10), lastDaily: now });
                await sendMessage(chatId, "✅ <b>10 Points</b> Daily Bonus aapke account mein add ho gaya!");
            }
        }

        // PROFILE
        else if (text === '👤 Profile') {
            const doc = await userRef.get();
            const data = doc.data() || { points: 0, refers: 0 };
            await sendMessage(chatId, `<b>📊 User Dashboard</b>\n\n👤 Name: ${firstName}\n💰 Balance: <b>${data.points} Points</b>\n👥 Total Refers: ${data.refers}\n🆔 ID: <code>${chatId}</code>`, mainKeyboard());
        }

        // REFER & EARN
        else if (text === '👫 Refer & Earn') {
            const link = `https://t.me/Real_Case_earning_bot?start=${chatId}`;
            await sendMessage(chatId, `<b>👫 Refer & Earn</b>\n\nEk dost par <b>50 Points</b> milenge!\n\nAapka Link: <code>${link}</code>`, mainKeyboard());
        }

        // WITHDRAW
        else if (text === '🏦 Withdraw') {
            await sendMessage(chatId, "<b>🏦 Withdraw Panel</b>\n\nMinimum Withdrawal: <b>1000 Points (₹50)</b>\n\nApne points badhane ke liye refer karein!", mainKeyboard());
        }

    } catch (error) {
        console.error("Error:", error);
    }
    res.status(200).send('OK');
};

// Helper Functions
async function sendMessage(chatId, text, kb) {
    await axios.post(telegramUrl, { chat_id: chatId, text: text, parse_mode: 'HTML', reply_markup: kb, disable_web_page_preview: true });
}

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

