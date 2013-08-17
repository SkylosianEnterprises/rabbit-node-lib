/* 
 *
 *
 */

var Q = require('q');
var Emitter = require('lib/Emitter');

function EventConnection ( config ) {
}

module.exports = EventConnection;

EventConnection.SchemaMgr = function (config) {
	this.validate = function () { return true; }
}

EventConnection.Emitter = Emitter;

