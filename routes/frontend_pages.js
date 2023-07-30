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
app.get('/', async(req, res) => {
	res.render('home', {
		authorized: checkAuthorized(res),
		info: res.locals.info,
		isMod: res.locals.isMod
	})
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
app.get('/rules', async(req, res) => {
	res.render('rules', {
		authorized: checkAuthorized(res), 
		info: res.locals.info
	})
})
app.get('/privacy', async(req, res) => {
	res.render('privacy', {
		authorized: checkAuthorized(res), 
		info: res.locals.info
	})
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
module.exports = app;