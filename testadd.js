var http = require('http');
var util = require('util');
//var host = 'ecnext81.ecnext.com';
var host = process.argv[2];
if (!host) throw process.argv;
req = http.request( 
		{ host: host
		, port: 8240
		, method: 'PUT'
		, path: '/exchange'
		}, function (res) {
		var d = '';
		res.on('data', function  (data) { d = d + data } );
		res.on('end', function  (data) { 
			console.log(d);
setTimeout(function () {
		ver = http.request(
			{ host: host
			, port: 8240
			, method: 'GET'
			, path: '/health-check'
			}, function (res) {
					var d = '';
					res.on('data', function  (data) { d = d + data } );
					res.on('end', function  (data) { 
							console.log('RESPONSE');
							console.log(d);
						} );
			} );
//		ver.write(JSON.stringify({nothing:'valid'}));
		ver.end();
	}, 500);
			} );
		} );
req.write(JSON.stringify(
	{ url: 'amqp://ecnext74.ecnext.com:5672'
  , "name": 'TestVanishingExchange'
  , "type": 'direct'
  , "passive": false
  , "durable": false
	, "autoDelete": true
  }
));
req.end();




