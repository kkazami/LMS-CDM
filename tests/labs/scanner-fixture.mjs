import net from 'node:net';

/** A protocol fixture, not antivirus. It proves caller behavior for each clamd verdict only. */
export async function scannerFixture() {
  let mode = 'clean';
  const sockets = new Set();
  const server = net.createServer(socket => {
    sockets.add(socket);
    socket.on('error', () => {});
    socket.on('close', () => sockets.delete(socket));
    if (mode === 'unavailable') { socket.destroy(); return; }
    let buffer = Buffer.alloc(0), started = false;
    socket.on('data', chunk => {
      buffer = Buffer.concat([buffer, chunk]);
      if (!started) {
        if (buffer.length < 10) return;
        if (buffer.subarray(0, 10).toString() !== 'zINSTREAM\0') { socket.end('UNKNOWN COMMAND\0'); return; }
        buffer = buffer.subarray(10); started = true;
      }
      while (buffer.length >= 4) {
        const size = buffer.readUInt32BE(0);
        if (size > 4 * 1024 * 1024) { socket.destroy(); return; }
        if (buffer.length < size + 4) return;
        buffer = buffer.subarray(size + 4);
        if (!size) { socket.end(mode === 'infected' ? 'stream: Synthetic-TEST FOUND\0' : mode === 'invalid' ? 'invalid verdict\0' : 'stream: OK\0'); return; }
      }
    });
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  return { host: '127.0.0.1', port: server.address().port, setMode(next) { mode = next; },
    close: () => new Promise(resolve => { for (const socket of sockets) socket.destroy(); server.close(resolve); }) };
}
