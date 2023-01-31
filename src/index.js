const { Client, Collection, Intents } = require('discord.js');

const fs = require('fs')
const { REST } = require('@discordjs/rest');
const https = require('https')
const { Routes } = require('discord-api-types/v9');
const client = new Client({ intents: [Intents.FLAGS.GUILDS] });
client.commands = new Collection();
const commandFiles = fs.readdirSync('./src/cmd').filter(file => file.endsWith('.js'));
const Database = require("./db/database");
const db = new Database(client);

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
app.get('/', async(req, res) => {
	res.render('home', {authorized: checkAuthorized(res), info: res.locals.info, isMod: res.locals.isMod})
}) 
app.get('/list', async (req, res) => {

	db.Models.listlvl.find({}).sort({placement: 1}).populate('verification').exec((err, docs) => {
		const lvls = [];
		docs.forEach((element) => {
			if(element.verification.tags) {
				
				lvls.push({lvlid: element.lvlid, placement: element.placement, name: element.verification.lvlname, author: element.verification.creator, points: element.points, tags: element.verification.tags});
			} else {
				lvls.push({lvlid: element.lvlid, placement: element.placement, name: element.verification.lvlname, author: element.verification.creator, points: element.points, tags: []});
			}
			
		})
		
		res.render('list', {levels: lvls, authorized: checkAuthorized(res), info: res.locals.info, isMod: res.locals.isMod})
	})
	
	
	
})
app.get('/stats', (req, res) => {
	const loopCompletePromise = new Promise((resolve) => {
		var obj = {};
		var docCount = 0;
		db.Models.user.countDocuments({}, (err, result) => {
			docCount = result;
			db.Models.user.find({}, (err, userDocs) => {
			
				for(const user of userDocs) {
					db.Models.listlvl.find({lvlid: { $in: user.levels}},(err, doc) => {
						obj[user.username] = 0;
						for(const lvl of doc) {
							obj[user.username] += lvl.get('points');
							
						}
						if(Object.keys(obj).length == docCount) {
							resolve(obj);
						}
					})
					
				}
			})
		})
		

	})
	loopCompletePromise.then(obj => {
		var sortable = [];
		for(var user in obj) {
			sortable.push([user, obj[user]])
		}
		sortable.sort((a, b) => {
			return b[1] - a[1]
		});
		res.render('stats', {array: sortable, authorized: checkAuthorized(res), info: res.locals.info, isMod: res.locals.isMod})
	
	
	})
})
app.get('/rules', async(req, res) => {
	res.render('rules', {
		authorized: checkAuthorized(res), 
		info: res.locals.info
	})
})
app.get('/lvl/:placement', async(req, res) => {
	
	var adminPanelAccess = false;
	const nclguild = await client.guilds.fetch(process.env.GUILDID);
	if(checkAuthorized(res)) {
		try {
			const currentMember = await nclguild.members.fetch(res.locals.info.id)
			if (currentMember.roles.cache.has('922079625482477599')) {
				adminPanelAccess = true;
			}
			
		} catch(err) { /* empty */ }
	}
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
					var origLink = proof;
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
						proof = link;
					}
					var tags = [];
					if(dataDoc.tags != undefined) {
						tags = dataDoc.tags;
					}
					res.render('level', {
						placement: doc.placement,
						lvlname: dataDoc.lvlname,
						creator: dataDoc.creator,
						verifier: dataDoc.verifier,
						id: dataDoc.lvlid,
						proof: proof,
						points: doc.points,
						isStreamable: isEmbeddable, 
						isYoutube: isYoutube,
						origLink: origLink,
						tags: tags,
						authorized: checkAuthorized(res), 
						info: res.locals.info,
						adminPanelAccess: adminPanelAccess
					})
					
				})
			}
		})
	}
})
app.get('/submit', async(req, res) => {
	const nclguild = await client.guilds.fetch(process.env.GUILDID);
	if(!checkAuthorized(res)) {
		res.status(401).render('error', {error: 'You are not logged in!', authorized: checkAuthorized(res), info: res.locals.info, isMod: res.locals.isMod})
	} else {
		try {
			await nclguild.members.fetch(res.locals.info.id)
		} catch(err) {
			res.status(403).render('error', {error: 'You are not in our discord server!', authorized: checkAuthorized(res), info: res.locals.info, isMod: res.locals.isMod})
			return;
		}
		res.render('submit', {verSuccessful: false, vicSuccessful: false, authorized: checkAuthorized(res), info: res.locals.info, isMod: res.locals.isMod})
	}
})
const fetch = require('node-fetch');
const { default: mongoose } = require('mongoose');
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
				res.status(500).render('error', {error: 'Seems like an error occured in the Discord API. This error has been logged to the console. Notify OMGer immediately and try again later.', authorized: false, info: res.locals.info, isMod: res.locals.isMod})
				console.log(err);
				console.log(result);
				console.log(params.toString());
				return;
			}
			res.redirect('/list');
			
		});
	})
	
})
app.get('/api/logout', (req, res) => {
	res.clearCookie('discordToken');
	res.redirect('back');
})
app.post('/api/submit/verification', async(req, res) => {
	const nclguild = await client.guilds.fetch(process.env.GUILDID);
	const tagsString = req.body.tags.toLowerCase();
	
	if(/\s/.test(tagsString) || tagsString.startsWith(",") || tagsString.endsWith(",")) {
		res.status(400).render('error', {error: 'Invalid tags. Hint: Tags do not have spaces and are seperated by a comma (no spaces on that too)', authorized: checkAuthorized(res), info: res.locals.info, isMod: res.locals.isMod})	
	} else {
		db.Models.verification.findOne({lvlid: req.body.lvlid}, (err, doc) => {
			if(doc) {
				res.status(400).render('error', {error: 'You cannot submit duplicates!', authorized: checkAuthorized(res), info: res.locals.info, isMod: res.locals.isMod})	
			} else {
				const tags = tagsString.split(",");
				const doc = new db.Models.verification({
					lvlname: req.body.lvlname,
					lvlid: req.body.lvlid,
					videoProof: req.body.videoproof,
					creator: req.body.creator,
					verifier: req.body.verifier,
					tags: tags
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
				if(process.env.TESTMODE == "FALSE") {
					// <@&${process.env.LISTTEAM_ROLEID}> List team ping
					nclguild.channels.cache.get(process.env.TODO_CHANNELID).send(`\n**${data.lvlname}**\nBy **${data.creator}**\n${data.lvlid}\nVerified by **${data.verifier}**\n${data.videoProof}`);
				}
				if(req.query.redirect) {
					res.redirect(req.query.redirect)
				} else {
					res.json(data)
				}
				
			}
		})
	}
	
	
})
app.post('/api/submit/victory', async(req, res) => {
	
	const nclguild = await client.guilds.fetch(process.env.GUILDID);
	const user = res.locals.info;
	db.Models.victor.findOne({userid: user.id, lvlid: req.body.lvlid}, (err, doc) => {
		if(doc) {
			res.status(400).render('error', {error: 'You cannot submit duplicates!', authorized: checkAuthorized(res), info: res.locals.info, isMod: res.locals.isMod})	
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
			
			db.Models.listlvl.findOne({lvlid: req.body.lvlid}, (err, lvldoc) => {
				if (lvldoc === null) {
					res.status(400).render('error', {error: 'That level isnt on the list!', authorized: checkAuthorized(res), info: res.locals.info, isMod: res.locals.isMod})	
					return;
				} else {
					db.Models.verification.findOne({lvlid: req.body.lvlid}, (err, namedoc) => {
						doc.save();
						if(process.env.TESTMODE == "TRUE") { /* empty */ } else {
							// <@&${process.env.LISTTEAM_ROLEID}> List team ping
							nclguild.channels.cache.get(process.env.RECORDS_CHANNELID).send(`**${namedoc.lvlname}**\nCompleted by \`${user.username}#${user.discriminator}\`\n${req.body.videoproof}`);
						}
						if(req.query.redirect) {
							res.redirect(req.query.redirect)
						} else {
							res.json({userid: user.id, videoProof: req.body.videoproof, lvlid: req.body.lvlid});
						}
					})
				}
			})
		}
	})
})
app.get('/api/deletever/:lvlid', async(req, res) => {
	const nclguild = await client.guilds.fetch(process.env.GUILDID);
	if(checkAuthorized(res)) {
		try {
			const currentMember = await nclguild.members.fetch(res.locals.info.id)
			if (currentMember.roles.cache.has('922079625482477599')) {
				if(!Number.isSafeInteger(parseInt(req.params.lvlid))) {
					res.send('NaN (Not a number)');
					
				} else {
					db.Models.verification.findOne({lvlid: parseInt(req.params.lvlid)}, (err, doc) => {
						if(!doc) {
							res.json({error: "cannotFindDoc"})
						} else {
							doc.remove();
							
							if(req.query.redirect) {
								res.redirect(req.query.redirect)
							} else {
								res.json({deleted: true});
							}
						}
					})
				}
			} else {
				res.status(403).render('error', {error: 'GET OUT (You are not allowed to access this page)', authorized: checkAuthorized(res), info: res.locals.info, isMod: res.locals.isMod})
			}
			
		} catch(err) {
			res.status(403).render('error', {error: 'You are not in our discord server!', authorized: checkAuthorized(res), info: res.locals.info, isMod: res.locals.isMod})
		}
	} else {
		res.status(401).render('error', {error: 'You are not logged in!', authorized: checkAuthorized(res), info: res.locals.info, isMod: res.locals.isMod})
	}
})
app.get("/api/delete/:lvlid", async(req, res) => {
	const nclguild = await client.guilds.fetch(process.env.GUILDID);
	if(checkAuthorized(res)) {
		try {
			const currentMember = await nclguild.members.fetch(res.locals.info.id)
			if (currentMember.roles.cache.has('922079625482477599')) {
				if(!Number.isSafeInteger(parseInt(req.params.lvlid))) {
					res.send('NaN (Not a number)');
					
				} else {
					db.Models.listlvl.findOne({lvlid: parseInt(req.params.lvlid)}, (err, doc) => {
						if(!doc) {
							res.json({error: "cannotFindDoc"})
						} else {
							const oldPlacement = doc.placement;
							doc.remove();
							db.Models.listlvl.find({placement: {$gte : oldPlacement}}, (err, docs) => {
								for(const belowdoc of docs) {
									// eslint-disable-next-line no-unused-vars
									const oldPoints = belowdoc.points;
									
									if(belowdoc.placement <= 100) {
										belowdoc.points += 1;
									}
									belowdoc.placement -= 1;
									belowdoc.save();
								}
							})
							db.Models.user.find({levels:doc.lvlid.toString()}, (err, users) => {
								users.forEach(user => {
									user.levels.splice(user.levels.indexOf(doc.lvlid.toString()), 1);
									user.save();
								}) 
							})
							if(req.query.redirect) {
								res.redirect(req.query.redirect)
							} else {
								res.json({deleted: true});
							}
						}
					})
				}
			} else {
				res.status(403).render('error', {error: 'GET OUT (You are not allowed to access this page)', authorized: checkAuthorized(res), info: res.locals.info, isMod: res.locals.isMod})
			}
			
		} catch(err) {
			res.status(403).render('error', {error: 'You are not in our discord server!', authorized: checkAuthorized(res), info: res.locals.info, isMod: res.locals.isMod})
		}
	} else {
		res.status(401).render('error', {error: 'You are not logged in!', authorized: checkAuthorized(res), info: res.locals.info, isMod: res.locals.isMod})
	}
})

app.get('/panel/edit/:lvlid', async(req, res) => {
	const nclguild = await client.guilds.fetch(process.env.GUILDID);
	if(checkAuthorized(res)) {
		try {
			const currentMember = await nclguild.members.fetch(res.locals.info.id)
			if (currentMember.roles.cache.has('922079625482477599')) {
				if(!Number.isSafeInteger(parseInt(req.params.lvlid))) {
					res.send('NaN (Not a number)');
					
				} else {
					db.Models.listlvl.findOne({lvlid: parseInt(req.params.lvlid)}, async(err, doc) => {
						if(!doc) {
							res.json({error: "cannotFindDoc"})
						} else {
							db.Models.verification.findOne({lvlid: doc.lvlid.toString()}, (err, vdoc) => {
								res.render('edit', {
									lvlname: vdoc.lvlname,
									videoProof: vdoc.videoProof,
									lvlid: doc.lvlid,
									authorized: checkAuthorized(res), 
									info: res.locals.info
								})
							})
						}
					})
				}
			} else {
				res.status(403).render('error', {error: 'GET OUT (You are not allowed to access this page)', authorized: checkAuthorized(res), info: res.locals.info, isMod: res.locals.isMod})
			}
			
		} catch(err) {
			res.status(403).render('error', {error: 'You are not in our discord server!', authorized: checkAuthorized(res), info: res.locals.info, isMod: res.locals.isMod})
		}
	} else {
		res.status(401).render('error', {error: 'You are not logged in!', authorized: checkAuthorized(res), info: res.locals.info, isMod: res.locals.isMod})
	}
})
app.get('/panel/move/:lvlid', async(req, res) => {
	const nclguild = await client.guilds.fetch(process.env.GUILDID);
	if(checkAuthorized(res)) {
		try {
			const currentMember = await nclguild.members.fetch(res.locals.info.id)
			if (currentMember.roles.cache.has('922079625482477599')) {
				if(!Number.isSafeInteger(parseInt(req.params.lvlid))) {
					res.send('NaN (Not a number)');
					
				} else {
					db.Models.listlvl.findOne({lvlid: parseInt(req.params.lvlid)}, async(err, doc) => {
						if(!doc) {
							res.json({error: "cannotFindDoc"})
						} else {
							res.render('move', {
								lvlid: req.params.lvlid,
								placement: doc.placement,
								authorized: checkAuthorized(res), 
								info: res.locals.info
							})
						}
					})
				}
			} else {
				res.status(403).render('error', {error: 'GET OUT (You are not allowed to access this page)', authorized: checkAuthorized(res), info: res.locals.info, isMod: res.locals.isMod})
			}
			
		} catch(err) {
			res.status(403).render('error', {error: 'You are not in our discord server!', authorized: checkAuthorized(res), info: res.locals.info, isMod: res.locals.isMod})
		}
	} else {
		res.status(401).render('error', {error: 'You are not logged in!', authorized: checkAuthorized(res), info: res.locals.info, isMod: res.locals.isMod})
	}
})
app.post('/api/edit', async(req, res) => {
	const nclguild = await client.guilds.fetch(process.env.GUILDID);
	if(checkAuthorized(res)) {
		try {
			const currentMember = await nclguild.members.fetch(res.locals.info.id)
			if (currentMember.roles.cache.has('922079625482477599')) {
				if(!Number.isSafeInteger(parseInt(req.body.lvlid))) {
					res.json({error: "levelidinvalid"})
					
				} else {
					db.Models.verification.findOne({lvlid: parseInt(req.body.lvlid)}, async(err, doc) => {
						if(!doc) {
							res.json({error: "cannotFindDoc"})
						} else {
							db.Models.verification.findOne({lvlid: doc.lvlid.toString()}, async(err, vdoc) => {
								if(req.body.lvlname != "") {
									vdoc.lvlname = req.body.lvlname;
									await vdoc.save();
									res.send("Edit completed");
									return;
								}
								if(req.body.videoproof != "") {
									vdoc.videoProof = req.body.videoproof;
									await vdoc.save();
									res.send("Edit completed");
									return;
								}
								if(req.body.tags != "") {
									const tagsString = req.body.tags.toLowerCase();
									if(/\s/.test(tagsString) || tagsString.startsWith(",") || tagsString.endsWith(",")) {
										res.status(400).render('error', {error: 'Invalid tags. Your other changes have been applied already.', authorized: checkAuthorized(res), info: res.locals.info, isMod: res.locals.isMod})
										return;
									} else {
										const tags = tagsString.split(",");
										vdoc.tags = tags;
										await vdoc.save();
										res.send("Edit completed");
										return;
									}
								}
							})
						}
					})
				}
			} else {
				res.status(403).render('error', {error: 'GET OUT (You are not allowed to access this page)', authorized: checkAuthorized(res), info: res.locals.info, isMod: res.locals.isMod})
			}
			
		} catch(err) {
			res.status(403).render('error', {error: 'You are not in our discord server!', authorized: checkAuthorized(res), info: res.locals.info, isMod: res.locals.isMod})
		}
	} else {
		res.status(401).render('error', {error: 'You are not logged in!', authorized: checkAuthorized(res), info: res.locals.info, isMod: res.locals.isMod})
	}
})
app.get('/panel', async(req, res) => {
	const nclguild = await client.guilds.fetch(process.env.GUILDID);
	if(checkAuthorized(res)) {
		try {
			const currentMember = await nclguild.members.fetch(res.locals.info.id)
			if (currentMember.roles.cache.has('922079625482477599')) {
				const unplacedcollection = new Collection();
				db.Models.verification.find({}, (err, vdocs) => {
					for(const vdoc of vdocs) {
						unplacedcollection.set(vdoc.lvlid, vdoc);
						
					}
					db.Models.listlvl.find({}, (err, docs) => {
						for(const vdoc of vdocs) {
							for(const doc of docs) {
								if(doc.lvlid == parseInt(vdoc.lvlid)) {
									unplacedcollection.delete(vdoc.lvlid)
								}
							}
						}
						const unplacedLvls = Array.from(unplacedcollection.values())
						res.render('verificationlist', {
							unplacedLvls: unplacedLvls,
							authorized: checkAuthorized(res),
							info: res.locals.info
						})
					})
				})
			} else {
				res.status(403).render('error', {error: 'GET OUT (You are not allowed to access this page)', authorized: checkAuthorized(res), info: res.locals.info, isMod: res.locals.isMod})
			}
			
		} catch(err) {
			res.status(403).render('error', {error: 'You are not in our discord server!', authorized: checkAuthorized(res), info: res.locals.info, isMod: res.locals.isMod})
		}
	} else {
		res.status(401).render('error', {error: 'You are not logged in!', authorized: checkAuthorized(res), info: res.locals.info, isMod: res.locals.isMod})
	}
})
app.get('/api/resetpoints', async(req, res) => {
	const nclguild = await client.guilds.fetch(process.env.GUILDID);
	if(checkAuthorized(res)) {
		try {
			const currentMember = await nclguild.members.fetch(res.locals.info.id)
			if (currentMember.roles.cache.has('922079625482477599')) {
				db.Models.listlvl.find({placement: {$lte : 100}}, async(err, docs) => {
					for (var doc of docs) {
						doc.points = 100 - (1 * (doc.placement - 1));
						
						await doc.save();
					}		
				})
				db.Models.listlvl.find({placement: {$gte : 101}}, async(err, docs) => {
					for (var doc of docs) {
						doc.points = 0;
						await doc.save();
					}		
				})
				if(req.query.redirect) {
					res.redirect(req.query.redirect)
				} else {
					res.json({completed: true});
				}
				
			} else {
				res.status(403).render('error', {error: 'GET OUT (You are not allowed to access this page)', authorized: checkAuthorized(res), info: res.locals.info, isMod: res.locals.isMod})
			}
			
		} catch(err) {
			res.status(403).render('error', {error: 'You are not in our discord server!', authorized: checkAuthorized(res), info: res.locals.info, isMod: res.locals.isMod})
		}
	} else {
		res.status(401).render('error', {error: 'You are not logged in!', authorized: checkAuthorized(res), info: res.locals.info, isMod: res.locals.isMod})
	}

})
app.post('/api/movelevel/', async(req, res) => {
	const nclguild = await client.guilds.fetch(process.env.GUILDID);
	if(checkAuthorized(res)) {
		try {
			const currentMember = await nclguild.members.fetch(res.locals.info.id)
			if (currentMember.roles.cache.has('922079625482477599')) {
				if(!Number.isSafeInteger(parseInt(req.body.lvlid)) || !Number.isSafeInteger(parseInt(req.body.placement))) {
					res.send('NaN (Not a number)');
					
				} else {
					const lvlid = parseInt(req.body.lvlid);

					const newPlacement = parseInt(req.body.placement);
					db.Models.listlvl.findOne({lvlid: lvlid}, async(err, doc) => {
						if(!doc) {
							res.json({error: "cannotFindDoc"})
						} else {
							if(newPlacement > 100) {
								res.status(400).render('error', {error: 'you cannot place levels any lower than 50', authorized: checkAuthorized(res), info: res.locals.info, isMod: res.locals.isMod})
							} else {
								const oldPlacement = doc.placement;
								await doc.remove();
								doc = null;
								console.log('debug1');
								const docs = await db.Models.listlvl.find({placement: {$gte : oldPlacement}});
								for(const belowdoc of docs) {
									// eslint-disable-next-line no-unused-vars
									const oldPoints = belowdoc.points;
									
									if(belowdoc.placement <= 100) {
										belowdoc.points += 1;
									}
									belowdoc.placement -= 1;
									await belowdoc.save();
								}
								console.log('debug2');
								const vdoc = await db.Models.verification.findOne({lvlid: lvlid});
								var points = 100;
								var subtractionTimes = newPlacement - 1;
								for(var i=0; i < subtractionTimes; i++) {
									points = points - 1;
								}
								console.log('debug3');
								const listlvl = new db.Models.listlvl({
									lvlid: lvlid,
									placement: newPlacement,
									points: points,
									verification: vdoc.get('_id')
								})
								console.log('debug4');
								const docsgte = await db.Models.listlvl.find({placement: {$gte : newPlacement}})
								docsgte.forEach(async(pdoc) => {
									pdoc.placement += 1;
									if(pdoc.points != 0) {
										pdoc.points -= 1;
									}
									await pdoc.save();
								})
								console.log('debug5');
								await listlvl.save();
								console.log('debug6');
								nclguild.channels.cache.get(process.env.LISTUPDATES_CHANNELID).send(`**${vdoc.lvlname}** has been moved to #${newPlacement}.`);
								if(req.query.redirect) {
									res.redirect(req.query.redirect)
								} else {
									res.json({lvlid: lvlid, placement: newPlacement});
								}

							}
							
						}
					})
				}
			} else {
				res.status(403).render('error', {error: 'GET OUT (You are not allowed to access this page)', authorized: checkAuthorized(res), info: res.locals.info, isMod: res.locals.isMod})
			}
			
		} catch(err) {
			res.status(403).render('error', {error: 'You are not in our discord server!', authorized: checkAuthorized(res), info: res.locals.info, isMod: res.locals.isMod})
		}
	} else {
		res.status(401).render('error', {error: 'You are not logged in!', authorized: checkAuthorized(res), info: res.locals.info, isMod: res.locals.isMod})
	}
})

app.get('/fixplacements', async(req, res) => {
	const nclguild = await client.guilds.fetch(process.env.GUILDID);
	if(checkAuthorized(res)) {
		try {
			const currentMember = await nclguild.members.fetch(res.locals.info.id)
			if (currentMember.roles.cache.has('922079625482477599')) {
				db.Models.listlvl.find({}).sort({placement: 1}).exec(async(err, docs) => {
					var index = 1;
					for (const lvl of docs) {
						lvl.placement = index;
						await lvl.save();
						index++;
					}
					res.json({msg: 'done'})
				})
			} else {
				res.status(403).render('error', {error: 'GET OUT (You are not allowed to access this page)', authorized: checkAuthorized(res), info: res.locals.info, isMod: res.locals.isMod})
			}
			
		} catch(err) {
			res.status(403).render('error', {error: 'You are not in our discord server!', authorized: checkAuthorized(res), info: res.locals.info, isMod: res.locals.isMod})
		}
	} else {
		res.status(401).render('error', {error: 'You are not logged in!', authorized: checkAuthorized(res), info: res.locals.info, isMod: res.locals.isMod})
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
