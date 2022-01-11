const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('submitvictory')
		.setDescription('Submits a list completion')
		.addIntegerOption(option => option.setName("levelid").setDescription("Level ID").setRequired(true))
		.addStringOption(option => option.setName("videoproof").setDescription("Proof of completion").setRequired(true))
		.addStringOption(option => option.setName("userid").setDescription("User ID to submit for (Optional)").setRequired(false)),
	async execute(interaction, db) {
		const lvlid = await interaction.options.getInteger('levelid').toString();
		const videoProof = await interaction.options.getString('videoproof');
		const userid = await interaction.options.getString('userid') || await interaction.user.id;
		if(Number.isSafeInteger(parseInt(userid))) {
			interaction.reply({content: "Invalid integer! (userid)", ephemeral: true});
		}
		await db.Models.victor.findOne({userid: userid, lvlid: lvlid}, (err, doc) => {
			if(doc) {
				interaction.reply({content: "Sorry, you cannot submit duplicates", ephemeral: true});
			} else {
			
				const doc = new db.Models.victor({
					userid: userid,
					videoProof: videoProof,
					lvlid: lvlid
				})
				db.Models.user.findOne({userid: userid}, (err, userdoc) => {
					if (userdoc === null) {
						const user = new db.Models.user({userid: userid, points: 0})
						user.save();
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
							interaction.guild.channels.cache.get('923099462337982524').send(`<@&${process.env.LISTTEAM_ROLEID}>\n**${namedoc.lvlname}**\nCompleted by \`${interaction.user.tag}\`\n${videoProof}`);
						} else {
							// <@&${process.env.LISTTEAM_ROLEID}> List team ping
							interaction.guild.channels.cache.get(process.env.RECORDS_CHANNELID).send(`<@&${process.env.LISTTEAM_ROLEID}>\n**${namedoc.lvlname}**\nCompleted by \`${interaction.guild.members.cache.get(userid).user.tag}\`\n${videoProof}`);
						}
						interaction.reply({content: "Successfully sent completion. List team have been notified", ephemeral: true});
						})
					}
				})
			}
		})
		
	},
}