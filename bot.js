if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config()
}

const { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, ActivityType } = require("discord.js")
const mongoose = require('mongoose')
const axios = require('axios');


mongoose.connect(process.env.DB_URL)
const db = mongoose.connection
db.on('error', (error) => console.log("[ERROR] Database error: " + error))
db.once('open', () => console.log("[SETUP] Database connected!"))

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
    },
    sorry: {
        type: Number,
        required: false
    }
})

const UserSchema = mongoose.model('User', userSchema)

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildPresences] });

var championData, currentChampion = -1

function setupLOLQuiz() {
    axios.get('https://ddragon.leagueoflegends.com/api/versions.json')
        .then(function (response) {
            var ddVersion = response.data[0]

            axios.get(`http://ddragon.leagueoflegends.com/cdn/${ddVersion}/data/en_US/champion.json`)
                .then(function (response) {
                    responseData = response.data.data
                    var championNames = Object.keys(responseData)
                    var championValues = Object.values(responseData)

                    championData = { championNames, championValues }
                    console.log(`[SETUP] Loaded ${championNames.length} champions from DataDragon!`)
                })
                .catch(function (error) {
                    console.log(`[ERROR] ${error}`)
                });
        })
        .catch(function (error) {
            console.log(`[ERROR] ${error}`)
        })
}

function logVC(channelID, channelName, userID, userName, nickname) {
    console.info(`[INFO] ${userID} (${userName}) joined voice channel ${channelID} (${channelName}) and was assigned nickname '${nickname}'.`)
}

function logCN(channelID, channelName, userID, userName, nickname) {
    console.info(`[INFO] ${userID} (${userName}) asssigned nickname '${nickname}' to ${channelID} (${channelName}).`)
}

function logCND(userID, userName, nickname) {
    console.info(`[INFO] ${userID} (${userName}) asssigned default nickname '${nickname}'.`)
}

function logCNR(userID, userName) {
    console.info(`[INFO] ${userID} (${userName}) reset all nicknames.`)
}

client.on('ready', async () => {
    console.log(`[SETUP] Logged in as ${client.user.tag}`)
    setupLOLQuiz()

    client.user.setUsername("Channel Nickname Bot")
    client.user.setStatus("online")
    client.user.setActivity('/cnhelp', { type: ActivityType.Listening });
})

// Slash Command Interactions
client.on('interactionCreate', async (interaction) => {

    if (!interaction.isChatInputCommand()) return;

    const nickname = interaction.options.getString('nickname')
    const member = interaction.member
    const userID = interaction.user.id
    const userName = interaction.member.user.tag
    const ownerID = member.guild.ownerId
    const voiceState = member.guild.voiceStates.cache.get(userID)

    switch (interaction.commandName) {
        case "nickname":

            if (nickname == null || nickname == "" || nickname.length < 2 || nickname.length > 32) {
                await interaction.reply({ content: ":x: Sorry! Nicknames must be between 2 and 32 characters long. :x:", ephemeral: true })
                return
            }
            else if (ownerID == userID) {
                await interaction.reply({ content: ":cry: Sorry! Server owners cannot use this bot :cry:", ephemeral: true })
                return
            }

            try {
                var user = await UserSchema.findOne({ userID: userID })

                if (voiceState == null || voiceState.channelId == null) {
                    await interaction.reply({ content: ":x: You must be in a voice channel to use this command. :x:", ephemeral: true })
                    return
                }

                const channelID = voiceState.channelId
                const channelName = voiceState.channel.name

                if (user != null) {
                    user.channels.set(channelID, nickname)
                    await user.save()

                    logCN(channelID, channelName, userID, userName, nickname)
                    member.setNickname(nickname)
                }
                else {
                    var newUser = new UserSchema({ userID: member.id, channels: {}, default: member.user.username })
                    newUser.channels.set(channelID, nickname)
                    await newUser.save()

                    logCN(channelID, channelName, userID, userName, nickname)
                    member.setNickname(nickname)
                }

                await interaction.reply({ content: ":white_check_mark: Nickname Set! :white_check_mark:", ephemeral: true })
            }
            catch (error) {
                console.error(error)
                await interaction.reply({ content: ":x: Something went wrong! Oops! Get <@275348412797550595> to have a look. :x:", ephemeral: false })
            }
            break

        case "reset":

            const resetRow = new ActionRowBuilder()
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

            await interaction.reply({ content: 'Are you sure you want to reset all nicknames?', components: [resetRow], ephemeral: true })

            break

        case "default":

            if (nickname == null || nickname == "" || nickname.length < 2 || nickname.length > 32) {
                await interaction.reply({ content: ":x: Sorry! Nicknames must be between 2 and 32 characters long. :x:", ephemeral: true })
                return
            }
            else if (ownerID == userID) {
                await interaction.reply({ content: ":cry: Sorry! Server owners cannot yet use this bot :cry:", ephemeral: true })
                return
            }

            var user = await UserSchema.findOne({ userID: userID })

            if (user != null) {
                user.default = nickname
                await user.save()
                logCND(userID, userName, nickname)
            }
            else {
                user = new UserSchema({ userID: userID, channels: {}, default: nickname })
                await user.save()
                logCND(userID, userName, nickname)
            }

            if (voiceState == null) member.setNickname(nickname)

            await interaction.reply({ content: ":white_check_mark: Default Nickname Set! :white_check_mark:", ephemeral: true })
            break
        case "help":
            await interaction.reply({ content: ":grey_question: Channel Nickname Bot Help! :grey_question: \n/nickname {nickname}- Set nickname for current voice channel. \n/default {nickname} - Set default nickname for when you are not in a nicknamed channel. \n/reset - Reset all stored nicknames for yourself. \n/help - View this help message.\n\n:tada: Meme Commands :tada:\n/gank {jungler} - Moan at the jungler who didn't gank you! \n/sorry {user} - Add to a user's sorry counter \n/lolquiz - Try your hand at the LoL Champion quiz! ", ephemeral: true })
            break

        case "gank":
            const jungler = interaction.options.get('jungler').value
            await interaction.reply({ content: `:person_facepalming: <@${jungler}> why you no gank <@${userID}> :person_facepalming:`, ephemeral: false })
            break

        case "lolquiz":
            if (currentChampion == -1) {

                const number = Math.floor(Math.random() * championData.championNames.length)
                currentChampion = number

                const quizRow = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('quizGuess')
                            .setLabel('Guess')
                            .setStyle(ButtonStyle.Success),
                        new ButtonBuilder()
                            .setCustomId('quizGiveUp')
                            .setLabel('Give Up')
                            .setStyle(ButtonStyle.Danger)
                    )

                const blurb = championData.championValues[number].blurb
                const quizText = `:clipboard: League of Legends Champion Quiz :clipboard: \n\nChampion Tags: ||${championData.championValues[number].tags}||\nResource Type: ||${championData.championValues[number].partype}||\nBlurb: ||${blurb.replace(championData.championNames[number], "REDACTED")}||\nTitle: ||${championData.championValues[number].title}||\n\nTake your guess by clicking below!`

                await interaction.reply({ content: `${quizText}`, components: [quizRow] })
            }
            else {
                await interaction.reply({ content: ":x: A quiz is already running! Please complete prior quiz before starting a new one! :x:", ephemeral: true })
            }
            break

        case "sorry":
            var sorryUser = interaction.options.getUser('user').id
            var user = await UserSchema.findOne({ userID: sorryUser })
            
            var sorryCount = user.sorry
            if (sorryCount === undefined){
                sorryCount = 1
            } else {
                sorryCount += 1
            }
            user.sorry = sorryCount
            await user.save();

            interaction.reply(`<@${sorryUser}> has now said sorry ${sorryCount} times! Tut tut`)
    }
})

