const { REST, Routes } = require('discord.js');
require('dotenv').config();
const token = process.env.BOT_TOKEN;
const clientId = process.env.CLIENT_ID;

const rest = new REST().setToken(token);

// for global commands
rest.delete(Routes.applicationCommand(clientId, '934953029579452496'))
	.then(() => console.log('Successfully deleted application command'))
	.catch(console.error);
