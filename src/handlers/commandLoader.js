import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { Collection, Routes } from 'discord.js';
import { REST } from '@discordjs/rest';
import { logger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 🆔 Add your server IDs here
const SERVER_IDS = ["1508003647961956372", "1501199293237821572"];

async function getAllFiles(directory, fileList = []) {
    const files = await fs.readdir(directory, { withFileTypes: true });
    for (const file of files) {
        const filePath = path.join(directory, file.name);
        if (file.isDirectory()) {
            if (file.name === 'modules') continue;
            await getAllFiles(filePath, fileList);
        } else if (file.name.endsWith('.js')) {
            fileList.push(filePath);
        }
    }
    return fileList;
}

export async function loadCommands(client) {
    client.commands = new Collection();
    const commandsPath = path.join(__dirname, '../commands');
    const commandFiles = await getAllFiles(commandsPath);
    
    for (const filePath of commandFiles) {
        try {
            const commandModule = await import(`file://${filePath}`);
            const command = commandModule.default || commandModule;
            if (!command.data || !command.execute) continue;
            client.commands.set(command.data.name, command);
        } catch (error) {
            logger.error(`Error loading command from ${filePath}:`, error);
        }
    }
    return client.commands;
}

export async function registerCommands(client) {
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    
    // Safety: Max 100 commands to prevent Discord API errors
    const commands = client.commands.map(cmd => cmd.data.toJSON()).slice(0, 100);

    for (const guildId of SERVER_IDS) {
        try {
            logger.info(`Registering ${commands.length} commands to server: ${guildId}`);
            await rest.put(
                Routes.applicationGuildCommands(client.user.id, guildId),
                { body: commands }
            );
            logger.info(`Successfully registered commands for guild ${guildId}`);
        } catch (error) {
            logger.error(`Failed to register commands for ${guildId}:`, error);
        }
    }
}
