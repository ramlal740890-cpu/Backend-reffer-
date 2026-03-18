const { Telegraf } = require('telegraf');
const admin = require('firebase-admin');

// Firebase Initialization
if (!admin.apps.length) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: "refer-erin" 
  });
}

const db = admin.firestore();
const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

// --- 1. START COMMAND (Referral Logic) ---
bot.start(async (ctx) => {
  const userId = ctx.from.id.toString();
  const userName = ctx.from.first_name || "User";
  const referrerId = ctx.startPayload; 
  const inviteLink = `https://t.me/Refer_Erin_bot?start=${userId}`;

  try {
    const userRef = db.collection('users').doc(userId);
    const doc = await userRef.get();

    if (!doc.exists) {
      // Naya user setup (Points: 0)
      await userRef.set({
        uid: userId,
        name: userName,
        balance: 0,
        referredBy: (referrerId && referrerId !== userId) ? referrerId : null,
        joinedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // REFERRAL BONUS: Agar naya user kisi ke link se aaya hai
      if (referrerId && referrerId !== userId) {
        const referrerRef = db.collection('users').doc(referrerId);
        
        // Referrer ko 50 points dena
        await referrerRef.update({
          balance: admin.firestore.FieldValue.increment(50)
        });
        
        // Referrer ko notification bhejna
        try {
          await ctx.telegram.sendMessage(referrerId, `🎁 Badhai ho! ${userName} ne join kiya. Aapko 50 Points mile hain!`);
        } catch (e) { console.log("Notification error"); }
      }
    }

    const userData = (await userRef.get()).data();

    return ctx.reply(
      `Welcome ${userName}! ✨\n\n` +
      `💰 Aapka Balance: ${userData.balance} Points\n` +
      `🔗 Referral Link: ${inviteLink}\n\n` +
      `Ek share par 50 points kamayein! 🚀\n` +
      `Nikaasi ke liye /withdraw likhein.`, 
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: "🚀 Open App", web_app: { url: "https://refer-erin.web.app" } }],
            [{ text: "📤 Share & Earn 50 Pts", switch_inline_query: `Join karein aur kamaayein! Link: ${inviteLink}` }]
          ]
        }
      }
    );
  } catch (error) {
    console.error("Start Error:", error);
  }
});

// --- 2. WITHDRAW COMMAND ---
bot.command('withdraw', async (ctx) => {
  const userId = ctx.from.id.toString();
  
  try {
    const userRef = db.collection('users').doc(userId);
    const doc = await userRef.get();
    const balance = doc.exists ? doc.data().balance : 0;

    if (balance < 500) { // Minimum withdrawal limit (Aap badal sakte hain)
      return ctx.reply(`❌ Withdrawal ke liye kam se kam 500 points chahiye. Aapka balance: ${balance}`);
    }

    // Withdrawal process start
    return ctx.reply(`Aapke paas ${balance} points hain. Withdrawal ke liye apna UPI ID bhejye (Format: UPI id_yahan_likhein)`);
  } catch (e) {
    ctx.reply("Error processing withdrawal.");
  }
});

// UPI ID sunne ke liye basic handler
bot.hears(/UPI (.+)/i, async (ctx) => {
  const upiId = ctx.match[1];
  const userId = ctx.from.id.toString();
  
  const userRef = db.collection('users').doc(userId);
  const doc = await userRef.get();
  const balance = doc.data().balance;

  if (balance >= 500) {
    // Database mein withdrawal request save karna
    await db.collection('withdrawals').add({
      userId: userId,
      upi: upiId,
      amount: balance,
      status: 'pending',
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });

    // Balance zero karna
    await userRef.update({ balance: 0 });

    ctx.reply(`✅ Withdrawal request bhej di gayi hai!\nUPI: ${upiId}\nPoints: ${balance}\n24 ghante mein check karein.`);
  }
});

// Vercel Handler
module.exports = async (req, res) => {
  try {
    if (req.body) await bot.handleUpdate(req.body);
    res.status(200).send('OK');
  } catch (err) {
    res.status(200).send('OK');
  }
};
