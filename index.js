require('dotenv').config();
const CryptoCommentator = require('./bot');

async function startBot() {
    const bot = new CryptoCommentator();
    console.log('Token loaded:', process.env.DISCORD_TOKEN ? 'Yes' : 'No');
    await bot.start(process.env.DISCORD_TOKEN);
}

startBot().catch(console.error); 