
function Message ( options ) {
	this.emitter = options.emitter;
	this.schemaMgr = this.emitter.schemaMgr;
	this.message = options.message;
	// payload
	// actor
	// eventType
}
Message.prototype.emit = function ( options ) {
	this.emitter.emit(this.marshal());
};
Message.prototype.marshal = function ( options ) {
	if (this.schemaMgr.validate(this.message)) return JSON.stringify(this.message);
};


module.exports = Message;

