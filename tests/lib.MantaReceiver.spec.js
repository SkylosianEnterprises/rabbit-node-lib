var SchemaMgr = require('../lib/MantaSchemaMgr.js');
var Rabbit = require('../lib/MantaRabbitMQ.js');
var Receiver = require('../lib/MantaReceiver.js');
var Emitter = require('../lib/MantaEventEmitter.js');
var async = require('async');
var util = require('util');
var Q = require('q');
//rabbit-node-lib');

// basic operation

describe( 'Receiver operation', function () {
	it( 'should receive the message that is sent', function (done) {


		new SchemaMgr(
			{ "schemaSchema": "/home/dihnen/rabbitmq-lib/schemata/JsonSchema.schema"
			, "schemaDirectories": [ "/home/dihnen/rabbitmq-lib/schemata" ]
			},
			function (err, schemaMgr) {


				var rabbit = new Rabbit( { connection: { options: { url: 'amqp://localhost:5672/' } } } );
				var receiver = new Receiver( { schemaMgr: schemaMgr, rabbit:rabbit, exchanges: [ { name: 'MyEventExchange', autoDelete: true } ] } );

				var emitter = new Emitter(
					{ schemaMgr: schemaMgr
					, exchange: 'MyEventExchange'
					, routingKey: 'rkey'
					, rabbit: rabbit
					} );

				receiver.on('StringTest', function (message, headers, deliveryInfo ) {
					expect(deliveryInfo.routingKey).toEqual('rkey');
					expect(message.payload).toEqual({str:'This is a message'});
					rabbit.emit('allDone');
					done();
				} );

				receiver.listen(
					{ name: 'MyQueueName'
					, autoDelete: true
					, bindings: [ { routingKey: 'rkey', exchange: 'MyEventExchange' } ]
					} );

				rabbit.beReady.then( function () { setTimeout(function () { emitter.envelope( { eventType: 'StringTest', payload: {str:"This is a message"}, actor: { id: 'nobody', type: 'special' } } ).emit(); }, 1000) } ).done();

		} );

	} );

} );
