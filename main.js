const Discord = require('discord.js');
const Config = require(__dirname+'/config.json');
let ent = require("entities");
const Helper = require(__dirname+"/util/Helper.js");

let bot = new Discord.Client({
	autoReconnect: true,
	maxCachedMessages: 1000,
	bot: true
});

const giveawayValues = {
	guild_id: "172382467385196544",         // Guild to post it to
	channel_id: "200987890396823552",       // Channel to post it to
	emoji: "gift",                          // Leave this alone pls
	raw_emoji: ent.decodeHTML("&#x1F381;"), // Leave this alone pls
	new_topic: "Current Giveaway: {GAME}",  // Topic format
	timeout: 300000,                        // Giveaway length in milliseconds
	gtimeout: 120000                        // Claim Prize length in milliseconds
}

// No! don't touch that!
let tempGiveaway = {
	started: false,
	message_id: "",
	game: "",
	host: "",
	current_user: "",
	users: [],
	count: 0,
	timeout: null
}

// HANDLERS
bot.on('error', (error) => {
	console.log("Err! in discord.js: ", error.stack);
});

bot.on('reconnecting', () => {
	console.log("Reconnecting to discord servers...");
});

bot.on('disconnect', () => {
	console.log("Disconnected from Discord.");
});

bot.on('messageReactionAdd', (emoji, user) => {
	if(tempGiveaway.started && user.id != bot.user.id && emoji.message.id === tempGiveaway.message_id && emoji.emoji.name === giveawayValues.raw_emoji){
		if(!tempGiveaway.users.includes(user.id)){
			tempGiveaway.users.push(user.id);
			tempGiveaway.count = tempGiveaway.users.length;
			user.sendMessage(`You have opted in for the ${tempGiveaway.game} giveaway!`);
		}
	}
});

bot.on('messageReactionRemove', (emoji, user) => {
	console.log(emoji)
	if(tempGiveaway.started && user.id != bot.user.id && emoji.message.id === tempGiveaway.message_id && emoji.emoji.name === giveawayValues.raw_emoji){
		if(tempGiveaway.users.includes(user.id)){
			tempGiveaway.users.splice(tempGiveaway.users.indexOf(user.id), 1);
			user.sendMessage(`You have opted out for the ${tempGiveaway.game} giveaway!`);
		}
	}
});

bot.setInterval(()=>{
	if(tempGiveaway.started && tempGiveaway.current_user === ""){
		bot.guilds.get(giveawayValues.guild_id).channels.get(giveawayValues.channel_id).messages.get(tempGiveaway.message_id).edit(`@here\n**New Giveaway:** ${tempGiveaway.game}\n**Host:** <@${tempGiveaway.host}>\n**Entrees:** ${tempGiveaway.count}\n**Chance of winning:** ${100/tempGiveaway.count}%\n**Giveaway ends in 5 minutes.**\n\nClick the ${giveawayValues.raw_emoji} reaction or PM ${bot.user} \`join\` to join the giveaway or \`leave\` to leave it.`);
	}
}, 2000)

process.on('SIGINT', ()=>{
	bot.destroy();
	process.exit(0);
});

let switchUser = function(){
	if(tempGiveaway.started){
		bot.users.get(tempGiveaway.current_user).sendMessage(`You failed to claim the prize.`);
		bot.guilds.get(giveawayValues.guild_id).channels.get(giveawayValues.channel_id).messages.get(tempGiveaway.message_id).clearReactions();
		tempGiveaway.current_user = tempGiveaway.users[Math.floor(Math.random() * tempGiveaway.users.length)];
		tempGiveaway.users = tempGiveaway.users.filter(f => f !== tempGiveaway.current_user);
		bot.fetchUser(tempGiveaway.current_user).then(u => {
			bot.users.get(tempGiveaway.current_user).sendMessage(`To claim the prize ${tempGiveaway.game}, please type \`claim\` in this chat. (Case sensitive!). You have 2 minutes.`);
			bot.guilds.get(giveawayValues.guild_id).channels.get(giveawayValues.channel_id).messages.get(tempGiveaway.message_id).edit(`@here\n**Giveaway:** ${tempGiveaway.game}\n**Host:** <@${tempGiveaway.host}>\n**Entrees:** ${tempGiveaway.count}\n**Chance of winning:** ${100/tempGiveaway.count}%\n\n***Giveaway is over.***\n<@${tempGiveaway.current_user}> has 2 minutes to claim the prize.`);
			bot.setTimeout(switchUser, giveawayValues.gtimeout)
		}).catch(() => {
			bot.guilds.get(giveawayValues.guild_id).channels.get(giveawayValues.channel_id).messages.get(tempGiveaway.message_id).edit(`@here\n**Giveaway:** ${tempGiveaway.game}\n**Host:** <@${tempGiveaway.host}>\n**Entrees:** ${tempGiveaway.count}\n**Chance of winning:** ${100/tempGiveaway.count}%\n\nNo one claimed the prize.`);
			tempGiveaway.started = false;
			tempGiveaway.message_id = "";
			tempGiveaway.game = "";
			tempGiveaway.host = "";
			tempGiveaway.current_user = "";
			tempGiveaway.users = [];
			tempGiveaway.count = 0;
			bot.guilds.get(giveawayValues.guild_id).channels.get(giveawayValues.channel_id).setTopic(giveawayValues.new_topic.replace("{GAME}", "None"));
		});
	}
}

