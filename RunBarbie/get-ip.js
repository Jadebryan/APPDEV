// Helper script to get your local IP address
// Run: node get-ip.js

const os = require('os');

function getLocalIP() {
  const interfaces = os.networkInterfaces();
  
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // Skip internal (loopback) and non-IPv4 addresses
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  
  return 'localhost';
}

const ip = getLocalIP();
console.log('\n🌐 Your local IP address is:', ip);
console.log('📝 Update src/services/api.ts with:');
console.log(`   const API_BASE_URL = __DEV__ 
     ? 'http://${ip}:3000/api'
     : 'https://your-production-url.com/api';\n`);
