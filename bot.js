if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config()
}

const wait = require('util').promisify(setTimeout);
const {Client, Intent, Intents} = require("discord.js")
const mongoose = require('mongoose')
const {version} = require("./package.json")


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

const client = new Client({ intents: [Intents.FLAGS.GUILD_VOICE_STATES, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_MESSAGE_REACTIONS, Intents.FLAGS.GUILD_INTEGRATIONS] });

const commands = [
    {
        name:'cn',
        description: 'Set nickname for current voice channel',
        options: [
            {
                "name": "nickname",
                "description": "The nickname for this channel",
                "type": 'STRING',
                "required": true
            }
        ]
    },
    {
        name:'cndefault',
        description: 'Set default nickname',
        options: [
            {
                "name": "nickname",
                "description": "The default nickname for you",
                "type": 'STRING',
                "required": true
            }
        ]
    },
    {
        name:'cnreset',
        description: 'Reset all your nicknames'
    },
    {
        name:'cnhelp',
        description: 'View all commmands for Channel Nickname Bot'
    }
]

client.on('ready', async () => {
    console.log(`Logged in as ${client.user.tag}\n`)
    await client.guilds.cache.get('726511820436930622')?.commands.set(commands)
    client.user.setUsername("Channel Nickname Bot")
})

client.on('interactionCreate', async (interaction) => {

    if (!interaction.isCommand()) return;

    const nickname = interaction.options.getString('nickname')
    const member = interaction.member
    const userID = interaction.guildId
    const ownerID = '269146867818823691'
    const voiceState = member.guild.voiceStates.cache.get(interaction.user.id)
    console.log(client.guilds.fetch('726511820436930622'))

    switch(interaction.commandName){
        case "cn":

            if (nickname == null || nickname == "" || nickname.length < 2 || nickname.length > 32){
                await interaction.reply({ content: "Sorry! Nicknames must be between 2 and 32 characters long. ❌", ephemeral: true })
                return
            }
            else if (ownerID == userID) {
                await interaction.reply({ content: "Sorry! Server owners cannot yet use this bot 😭", ephemeral: true })
                return
            }

            try {
                var user = await User.findOne({userID: userID})
                const channelID = voiceState.channelId

                if (user != null){
                    user.channels.set(channelID, nickname)
                    await user.save()

                    member.setNickname(nickname)
                }
                else{
                    var newUser = new User({userID: member.id, channels: {}, default: member.user.username})
                    newUser.channels.set(channelID, nickname)
                    await newUser.save()

                    member.setNickname(nickname)
                }

                await interaction.reply({ content: "Nickname Set! ✔️", ephemeral: true })
            }
            catch (error){
                console.error(error)
                await interaction.reply({ content: "Something went wrong! Oops! Get <@275348412797550595> to have a look.", ephemeral: false })
            }
            break

        case "cnreset":
            
            await User.deleteOne({userID: member.id})
            
            member.setNickname("")
            await interaction.reply({ content: "All nicknames have been reset! ✔️", ephemeral: true })
            break

        case "cndefault":
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
        case "cnhelp":
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
    const channelID = newMember.channelId
    const user = await User.findOne({userID: userID})

    if (user != null){
        
        if (channelID == null){
            newMember.member.setNickname(user.default)
            return
        }
        

        if (user.channels.get(channelID) != null){
            newMember.member.setNickname(user.channels.get(channelID))
        }
        else{
            newMember.member.setNickname(user.default)
        }
    }
});

client.on('warning', (e) => { console.error(e) })
client.on('error', (e) => { console.error(e) })

client.login(process.env.BOT_TOKEN)