# rabbit-node-lib

This is an abstraction making it easy to communicate with our rabbitmq servers.

## Installation

npm install rabbit-node-lib

## Synopsis

The simplest possible interface to create and send a MantaEvent

```javascript

var EventSystem = require('rabbit-node-lib');
var sender = new EventSystem.Emitter(
	{ exchange: "MantaEventTransitional"
	, routingKey: "testing"
	, rabbit: new EventSystem.Rabbit(
		{ connection: { url: "amqp://localhost/" }
		, exchanges: [ { "name": "MantaEventTransitional" , "type": "topic" } ]
		} )
	, schemaMgr: new EventSystem.SchemaMgr(
		{ "schemaSchema": "/home/sbx/sbx.rabbitmq.current/schemata/JsonSchema.schema"
		, "schemaDirectories": "/home/sbx/sbx.rabbitmq.current/schemata"
		} )
	} );

// simple form, send eventType and payload as hash
sender.envelope( 
	{ eventType: 'QueryTimer'
	, payload: {md5: '...', milliseconds:123456 }
	, actor: { id: 'fido', type:'canine'} 
	} ).emit();

// also can specify payload separately.
sender.envelope( 
	{ payload: sender.schema_mgr.message( 'QueryTimer' , { md5: '...', milliseconds: 123456 } )
	, actor: { id: 'dog', type:'canine'}
	} ).emit();


```

## Synopsis

This uses the event based interface, allowing you to dynamically add queues and exchanges as needed 

```javascript
var Rabbit = require('rabbit-node-lib/lib/RabbitMQ');

// basic operation
// get a connection
var rabbit = new Rabbit( { connection: { options: { url: 'amqp://user@pass@localhost:5672/' } } } );

// connected, declare exchange and queue
rabbit.once('Rabbit_Ready', function (rabbit) {
	rabbit.emit('Rabbit_Declare_Exchange', { name: 'MyEventExchange' } );
	rabbit.emit('Rabbit_Declare_Queue', { name: 'MyQueueName' } );
} );

// queue is declared, bind to it
rabbit.once('Rabbit_QueueReady', function (queue) {
	rabbit.emit('Rabbit_Bind', queue, 'MyEventExchange', 'key' })
} );

// bind is ready, subscribe to it
rabbit.once('Rabbit_BindReady', function (queue, exchange, key) {
	rabbit.emit('Rabbit_Subscribe', queue);
} );

// subscribe is ready, AND the queue is subscribed to, send a message on the exchange!
// this probably works in either order
rabbit.once("Rabbit_ExchangeReady", function (exchange) {
	rabbit.once('Rabbit_Subscribed', function (queue) {
		rabbit.emit('MyEventExchange', 'key', {a:"This is a message"});
	} );
} );

// Receive a message on the queue, on an event named for the name of the queue
rabbit.on('MyQueueName', function (message, headers, deliveryInfo) {
	console.log(deliveryInfo.routingKey + '> ' + message.a);

	// rabbit.allDone() // automatic cleanup
	// lets manually clean ourselves up just for demonstration
	// Unbind the binding
	rabbit.emit("Rabbit_Unbind", 'MyQueueName', 'key');
	// could also rabbit.emit('Rabbit_UnbindAll');
	// once its unbound, unsubscribe
	rabbit.once("Rabbit_Unbound", function(queue) {
		rabbit.emit("Rabbit_Unsubscribe", 'MyQueueName');
		// once its unsubscribed, destroy the queue and exchange
		rabbit.once("Rabbit_Unsubscribed", function(queue) {
			rabbit.emit("Rabbit_Destroy_Queue", queue);
			rabbit.emit("Rabbit_Destroy_Exchange", 'MyEventExchange', true); // 'ifUnused'
			rabbit.once("Rabbit_Queue_Destroyed", function(queue) {
				console.log("queue gone");
			} );
			rabbit.once("Rabbit_Exchange_Destroyed", function(queue) {
				console.log("exchange gone");
				rabbit.emit('disconnect');
			} );
		} );
	} );
} );

```

would output:

key> This is a message

The supplied deliveryInfo looks like this:

```javascript
{ contentType: 'application/json'
, queue: 'MyQueueName'
, deliveryTag: 1
, redelivered: false
, exchange: 'MyEventExchange'
, routingKey: 'key'
, consumerTag: 'node-amqp-30383-0.9582679294981062' 
}
```

## Details

Example with every possible option enumerated

```javascript

var rabbit = new Rabbit(
	{ connection:
		{ options: 
			{ url: 'amqp://user@pass@localhost:5672/' // OR the below options
			, host: 'localhost'
			, port: 5672
			, login: 'user'
			, password: 'pass'
			, vhost: '/'
			}
		, implOptions: 
			{ defaultExchangeName: 'myDefault'
			, routingKeyInPayload: false
			, deliveryTagInPayload: false
			, reconnect: true
			, reconnectBackoffStrategy: ['linear','exponential'][0]
			, reconnectExponentialLimit: 120000 // ms
			, reconnectBackoffTime: 1000 // ms
			}
		}
	, exchanges:
		[ { name: 'MyEventExchange'
			, type: ['direct','fanout','topic'][2]
			, passive: false
			, durable: false
			, autoDelete: false
			, confirm: false // ack|error event on publish OR callback called
			}
		]
	, queues:
		[ { name: 'MyQueueName'
			, bindings:
				[ { routing_key: 'ARoutingKey'
					, exchange: 'AnExchange'
					}
				, { routing_key: 'AnotherKey'
					, exchange: 'AnExchange'
					}
				, { routing_key: 'AnotherKey'
					, exchange: 'OtherExchange'
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
				{ ack: false // as fast as they come in 
										// - call queue.shift in listenCallback to enable 
										// next delivery if true
				, prefetchCount: 1 // how many to get before an ack is sent (0 unlimited)
				, 
				}
			, listenCallback: 
				function (message, headers, deliveryInfo, queue, rabbit) { 
					// message - the message received
					// headers - hash of the headers of the message
					// deliveryInfo - hash of delivery information indicated above
					// queue - the queue object - use for .shift() in ack:true mode
					// rabbit - our object, in case you want to emit on it
					// Do something with the received messages here
				}
			}
		]
	} , function (error, rabbit) {
			rabbit.emit 
				( 'MyEventExchange'
				, "myRoutingKey"
				, { message: "here" }
				, { mandatory: false
					, immediate: false
					, contentType: 'application/octet-stream'
					, contentEncoding: null
					, headers: { header: "value" }
					, deliveryMode: {nonpersistant:1,persistant:2}.nonpersistant
					, priority: 5 // 0-9
					, replyTo: 'myReplyQueue'
					}
				, function (booleanError) {
		  			// called when exchange in confirm mode
					}
				);
	} );

```
