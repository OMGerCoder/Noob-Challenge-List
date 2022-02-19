const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('submitvictory')
		.setDescription('Submits a list completion')
		.addIntegerOption(option => option.setName("levelid").setDescription("Level ID").setRequired(true))
		.addStringOption(option => option.setName("videoproof").setDescription("Proof of completion").setRequired(true))
		.addUserOption(option => option.setName("user").setDescription("User to submit for (Optional)").setRequired(false)),
	async execute(interaction, db) {
		const lvlid = await interaction.options.getInteger('levelid').toString();
		const videoProof = await interaction.options.getString('videoproof');
		const user = await interaction.options.getUser('user') || await interaction.user;
		await db.Models.victor.findOne({userid: user.id, lvlid: lvlid}, (err, doc) => {
			if(doc) {
				interaction.reply({content: "Sorry, you cannot submit duplicates", ephemeral: true});
			} else {
			
				const doc = new db.Models.victor({
					userid: user.id,
					videoProof: videoProof,
					lvlid: lvlid
				})
				db.Models.user.findOne({userid: user.id}, (err, userdoc) => {
					if (userdoc === null) {
						const docUser = new db.Models.user({userid: user.id, points: 0, username: user.tag})
						docUser.save();
					}
				})
				var lvlname = null;
				db.Models.listlvl.findOne({lvlid: lvlid}, (err, lvldoc) => {
					if (lvldoc === null) {
						interaction.reply({content: "That level is not on the list!", ephemeral: true});
						return;
					} else {
						db.Models.verification.findOne({lvlid: lvlid}, (err, namedoc) => {
							doc.save();
						if(process.env.TESTMODE == "TRUE") {
							interaction.guild.channels.cache.get('923099462337982524').send(`**${namedoc.lvlname}**\nCompleted by \`${interaction.user.tag}\`\n${videoProof}`);
						} else {
							// <@&${process.env.LISTTEAM_ROLEID}> List team ping
							interaction.guild.channels.cache.get(process.env.RECORDS_CHANNELID).send(`**${namedoc.lvlname}**\nCompleted by \`${interaction.guild.members.cache.get(user.id).user.tag}\`\n${videoProof}`);
						}
						interaction.reply({content: "Successfully sent completion. List team have been notified", ephemeral: true});
						})
					}
				})
			}
		})
		
	},
}