const axios = require('axios');

// Bot Configuration
const token = process.env.BOT_TOKEN; // Vercel Settings mein add karein: 8711347335:AAFdZV11arLIR898b1Sh2zW7Ajdqp_P8RHM
const telegramUrl = `https://api.telegram.org/bot${token}/sendMessage`;

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(200).send('Bot is Running!');
    }

    try {
        const { message } = req.body;

        if (message && message.text) {
            const chatId = message.chat.id;
            const text = message.text;
            const firstName = message.from.first_name || "User";

            // 1. Start Command & Referral Logic
            if (text.startsWith('/start')) {
                const referralCode = text.split(' ')[1]; // Check if joined via link
                let welcomeMsg = `<b>Namaste ${firstName}! 🙏</b>\n\nWelcome to <b>Real Case Earning Bot</b>. Yahan aap tasks pure karke aur doston ko refer karke real money kama sakte hain.`;
                
                if (referralCode) {
                    welcomeMsg += `\n\n✅ Aapne ID: <code>${referralCode}</code> ke referral se join kiya hai!`;
                }

                await sendMessage(chatId, welcomeMsg, mainKeyboard());
            }

            // 2. Profile & Balance
            else if (text === '👤 Profile' || text === '/profile') {
                const profileMsg = `<b>📊 User Statistics</b>\n\n👤 Name: ${firstName}\n🆔 ID: <code>${chatId}</code>\n💰 Balance: ₹0.00\n👥 Total Refers: 0\n\n<i>Note: Database connect hone par real balance dikhega.</i>`;
                await sendMessage(chatId, profileMsg, mainKeyboard());
            }

            // 3. Refer & Earn Link
            else if (text === '👫 Refer & Earn') {
                const referLink = `https://t.me/Real_Case_earning_bot?start=${chatId}`;
                const referMsg = `<b>👫 Refer & Earn Program</b>\n\nPer Refer: ₹5.00\n\nAapka unique link niche hai. Ise apne doston ke saath share karein:\n\n<code>${referLink}</code>`;
                await sendMessage(chatId, referMsg, mainKeyboard());
            }

            // 4. Tasks Section
            else if (text === '📝 Tasks') {
                const taskMsg = `<b>📝 Available Tasks</b>\n\n1. Subscribe YouTube: ₹2.00\n2. Join Telegram: ₹1.00\n\n<i>Tasks pure karein aur screenshot admin ko bhejien.</i>`;
                await sendMessage(chatId, taskMsg, mainKeyboard());
            }

            // 5. Withdraw Section
            else if (text === '🏦 Withdraw') {
                const withdrawMsg = `<b>🏦 Withdrawal Request</b>\n\nMinimum Payout: ₹50.00\n\nAapka balance abhi kam hai. Earning badhane ke liye refer karein!`;
                await sendMessage(chatId, withdrawMsg, mainKeyboard());
            }

            // Default Response
            else {
                await sendMessage(chatId, "Kripya niche diye gaye buttons ka use karein 👇", mainKeyboard());
            }
        }
    } catch (error) {
        console.error("Bot Error:", error);
    }

    res.status(200).send('OK');
};

// Helper Function: Send Message
async function sendMessage(chatId, text, replyMarkup) {
    await axios.post(telegramUrl, {
        chat_id: chatId,
        text: text,
        parse_mode: 'HTML',
        reply_markup: replyMarkup
    });
}

// Custom Keyboard Layout
function mainKeyboard() {
    return {
        keyboard: [
            [{ text: '👤 Profile' }, { text: '👫 Refer & Earn' }],
            [{ text: '📝 Tasks' }, { text: '🏦 Withdraw' }]
        ],
        resize_keyboard: true
    };
}
