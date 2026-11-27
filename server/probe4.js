const WebSocket = require('ws');
function client(name, onMsg, delay) {
  const ws = new WebSocket('wss://shinobi-legacy-2.onrender.com');
  ws.on('open', () => setTimeout(() => ws.send(JSON.stringify({ t: 'auth', idToken: null, name, lv: 1 })), delay));
  ws.on('message', (d) => onMsg(name, JSON.parse(d.toString())));
  ws.on('error', (e) => console.log(name, 'ERR', e.message));
  return ws;
}
const msgs = [];
client('P1Inj', (n, m) => {
  msgs.push([n, m.t === 'rankings' ? 'rankings' : JSON.stringify(m)]);
  if (m.t === 'welcome') ws1.send(JSON.stringify({ t: 'inj', name: n, arm: null, eye: 'right' }));
}, 300);
let ws1;
const c1 = client('P1Inj', (n, m) => {
  msgs.push([n, m.t === 'rankings' ? 'rankings' : JSON.stringify(m)]);
  if (m.t === 'welcome') ws1.send(JSON.stringify({ t: 'inj', name: n, arm: null, eye: 'right' }));
}, 300);
ws1 = c1;
client('P2Spec', (n, m) => { msgs.push([n, m.t === 'rankings' ? 'rankings' : JSON.stringify(m)]); }, 2500);
setTimeout(() => { console.log(msgs.map(x => x.join(': ')).join('\n')); process.exit(0); }, 11000);
