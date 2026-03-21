const { Telegraf } = require('telegraf');
const { db } = require('../firebase.js');

const bot = new Telegraf(process.env.BOT_TOKEN);

// Helper: Get or create user
async function getUser(userId) {
  const userRef = db.collection('users').doc(userId.toString());
  const doc = await userRef.get();
  
  if (!doc.exists) {
    await userRef.set({
      points: 10, // Welcome bonus for new user
      referrals: 0,
      lastDaily: 0,
      createdAt: new Date()
    });
    return { points: 10, referrals: 0, lastDaily: 0 };
  }
  
  return doc.data();
}

// Helper: Update points
async function updatePoints(userId, addPoints) {
  const userRef = db.collection('users').doc(userId.toString());
  await userRef.update({
    points: admin.firestore.FieldValue.increment(addPoints)
  });
}

// Welcome + Start (with referral support)
bot.start(async (ctx) => {
  const userId = ctx.from.id;
  const args = ctx.startPayload; // referral id if ?start=ref12345
  let refId = null;
  
  if (args && args.startsWith('ref')) {
    refId = args.replace('ref', '');
  }

  const user = await getUser(userId);

  let message = `🌟 स्वागत है ${ctx.from.first_name}! India के सबसे तेज Earn Bot में!\n\n`;
  message += `📱 रोज़ाना 10 Points Free\n`;
  message += `🎥 15 सेकंड Ad देखो → 20 Points\n`;
  message += `👥 दोस्त को शेयर करो → 50 Points हर referral पर!\n\n`;
  message += `🚀 "काम करने वालों के लिए दुनिया खुली है!"\nAaj hi 5 दोस्तों को बुलाओ और withdraw शुरू करो!`;

  if (refId && refId !== userId.toString()) {
    // Referral valid hai?
    const referrer = await getUser(refId);
    if (referrer) {
      await updatePoints(refId, 50);
      await db.collection('users').doc(refId.toString()).update({
        referrals: admin.firestore.FieldValue.increment(1)
      });
      await ctx.telegram.sendMessage(refId, `🎉 नया दोस्त आया! +50 Points मिले!`);
      message += `\n\n🔥 Referral से Bonus: तुझे भी +20 Points मिले (new user welcome extra)`;
      await updatePoints(userId, 20); // New user ko extra
    }
  }

  const keyboard = [
    [{ text: '👤 Profile', callback_data: 'profile' }],
    [{ text: '🎁 Daily Bonus', callback_data: 'daily' }],
    [{ text: '🎥 Watch Ad (20 pts)', callback_data: 'ad' }],
    [{ text: '🔗 Refer & Earn', callback_data: 'refer' }],
    [{ text: '🏦 Withdraw', callback_data: 'withdraw' }]
  ];

  await ctx.replyWithMarkdown(message, {
    reply_markup: { inline_keyboard: keyboard }
  });

  // Referral link generate
  const refLink = `https://t.me/${ctx.botInfo.username}?start=ref${userId}`;
  await db.collection('users').doc(userId.toString()).update({ refLink });
});

// Profile button
bot.action('profile', async (ctx) => {
  const user = await getUser(ctx.from.id);
  await ctx.answerCbQuery();
  await ctx.reply(`👤 तेरा Profile:\n\nPoints: ${user.points || 0}\nReferrals: ${user.referrals || 0}\nDaily last claim: ${new Date(user.lastDaily).toLocaleString()}`);
});

// Daily Bonus
bot.action('daily', async (ctx) => {
  const userId = ctx.from.id;
  const user = await getUser(userId);
  const now = Date.now();
  const oneDay = 24 * 60 * 60 * 1000;

  await ctx.answerCbQuery();

  if (now - user.lastDaily < oneDay) {
    const remaining = Math.ceil((oneDay - (now - user.lastDaily)) / 3600000);
    return ctx.reply(`⏳ Daily Bonus already claimed! ${remaining} घंटे बाद फिर try करो।`);
  }

  await updatePoints(userId, 10);
  await db.collection('users').doc(userId.toString()).update({ lastDaily: now });

  ctx.reply('🎉 Daily 10 Points claim हो गए! 🔥');
});

// Ad placeholder (real mein Mini App shift kar lena)
bot.action('ad', async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.reply('🎥 Ad dekhne ke liye: https://your-ad-link.com (15s dekhne ke baad yaha wapas aa +20 points claim kar)\n\n[Placeholder: Real rewarded video Mini App mein integrate hoga]');
  // Future: await updatePoints(ctx.from.id, 20); // after verification
});

// Refer
bot.action('refer', async (ctx) => {
  await ctx.answerCbQuery();
  const userId = ctx.from.id;
  const user = await getUser(userId);
  const refLink = user.refLink || `https://t.me/${ctx.botInfo.username}?start=ref${userId}`;
  
  ctx.reply(`🔗 अपना referral link:\n${refLink}\n\nHar naye user pe +50 Points!\nZyada se zyada share karo! 🚀`);
});

// Withdraw placeholder
bot.action('withdraw', async (ctx) => {
  await ctx.answerCbQuery();
  ctx.reply('🏦 Withdraw: Minimum 500 points chahiye.\nUPI / TON wallet add karne ka option jaldi aayega.\nAbhi under development hai!');
});

bot.launch().then(() => {
  console.log('Bot started on Vercel');
});

// Vercel serverless handler
module.exports = async (req, res) => {
  await bot.handleUpdate(req.body, res);
  res.status(200).end();
};
