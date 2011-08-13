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
var UNASSIGNED = "nobody";
var CURRENT_USER = "me";

io.sockets.on('connection', function(socket) {
	
	io.sockets.emit('issues', issues);
	
	socket.on('user message', function(msg) {
		io.sockets.emit('user message', socket.nickname, msg);
	});
	
	socket.on('new issue', function(desc) {
		var newIssue = {
			id: issues.length+1,
			description: desc,
			creator: socket.nickname,
			assignee: UNASSIGNED,
			closed: false
		};
		issues.push(newIssue);
		io.sockets.emit('issue created', newIssue);
	});
	
	socket.on('assign issue', function(id, specifiedAssignee) {
		var assignee = specifiedAssignee;
		if (!specifiedAssignee || specifiedAssignee === CURRENT_USER) {
			assignee = socket.nickname;
		}
		issues[id-1].assignee = assignee; 
		io.sockets.emit('issue assigned', socket.nickname, id, assignee);
	});
	
	socket.on('close issue', function(id) {
		issues[id-1].closed = true;
		io.sockets.emit('issue closed', socket.nickname, id);
	});
	
	socket.on('update issue', function(id, props) {
		var issue = issues[id-1];
		delete props['id'];
		for (key in props) {
			issue[key] = props[key];
		}
		io.sockets.emit('issue updated', socket.nickname, id, props);
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