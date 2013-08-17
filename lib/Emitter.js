var Message = require('./Message');
var extend = require('util')._extend;
var EventEmitter = require('events').EventEmitter;

function Emitter ( config ) {
	this.rabbit = config.rabbit;
	this.schemaMgr = config.schemaMgr;
	this.routingKey = config.routingKey;
	this.exchange = config.exchange;
}

Emitter.prototype.envelope = function ( message ) {
	return new Message( { emitter: this, message: message } );
};

Emitter.prototype.emit = function ( string ) {
	this.rabbit.emit(this.exchange, this.routingKey, message);
};

module.exports = Emitter;
