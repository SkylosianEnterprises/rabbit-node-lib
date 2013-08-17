var amqp = require('amqp');
var async = require('async');
var util = require('util');
var events = require('events');
var Q = require('q');

function Rabbit (config, readycallback) {
	events.EventEmitter.call(this);
	this.setMaxListeners(100);
	this.refCount = 0;
	var self = this;
	this.exchanges = [];
	this.queues = [];
	this.buffer_of_missed_messages = [];
	this.connectwait = Q.defer();
	this.configwait = Q.defer();
	this.beConnected = this.connectwait.promise;
	this.beReady = this.configwait.promise;
	
	process.nextTick( function () { self.connect(config, readycallback); } );
}

util.inherits(Rabbit, events.EventEmitter);

Rabbit.prototype.connect = function (config, readycallback) {
	var self = this;
	this.beReady.then(function(error) {
		if (readycallback) return readycallback(error, self);
		if (error) throw error;
	} ).done();

	self.on('Rabbit_Declare_Exchange', function (exchdef, callback) {
		self.beConnected.then(function() { self.exchange(exchdef, callback); } ).done();
	} );
	self.on('Rabbit_Declare_Queue', function (queuedef, callback) {
		self.beConnected.then(function() { self.queue(queuedef, callback); } ).done();
	} );
	self.on('allDone', function () {
		self.beConnected.then(function() { self.connection.end(); } ).done();
	} );


	var configgedCreate = function () {
		self.connection = amqp.createConnection(config.connection, { heartbeat: 1 } );

		self.connection.once( 'error', function (e) {
			console.log("ERROR:",e);
			if (config.reconnect && 'ECONNREFUSED' == e.code) {
				console.log("connection refused to "+config.connection.url+" while reconnect enabled - suppressing error to allow reconnect");
			} else {
				self.emit('error', self.exchanges, self.queues, e );
			}
			process.nextTick(function () {
				self.exchange = []; // stop pointing to the old array
				self.queues= [];    // stop pointing to the old array
			} );
		} );

		if (config.reconnect)
			self.connection.once( 'close', function (why) {
				self.connection.removeAllListeners();
				self.connection.once('error', function () { } ); // stop crash on error emits when no listeners
				self.connection.destroy();
				process.nextTick( function () { configgedCreate() } );
			} );

		self.connection.once( 'close', function (e) {
			self.emit( 'disconnect', e );
			self.emit( 'close', self.exchanges, self.queues, e );
		} );
	
			// first the exchanges, then the queues!
		self.beConnected.then( function() {
			async.series(
				[ function (sercb) {
						if (config.exchanges) {
							async.map( config.exchanges, function (exchdef, mapcb) {
									self.emit('Rabbit_Declare_Exchange', exchdef, mapcb);
									}, sercb );
							} else {
								sercb();
							}
						}
				, function (sercb) {
						if (config.queues) {
							async.map( config.queues, function (queuedef, mapcb) {
								self.emit('Rabbit_Declare_Queue', queuedef);
								var subscriber, subscribed;
								self.on('Rabbit_QueueReady', subscriber = function (queuename) {
									self.beConnected.then(function(rabbit) {
										if (queuename != queuedef.name) return;
										self.removeListener('Rabbit_QueueReady', subscriber);
										self.emit('Rabbit_Subscribe', queuedef.name, queuedef.subscribeOptions, queuedef.listenCallback );
										self.on('Rabbit_Subscribed', subscribed = function (queuename) {
											self.beConnected.then(function() {
												if (queuename != queuedef.name) return;
												self.removeListener('Rabbit_Subscribed', subscribed);
												mapcb();
											} ).done();
										} );
									} ).done();
								} );
							}, sercb );
						} else {
							sercb();
						}
					}
				], function (error, results) {
						if (error) console.log("RABBIT ERROR CALLBACK", error);
						self.emit('ready', self);
						self.emit('Rabbit_Ready', self);
						self.configwait.resolve(error, self);
				} 
			);
		} ).done();

		self.connection.once('ready', function () {
				self.connectwait.resolve(self);
			} );

	}
	configgedCreate();
}