bot.login(Config.token).then(() => {
	console.log("Logged in");
	bot.user.setStatus('dnd');
	bot.user.setGame('@here');
}).catch((e) => {throw e;});

bot.on("ready", function(){
	console.log('Connected to Discord.');
});

bot.on("message", (message)=>{
	if(message.author.bot){return;}
	//if(message.channel.type !== "text" && message.content != "claim"  &&message.author.id !== Config.owner){message.reply("You can't use commands in Private Messages."); return;}
	if(message.content.startsWith(`dmod.eval`) && message.author.id == Config.owner){
		let evalstring = message.content.substr("dmod.eval ".length);
		try{
			let start = new Date().getTime();
			let msg = "```js\n"+eval(evalstring)+"```";

			let end = new Date().getTime();
			let time = end - start;

			message.channel.sendMessage("Time taken: "+(time/1000)+" seconds\n"+msg);
		}catch(e){
			message.channel.sendMessage("```js\n"+e+"```");
		}
	}
	if(message.content.startsWith(`dmod.stopgiveaway`) && tempGiveaway.host === message.author.id){
		tempGiveaway.started = false;
		bot.clearTimeout(tempGiveaway.timeout);
		bot.guilds.get(giveawayValues.guild_id).channels.get(giveawayValues.channel_id).messages.get(tempGiveaway.message_id).clearReactions();
		bot.guilds.get(giveawayValues.guild_id).channels.get(giveawayValues.channel_id).messages.get(tempGiveaway.message_id).edit(`@here\n**Giveaway:** ${tempGiveaway.game}\n**Host:** <@${tempGiveaway.host}>\n**Entrees:** ${tempGiveaway.count}\n**Chance of winning:** ${100/tempGiveaway.count}%\n\nHost has stopped the giveaway.`);
		tempGiveaway.message_id = "";
		tempGiveaway.game = "";
		tempGiveaway.host = "";
		tempGiveaway.current_user = "";
		tempGiveaway.users = [];
		tempGiveaway.count = 0;
		message.channel.sendMessage('Stopped giveaway.');
	}
	if(message.content.startsWith(`dmod.giveaway `) && Helper.checkPerm(message.author, message.guild)){
		if(!tempGiveaway.started){
			let game = message.content.substr("dmod.giveaway ".length);
			message.channel.sendMessage('Setting up giveaway...');
			tempGiveaway.game = game;
			tempGiveaway.host = message.author.id;
			tempGiveaway.count = 0;
			tempGiveaway.users = [];
			bot.guilds.get(giveawayValues.guild_id).channels.get(giveawayValues.channel_id).setTopic(giveawayValues.new_topic.replace("{GAME}", game))
			message.guild.channels.get(giveawayValues.channel_id).sendMessage(`@here\n**New Giveaway:** ${tempGiveaway.game}\n**Host:** <@${tempGiveaway.host}>\n**Entrees:** 0\n**Chance of winning:** Infinity%\n**Giveaway ends in 5 minutes.**\n\nClick the ${giveawayValues.raw_emoji} reaction or PM ${bot.user} \`join\` to join the giveaway or \`leave\` to leave it.`).then(m => {
				tempGiveaway.message_id = m.id;
				m.react(giveawayValues.raw_emoji);
				tempGiveaway.started = true;
				tempGiveaway.timeout = bot.setTimeout(() => {
					bot.guilds.get(giveawayValues.guild_id).channels.get(giveawayValues.channel_id).messages.get(tempGiveaway.message_id).clearReactions();
					tempGiveaway.current_user = tempGiveaway.users[Math.floor(Math.random() * tempGiveaway.users.length)];
					tempGiveaway.users = tempGiveaway.users.filter(f => f !== tempGiveaway.current_user);
					bot.fetchUser(tempGiveaway.current_user).then(u => {
						u.sendMessage(`To claim the prize ${tempGiveaway.game}, please type \`claim\` in this chat. (Case sensitive!)`);
						bot.guilds.get(giveawayValues.guild_id).channels.get(giveawayValues.channel_id).messages.get(tempGiveaway.message_id).edit(`@here\n**Giveaway:** ${tempGiveaway.game}\n**Host:** <@${tempGiveaway.host}>\n**Entrees:** ${tempGiveaway.count}\n**Chance of winning:** ${100/tempGiveaway.count}%\n\n***Giveaway is over.***\n<@${tempGiveaway.current_user}> has 2 minutes to claim the prize.`);
						bot.setTimeout(switchUser, giveawayValues.gtimeout)
					}).catch(() => {
						bot.guilds.get(giveawayValues.guild_id).channels.get(giveawayValues.channel_id).messages.get(tempGiveaway.message_id).edit(`@here\n**Giveaway:** ${tempGiveaway.game}\n**Host:** <@${tempGiveaway.host}>\n**Entrees:** ${tempGiveaway.count}\n**Chance of winning:** ${100/tempGiveaway.count}%\n\nNo one claimed the prize.`);
						tempGiveaway.started = false;
						tempGiveaway.message_id = "";
						tempGiveaway.game = "";
						tempGiveaway.host = "";
						tempGiveaway.current_user = "";
						tempGiveaway.users = [];
						tempGiveaway.count = 0;
						bot.guilds.get(giveawayValues.guild_id).channels.get(giveawayValues.channel_id).setTopic(giveawayValues.new_topic.replace("{GAME}", "None"));
					});
				}, giveawayValues.timeout)
			});
		}else{
			message.reply("Giveaway already active.");
		}
	}
	if(tempGiveaway.started && message.content == "claim" && tempGiveaway.current_user === message.author.id){
		message.reply("You have been successfully claimed for the game "+tempGiveaway.game+", the host <@"+tempGiveaway.host+"> will be with you shortly.");
		bot.users.get(tempGiveaway.host).sendMessage(`${message.author} successfully accepted the giveaway prize.`)
		bot.guilds.get(giveawayValues.guild_id).channels.get(giveawayValues.channel_id).messages.get(tempGiveaway.message_id).edit(`@here\n**Giveaway:** ${tempGiveaway.game}\n**Host:** <@${tempGiveaway.host}>\n**Entrees:** ${tempGiveaway.count}\n**Chance of winning:** ${100/tempGiveaway.count}%\n\n<@${message.author.id}> has claimed the prize.`);
		tempGiveaway.started = false;
		tempGiveaway.message_id = "";
		tempGiveaway.game = "";
		tempGiveaway.host = "";
		tempGiveaway.current_user = "";
		tempGiveaway.users = [];
		tempGiveaway.count = 0;
		bot.guilds.get(giveawayValues.guild_id).channels.get(giveawayValues.channel_id).setTopic(giveawayValues.new_topic.replace("{GAME}", "None"));
	}
	if(tempGiveaway.started && message.content == "join"){
		if(!tempGiveaway.users.includes(message.author.id)){
			tempGiveaway.users.push(message.author.id);
			tempGiveaway.count = tempGiveaway.users.length;
			message.channel.sendMessage(`You have opted in for the ${tempGiveaway.game} giveaway!`);
		}else{
			message.channel.sendMessage(`You already opted in!`);
		}
	}
	if(tempGiveaway.started && message.content == "leave"){
		if(tempGiveaway.users.includes(message.author.id)){
			tempGiveaway.users.splice(tempGiveaway.users.indexOf(message.author.id), 1);
			tempGiveaway.count = tempGiveaway.users.length;
			message.author.sendMessage(`You have opted out for the ${tempGiveaway.game} giveaway!`);
		}else{
			message.channel.sendMessage(`You aren't in the giveaway!`);
		}
	}
})