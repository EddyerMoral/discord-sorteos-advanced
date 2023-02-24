const { Client, ActionRowBuilder, EmbedBuilder, CommandInteraction, ButtonBuilder, ButtonStyle, } = require("discord.js");
const { EventEmitter } = require("node:events");
const Model = require("./Model");
const { editarEmbed, fetchModel } = require("./Utils");
const { Giveaway } = require("./Giveaway.js");
class SorteoManager extends EventEmitter {
	constructor(client, options) {
		super();
		this.client = client;
		// Opciones
		this.EmbedColor = options.Embed.Color;
		this.EmbedColorEnd = options.Embed.ColorEnd;
		this.EmbedTitle = options.Embed.Title || '¡Sorteo Iniciado!';
		this.EmbedTitleEnd = options.Embed.TitleEnd || '¡Sorteo Finalizado!';
		this.EmbedImage = options.Embed.Image || 'https://media.discordapp.net/attachments/1067640383141589083/1078442321256919160/Picsart_23-02-23_16-08-46-709.jpg';
		this.EmbedImageEnd = options.Embed.ImageEnd || 'https://media.discordapp.net/attachments/1067640383141589083/1078442335010041917/Picsart_23-02-23_16-09-50-522.jpg';
		// Opciones
		this.EmbedEmojiPrize = options.Embed.EmojiPrize || '';
		this.EmbedEmojiTime = options.Embed.EmojiTime || '';
		this.EmbedEmojiWinners = options.Embed.EmojiWinners || '';
		this.EmbedEmojiHostedBy = options.Embed.EmojiHostedBy || '';
		// Opciones 
		this.BotonTexto = options.Boton.Texto || "Participar";
		this.BotonEmoji = options.Boton.Emoji || "🎉";
		// Adicionales 
		this.sorteos = [];
		this.sorteo = null;
		// Adicionales (Importantes)
		this.client.on("ready", async () => {
			await this.getSorteos().then(() => {
				this.SorteoReady().then(() => {
					this.emit("SorteoReady", `[Sorteos | Manager]`);
				});
			});
		});
		this.client.on("interactionCreate", async (interaction) => {
			await this.BotonInteraction(interaction);
		});
	}
	// Sorteos Ready
	async SorteoReady() {
	    process.setMaxListeners(0);
	    await this.client.guilds.fetch();
	    setInterval(() => {
			this.client.guilds.cache.forEach(async (guild) => {
				if (!guild) return;
				const db = this.sorteos.filter((s) => s.GuildId === guild.id);
				if (!db) return;
				db.map(async (data) => {
					if (!data) return;
					const { message } = await fetchModel(
						this.client,
						this.sorteos,
						data.MessageId
					);
					if (!message) return;
					this.sorteo = new Giveaway(this, {
						MessageId: data.MessageId,
                        ChannelId: data.ChannelId,
						GuildId: data.GuildId,
						Prize: data.Prize,
						Started: data.Started,
						Entry: data.Entry,
						Entered: data.Entered,
						WinCount: data.WinCount,
						EndTime: data.endTime,
						HostedBy: data.HostedBy,
						Ended: data.Ended,
						Message: message,
					});
					if (!data.Ended) {
						await this.checkGanador(message);
					}
				});
			});
		}, 5000);
	}
	// checkGanador
	async checkGanador(message) {
		if (!message) return;
		const data = this.sorteos.find(
		(s) => s.MessageId === message.id && s.Ended === false
		);
		if (!data) return;
		if (data.EndTime && Number(data.EndTime) < Date.now()) {
			let winner = await this.getGanador(data.MessageId);
			return winner;
    	}
	}
	// GetGanador
	async getGanador(messageID) {
	    let data = await Model.findOne({ MessageId: messageID });
	    if (!data) return;
	    const { message } = await fetchModel(this.client, this.sorteos, messageID);
	    const winArr = [];
	    const winCt = data.WinCount;
	    const entries = data.Entry;
	    for (let i = 0; i < winCt; i++) {
	    	const winno = Math.floor(Math.random() * data.Entered);
	    	if (!winArr.includes(entries[winno])) winArr.push(entries[winno]);
	    }
	    data.Winners = winArr;
	    if (!data) return await message.delete();
	    data.Ended = true;
	    await data.save().then(async () => {
	    	await this.getSorteos();
	    });
	    if (data.Entered <= 0 || !winArr[0]) {
	    	this.emit("SorteoNoWinner", message, data);
	    	let embed = this.SorteoEndNoWinnerEmbed(data);
	    	await editarEmbed(message, data, embed);
	    } else {
	    	this.emit("SorteoWinner", message, data);
	    	let embed = this.SorteoEndWinnerEmbed(data);
	    	await editarEmbed(message, data, embed);
	    }
	}
	// BotonInteraction
	async BotonInteraction(interaction) {
		if (interaction.isButton()) {
			const { member } = interaction;
			if (member.user.bot) return;
			switch (interaction.customId) {
				case "Enter-Sorteo-File": {
				/*await interaction?.deferUpdate().catch((e) => {});*/
				const data = await Model.findOne({
					MessageId: interaction.message.id,
				});
				if (!data) return;
				function UpdateEntry(entry) {
					let embeds = interaction.message.embeds[0];
					interaction.message.edit({
						embeds: [
							EmbedBuilder.from(embeds).setFooter({
								text: `${entry} | Usuario(s) se unieron.`,
							}),
						],
					});
				}
				if (Number(data?.EndTime) < Date.now()) {
					this.emit("SorteoInvalid", member, data, interaction);
				} else {
					const entris = data.Entry?.find(
						(id) => id.userID === interaction.member.id
					);
					if (entris) {
						await Model.findOneAndUpdate({
							MessageId: interaction.message.id,
						},{
							$pull: {
                                Entry: { 
									userID: interaction.member.id 
								} 
							},
						});
						data.Entered = data.Entered - 1;
						await data.save().then(async (a) => {
							await UpdateEntry(data.Entered);
							await this.getSorteos();
							this.emit("SorteoLeftUser", member, data, interaction);
						});
					} else if (!entris) {
						data.Entry.push({
							userID: interaction.member.id,
							guildID: interaction.guild.id,
							messageID: interaction.message.id,
						});
						data.Entered = data.Entered + 1;
						await data.save().then(async (a) => {
							await UpdateEntry(data.Entered);
							await this.getSorteos();
							this.emit("SorteoJoinUser", member, data, interaction);
						});
					}
				}
			}
			break;
			default:
			break;
			}
		}
	}
	// Start
	async start(channel, interaction, options) {
		return new Promise(async (resolve, reject) => {
			if (!channel?.id || !channel.isTextBased()) {
                return reject(`[ Sorteos | Manager ] = El canal proporcionado no es de texto o esta basado en texto. (val=${channel})`);
            }
            if (channel.isThread() && !channel.sendable) {
                return reject(
                    `[ Sorteos | Manager ] = El canal proporcionado es tipo hilo y no pueden ser enviado mensajes. (id=${channel.id})`
                );
            }
            if (typeof options.premio !== 'string' || (options.premio = options.premio.trim()).length > 256) {
                return reject(`[ Sorteos | Manager ] = El premio específicado no es una cadena o tiene más de 256 caracteres. (val=${options.premio})`);
            }
            if (!Number.isInteger(options.ganadores) || options.ganadores < 1) {
                return reject(`[ Sorteos | Manager ] = El numero de ganadores, debe de ser un número enteró. (val=${options.ganadores})`);
            }
            if (!options.isDrop && (!Number.isFinite(options.duracion) || options.duracion < 1)) {
                return reject(`[ Sorteos | Manager ] = La duración del sorteo no es un número positivo. (val=${options.duracion})`);
            }
			const timeStart = Date.now();
			const endTime = Date.now() + options.duracion;
			const Button = new ButtonBuilder()
			.setCustomId("Enter-Sorteo-File")
			.setStyle(ButtonStyle.Secondary)
			.setEmoji(this.BotonEmoji)
			.setLabel(this.BotonTexto);
			const Row = new ActionRowBuilder()
			.addComponents([Button]);
			let SorteoEmbed = this.SorteoStartEmbed({
				Prize: options.premio,
				EndTime: endTime,
				HostedBy: interaction.member.id,
				WinCount: options.ganadores,
				Started: timeStart,
				Entered: 0,
			});
			let sendOptions = {
				embeds: [SorteoEmbed],
				components: [Row],
			};
			let message = await channel.send(sendOptions).catch((e) => reject(e));
			let sorteoData = {
				MessageId: message.id,
		        ChannelId: channel.id,
		        GuildId: interaction.guild.id,
		        Prize: options.premio,
		        Started: timeStart,
		        Entry: [],
		        Entered: 0,
		        WinCount: options.ganadores,
		        EndTime: endTime,
		        HostedBy: interaction.member.id,
		        Ended: false,
		        Winners: [],
			};
			let data = await this.guardarSorteo(message.id, sorteoData);
			this.sorteo = new Giveaway(this, { 
				...data, 
				Message: message 
			});
			this.emit("SorteoStarted", message, data);
			await this.getSorteos();
			await this.checkGanador(message);
		})
	}
	// Generar Embed Start
	SorteoStartEmbed(giveaway) {
		const GiveawayEmbed = new EmbedBuilder()
		.setColor(this.EmbedColor)
		.setTitle(this.EmbedTitle)
		.setDescription(`> Haga clic en el botón ${this.BotonTexto} para participar en el sorteo.`)
		.setFooter({
			text: `0 | Usuario(s) se unieron`,
		})
		.addFields([{
			name: `${this.EmbedEmojiPrize} **|** Premio:`,
			value: `> \`${giveaway.Prize}\``,
			inline: true,
		},{
			name: `${this.EmbedEmojiTime} **|** Termina en:`,
			value: `> <t:${Math.floor(giveaway.EndTime / 1000)}:R>`,
			inline: true,
		},{
			name: `${this.EmbedEmojiWinners} **|** Ganadores:`,
			value: `> \`${giveaway.WinCount}\``,
			inline: true,
        },{
        	name: `${this.EmbedEmojiHostedBy} **|** Iniciado por:`,
        	value: `> <@${giveaway.HostedBy}>`,
        	inline: true,
        }])
        .setImage(this.EmbedImage);
        return GiveawayEmbed;
	}
	// Embed Sorteo Finish No Winner
	SorteoEndNoWinnerEmbed(giveaway) {
		const GiveawayEmbed = new EmbedBuilder()
		.setColor(this.EmbedColorEnd)
		.setTitle(this.EmbedTitleEnd)
		.setDescription(`> Sorteo finalizado | no hay participantes válidos para el sorteo.`)
		.setFooter({
			text: `${giveaway.Entered} | Usuario(s) se unieron`,
		})
		.addFields([{
			name: `${this.EmbedEmojiTime} **|** Termino:`,
			value: `> <t:${Math.floor(Date.now() / 1000)}:R>`,
			inline: true,
		},{
			name: `${this.EmbedEmojiWinners} **|** Ganadores:`,
			value: `> \`Ningún ganador\``,
			inline: true,
        },{
        	name: `${this.EmbedEmojiHostedBy} **|** Iniciado por:`,
        	value: `> <@${giveaway.HostedBy}>`,
        	inline: true,
        }])
        .setImage(this.EmbedImageEnd);
        return GiveawayEmbed;
	}
	// Embed Sorteo Finish Winner 
	SorteoEndWinnerEmbed(giveaway) {
		const GiveawayEmbed = new EmbedBuilder()
		.setColor(this.EmbedColorEnd)
		.setTitle(this.EmbedTitleEnd)
		.setDescription(`> Sorteo finalizado | felicitaciones a los ganadores.`)
		.setFooter({
			text: `${giveaway.Entered} | Usuario(s) se unieron`,
		})
		.addFields([{
			name: `${this.EmbedEmojiTime} **|** Termino:`,
			value: `> <t:${Math.floor(Date.now() / 1000)}:R>`,
			inline: true,
		},{
			name: `${this.EmbedEmojiWinners} **|** Ganadores:`,
			value: `> Felicidades, ${giveaway.Winners
          .map((u) => `<@${u.userID}>`).join(" |")}! Ganaste: **${giveaway.Prize}**!`,
			inline: true,
        },{
        	name: `${this.EmbedEmojiHostedBy} **|** Iniciado por:`,
        	value: `> <@${giveaway.HostedBy}>`,
        	inline: true,
        }])
        .setImage(this.EmbedImageEnd);
        return GiveawayEmbed;
	}
	// Opcion EndSorteo
	async end(messageId) {
		const data = this.sorteos.find((s) => s.MessageId == messageId);
		if (data?.Ended) return false;
		const giveaway = await this.getGanador(messageId);
		return giveaway;
	}
	// Opcion Reroll
	async reroll(messageId) {
		const giveaway = await this.getGanador(messageId);
		const data = await Model.findOne({
			MessageId: messageId
		});
		const { message } = await fetchModel(this.client, this.sorteos, messageId);
		this.emit("SorteoRerolled", message, data);
		if (giveaway) {
			return giveaway;
		} else {
			return false;
		}
	}
	// Opcion Editar 
	/*async edit(messageId, options) {
		await GModel.updateOne({ 
			MessageId: messageId, 
			Ended: false 
		},{
			// desarrollo 
		}).exec();
		await this.getSorteos();
	}*/
	// Opcion Eliminar
	async delete(messageId) {
		const { message, guild } = await fetchModel(
			this.client,
			this.sorteos,
			messageId
		);
		await message?.delete().catch((e) => {});
		if (!guild) return;
		let data = await Model.deleteOne({ MessageId: messageId });
		if (!data) return false;
		this.getSorteos();
		return true;
	}
	// GetSorteos
	async getSorteos() {
		const data = await Model.find();
		let sorteos = data.map((data) => data);
		this.sorteos = sorteos;
		return this.sorteos;
	}
	// GuardarSorteo
	async guardarSorteo(messageId, sorteoData) {
		const data = new Model(sorteoData);
		await data.save();
		return data;
	}
}

module.exports = SorteoManager;