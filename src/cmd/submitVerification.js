const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('submitverification')
		.setDescription('Submits a level for the list.')
		.addIntegerOption(option => option.setName("levelid").setDescription("Level ID").setRequired(true))
		.addStringOption(option => option.setName("levelname").setDescription("Level Name").setRequired(true))
		.addStringOption(option => option.setName("videoproof").setDescription("Proof of verification").setRequired(true))
		.addStringOption(option => option.setName("creator").setDescription("Ign of creator").setRequired(true))
		.addStringOption(option => option.setName("verifier").setDescription("Ign of verifier").setRequired(true)),
	async execute(interaction, db) {
		const lvlid = await interaction.options.getInteger('levelid').toString();
		const lvlname = await interaction.options.getString('levelname');
		const videoProof = await interaction.options.getString('videoproof');
		const creator = await interaction.options.getString('creator');
		const verifier = await interaction.options.getString('verifier');
		const doc = new db.Models.verification({
			lvlname: lvlname,
			lvlid: lvlid,
			videoProof: videoProof,
			creator: creator,
			verifier: verifier
		})
		data = {
			lvlname: lvlname,
			lvlid: lvlid,
			videoProof: videoProof,
			creator: creator,
			verifier: verifier
		}
		doc.save();
		// console.log(doc);
		if(process.env.TESTMODE == "TRUE") {
			
			interaction.guild.channels.cache.get('923074517318901790').send(`<@&${process.env.LISTTEAM_ROLEID}>\n**${data.lvlname}**\nBy **${data.creator}**\n${data.lvlid}\nVerified by **${data.verifier}**\n${data.videoProof}`);
		} else {
			// <@&${process.env.LISTTEAM_ROLEID}> List team ping
			interaction.guild.channels.cache.get(process.env.TODO_CHANNELID).send(`\n**${data.lvlname}**\nBy **${data.creator}**\n${data.lvlid}\nVerified by **${data.verifier}**\n${data.videoProof}`);
		}
		await interaction.reply({content: "Successfully sent verification. List team have been notified", ephemeral: true});
	},
};