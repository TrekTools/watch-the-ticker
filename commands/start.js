const { SlashCommandBuilder } = require('discord.js');
const { createChart } = require('../utils/chartGenerator');
const { getTokenData } = require('../utils/tokenAnalyzer');

let trackingInterval;
let startPrice;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('start')
        .setDescription('Start tracking a token')
        .addStringOption(option =>
            option.setName('address')
                .setDescription('Token contract address')
                .setRequired(true)),

    async execute(interaction) {
        const tokenAddress = interaction.options.getString('address');
        
        try {
            // Get initial analysis
            const initialData = await getTokenData(tokenAddress);
            startPrice = initialData.price;

            await interaction.reply(`
Initial Analysis:
• Market Cap: $${initialData.marketCap.toLocaleString()}
• 24h Volume: $${initialData.volume.toLocaleString()}
• Current Price: $${initialData.price.toFixed(8)}
• Liquidity: $${initialData.liquidity.toLocaleString()}
            `);

            // Start periodic updates
            trackingInterval = setInterval(async () => {
                const chart = await createChart(tokenAddress);
                const analysis = await getTokenData(tokenAddress);
                
                await interaction.channel.send({
                    content: `
Market Update:
• Price: $${analysis.price.toFixed(8)}
• Change: ${((analysis.price - startPrice) / startPrice * 100).toFixed(2)}%
• Volume: $${analysis.volume.toLocaleString()}
                    `,
                    files: [chart]
                });
            }, 15 * 60 * 1000); // 15 minutes

        } catch (error) {
            await interaction.reply(`Error: ${error.message}`);
        }
    },
}; 