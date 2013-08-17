var EventSystem = require('..');
var tokenMgr = new EventSystem.TokenMgr(
	{ "secret":"this isnt a secret.  this isnt even hidden.  Or private.  Its just not for you."
	, "lifetime":1000000
	});

describe('the token manager', function () {
	it('delivers a valid token', function () {
		expect(tokenMgr.now()).toMatch('\\d+');
		expect(tokenMgr.blessThis('MD1', 'MD2', 'system')).toMatch('MD1:MD2:system:\\d+:\\d+:\\w+$');
	} );
} );
