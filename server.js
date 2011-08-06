// Lifted straight from https://gist.github.com/701407 without shame
var http	= require("http"),
    static	= require('node-static'),
    server	= new static.Server();

http.createServer(function(req, res) {
	req.addListener('end', function() {
		server.serve(req, res);
	});
}).listen(9001);
