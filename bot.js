if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config()
}

const {Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle} = require("discord.js")
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

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildPresences] });

function logVC(channelID, channelName, userID, userName, nickname){
    console.info(`[INFO] ${userID} (${userName}) joined voice channel ${channelID} (${channelName}) and was assigned nickname '${nickname}'.`)
}

function logCN(channelID, channelName, userID, userName, nickname){
    console.info(`[INFO] ${userID} (${userName}) asssigned nickname '${nickname}' to ${channelID} (${channelName}).`)
}

function logCND(userID, userName, nickname){
    console.info(`[INFO] ${userID} (${userName}) asssigned default nickname '${nickname}'.`)
}

function logCNR(userID, userName){
    console.info(`[INFO] ${userID} (${userName}) reset all nicknames.`)
}

client.on('ready', async () => {
    console.log(`Logged in as ${client.user.tag}\n`)

    client.user.setUsername("Channel Nickname Bot")
    client.user.setStatus("online")
    client.user.setActivity({
        name: "/cnhelp",
        type: "LISTENING" //PLAYING: WATCHING: LISTENING: STREAMING:
    })
})

// Slash Command Interactions
client.on('interactionCreate', async (interaction) => {

    if (!interaction.isChatInputCommand()) return;

    const nickname = interaction.options.getString('nickname')
    const member = interaction.member
    const userID = interaction.user.id
    const userName = interaction.member.user.tag
    const ownerID = member.guild.ownerId
    const voiceState = member.guild.voiceStates.cache.get(interaction.user.id)

    switch(interaction.commandName){
        case "cn":

            if (nickname == null || nickname == "" || nickname.length < 2 || nickname.length > 32){
                await interaction.reply({ content: ":x: Sorry! Nicknames must be between 2 and 32 characters long. :x:", ephemeral: true })
                return
            }
            else if (ownerID == userID) {
                await interaction.reply({ content: ":cry: Sorry! Server owners cannot use this bot :cry:", ephemeral: true })
                return
            }

            try {
                var user = await User.findOne({userID: userID})

                if (voiceState == null){
                    await interaction.reply({ content: ":x: You must be in a voice channel to use this command. :x:", ephemeral: true })
                    return
                }

                const channelID = voiceState.channelId  
                const channelName = voiceState.channel.name          

                if (user != null){
                    user.channels.set(channelID, nickname)
                    await user.save()
                    
                    logCN(channelID, channelName, userID, userName, nickname)
                    member.setNickname(nickname)
                }
                else{
                    var newUser = new User({userID: member.id, channels: {}, default: member.user.username})
                    newUser.channels.set(channelID, nickname)
                    await newUser.save()
                    
                    logCN(channelID, channelName, userID, userName, nickname)
                    member.setNickname(nickname)
                }

                await interaction.reply({ content: ":white_check_mark: Nickname Set! :white_check_mark:", ephemeral: true })
            }
            catch (error){
                console.error(error)
                await interaction.reply({ content: ":x: Something went wrong! Oops! Get <@275348412797550595> to have a look. :x:", ephemeral: false })
            }
            break

        case "cnreset":

            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('resetYes')
                        .setLabel('Yes')
                        .setStyle(ButtonStyle.Success),
                        new ButtonBuilder()
                        .setCustomId('resetNo')
                        .setLabel('No')
                        .setStyle(ButtonStyle.Danger)
                )

            await interaction.reply( {content: 'Are you sure you want to reset all nicknames?', components: [row], ephemeral: true})
        
            break

        case "cndefault":

            if (nickname == null || nickname == "" || nickname.length < 2 || nickname.length > 32){
                await interaction.reply({ content: ":x: Sorry! Nicknames must be between 2 and 32 characters long. :x:", ephemeral: true })
                return
            }
            else if (ownerID == userID) {
                await interaction.reply({ content: ":cry: Sorry! Server owners cannot yet use this bot :cry:", ephemeral: true })
                return
            }

            var user = await User.findOne({userID: userID})

            if (user != null){
                user.default = nickname
                await user.save()
                logCND(userID, userName, nickname)
            }
            else{
                user = new User({userID: userID, channels: {}, default: nickname})
                await user.save()
                logCND(userID, userName, nickname)
            }

            if (voiceState == null) member.setNickname(nickname)

            await interaction.reply({ content: ":white_check_mark: Default Nickname Set! :white_check_mark:", ephemeral: true })
            break
        case "cnhelp":
            await interaction.reply({ content: ":grey_question: Channel Nickname Bot Help! :grey_question: \n/cn {nickname}- Set nickname for current voice channel. \n/cndefault {nickname} - Set default nickname for when you are not in a nicknamed channel. \n/cnreset - Reset all stored nicknames for yourself. \n/cnhelp - View this help message.\n\n:tada: Meme Commands :tada:\n/gank {jungler} - Moan at the jungler who didn't gank you!\n/egirl {daddy} - Moan at dadddy", ephemeral: true })
            break

        case "gank":
            const jungler = interaction.options.get('jungler').value
            await interaction.reply({ content: `:person_facepalming: <@${jungler}> why you no gank <@${userID}> :person_facepalming:`, ephemeral: false })
            break
            
        case "egirl":
            const daddy = interaction.options.get('daddy').value
            await interaction.reply({ content: `✿乂◕‿◕乂 NYA <@${daddy}> SENPAI 乂◕‿◕乂✿`, ephemeral: false })
            break
    }
})

// Button Interactions
client.on('interactionCreate', async (interaction) => {
	if (!interaction.isButton()) return;

    const userID = interaction.user.id
    const userName = interaction.member.user.tag
    const ownerID = interaction.member.guild.ownerID
	
    switch(interaction.customId){
        case "resetYes":

            await User.deleteMany({userID: userID})
            
            if (userID != ownerID) interaction.member.setNickname("")

            logCNR(userID, userName)

            await interaction.update( {content: "Your nicknames have been reset! :white_check_mark:", components: [], ephemeral: true})
            break

        case "resetNo":
            await interaction.update( {content: "Your nicknames have not been reset! :negative_squared_cross_mark:", components: [], ephemeral: true})
            break
    }

    
});

client.on("voiceStateUpdate", async function(oldMember, newMember){

    const userID = newMember.member.id
    const userName = newMember.member.user.tag
    const channelID = newMember.channelId
    const user = await User.findOne({userID: userID})

    if (user != null){
        
        if (channelID == null){
            newMember.member.setNickname(user.default)
            //channelID, channelName, userID, userName, nickname
            logVC("DEFAULT", "DEFAULT", userID, userName, user.default)
            return
        }
        
        const channelName = newMember.channel.name

        if (user.channels.get(channelID) != null){
            newMember.member.setNickname(user.channels.get(channelID))
            logVC(channelID, channelName, userID, userName, user.channels.get(channelID))
        }
        else{
            newMember.member.setNickname(user.default)
            logVC(channelID, channelName, userID, userName, user.default)
        }
    }
});

client.on('warning', (e) => { console.error(e) })
client.on('error', (e) => { console.error(e) })

client.login(process.env.BOT_TOKEN)

process
    .on('SIGTERM', () => client.user.setStatus("invisible"))
    .on('SIGINT', () => client.user.setStatus("invisible"))