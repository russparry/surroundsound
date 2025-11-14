const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');

const dev = process.env.NODE_ENV !== 'production';
const hostname = '0.0.0.0'; // Changed from 'localhost' to allow connections from other devices on the network
const port = 3000;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// Store active rooms
const rooms = new Map();

app.prepare().then(() => {
  const httpServer = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  const io = new Server(httpServer, {
    cors: {
      origin: '*', // Allow connections from any device on the local network
      methods: ['GET', 'POST']
    }
  });

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    // Create a new room
    socket.on('create-room', ({ roomCode, userId }) => {
      if (!rooms.has(roomCode)) {
        rooms.set(roomCode, {
          host: socket.id,
          hostUserId: userId,
          members: [{ socketId: socket.id, userId }],
          currentTrack: null,
          isPlaying: false,
          position: 0,
        });
        socket.join(roomCode);
        socket.emit('room-created', { roomCode, isHost: true });
        console.log(`Room created: ${roomCode}`);
      } else {
        socket.emit('error', { message: 'Room already exists' });
      }
    });

    // Join an existing room
    socket.on('join-room', ({ roomCode, userId }) => {
      const room = rooms.get(roomCode);
      if (room) {
        room.members.push({ socketId: socket.id, userId });
        socket.join(roomCode);
        socket.emit('room-joined', {
          roomCode,
          isHost: false,
          currentTrack: room.currentTrack,
          isPlaying: room.isPlaying,
          position: room.position
        });

        // Notify all members about the new user
        io.to(roomCode).emit('member-joined', {
          userId,
          memberCount: room.members.length
        });
        console.log(`User joined room: ${roomCode}`);
      } else {
        socket.emit('error', { message: 'Room not found' });
      }
    });

    // Host plays a track
    socket.on('play-track', ({ roomCode, trackId, trackUri, position = 0, startTime }) => {
      const room = rooms.get(roomCode);
      if (room && room.host === socket.id) {
        room.currentTrack = { trackId, trackUri };
        room.isPlaying = true;
        room.position = position;

        // Broadcast to all members in the room
        io.to(roomCode).emit('play-command', {
          trackUri,
          position,
          timestamp: Date.now(),
          startTime // Pass through the synchronized start time
        });
        console.log(`Playing track in room ${roomCode}:`, trackUri, startTime ? `(scheduled start: ${new Date(startTime).toISOString()})` : '');
      }
    });

    // Host pauses playback
    socket.on('pause', ({ roomCode }) => {
      const room = rooms.get(roomCode);
      if (room && room.host === socket.id) {
        room.isPlaying = false;
        io.to(roomCode).emit('pause-command');
        console.log(`Paused in room ${roomCode}`);
      }
    });

    // Host resumes playback
    socket.on('resume', ({ roomCode, position }) => {
      const room = rooms.get(roomCode);
      if (room && room.host === socket.id) {
        room.isPlaying = true;
        room.position = position;
        io.to(roomCode).emit('resume-command', {
          position,
          timestamp: Date.now()
        });
        console.log(`Resumed in room ${roomCode}`);
      }
    });

    // Host seeks to position
    socket.on('seek', ({ roomCode, position }) => {
      const room = rooms.get(roomCode);
      if (room && room.host === socket.id) {
        room.position = position;
        io.to(roomCode).emit('seek-command', {
          position,
          timestamp: Date.now()
        });
        console.log(`Seeked to ${position}ms in room ${roomCode}`);
      }
    });

    // Sync position updates from host
    socket.on('position-update', ({ roomCode, position }) => {
      const room = rooms.get(roomCode);
      if (room && room.host === socket.id) {
        room.position = position;
        socket.to(roomCode).emit('sync-position', { position });
      }
    });

    // Disconnect
    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);

      // Clean up rooms
      for (const [roomCode, room] of rooms.entries()) {
        const memberIndex = room.members.findIndex(m => m.socketId === socket.id);

        if (memberIndex !== -1) {
          room.members.splice(memberIndex, 1);

          // If host left, notify everyone and close room
          if (room.host === socket.id) {
            io.to(roomCode).emit('host-left');
            rooms.delete(roomCode);
            console.log(`Host left, room deleted: ${roomCode}`);
          } else {
            // Notify remaining members
            io.to(roomCode).emit('member-left', {
              memberCount: room.members.length
            });
          }

          // Delete empty rooms
          if (room.members.length === 0) {
            rooms.delete(roomCode);
            console.log(`Empty room deleted: ${roomCode}`);
          }
        }
      }
    });
  });

  httpServer
    .once('error', (err) => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`> Ready on http://${hostname}:${port}`);
    });
});
