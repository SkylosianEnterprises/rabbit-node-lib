
// basic imports
var events = require('events');
var fs = require('fs');
var amqp = require('amqp');
var myvalidator = require('json-schema');
var roottype = {};

var util = require('util');
var Schema = function (schemasource) {
	this.eventGroup = schemasource.eventGroup || 'UNDEFINED_IN_SCHEMA_DEFINITION-FIX';
	this.validate = function (content) {
		return myvalidator.validate( content, schemasource );
	};
}

module.exports = Schema;
