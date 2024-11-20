const { Client, GatewayIntentBits, AttachmentBuilder, REST, Routes, SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { ChartJSNodeCanvas } = require('chartjs-node-canvas');
const schedule = require('node-schedule');
const OpenAI = require('openai');
const sharp = require('sharp');

class CryptoCommentator {
    constructor() {
        this.client = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.MessageContent
            ]
        });
        
        this.tokenSymbol = null;
        this.channelId = null;
        this.chartGenerator = new ChartJSNodeCanvas({
            width: 800,
            height: 400,
            backgroundColour: '#000000'
        });

        this.commentatorWidth = 120;  // Width in pixels
        this.commentatorHeight = 75; // Height in pixels

        this.priceHistory = {
            timestamps: [],
            prices: [],
            movements: []
        };

        // Add P&L tracking
        this.initialInvestment = 10; // $10 USD
        this.entryPrice = null;
        this.currentValue = null;
        this.pnlHistory = [];

        // Add commands collection to track slash commands
        this.commands = [
            new SlashCommandBuilder()
                .setName('check')
                .setDescription('Check if the crypto commentator is live!')
                .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
                .toJSON(),
            new SlashCommandBuilder()
                .setName('start')
                .setDescription('Start tracking a Solana token')
                .addStringOption(option => 
                    option.setName('address')
                        .setDescription('The Solana token address to track')
                        .setRequired(true))
                .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
                .toJSON(),
            new SlashCommandBuilder()
                .setName('end')
                .setDescription('Stop tracking the current token')
                .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
                .toJSON()
        ];

        this.updateInterval = '*/1 * * * *';
        this.updateJob = null;

        // Initialize OpenAI with new syntax
        this.openai = new OpenAI({
            apiKey: process.env.OPEN_AI_KEY
        });

        this.setupBot();
        this.setupCommands();
    }

    setupBot() {
        this.client.once('ready', () => {
            console.log('Crypto Commentator is LIVE! 🎙️');
        });

        // Add message handler
        this.client.on('messageCreate', async message => {
            if (message.author.bot) return;
            await this.handleInteraction(message);
        });
    }

    async setupCommands() {
        this.client.on('interactionCreate', async interaction => {
            if (!interaction.isChatInputCommand()) return;

            // Check permissions first
            if (!await this.checkAdminPermissions(interaction)) return;

            switch (interaction.commandName) {
                case 'check':
                    const uptime = this.client.uptime;
                    const hours = Math.floor(uptime / 3600000);
                    const minutes = Math.floor((uptime % 3600000) / 60000);

                    await interaction.reply({
                        content: `🎙️ **CRYPTO COMMENTATOR STATUS CHECK!** 🎙️\n
                        ABSOLUTELY FANTASTIC NEWS, FOLKS! I'M ALIVE AND KICKING! 🎉\n
                        🕒 Uptime: ${hours}h ${minutes}m\n
                        🎯 Tracking: ${this.tokenSymbol || 'No token set'}\n
                        📢 Broadcasting to: ${this.channelId ? `<#${this.channelId}>` : 'No channel set'}`,
                        ephemeral: false
                    });
                    break;

                case 'start':
                    const address = interaction.options.getString('address');
                    
                    try {
                        // First, acknowledge the command immediately
                        await interaction.deferReply();

                        // Validate the address
                        if (!address || !address.trim()) {
                            await interaction.editReply('❌ Please provide a valid token address!');
                            return;
                        }

                        this.tokenSymbol = address.trim();
                        this.channelId = interaction.channelId;
                        
                        // Test fetch price data
                        try {
                            const initialPriceData = await this.fetchPriceData();
                            this.entryPrice = initialPriceData.price;
                            this.currentValue = this.initialInvestment;
                            this.pnlHistory = [];
                        } catch (error) {
                            console.error('Error fetching initial price data:', error);
                            await interaction.editReply('❌ Could not fetch price data for this token. Please check the address and try again!');
                            this.tokenSymbol = null;
                            this.channelId = null;
                            return;
                        }

                        // Generate opening message
                        const openingMessages = [
                            "🎭 LADIES AND GENTLEMEN! In the red corner, we have a DEGEN with nothing but HOPES AND DREAMS! In the blue corner, the undefeated champion: CRUSHING MARKET REALITY! 🥊",
                            "🎪 STEP RIGHT UP, FOLKS! Watch as one brave soul's dream of generational wealth goes toe-to-toe with the harsh mistress of market volatility! 🎯",
                            "🎪 WELCOME TO THE GREATEST SHOW IN CRYPTO! One degen's journey from zero to hero... or zero to zero! Place your bets! 🎲",
                            "🎭 IN TODAY'S EPISODE: A tale of greed, glory, and the never-ending quest for financial freedom! Will our hero prevail?! 🏆",
                            "🎪 BEHOLD! The age-old battle between hopium and reality! Witness one degen's attempt to defy the odds! 💫",
                            "🎭 THE STAGE IS SET! One trader's dream of Lambos and luxury faces off against the cold, hard reality of the markets! 🚗",
                            "🎪 GATHER 'ROUND! Watch as pure, unfiltered hopium collides with the immovable force of market dynamics! 💥",
                            "🎭 TONIGHT'S MAIN EVENT: Diamond hands versus paper hands! Will our hero HODL their way to victory?! 💎",
                            "🎪 THE ETERNAL STRUGGLE CONTINUES! One trader's moonshot dreams versus the gravity of market reality! 🌙",
                            "🎭 WELCOME TO THE THUNDERDOME! Where one degen's 'This time it's different!' meets 'Sir, this is a Wendy's!' 🍔"
                        ];

                        const openingMessage = openingMessages[Math.floor(Math.random() * openingMessages.length)];
                        
                        // Send and pin the opening message
                        const initialMessage = await interaction.channel.send(`
${openingMessage}

📊 **TOKEN ADDRESS**: \`${address}\`
⏰ **STARTING TIME**: ${new Date().toLocaleString()}

🎮 **THE RULES OF THE GAME**:
• Initial Bet: $10 USD goes in at market open
• Win Condition: 20x or BUST - no in-betweens!
• Stop Loss: We don't do that here 🚫
• Duration: One ticket per day, may the odds be ever in our favor
• Strategy: Pure, unfiltered HODL energy 💎🙌

🎯 **MISSION**: Turn $10 into $200 or into a valuable lesson about life
🏆 **ODDS**: Better than zero, worse than you think
⚠️ **RISK**: Yes.

*Grab your popcorn folks, this is going to be a wild ride!* 🍿

_This is not financial advice. This is financial entertainment._ 😎
                        `);
                        
                        await initialMessage.pin();
                        
                        // Clear any existing update job
                        if (this.updateJob) {
                            this.updateJob.cancel();
                        }
                        
                        // Start the update loop
                        this.updateJob = schedule.scheduleJob(this.updateInterval, async () => {
                            if (this.tokenSymbol && this.channelId) {
                                try {
                                    await this.sendUpdate();
                                } catch (error) {
                                    console.error('Error in update loop:', error);
                                }
                            }
                        });
                        
                        // Confirm command completion using editReply instead of reply
                        await interaction.editReply(`🎙️ ALRIGHT FOLKS! Starting to track Solana token ${address} in this channel! Updates every minute! LET'S GET THIS PARTY STARTED! 🎉`);
                        
                        // Send first update immediately
                        await this.sendUpdate();
                    } catch (error) {
                        console.error('Error during start command:', error);
                        this.tokenSymbol = null;
                        this.channelId = null;
                        if (this.updateJob) {
                            this.updateJob.cancel();
                            this.updateJob = null;
                        }
                        await interaction.followUp('❌ Error starting tracking. Please check the token address and try again!');
                    }
                    break;

                case 'end':
                    if (!this.tokenSymbol || !this.channelId) {
                        await interaction.reply('❌ No token currently being tracked!');
                        return;
                    }

                    const finalPnL = ((this.currentValue / this.initialInvestment - 1) * 100).toFixed(2);
                    const finalValue = this.formatUSD(this.currentValue);
                    const duration = Math.floor((Date.now() - this.pnlHistory[0].timestamp) / 1000 / 60); // minutes

                    const oldToken = this.tokenSymbol;
                    this.tokenSymbol = null;
                    this.channelId = null;
                    
                    // Cancel the update job
                    if (this.updateJob) {
                        this.updateJob.cancel();
                        this.updateJob = null;
                    }

                    // Clear price history
                    this.priceHistory = {
                        timestamps: [],
                        prices: [],
                        movements: []
                    };

                    await interaction.reply(`🎙️ **FINAL RESULTS**
Initial Investment: ${this.formatUSD(this.initialInvestment)}
Final Value: ${finalValue}
Return: ${finalPnL}%
Duration: ${duration} minutes

🎙️ THAT'S ALL FOLKS! Stopped tracking ${oldToken}! Thanks for tuning in! 👋`);
                    break;
            }
        });
    }

    async registerCommands() {
        try {
            console.log('Started refreshing application (/) commands.');

            const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

            await rest.put(
                Routes.applicationCommands(process.env.CLIENT_ID),
                { body: this.commands },
            );

            console.log('Successfully reloaded application (/) commands.');
        } catch (error) {
            console.error(error);
        }
    }

    async start(token) {
        await this.client.login(token);
        await this.registerCommands();
    }

    async resizeCommentatorImage() {
        try {
            const resized = await sharp('./images/des.jpeg')
                .resize(this.commentatorWidth, this.commentatorHeight, {
                    fit: 'contain',
                    background: { r: 0, g: 0, b: 0, alpha: 0 }
                })
                .toBuffer();
            return resized;
        } catch (error) {
            console.error('Error resizing commentator image:', error);
            return null;
        }
    }

    async sendUpdate() {
        try {
            const channel = await this.client.channels.fetch(this.channelId);
            const priceData = await this.fetchPriceData();
            const chartBuffer = await this.generateChart(priceData);
            const commentary = this.generateCommentary(priceData);

            // Calculate P&L
            const currentTokens = this.initialInvestment / this.entryPrice;
            this.currentValue = currentTokens * priceData.price;
            const pnlAmount = this.currentValue - this.initialInvestment;
            const pnlPercent = ((this.currentValue / this.initialInvestment - 1) * 100).toFixed(2);

            // Format P&L message with color
            const pnlMessage = pnlAmount >= 0 
                ? `\`\`\`diff\n+$${Math.abs(pnlAmount).toFixed(2)} (${pnlPercent}%)\n\`\`\``
                : `\`\`\`diff\n-$${Math.abs(pnlAmount).toFixed(2)} (${pnlPercent}%)\n\`\`\``;

            // Create attachments
            const chartAttachment = new AttachmentBuilder(chartBuffer, { name: 'chart.png' });
            const commentaryAttachment = new AttachmentBuilder(
                await this.resizeCommentatorImage() || './images/des.jpeg',
                { name: 'des.jpeg' }
            );

            // First send the chart with stats
            await channel.send({
                content: `🎙️ **${priceData.name}** @ ${this.formatUSD(priceData.price)}\n${commentary.stats}`,
                files: [chartAttachment]
            });

            // Send commentator image first, then commentary and P&L
            await channel.send({
                files: [commentaryAttachment],
                content: `*"${this.generateExcitingComment(priceData)}"*\n${pnlMessage}`
            });

        } catch (error) {
            console.error('Error sending update:', error);
        }
    }

    async fetchPriceData() {
        try {
            if (!this.tokenSymbol) {
                throw new Error('No token symbol set');
            }

            const address = this.tokenSymbol.trim();
            const response = await fetch(`https://app.geckoterminal.com/api/p1/solana/pools/${address}`);
            
            if (!response.ok) {
                throw new Error(`GeckoTerminal API error: ${response.status}`);
            }

            const data = await response.json();
            const attributes = data.data.attributes;
            
            // Get the historical data for the last hour
            const lastHourData = attributes.historical_data.last_1h;
            
            return {
                name: attributes.name,
                price: parseFloat(attributes.price_in_usd),
                volume24h: parseFloat(attributes.historical_data.last_24h.volume_in_usd),
                changes: {
                    '5m': attributes.price_percent_changes.last_5m,
                    '15m': attributes.price_percent_changes.last_15m,
                    '1h': attributes.price_percent_changes.last_1h,
                    '6h': attributes.price_percent_changes.last_6h,
                    '24h': attributes.price_percent_changes.last_24h
                },
                swapCount24h: attributes.historical_data.last_24h.swaps_count,
                stats24h: {
                    buyers_count: attributes.historical_data.last_24h.buyers_count,
                    sellers_count: attributes.historical_data.last_24h.sellers_count
                },
                gtScore: attributes.gt_score,
                fdv: parseFloat(attributes.fully_diluted_valuation),
                reserveUSD: parseFloat(attributes.reserve_in_usd),
                sentiment: {
                    up_percentage: attributes.sentiment_votes.up_percentage,
                    total: attributes.sentiment_votes.total
                }
            };
        } catch (error) {
            console.error('Error fetching price data:', error);
            throw error;
        }
    }

    generateCommentary(priceData) {
        const formatPercent = (str) => str ? str.replace('%', '') + '%' : '0%';
        
        // Calculate P&L
        const currentTokens = this.initialInvestment / this.entryPrice;
        this.currentValue = currentTokens * priceData.price;
        const pnlAmount = this.currentValue - this.initialInvestment;
        const pnlPercent = ((this.currentValue / this.initialInvestment - 1) * 100).toFixed(2);
        
        // Track P&L history
        this.pnlHistory.push({
            timestamp: new Date(),
            value: this.currentValue,
            pnlPercent: parseFloat(pnlPercent)
        });

        const stats = `\`\`\`
Price Changes | Trading (24h)      | P&L Status
------------- | -------------      | ----------
5m:  ${formatPercent(priceData.changes['5m']).padEnd(8)} | Vol:  ${this.formatUSD(priceData.volume24h)} | Current: ${this.formatUSD(this.currentValue)}
15m: ${formatPercent(priceData.changes['15m']).padEnd(8)} | Swaps: ${priceData.swapCount24h.toLocaleString()} | P&L: ${pnlAmount >= 0 ? '+' : ''}${this.formatUSD(pnlAmount)}
1h:  ${formatPercent(priceData.changes['1h']).padEnd(8)} | Buys: ${priceData.stats24h.buyers_count.toLocaleString()}  | Return: ${pnlPercent}%
6h:  ${formatPercent(priceData.changes['6h']).padEnd(8)} | Sells: ${priceData.stats24h.sellers_count.toLocaleString()} | Target: 2000%
24h: ${formatPercent(priceData.changes['24h']).padEnd(8)} | Score: ${priceData.gtScore.toFixed(1)}/100 | Entry: ${this.formatUSD(this.entryPrice)}
\`\`\`
💎 FDV: ${this.formatUSD(priceData.fdv)} | 🌊 Liq: ${this.formatUSD(priceData.reserveUSD)} | 🗳️ Sentiment: ${priceData.sentiment.up_percentage.toFixed(1)}% (${priceData.sentiment.total} votes)`;

        return {
            stats: stats,
            imagePath: './images/des.jpeg'
        };
    }

    async generateChart(priceData) {
        // Store the new price data point
        const timestamp = new Date();
        this.priceHistory.timestamps.push(timestamp);
        this.priceHistory.prices.push(priceData.price);

        // Calculate and store movement for the new segment
        if (this.priceHistory.prices.length >= 2) {
            const lastPrice = this.priceHistory.prices[this.priceHistory.prices.length - 1];
            const previousPrice = this.priceHistory.prices[this.priceHistory.prices.length - 2];
            let movement;
            if (lastPrice > previousPrice) {
                movement = 'up';
            } else if (lastPrice < previousPrice) {
                movement = 'down';
            } else {
                movement = 'same';
            }
            this.priceHistory.movements.push(movement);
        }

        // Keep only last 24 hours of data
        const MAX_POINTS = 288;
        if (this.priceHistory.timestamps.length > MAX_POINTS) {
            this.priceHistory.timestamps.shift();
            this.priceHistory.prices.shift();
            this.priceHistory.movements.shift();
        }

        const configuration = {
            type: 'line',
            data: {
                labels: this.priceHistory.timestamps.map(ts => 
                    ts.toLocaleTimeString()
                ),
                datasets: [{
                    label: `${priceData.name} Price`,
                    data: this.priceHistory.prices,
                    segment: {
                        borderColor: ctx => {
                            // Use the stored movement for this segment
                            const segmentIndex = ctx.p0DataIndex;
                            if (segmentIndex < this.priceHistory.movements.length) {
                                const movement = this.priceHistory.movements[segmentIndex];
                                if (movement === 'up') {
                                    return '#00ff00'; // Green
                                } else if (movement === 'down') {
                                    return '#ff0000'; // Red
                                } else {
                                    return '#ffff00'; // Yellow
                                }
                            }
                            return '#00ff00'; // Default color
                        }
                    },
                    backgroundColor: '#00ff00',
                    pointBackgroundColor: '#00ff00',
                    pointBorderColor: '#00ff00',
                    tension: 0.1,
                    fill: false,
                    borderWidth: 2,
                    pointRadius: 3
                }]
            },
            options: {
                scales: {
                    y: {
                        beginAtZero: false,
                        ticks: {
                            color: 'white',
                            callback: function(value) {
                                return '$' + value.toFixed(6);
                            }
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        }
                    },
                    x: {
                        ticks: {
                            color: 'white',
                            maxRotation: 45,
                            minRotation: 45
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        }
                    }
                },
                plugins: {
                    title: {
                        display: true,
                        text: `${priceData.name} Price History`,
                        color: 'white',
                        font: {
                            size: 16
                        }
                    },
                    legend: {
                        display: true,
                        position: 'bottom',
                        labels: {
                            color: 'white'
                        }
                    }
                }
            }
        };

        return this.chartGenerator.renderToBuffer(configuration);
    }

    async checkAdminPermissions(interaction) {
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            await interaction.reply({
                content: '❌ You need Administrator permissions to use this command!',
                ephemeral: true
            });
            return false;
        }
        return true;
    }

    // Add formatUSD as a class method
    formatUSD(num) {
        return `$${parseFloat(num).toLocaleString(undefined, { 
            minimumFractionDigits: 2, 
            maximumFractionDigits: 6 
        })}`;
    }

    generateExcitingComment(priceData) {
        const positiveComments = [
            "BOOM! What a move folks! This is the kind of action we live for! 🚀",
            "They're on FIRE! You can't teach this kind of momentum! 🔥",
            "Ladies and gentlemen, we are witnessing GREATNESS! 👑",
            "This is what champions are made of! Absolutely ELECTRIC performance! ⚡",
            "They've done their homework and it's PAYING OFF! 📚",
            "The crowd is going WILD! Can you feel the energy?! 🎉",
            "That's what I call EXECUTING THE GAMEPLAN! 📋",
            "They're making it look EASY out there! 💪",
            "This is a MASTERCLASS in price action! 📈",
            "They came to PLAY today, folks! 🎯"
        ];

        const neutralComments = [
            "We've got ourselves a real CHESS MATCH here, folks! ♟️",
            "Both bulls and bears showing RESPECT for each other! 🤝",
            "This is anyone's game right now! 🎲",
            "They're feeling each other out, looking for an opening! 👀",
            "The tension is PALPABLE! 😤",
            "This is what we call a STRATEGIC battle! 🧠",
            "They're playing the long game here, folks! ⏳",
            "Every move counts in this situation! ⚖️",
            "We're seeing some VETERAN moves here! 🎯",
            "This is a CLASSIC matchup unfolding! 🏛️"
        ];

        const negativeComments = [
            "OUCH! That's gonna leave a mark! 🤕",
            "They're on the ropes, but don't count them out yet! 🥊",
            "This is a TEST OF CHARACTER right here! 💪",
            "They're in UNFAMILIAR TERRITORY! Can they adjust? 🗺️",
            "This is where champions show their RESILIENCE! 🛡️",
            "They're taking some HEAVY HITS, but still standing! 🥊",
            "This is a GUT CHECK moment! 😤",
            "They need to WEATHER THE STORM! ⛈️",
            "Time to dig DEEP and show what they're made of! ⛏️",
            "This is where LEGENDS are born, folks! 🌟"
        ];

        // Calculate price change percentage from 5m data
        const priceChange = parseFloat(priceData.changes['5m']?.replace('%', '') || 0);

        // Select comment based on price action
        let comments;
        if (priceChange > 2) {
            comments = positiveComments;
        } else if (priceChange < -2) {
            comments = negativeComments;
        } else {
            comments = neutralComments;
        }

        // Return a random comment from the selected array
        return comments[Math.floor(Math.random() * comments.length)];
    }

    async handleInteraction(message) {
        try {
            if (!message.mentions.has(this.client.user) && 
                (!message.reference || message.reference.author !== this.client.user.id)) {
                return;
            }

            const response = await this.openai.chat.completions.create({
                model: "gpt-3.5-turbo",
                messages: [{
                    role: "system",
                    content: `You are an enthusiastic crypto sports commentator known for witty banter and positive energy. 
                    You're commenting on a $10 investment challenge where we either hit 20x or go to zero.
                    Current message: "${message.content}"
                    Respond in a fun, engaging way with sports commentary flair and emojis. Keep it brief and entertaining.`
                }],
                max_tokens: 150,
                temperature: 0.8
            });

            const reply = response.choices[0].message.content;
            await message.reply(reply);

        } catch (error) {
            console.error('Error handling interaction:', error);
            await message.reply("WHOA FOLKS! Looks like I dropped the mic there for a second! 🎤 Technical timeout! 😅");
        }
    }
}

module.exports = CryptoCommentator; 