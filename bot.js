if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config()
}

const Discord = require("discord.js")
const mongoose = require('mongoose')
const client = new Discord.Client();

mongoose.connect(process.env.DB_URL, {useNewUrlParser:true, useUnifiedTopology:true})
const db = mongoose.connection
db.on('error', (error) => console.log("Database error: " + error))
db.once('open', () => console.log("Database connected!"))

const userSchema = new mongoose.Schema({
    userID: {
        type: String,
        required: true
    },
    channels: {
        type: Map,
        required: true
    },
    default: {
        type: String,
        required: false
    }
})

const User = mongoose.model('User', userSchema)
users = {}

// const userTemplate = {
//     channels: {},
//     default: ""
// }

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}`)
    client.user.setUsername("Channel Nickname Bot")
})

client.on('message', async (msg) => {

    const text = msg.content
    const userID = msg.author.id
    const voiceState = msg.guild.voiceStates.cache.get(userID)
    const member = msg.channel.guild.member(msg.author)

    if (userID == client.user.id) return

    if (!member.voice.channel && text.substr(0,4) == "!cn "){
        msg.channel.send("You are not in a voice channel! Please join a channel and then reissue this command").then(function (message) {
            message.react("🗑️")
        }).catch(function() {
            console.log("ERROR!")
        });
        msg.delete()
        return
    }
    
    switch(text.substr(0, 4)){
        case "!cn ":
            try {
                var user = await User.findOne({userID: member.id})
                const channelID = voiceState.channelID

                if (msg.guild.ownerID == msg.author.id) {
                    return msg.channel.send("Sorry Server Owners cannot use Channel Nickname Bot :(").then(function (message) {
                        message.react("🗑️")
                    }).catch(function() {
                        console.log("ERROR!")
                    });
                }

                if (user != null){
                    user.channels.set(channelID, text.substr(4))
                    await user.save()

                    member.setNickname(text.substr(4))
                }
                else{
                    var newUser = new User({userID: member.id, channels: {}, default: member.user.username})
                    newUser.channels.set(channelID, text.substr(4))
                    await newUser.save()

                    member.setNickname(text.substr(4))
                }

                msg.react("✅").then(() => msg.react('🗑️'))
            }
            catch (error){
                console.error(error)
                return msg.channel.send("Something went wrong! Oops! Get <@275348412797550595> to have a look.").then(function (message) {
                    message.react("🗑️")
                }).catch(function() {
                    console.log("ERROR!")
                });
            }
            break

        case "!cnr":
            
            await User.deleteOne({userID: member.id})
            
            member.setNickname("")
            msg.react("✅").then(() => msg.react('🗑️'))
            break

        case "!cnd":
            var user = await User.findOne({userID: member.id})
            
            if (msg.guild.ownerID == msg.author.id) {
                return msg.channel.send("Sorry Server Owners cannot use Channel Nickname Bot :(").then(function (message) {
                    message.react("🗑️")
                }).catch(function() {
                    console.log("ERROR!")
                });
            }

            if (user != null){
                user.default = text.substr(4)
                await user.save()
            }
            else{
                user = new User({userID: member.id, channels: {}, default: text.substr(4)})
                await user.save()
            }

            if (voiceState == null) member.setNickname(text.substr(4))

            msg.react("✅").then(() => msg.react('🗑️'))
            break
        case "!cn?":
            msg.delete()
            return msg.channel.send("❔ Channel Nickname Bot Help! ❔ \n!cn - Set nickname for current voice channel. \n!cnd - Set default nickname for when you are not in a nicknamed channel. \n!cnr - Reset all stored nicknames for yourself. \n!cn? - View this help message.").then(function (message) {
                message.react("🗑️")
            }).catch(function() {
                console.log("ERROR!")
            });
            break
    }
})

client.on("voiceStateUpdate", async function(oldMember, newMember){

    const userID = newMember.member.id
    const user = await User.findOne({userID: userID})

    if (user != null){
        
        if (newMember.channelID == null){
            newMember.member.setNickname(user.default)
            return
        }
        const channelID = newMember.channel.id

        if (user.channels.get(channelID) != null){
            newMember.member.setNickname(user.channels.get(channelID))
        }
        else{
            newMember.member.setNickname(user.default)
        }
    }
});

client.on('messageReactionAdd', async (reaction, user) => {
	if (reaction.partial) {
		try {
			await reaction.fetch();
		} catch (error) {
			console.log('Something went wrong when fetching the message: ', error).then(function (message) {
                message.react("🗑️")
            }).catch(function() {
                console.log("ERROR!")
            });
			return;
		}
    }

    if (reaction.users.cache.has(client.user.id) && reaction._emoji.name == "🗑️"){
        if (reaction.count >= 2) reaction.message.delete()
    }
    else if (reaction.users.cache.has(reaction.message.author.id) && reaction._emoji.name == "🗑️"){
        reaction.message.delete()
    }
});

client.on('warning', (e) => { console.error(e) })
client.on('error', (e) => { console.error(e) })

client.login(process.env.BOT_TOKEN)