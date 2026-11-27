const WebSocket = require('ws');
const ws = new WebSocket('wss://shinobi-legacy-2.onrender.com');
const seen = [];
ws.on('open', () => {
  ws.send(JSON.stringify({ t: 'auth', idToken: null, name: 'ProbeInj3', lv: 1 }));
  setTimeout(() => { console.log('SEEN:', JSON.stringify(seen)); ws.close(); process.exit(0); }, 8000);
});
ws.on('message', (d) => { const m = JSON.parse(d.toString()); seen.push(m.t === 'rankings' ? 'rankings' : m); });
ws.on('error', (e) => { console.log('ERR', e.message); process.exit(1); });
