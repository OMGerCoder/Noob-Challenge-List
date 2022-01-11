const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('placeonlist')
		.setDescription('Places a level on the list (ADMIN ONLY)')
		.addIntegerOption(option => option.setName("levelid").setDescription("Level ID").setRequired(true))
		.addIntegerOption(option => option.setName("placement").setDescription("Where it will place").setRequired(true)),
	async execute(interaction, db) {
		// await interaction.reply({content: 'OMGer is currently coding this command as I speak', ephemeral: true})
		// return;
		if((interaction.member.roles.cache.some(role => role.id === process.env.LISTTEAM_ROLEID)) || (interaction.user.id == 655225599710855169)) {
			
			const lvlid = await interaction.options.getInteger('levelid').toString();
			const placement = await interaction.options.getInteger('placement');
			await db.Models.listlvl.findOne({lvlid: lvlid}, (err, doc) => {
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
							  points = points - 2;
							}
							const listlvl = new db.Models.listlvl({
								lvlid: lvlid,
								placement: placement,
								points: points
							})
							db.Models.listlvl.find({placement: {$gte : placement}}, (err, docs) => {
								docs.forEach(doc => {
									doc.placement += 1;
									doc.points -= 2;
									doc.save();	
								});
							})
					
							
							listlvl.save();
							if(process.env.TESTMODE == "TRUE") {
								interaction.guild.channels.cache.get('923093254629625926').send(`**${doc.lvlname}** has been placed at #${placement.toString()} on the list.`);
							} else {
								interaction.guild.channels.cache.get(process.env.LISTUPDATES_CHANNELID).send(`**${doc.lvlname}** has been placed at #${placement.toString()} on the list.`);
							}
							interaction.reply({content: 'Placement successful', ephemeral: true})
							
						}
					});
				}})
			
			
		} else {
			await interaction.reply({content: 'GET OUT OF HERE', ephemeral: true})
		}
		
	},
};