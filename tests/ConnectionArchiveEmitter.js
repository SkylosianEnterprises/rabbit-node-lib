var MSM = require('../lib/MantaSchemaMgr');
var member = require('common-lib/util/manta_member.js');
var Q = require('q');
var mongoose = require('mongoose');
var util = require('util');

var schemaDefer = Q.defer();
var getSchema = schemaDefer.promise;

var msm = new MSM(
//	{ "schemaSchema": "/home/sbx/sbx.rabbitmq.current/schemata/JsonSchema.schema"
//	, "schemaDirectories": [ "/home/sbx/sbx.rabbitmq.current/schemata" ]
//	} );
	{ "schemaSchema": "/home/skylos/RabbitMQ/schemata/JsonSchema.schema"
	, "schemaDirectories": [ "/home/skylos/RabbitMQ/schemata", "/home/skylos/RabbitMQ/namespaceProblemAside" ]
	}, function (err, schema) {
		if (err) throw err;
		schemaDefer.resolve(schema);
	} );

var Rabbit = require('../lib/MantaRabbitMQ');
var rabbit = new Rabbit(
	{ "connection":
		{ "options":
			{ "host": "ecnext74.ecnext.com"
			//{ "host": "ecnext123.ecnext.com"
			, "port": 5672
			, "vhost": "/"
			}
		, "heartbeat": 5
		}
	, "exchanges":
		[ { "name": "MantaEventTransitional"
			, "type": "topic"
			, "passive": false
			, "durable": false
			, "autoDelete": false
			}
		]
	}
);
var Emitter = require('../lib/MantaEventEmitter');
var emitter = new Emitter(
	{ rabbit: rabbit
	, schemaMgr: msm
	, exchange: "MantaEventTransitional"
	, routingKey: "archiveData.connections.test"
	}
);

console.log(msm);
var connectSchema = mongoose.Schema( { _id: { type: mongoose.Schema.Types.ObjectId } } );

mongoose.connect('mongodb://ecnext80.ecnext.com/mstest');
var connection = mongoose.connection;
var Connection = mongoose.model( 'Connection', connectSchema, 'connections' );

mongoose.connection.db.command({'ping':1}, function (err, result) {
	console.log("ping good");
});

var g = 0;
var b = 0;
var cont = false;
var lasttime = new Date().getTime();
var lastcount = 0;
connection.once('open', function () {
	console.log("connection open");
	getSchema.then( function (schema) {
		console.log("got schema");
		var proc = function () {
			console.log("already", g, b, g+b);
			var tick = function () {
				if (lasttime < new Date().getTime() - 1000) {
					console.log("last sec proc", (g+b-lastcount), " now total", g+b);
					lastcount = g + b;
				}
			};
			setInterval(tick, 1000);
			var stream = Connection.find({ type: "following" }).lean().slaveOk().batchSize(4000).stream();
			stream.on('data', function (doc) {
				cont = true;
				process.nextTick(function() {
				if (! doc.createdBy) {
					delete doc.createdBy;
				}
				var result = schema.get('Connection').validate(doc);
				if(result.valid) {
					++g;
					getEvent(doc).emit();
				}
				else {
					console.log(doc, result, ++b);
				}
				});
			} ).on('error', function (err) {
				throw err;
			} ).on('close', function () {
				console.log("close");
				clearInterval(tick);
				rabbit.allDone();
				if (cont) {
					cont = false;
					proc();
				};
			} );
		};
		proc();
	} ).done();
} );

function getEvent (connection) {
	
	return emitter.envelope(
		{ eventType: 'SubscriptionActivity'
		, createdBy: connection.from
		, context: 'Connection archive data loader'
		, endpoint: [ connection.to ]
		, payload: JSON.stringify({ action: "add" , subscriptionType: connection.type })
		, actor: { "type": "archiveLoader", id: "1" }
		, sourceIdentity: connection.from
		} );

}

