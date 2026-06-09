import pkg from 'discord.js';
const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = pkg;
import cron from 'node-cron';

export default {
  data: new SlashCommandBuilder()
    .setName('schedule-setup')
    .setDescription('Set up a scheduled post')
    .addStringOption(option =>
      option.setName('time')
        .setDescription('The time to post in 24h format (HH:mm)')
        .setRequired(true))
    .addChannelOption(option =>
      option.setName('channel')
        .setDescription('The channel to post in')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('title')
        .setDescription('The title of the post')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('message')
        .setDescription('The message of the post')
        .setRequired(true)),

  async execute(interaction) {
    const time = interaction.options.getString('time');
    const channel = interaction.options.getChannel('channel');
    const title = interaction.options.getString('title');
    const message = interaction.options.getString('message');

    const embed = new EmbedBuilder()
      .setTitle(title)
      .setDescription(message);

    const button = new ButtonBuilder()
      .setLabel('Join')
      .setStyle(ButtonStyle.Success)
      .setCustomId('join-button');

    const row = new ActionRowBuilder()
      .addComponents(button);

    const targetChannel = channel;

    let memberCount = 0;

    const cronJob = cron.schedule(`0 ${time.split(':')[1]} ${time.split(':')[0]} * * *`, async () => {
      const msg = await targetChannel.send({ embeds: [embed], components: [row] });
      const collector = msg.createMessageComponentCollector({ componentType: 2, time: 86400000 });

      collector.on('collect', i => {
        if (i.customId === 'join-button') {
          memberCount++;
          i.reply(`You have joined! (${memberCount} members)`);
        }
      });

      collector.on('end', collected => {
        console.log(`Collected ${collected.size} interactions`);
      });
    }, {
      scheduled: true,
      timezone: "Asia/Karachi"
    });

    await interaction.reply(`Scheduled post set up for ${time} in ${targetChannel}!`);
  }
};