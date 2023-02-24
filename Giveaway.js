class Giveaway {
	constructor(manager, options) {
		// Importación del manager desde el constructor.
		this.manager = manager;
		// Importación de opciones.
		this.MessageId = options.MessageId; 
	    this.EndTime = options.EndTime;
	    this.Ended = options.Ended;
	    this.Entered = options.Entered;
	    this.Entry = options.Entry;
	    this.GuildId = options.GuildId;
	    this.HostedBy = options.HostedBy;
	    this.Prize = options.Prize;
	    this.Started = options.Started;
	    this.WinCount = options.WinCount;
	    this.Message = options.Message;
	    this.Winners = options.Winners;
	    // ------------------------- //
	}
	// Importación de URL del Sorteo
	get GetURL() {
    	return `https://discord.com/channels/${this.GuildId}/${this.ChannelId}/${this.MessageId}`;
	}
	// Importación de tiempo restante
	get RemainingTime() {
		return this.EndTime - Date.now();
	}
	// Importación de duración
	get Duration() {
		return this.EndTime - this.Started;
	}
	// Importación de Terminado
	get IsEnded() {
		return this.Ended;
	}
	// Importación de Ingresos(Entered)
	get EnteredCount() {
    	return this.Entered;
	}
}
// Exportamos la clase
module.exports = {Giveaway};