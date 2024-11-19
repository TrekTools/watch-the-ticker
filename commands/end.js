const { SlashCommandBuilder } = require('discord.js');
const { getTokenData } = require('../utils/tokenAnalyzer');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('end')
        .setDescription('End token tracking and show summary'),

    async execute(interaction) {
        if (!trackingInterval) {
            return await interaction.reply('No active tracking session to end.');
        }

        clearInterval(trackingInterval);
        
        try {
            const finalData = await getTokenData(tokenAddress);
            const pnl = ((finalData.price - startPrice) / startPrice * 100).toFixed(2);

            await interaction.reply(`
Trading Session Summary:
• Final PnL: ${pnl}%
• Volume: $${finalData.volume.toLocaleString()}
• Peak Price: $${finalData.highPrice.toFixed(8)}
• Lowest Price: $${finalData.lowPrice.toFixed(8)}
• Final Price: $${finalData.price.toFixed(8)}
            `);

            // Reset tracking variables
            trackingInterval = null;
            startPrice = null;
            
        } catch (error) {
            await interaction.reply(`Error: ${error.message}`);
        }
    },
}; 