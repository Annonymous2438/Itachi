import pkg from 'discord.js';
const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = pkg;
import cron from 'node-cron';

// Global memory tracking system mapping message IDs to active arrays of joined users
const registrationMemory = new Map();

export default {
    data: new SlashCommandBuilder()
        .setName('schedule-setup')
        .setDescription('Set up a professional daily automated registration post.')
        .addStringOption(option => 
            option.setName('time')
                .setDescription('The daily trigger time in 24-hour format (e.g., 14:30)')
                .setRequired(true))
        .addChannelOption(option => 
            option.setName('channel')
                .setDescription('The channel where the embed alert will be posted')
                .setRequired(true))
        .addStringOption(option => 
            option.setName('title')
                .setDescription('The header title for the registration form')
                .setRequired(true))
        .addStringOption(option => 
            option.setName('message')
                .setDescription('The description details for the registration form')
                .setRequired(true)),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const timeStr = interaction.options.getString('time');
        const targetChannel = interaction.options.getChannel('channel');
        const titleStr = interaction.options.getString('title');
        const msgStr = interaction.options.getString('message');

        const timeParts = timeStr.split(':');
        if (timeParts.length !== 2) {
            return interaction.editReply({ content: '❌ Invalid time format. Please use HH:MM (e.g., 14:00).' });
        }

        const [hours, minutes] = timeParts;
        const cronExpression = `${minutes} ${hours} * * *`;

        // Establish the daily cron job locked to Asia/Karachi timezone profile
        cron.schedule(cronExpression, async () => {
            try {
                const embed = new EmbedBuilder()
                    .setTitle(titleStr)
                    .setDescription(msgStr)
                    .setColor('#2F3136')
                    .addFields(
                        { name: 'TOTAL NUMBER OF PARTICIPANTS', value: '0', inline: false },
                        { name: 'PARTICIPANTS NAMES', value: 'None yet', inline: false }
                    )
                    .setTimestamp();

                const joinButton = new ButtonBuilder()
                    .setCustomId('reg_join_toggle')
                    .setLabel('Join / Leave')
                    .setStyle(ButtonStyle.Primary);

                const row = new ActionRowBuilder().addComponents(joinButton);

                const sentMessage = await targetChannel.send({
                    embeds: [embed],
                    components: [row]
                });

                // Initialize the unique array storage for this specific message instance
                registrationMemory.set(sentMessage.id, []);

                // Permanent interaction collector for handling multi-user clicks indefinitely
                const collector = sentMessage.createMessageComponentCollector();

                collector.on('collect', async btnInteraction => {
                    if (btnInteraction.customId !== 'reg_join_toggle') return;

                    let participants = registrationMemory.get(sentMessage.id) || [];
                    const userId = btnInteraction.user.id;
                    const username = btnInteraction.user.globalName || btnInteraction.user.username;

                    const existingIndex = participants.findIndex(p => p.id === userId);

                    if (existingIndex === -1) {
                        // User clicking first time -> Add them to list
                        participants.push({ id: userId, username: username });
                    } else {
                        // User clicking second time -> Remove them from list
                        participants.splice(existingIndex, 1);
                    }

                    registrationMemory.set(sentMessage.id, participants);

                    // Rebuild fields dynamically based on live array status
                    const updatedCount = participants.length.toString();
                    const updatedNames = participants.length > 0 
                        ? participants.map(p => `• ${p.username}`).join('\n')
                        : 'None yet';

                    const updatedEmbed = EmbedBuilder.from(sentMessage.embeds[0])
                        .setFields(
                            { name: 'TOTAL NUMBER OF PARTICIPANTS', value: updatedCount, inline: false },
                            { name: 'PARTICIPANTS NAMES', value: updatedNames, inline: false }
                        );

                    // Modify the live message layout in-place with zero channel text spam
                    await btnInteraction.update({ embeds: [updatedEmbed] });
                });

            } catch (err) {
                console.error('Error executing automated registration cron execution:', err);
            }
        }, {
            scheduled: true,
            timezone: 'Asia/Karachi'
        });

        return interaction.editReply({ 
            content: `✅ System operational! Daily automated posts scheduled for ${timeStr} in ${targetChannel}.` 
        });
    }
};