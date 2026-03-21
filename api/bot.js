const axios = require('axios');

// Vercel Settings se variables uthaye gaye hain
const token = process.env.BOT_TOKEN; 
const telegramUrl = `https://api.telegram.org/bot${token}/sendMessage`;

module.exports = async (req, res) => {
    // Sirf POST requests (Telegram Webhook) ko handle karega
    if (req.method !== 'POST') {
        return res.status(200).send('Real Case Earning Bot is Live! 🚀');
    }

    try {
        const { message } = req.body;

        if (message && message.text) {
            const chatId = message.chat.id;
            const text = message.text;
            const firstName = message.from.first_name || "User";

            // 1. START COMMAND & REFERRAL LOGIC
            if (text.startsWith('/start')) {
                const referralCode = text.split(' ')[1]; 
                let welcomeMsg = `<b>Namaste ${firstName}! 🙏</b>\n\nWelcome to <b>Real Case Earning Bot</b>. Yahan aap doston ko refer karke aur tasks pure karke ₹ kama sakte hain.`;
                
                if (referralCode && referralCode != chatId) {
                    welcomeMsg += `\n\n✅ Aapne ID: <code>${referralCode}</code> ke link se join kiya hai!`;
                }

                await sendMessage(chatId, welcomeMsg, mainKeyboard());
            }

            // 2. PROFILE SECTION
            else if (text === '👤 Profile') {
                const profileMsg = `<b>📊 User Statistics</b>\n\n👤 Name: ${firstName}\n🆔 ID: <code>${chatId}</code>\n💰 Balance: ₹0.00\n👥 Total Refers: 0`;
                await sendMessage(chatId, profileMsg, mainKeyboard());
            }

            // 3. REFER & EARN
            else if (text === '👫 Refer & Earn') {
                const referLink = `https://t.me/Real_Case_earning_bot?start=${chatId}`;
                const referMsg = `<b>👫 Refer & Earn</b>\n\nPer Refer: ₹5.00\n\nAapka unique referral link niche hai:\n\n<code>${referLink}</code>\n\nIse apne doston ko bhejein aur earning shuru karein!`;
                await sendMessage(chatId, referMsg, mainKeyboard());
            }

            // 4. WITHDRAW SECTION
            else if (text === '🏦 Withdraw') {
                const withdrawMsg = `<b>🏦 Withdrawal Panel</b>\n\nMinimum Payout: ₹50.00\n\nAapka balance abhi ₹0.00 hai. Withdrawal ke liye aur refer karein.`;
                await sendMessage(chatId, withdrawMsg, mainKeyboard());
            }

            // Default response if no command matches
            else {
                await sendMessage(chatId, "Niche diye gaye buttons ka istemal karein 👇", mainKeyboard());
            }
        }
    } catch (error) {
        console.error("Bot Error:", error);
    }

    res.status(200).send('OK');
};

// Message bhejne ke liye helper function
async function sendMessage(chatId, text, replyMarkup) {
    try {
        await axios.post(telegramUrl, {
            chat_id: chatId,
            text: text,
            parse_mode: 'HTML',
            reply_markup: replyMarkup
        });
    } catch (err) {
        console.error("Telegram API Error:", err.response ? err.response.data : err.message);
    }
}

// Bot ke niche wale buttons (Keyboard)
function mainKeyboard() {
    return {
        keyboard: [
            [{ text: '👤 Profile' }, { text: '👫 Refer & Earn' }],
            [{ text: '🏦 Withdraw' }]
        ],
        resize_keyboard: true
    };
}

