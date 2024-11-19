require('dotenv').config();
const CryptoCommentator = require('./bot.js');

async function startBot() {
    const bot = new CryptoCommentator();
    await bot.start(process.env.DISCORD_TOKEN);
}

startBot().catch(console.error); 