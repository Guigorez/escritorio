const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());

// Serve os arquivos do Frontend (onde os bonecos moram)
app.use(express.static(path.join(__dirname, 'public')));

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const players = {};

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Create a new player
  players[socket.id] = {
    x: Math.floor(Math.random() * (800 - 50)) + 25,
    y: Math.floor(Math.random() * (600 - 50)) + 25,
    color: '#' + Math.floor(Math.random() * 16777215).toString(16),
    peerId: null
  };

  // Send all current players to the new user
  socket.emit('currentPlayers', players);

  // Broadcast the new player to all other users
  socket.broadcast.emit('newPlayer', { id: socket.id, player: players[socket.id] });

  // Handle movement
  socket.on('playerMovement', (movementData) => {
    if (players[socket.id]) {
      players[socket.id].x = movementData.x;
      players[socket.id].y = movementData.y;
      // Broadcast new position to everyone else
      socket.broadcast.emit('playerMoved', { id: socket.id, x: movementData.x, y: movementData.y });
    }
  });

  // Handle WebRTC Peer ID registration
  socket.on('registerPeer', (peerId) => {
    if (players[socket.id]) {
      players[socket.id].peerId = peerId;
      // Notify others about the new peer ID so they can call
      socket.broadcast.emit('peerRegistered', { id: socket.id, peerId: peerId });
    }
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
    delete players[socket.id];
    io.emit('playerDisconnect', socket.id);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
