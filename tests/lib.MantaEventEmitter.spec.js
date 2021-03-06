var util = require('util')
var Emitter = require('../lib/MantaEventEmitter');
var Rabbit = require('../lib/MantaRabbitMQ');
var Schema = require('../lib/MantaJsonSchema');
var Message = require('../lib/MantaMessage');
var async = require('async');
var os = require('os');

var mr = function () {
	this.allDone = function () {};
};
var msm = function () {
};
msm.prototype.message = function (type, data, validOnly) {
	var m = new Message( { type: type, message: data , throwOnInvalid: validOnly, schema: new msm().get() } );
	return m;
};

msm.prototype.get = function ( type ) {  return new Schema({ eventGroup:'testgroup', type:'object', properties:{'dog':{type:"string", "enum":["woof"]}}}) };

var skma = new msm;

var tester = new Emitter(
		{ schemaMgr: skma
		, exchange: "TransitionalTestExchange"
		, routingKey: "testing"
		, rabbit: new Rabbit(
			{ connection: { "url":"amqp://localhost" }
			, exchanges:
				[ { "name":"TrasitionalTestExchange"
					, "type":"topic"
					, "passive": false
					, "durable": false
					, "autoDelete": true
					}
				]
			} )
		} );


describe("the emitter" , function () {
		it( "should throw according to data", function () {
			expect( function () { skma.message( 'ClaimActivity', { "dog":"cat"  }, true) } ).toThrow();
		} );
		it( "should not throw according to data", function () {
			expect( function () { skma.message( 'ClaimActivity', { "dog":"woof" } ) } ).not.toThrow();
		} );
		it( "should call trigger a listen", function (done) {
			tester.rabbit.on('TransitionalTestExchange', function(key, data, headers) {
				expect( key ).toBe( "testing" );
				expect( data ).toBe( '{"dog":"woof"}' );
				done();
			} );
			tester.send(skma.message( 'ClaimActivity', { "dog":"woof" } ) );
		} );
		it( "should encode without loss", function () {
			expect(JSON.parse(skma.message( 'ClaimActivity', { "dog":"woof"  } ).encode())).toEqual( { dog:'woof' } );
		} );
		it( "should encode a full event", function () {
			var masterevent = tester.envelope( { payload: skma.message( 'ClaimActivity', { "dog":"woof"  } ), actor: { id: 'dog', type:'canine'} } )
			var clone = JSON.parse(masterevent.encode());
			delete clone.process;
			delete clone.uuid;
			delete clone.eventTimestamp;
			expect( clone ).toEqual( { context : 'nodejs Event Emitter library', hostname : os.hostname(), payload : '{"dog":"woof"}', actor : { id : 'dog', type : 'canine' }, sourceIdentity : { id : 'dog', type : 'canine' }, eventType : 'ClaimActivity', eventGroup : 'testgroup' }  );
		} );
		it( "should encode a full event automatically messagizing the payload", function () {
			var masterevent = tester.envelope( { eventType: 'ClaimActivity', payload: { "dog":"woof"  }, actor: { id: 'dog', type:'canine'} } )
			var clone = JSON.parse(masterevent.encode());
			delete clone.process;
			delete clone.uuid;
			delete clone.eventTimestamp;
			expect( clone ).toEqual( { context : 'nodejs Event Emitter library', hostname : os.hostname(), payload : '{"dog":"woof"}', actor : { id : 'dog', type : 'canine' }, sourceIdentity : { id : 'dog', type : 'canine' }, eventType : 'ClaimActivity', eventGroup : 'testgroup' }  );
		} )
} );

setTimeout(function () { tester.rabbit.allDone(); }, 250);

//eventMgr.emitter('TransitionalTestExchange', function (emitter) {
//		emitter.envelope( { actor: {id: 1, type: '45'}, payload: emitter.message('ClaimActivity') } ).emit('testy.test');






