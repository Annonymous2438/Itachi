import pkg from 'discord.js';
const { SlashCommandBuilder } = pkg;
import { activeSchedules } from './schedule-setup.js';

export default {
    data: new SlashCommandBuilder()
        .setName('schedule-cancel')
        .setDescription('Cancel an active automated registration schedule for a specific channel.')
        .addChannelOption(option => 
            option.setName('channel')
                .setDescription('The channel where you want to terminate the automated scheduler')
                .setRequired(true)),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const targetChannel = interaction.options.getChannel('channel');

        // Check our global log book map to see if a schedule exists for this channel ID
        if (!activeSchedules.has(targetChannel.id)) {
            return interaction.editReply({ 
                content: `❌ There are no active automated schedules running in ${targetChannel}.` 
            });
        }

        try {
            // Grab the running cron instance
            const runningJob = activeSchedules.get(targetChannel.id);
            
            // Stop the cron loop execution immediately
            runningJob.stop();
            
            // Remove it from memory entirely
            activeSchedules.delete(targetChannel.id);

            return interaction.editReply({ 
                content: `🛑 Successfully cancelled and removed the automated schedule for ${targetChannel}. No further daily posts will be sent there.` 
            });

        } catch (error) {
            console.error('Error while stopping cron job:', error);
            return interaction.editReply({ 
                content: '❌ An error occurred while trying to shut down the channel schedule.' 
            });
        }
    }
};