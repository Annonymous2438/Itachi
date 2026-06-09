const Discord = require('discord.js');
const { Client, GatewayIntentBits, Partials } = Discord;
const cron = require('node-cron');
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
  partials: [Partials.Channel, Partials.Message],
});

client.on('ready', () => {
  console.log('Client is ready');
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'schedule-setup') {
    const time = interaction.options.getString('time');
    const channel = interaction.options.getChannel('channel');
    const title = interaction.options.getString('title');
    const message = interaction.options.getString('message');
    const channelName = channel.name;

    const embed = new Discord.EmbedBuilder()
      .setTitle(title)
      .setDescription(message)
      .addFields({ name: 'Participants', value: 'None', inline: false });

    const joinButton = new Discord.ActionRowBuilder().addComponents(
      new Discord.ButtonBuilder()
        .setCustomId('join-button')
        .setLabel('Join')
        .setStyle(Discord.ButtonStyle.Success)
    );

    const participants = [];

    cron.schedule(`0 ${time} * * *`, async () => {
      const postedMessage = await channel.send({ embeds: [embed], components: [joinButton] });

      client.on('interactionCreate', async (buttonInteraction) => {
        if (buttonInteraction.customId === 'join-button') {
          if (!participants.includes(buttonInteraction.user.username)) {
            participants.push(buttonInteraction.user.username);
            const targetChannelName = channel.name;
            const updatedEmbed = new Discord.EmbedBuilder()
              .setTitle(title)
              .setDescription(message)
              .addFields({
                name: 'Participants',
                value: participants.join(', '),
                inline: false,
              });
            postedMessage.edit({ embeds: [updatedEmbed], components: [joinButton] });
          }
        }
      });
    });

    interaction.reply(`Scheduled setup complete. Posting daily at ${time} in ${channelName}.`);
  }
});

client.login('YOUR_DISCORD_BOT_TOKEN');