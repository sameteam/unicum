var a = {
	key : "bibitone",
	username : "biti",
	password : ["tone","tup"],
	status : [{
		location : 6,
		token : true
	},{
		location : 8,
		token : false
	}
	],
	email : "biti@tone.com",
	picture : "csacsa",
	name : "nome"
};

var f = {
	email : 1,
	status : {
		token : 1
	},
	password : 1
};

var unicumConfig = require("../sameteam/app/conf/unicum-config.js").config;
var Unicum = require("./lib/unicum").init(unicumConfig);

var b = Unicum.minify(a, f);
console.log(b);
//console.log(Unicum.maxify(b, "email,status".split(",")));