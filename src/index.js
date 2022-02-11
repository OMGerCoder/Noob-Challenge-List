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
dotenv.config();
const privateKey = fs.readFileSync(process.env.PRIVATEKEY, 'utf-8')

const cert = fs.readFileSync(process.env.CERT, 'utf-8')
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
const http = require('http')
const app = express();
app.set('view engine', 'pug');
app.set('views','./views');
app.use(express.static('public'))
app.get('/', (req, res) => {
	db.Models.listlvl.find({}).sort({placement: 1}).populate('verification').exec((err, docs) => {
		const lvls = [];
		docs.forEach((element) => {
			lvls.push({placement: element.placement, name: element.verification.lvlname, author: element.verification.creator, points: element.points});
		})
		res.render('list', {levels: lvls})
	})
	
	
	
})
app.get('/stats', async(req, res) => {
	
	db.Models.user.find({}, async(err, userDocs) => {
		
		var obj = {};
		userDocs.forEach(async(user) => {
			
			await db.Models.listlvl.find({lvlid: { $in: user.levels}}, async(err, doc) => {
				obj[user.username] = 0;
				doc.forEach(async(lvl) => {
					obj[user.username] += lvl.points;
				})
			
				
			})
			
		})

		setTimeout(() => {
			var sortable = [];
			for(var user in obj) {
				sortable.push([user, obj[user]])
			}
			sortable.sort((a, b) => {
				return b[1] - a[1]
			});
			res.render('stats', {
				array: sortable
			})
		}, 750)
	})
	
})
app.get('/lvl/:placement', async(req, res) => {
	if(!Number.isSafeInteger(parseInt(req.params.placement))) {
		res.send('NaN (Not a number)');
		
	} else {
		db.Models.listlvl.findOne({placement: parseInt(req.params.placement)}, (err, doc) => {
		
			if(!doc) {
				res.send('Invalid lvl placement')
			} else {
				db.Models.verification.findOne({lvlid: doc.lvlid.toString()}, (err, dataDoc) => {
					var isStreamable = false;
					var proof = dataDoc.videoProof;
					if(dataDoc.videoProof.startsWith("https://streamable.com/")) {
						isStreamable = true
						const videoId = proof.slice(23);
						const link1 = "https://streamable.com/e/"
						const link2 = link1.concat(videoId)
						proof = link2.concat("?loop=0")
					}
					res.render('level', {
						lvlname: dataDoc.lvlname,
						creator: dataDoc.creator,
						verifier: dataDoc.verifier,
						id: dataDoc.lvlid,
						proof: proof,
						points: doc.points,
						isStreamable: isStreamable
					})
					
				})
			}
		})
	}
})
https.createServer({
	key: privateKey,
	cert: cert
}, app).listen(443, () => {
	console.log('listening https')
})
app.listen(80)
// console.log(db)