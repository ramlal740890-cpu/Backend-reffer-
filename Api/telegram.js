const { Telegraf } = require('telegraf');
const admin = require('firebase-admin');

// Firebase Initialization
if (!admin.apps.length) {
    const serviceAccount = require("../serviceAccountKey.json");
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: "refer-erin"
    });
}
const db = admin.firestore();

const bot = new Telegraf('8732915577:AAFTTOBTUglMGvmX-W9iBjPtcqqAMejtATk');

// Bot Logic
bot.start(async (ctx) => {
    const userId = ctx.from.id.toString();
    const userName = ctx.from.first_name || "User";
    const referrerId = ctx.startPayload;

    const userRef = db.collection('users').doc(userId);
    const doc = await userRef.get();

    if (!doc.exists) {
        await userRef.set({
            uid: userId,
            name: userName,
            balance: 0,
            referredBy: (referrerId && referrerId !== userId) ? referrerId : null,
            lastBonus: 0,
            joinedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        if (referrerId && referrerId !== userId) {
            await db.collection('users').doc(referrerId).update({
                balance: admin.firestore.FieldValue.increment(50)
            });
            await ctx.telegram.sendMessage(referrerId, `🎁 Referral Bonus! ${userName} joined.`);
        }
    }

    return ctx.reply(`Welcome ${userName}! Use the Mini App to earn coins.`, {
        reply_markup: {
            inline_keyboard: [
                [{ text: "🚀 Open App", web_app: { url: "https://refer-erin.web.app" } }]
            ]
        }
    });
});

// Vercel Serverless Handler
module.exports = async (req, res) => {
    try {
        await bot.handleUpdate(req.body);
        res.status(200).send('OK');
    } catch (err) {
        console.error(err);
        res.status(500).send('Error');
    }
};
