if (!process.argv[2]) throw "file required";
require('fs').readFile( process.argv[2]
	, 'utf8'
	, function(err , data) { 
			var d = JSON.parse(data);
			for (var key in d) {
				if (key == 'name') { console.log(d[key]); }
			}
		}
	);
