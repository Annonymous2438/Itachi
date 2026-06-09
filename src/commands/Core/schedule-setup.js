import pkg from "discord.js"
const { Client, GatewayIntentBits, Partials } = pkg
const { ScheduledJob } = pkg
const cron = require('cron')

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.GuildMessageTyping,
    GatewayIntentBits.GuildScheduledEvents,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Channel, Partials.GuildMember, Partials.GuildScheduledEvent, Partials.Message, Partials.Reaction, Partials.User],
})

const participantsMap = new Map()
const timezone = 'Asia/Karachi'

client.on('ready', () => {
  console.log('Client is online')
})

client.on('interactionCreate', async interaction => {
  if (!interaction.isCommand()) return
  if (interaction.commandName === 'register') {
    const title = interaction.options.getString('title')
    const description = interaction.options.getString('description')
    const channelId = interaction.channel.id
    const messageId = interaction.id

    if (!participantsMap.has(channelId)) {
      participantsMap.set(channelId, {
        participants: [],
        messageId: messageId,
      })
    }

    const newEmbed = new pkg.EmbedBuilder()
      .setTitle(title)
      .setDescription(description)
      .addFields(
        { name: 'TOTAL NUMBER OF PARTICIPANTS', value: '0', inline: false },
        { name: 'PARTICIPANTS NAMES', value: 'None yet', inline: false }
      )
      .setFooter({ text: 'Participant Registration' })

    const row = new pkg.ActionRowBuilder()
      .addComponents(
        new pkg.ButtonBuilder()
          .setCustomId('join')
          .setLabel('Join')
          .setStyle(pkg.ButtonStyle.Success),
        new pkg.ButtonBuilder()
          .setCustomId('leave')
          .setLabel('Leave')
          .setStyle(pkg.ButtonStyle.Danger),
      )

    interaction.reply({ embeds: [newEmbed], components: [row] })
  }
})

client.on('interactionCreate', async interaction => {
  if (!interaction.isButton()) return
  if (interaction.customId === 'join' || interaction.customId === 'leave') {
    interaction.deferUpdate()
    const channelId = interaction.channel.id
    const participants = participantsMap.get(channelId)

    if (!participants) return

    const userId = interaction.user.id
    const username = interaction.user.username

    if (interaction.customId === 'join') {
      if (!participants.participants.includes(userId)) {
        participants.participants.push(userId)
      } else {
        participants.participants = participants.participants.filter(id => id !== userId)
      }
    } else if (interaction.customId === 'leave') {
      participants.participants = participants.participants.filter(id => id !== userId)
    }

    const participantCount = participants.participants.length
    const participantNames = participants.participants.map(userId => {
      const user = client.users.cache.get(userId)
      return user ? user.username : 'Unknown'
    }).join(', ') || 'None yet'

    const newEmbed = new pkg.EmbedBuilder()
      .setTitle(interaction.message.embeds[0].title)
      .setDescription(interaction.message.embeds[0].description)
      .addFields(
        { name: 'TOTAL NUMBER OF PARTICIPANTS', value: participantCount.toString(), inline: false },
        { name: 'PARTICIPANTS NAMES', value: participantNames, inline: false }
      )
      .setFooter({ text: 'Participant Registration' })

    interaction.update({ embeds: [newEmbed] })
  }
})

client.login('YOUR_CLIENT_TOKEN')