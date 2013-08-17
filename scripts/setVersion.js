
function incBuild (version) {
	var pieces = version.split('-');
	if (pieces.length != 2) return version;
	pieces[1]++;
	return pieces.join('-');
}
if (!process.argv[2]) throw "file required";
if (!process.argv[3]) throw "version required";
require('fs').readFile( process.argv[2]
	, 'utf8'
	, function(err , data)
			{ console.log
				( JSON.stringify
					( JSON.parse(data)
					, function (key , value)
						{ 
							if (key == 'version') { return process.argv[3] }
							return value;
						}
					, 2
					)
				)
			} 
	);
