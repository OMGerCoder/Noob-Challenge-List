const mongoose = require("mongoose");
/*
class Database {
    constructor() {
        this.Models = {
            user: mongoose.model("user", new mongoose.Schema({
                userid: String,
                username: String,
                levels: [String],
            })),
            victor: mongoose.model("victor", new mongoose.Schema({
                userid: String,
                videoProof: String,
                lvlid: String
            })),
            
            verification: mongoose.model("verification", new mongoose.Schema({
                
                lvlname: String,
                lvlid: String,
                videoProof: String,
                creator: String,
                verifier: String,
                tags: [String]
                
            })),
            
            listlvl: mongoose.model("listlvl", new mongoose.Schema({
                lvlid: Number,
                placement: Number,
                points: Number,
                verification: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'verification'
                }
            }))
            
        }
    } // wtf i can't create files
    
    
    
    initiateConnection(uri) {
        mongoose.connect(uri, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        // eslint-disable-next-line no-unused-vars
        return new Promise((resolve, reject) => {
            mongoose.connection.on("open", () => resolve());
        });
    } 
}
*/
const Database = {
    Models: {
        user: mongoose.model("user", new mongoose.Schema({
            userid: String,
            username: String,
            levels: [String],
        })),
        victor: mongoose.model("victor", new mongoose.Schema({
            userid: String,
            videoProof: String,
            lvlid: String
        })),
        
        verification: mongoose.model("verification", new mongoose.Schema({
            
            lvlname: String,
            lvlid: String,
            videoProof: String,
            creator: String,
            verifier: String,
            tags: [String]
            
        })),
        
        listlvl: mongoose.model("listlvl", new mongoose.Schema({
            lvlid: Number,
            placement: Number,
            points: Number,
            verification: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'verification'
            }
        }))
        
    },
    initiateConnection: function(uri) {
        mongoose.connect(uri, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        // eslint-disable-next-line no-unused-vars
        return new Promise((resolve, reject) => {
            mongoose.connection.on("open", () => resolve());
        });
    }
}
module.exports = Database;