var util = require('util');
var amqp = require('amqp');
var EventEmitter = require('events').EventEmitter;

function Rabbit ( options ) {
}
util.inherits(Rabbit, EventEmitter);

module.exports = Rabbit;

