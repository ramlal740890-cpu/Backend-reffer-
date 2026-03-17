const { Telegraf } = require('telegraf');
const admin = require('firebase-admin');

// Firebase Initialization
if (!admin.apps.length) {
    try {
        const serviceAccount = require("../serviceAccountKey.json");
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            projectId: "refer-erin"
        });
    } catch (e) {
        console.error("Firebase Key Missing or Invalid:", e);
    }
}
const db = admin.firestore();

// Aapka Token yahan laga diya hai
const bot = new Telegraf('8732915577:AAFTTOBTUglMGvmX-W9iBjPtcqqAMejtATk');

bot.start(async (ctx) => {
    const userId = ctx.from.id.toString();
    const userName = ctx.from.first_name || "User";
    const referrerId = ctx.startPayload;

    try {
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
                await ctx.telegram.sendMessage(referrerId, `🎁 *Referral Bonus!* \n${userName} ne join kiya. Aapko 50 coins mile!`, { parse_mode: 'Markdown' });
            }
        }

        return ctx.replyWithMarkdown(
            `*Welcome to Refer_Erin_bot!* 🚀\n\nInvite friends and earn *50 coins* per referral.`,
            {
                reply_markup: {
                    inline_keyboard: [
                        [{ text: "🚀 Open App", web_app: { url: "https://refer-erin.web.app" } }],
                        [{ text: "📢 Join Channel", url: "https://t.me/Trendmansun" }]
                    ]
                }
            }
        );
    } catch (err) {
        console.error(err);
    }
});

module.exports = async (req, res) => {
    if (req.method === 'POST') {
        try {
            await bot.handleUpdate(req.body);
            res.status(200).send('OK');
        } catch (err) {
            res.status(500).send('Error');
        }
    } else {
        res.status(200).send('Bot is running...');
    }
};
