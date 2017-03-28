(function() {

    $(document).ready(function() {
        var username = prompt("Please enter your name");
        window.socket = io();
        // immediately trigger a username event so server can store this user in the array.
        window.socket.emit("new username", username);
        window.socket.on('chat message', function(user, msg) {
            window.chatView.recieveMessage(user, msg);
        });
        window.socket.on('users count', function(userCount) {
            window.sideBar.updateUserCount(userCount);
        });
        window.socket.on('users online', function(usersOnline) {
            window.sideBar.updateUsersOnline(usersOnline);
        });
        window.socket.on('channel users', function(users) {
            window.sideBar.updateChannelUsers(users);
        });

        window.socket.on('recieve private msg', function(from, msg) {
            window.chatView.recievePrivateMessage(from, msg)
        });
        window.socket.on('chatrooms', function(chatrooms) {
            window.sideBar.listChatrooms(chatrooms);
        });
        window.socket.on('update chatroom', function(roominfo) {
            window.sideBar.updateChatroom(roominfo);
        });
        // ========== chatView: update the chat message and listen to user input.
        // =========================================================================
        var chatView = Backbone.View.extend({
            el: $('#chatarea'),
            initialize: function() {
                this.userInput = $('#chat_input');
                this.userInput.focus();
            },
            events: {
                "keypress #chat_input": "checkMessage"
            },

            checkMessage: function(e) {
                if (e.keyCode == 13) {
                    this.sendMessage(username, this.userInput.val());
                }
            },
            sendMessage: function(user, msg) {
                // locally add it to our client's chat
                this.recieveMessage(user, msg, 1);
                // Send it to the server
                socket.emit('chat message', username, msg);
                this.userInput.val('');
                return false;
            },
            recieveMessage: function(user, msg, flag) {

                // keep the chat visible by scrolling to the latest message
                scrollDown('#chatmessages');
                // if flag is 1 then we append the message locally (this client wrote it)
                if (flag === 1) {
                    $('#chatmessages').append('<p class="msg clientmsg"> You: ' + msg + '</p>');
                    return;
                }
                // else we append it normally.
                $('#chatmessages').append('<p class="msg">' + user + ': ' + msg);
            },
            PrivateMessageSent: function(to) {
                $('#chatmessages').append('<p class="msg msgsent"> You sent a private message to: ' + to + '</p>');
            },
            recievePrivateMessage: function(from, msg) {
                // we can access both from.id and from.name if we wanted to add a reply system
                // for simplicity, we will add this private message to our chat window but in different font style and/or different font colour so its more readable (and also add flash notification for incoming messages)
                $('#chatmessages').append('<p class="pmsg"> Private message from ' + from + ' : ' + msg + '</p>');
            }
        }); // close our chatView
        // ============== SideBar: display active users in the channel / chatrooms
        // =========================================================================
        var sideBar = Backbone.View.extend({
            el: $('#sideBar'),
            initialize: function() {
                this.userCount = $('#userCount');
                this.userCount.text("Users online: ");
                this.newroom_input = $('#chatroom_input');
            },
            events: {
                "click #usersOnline li": "privateMessage",
                "click #chatRoomsList p": "joinChatroom",
                "keypress #chatroom_input": "createRoom"

            },
            updateUserCount: function(userCount) {
                var word = userCount > 1 ? 'users' : 'user';
                this.userCount.html('<p class="text-success">' + userCount + " " + word + " online </p>");
            },
            updateUsersOnline: function(usersOnline) {
                $("#usersOnline").html("");
                _.each(usersOnline, function(user) {
                    $('#usersOnline').append("<li div='user' id=" + user.id + " name='" + user.name + "'>" +
                        '<i class="icon-user"></i>' + user.name + '</li>');
                });
                scrollDown("#usersOnline");
            },
            // fill in the modal with data
            privateMessage: function(event) {
                var target = event.target;
                // create a modal to fill out private message form.
                var targetId = target.getAttribute('id');
                var targetName = target.getAttribute('name');
                // instantiate our modal and fill with correct values
                $('#msg_to_id').text(targetId);
                $('#msg_to').text(targetName);
                $('#msg_from').text("From: " + username);
                $('#myModal').modal({
                    'show': true
                });
            },
            createRoom: function(e) {
                if (e.keyCode == 13) {
                    var newroom = this.newroom_input.val();
                    this.newroom_input.val('');
                    // send the room information to the server
                    // [First append it to the room list]
                    scrollDown('#chatRoomsList');
                    socket.emit('create chatroom', newroom);
                }
            },
            joinChatroom: function(e) {
                var target = e.target;
                var roomName = target.innerHTML;
                socket.emit('join chatroom', roomName);
                // clear and refresh the chat text
                $('#chatmessages').html('');
            },
            listChatrooms: function(chatrooms) {

                $('#chatRoomsList').text('');
                _.each(chatrooms, function(chatroom) {
                    $('#chatRoomsList').append('<p>' + chatroom + '</p>');
                });
                scrollDown('#chatRoomsList');
            },
            updateChatroom: function(roominfo) {
                $('#channel').text(roominfo.room);
                // update the users so it displays people in same room
                this.updateUsersOnline(roominfo.users);
            }
        }); // close our sideBar view.
        // Some helper methods
        var scrollDown = function(div) {
            $(div).animate({
                scrollTop: $(div)[0].scrollHeight
            }, "fast");
        }
        // initialize our backbone views 
        window.chatView = new chatView();
        window.sideBar = new sideBar();
    }); // close our jquery $ on demand function.
    // Handle modal data when user clicks send button
    $('#send').click(function() {
        // Let's process the data here
        var targetId = $('#msg_to_id').text(); // The reciever socket id
        var targetName = $('#msg_to').text();
        var message = $('#privateMessage').val();
        // send the private message (attach a callback to this to get a response)
        socket.emit('private message', targetId, message);
        // Notify the sender that the message has been sent.
        window.chatView.PrivateMessageSent(targetName);
        // turn off the modal and clear the data
        $('#myModal').modal('toggle');
        $('#privateMessage').val('');
    });

})();
