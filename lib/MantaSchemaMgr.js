var Schema = require('./MantaJsonSchema');
var Message = require('./MantaMessage');
var async = require('async');
var fs = require('fs');
var util = require('util');

function SchemaMgr ( config, callback ) {
	var self = this;
	this.loadedSchemaStore = {};
	if (!config.schemaSchema) throw "Configuration must have schemaSchema in it ("+util.inspect(config)+")";
	if (!config.schemaDirectories) throw "Configuration must have schemaDirectories in it ("+util.inspect(config)+")";
	async.series(
		[ function (sercb) {
				self.loadSchemaFile(config.schemaSchema, sercb);
			}
		, function (sercb) {
				async.map( config.schemaDirectories, function (directory, mapcb) {
						fs.readdir( directory, function ( err, files ) {
								if (err) console.log("err: " + err);
								if (err) return mapcb(err);
								async.map( files.filter( function (file) {
											return file.substr(-7) == '.schema';
										}), function (file, inmapcb) {
												self.loadSchemaFile([directory, file].join('/'), inmapcb );
										}, function (error, data) {
												if (error) console.log("schema inner map error", error);
												mapcb(error, data);
										} );
								});
					}
				, function (error, data) {
						if (error) console.log("schema outer map error", error);
						sercb(error, data);
					} );
			}
		]
	, function (error, data) {
			if (error) {
				console.log("schema series error", error);
				if (callback) return callback(error);
				throw error;
			}
			if (callback) return callback(null, self);
	} );
	return this;
}

SchemaMgr.prototype.message = function (type, message, validOnly, emitter) {
	var schema = this.get(type);
	if (typeof message == 'string') {
		message = JSON.parse(message);
	}
	return new Message(
		{ schema: schema
		, type: type
		, message: message
		, throwOnInvalid: validOnly
		, emitter: emitter
		} );
};

SchemaMgr.prototype.get = function (type) {
	var schema = this.loadedSchemaStore[type];
	if (!schema) throw('no such type ' + type + ' in ' + JSON.stringify(Object.keys(this.loadedSchemaStore)) );
	return schema;
};


SchemaMgr.prototype.loadSchemaFile = function ( file, cb ) {
	var self = this;
	fs.readFile(file,function(err,data) {
		if(err) console.log('fs readfile error', err);
		if(err) return cb(err);
		// Load data file
		secondName = file.substr(file.lastIndexOf('/')+1);
		secondName = secondName.substr(0, secondName.lastIndexOf('.schema'));
		self.loadSchemaData(JSON.parse(data), secondName, cb);
		} )
}

SchemaMgr.prototype.loadSchemaData = function ( data, backupname, cb ) {
	var schema = new Schema(data);
	var schemaName = schema.name;
	if (typeof schema.name == "undefined") schemaName = backupname;
	this.loadedSchemaStore[schemaName] = schema;

	var result = schema.validate();
	if (result.valid) return cb( null, schema );
	console.log('invalid schema error for '+backupname, result);
	result.whichSchema=backupname;
	cb( result, schema );
};

module.exports = SchemaMgr;
