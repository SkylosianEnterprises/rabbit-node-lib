/* 
 *
 *
 */

var Q = require('q');
var Emitter = require('./lib/Emitter');
var Rabbit = require('./lib/Rabbit');

function EventConnection ( config ) {
}

module.exports = EventConnection;

EventConnection.SchemaMgr = function (config) {
	this.validate = function () { return true; }
}

EventConnection.Emitter = Emitter;
EventConnection.Rabbit = Emitter;

