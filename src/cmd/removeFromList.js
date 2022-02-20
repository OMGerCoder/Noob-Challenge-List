const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('removefromlist')
		.setDescription('Removes a level from the list')
		.addIntegerOption(option => option.setName("levelid").setDescription("Level ID").setRequired(true)),
	async execute(interaction, db) {
		// await interaction.reply({content: 'OMGer is currently coding this command as I speak', ephemeral: true})
		// return;
		if((interaction.member.roles.cache.some(role => role.id === process.env.LISTTEAM_ROLEID)) || (interaction.user.id == 655225599710855169)) {
			
			const lvlid = await interaction.options.getInteger('levelid').toString();
			

			await db.Models.listlvl.findOne({lvlid: lvlid}, (err, doc) => {
				if(!doc) {
					interaction.reply({content: "That level is not on the list", ephemeral: true});
				} else {
					doc.remove();
					db.Models.listlvl.find({placement: {$gte : doc.placement}}, (err, docs) => {
						docs.forEach(belowdoc => {
							belowdoc.placement -= 1;
							belowdoc.points += 2;
							belowdoc.save();	
						});
					})
					db.Models.user.find({levels:lvlid}, (err, users) => {
						users.forEach(user => {
							user.levels.splice(user.levels.indexOf(lvlid), 1);
							user.save();
						}) 
					})
					interaction.reply('successfully removed');
				}})
			
			
		} else {
			await interaction.reply({content: 'GET OUT OF HERE', ephemeral: true})
		}
		
	},
};