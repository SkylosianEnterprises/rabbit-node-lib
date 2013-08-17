var util = require('util');
var amqp = require('amqp');

function Rabbit ( options ) {
}
util.inherits(Rabbit, EventEmitter);

module.exports = Rabbit;

