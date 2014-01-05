/*!
 * Unicum version 0.0.1
 * Forked from Shard-js version 0.2.11
 * January 5th, 2014
 * (c) Francesco Sullo, francesco@sameteam.co
 * Released under MIT Licence
 */
var Class = require('class-js');

module.exports = Class.subclass({

    // the redis db client:
    _redis: require('redis'),

    _keystr: "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",

    // seconds from January 5th 2014
    _epoch: 1388904894,

    keyTypes: {},
    specialKeys: {},
    _keyTypeIndexes: {},
    _subKeys: {},
    _subKeysInverse: {},

    init: function (config) {

        var hr = {};
        
        this._strlen = this._keystr.length;
        this._zeros = 2,
        this._maxKey = Math.pow(this._strlen, this._zeros),
        
    	this._redisPort = config.redis.port || 6379;;
        this._redisHost = config.redis.host || "127.0.0.1";
        this._redisPassword = config.redis.password;

        if (config.epoch && config.epoch < (Date.now()/1000))
            this._epoch = config.epoch;
        
        // set special keys (indexes, etc.)
        var keyTypes = config.keyTypes || {}, 
        	max = this._maxKey;

        // default key
        keyTypes['$DEF'] = max - 1;
        this._keyTypeIndexes[(max - 1).toString()] = '$DEF';

        for (j in keyTypes)
            if (!this.addKeyType(j, keyTypes[j]))
                console.log("Error creating keytype " + j);

        var specialKeys = config.specialKeys || {};
        for (j in specialKeys)
            if (!this.addSpecialKey(j, specialKeys[j]))
                console.log("Error creating special key " + j);

        if (config.subKeys)
            for (var j in config.subKeys) {
                this._subKeys[j] = config.subKeys[j];
                this._subKeysInverse[config.subKeys[j]] = j;
            }
//         console.log(JSON.stringify(this.keyTypes));
//         console.log(JSON.stringify(this.specialKeys));
//         console.log(JSON.stringify(this._keyTypeIndexes));
    },

    addKeyType: function (key, val) {
        /*
         * return: 1 ok -1 already exists 0 error
         */
        for (var j in this.keyTypes)
            if (j == key)
                return -1;
            else if (this.keyTypes[j] == val)
            return 0;
        this.keyTypes[key] = val;
        this._keyTypeIndexes[val.toString()] = key;
        return 1;
    },

    subKey: function (subkey) {
    	// TODO if the keys doesn't exist it should create a new one and adding it to the config file
    	// using something like JSON.stringify(jsonObject, null, 4)
        return (this._subKeys[subkey] || subkey);
    },

    subKeyInverse: function (subkey) {
        return (this._subKeysInverse[subkey] || subkey);
    },

    minify: function (hash) {
        /*
         * Calling .translate({name:"John",city:"London"}) return something like
         *
         * {n:"John",c:"London"}
         *
         * using the subKeys set in the config file.
         *
         */
        var ret = {};
        for (var j in hash)
            ret[this.subKey[j]] = hash[j];
        return ret;
    },

    maxify: function (hash) {
        /*
         * Does the opposite of .minify 
         * Good to understand what a minified hash means
         */
        var ret = {};
        for (var j in hash)
            ret[this.subKeyInverse[j]] = hash[j];
        return ret;
    },

    addSpecialKey: function (key, val) {
        /*
         * return: 1 ok -1 already exists 0 error
         */
        for (var j in this.specialKeys)
            if (j == key)
                return -1;
        var kt = this.keyTypes[val];
        if (typeof kt !== 'number')
            return 0;
        this.specialKeys[key] = this.customKey(0, 0, kt, key);
        return 1;
    },

    _zeroFill: function (n, z) {
        var l = z || this._zeros,
            r = n.toString(),
            d = l - r.length;
        for (var j = 0; j < d; j++)
            r = "0" + r;
        return r;
    },

    isInt62: function (s) {
        var re = new RegExp("[^" + this._keystr + "]");
        if (!s || re.test(s))
            return false;
        return true;
    },

    fixInt62: function (s) {
        var re = new RegExp("[^" + this._keystr + "]*", 'g');
        return (s || '').toString().replace(re, '');
    },

    toInt62: function (x, z) {
        if (!x)
            return (z ? this._zeroFill(0, z) : "0");
        var ret = "";
        while (x > 0) {
            var p = x % this._strlen;
            ret = this._keystr.substring(p, p + 1) + ret;
            x = Math.floor(x / this._strlen);
        }
        if (z)
            ret = this._zeroFill(ret, z);
        return ret;
    },

    fromInt62: function (x) {
        if (!x)
            return 0;
        var ret = 0;
        for (var j = x.length; j; j--) {
            var p = -1 * (j - x.length);
            ret += this._keystr.indexOf(x.substring(p, p + 1)) * Math.pow(this._strlen, j - 1);
        }
        return ret;
    },

    _nullfunc: function () {},

    ts: function (d, noInt62) {
        // timestamp in seconds starting since our epoch.
    	// Consider that this value is not based on the Redis time
    	// but on the OS time. If Redis is on a different server they
    	// could be different.
        if (d && typeof d != 'number')
            d = d.getTime();
        var ret = Math.floor((d ? d : Date.now()) / 1000) - this._epoch;
        return noInt62 ? ret : this.toInt62(ret);
    },

    linuxTs: function (d, noInt62) {
        // from a relative timestamp to a Unix timestamp
        return d ? (noInt62 ? d : this.fromInt62(d)) + this._epoch : -1;
    },

    generate: function (ktype, quantity, cb) {
        var thiz = this,
        	rc = thiz._getClient();
        ktype = typeof ktype == 'number' && ktype > -1 && ktype < thiz._maxKey - 1 ? ktype : thiz._maxKey - 1;
        if (!cb) {
        	cb = quantity;
        	quantity = 1;
        }
        callback = cb || thiz._nullfunc;
        
        rc.time(function (err, time) {
        	
        	if (err != null)
        		callback(null);
        	else
	        	rc.incr("unicum$sequence$"+ktype,function (err2, variant) {
		            
	        		if (err2 != null)
	            		callback(null);
	            	else {
		        		var sec = time[0] - thiz._epoch,
			                microsec = time[1],
			                variant62 = thiz.toInt62(variant % this._strlen);
			            
			            
			            
			            var sec62 = thiz.toInt62(sec),
				            microsec62 = thiz.toInt62(microsec, 4),
				            ktype62 = thiz.toInt62(ktype, 2);
			            if (quantity == 1) {
			                var key = sec62 + microsec62 + variant62 + ktype62;
			                callback(key);
			            } else {
			                var keys = [],
			                	ms = time[1];
			                for (var j = 0; j < quantity; j++) {
			                    keys[j] = sec62 + thiz.toInt62(ms, 4) + variant62 + ktype62;
			                    ms++;
			                    if (ms == 1000000) {
			                        ms = 0;
			                        sec62 = thiz.toInt62(++sec);
			                    }
			                }
			                callback(keys);
			            }
	            	}
		        });
        });
    },

    _copy: function (x) {
        var ret = {};
        for (var j in x)
            ret[j] = x[j];
        return ret;
    },

    _getClient: function () {
        var rc = this._redis.createClient(this._redisPort, this.redisHost);
        if (this._redisPassword)
            rc.auth(this._redisPassword, function () {});
        rc.on('error', function (err) {
            console.log('Error connecting to Redis: ' + err);
        });
        return rc;
    },

    customKey: function (sec, microsec, ktype, suffix) {
    	var key = (sec ? this.toInt62(sec) : "") 
        	+ (sec || microsec ? this.toInt62(microsec, 4) + "0" : "")
        	+ this.toInt62(ktype, 2) 
        	+ (suffix ? '$' + this.fixInt62(suffix) : '');
        return key;
    },

    _arrange: function (k) {
        var key = (k || '').toString().split("$")[0],
            l = key.length,
        	ktype = this.fromInt62(key.substring(l - 2, l));
        if (this._keyTypeIndexes[ktype]) {
            var sec32 = key.substring(0, l - 5),
	        	microsec32 = key.substring(l - 5, l - 3),
	        	variant62 = key.substring(l - 3, l - 2);
            return {
                sec: sec32 ? this.fromInt62(sec32) : 0,
                microsec: microsec32 ? this.fromInt62(microsec32) : 0,
        		variant: this.fromInt62(variant62),
                ktype: ktype,
                suffix: key[1] || ''
            };
        }
        else
            return null;
    },

    changeKeyType: function (key, newtype) {
        if (!key)
            return null;
        if (typeof newtype != 'number')
            newtype = this.keyTypes[newtype]
            // Maybe if the keyType doesn't exist it should return an error.
            // Any suggestions?
            || this._maxKey - 1;
        return key.substring(0, key.length - 2) + this.toInt62(newtype, 2);
    },

    getType: function (key, verify) {
        var k = this._arrange(key);
        // k &&
        // console.log(this._keyTypeIndexes[k.t],"this._keyTypeIndexes[k.t]");
        if (k)
            return this._keyTypeIndexes[k.ktype];
        return null;
    },

    getTime: function (key, complete) {
    	var k = this._arrange(key);
        if (k.sec)
        	return k.sec + this._epoch;
        return this._epoch;
    },

    run: {}

});