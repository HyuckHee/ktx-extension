// popup.js - 로그 표시 전용

function addLog(msg, type = '') {
  const box = document.getElementById('logBox');
  const el = document.createElement('div');
  el.className = 'log-entry ' + type;
  el.textContent = msg;
  box.appendChild(el);
  box.scrollTop = box.scrollHeight;
  while (box.children.length > 60) box.removeChild(box.firstChild);
}

// 저장된 로그 복원
chrome.storage.local.get(['ktxLogs'], (r) => {
  if (r.ktxLogs && r.ktxLogs.length > 0) {
    const box = document.getElementById('logBox');
    box.innerHTML = '';
    r.ktxLogs.forEach(log => {
      const el = document.createElement('div');
      el.className = 'log-entry ' + (log.type || '');
      el.textContent = log.msg;
      box.appendChild(el);
    });
    box.scrollTop = box.scrollHeight;
  }
});

// 실시간 로그 수신 (background.js → popup)
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'log') {
    const now = new Date();
    const t = String(now.getHours()).padStart(2,'0') + ':' +
              String(now.getMinutes()).padStart(2,'0') + ':' +
              String(now.getSeconds()).padStart(2,'0');
    addLog('[' + t + '] ' + msg.text, msg.level);
  }
});
