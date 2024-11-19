const { Client, GatewayIntentBits, AttachmentBuilder, REST, Routes, SlashCommandBuilder } = require('discord.js');
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
            backgroundColour: '#ffffff'
        });

        // Add commands collection to track slash commands
        this.commands = [
            new SlashCommandBuilder()
                .setName('check')
                .setDescription('Check if the crypto commentator is live!')
                .toJSON(),
            new SlashCommandBuilder()
                .setName('start')
                .setDescription('Start tracking a Solana token')
                .addStringOption(option => 
                    option.setName('address')
                        .setDescription('The Solana token address to track')
                        .setRequired(true))
                .toJSON(),
            new SlashCommandBuilder()
                .setName('end')
                .setDescription('Stop tracking the current token')
                .toJSON()
        ];

        this.setupBot();
        this.setupCommands();
    }

    setupBot() {
        this.client.once('ready', () => {
            console.log('Crypto Commentator is LIVE! 🎙️');
            this.startUpdateLoop();
        });

        // Schedule updates every 15 minutes
        this.startUpdateLoop = () => {
            schedule.scheduleJob('*/15 * * * *', async () => {
                if (this.tokenSymbol && this.channelId) {
                    await this.sendUpdate();
                }
            });
        };
    }

    async setupCommands() {
        this.client.on('interactionCreate', async interaction => {
            if (!interaction.isChatInputCommand()) return;

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
                        // First, acknowledge the command
                        await interaction.reply(`🎙️ ALRIGHT FOLKS! Starting to track Solana token ${address} in this channel! LET'S GET THIS PARTY STARTED! 🎉`);
                        
                        this.tokenSymbol = address;
                        this.channelId = interaction.channelId;
                        
                        // Then immediately send the first update
                        await this.sendUpdate();
                    } catch (error) {
                        console.error('Error during start command:', error);
                        this.tokenSymbol = null;
                        this.channelId = null;
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
            const priceData = await this.fetchPriceData();
            const chartBuffer = await this.generateChart(priceData);
            const priceChange = this.calculatePriceChange(priceData);
            const commentary = this.generateCommentary(priceChange);

            const channel = await this.client.channels.fetch(this.channelId);
            const attachment = new AttachmentBuilder(chartBuffer, { name: 'chart.png' });

            await channel.send({
                content: `🎙️ **LIVE CRYPTO UPDATE** 🎙️\n${commentary}`,
                files: [attachment]
            });
        } catch (error) {
            console.error('Error sending update:', error);
        }
    }

    generateCommentary(priceChange) {
        const excitementPhrases = [
            "HOLY SMOKES FOLKS!",
            "CAN YOU BELIEVE WHAT WE'RE SEEING?!",
            "ABSOLUTELY INCREDIBLE!",
            "WHAT A MOMENT IN CRYPTO HISTORY!",
            "MY COFFEE CUP IS SHAKING WITH EXCITEMENT!"
        ];

        const randomPhrase = excitementPhrases[Math.floor(Math.random() * excitementPhrases.length)];

        if (priceChange > 5) {
            return `${randomPhrase} ${this.tokenSymbol} IS ON AN ABSOLUTE TEAR! UP ${priceChange.toFixed(2)}% IN THE LAST 15 MINUTES! THE BULLS ARE RUNNING WILD! 🚀🔥`;
        } else if (priceChange > 0) {
            return `OH BOY OH BOY! ${this.tokenSymbol} is showing some life! Up ${priceChange.toFixed(2)}%! Could this be the start of something MAGICAL?! ✨`;
        } else if (priceChange > -5) {
            return `FOLKS, ${this.tokenSymbol} is taking a breather, down ${Math.abs(priceChange).toFixed(2)}%! But don't count them out yet! This is crypto after all! 💪`;
        } else {
            return `GOOD GRIEF! ${this.tokenSymbol} is feeling the pressure! Down ${Math.abs(priceChange).toFixed(2)}%! Is this the drama we've been waiting for?! 😱`;
        }
    }

    //
}

module.exports = CryptoCommentator; 