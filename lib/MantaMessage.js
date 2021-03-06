var util = require('util');

/* Manta Message Object
 * constructor takes options:
 *
 */

var Message = function ( options ) {
	var self = this;
	if (options.message instanceof Message) options.message = options.message.message;
	if (! options.schema ) throw( "schema required to create message" );
	if (! options.schema ) throw( "schema required to create message" );
	this.eventGroup = options.schema.eventGroup;
	this.type = options.type;
	this.m = this.message = options.message;
	this.emit = function () {
		if (!options.emitter) throw "must construct message with emitter option if you want to emit";
		if (!this.isValid()) throw { error: "will not emit an invalid message!", result: this.errors, message: options.message };
		options.emitter.rabbit.emit(options.emitter.exchange, options.emitter.routingKey, this.message);
	};
	this.ensure = function () {
		if (! this.isValid()) throw "error validating message ("+this.type+")--> " + "\n\n" + JSON.stringify(this.errors) + "\n\n" + JSON.stringify(this.message);
	}
	this.isValid = function () {
		this.validity = options.schema.validate( options.message );
		this.errors = this.validity.errors;
		return this.validity.valid;
	};
	this.encode = function () {
		if (this.isValid()) return JSON.stringify(options.message);
		throw "cannot encode an invalid message --> " + util.inspect(this.errors);
	};
	this.object = function () { return options.message; };
	if (options.throwOnInvalid) this.ensure();
	return this;
};

module.exports = Message;

