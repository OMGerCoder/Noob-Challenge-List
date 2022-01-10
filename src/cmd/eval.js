const { SlashCommandBuilder } = require('@discordjs/builders');
const discord = require('discord.js')
const clean = async (client, text) => {
    // If our input is a promise, await it before continuing
    if (text && text.constructor.name == "Promise")
      text = await text;
    
    // If the response isn't a string, `util.inspect()`
    // is used to 'stringify' the code in a safe way that
    // won't error out on objects with circular references
    // (like Collections, for example)
    if (typeof text !== "string")
      text = require("util").inspect(text, { depth: 1 });
    
    // Replace symbols with character code alternatives
    text = text
      .replace(/`/g, "`" + String.fromCharCode(8203))
      .replace(/@/g, "@" + String.fromCharCode(8203));
      text = text.replaceAll(client.token, "No shit u tryna look at my token");
    // Send off the cleaned up result
    return text;
}
module.exports = {
	data: new SlashCommandBuilder()
		.setName('eval')
		.setDescription('Eval')
		.addStringOption(option => option.setName("cmd").setDescription("Command").setRequired(true)),
		
    
	async execute(interaction, db) {
        const cmd = await interaction.options.getString('cmd');
        if(interaction.user.id == "655225599710855169") {
            try {
                // Evaluate (execute) our input
                const evaled = eval(cmd);
                
                // Put our eval result through the function
                // we defined above
                const cleaned = await clean(interaction.client, evaled);
                if(cleaned.length >= 2000){
                    interaction.reply({content: `Sorry, character limit (Result has been dumped in console)`, ephemeral: true});
                    console.log(cleaned);
                    return;
                }
                // Reply in the channel with our result
                
                interaction.reply({content: `\`\`\`js\n${cleaned}\n\`\`\``, ephemeral: true});
              } catch (err) {
                // Reply in the channel with our error
                interaction.reply({content: `\`ERROR\` \`\`\`xl\n${cleaned}\n\`\`\``, ephemeral: true});
              }
        }
    }
}