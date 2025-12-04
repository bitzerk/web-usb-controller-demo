/**
 * Socket.IO Server for Remote Keyboard Control
 * 
 * Simple demo server that routes brightness control events between
 * host computers (with physical keyboards) and remote devices (phones/tablets).
 */

const { Server } = require('socket.io');
const http = require('http');
const os = require('os');

// Configuration
const PORT = process.env.PORT || 3000;

// In-memory storage
const hosts = new Map();      // uuid -> socket.id
const remotes = new Map();    // uuid -> Set<socket.id>

// HTTP Server (minimal)
const httpServer = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Socket.IO server running');
});

// Socket.IO setup with CORS
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Connection handler
io.on('connection', (socket) => {
  console.log(`[Connection] Client connected: ${socket.id}`);

  // HOST REGISTRATION
  socket.on('host:register', (data) => {
    const { uuid, timestamp } = data;
    hosts.set(uuid, socket.id);
    console.log(`[Host Register] UUID: ${uuid}, Socket: ${socket.id}`);
    console.log(`[Stats] Hosts: ${hosts.size}, Remotes: ${remotes.size}`);
  });

  // REMOTE REGISTRATION
  socket.on('remote:register', (data) => {
    const { uuid, timestamp } = data;
    if (!remotes.has(uuid)) {
      remotes.set(uuid, new Set());
    }
    remotes.get(uuid).add(socket.id);
    console.log(`[Remote Register] UUID: ${uuid}, Socket: ${socket.id}`);
    console.log(`[Stats] Hosts: ${hosts.size}, Remotes: ${remotes.size}`);
  });

  // BRIGHTNESS SET (Remote -> Host)
  socket.on('brightness:set', (data) => {
    const { uuid, brightness } = data;
    const hostSocketId = hosts.get(uuid);
    
    if (hostSocketId) {
      io.to(hostSocketId).emit('brightness:set', data);
      // console.log(`[Brightness Set] Remote -> Host (UUID: ${uuid}, Brightness: ${brightness})`);
    } else {
      console.warn(`[Brightness Set] No host found for UUID: ${uuid}`);
    }
  });

  // BRIGHTNESS SYNC (Host -> Remotes)
  socket.on('brightness:sync', (data) => {
    const { uuid, brightness, brightnessType } = data;
    const remoteSocketIds = remotes.get(uuid);
    
    if (remoteSocketIds && remoteSocketIds.size > 0) {
      remoteSocketIds.forEach(remoteSocketId => {
        io.to(remoteSocketId).emit('brightness:sync', data);
      });
      // console.log(`[Brightness Sync] Host -> ${remoteSocketIds.size} Remote(s) (UUID: ${uuid}, Brightness: ${brightness}, Type: ${brightnessType})`);
    } else {
      // console.log(`[Brightness Sync] No remotes connected for UUID: ${uuid}`);
    }
  });

  // DISCONNECT CLEANUP
  socket.on('disconnect', (reason) => {
    console.log(`[Disconnect] Socket: ${socket.id}, Reason: ${reason}`);
    
    // Remove from hosts
    for (const [uuid, socketId] of hosts.entries()) {
      if (socketId === socket.id) {
        hosts.delete(uuid);
        console.log(`[Cleanup] Removed host UUID: ${uuid}`);
      }
    }
    
    // Remove from remotes
    for (const [uuid, socketIds] of remotes.entries()) {
      if (socketIds.has(socket.id)) {
        socketIds.delete(socket.id);
        console.log(`[Cleanup] Removed remote from UUID: ${uuid}`);
        if (socketIds.size === 0) {
          remotes.delete(uuid);
        }
      }
    }
    
    console.log(`[Stats] Hosts: ${hosts.size}, Remotes: ${remotes.size}`);
  });
});

// Helper function to get local IP addresses
function getLocalIPs() {
  const interfaces = os.networkInterfaces();
  const addresses = [];
  
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // Skip internal and non-IPv4 addresses
      if (iface.family === 'IPv4' && !iface.internal) {
        addresses.push(iface.address);
      }
    }
  }
  
  return addresses;
}

// Start server - bind to all interfaces
httpServer.listen(PORT, '0.0.0.0', () => {
  const localIPs = getLocalIPs();
  
  console.log(`\n🚀 Socket.IO Server Running`);
  console.log(`   Port: ${PORT}`);
  console.log(`   Host: 0.0.0.0 (all network interfaces)`);
  console.log(`\n📱 Connect from your phone using:`);
  
  if (localIPs.length > 0) {
    localIPs.forEach(ip => {
      console.log(`   http://${ip}:${PORT}`);
    });
  } else {
    console.log(`   Unable to detect local IP address`);
    console.log(`   Check your network settings`);
  }
  
  console.log(`\n💻 Local access:`);
  console.log(`   http://localhost:${PORT}`);
  console.log(`\n   Waiting for connections...\n`);
});
