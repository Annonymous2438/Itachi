import pkg from 'discord.js';
const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = pkg;
import cron from 'node-cron';

// Global tracking structures
export const activeSchedules = new Map(); 
const registrationMemory = new Map();

export default {
    data: new SlashCommandBuilder()
        .setName('schedule-setup')
        .setDescription('Set up an automated registration post with flexible day options.')
        .addStringOption(option => 
            option.setName('time')
                .setDescription('The trigger time in 24-hour format (e.g., 14:30)')
                .setRequired(true))
        .addChannelOption(option => 
            option.setName('channel')
                .setDescription('The target alert channel')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('frequency')
                .setDescription('Choose when this alert should fire')
                .setRequired(true)
                .addChoices(
                    { name: 'Every Single Day', value: '*' },
                    { name: 'Mondays', value: '1' },
                    { name: 'Tuesdays', value: '2' },
                    { name: 'Wednesdays', value: '3' },
                    { name: 'Thursdays', value: '4' },
                    { name: 'Fridays', value: '5' },
                    { name: 'Saturdays', value: '6' },
                    { name: 'Sundays', value: '0' }
                ))
        .addStringOption(option => 
            option.setName('title')
                .setDescription('Header title for the registration form')
                .setRequired(true))
        .addStringOption(option => 
            option.setName('message')
                .setDescription('Description details for the registration form')
                .setRequired(true)),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const timeStr = interaction.options.getString('time');
        const targetChannel = interaction.options.getChannel('channel');
        const frequency = interaction.options.getString('frequency');
        const titleStr = interaction.options.getString('title');
        const msgStr = interaction.options.getString('message');

        const timeParts = timeStr.split(':');
        if (timeParts.length !== 2) {
            return interaction.editReply({ content: '❌ Invalid time format. Please use HH:MM (e.g., 14:00).' });
        }

        const [hours, minutes] = timeParts;
        
        // Dynamic Cron Expression: minutes hours * * day_of_week
        // E.g., "30 14 * * *" for everyday, or "30 14 * * 5" for Fridays
        const cronExpression = `${minutes} ${hours} * * ${frequency}`;

        // If an active schedule already exists for this specific channel, stop it first to prevent duplicates
        if (activeSchedules.has(targetChannel.id)) {
            const oldJob = activeSchedules.get(targetChannel.id);
            oldJob.stop();
            activeSchedules.delete(targetChannel.id);
        }

        // Initialize the new cron task
        const scheduledJob = cron.schedule(cronExpression, async () => {
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

                registrationMemory.set(sentMessage.id, []);

                const collector = sentMessage.createMessageComponentCollector();
                collector.on('collect', async btnInteraction => {
                    if (btnInteraction.customId !== 'reg_join_toggle') return;

                    let participants = registrationMemory.get(sentMessage.id) || [];
                    const userId = btnInteraction.user.id;
                    const username = btnInteraction.user.globalName || btnInteraction.user.username;

                    const existingIndex = participants.findIndex(p => p.id === userId);
                    if (existingIndex === -1) {
                        participants.push({ id: userId, username: username });
                    } else {
                        participants.splice(existingIndex, 1);
                    }

                    registrationMemory.set(sentMessage.id, participants);

                    const updatedCount = participants.length.toString();
                    const updatedNames = participants.length > 0 
                        ? participants.map(p => `• ${p.username}`).join('\n')
                        : 'None yet';

                    const updatedEmbed = EmbedBuilder.from(sentMessage.embeds[0])
                        .setFields(
                            { name: 'TOTAL NUMBER OF PARTICIPANTS', value: updatedCount, inline: false },
                            { name: 'PARTICIPANTS NAMES', value: updatedNames, inline: false }
                        );

                    await btnInteraction.update({ embeds: [updatedEmbed] });
                });

            } catch (err) {
                console.error('Error executing automated registration:', err);
            }
        }, {
            scheduled: true,
            timezone: 'Asia/Karachi'
        });

        // Save the live job object into our Map configuration using the channel ID as the unique tracking key
        activeSchedules.set(targetChannel.id, scheduledJob);

        const freqLabel = frequency === '*' ? 'Everyday' : 'Scheduled Day Only';
        return interaction.editReply({ 
            content: `✅ System online! Automated post configured (${freqLabel}) for ${timeStr} in ${targetChannel}.` 
        });
    }
};