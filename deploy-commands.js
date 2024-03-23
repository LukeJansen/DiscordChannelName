const { REST, SlashCommandBuilder, Routes } = require('discord.js');
//const { clientId, guildId, token } = require('./config.json');
require('dotenv').config();
const token = process.env.BOT_TOKEN;
const client_id = process.env.CLIENT_ID;

const commands = [
	new SlashCommandBuilder()
        .setName('cn')
        .setDescription('Set nickname for current voice channel')
        .addStringOption(option => 
            option.setName("nickname")
                .setDescription("The nickname for your currently connected voice channel")
                .setRequired(true)),
    new SlashCommandBuilder()
        .setName('cndefault')
        .setDescription('Set default nickname')
        .addStringOption(option => 
            option.setName("nickname")
                .setDescription("The default nickname for when you are not connected to a voice channel")
                .setRequired(true)),
    new SlashCommandBuilder()
        .setName('cnreset')
        .setDescription('Reset all your nicknames'),
    new SlashCommandBuilder()
        .setName('cnhelp')
        .setDescription('View all commmands for Channel Nickname Bot'),
    new SlashCommandBuilder()
        .setName('gank')
        .setDescription('Moan at someone in particular')
        .addUserOption(option => 
            option.setName("jungler")
                .setDescription("The jungler who did not gank you")
                .setRequired(true)),
    new SlashCommandBuilder()
        .setName('egirl')
        .setDescription('Moan at daddy')	
        .addUserOption(option => 
            option.setName("daddy")
                .setDescription("The daddy you want to 'nya' at")
                .setRequired(true)),
    new SlashCommandBuilder()
        .setName('lolquiz')
        .setDescription('Try your hand at the LoL Champion quiz!'),
    new SlashCommandBuilder()
        .setName('whisper')
        .setDescription('[Deprecated]')
        .addUserOption(option => 
            option.setName("user")
                .setDescription("[Deprecated]")
                .setRequired(true)),
    new SlashCommandBuilder()
        .setName('sorry')
        .setDescription("Add to a user's sorry count")
        .addUserOption(option =>
            option.setName("user")
                .setDescription("User who said sorry")
                .setRequired(true))
].map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(token);

rest.put(Routes.applicationCommands(client_id), { body: commands })
	.then((data) => console.log(`Successfully registered ${data.length} application commands.`))
	.catch(console.error);