Rabbit.prototype.queue = function (queuedef, queueDoneCallback) {
	var self = this;
	queuedef.bindings = queuedef.bindings || [];
	this.connection.queue
		( queuedef.name
		, { passive: queuedef.passive
			, durable: queuedef.durable
			, exclusive: queuedef.exclusive
			, autoDelete: queuedef.autoDelete
			, noDeclare: queuedef.noDeclare
			, arguments: queuedef.arguments
			, closeChannelOnUnsubscribe: queuedef.closeChannelOnUnsubscribe
			}
		, function ( queue ) {
				self.queues[queuedef.name] = [ queue, queuedef ];

				var subscriber = function(){};
				self.on('Rabbit_Subscribe', subscriber = function (queuename, options, cb) {
					if (queuedef.name != queuename) return;

					self.beConnected.then(function() {
						queue.subscribe
							( options
							, function (message, headers, deliveryInfo) {
									if (cb) {
										return cb
											( message
											, headers
											, deliveryInfo
											, queue
											, self
											);
									}
									return self.emit
										( queue.name
										, message
										, headers
										, deliveryInfo
										, queue
										);
								}
							);

						self.on('Rabbit_Unsubscribe', unsubber = function (queuename) {
							if (queuename != queue.name) return;
							self.beConnected.then(function() {
								queue.unsubscribe(result.consumerTag).addCallback(function () {
									self.emit('Rabbit_Unsubscribed', queue.name );
									self.removeListener('Rabbit_Unsubscribe', unsubber);
								} );
							} ).done();
						} );
						self.once('disconnect', function (why) { self.removeListener('Rabbit_Unsubscribe', unsubber); } );

					} ).done();
				} );
				self.once('disconnect', function (why) { self.removeListener('Rabbit_Subscribe', subscriber) } );

				var binder = function(){};
				var destroyerqueue = function(){};
				;
				self.on('Rabbit_Destroy_Queue', destroyerqueue = function (queuename, options) {
					if (queuename != queuedef.name) return;
					self.beConnected.then(function() {
						queue.destroy(options);
						self.emit("Rabbit_Queue_Destroyed", queuename, options);
						self.removeListener('Rabbit_Destroy_Queue', destroyer);
					} ).done();
				} );
				self.once('disconnect', function (why) { self.removeListener('Rabbit_Destroy_Queue', destroyerqueue) } );

				var bindhead = function(){};
				self.on('Rabbit_Bind_Headers', bindhead = function (queuename, exchange, routing, cb) {
					if (queuename != queuedef.name) return;
					self.beConnected.then(function() {
						var unbindhead = function(){};
						self.on('Rabbit_Unbind', unbindhead = function (unqueuename, unexchange, unrouting) {
							if (unqueuename != queuename) return;
							if (unexchange != exchange) return;
							self.beConnected.then(function() {
								if (Object.keys(routing).filter( function (key) {
									if (routing[key] != unrouting[key]) return true;
									return false;
								} ).length > 0) return;
								if (Object.keys(unrouting).filter( function (key) {
									if (routing[key] != unrouting[key]) return true;
									return false;
								} ).length > 0) return;
								var p = queue.unbind(exchange, routing);
								p.then( function (a) {
									self.emit('Rabbit_Unbound', unqueuename, unexchange, unrouting);
									self.removeListener('Rabbit_Unbind', unbindhead);
								} ).done();
							} ).done();
						} );
						self.once('disconnect', function (why) { self.removeListener('Rabbit_Bind_Headers', bindhead) } );
	
						queue.bind(exchange, routing, function (queue) {
							if (cb) cb(null, queue);
							self.emit('Rabbit_BindReady', queuename, exchange, routing);
							var unbinder = function(){};
							self.on('Rabbit_UnbindAll', unbinder = function (queuename) {
								if (queuename != queue.name) return;
								self.beConnected.then(function() {
									self.emit('Rabbit_Unbind', queuename, exchange, routing );
									self.removeListener('Rabbit_UnbindAll', unbinder);
								} ).done();
							} );
							self.once('disconnect', function (why) { self.removeListener('Rabbit_UnbindAll', unbinder); } );
	
						} );
					} ).done();
				} );

				self.on('Rabbit_Bind', function (queuename, exchange, routingKey, cb) {
					if (queuename != queuedef.name) return;
					self.beConnected.then(function() {
						var unbinddir = function(){};
						self.on('Rabbit_Unbind', unbinddir = function (unqueuename, unexchange, unroutingKey) {
							if (unqueuename != queuename) return;
							if (unexchange != exchange) return;
							if (unroutingKey != routingKey) return;
							self.beConnected.then(function() {
								var p = queue.unbind(exchange, routingKey);
								p.then( function (a) {
									self.emit('Rabbit_Unbound', unqueuename, unexchange, unroutingKey);
									self.removeListener('Rabbit_Unbind', unbinddir);
								} ).done();
							} ).done();
						} );
						self.once('disconnect', function (why) { self.removeListener('Rabbit_Bind', binder) } );
	
						queue.bind(exchange, routingKey, function (queue) {
	
							if (cb) cb(null, queue);
							self.emit('Rabbit_BindReady', queuename, exchange, routingKey);
	
							var unbindaller = function(){};
							self.on('Rabbit_UnbindAll', unbindaller = function (queuename) {
								if (queuename != queue.name) return;
								self.beConnected.then(function() {
									self.emit('Rabbit_Unbind', queue.name, bind.exchange, bind.routingKey );
									self.removeListener('Rabbit_UnbindAll', unbindaller);
								} ).done();
							} );
							self.once('disconnect', function (why) { self.removeListener('Rabbit_UnbindAll', unbindaller); } );
	
						} );
					} ).done();
				} );

				queue.once('basicConsumeOk', function (result, info) {
					if (this.name != queuedef.name) throw "name mismatch:" .JSON.stringify([this.name, queue.name]);
					var unsubber = function(){};
					var unbounder = function(){};
					self.emit('queueReady', queue, queuedef );
					self.emit('Rabbit_Subscribed', queuedef.name);
					if ( queueDoneCallback ) queueDoneCallback(null, queue, queuedef);
				} );

				async.forEachSeries( queuedef.bindings
					, function (bindspec, mapcb) {
							self.emit('Rabbit_Bind', queuedef.name, bindspec.exchange, bindspec.routingKey, mapcb );
						}
					, function (error, collection) {
							self.emit( 'Rabbit_QueueReady', queuedef.name );
							if (error && queueDoneCallback) return queueDoneCallback(error);
							if (error) throw error;
						}
					);
			}
		);
};

