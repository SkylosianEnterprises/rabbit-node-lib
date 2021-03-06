if (process.env.NDOE_ENV == 'production') {
	console.warn('we are in a production environment, so we are overwriting console.log to an empty function');
	console.log = function () {
		// TODO we should use a logger @dihnen @nromano
	};
}

var Receiver = require('./lib/MantaReceiver');
var Emitter = require('./lib/MantaEventEmitter');
var Rabbit = require('./lib/MantaRabbitMQ');
var TokenMgr = require('./lib/MantaTokenMgr');
var SchemaMgr = require('./lib/MantaSchemaMgr');
var Schema = require('./lib/MantaJsonSchema');
var Fetcher = require('./lib/snarfConfig');
var Q = require('q');

var configAgent = new Fetcher();

function EventSystem () {
}
module.exports = EventSystem;
EventSystem.Rabbit = Rabbit;
EventSystem.SchemaMgr = SchemaMgr;
EventSystem.TokenMgr = TokenMgr;
EventSystem.Schema = Schema;
EventSystem.Fetcher = Fetcher;
EventSystem.Emitter = Emitter;
EventSystem.Receiver = Receiver;

EventSystem.prototype.rabbitWork = function (url, callback) {
	this.Rabbit(url).when(function (mgr) { callback(null, mgr) }).fail(function (err) { throw(err) })
}
EventSystem.prototype.Rabbit = function (url, callback) {
	var deferred = Q.defer();
	if (callback) return this.rabbitWork(url, callback);
	this.getConfig(url, function (err, rabconf) { 
		if (err) return deferred.reject(err);
		if (! rabconf ) return deferred.reject( "no data returned for url " + url );
		new Rabbit(rabconf, function (error, rabbit) { deferred.resolve(rabbit); } );
	} );
	return deferred.promise;
};

EventSystem.prototype.schemaWork = function (url, callback) {
	this.SchemaMgr(url).when(function (mgr) { callback(null, mgr) }).fail(function (err) { throw(err) })
}
EventSystem.prototype.SchemaMgr = function (url, callback) {
	var deferred = Q.defer();
	if (callback) return this.schemaWork(url, callback);
	this.getConfig(url, function (err, schemaconfig) { 
		if (err) return deferred.reject(err);
		if (! schemaconfig ) return deferred.reject( "no data returned for url " + url );
		new SchemaMgr(schemaconfig, function (error, mgr) { deferred.resolve(mgr); } );
	} );
	return deferred.promise;
};
EventSystem.prototype.emitterWork = function (rabbit, schemaMgr, url, callback) {
	this.Emitter(rabbit, schemaMgr, url).when(function (mgr) { callback(null, mgr) }).fail(function (err) { throw(err) })
}
EventSystem.prototype.Emitter = function (rabbit, schemaMgr, url, callback) {
	var deferred = Q.defer();
	if (callback) return this.emitterWork(rabbit, schemaMgr, url, callback);
	this.getConfig(url, function (err, emitterCfg) {
		if (err) return deferred.reject( err );
		if (! emitterCfg ) return deferred.reject( "no data returned for url " + url );
		if (! emitterCfg.exchange ) return deferred.reject( "no appropriate data returned for url, needs exchange " + url, emitterCfg );
		deferred.resolve(
			new Emitter(
				{ rabbit: rabbit
				, schemaMgr: schemaMgr
				, exchange: emitterCfg.exchange
				, routingKey: emitterCfg.routingKey
				} )
			); 
	} );
	return deferred.promise;
};
EventSystem.prototype.receiverWork = function (rabbit, schemaMgr, url, callback) {
	this.Receiver({ rabbit: rabbit, schemaMgr: schemaMgr, url: url}).when(function (rec) { callback(null, rec) }).fail(function (err) { throw(err) })
}
EventSystem.prototype.Receiver = function (rabbit, schemaMgr, url, callback) {
	var deferred = Q.defer();
	if (callback) return this.receiverWork(rabbit, schemaMgr, url, callback);
	this.getConfig(url, function (err, receiverCfg) {
		if (err) return deferred.reject( err );
		if (! receiverCfg ) return deferred.reject( "no data returned for url " + url );
		if (! receiverCfg.exchanges ) return deferred.reject( "no appropriate data returned for url, needs exchanges " + url, receiverCfg );
		deferred.resolve(
			new Emitter(
				{ rabbit: rabbit
				, schemaMgr: schemaMgr
				, exchanges: receiverCfg.exchanges
				, queues: receiverCfg.queues
				} )
			); 
	} );
	return deferred.promise;
};
EventSystem.prototype.tokenWork = function (url, callback) {
	this.TokenMgr(url).when(function (mgr) { callback(null, mgr) }).fail(function (err) { throw(err) })
}
EventSystem.prototype.TokenMgr = function (url, callback) {
	var deferred = Q.defer();
	if (callback) return this.tokenWork(url, callback);
	this.getConfig(url, function (err, tokenconfig) { 
			if (err) return deferred.reject(err);
			if (! tokenconfig ) return deferred.reject( "no data returned for url " + url );
			deferred.resolve(new TokenMgr(tokenconfig));
		} );
};

// load configuration 
EventSystem.prototype.getConfig = configAgent.getJSON;

