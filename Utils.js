const { Client } = require("discord.js");
// Función para editar el embed //
async function editarEmbed(message, data, embed) {
	let channel = message.guild.channels.cache.get(data.ChannelId);
	if (!channel) return;
	let msg = await channel.messages.fetch(data.MessageId);
	msg.edit({
		embeds: [embed],
		components: [],
	}).catch((e) => {});
};
// Función para fetchear los sorteos //
async function fetchModel(client, sorteos, messageId) {
	let sorteo = sorteos.find((s) => s.MessageId === messageId);
	if (!sorteo) return;
	/* Guild */
	let guild = client.guilds.cache.get(sorteo.GuildId);
	if (!guild) {
		guild = await client.guilds.fetch(
			sorteo.GuildId
		).catch((e) => {});
	}
	/* Channel */
	let channel = guild?.channels.cache.get(sorteo.ChannelId) ||
	(await guild.channels.fetch(sorteo.ChannelId).catch((e) => {}));
	/* Message */
	let message = channel?.messages.cache.get(sorteo.MessageId) ||
	(await channel?.messages.fetch(sorteo.MessageId).catch((e) => {}));
	
	// let obj = {};
	// if (message && channel && guild) {
	//   obj["message"] = message;
	//   obj["channel"] = channel;
	//   obj["guild"] = guild;
	// } else {
	//   obj["message"] = {};
	//   obj["channel"] = {};
	//   obj["guild"] = {};
	// }
	// return obj;
	return {
		guild,
		channel,
		message,
	};
};
module.exports = { editarEmbed, fetchModel };