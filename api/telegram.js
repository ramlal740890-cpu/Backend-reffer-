const { Telegraf } = require('telegraf');
const admin = require('firebase-admin');

// --- 1. CONFIGURATION ---
const BOT_TOKEN = "7928266949:AAHqGiztgRNNGJ7u1jznA2ZuS98hshx8hXU"; // [cite: 2026-02-06]
const ADMIN_ID = "5802852969"; //
const FIREBASE_PROJECT_ID = "refer-erin"; //

// Firebase Initialization
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)),
    projectId: FIREBASE_PROJECT_ID
  });
}

const db = admin.firestore();
const bot = new Telegraf(BOT_TOKEN);

// --- 2. WELCOME LOGIC ---
async function sendWelcome(ctx, userData, userId, userName) {
  const inviteLink = `https://t.me/Refer_Erin_bot?start=${userId}`;
  const miniAppUrl = `https://backend-reffer-blond.vercel.app/web/index.html`; //

  const text = `Welcome ${userName}! ✨\n\n` +
               `💰 **Balance:** ${userData.balance || 0} Points\n` +
               `🔗 **Refer Link:**\n${inviteLink}\n\n` +
               `Ek share par **50 points** kamayein! 🚀\n` +
               `Nikaasi ke liye /withdraw likhein.`;

  return ctx.replyWithMarkdown(text, {
    reply_markup: {
      inline_keyboard: [
        [{ text: "🚀 Open Dashboard", web_app: { url: miniAppUrl } }],
        [{ text: "📤 Share & Earn (50 Pts)", switch_inline_query: `Join now & earn! Link: ${inviteLink}` }]
      ]
    }
  });
}

// --- 3. COMMANDS ---

// Start Command (Referral Handling)
bot.start(async (ctx) => {
  const userId = ctx.from.id.toString();
  const userName = ctx.from.first_name || "User";
  const referrerId = ctx.startPayload; 
  const now = admin.firestore.FieldValue.serverTimestamp();

  try {
    const userRef = db.collection('users').doc(userId);
    const doc = await userRef.get();

    if (!doc.exists) {
      // New User Creation
      await userRef.set({
        uid: userId,
        name: userName,
        balance: 0,
        referCount: 0,
        referredBy: (referrerId && referrerId !== userId) ? referrerId : null,
        joinedAt: now
      });

      // Referral Bonus (50 pts)
      if (referrerId && referrerId !== userId) {
        const referrerRef = db.collection('users').doc(referrerId);
        await referrerRef.update({
          balance: admin.firestore.FieldValue.increment(50),
          referCount: admin.firestore.FieldValue.increment(1)
        });
        
        try { await ctx.telegram.sendMessage(referrerId, `🎁 Badhai ho! ${userName} ne join kiya. Aapko 50 Points mile hain!`); } catch (e) {}
      }
    }
    
    const userData = (await userRef.get()).data();
    await sendWelcome(ctx, userData, userId, userName);

  } catch (error) {
    console.error("Error:", error);
    ctx.reply("System busy, please try again.");
  }
});

// Withdrawal Request
bot.hears(/UPI (.+)/i, async (ctx) => {
  const upiId = ctx.match[1];
  const userId = ctx.from.id.toString();
  const userRef = db.collection('users').doc(userId);
  const doc = await userRef.get();

  if (doc.exists && doc.data().balance >= 500) {
    const amount = doc.data().balance;
    await db.collection('withdrawals').add({
      userId, upi: upiId, amount, status: 'pending', timestamp: admin.firestore.FieldValue.serverTimestamp()
    });
    await userRef.update({ balance: 0 });
    ctx.reply(`✅ Request Sent! Amount: ${amount}\nAdmin jald hi process karega.`);
    await ctx.telegram.sendMessage(ADMIN_ID, `🚨 NEW PAYOUT!\nUser: ${userId}\nUPI: ${upiId}\nAmount: ${amount}`);
  } else {
    ctx.reply("❌ Minimum 500 points required for withdrawal.");
  }
});

// --- 4. EXPORT FOR VERCEL ---
module.exports = async (req, res) => {
  try {
    if (req.body) await bot.handleUpdate(req.body);
    res.status(200).send('OK');
  } catch (err) {
    res.status(200).send('OK');
  }
};