Rabbit.prototype.exchange = function ( exchdef , exchangeDoneCallback ) {
	var self = this;
	if (!exchdef) throw new Error().stack;
	var bufferer = function(){}
	var sender = function(){}
	this.connection.exchange
		( exchdef.name
		, { type: exchdef.type
			, passive: exchdef.passive
			, durable: exchdef.durable
			, autoDelete: exchdef.auto_delete || exchdef.autoDelete
			, confirm: exchdef.confirm
			}
		, function (exchange) {
				self.exchanges[exchdef.name] = [ exchange, exchdef ];
				self.emit("exchangeReady", exchange, exchdef);
				self.emit('Rabbit_ExchangeReady', exchdef.name);
				self.removeListener(exchdef.name, bufferer) // in case we have a buffer situation
				// functionality publish (routingKey, message, options, callback)
				self.on(exchdef.name, sender = function (routingKey, message, options, callback) {
					exchange.publish(routingKey, message, options, callback);
				} );
				// send the missed messages
				self
					.buffer_of_missed_messages
					.filter( function (ele) { return ele[0] == exchdef.name } )
					.forEach( function (which) {
						console.log("sending missed message", JSON.stringify(which));
						self.emit.apply(which);
					} );
				// remove the sent ones from the queue
				self.buffer_of_missed_messages
					= self.buffer_of_missed_messages.filter( function (ele) { return ele[0] != exchdef.name } );
				self.once('disconnect', function (why) {
					self.removeListener(exchdef.name, sender);
					self.on(exchdef.name, bufferer = function (routingKey, message, options, callback) {
console.warn("MISSING", routingKey, message, options);
						console.log("--BEGIN MISSED MESSAGE--");
						console.log("exchange: ", exchdef.name);
						console.log("routingKey: ", routingKey);
						console.log("options: ", JSON.stringify(options, null, 4));
						console.log("callback: ", callback);
						console.log("message: ", JSON.stringify(message, null, 4));
						console.log("--END MISSED MESSAGE--");
						self.buffer_of_missed_messages.push([exchdef.name, routingKey, message, options, callback]);
					} );
				} );
				var destroyerexchange = function(){};
				self.on('Rabbit_Destroy_Exchange', destroyerexchange = function (exchangeName, ifUnused) {
					if (exchangeName != exchdef.name) return;
					self.beConnected.then(function() {
						exchange.destroy(ifUnused);
						self.connection.once('exchangeDestroyOk', function () {
							self.emit('Rabbit_Exchange_Destroyed', queuename);
						} );
					} ).done();
				} );
				self.once('disconnect', function (why) { self.removeListener('Rabbit_Destroy_Exchange', destroyerexchange) } );
				if (exchangeDoneCallback) exchangeDoneCallback(null, exchange);
			}
		);	
};

Rabbit.prototype.allDone = function ( ) {
	this.emit('allDone');
};

module.exports = Rabbit;

