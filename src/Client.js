const { Client } = require('discord.js')
const CmdHandler = require('./cmd/handle')
class CustomClient extends Client {
    constructor() {
        super();
        this.handle = new CmdHandler();
        this.prefix = ""
    }

}
module.exports = CustomClient;