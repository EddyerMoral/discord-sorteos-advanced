// Importamos mongodb
const { model, Schema } = require("mongoose");
// Importamos nuevos datos
const data = new Schema({
	MessageId: String,
    ChannelId: String,
    GuildId: String,
    Prize: String,
    Started: String, 
    Entry: Array,
    Entered: Number,
    WinCount: Number,
    EndTime: String,
    HostedBy: String,
    Ended: Boolean,
    Winners: Array,
});
// Importamos los datos en un model
module.exports = model("sorteos-model", data);