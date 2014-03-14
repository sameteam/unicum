/*
 * This is a sample of a config file for Redis.
 * For simplicity there are four local instances. 
 */

module.exports = {

	redis : {
		host : "127.0.0.1",
		port : 6379,
		password: ''
	},

	// we use the $ to indicate keys with the same name along the shards
	// seqname: "unicum-sequence",

	// 2011-12-13T00:01:00Z
	// epoch: 1323763260000,

	keyTypes : {

		index : 0, // multiple hash key
		sorted : 1
	// sorted set key

	},

	specialKeys : {

		/*
		 * index: keyType
		 * 
		 */

		users : 'index',
		usernames : 'index',
		emails : 'index',
		finder : 'sorted'
	},

	subKeys : {
		n : "name",
		c : "city",
		d: "data",
		e: "email",
		w: "website"
	}
};
