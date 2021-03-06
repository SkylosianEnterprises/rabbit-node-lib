var async = require('async');
var fs = require('fs');
var util = require('util');
var crypto = require('crypto');

function TokenMgr ( config, callback ) {
	this.getSecret = function () { return config.secret };
	this.getLifetime = function () { return config.lifetime };
	return this;
}

TokenMgr.prototype.blessThis = function ( actor, source, type ) {
		return this.marshal(
			{ authed: actor
			, entity: source
			, type: type
			, start: this.now()
			, expire: this.getExpireTime(this.now())
			} );
}

TokenMgr.prototype.generateToken = function (request, authed, what) {
	if (this.session(request).isValid()) {
		return this.marshal(
		{ authed: authed
		, entity: what.id
		, type: what.type
		, start: this.now()
		, expire: this.getExpireTime(this.now())
		} );
	}
}

TokenMgr.prototype.session = function (request) {
	return this.extractSession(request.cookies.member_session);
}

TokenMgr.prototype.extractSession = function (cookie) {
	// this should return an object with isValid() and sub_id() methods
	throw "TODO - not implimented - what is the structure and secret of a session?"
}

TokenMgr.prototype.tokenForThis  = function (what) {
	throw "not implimented - need session validation in nodejs first";
	this.generateToken(this.session.sub_id, what);
}

TokenMgr.prototype.getExpireTime = function (referencingWhen) {
	return referencingWhen + this.getLifetime();
}

TokenMgr.prototype.validateEvent = function (event, cb) {
	if (! event.sourceIdentity ) throw "Need actor to validate";
	if (! event.actor ) throw "Need sourceIdentity to validate";
	this.validate
		( event.sourceIdentity.token
		, { forWhat: event.sourceIdentity.id
			, forType: event.sourceIdentity.type
			, byWho: event.actor.id
			}
		, cb
		);
}

TokenMgr.prototype.now = function () {
	return new Date().getTime(); // now
}

TokenMgr.prototype.validate = function (token, options, cb) {
	var error = [];
	if (! token) {
		error.push({ CODE: 'BLANKTOKEN', err: 'token was blank' })
		return cb(error);
		return error;
	}
	var tokenfields = this.unmarshal(token)
	var withsecret = this.marshal( tokenfields ) 
	if (token != withsecret)
		error.push({ CODE: 'CORRUPT', err: 'token failed secret check', mismatch: withsecret })
	var time = this.now(); // default now
	if (options.atTime) time = options.atTime; // otherwise when specced
	if (time < tokenfields.start )
		error.push({ CODE: 'TOOEARLY', err: 'token not yet valid', now: time, start: tokenfields.start })
	if (time > tokenfields.expire)
		error.push({ CODE: 'TOOLATE', err: 'token has expired', now: time, expire: tokenfields.expire })
	if (options.forType && tokenfields.type != options.forType)
		error.push({ CODE: 'TYPEWRONG', err: 'token is not for this type', tokenType: tokenfields.type, sourceType: options.forType })
	if (options.forWhat && tokenfields.entity != options.forWhat)
		error.push({ CODE: 'IDWRONG', err: 'token is not for this id', tokenId: tokenfields.entity, sourceId: options.forWhat })
	if (options.byWho && tokenfields.authed != options.byWho)
		error.push({ CODE: 'NOTYOURS', err: 'token is not for this actor', tokenId: tokenfields.authed, actorId: options.byWho })
	if (cb && error.length > 0) cb(error);
	if (cb) cb();
	return error;
}

TokenMgr.prototype.marshal = function (d) {
	var common = 
		[ d.authed
		, d.entity
		, d.type
		, d.start
		, d.expire
		].join(':')
	var md5 = crypto.createHash( 'md5' )
	md5.update( [ common, (d.secret || this.getSecret()) ].join(':'), 'ascii' )
	var hash = md5.digest('hex')
	return [ common, hash ].join(':')
}

TokenMgr.prototype.unmarshal = function (token) {
	var d = {};
	var a = token.split(/:/);
	d.authed = a.shift();
	d.entity = a.shift();
	d.type = a.shift();
	d.start = a.shift();
	d.expire = a.shift();
	d.digest = a.shift();
	return d;
}


module.exports = TokenMgr;
