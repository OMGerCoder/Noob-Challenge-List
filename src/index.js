const { Client, Collection, Intents } = require('discord.js');
const { token } = require('./config.json');
const fs = require('fs')
const { REST } = require('@discordjs/rest');
const https = require('https')
const { Routes } = require('discord-api-types/v9');
const client = new Client({ intents: [Intents.FLAGS.GUILDS] });
client.commands = new Collection();
const commandFiles = fs.readdirSync('./src/cmd').filter(file => file.endsWith('.js'));
const Database = require("./db/database");
const db = new Database(client);
const config = require("./config.json")
const dotenv = require("dotenv");
const commands = require("./deploy-commands");
const privateKey = fs.readFileSync(process.env.PRIVATEKEY)
const cert = fs.readFileSync(process.env.CERT)
dotenv.config();
for (const file of commandFiles) {
	const command = require(`./cmd/${file.split(".")[0]}`);
	// Set a new item in the Collection
	// With the key as the command name and the value as the exported module
	client.commands.set(command.data.name, command);
}

client.once('ready', async() => { 
	console.log(process.env.TESTMODE)
    console.log(`Logged in as ${client.user.tag}!`);
    
	db.initiateConnection(process.env.MONGODB).then(() => {
		console.log("Mongodb connection successful")
		if(process.env.TESTMODE == "TRUE") {
			client.user.setActivity("TESTMODE - Bot is disabled");
		} else {
			client.user.setPresence({activity: null});
		}
	}).catch((err) => {
		console.error(err);
	})
});
const rest = new REST({ version: '9' }).setToken(process.env.TOKEN);

(async () => {
	try {
		console.log('Started refreshing application (/) commands.');

		if(process.env.TESTMODE == "TRUE") {
			console.log("TESTMODE is on");
			await rest.put(
				Routes.applicationGuildCommands(process.env.CLIENTID, '923010608880836629'),
				{ body: commands },
			);
		} else {
			await rest.put(
				Routes.applicationGuildCommands(process.env.CLIENTID, process.env.GUILDID),
				{ body: commands },
			);
		}

		console.log('Successfully reloaded application (/) commands.');
	} catch (error) {
		console.error(error);
	}
})();
client.on('interactionCreate', async interaction => {
	if (!interaction.isCommand()) return;

	const command = client.commands.get(interaction.commandName);

	if (!command) return;
	if(process.env.TESTMODE == "TRUE" && interaction.guild.id == '922078428604280833') {
		interaction.reply("Sorry, the bot is currently in testmode. Please try again later or contact OMGer.");
		return
	}else if (process.env.TESTMODE == "FALSE" && interaction.guild.id == '923010608880836629') {
		interaction.reply("Put the bot in testmode before it can work with this server.")
	}
	try {
		await command.execute(interaction, db);
	} catch (error) {
		console.error(error);
		await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
	}
});

client.login(process.env.TOKEN); 
const express = require('express');
const { Http2ServerRequest } = require('http2');
const app = express();
const port = 443
app.get('/', (req, res) => {
	res.send('Hello World!')
})
app.get('/stats', (req, res) => {
	res.send('Stats Viewer')
})
https.createServer({
	key: privateKey,
	cert: cert
}, app).listen(443)

// console.log(db)
module.exports = db;