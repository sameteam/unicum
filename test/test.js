
unicum = require("../lib/unicum").init(require('../conf/unicum-config').config);

//console.log(JSON.stringify(require('../conf/unicum-config').config,null,4));
unicum.generate(1,function (val) {
	console.log(val);
	console.log(unicum.getTime(val), unicum._epoch);
});
