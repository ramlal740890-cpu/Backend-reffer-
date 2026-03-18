const { Telegraf } = require('telegraf');
const admin = require('firebase-admin');

// Firebase Initialization
if (!admin.apps.length) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: "refer-erin" // Aapki project ID
  });
}

const db = admin.firestore();

// Aapka Bot Token Environment Variable se
const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

// Bot Logic
bot.start(async (ctx) => {
  const userId = ctx.from.id.toString();
  const userName = ctx.from.first_name || "User";
  const referrerId = ctx.startPayload; // Referral link se ID nikalne ke liye

  try {
    const userRef = db.collection('users').doc(userId);
    const doc = await userRef.get();

    if (!doc.exists) {
      // Naya user create karna
      await userRef.set({
        uid: userId,
        name: userName,
        balance: 0,
        referredBy: (referrerId && referrerId !== userId) ? referrerId : null,
        lastBonus: 0,
        joinedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // Agar koi referral hai to use bonus dena
      if (referrerId && referrerId !== userId) {
        const referrerRef = db.collection('users').doc(referrerId);
        await referrerRef.update({
          balance: admin.firestore.FieldValue.increment(50) // 50 coins bonus
        });
        await ctx.telegram.sendMessage(referrerId, `🎁 Referral Bonus! ${userName} joined using your link.`);
      }
    }

    return ctx.reply(`Welcome ${userName}! Use the Mini App to earn coins.`, {
      reply_markup: {
        inline_keyboard: [
          [{ text: "🚀 Open App", web_app: { url: "https://refer-erin.web.app" } }]
        ]
      }
    });
  } catch (error) {
    console.error("Error in start command:", error);
  }
});

// ... baaki puraana code ...

// Vercel Serverless Handler
module.exports = async (req, res) => {
  try {
    // Ye zaroori hai taaki Telegram baar-baar message na bheje
    if (req.body) {
      await bot.handleUpdate(req.body);
    }
    res.status(200).send('OK'); // Ye line Telegram ko batati hai ki message mil gaya
  } catch (err) {
    console.error(err);
    res.status(200).send('OK'); // Error hone par bhi OK bhejein taaki loop na bane
  }
};


