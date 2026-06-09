const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = pkg;
import cron from 'node-cron';
const participantMap = new Map();

const command = new SlashCommandBuilder()
    .setName('register')
    .setDescription('Create a registration embed')
    .addStringOption(option => option.setName('title').setDescription('Embed title').setRequired(true))
    .addStringOption(option => option.setName('message').setDescription('Embed description').setRequired(true));

export default {
    data: command,
    async execute(interaction, client) {
        const title = interaction.options.get('title').value;
        const message = interaction.options.get('message').value;
        const embed = new EmbedBuilder()
            .setTitle(title)
            .setDescription(message)
            .addFields(
                { name: 'TOTAL NUMBER OF PARTICIPANTS', value: '0', inline: false },
                { name: 'PARTICIPANTS NAMES', value: '', inline: false }
            );
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('join')
                    .setLabel('Join')
                    .setStyle(ButtonStyle.Success)
            );
        const sentMessage = await interaction.reply({ embeds: [embed], components: [row] });
        participantMap.set(sentMessage.id, []);

        cron.schedule('0 0 0 * * *', () => {
            const currentTime = new Date();
            console.log(`Current Time: ${currentTime.toLocaleTimeString('en-US', { timeZone: 'Asia/Karachi' })}`);
        }, {
            timezone: 'Asia/Karachi'
        });

        client.on('interactionCreate', async interaction => {
            if (!interaction.isButton()) return;
            if (interaction.customId === 'join') {
                const messageId = interaction.message.id;
                const participants = participantMap.get(messageId);
                const userId = interaction.user.id;
                const username = interaction.user.username;
                if (participants && participants.some(participant => participant.id === userId)) {
                    participants.splice(participants.findIndex(participant => participant.id === userId), 1);
                } else {
                    participants.push({ id: userId, username });
                }
                participantMap.set(messageId, participants);
                const participantNames = participants.map(participant => participant.username).join(', ') || '';
                const updatedEmbed = new EmbedBuilder()
                    .setTitle(title)
                    .setDescription(message)
                    .addFields(
                        { name: 'TOTAL NUMBER OF PARTICIPANTS', value: participants.length.toString(), inline: false },
                        { name: 'PARTICIPANTS NAMES', value: participantNames, inline: false }
                    );
                await interaction.update({ embeds: [updatedEmbed], components: [row] });
            }
        });
    }
}