var should = require('should');
var unicum = require("./lib/unicum")
	.init(require('./conf/unicum-config'));


unicum.generate(1,function (val) {
	val.should.equal
	console.log(val);
	console.log(unicum.getTime(val), unicum._epoch);
});

var a = {
	name: "John",
	city: "San Francisco",
	data: {
		email: "xxx@yyy.zz"
	}
};

var b = unicum.minify(a,"name,data".split(","));

console.log("If there are errors later, we have a problem :)")

b.n.should.equal("John");
b.should.not.hasOwnProperty("c");
b.d.should.hasOwnProperty("e");

var c = unicum.maxify(b);
c.should.hasOwnProperty("name");
