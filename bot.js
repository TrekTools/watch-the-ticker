const { Client, GatewayIntentBits, AttachmentBuilder, REST, Routes, SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { ChartJSNodeCanvas } = require('chartjs-node-canvas');
const schedule = require('node-schedule');

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

        this.priceHistory = {
            timestamps: [],
            prices: []
        };

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

        this.setupBot();
        this.setupCommands();
    }

    setupBot() {
        this.client.once('ready', () => {
            console.log('Crypto Commentator is LIVE! 🎙️');
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
🎯 **MISSION**: Turn hopium into generational wealth
🏆 **ODDS**: Better than zero, worse than you think

*Grab your popcorn folks, this is going to be a wild ride!* 🍿
                        `);
                        
                        await initialMessage.pin();
                        
                        // Now send the start confirmation
                        await interaction.reply(`🎙️ ALRIGHT FOLKS! Starting to track Solana token ${address} in this channel! Updates every minute! LET'S GET THIS PARTY STARTED! 🎉`);
                        
                        this.tokenSymbol = address;
                        this.channelId = interaction.channelId;
                        
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
                        prices: []
                    };

                    await interaction.reply(`🎙️ THAT'S ALL FOLKS! Stopped tracking ${oldToken}! Thanks for tuning in! 👋`);
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

    async sendUpdate() {
        try {
            // First verify we can access the channel
            let channel;
            try {
                channel = await this.client.channels.fetch(this.channelId);
                
                // Check if we have the required permissions
                const permissions = channel.permissionsFor(this.client.user);
                if (!permissions || !permissions.has(['ViewChannel', 'SendMessages', 'AttachFiles'])) {
                    console.error(`Missing required permissions in channel ${this.channelId}`);
                    await channel.send('❌ I need permissions to view channel, send messages, and attach files!');
                    return;
                }
            } catch (error) {
                console.error(`Cannot access channel ${this.channelId}:`, error);
                // Reset tracking since we can't access the channel
                this.tokenSymbol = null;
                this.channelId = null;
                return;
            }

            const priceData = await this.fetchPriceData();
            const chartBuffer = await this.generateChart(priceData);
            const commentary = this.generateCommentary(priceData);

            const attachment = new AttachmentBuilder(chartBuffer, { name: 'chart.png' });

            await channel.send({
                content: commentary,
                files: [attachment]
            });
        } catch (error) {
            console.error('Error sending update:', error);
            if (error.code === 50001 || error.code === 50013) {
                console.error('Bot lacks required permissions - stopping tracking');
                this.tokenSymbol = null;
                this.channelId = null;
            }
        }
    }

    async fetchPriceData() {
        try {
            const formattedToken = this.tokenSymbol.trim();
            console.log(`Fetching data for token: ${formattedToken}`);
            
            const url = `https://app.geckoterminal.com/api/p1/solana/pools/${formattedToken}`;
            const response = await fetch(url);
            const data = await response.json();
            
            if (data.errors) {
                throw new Error(`Token not found on GeckoTerminal: ${data.errors[0]?.title || 'Unknown error'}`);
            }

            const attributes = data.data.attributes;
            const priceChanges = attributes.price_percent_changes || {};
            const historicalData = attributes.historical_data || {};
            
            return {
                name: attributes.name,
                price: parseFloat(attributes.price_in_usd),
                priceChange24h: attributes.price_percent_change,
                volume24h: attributes.from_volume_in_usd,
                fdv: attributes.fully_diluted_valuation,
                reserveUSD: attributes.reserve_in_usd,
                swapCount24h: attributes.swap_count_24h,
                sentiment: attributes.sentiment_votes,
                changes: {
                    '5m': priceChanges.last_5m,
                    '15m': priceChanges.last_15m,
                    '30m': priceChanges.last_30m,
                    '1h': priceChanges.last_1h,
                    '6h': priceChanges.last_6h,
                    '24h': priceChanges.last_24h
                },
                stats24h: historicalData.last_24h,
                stats1h: historicalData.last_1h,
                gtScore: attributes.gt_score
            };
        } catch (error) {
            console.error('Error fetching price data:', error);
            throw error;
        }
    }

    generateCommentary(priceData) {
        // Format numbers for better readability
        const formatUSD = (num) => `$${parseFloat(num).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}`;
        const formatPercent = (str) => str ? str.replace('%', '') + '%' : '0%';
        
        const commentary = `🎙️ **${priceData.name}** @ ${formatUSD(priceData.price)}

\`\`\`
Price Changes | Trading (24h)
------------- | -------------
5m:  ${formatPercent(priceData.changes['5m']).padEnd(8)} | Vol:  ${formatUSD(priceData.volume24h)}
15m: ${formatPercent(priceData.changes['15m']).padEnd(8)} | Swaps: ${priceData.swapCount24h.toLocaleString()}
1h:  ${formatPercent(priceData.changes['1h']).padEnd(8)} | Buys: ${priceData.stats24h.buyers_count.toLocaleString()}
6h:  ${formatPercent(priceData.changes['6h']).padEnd(8)} | Sells: ${priceData.stats24h.sellers_count.toLocaleString()}
24h: ${formatPercent(priceData.changes['24h']).padEnd(8)} | Score: ${priceData.gtScore.toFixed(1)}/100
\`\`\`
💎 FDV: ${formatUSD(priceData.fdv)} | 🌊 Liq: ${formatUSD(priceData.reserveUSD)} | 🗳️ Sentiment: ${priceData.sentiment.up_percentage.toFixed(1)}% (${priceData.sentiment.total} votes)

${this.generateExcitingComment(priceData)}`;

        return commentary;
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
            "They came to PLAY today, folks! 🎯",
            "UNSTOPPABLE! They're in a league of their own! 🏆",
            "This is TEXTBOOK execution! Beautiful to watch! 📖",
            "They're COOKING with gas now! 🔥",
            "The momentum is UNDENIABLE! 🌊",
            "What a SPECTACULAR display of strength! 💪"
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
            "This is a CLASSIC matchup unfolding! 🏛️",
            "The plot thickens! What a fascinating development! 🎭",
            "Both sides showing tremendous DISCIPLINE! 📊",
            "This is a TEXTBOOK trading range! 📐",
            "The market is taking a breather, but stay tuned! ⏸️",
            "We're at a crucial DECISION POINT! 🔄"
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
            "This is where LEGENDS are born, folks! 🌟",
            "They're down but not out! Never count out a champion! 👊",
            "This is when you earn your stripes! 🦓",
            "Sometimes you need to take a step back to leap forward! 🦘",
            "They're in survival mode, but that's when they're most dangerous! 🐯",
            "This is CHARACTER BUILDING time! 🏗️"
        ];

        const extremeComments = [
            "I CAN'T BELIEVE WHAT I'M SEEING! This is UNPRECEDENTED! 🤯",
            "HOLY SMOKES! This will go down in the history books! 📚",
            "GREAT GOOGLY MOOGLY! Have you ever seen anything like this?! 😱",
            "STOP THE PRESSES! This is one for the ages! 🗞️",
            "MY WORD! This is why you never leave your seat, folks! 💺"
        ];

        // Calculate price change percentage from 5m data
        const priceChange = parseFloat(priceData.changes['5m']?.replace('%', '') || 0);

        // Select comment based on price action
        if (Math.abs(priceChange) > 10) {
            // Extreme moves get special comments
            return extremeComments[Math.floor(Math.random() * extremeComments.length)];
        } else if (priceChange > 2) {
            return positiveComments[Math.floor(Math.random() * positiveComments.length)];
        } else if (priceChange < -2) {
            return negativeComments[Math.floor(Math.random() * negativeComments.length)];
        } else {
            return neutralComments[Math.floor(Math.random() * neutralComments.length)];
        }
    }

    async generateChart(priceData) {
        // Store the new price data point
        const timestamp = new Date();
        this.priceHistory.timestamps.push(timestamp);
        this.priceHistory.prices.push(priceData.price);

        // Keep only last 24 hours of data (288 5-minute intervals)
        const MAX_POINTS = 288;
        if (this.priceHistory.timestamps.length > MAX_POINTS) {
            this.priceHistory.timestamps.shift();
            this.priceHistory.prices.shift();
        }

        // Determine color based on last price movement
        let lineColor;
        if (this.priceHistory.prices.length >= 2) {
            const lastPrice = this.priceHistory.prices[this.priceHistory.prices.length - 1];
            const previousPrice = this.priceHistory.prices[this.priceHistory.prices.length - 2];
            if (lastPrice > previousPrice) {
                lineColor = '#00ff00'; // Green
            } else if (lastPrice < previousPrice) {
                lineColor = '#ff0000'; // Red
            } else {
                lineColor = '#ffff00'; // Yellow
            }
        } else {
            lineColor = '#00ff00'; // Default to green
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
                            // Color only the last segment
                            if (ctx.p1DataIndex === this.priceHistory.prices.length - 2) {
                                return lineColor;
                            }
                            return '#00ff00'; // Default color for other segments
                        }
                    },
                    backgroundColor: '#00ff00',
                    pointBackgroundColor: ctx => {
                        // Color the last point based on movement
                        if (ctx.dataIndex === this.priceHistory.prices.length - 1) {
                            return lineColor;
                        }
                        return '#00ff00';
                    },
                    pointBorderColor: ctx => {
                        // Color the last point based on movement
                        if (ctx.dataIndex === this.priceHistory.prices.length - 1) {
                            return lineColor;
                        }
                        return '#00ff00';
                    },
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

        // Make sure chartGenerator is initialized with black background
        if (!this.chartGenerator) {
            this.chartGenerator = new ChartJSNodeCanvas({
                width: 800,
                height: 400,
                backgroundColour: '#000000'
            });
        }

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

    //
}

module.exports = CryptoCommentator; 