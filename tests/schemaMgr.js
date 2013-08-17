var MSM = require('../lib/MantaSchemaMgr');
var member = require('common-lib/util/manta_member.js');
var Q = require('q');
var mongoose = require('mongoose');
var util = require('util');

var schemaDefer = Q.defer();
var getSchema = schemaDefer.promise;

var msm = new MSM(
//	{ "schemaSchema": "/home/sbx/sbx.rabbitmq.current/schemata/JsonSchema.schema"
//	, "schemaDirectories": [ "/home/sbx/sbx.rabbitmq.current/schemata" ]
//	} );
	{ "schemaSchema": "/home/dihnen/RabbitMQ/schemata/JsonSchema.schema"
	, "schemaDirectories": [ "/home/dihnen/RabbitMQ/schemata" ]
	}, function (err, schema) {
		if (err) throw err;
		schemaDefer.resolve(schema);
	} );

console.log(msm);
var memberSchema = mongoose.Schema( { _id: { type: mongoose.Schema.Types.ObjectId } } );

mongoose.connect('mongodb://ecnext80.ecnext.com/mstest');
var connection = mongoose.connection;
var Member = mongoose.model( 'Member', memberSchema, 'mstest' );

mongoose.connection.db.command({'ping':1}, function (err, result) {
	console.log("ping good");
});

var g = 0;
var b = 0;
var cont = false;
connection.once('open', function () {
	console.log("connection open");
	getSchema.then( function (schema) {
		console.log("got schema");
		var proc = function () {
			console.log("already", g, b, g+b);
			var stream = Member.find({},
				{ unlid: false }	
				).skip(g+b).limit(100).lean().slaveOk().stream();
			stream.on('data', function (doc) {
				cont = true;
				var result = schema.get('Member3').validate(doc);
				if(result.valid) ++g
				else {
					console.log(doc, result, ++b);
				}
			} ).on('error', function (err) {
				throw err;
			} ).on('close', function () {
				if (cont) {
					cont = false;
					proc();
				};
			} );
		};
		proc();
	} ).done();
} );

/*{ "_id": true
	, "activated": true
	, "address_public": true
	, "alt_email": true
	, "alt_email_activated": true
	, "autoarchive_days" : true
	, "avatar_filename": true
	, "avatar_id": true
	, "bio": true
	, "bio_public": true
	, "certifications": true
	, "chamber_of_commerce": true
	, "company_address_public": true
	, "company_claim_agent": true
	, "company_claim_employee": true
	, "company_claim_owner": true
	, "company_details_public": true
	, "company_emid": true
	, "company_public": true
	, "company_upcid": true
	, "completion_percentage": true
	, "country": true
	, "display_name": true
	, "display_name_fmt": true
	, "email": true
	, "email_lc": true
	, "email_mantaview_sw": true
	, "email_other_sw": true
	, "email_overquota_sw": true
	, "email_public": true
	, "favorite_sites": true
	, "firstname": true
	, "firstname_lc": true
	, "hide_claimed_companies": true
	, "hide_public_profile": true
	, "intentions": true
	, "interests": true
	, "last_login_timestamp": true
	, "last_update_timestamp": true
	, "lastname": true
	, "lastname_lc": true
	, "legacy_userid": true
	, "linkedin_profile_public": true
	, "linkedin_profile_url": true
	, "links": true
	, "member_type": true
	, "middlename": true
	, "migration_timestamp": true
	, "migration_type": true
	, "n_active_uecps": true
	, "n_ate_questions": true
	, "n_cqa_answers": true
	, "n_cqa_questions": true
	, "n_flagged_cqa_answers": true
	, "n_flagged_cqa_questions": true
	, "n_unread_messages": true
	, "namesuffix": true
	, "no_affiliation_reason": true
	, "opt_out_manta_events": true
	, "phone": true
	, "phone_public": true
	, "pm_notify": true
	, "private_browsing_mode": true
	, "promote_my_profile": true
	, "public_subid": true
	, "quotes": true
	, "reg_learned_about_manta": true
	, "reg_referer_id": true
	, "reg_rl": true
	, "register_ip": true
	, "register_timestamp": true
	, "role1": true
	, "role2": true
	, "role3": true
	, "role_function_1": true
	, "role_function_2": true
	, "role_owner_flag": true
	, "role_position": true
	, "roles_public": true
	, "screenname": true
	, "skills": true
	, "social_login_site": true
	, "social_profiles": true
	, "state": true
	, "status": true
	, "treatment": true
	, "twitter_public": true
	, "twitter_screen_name": true
	, "unlid": true
	, "url_slug": true
	, "user_password": true
	, "websites_public": true
	}

*/



