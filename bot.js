if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config()
}

const {Client, Intent, Intents, MessageActionRow, MessageButton} = require("discord.js")
const mongoose = require('mongoose')


mongoose.connect(process.env.DB_URL, {useNewUrlParser:true, useUnifiedTopology:true})
const db = mongoose.connection
db.on('error', (error) => console.log("Database error: " + error))
db.once('open', () => console.log("Database connected!\n "))

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

const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_VOICE_STATES, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_PRESENCES] });

const commands = [
    {
        name:'cn',
        description: 'Set nickname for current voice channel',
        options: [
            {
                name: "nickname",
                description: "The nickname for this channel",
                type: 'STRING',
                required: true
            }
        ]
    },
    {
        name:'cndefault',
        description: 'Set default nickname',
        options: [
            {
                name: "nickname",
                description: "The default nickname for you",
                type: 'STRING',
                required: true
            }
        ]
    },
    {
        name:'cnreset',
        description: 'Reset all your nicknames (PROD)'
    },
    {
        name:'cnhelp',
        description: 'View all commmands for Channel Nickname Bot'
    },
    {
        name:'gank',
        description: 'Moan at someone in particular',
        options: [
            {
                name: "jungler",
                description: "The jungler who did not gank you",
                type: 'USER',
                required: true
            }
        ]
    }
]

client.on('ready', async () => {
    console.log(`Logged in as ${client.user.tag}\n`)

    await client.application?.commands.set(commands)

    client.user.setUsername("Channel Nickname Bot")
    client.user.setStatus("online")
    client.user.setActivity({
        name: "/cnhelp",
        type: "LISTENING" //PLAYING: WATCHING: LISTENING: STREAMING:
    })
})

// Slash Command Interactions
client.on('interactionCreate', async (interaction) => {

    if (!interaction.isCommand()) return;

    const nickname = interaction.options.getString('nickname')
    const member = interaction.member
    const userID = interaction.user.id
    const ownerID = member.guild.ownerId
    const voiceState = member.guild.voiceStates.cache.get(interaction.user.id)

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

                if (voiceState == null){
                    await interaction.reply({ content: "You must be in a voice channel to use this command. ❌", ephemeral: true })
                    return
                }

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

                await interaction.reply({ content: "Nickname Set! :white_check_mark:", ephemeral: true })
            }
            catch (error){
                console.error(error)
                await interaction.reply({ content: "Something went wrong! Oops! Get <@275348412797550595> to have a look.", ephemeral: false })
            }
            break

        case "cnreset":

            const row = new MessageActionRow().addComponents(
                new MessageButton()
                    .setCustomId('resetYes')
                    .setLabel('Yes')
                    .setStyle('SUCCESS'),
                new MessageButton()
                    .setCustomId('resetNo')
                    .setLabel('No')
                    .setStyle('DANGER')
            )

            await interaction.reply( {content: 'Are you sure you want to reset all nicknames?', components: [row], ephemeral: true})
        
            break

        case "cndefault":

            if (nickname == null || nickname == "" || nickname.length < 2 || nickname.length > 32){
                await interaction.reply({ content: "Sorry! Nicknames must be between 2 and 32 characters long. ❌", ephemeral: true })
                return
            }
            else if (ownerID == userID) {
                await interaction.reply({ content: "Sorry! Server owners cannot yet use this bot 😭", ephemeral: true })
                return
            }

            var user = await User.findOne({userID: userID})

            if (user != null){
                user.default = nickname
                await user.save()
            }
            else{
                user = new User({userID: userID, channels: {}, default: nickname})
                await user.save()
            }

            if (voiceState == null) member.setNickname(nickname)

            await interaction.reply({ content: "Default Nickname Set! :white_check_mark:", ephemeral: true })
            break
        case "cnhelp":
            await interaction.reply({ content: "❔ Channel Nickname Bot Help! ❔ \n/cn {nickname}- Set nickname for current voice channel. \n/cndefault {nickname} - Set default nickname for when you are not in a nicknamed channel. \n/cnreset - Reset all stored nicknames for yourself. \n/cnhelp - View this help message.\n\n:tada: Meme Commands :tada:\n/gank {jungler} - Moan at the jungler who didn't gank you!", ephemeral: true })
            break

        case "gank":
            const jungler = interaction.options.get('jungler').value
            await interaction.reply({ content: `:person_facepalming: <@${jungler}> why you no gank <@${userID}> :person_facepalming:`, ephemeral: false })
            break
            
    }
})

// Button Interactions
client.on('interactionCreate', async (interaction) => {
	if (!interaction.isButton()) return;

    const userID = interaction.user.id
    const ownerID = interaction.member.guild.ownerID
	
    switch(interaction.customId){
        case "resetYes":

            await User.deleteMany({userID: userID})
            
            if (userID != ownerID) interaction.member.setNickname("")

            await interaction.update( {content: "All nicknames have been reset! :white_check_mark:", components: [], ephemeral: true})
            break

        case "resetNo":
            await interaction.update( {content: "No nicknames have been reset! ❌", components: [], ephemeral: true})
            break
    }

    
});

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

process.on('SIGTERM', () => {
    client.user.setStatus("invisible")
})