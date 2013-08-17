
var EventSystem = require('..');
var tokenMgr = new EventSystem.TokenMgr(
	{ "secret":"this isnt a secret.  this isnt even hidden.  Or private.  Its just not for you."
	, "lifetime":1000000
	} );

describe('the token manager', function () {
		it('makes a token properly', function () {
			expect(tokenMgr.marshal(
				{ authed: '1hgfclrh9h8izcy'
				, entity: '1hgfclrh9h8izcy'
				, type: 'member'
				, start:  1353357661
				, expire: 1354357661
				} )).toBe('1hgfclrh9h8izcy:1hgfclrh9h8izcy:member:1353357661:1354357661:c0c4920371088f09fab6b397a2e9d5c6');
		} )
} )

