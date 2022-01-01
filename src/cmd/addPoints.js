const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('addpoints')
		.setDescription('Gives a user points (ADMIN ONLY)')
		.addUserOption(option => option.setName("user").setDescription("User").setRequired(true))
		.addIntegerOption(option => option.setName("points").setDescription("Points to reward").setRequired(true)),
	async execute(interaction, db) {
		// await interaction.reply({content: 'OMGer is currently coding this command as I speak', ephemeral: true})
		// return;
		if(interaction.member.roles.cache.some(role => role.id === process.env.LISTTEAM_ROLEID)) {
			const user = await interaction.options.getUser('user');
			const points = await interaction.options.getInteger('points');
			await db.Models.user.findOne({userid: user.id}, (err, doc) => {
				if(!doc) {
					 interaction.reply({content: "That user is not a member who has beaten a challenge!", ephemeral: true});
				} else {
					doc.points += points;
					doc.save();
					interaction.reply({content: `Successfully added ${points} points to \`${user.tag}\``});
				}
			})
		} else {
			await interaction.reply({content: 'GET OUT OF HERE', ephemeral: true})
		}
		
	},
};