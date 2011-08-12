var http = require('http'),
	sio = require('socket.io'),
	static = require('node-static');

var PORT = process.argv[2];

var fileServer = new static.Server('./public');
var server = http.createServer(function (request, response) {
    request.addListener('end', function () {
        fileServer.serve(request, response);
    });
});
server.listen(PORT);

console.log('Server running at http://127.0.0.1:' + PORT);

var io = sio.listen(server);
var nicknames = {};
var issues = [];

io.sockets.on('connection', function(socket) {
	
	io.sockets.emit('issues', issues);
	
	socket.on('user message', function(msg) {
		io.sockets.emit('user message', socket.nickname, msg);
	});
	
	socket.on('new issue', function(desc) {
		var newIssue = {
			id: issues.length,
			description: desc,
			creator: socket.nickname,
			assignee: null,
			closed: false
		};
		issues.push(newIssue);
		io.sockets.emit('issue created', newIssue);
	});
	
	socket.on('assign issue', function(id, assignee) {
		issues[id].assignee = assignee || socket.nickname;
		io.sockets.emit('issue assigned', socket.nickname, id, issues[id].assignee);
	});
	
	socket.on('close issue', function(id) {
		issues[id].closed = true;
		io.sockets.emit('issue closed', socket.nickname, id);
	});

	socket.on('nickname', function(nick, fn) {
		if (nicknames[nick]) {
			fn(true);
		} else {
			fn(false);
			nicknames[nick] = socket.nickname = nick;
			socket.broadcast.emit('announcement', nick + ' connected');
			io.sockets.emit('nicknames', nicknames);
		}
	});

	socket.on('disconnect', function() {
		if (!socket.nickname) {
			return;
		}

		delete nicknames[socket.nickname];
		socket.broadcast.emit('announcement', socket.nickname + ' disconnected');
		socket.broadcast.emit('nicknames', nicknames);
	});
});