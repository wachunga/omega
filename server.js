var http = require('http'),
	io = require('socket.io');
    //_ = require('underscore');

var PORT = 1337;

var server = http.createServer(function (request, response) {
	response.writeHead(200, {'Content-Type': 'text/plain'});
	response.end('Ω online\n');
});
server.listen(PORT, "127.0.0.1");

console.log('Server running at http://127.0.0.1:' + PORT);
var socket = io.listen(server);
socket.on('connection', function (client) {
	client.on('message', function (data) {
		console.log(new Date() + " - Message: " + JSON.stringify(data));
		socket.broadcast(data);
	});
	client.on('disconnect', function() {});
});