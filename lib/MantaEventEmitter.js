var Uuid = require('node-uuid')
	, events = require('events')
	, os = require('os')
	, util = require('util')
	, SchemaMgr = require('./MantaSchemaMgr')
	, Message = require('./MantaMessage')
	;


/*
# MantaEventEmitter 

The object that we call to emit MantaEvents.
 into the message queue system

Contains the business rule for creating a MantaEvent envelope!

new MantaEventEmitter( { exchange, routingKey, rabbit } ) 
*/

function MantaEventEmitter (config) {
	events.EventEmitter.call(this);
	this.refCount = 0;
	var mvnt = this;

	this.exchange = config.exchange;
	this.routingKey = config.routingKey;
	this.rabbit = config.rabbit;

	if (!config.schemaMgr) throw("schemaMgr required to construct EventEmitter");
	this.schema_mgr = config.schemaMgr;
	this.hostname = os.hostname();
	this.pid = process.pid;
	
	// setting the max listeners to 15 to reduce trace dumps in the logs (NOTE there maybe a potential memory leak)  @dihnen @nromano
	this.setMaxListeners(15);
};

util.inherits(MantaEventEmitter, events.EventEmitter);

/*
* emit

Used to send the actual message.  Delegates it to the rabbit object

*/

MantaEventEmitter.prototype.send =
MantaEventEmitter.prototype.emit = function (message) {
	if (message instanceof Message) {
		message = message.encode();
	}
	try {
		this.rabbit.emit(this.exchange, this.routingKey, message, { contentType: 'text/json' } );
	}
	catch (e) {
		console.warn("CAUGHT ERROR DURING EMIT: ", e);
		throw e;
	}
}

/* 

* envelope

puts a MantaEvent envelope around the specified payload.

*/

MantaEventEmitter.prototype.envelope = function ( options, cb ) {
	var self = this;
	var usage = "usage: MantaEvent.envelope( ( PAYLOAD(must be a Message) | eventType + payload object) ACTOR [SOURCEIDENTITY] [REPORTING] )";
	if (!(options.payload && options.actor)) {
		if (cb) return cb(usage);
		throw usage;
	}
	if (! options.payload.encode) { // duck Message type
		if (! ( options.eventType && options.payload ) ) {
			if (cb) return cb(usage);
			throw usage;
		} else {
			// transform the data into message, and call ourselves again
			// on the normal code path
			options.payload = self.schema_mgr.message( options.eventType, options.payload, true );
			if (! options.payload instanceof Message ) throw "NO NO NO NO";
		}
	}
	if ( !options.sourceIdentity ) {
		options.sourceIdentity = options.actor;
	}
	var hard = 
		{ "uuid": self.newuuid()
		, "eventTimestamp": self.msepoch()
		, "hostname": self.hostname
		, "process": process.pid
		};
	var soft = 
		{ "context": 'nodejs Event Emitter library'
		};
	var newMessage = {};
	for (var k in soft) {
		newMessage[k] = soft[k];
	}
	for (var k in options) {
		newMessage[k] = options[k];
	}
	for (var k in hard) {
		newMessage[k] = hard[k];
	}
	newMessage.payload = options.payload.encode();
	newMessage.eventType = options.payload.type;
	newMessage.eventGroup = self.schema_mgr.get('MantaEvent').eventGroup;
	newMessageObject = self.schema_mgr.message( "MantaEvent", newMessage, false, this );
	if (cb) return cb(null, newMessageObject);
	return newMessageObject
};

/*

* newuuid 

return a new uuid for a message

*/

MantaEventEmitter.prototype.newuuid = function () {
	return this._next_uuid('Manta');
};

/*

* _next_uuid

Map to the proper library for uuid retrieval with type 4 config

*/

MantaEventEmitter.prototype._next_uuid = function () {
	return Uuid.v4();
};

/* 

* msepoch

Returns the current time in milliseconds since epoch

*/

MantaEventEmitter.prototype.msepoch = function () {
	return new Date().getTime();
};

/* 

* done

terminates the rabbitmq connection and such

*/

MantaEventEmitter.prototype.done = function () {
	this.rabbit.allDone();
};

module.exports = MantaEventEmitter;

