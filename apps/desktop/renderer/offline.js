const serverUrl = new URLSearchParams(location.search).get('server') || 'http://localhost:3000';
    document.getElementById('server-address').textContent = serverUrl;
    function checkAndReload() {
      const btn = document.getElementById('retry-btn');
      btn.innerText = 'Connecting...';
      btn.disabled = true;

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5000);
      fetch(serverUrl + '/api/health', { mode: 'no-cors', signal: controller.signal })
        .then(() => {
          window.location.href = serverUrl + '/login?institute=ics&desktop=admin';
        })
        .catch(() => {
          btn.innerText = 'Check Server Status';
          btn.disabled = false;
          alert('Server still not reachable. Check your connection and server address. For a local server, run pnpm dev:web.');
        })
        .finally(() => clearTimeout(timer));
    }
  
document.getElementById("retry-btn").addEventListener("click", checkAndReload);
