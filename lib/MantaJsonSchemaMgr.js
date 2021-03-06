
// basic imports
var events = require('events');
var fs = require('fs');
var amqp = require('amqp');
var Schema = require('./MantaJsonSchema');
var roottype = {};

function MantaJsonSchemaMgr (config) {
	this.config = config;
	return this;
}

MantaJsonSchemaMgr.prototype.schema = function ( name, cb ) {
	if (this.schemata[name]) cb( this.schemata[name] );
	this.loadSchemata(this.config, function () { 
		cb(this.schemata[name]);
	} );
};

MantaJsonSchemaMgr.prototype.schemata = {};

MantaJsonSchemaMgr.prototype.loadJSONFile = function ( file, cb ) {
	var self = this;
	fs.readFile(file,function(err,data) {
		console.log("read file " + file);
		if(err) throw err;
		// Load data file
		try { cb (null, JSON.parse(data), file) }
		catch (e) { cb(e); }
	} );
}

MantaJsonSchemaMgr.prototype.makeSchema = function ( source, file ) {
	// insert name if its missing
	if (typeof source.name == "undefined") {
		var endof = file.substr(file.lastIndexOf('/')+1);
		source.name = endof.substr(0, endof.lastIndexOf('.schema'));
	}
	return self.prototype.schemata[source.name] = new Schema ( source );
};

MantaJsonSchemaMgr.prototype.loadSchemata = function (configdata, cb) {
	var self = this;
	async.series(
		// first load the meta schema
		[ function (scb) {
				if (configdata.schemaSchema) {
					this.loadSchemaFromFile
						( configdata.schemaSchema
						, function (schemaschema) {
								this.schemaschema = schemaschema;
							}
						);
				} else { scb() };
			}
		// then load the rest of the schemas
		, function (scb) {
				// in parallel, all of the directories
				async.parallel( configdata.schemaDirectories.map( function (directory) {
						return function (outerpcb) {
								fs.readdir( directory, function ( err, files ) {
										if (err) outerpcb(err);
										// in parallel, all of the files
										// that end with .schema
										async.parallel( files.grep( function (file) {
													return file.substr(-7) == '.schema';
												}).map( function (file) {
													return function (innerpcb) {
															self.loadJSONFile(
																( directory + '/' + file
																, function (prospective, file ) {
																		try {
																			self.schemaschema.validate(prospective);
																			// store it in our index
																			innerpcb(null, self.makeSchema ( data , file ) );
																		} catch (e) {
																			innerpcb(e);
																		}
																	}
																) );
														};
												})
											, function (err, collection) {
													outerpcb(err, collection);
												}
											);
									} );
							}
					} ) 
					, function (err) {
						scb(err);
					} );
			}
		], function (err) {
				cb();
			} );
};

module.exports = MantaJsonSchemaMgr;


