const { Client, Events, GatewayIntentBits } = require('discord.js');
const {addTimeEntries} = require('./timeEntries.js')
const config = require("./config.json")

const logRegex = /(\d{1,2})\:(\d{1,2}) *\- *(\d{1,2})\:(\d{1,2}) *(\w+) *(.*)/gm
const singleLogRegex = /(?<sHour>\d{1,2})\:(?<sMin>\d{1,2}) *\- *(?<eHour>\d{1,2})\:(?<eMin>\d{1,2}) *(?<type>\w+) *(?<description>.*)/
const dateRegex = /(\d+) *[\-\/] *(\d+) *[\-\/] *(\d+)/


const client = new Client({
    intents: [GatewayIntentBits.DirectMessages, GatewayIntentBits.MessageContent]
});

client.once(Events.ClientReady, async readyClient => {
	console.log(`Ready! Logged in as ${readyClient.user.tag}`);

    // Bot doesn't detect DM messages without this line :(
    const user = await readyClient.users.fetch(config.discordUserId)
    user.createDM()
});

client.on(Events.MessageCreate, async message => {
    // Only accept logs from user
    if (message.author.id !== config.discordUserId) return
    if (!logRegex.test(message.content)) return

    const logs = []
    let lines = message.content.split(/\n/)
    let date = new Date()

    // first line is date
    if (lines.length && dateRegex.test(lines[0].trim())) {
        const dateStr = lines.shift()
        const match = dateStr.match(dateRegex)
        if (match?.length) {
            date.setDate(parseInt(match[1]))
            date.setMonth(parseInt(match[2] - 1))
            date.setFullYear(parseInt(match[3]))
        }
    }

    lines.map(l => l.trim()).forEach(line => {
        const match = line.match(singleLogRegex)
        if (!match?.groups) return
        
        // Capitalise first letter of description
        let description = match.groups.description.trim().toLowerCase()
        if (description.length) {
            description = description.charAt(0).toUpperCase() + description.slice(1)
        }
        let project = undefined
        if (Object.keys(config.projectCodes).includes(match.groups.type.toLowerCase())) {
            project = config.projectCodes[match.groups.type.toLowerCase()]
        }
        logs.push({ startHour: match.groups.sHour, startMinute: match.groups.sMin, endHour: match.groups.eHour, endMinute: match.groups.eMin, project, description },)
    })
    
    const error = await addTimeEntries(logs, date)
    if (error) {
        message.reply(`Error: ${error}`)    
    } else {
        message.reply('Time entries added successfully!')
    }
})

// Log in to Discord
client.login(config.discordToken);