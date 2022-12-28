const { SlashCommandBuilder } = require('@discordjs/builders');
module.exports = {
	data: new SlashCommandBuilder()
		.setName('verifyvictor')
		.setDescription('Accepts somebodys record')
		.addMentionableOption(option => option.setName("user").setDescription("User").setRequired(true))
		.addIntegerOption(option => option.setName("levelid").setDescription("Level that he beat").setRequired(true)),
        
	async execute(interaction, db) {
        // eslint-disable-next-line no-loss-of-precision
        if((interaction.member.roles.cache.some(role => role.id === process.env.LISTTEAM_ROLEID)) || (interaction.user.id == 655225599710855169)) {
        
        const lvlid = await interaction.options.getInteger('levelid').toString();
        const usr = await interaction.options.getMentionable('user');
        db.Models.user.findOne({userid: usr.id, levels: lvlid}, (err, doc) => {
            if(doc) {
                interaction.reply({content: "Sorry, you cannot submit duplicates", ephemeral: true});
            } else {
                db.Models.listlvl.findOne({lvlid: lvlid}, (err, doc) =>{
                    if (!doc) {
                        interaction.reply({content: 'Level does not exist in the first place! Contact OMGer if there is an issue.', ephemeral: true})
                    } else {
                        db.Models.victor.findOne({userid: usr.id, lvlid: lvlid}, (err, victorDoc) => {
                            if(!victorDoc) {
                                interaction.reply({content: 'This person never submitted a victory! Contact OMGer if there is an issue', ephemeral: true})
                            } else {
                                db.Models.user.findOne({userid: usr.id}, (err, userDoc) => {
                                    if(!userDoc) {
                                        const createdDoc = new db.Models.user({userid: usr.id, levels: [lvlid], username: usr.user.tag});
                                        createdDoc.save();
                                    } else {
                                        userDoc.levels.push(lvlid);
                                        userDoc.save();
                                    }
                                    interaction.reply({content: `<@${usr.id}> has been awarded ${doc.points} points.`, ephemeral: false})
                                })
                            }
                        })
                    }
                })
            }})
        
        } else {
            await interaction.reply({content: 'GET OUT OF HERE', ephemeral: true})
        }
    }
}
