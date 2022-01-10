const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('swaplistpositions')
		.setDescription('Swaps 2 levels on the list')
		.addIntegerOption(option => option.setName("levelid1").setDescription("Level ID").setRequired(true))
		.addIntegerOption(option => option.setName("levelid2").setDescription("Level ID").setRequired(true)),
	async execute(interaction, db) {
		// await interaction.reply({content: 'OMGer is currently coding this command as I speak', ephemeral: true})
		// return;
		if(interaction.member.roles.cache.some(role => role.id === process.env.LISTTEAM_ROLEID)) {
			
			const lvlid1 = await interaction.options.getInteger('levelid1').toString();
			const lvlid2 = await interaction.options.getInteger('levelid2');
            await db.Models.listlvl.findOne({lvlid: lvlid1}, (err, doc1) => {
                db.Models.listlvl.findOne({lvlid: lvlid2}, (err, doc2) => {
                    if(doc1 && doc2) {
                        const placement1 = doc1.placement;
                        const placement2 = doc2.placement;
                        doc1.placement = placement2;
                        doc2.placement = placement1;
                        doc1.save();
                        doc2.save();
                        db.Models.verification.findOne({lvlid: lvlid1}, (err, doc1lvl) => {
                            db.Models.verification.findOne({lvlid: lvlid2}, (err, doc2lvl) => {
                                if(process.env.TESTMODE == "TRUE") {
                                    interaction.guild.channels.cache.get('923093254629625926').send(`**${doc1lvl.lvlname}** has been swapped with **${doc2lvl.lvlname}** on the list.`);
                                    interaction.reply({content: 'Placement successfull', ephemeral: true})
                                } else {
                                    interaction.guild.channels.cache.get(process.env.LISTUPDATES_CHANNELID).send(`**${doc1lvl.lvlname}** has been swapped with **${doc2lvl.lvlname}** on the list.`);
                                    interaction.reply({content: 'Placement successfull', ephemeral: true})
                                }
                                
                            })
                        })
                        
                    } else {
                        interaction.reply("these 2 levels do not exist on the list")
                    }
                })
            })
			
			
		} else {
			await interaction.reply({content: 'GET OUT OF HERE', ephemeral: true})
		}
		
	},
};