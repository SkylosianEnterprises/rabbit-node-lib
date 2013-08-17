var Uuid = require('node-uuid')
	, events = require('events')
	, util = require('util')
	, SchemaMgr = require('./MantaSchemaMgr')
	, Q = require('q')
	;


/*
# MantaReceiver 

The object that we call to emit MantaEvents.
 into the message queue system

Contains the business rule for creating a MantaEvent envelope!

new MantaReceiver( { schemaMgr: schemaMgr, exchanges: [ exchangedef ], rabbit: Rabbit } ) 
*/

function MantaReceiver (config) { 
	var self = this;
	events.EventEmitter.call(this);
	this.rabbit = config.rabbit;
	this.schemaMgr = config.schemaMgr;
	this.queues = config.queues || [];

	if (!config.schemaMgr) throw("schemaMgr required to construct EventEmitter");
	if (!config.exchanges) throw("queuedef required to construct EventEmitter");
	if (!config.rabbit) throw("rabbit required to construct EventEmitter");

	self.rabbit.beReady.then( function () {
		config.exchanges.forEach( function (exchdef) { 
			self.rabbit.emit('Rabbit_Declare_Exchange', exchdef) 
		} );
		config.queues.forEach( self.listen );
	} );
};
util.inherits(MantaReceiver, events.EventEmitter);

/*
* listen

Used to set up the receipt of a decoded and validated messages

Subscribe up the queue, validate the incoming messages, and emit events per the eventType

*/

MantaReceiver.prototype.listen = function (queuedef) {
	var self = this;
	this.rabbit.beReady.then(function () {
		self.rabbit.emit('Rabbit_Declare_Queue', queuedef);
	} ).done();
	var f;
	this.rabbit.on('Rabbit_QueueReady', f = function (queuename) {
		if (queuedef.name == queuename) {
			self.rabbit.removeListener('Rabbit_QueueReady', f);
			self.rabbit.emit('Rabbit_Subscribe', queuedef.name, queuedef.subscribeOptions);
			self.rabbit.on('Rabbit_Subscribed', f = function (queuename) {
				self.emit('Reciever_Ready', queuename);
				console.log("MantaReceiver subscribed to", queuename);
			} );

			// THE QUEUE EVENT LISTENER
			self.rabbit.on(queuename, function 
										( message
										, headers
										, deliveryInfo
										) {
				var result = self.schemaMgr.get('MantaEvent').validate(message);
				if (!result.valid) return console.warn("invalid validation for message", result, message);
				var payload;
				try { 
					payload = JSON.parse(message.payload);
				} catch (e) {
					return console.warn("invalid json in payload?", e, message.payload);
				}
				result = self.schemaMgr.get(message.eventType).validate(payload);;
				if (!result.valid) return console.warn("invalid validation for message payload of type", message.eventType, result, payload);
				message.payload = payload;
				self.emit(message.eventType, message, headers, deliveryInfo);
			} );
			console.log("MantaReciever handler for "+queuename+" set up");
		}
	} );
}

module.exports = MantaReceiver;

