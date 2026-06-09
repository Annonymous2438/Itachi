import { SlashCommandBuilder } from 'discord.js';
import cron from 'node-cron';
import { Interaction, cache } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('schedule-setup')
    .setDescription('Set up a scheduled post')
    .addStringOption(option =>
      option.setName('time')
        .setDescription('Time in 24h format (HH:mm)')
        .setRequired(true))
    .addChannelOption(option =>
      option.setName('channel')
        .setDescription('Target channel')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('title')
        .setDescription('Embed title')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('message')
        .setDescription('Embed message')
        .setRequired(true)),

  async execute(interaction) {
    const time = interaction.options.getString('time');
    const targetChannelId = interaction.options.getChannel('channel').id;
    const targetChannel = interaction.client.channels.cache.get(targetChannelId);
    const title = interaction.options.getString('title');
    const message = interaction.options.getString('message');
    const memberIdSet = new Set();

    const scheduledEmbed = {
      title: title,
      description: message,
      fields: [
        {
          name: 'Joined Users',
          value: 'None',
          inline: false
        }
      ]
    };

    const joinButton = {
      type: 1,
      components: [
        {
          type: 2,
          style: 1,
          customId: 'joinButton',
          label: 'Join'
        }
      ]
    };

    cron.schedule(time, async () => {
      const embed = {
        title: scheduledEmbed.title,
        description: scheduledEmbed.description,
        fields: scheduledEmbed.fields
      };

      await targetChannel.send({ embeds: [embed], components: [joinButton] })
        .then(message => {
          interaction.client.on('interactionCreate', async interaction => {
            if (interaction.isButton() && interaction.customId === 'joinButton') {
              if (!memberIdSet.has(interaction.user.id)) {
                memberIdSet.add(interaction.user.id);
                embed.fields[0].value = Array.from(memberIdSet).map(id => `<@${id}>`).join(', ');
                await message.edit({ embeds: [embed], components: [joinButton] });
              }
            }
          });
        });
    });

    await interaction.reply('Scheduled post set up successfully');
  }
};