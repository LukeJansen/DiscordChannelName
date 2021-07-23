if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config()
}

const Discord = require("discord.js")
const client = new Discord.Client();

users = {}

const userTemplate = {
    channels: {},
    default: ""
}

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

    if (!member.voice.channel){
        msg.channel.send("You are not in a voice channel! Please join a channel and then reissue this command").then(function (message) {
            message.react("🗑️")
        }).catch(function() {
            console.log("ERROR!")
        });
        msg.delete()
        return
    }

    const channelID = voiceState.channelID
    
    switch(text.substr(0, 4)){
        case "!cn ":
            try {
                if (msg.guild.owner.id == msg.author.id) {
                    return msg.channel.send("Sorry Server Owners cannot use Channel Nickname Bot :(").then(function (message) {
                        message.react("🗑️")
                    }).catch(function() {
                        console.log("ERROR!")
                    });
                }
                if (userID in users){
                    users[userID].channels[channelID] = text.substr(4)
                    member.setNickname(text.substr(4))
                }
                else{
                    users[userID] = {
                        channels: {},
                        default: member.displayName
                    }

                    users[userID].channels[channelID] = text.substr(4)
                    member.setNickname(text.substr(4))
                }
                msg.react("✅").then(() => msg.react('🗑️'))
                console.log(users)
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
            member.setNickname(users[userID].default)
            delete users[userID]
            msg.react("✅").then(() => msg.react('🗑️'))
            break
        case "!cnd":
            if (msg.guild.owner.id == msg.author.id) {
                return msg.channel.send("Sorry Server Owners cannot use Channel Nickname Bot :(").then(function (message) {
                    message.react("🗑️")
                }).catch(function() {
                    console.log("ERROR!")
                });
            }
            if (userID in users){
                users[userID].default = text.substr(5)
            }
            else{
                users[userID] = {
                    channels: {},
                    default: text.substr(5)
                }
            }
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

client.on("voiceStateUpdate", function(oldMember, newMember){

    const userID = newMember.member.user.id
    if (userID in users){
        console.log(newMember.channelID)
        
        if (newMember.channelID == null){
            newMember.member.setNickname(users[userID].default)
            return
        }
        const channelID = newMember.channel.id

        if (channelID in users[userID].channels){
            newMember.member.setNickname(users[userID].channels[channelID])
        }
        else{
            newMember.member.setNickname(users[userID].default)
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
    
    console.log(reaction.count)

    if (reaction.users.cache.has(client.user.id) && reaction._emoji.name == "🗑️"){
        console.log("Delete 2")
        if (reaction.count >= 2) reaction.message.delete()
    }
    else if (reaction.users.cache.has(reaction.message.author.id) && reaction._emoji.name == "🗑️"){
        console.log("Delete 1")
        reaction.message.delete()
    }
});

client.on('warning', (e) => { console.error(e) })
client.on('error', (e) => { console.error(e) })

client.login(process.env.BOT_TOKEN)