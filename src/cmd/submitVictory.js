const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('submitvictory')
		.setDescription('Submits a list completion')
		.addIntegerOption(option => option.setName("levelid").setDescription("Level ID").setRequired(true))
		.addStringOption(option => option.setName("videoproof").setDescription("Proof of completion").setRequired(true)),
	async execute(interaction, db) {
		const lvlid = await interaction.options.getInteger('levelid').toString();
		const videoProof = await interaction.options.getString('videoproof');
		const userid = await interaction.user.id;
		const doc = new db.Models.victor({
			userid: userid,
			videoProof: videoProof,
			lvlid: lvlid
		})
		await db.Models.user.findOne({userid: userid}, (err, userdoc) => {
			if (userdoc === null) {
				const user = new db.Models.user({userid: userid, points: 0})
				user.save();
			}
		})
		var lvlname = null;
		await db.Models.listlvl.findOne({lvlid: lvlid}, (err, lvldoc) => {
			if (lvldoc === null) {
				interaction.reply({content: "That level is not on the list!", ephemeral: true});
				return;
			}
		})
		await db.Models.verification.findOne({lvlid: lvlid}, (err, namedoc) => {
			doc.save();
		if(process.env.TESTMODE == "TRUE") {
			interaction.guild.channels.cache.get('923099462337982524').send(`<@&${process.env.LISTTEAM_ROLEID}>\n**${namedoc.lvlname}**\nCompleted by \`${interaction.user.tag}\`\n${videoProof}`);
		} else {
			// <@&${process.env.LISTTEAM_ROLEID}> List team ping
			interaction.guild.channels.cache.get(process.env.RECORDS_CHANNELID).send(`\n**${namedoc.lvlname}**\nCompleted by \`${interaction.user.tag}\`\n${videoProof}`);
		}
		interaction.reply({content: "Successfully sent completion. List team have been notified", ephemeral: true});
		})
		
		
	},
};