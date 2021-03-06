var Rabbit = require('../lib/MantaRabbitMQ.js');
var async = require('async');
var util = require('util');
//rabbit-node-lib');

// basic operation

describe( 'class integration Operation', function () {
var dog = function(){ 
	it( 'should recieve the message it sends', function (done) {

		var rabbit = new Rabbit( { connection: { options: { url: 'amqp://localhost:5672/' } } } );

		rabbit.once('Rabbit_Ready', function (rabbit) {
				rabbit.emit('Rabbit_Declare_Exchange', { name: 'MyEventExchange', autoDelete: true } );
			} );

		rabbit.once('Rabbit_ExchangeReady', function (exchange) {
			rabbit.emit('Rabbit_Declare_Queue', 
				{ name: 'MyQueueName'
				, autoDelete: true
				, bindings: [ { routingKey: 'rkey', exchange: 'MyEventExchange' } ]
				} );
			} );

		rabbit.once('Rabbit_QueueReady', function (queuename) {
			rabbit.emit('Rabbit_Subscribe', queuename );
		} );

		rabbit.once('Rabbit_Subscribed', function (queue) {
				rabbit.emit('MyEventExchange', 'rkey', {a:"This is a message"});
			} );

		rabbit.once('MyQueueName', function (message, headers, deliveryInfo) { 
				expect(deliveryInfo.routingKey).toEqual('rkey');
				expect(message).toEqual({a:'This is a message'});
				rabbit.emit('allDone');
				done();
			} );
	});

};
	it( 'should recieve the expected messages it sends', function (done) {

var rabbit = new Rabbit(
	{ reconnect: false
	, connection: 
		{ options: { url: 'amqp://localhost:5672/' }
		, implOptions:
			{ defaultExchangeName: 'myDefault'
			, routingKeyInPayload: false
			, deliveryTagInPayload: false
			, reconnect: false
			, reconnectBackoffStrategy: ['linear','exponential'][0]
			, reconnectExponentialLimit: 120000 // ms
			, reconnectBackoffTime: 1000 // ms
			}
		}
	, exchanges:
		[ { name: 'AnExchange'
			, type: ['direct','fanout','topic'][2]
			, passive: false
			, durable: false
			, autoDelete: true
			, confirm: false
			}
		, { name: 'AnOtherExchange'
			, type: ['direct','fanout','topic'][2]
			, passive: false
			, durable: false
			, autoDelete: true
			, confirm: false
			}
		]
	, queues:
		[ { name: 'MySillyQueueName'
			, bindings:
				[ { routingKey: 'ARoutingKey'
					, exchange: 'AnExchange'
					}
				, { routingKey: 'AnotherKey'
					, exchange: 'AnExchange'
					}
				, { routingKey: 'AnotherKey'
					, exchange: 'AnOtherExchange'
					}
				]
			, passive: false
			, durable: false
			, exclusive: false
			, autoDelete: true
			, noDeclare: false
			, arguments: { } // additional arguments for create?
			, closeChannelOnUnsubscribe: false
			, subscribeOptions:
				{ ack: false // as fast as they come in - call queue.shift in listenCallback to enable next delivery if true
				, prefetchCount: 1
				, 
				}
			, listenCallback: 
				function (message, headers, deliveryInfo, queue, rab) { 
					// Do something with the received messages here
//					console.log("received A message " + message);
//					console.log("received A headers " + util.inspect(headers));
//					console.log("received A delivery " + util.inspect(deliveryInfo));
					rab.emit(deliveryInfo.replyTo, headers.header);
				}
			}
		, { name: 'MyOtherQueueName'
			, bindings:
				[ { routingKey: 'BRoutingKey'
					, exchange: 'AnExchange'
					}
				, { routingKey: 'BnotherKey'
					, exchange: 'AnExchange'
					}
				, { routingKey: 'BnotherKey'
					, exchange: 'AnOtherExchange'
					}
				]
			, passive: false
			, durable: false
			, exclusive: false
			, autoDelete: true
			, noDeclare: false
			, arguments: { } // additional arguments for create?
			, closeChannelOnUnsubscribe: false
			, subscribeOptions:
				{ ack: false // as fast as they come in - call queue.shift in listenCallback to enable next delivery if true
				, prefetchCount: 1
				, 
				}
			, listenCallback: 
				function (message, headers, deliveryInfo, queue, rab) { 
					// Do something with the received messages here
//					console.log("received B message " + message);
//					console.log("received B headers " + util.inspect(headers));
//					console.log("received B delivery " + util.inspect(deliveryInfo));
					rab.emit(deliveryInfo.replyTo, headers.header);
				}
			}
		]
	}
, function (error, rab) {
		// the rabbit is all initialized.  run tests!
		if (error) throw error;
		async.parallel(
			[ function (pcb) { pcb() }
			, function (pcb) {
					rab.emit('AnExchange', 'ARoutingKey', [ 'E', 'Ark', 1 ], { headers: { header: "value A" }, replyTo: 'suzyQ' } );
					rab.once('suzyQ', function(d) { expect(d).toEqual("value A"); pcb(); });
				}
			, function (pcb) {
					rab.emit('AnExchange', 'AnotherKey', [ 'E', 'Ank', 1 ], { headers: { header: "value B" }, replyTo: 'suzyR' } );
					rab.once('suzyR', function(d) { expect(d).toEqual("value B"); pcb(); });
				}
			, function (pcb) {
					rab.emit('AnExchange', 'AnotherKey', [ 'E', 'Ank', 2 ], { headers: { header: "value C" }, replyTo: 'suzyS' } );
					rab.once('suzyS', function(d) { expect(d).toEqual("value C"); pcb(); });
				}
			, function (pcb) {
					rab.emit('AnExchange', 'BRoutingKey', [ 'E', 'Brk', 1 ], { headers: { header: "value D" }, replyTo: 'suzyT' } );
					rab.once('suzyT', function(d) { expect(d).toEqual("value D"); pcb(); });
				}
			, function (pcb) {
					rab.emit('AnExchange', 'BnotherKey', [ 'E', 'Bnk', 1 ], { headers: { header: "value E" }, replyTo: 'suzyU' } );
					rab.once('suzyU', function(d) { expect(d).toEqual("value E"); pcb(); });
				}
			, function (pcb) {
					rab.emit('AnExchange', 'BnotherKey', [ 'E', 'Bnk', 2 ], { headers: { header: "value F" }, replyTo: 'suzyV' } );
					rab.once('suzyV', function(d) { expect(d).toEqual("value F"); pcb(); });
				}
			, function (pcb) {
					rab.emit('AnOtherExchange', 'ARoutingKey', [ 'O', 'Ark', 1 ], { headers: { header: "value G" }, replyTo: 'suzyW' } );
					var saw = false;
					// because we shouldn't receive this particular message we wait
					// a second on the assumption if it does come through it'll be much
					// faster than that.
					rab.once('suzyG', function(d) { saw = true; });
					rab.once('waitforG', function(d) { expect(saw).toBe(false); pcb(); });
					setTimeout(function () { rab.emit('waitforG', 'value G'); }, 1000 );
				}
			, function (pcb) {
					rab.emit('AnOtherExchange', 'AnotherKey', [ 'O', 'Ank', 1 ], { headers: { header: "value H" }, replyTo: 'suzyX' } );
					rab.once('suzyX', function(d) { expect(d).toEqual("value H"); pcb(); });
				}
			, function (pcb) {
					rab.emit('AnOtherExchange', 'AnotherKey', [ 'O', 'Ank', 2 ], { headers: { header: "value I" }, replyTo: 'suzyY' } );
					rab.once('suzyY', function(d) { expect(d).toEqual("value I"); pcb(); });
				}
			, function (pcb) {
					rab.emit('AnOtherExchange', 'BRoutingKey', [ 'O', 'Brk', 1 ], { headers: { header: "value J" }, replyTo: 'suzyZ' } );
					rab.on('waitforJ', function(d) { expect(d).toEqual("value J"); pcb(); });
					rab.emit('waitforJ', 'value J');
				}
			, function (pcb) {
					rab.emit('AnOtherExchange', 'BnotherKey', [ 'O', 'Bnk', 1 ], { headers: { header: "value K" }, replyTo: 'suzyO' } );
					rab.once('suzyO', function(d) { expect(d).toEqual("value K"); pcb(); });
				}
			, function (pcb) {
					rab.emit('AnOtherExchange', 'BnotherKey', [ 'O', 'Bnk', 2 ], { headers: { header: "value L" }, replyTo: 'suzyP' } );
					rab.once('suzyP', function(d) { expect(d).toEqual("value L"); pcb(); });
				}
			]
		, function (error, results) {
				rab.emit('allDone');
				done();
			}
		);
	}
);

	}, 5001);

});
