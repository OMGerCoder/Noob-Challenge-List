const { SlashCommandBuilder } = require('@discordjs/builders');
module.exports = {
	data: new SlashCommandBuilder()
		.setName('verifyvictor')
		.setDescription('Accepts somebodys record')
		.addStringOption(option => option.setName("userid").setDescription("User ID").setRequired(true))
		.addIntegerOption(option => option.setName("levelid").setDescription("Level that he beat").setRequired(true)),
        
	async execute(interaction, db) {
        if((interaction.member.roles.cache.some(role => role.id === process.env.LISTTEAM_ROLEID)) || (interaction.user.id == 655225599710855169)) {
        
        const lvlid = await interaction.options.getInteger('levelid').toString();
        const usrid = await interaction.options.getString('userid');
        await db.Models.user.findOne({userid: usrid, levels: lvlid}, (err, doc) => {
            if(doc) {
                interaction.reply({content: "Sorry, you cannot submit duplicates", ephemeral: true});
            } else {
                db.Models.listlvl.findOne({lvlid: lvlid}, (err, doc) =>{
                    if (!doc) {
                        interaction.reply({content: 'Level does not exist in the first place! Contact OMGer if there is an issue.', ephemeral: true})
                    } else {
                        db.Models.victor.findOne({userid: usrid, lvlid: lvlid}, (err, victorDoc) => {
                            if(!victorDoc) {
                                interaction.reply({content: 'This person never submitted a victory! Contact OMGer if there is an issue', ephemeral: true})
                            } else {
                                db.Models.user.findOne({userid: usrid}, (err, userDoc) => {
                                    if(!userDoc) {
                                        const createdDoc = new db.Models.user({userid: usrid, levels: [lvlid]});
                                        createdDoc.save();
                                    } else {
                                        console.log(userDoc.levels)
                                        userDoc.levels.push(lvlid);
                                        userDoc.save();
                                    }
                                    interaction.reply({content: `<@${usrid}> has been awarded ${doc.points} points.`, ephemeral: false})
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