var http = require('http');

function Snarfer () {
	this.getJSON = function (url, cb) { // cb(err, data);
		var request = http.request(url, function (response) {
				var b = '';
				response.on('data', function (data) { b = b + data } );
				response.on('end', function () {
						try {
							cb(null, JSON.parse(b));
						} catch(err) {
							cb(err);
						}
					} );
			});
		request.end();
	};
}

module.exports = Snarfer;
