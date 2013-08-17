require('q');

function EventConnection ( config ) {

}

module.exports = EventConnection;

EventConnection.schemaMgr = function (config) {
	function schemaMgrMock () {
	};
	schemaMgrMock.prototype.validate = function () { return true; }
	return schemaMgrMock;
}



