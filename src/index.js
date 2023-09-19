const { Client, Collection, Intents } = require('discord.js');

const fs = require('fs')
const { REST } = require('@discordjs/rest');
const https = require('https')
const { Routes } = require('discord-api-types/v9');
const client = new Client({ intents: [Intents.FLAGS.GUILDS] });
client.commands = new Collection();
const commandFiles = fs.readdirSync('./src/cmd').filter(file => file.endsWith('.js'));
const Database = require("./db/database");
const db = Database;

const dotenv = require("dotenv");
const commands = require("./deploy-commands");
dotenv.config();
const privateKey = fs.readFileSync(process.env.PRIVATEKEY, 'utf-8')

const cert = fs.readFileSync(process.env.CERT, 'utf-8')
for (const file of commandFiles) {
	const command = require(`./cmd/${file.split(".")[0]}`);
	// Set a new item in the Collection
	// With the key as the command name and the value as the exported module
	client.commands.set(command.data.name, command);
}
process.on('warning', (warning) => {
	console.log(warning.stack);
})
client.once('ready', async() => { 
	console.log(process.env.TESTMODE)
    console.log(`Logged in as ${client.user.tag}!`);
    mongoose.set('strictQuery', false);
	db.initiateConnection(process.env.MONGODB).then(() => {
		console.log("Mongodb connection successful")
		if(process.env.TESTMODE == "TRUE") {
			client.user.setActivity("TESTMODE - Bot is disabled");
		} else {
			client.user.setPresence({activity: null});
		}
		console.log('-------------------------------------------------');
		console.log('Bot and website are now active...');
		console.log('NOOB CHALLENGE LIST BOT AND WEBSITE');
		console.log('Copyright © OMGer Development and GINC 2021-2023.');
		console.log('-------------------------------------------------');
		console.log('* Peeking at the inner workings of their code, it fills you with determination.')
		
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
	}/*else if (process.env.TESTMODE == "FALSE" && interaction.guild.id == '923010608880836629') {
		interaction.reply("Put the bot in testmode before it can work with this server.")
	}*/
	try {
		await command.execute(interaction, db);
	} catch (error) {
		console.error(error);
		await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
	}
});

client.login(process.env.TOKEN); 
const express = require('express');
var bodyParser = require('body-parser');
var multer = require('multer');
var upload = multer();
// eslint-disable-next-line no-unused-vars
const http = require('http');
const cookieParser = require('cookie-parser');
const app = express();
const discordLogin = async(req, res, next) => {
	if(req.cookies.discordToken) {
		fetch('https://discord.com/api/users/@me', {
			headers: {
				authorization: `Bearer ${req.cookies.discordToken}`
			}
		}).then(result => {
			result.json().then(info => {
				res.locals.info = info;
				

				next();
			})
		})
	} else {
		next();
	}
	
}
const checkAuthorized = (res) => {
	if(res.locals.info) {
		return true;
	} else {
		return false;
	}
}
app.enable('trust proxy')
app.set('view engine', 'pug');
app.set('views','./views');
app.use(cookieParser());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(upload.array()); 
app.use(express.static('public'))
app.use(discordLogin);
app.use((req, res, next) => {
	if(!req.secure) {
		return res.redirect("https://" + req.headers.host + req.url);
	}
	next();
})
app.use(async(req, res, next) => {
	const nclguild = await client.guilds.fetch(process.env.GUILDID);
	if(checkAuthorized(res)) {
		try {
			const currentMember = await nclguild.members.fetch(res.locals.info.id)
			if (currentMember.roles.cache.has('922079625482477599')) res.locals.isMod = true;
		} catch(err) {
			//shut up eslint
		}
	}
	if(res.locals.isMod === undefined) res.locals.isMod = false;
	next();
})
module.exports.client = client;
const frontendRouter = require('../routes/frontend_pages')
app.use('/', frontendRouter)
const apiRouter = require('../routes/api_pages')
app.use('/', apiRouter)
const fetch = require('node-fetch');
const { default: mongoose } = require('mongoose');

https.createServer({
	key: privateKey,
	cert: cert
}, app).listen(443, () => {
	console.log('listening https')
})
app.listen(80)
// console.log(db)