// Button Interactions
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton() && !interaction.isModalSubmit()) return;

    const userID = interaction.user.id
    const userName = interaction.member.user.tag
    const ownerID = interaction.member.guild.ownerID
    const channelID = interaction.channelId

    switch (interaction.customId) {
        case "resetYes":

            await UserSchema.deleteMany({ userID: userID })

            if (userID != ownerID) interaction.member.setNickname("")

            logCNR(userID, userName)

            await interaction.update({ content: "Your nicknames have been reset! :white_check_mark:", components: [], ephemeral: true })
            break

        case "resetNo":
            await interaction.update({ content: "Your nicknames have not been reset! :negative_squared_cross_mark:", components: [], ephemeral: true })
            break

        case "quizGuess":
            const modal = new ModalBuilder()
                .setCustomId('quizModal')
                .setTitle("Make your guess!")

            const guessInput = new TextInputBuilder()
                .setCustomId('guessInput')
                .setLabel("Guess")
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
                .setValue("")

            const row = new ActionRowBuilder().addComponents(guessInput);
            modal.addComponents(row)

            await interaction.showModal(modal);
            break

        case "quizGiveUp":
            await interaction.update({ content: `:x: You gave up :x:\n\nThe answer was... ***${championData.championNames[currentChampion]}***`, components: [] })
            currentChampion = -1;
            break

        case "quizModal":
            const guess = interaction.fields.getTextInputValue("guessInput");

            if (guess.toLowerCase() == championData.championNames[currentChampion].toLowerCase()) {
                await interaction.update({content: `This quiz is over! See answer below :arrow_down:`, components: []})
                
                const channel = client.channels.cache.get(channelID)
                channel.send(`:white_check_mark: You got it right! :white_check_mark:\n\n The answer was... ***${championData.championNames[currentChampion]}***`)
                currentChampion = -1;
            }
            else {
                await interaction.reply({ content: `:x: ${guess} is not correct... :x:`})
            }
            break
    }


});

client.on("voiceStateUpdate", async function (oldMember, newMember) {

    const member = newMember.member
    const userID = member.id
    const ownerID = member.guild.ownerId
    const userName = member.user.tag
    const channelID = newMember.channelId
    const channelName = channelID != null ? newMember.channel.name : "Not in Channel"
    const user = await UserSchema.findOne({ userID: userID })

    if (userID == ownerID){
        console.log(`[INFO] ${userID} (${userName}) joined voice channel ${channelID} (${channelName}) and was not assigned a nickname due to being the server owner.`)
        return
    }

    if (user != null) {

        if (channelID == null) {
            member.setNickname(user.default)
            //channelID, channelName, userID, userName, nickname
            logVC("DEFAULT", "DEFAULT", userID, userName, user.default)
            return
        }

        if (user.channels.get(channelID) != null) {
            member.setNickname(user.channels.get(channelID))
            logVC(channelID, channelName, userID, userName, user.channels.get(channelID))
        }
        else {
            member.setNickname(user.default)
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