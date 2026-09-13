async function run() {
  const ws = new WebSocket('ws://127.0.0.1:9222/devtools/page/9ABA29166621AF0167973B669139EF7C');
  ws.onopen = () => {
    const expr = `(() => {
      const mv = document.getElementById('mission-vision');
      const about = document.getElementById('about');
      return JSON.stringify({
        mv: mv ? mv.getBoundingClientRect().height : null,
        about: about ? about.getBoundingClientRect().height : null
      });
    })()`;
    ws.send(JSON.stringify({ id: 1, method: 'Runtime.evaluate', params: { expression: expr, returnByValue: true } }));
  };
  ws.onmessage = (event) => {
    const res = JSON.parse(event.data);
    if (res.id === 1) {
      console.log('Current section heights:', JSON.parse(res.result.result.value));
      process.exit(0);
    }
  };
}
run();
