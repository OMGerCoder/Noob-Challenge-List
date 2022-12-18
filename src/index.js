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
var bodyParser = require('body-parser');
var multer = require('multer');
var upload = multer();
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
app.set('view engine', 'pug');
app.set('views','./views');
app.use(cookieParser());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(upload.array()); 
app.use(express.static('public'))
app.use(discordLogin);
app.get('/', (req, res) => {

	db.Models.listlvl.find({}).sort({placement: 1}).populate('verification').exec((err, docs) => {
		const lvls = [];
		docs.forEach((element) => {
			lvls.push({placement: element.placement, name: element.verification.lvlname, author: element.verification.creator, points: element.points});
		})
		res.render('list', {levels: lvls, authorized: checkAuthorized(res), info: res.locals.info})
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
			res.render('stats', {array: sortable, authorized: checkAuthorized(res), info: res.locals.info})
		}, 750)
	})
	
})
app.get('/rules', async(req, res) => {
	res.render('rules', {
		authorized: checkAuthorized(res), 
		info: res.locals.info
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
					var isEmbeddable = false;
					var isYoutube = false 
					var proof = dataDoc.videoProof;
					if(dataDoc.videoProof.startsWith("https://streamable.com/")) {
						isEmbeddable = true
						const videoId = proof.slice(23);
						const link1 = "https://streamable.com/e/"
						const link2 = link1.concat(videoId)
						proof = link2.concat("?loop=0")
					} else if (dataDoc.videoProof.startsWith("https://youtu.be/")) {
						isYoutube = true;
						const videoId = proof.slice(17);
						const link = "https://www.youtube.com/embed/".concat(videoId);
						console.log(link);
						proof = link;
					}
					res.render('level', {
						lvlname: dataDoc.lvlname,
						creator: dataDoc.creator,
						verifier: dataDoc.verifier,
						id: dataDoc.lvlid,
						proof: proof,
						points: doc.points,
						isStreamable: isEmbeddable, 
						isYoutube: isYoutube,
						authorized: checkAuthorized(res), 
						info: res.locals.info
					})
					
				})
			}
		})
	}
})
app.get('/submit', async(req, res) => {
	const nclguild = await client.guilds.fetch(process.env.GUILDID);
	if(!checkAuthorized(res)) {
		res.json({loggedIn: false})
	} else {
		try {
			await nclguild.members.fetch(res.locals.info.id)
		} catch(err) {
			res.render('error', {error: 'You are not in our discord server!', authorized: checkAuthorized(res), info: res.locals.info})
			return;
		}
		res.render('submit', {verSuccessful: false, vicSuccessful: false, authorized: checkAuthorized(res), info: res.locals.info})
	}
})
const fetch = require('node-fetch')
app.get('/api/login', async(req, res) => {
	const code = req.query.code;
	
	const { URLSearchParams } = require('url');
	const params = new URLSearchParams();
	params.append('client_id', process.env.OAUTHID);
	params.append('client_secret', process.env.OAUTHSECRET);
	params.append('grant_type', 'authorization_code');
	params.append('code', code);
	params.append('redirect_uri', process.env.REDIRECT_URI)
	await fetch("https://discord.com/api/oauth2/token", {
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded'
		},
		method: 'POST',
		body: params
	}).then((apires) => {
		apires.json().then(result => {
			try {
				res.cookie('discordToken', result.access_token, { maxAge: result.expires_in * 1000, httpOnly: true })
			} catch(err) {
				res.render('error', {error: 'Seems like an error occured in the Discord API. This error has been logged to the console. Notify OMGer immediately and try again later.', authorized: false, info: res.locals.info})
				console.log(err);
				console.log(result);
				console.log(params.toString());
				return;
			}
			res.redirect('/');
			
		});
	})
	
})
app.get('/api/logout', (req, res) => {
	res.clearCookie('discordToken');
	res.redirect('back');
})
app.post('/api/submit/verification', async(req, res) => {
	const nclguild = await client.guilds.fetch(process.env.GUILDID);
	await db.Models.verification.findOne({lvlid: req.body.lvlid}, (err, doc) => {
		if(doc) {
			res.render('error', {error: 'You cannot submit duplicates!', authorized: checkAuthorized(res), info: res.locals.info})	
		} else {
			const doc = new db.Models.verification({
				lvlname: req.body.lvlname,
				lvlid: req.body.lvlid,
				videoProof: req.body.videoproof,
				creator: req.body.creator,
				verifier: req.body.verifier
			})
			const data = {
				lvlname: req.body.lvlname,
				lvlid: req.body.lvlid,
				videoProof: req.body.videoproof,
				creator: req.body.creator,
				verifier: req.body.verifier
			}
			doc.save();
			// console.log(doc);
			if(process.env.TESTMODE == "TRUE") {
				
			} else {
				// <@&${process.env.LISTTEAM_ROLEID}> List team ping
				nclguild.channels.cache.get(process.env.TODO_CHANNELID).send(`\n**${data.lvlname}**\nBy **${data.creator}**\n${data.lvlid}\nVerified by **${data.verifier}**\n${data.videoProof}`);
			}
			res.render('submit', {verSuccessful: true, vicSuccessful: false, authorized: checkAuthorized(res), info: res.locals.info})
			
		}
	})
})
app.post('/api/submit/victory', async(req, res) => {
	
	const nclguild = await client.guilds.fetch(process.env.GUILDID);
	const user = res.locals.info;
	await db.Models.victor.findOne({userid: user.id, lvlid: req.body.lvlid}, (err, doc) => {
		if(doc) {
			res.render('error', {error: 'You cannot submit duplicates!', authorized: checkAuthorized(res), info: res.locals.info})	
		} else {
		
			const doc = new db.Models.victor({
				userid: user.id,
				videoProof: req.body.videoproof,
				lvlid: req.body.lvlid
			})
			db.Models.user.findOne({userid: user.id}, (err, userdoc) => {
				if (userdoc === null) {
					const docUser = new db.Models.user({userid: user.id, points: 0, username: `${user.username}#${user.discriminator}`})
					docUser.save();
				}
			})
			var lvlname = null;
			db.Models.listlvl.findOne({lvlid: req.body.lvlid}, (err, lvldoc) => {
				if (lvldoc === null) {
					res.render('error', {error: 'That level isnt on the list!', authorized: checkAuthorized(res), info: res.locals.info})	
					return;
				} else {
					db.Models.verification.findOne({lvlid: req.body.lvlid}, (err, namedoc) => {
						doc.save();
					if(process.env.TESTMODE == "TRUE") {
						
					} else {
						// <@&${process.env.LISTTEAM_ROLEID}> List team ping
						nclguild.channels.cache.get(process.env.RECORDS_CHANNELID).send(`**${namedoc.lvlname}**\nCompleted by \`${user.username}#${user.discriminator}\`\n${req.body.videoproof}`);
					}
					res.render('submit', {verSuccessful: false, vicSuccessful: true, authorized: checkAuthorized(res), info: res.locals.info})
					})
				}
			})
		}
	})
})
https.createServer({
	key: privateKey,
	cert: cert
}, app).listen(443, () => {
	console.log('listening https')
})
app.listen(80)
// console.log(db)