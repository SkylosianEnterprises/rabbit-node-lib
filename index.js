/* 
 *
 *
 */

require('q');

function EventConnection ( config ) {

}

module.exports = EventConnection;

EventConnection.schemaMgr = function (config) {
	this.validate = function () { return true; }
}



