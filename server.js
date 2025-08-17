const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(cors());
app.use(express.static('client/build'));

let users = {}; // socketId: { nick, color, isAdmin }
let chatHistory = [];
let announcement = "";

io.on('connection', (socket) => {
  // Default user properties
  users[socket.id] = {
    nick: `Guest${Math.floor(Math.random()*1000)}`,
    color: "#3498db",
    isAdmin: false
  };

  // Send initial data
  socket.emit('init', {
    users,
    chatHistory,
    announcement,
    self: users[socket.id]
  });
  io.emit('userList', users);

  // Handle chat messages
  socket.on('chat', (msg) => {
    let user = users[socket.id];
    // Command parsing
    if (msg.startsWith('/')) {
      const [cmd, ...args] = msg.slice(1).split(' ');
      switch(cmd) {
        case "nick":
          const newNick = args.join(' ').trim().slice(0, 16);
          if (newNick) {
            user.nick = newNick;
            io.emit('userList', users);
          }
          break;
        case "me":
          io.emit('chat', { type: 'action', user, msg: args.join(' ') });
          break;
        case "announce":
          if (user.isAdmin) {
            announcement = args.join(' ');
            io.emit('announcement', announcement);
          }
          break;
        case "kick":
          if (user.isAdmin) {
            let targetNick = args.join(' ');
            let targetId = Object.keys(users).find(id => users[id].nick === targetNick);
            if (targetId && targetId !== socket.id) {
              io.to(targetId).emit('kicked');
              io.sockets.sockets.get(targetId).disconnect();
            }
          }
          break;
        // Add more commands here
      }
      return;
    }

    // Regular message
    const chatMsg = {
      type: 'chat',
      user,
      msg,
      time: new Date().toISOString()
    };
    chatHistory.push(chatMsg);
    if (chatHistory.length > 100) chatHistory.shift();
    io.emit('chat', chatMsg);
  });

  // Handle color change
  socket.on('color', (color) => {
    if (/^#[0-9A-Fa-f]{6}$/.test(color)) {
      users[socket.id].color = color;
      io.emit('userList', users);
    }
  });

  // Handle admin login (simple password for demo)
  socket.on('admin', (password) => {
    if (password === "secret") { // Change this to env var for production
      users[socket.id].isAdmin = true;
      io.emit('userList', users);
    }
  });

  socket.on('disconnect', () => {
    delete users[socket.id];
    io.emit('userList', users);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Chatroom server running on port ${PORT}`);
});