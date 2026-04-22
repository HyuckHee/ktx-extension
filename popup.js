// popup.js

function addLog(msg, type = '') {
  const box = document.getElementById('logBox');
  const now = new Date();
  const t = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`;
  const el = document.createElement('div');
  el.className = `log-entry ${type}`;
  el.textContent = `[${t}] ${msg}`;
  box.appendChild(el);
  box.scrollTop = box.scrollHeight;
  while (box.children.length > 60) box.removeChild(box.firstChild);
}

function setStatus(state) {
  const dot  = document.getElementById('dot');
  const text = document.getElementById('statusText');
  dot.className = 'dot';
  text.className = 'status-text';
  if (state === 'searching') {
    dot.classList.add('searching');
    text.classList.add('searching');
    text.textContent = '탐색 중...';
  } else if (state === 'active') {
    dot.classList.add('active');
    text.classList.add('active');
    text.textContent = '예매 진행 중!';
  } else {
    text.textContent = '대기 중';
  }
}

// 저장된 상태 복원
chrome.storage.local.get(['ktxRunning', 'ktxAttempts', 'ktxLogs', 'ktxAllowStanding'], (r) => {
  if (r.ktxRunning) setStatus('searching');
  if (r.ktxAttempts) document.getElementById('attemptCount').textContent = r.ktxAttempts;
  if (r.ktxAllowStanding) document.getElementById('allowStanding').checked = r.ktxAllowStanding;
  if (r.ktxLogs) {
    const box = document.getElementById('logBox');
    box.innerHTML = '';
    r.ktxLogs.forEach(log => {
      const el = document.createElement('div');
      el.className = `log-entry ${log.type}`;
      el.textContent = log.msg;
      box.appendChild(el);
    });
    box.scrollTop = box.scrollHeight;
  }
});

document.getElementById('startBtn').addEventListener('click', () => {
  const allowStanding = document.getElementById('allowStanding').checked;
  chrome.storage.local.set({ ktxRunning: true, ktxAttempts: 0, ktxLogs: [], ktxAllowStanding: allowStanding });
  document.getElementById('logBox').innerHTML = '';
  document.getElementById('attemptCount').textContent = '0';
  setStatus('searching');
  addLog('탐색 시작', 'info');
  chrome.runtime.sendMessage({ action: 'start' });
});

document.getElementById('stopBtn').addEventListener('click', () => {
  chrome.storage.local.set({ ktxRunning: false });
  setStatus('idle');
  addLog('탐색 중지', 'warn');
  chrome.runtime.sendMessage({ action: 'stop' });
});

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'log')     addLog(msg.text, msg.level);
  if (msg.type === 'attempt') document.getElementById('attemptCount').textContent = msg.count;
  if (msg.type === 'found')   setStatus('active');
  if (msg.type === 'status' && !msg.running) setStatus('idle');
  if (msg.type === 'reserved') { setStatus('idle'); addLog('🎉 예매 완료!', 'success'); }
});

// storage 변화 감지 → UI 동기화 (탭 이동 등으로 종료 시)
chrome.storage.onChanged.addListener((changes) => {
  if (changes.ktxRunning?.newValue === false) setStatus('idle');
  if (changes.ktxRunning?.newValue === true)  setStatus('searching');
});
