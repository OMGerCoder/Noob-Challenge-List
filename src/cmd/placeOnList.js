/* eslint-disable no-loss-of-precision */
const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('placeonlist')
		.setDescription('Places a level on the list (ADMIN ONLY)')
		.addIntegerOption(option => option.setName("levelid").setDescription("Level ID").setRequired(true))
		.addIntegerOption(option => option.setName("placement").setDescription("Where it will place").setRequired(true))
		.addMentionableOption(option => option.setName("user").setDescription("User to award points").setRequired(false)),
	async execute(interaction, db) {
		// await interaction.reply({content: 'OMGer is currently coding this command as I speak', ephemeral: true})
		// return;
		if((interaction.member.roles.cache.some(role => role.id === process.env.LISTTEAM_ROLEID)) || (interaction.user.id == 655225599710855169)) {
			
			const lvlid = await interaction.options.getInteger('levelid').toString();
			const placement = await interaction.options.getInteger('placement');
			const user = await interaction.options.getMentionable('user');

			db.Models.listlvl.findOne({lvlid: lvlid}, (err, doc) => {
				if(doc) {
					interaction.reply({content: "Sorry, you cannot submit duplicates", ephemeral: true});
				} else {
					db.Models.verification.findOne({lvlid: lvlid}, (err, doc) => {
						if (doc === null) {
							interaction.reply({content: 'The verification for this level id has not been submitted! Contact OMGer if there is an issue', ephemeral: true})
						} else {
							var points = 100;
							var subtractionTimes = placement - 1;
							for(var i=0; i < subtractionTimes; i++) {
								points = points - 1;
							}
							const listlvl = new db.Models.listlvl({
								lvlid: lvlid,
								placement: placement,
								points: points,
								verification: doc.get('_id')
							})
							db.Models.listlvl.find({placement: {$gte : placement}}, (err, docs) => {
								docs.forEach(doc => {
									doc.placement += 1;
									if(doc.points != 0) {
										doc.points -= 1;
									}
									doc.save();	
								});
							})
					
							
							listlvl.save();
							if(user) {
								db.Models.user.findOne({userid: user.id}, (err, userDoc) => {
									if(!userDoc) {
										const createdDoc = new db.Models.user({userid: user.id, username: user.user.tag, levels: [lvlid]});
										createdDoc.save();
									} else {
										userDoc.levels.push(lvlid);
										userDoc.save();
									}
									if(process.env.TESTMODE == "TRUE") {
										interaction.guild.channels.cache.get('923093254629625926').send(`**${doc.lvlname}** has been placed at #${placement.toString()} on the list.`);
									} else {
										interaction.guild.channels.cache.get(process.env.LISTUPDATES_CHANNELID).send(`**${doc.lvlname}** has been placed at #${placement.toString()} on the list.`);
									}
									interaction.reply({content: `Placement successful. <@${user.id}> has been awarded ${listlvl.points} points.`, ephemeral: false})
								}) 
							} else {
								if(process.env.TESTMODE == "TRUE") {
									interaction.guild.channels.cache.get('923093254629625926').send(`**${doc.lvlname}** has been placed at #${placement.toString()} on the list.`);
								} else {
									interaction.guild.channels.cache.get(process.env.LISTUPDATES_CHANNELID).send(`**${doc.lvlname}** has been placed at #${placement.toString()} on the list.`);
								}
								interaction.reply({content: `Placement successful. No points have been awarded.`, ephemeral: true})
							}
							
							
						}
					});
				}})
			
			
		} else {
			await interaction.reply({content: 'GET OUT OF HERE', ephemeral: true})
		}
		
	},
};
