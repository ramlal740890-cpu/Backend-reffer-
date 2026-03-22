const axios = require('axios');
const admin = require('firebase-admin');

// Firebase Initialization (Vercel env var se)
let db;
try {
  if (!admin.apps.length) {
    const serviceAccountVar = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!serviceAccountVar) {
      throw new Error("FIREBASE_SERVICE_ACCOUNT env var missing!");
    }
    // Replace \\n with actual new lines (Vercel multiline fix)
    const serviceAccount = JSON.parse(serviceAccountVar.replace(/\\n/g, '\n'));
    
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log("Firebase Connected! ✅");
  }
  db = admin.firestore();
} catch (e) {
  console.error("Firebase Init Error:", e.message);
  // In production, you can still respond OK but log error
}

const BOT_TOKEN = process.env.BOT_TOKEN;  // Vercel env se lo, hardcoded mat rakho!

// Telegram API helper (reuse karne ke liye)
async function sendMessage(chatId, text, replyMarkup = null) {
  const payload = {
    chat_id: chatId,
    text: text,
    parse_mode: 'HTML'
  };
  if (replyMarkup) {
    payload.reply_markup = replyMarkup;
  }
  try {
    await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, payload);
  } catch (err) {
    console.error("SendMessage error:", err.message);
  }
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(200).send('Bot is Running... 🟢');
  }

  try {
    const update = req.body;
    if (!update.message || !update.message.text) {
      return res.status(200).send('OK');
    }

    const message = update.message;
    const chatId = message.chat.id.toString();
    const text = message.text.trim();
    const firstName = message.from.first_name || "User";

    // Handle /start with optional referral param
    if (text.startsWith('/start')) {
      let inviteCode = null;
      const parts = text.split(/\s+/);  // better split
      if (parts.length > 1) {
        inviteCode = parts[1];  // e.g. /start ref12345 → inviteCode = ref12345
      }

      const userRef = db.collection('users').doc(chatId);
      const doc = await userRef.get();

      let welcomeBonus = 0;
      if (!doc.exists) {
        // New user
        welcomeBonus = 10;  // Optional welcome points
        await userRef.set({
          userId: chatId,
          name: firstName,
          points: welcomeBonus,
          referrals: 0,
          referredBy: inviteCode || null,
          joinedAt: new Date().toISOString()
        });

        // Give referral bonus if valid
        if (inviteCode && inviteCode !== chatId) {
          const referrerRef = db.collection('users').doc(inviteCode);
          const referrerDoc = await referrerRef.get();
          if (referrerDoc.exists) {
            await referrerRef.update({
              points: admin.firestore.FieldValue.increment(50),
              referrals: admin.firestore.FieldValue.increment(1)
            });
            // Optional: Notify referrer
            await sendMessage(inviteCode, `🎉 Naya dost join hua! +50 Points mile!`);
          }
        }

        // Give new user extra if referred
        if (inviteCode) {
          await userRef.update({
            points: admin.firestore.FieldValue.increment(20)  // extra for new referred user
          });
        }
      }

      // Main welcome message with keyboard
      const mainKeyboard = {
        keyboard: [
          [{ text: '👤 Profile' }, { text: '🔗 Refer Link' }],
          [{ text: '🎁 Daily Bonus' }, { text: '🎥 Watch Ad' }],
          [{ text: '🏦 Withdraw' }]
        ],
        resize_keyboard: true,
        one_time_keyboard: false
      };

      let welcomeText = `<b>Namaste ${firstName}! 🙏</b>\n\nRefer & Earn Bot mein swagat hai!\n\n`;
      welcomeText += `Roj 10 Points free daily bonus!\n15s Ad dekhne pe 20 Points\nHar referral pe 50 Points! 💰\n\nAaj hi doston ko bulao!`;

      await sendMessage(chatId, welcomeText, mainKeyboard);
    }

    // Handle button clicks (text messages from keyboard)
    else if (text === '🔗 Refer Link') {
      const referLink = `https://t.me/${process.env.BOT_USERNAME || 'refer_earning_robot'}?start=${chatId}`;
      await sendMessage(chatId, `<b>Aapka Referral Link:</b>\n\n${referLink}\n\nHar naye dost pe +50 Points! 🚀`);
    }

    else if (text === '👤 Profile') {
      const userDoc = await db.collection('users').doc(chatId).get();
      const points = userDoc.exists ? userDoc.data().points || 0 : 0;
      const referrals = userDoc.exists ? userDoc.data().referrals || 0 : 0;
      await sendMessage(chatId, `<b>👤 Aapka Profile</b>\n\nBalance: ${points} Points\nReferrals: ${referrals}`);
    }

    else if (text === '🎁 Daily Bonus') {
      // Placeholder: Add your 24h claim logic here
      await sendMessage(chatId, 'Daily Bonus coming soon! (24h cooldown logic add kar rahe hain)');
    }

    else if (text === '🎥 Watch Ad') {
      // Placeholder for ad
      await sendMessage(chatId, 'Ad link: https://your-ad-network.com (15s dekhne ke baad +20 points claim karo)');
    }

    else if (text === '🏦 Withdraw') {
      await sendMessage(chatId, 'Withdraw minimum 500 points. UPI/TON jaldi add hoga!');
    }

  } catch (err) {
    console.error("Bot Error:", err.message);
  }

  return res.status(200).send('OK');
};
