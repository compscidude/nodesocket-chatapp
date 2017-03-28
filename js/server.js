

// Basic set up configuration for socket.io
var express = require('express');
var io = require('socket.io')();
var app = express();
var http = require('http');
var _ = require('underscore');
var server = http.createServer(app);
io.listen(server);


app.use(express.static(__dirname)); // we need this to serve files

app.get('/', function(req, res){
	res.sendFile('index.html');
});

// ===========   client stats  ============= 
var userCount = 0;

// ========= Default Chat Rooms ============ 
var chatRooms = ['Lobby', 'chat1', 'chat2', 'chat3'];

// connection is established with a client
io.on('connection', function(socket){
	console.log("a user connected !")
	userCount += 1;

	// send the server information (users online, users count, chatrooms) upon signing in.
	socket.on('new username', function(username){
			console.log("new user with name : " + username);
			var user = { 'id' : socket.id, 'name': username};
			// smarter way is to directly store information inside the socket
			// eg, socket.name = username; and we can reference this later use
	
			io.emit('users count', userCount);
			io.emit('chatrooms', chatRooms);

			socket.room = 'Lobby';
			socket.join('Lobby');
			socket.name = username;

			socket.emit('currentRoom', socket.room);

			var users = findClientsSocketByRoomName(socket.room);
			var roominfo = { 'room' : socket.room, 'users' : users};
			io.sockets.in(socket.room).emit('update chatroom', roominfo);
	});


	socket.on('disconnect', function(){
		console.log("user disconnected");
		var roomname = socket.room;
		socket.leave(socket.room); 
		userCount -= 1;

		// remove the disconnected user from our users online list
		var users = findClientsSocketByRoomName(roomname);
		io.emit('users count', userCount);
		io.emit('users online', users);
	});

	socket.on('chat message', function(user, msg){
		console.log(user + ' sent us the message: ' + msg);
		
		// transfer this message to every client in the same room as our sender
		socket.broadcast.to(socket.room).emit('chat message', user, msg);
	});

	socket.on('private message', function(targetId, msg){
		console.log("we got a private. " + socket.id +" to " + targetId);
		// check if the targetId is online
		if (io.sockets.connected[targetId]){
			io.to(targetId).emit('recieve private msg', socket.name, msg);
		}
	});

	socket.on('create chatroom', function(roomname){
		console.log("creating a new chatroom ... " + roomname);
		var exists = _.contains(chatRooms, roomname);

		// if the room does not exist, then we create a new room with this name
		if (!exists){
			chatRooms.push(roomname);
			io.emit('chatrooms', chatRooms);
		}
	});

	socket.on('join chatroom', function(roomname){
	
		// The client now joins a different room.
		socket.leave(socket.room);
		socket.join(roomname);
		socket.room = roomname;
		
		// retrieve users who are in this new chatroom
		var users = findClientsSocketByRoomName(socket.room);
		var roominfo = { 'room' : socket.room, 'users' : users};
		io.sockets.in(socket.room).emit('update chatroom', roominfo);
	});

});

server.listen(3000, function(){
	console.log('server established, listening to port 3000');
});

// helper function to find all the users in a given room
function findClientsSocketByRoomName(roomname) {
var res = [],
    room = io.sockets.adapter.rooms[roomname];
	if (room) {
	    for (var id in room) {
	    	// we are using default namespace, but we can add a second parameter to our function
	    	// to work with different nsp down the road.
	 		var ab = io.sockets.adapter.nsp.connected[id];
	 		// We choose to store our user information in this structure, you may choose to do so differently depending on
	 		// which information you need.
	 		var user = {'id': ab.id, 'name': ab.name};
	    	res.push(user);
	    }
	}
	return res;
}
