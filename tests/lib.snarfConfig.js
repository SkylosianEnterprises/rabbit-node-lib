require('rrcf');
describe('my config snarfer', function () {
		it ('can get the localhost 3000 config', function (done) {
			var SNARF = require('../lib/snarfConfig');
			var s = new SNARF();
			s.getJSON('http://localhost:3000/schema', function (j) {
				expect( j.schemaSchema ).toEqual('/home/sbx/sbx.rabbitmq.current/schemata/JsonSchema.schema');
				done();
				} );
			} );
});
