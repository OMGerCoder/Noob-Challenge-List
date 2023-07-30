const express = require('express');
const app = express.Router();
const db = require('../src/db/database');
const client = require('../src/index').client;
const fetch = require('node-fetch');
const {Collection} = require('discord.js')
const checkAuthorized = (res) => {
	if(res.locals.info) {
		return true;
	} else {
		return false;
	}
}
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
			if(req.query.error_description != "The resource owner or authorization server denied the request") {
				try {
					res.cookie('discordToken', result.access_token, { maxAge: result.expires_in * 1000, httpOnly: true })
				} catch(err) {
					res.status(500).render('error', {error: 'Seems like an error occured in the Discord API. Try again later.', authorized: false, info: res.locals.info, isMod: res.locals.isMod})
					console.log(err);
					console.log(result);
					console.log(params.toString());
					console.log(req.originalUrl);
					return;
				}
				res.redirect('/list');
			} else {
				res.redirect('/');
			}
			
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
					res.send('NaN (Not a number) (Seeing this when trying to remove a level means that an invalid level ID was submitted. Contact OMGer and punish the user who did this.)');
					
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
					res.send('NaN (Not a number) (Seeing this when trying to remove a level means that an invalid level ID was submitted. Contact OMGer and punish the user who did this.)');
					
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
									
								}
								if(req.body.videoproof != "") {
									vdoc.videoProof = req.body.videoproof;
									await vdoc.save();
									
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
										
									}
								}
								res.send("Edit completed");
								
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

app.get('/api/fixplacements', async(req, res) => {
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
module.exports = app;