
function incBuild (version) {
	var pieces = version.split('-');
	if (pieces.length != 2) return version;
	pieces[1]++;
	return pieces.join('-');
}
if (!process.argv[2]) throw "needs file to read";
require('fs').readFile( process.argv[2]
	, 'utf8'
	, function(err , data)
			{ var d = JSON.parse(data)
				for (var key in d) {
				 (function (key , value)
					{ if (key == 'version') { console.log(incBuild(value)); }
					})(key, d[key]);
				}
			}
	);
