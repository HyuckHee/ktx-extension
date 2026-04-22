// content.js - korail.com/ticket/search/list v1.0.2
// 심플버전: 예매가능 클릭 → reservbtn 클릭 → 확인창 "네" → 페이지 이동시 자동종료

(function() {
  'use strict';
  if (window.__ktxHelperLoaded) return;
  window.__ktxHelperLoaded = true;

  // ── 알람 소리 (Web Audio API) ───────────────────────
  function playAlarm() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();

      // 3번 반복 비프음
      [0, 0.3, 0.6].forEach(startTime => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime + startTime);
        osc.frequency.setValueAtTime(1100, ctx.currentTime + startTime + 0.1);

        gain.gain.setValueAtTime(0.6, ctx.currentTime + startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startTime + 0.25);

        osc.start(ctx.currentTime + startTime);
        osc.stop(ctx.currentTime + startTime + 0.25);
      });
    } catch(e) {
      console.warn('[KTX 도우미] 알람 재생 실패:', e);
    }
  }

  // chrome API 안전 호출 (Extension context invalidated 방지)
  function safeSendMessage(msg) {
    try { chrome.runtime.sendMessage(msg).catch(() => {}); } catch(e) {}
  }

  // ── 퀵실행창 (페이지 진입 시 자동 표시) ────────────
  function createQuickBar() {
    if (document.getElementById('__ktx_quickbar')) return;

    const bar = document.createElement('div');
    bar.id = '__ktx_quickbar';
    bar.style.cssText = `
      position: fixed;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 999998;
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 18px;
      background: rgba(255,255,255,0.95);
      border: 1px solid rgba(0,0,0,0.1);
      border-radius: 40px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.15);
      font-family: 'Malgun Gothic', sans-serif;
      cursor: grab;
      user-select: none;
      backdrop-filter: blur(10px);
    `;

    // 깜빡임 keyframe 주입
    if (!document.getElementById('__ktx_style')) {
      const style = document.createElement('style');
      style.id = '__ktx_style';
      style.textContent = `
        @keyframes ktxBlink {
          0%   { background: #fff0f0; color: #e53935; }
          50%  { background: #e53935; color: #fff; }
          100% { background: #fff0f0; color: #e53935; }
        }
        @keyframes ktxTrain {
          0%   { transform: translateX(-3px) scaleX(1); }
          25%  { transform: translateX(3px) scaleX(1); }
          50%  { transform: translateX(-2px) scaleX(1); }
          75%  { transform: translateX(2px) scaleX(1); }
          100% { transform: translateX(-3px) scaleX(1); }
        }
        @keyframes ktxBellRepeat {
          0%,100%{ transform:rotate(0deg); }
          15%    { transform:rotate(20deg); }
          30%    { transform:rotate(-20deg); }
          45%    { transform:rotate(12deg); }
          60%    { transform:rotate(-12deg); }
          75%    { transform:rotate(0deg); }
        }
      `;
      document.head.appendChild(style);
    }

    // 드래그 이동
    let isDragging = false, dragOffsetX = 0, dragOffsetY = 0;

    bar.addEventListener('mousedown', (e) => {
      if (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT' || e.target.tagName === 'LABEL') return;
      isDragging = true;
      const rect = bar.getBoundingClientRect();
      dragOffsetX = e.clientX - rect.left;
      dragOffsetY = e.clientY - rect.top;
      bar.style.cursor = 'grabbing';
      bar.style.transform = 'none';
      bar.style.bottom = 'auto';
      bar.style.left = rect.left + 'px';
      bar.style.top  = rect.top  + 'px';
      e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      const x = e.clientX - dragOffsetX;
      const y = e.clientY - dragOffsetY;
      // 화면 밖으로 못나가게
      const maxX = window.innerWidth  - bar.offsetWidth;
      const maxY = window.innerHeight - bar.offsetHeight;
      bar.style.left = Math.max(0, Math.min(x, maxX)) + 'px';
      bar.style.top  = Math.max(0, Math.min(y, maxY)) + 'px';
    });

    document.addEventListener('mouseup', () => {
      if (!isDragging) return;
      isDragging = false;
      bar.style.cursor = 'grab';
    });

    bar.innerHTML = `
      <span id="__ktx_icon" style="font-size:16px;display:inline-block;">🚄</span>
      <span id="__ktx_qstatus" style="font-size:11px;color:#666;min-width:60px;font-weight:500;">대기 중</span>
      <span id="__ktx_qcount" style="font-size:10px;color:#999;">0회</span>
      <div style="display:flex;align-items:center;gap:4px;">
        <input type="time" id="__ktx_time1" style="
          width:82px;padding:4px 5px;border:1px solid #1e2d4a;border-radius:8px;
          background:#f5f8ff;color:#1a56db;font-size:11px;cursor:pointer;outline:none;border:1px solid #c7d7f0;
        ">
        <span id="__ktx_time2_wrap" style="display:none;align-items:center;gap:4px;">
          <span style="color:#5c7aaa;font-size:11px;">~</span>
          <input type="time" id="__ktx_time2" style="
            width:82px;padding:4px 5px;border:1px solid #1e2d4a;border-radius:8px;
            background:#f5f8ff;color:#1a56db;font-size:11px;cursor:pointer;outline:none;border:1px solid #c7d7f0;
          ">
        </span>
      </div>
      <label style="display:flex;align-items:center;gap:3px;font-size:11px;color:#555;cursor:pointer;user-select:none;">
        <input type="checkbox" id="__ktx_qwaitlist" style="margin:0;cursor:pointer;accent-color:#0066cc;">
        예약대기
      </label>
      <label style="display:flex;align-items:center;gap:3px;font-size:11px;color:#555;cursor:pointer;user-select:none;">
        <input type="checkbox" id="__ktx_qstanding" style="margin:0;cursor:pointer;accent-color:#0066cc;">
        입석+좌석
      </label>
      <div style="display:flex;align-items:center;gap:3px;">
        <span style="font-size:11px;color:#5c7aaa;">🔄</span>
        <input type="number" id="__ktx_qinterval" min="3" max="60" step="1" value="5" title="새로고침 간격(초) · 최소 3초" style="
          width:38px;padding:4px 4px;border:1px solid #c7d7f0;border-radius:8px;
          background:#f5f8ff;color:#1a56db;font-size:11px;text-align:center;outline:none;
        ">
        <span style="font-size:11px;color:#5c7aaa;">초</span>
      </div>
      <button id="__ktx_qstart" style="
        padding:6px 14px;border:none;border-radius:20px;
        background:linear-gradient(135deg,#0066cc,#004499);
        color:#fff;font-size:12px;font-weight:600;cursor:pointer;
        font-family:'Malgun Gothic',sans-serif;
      ">▶ 시작</button>
      <button id="__ktx_qstop" style="
        padding:6px 14px;border:1px solid #2a1515;border-radius:20px;
        background:#fff0f0;color:#e53935;font-size:12px;font-weight:600;cursor:pointer;
        border:1px solid #ffcdd2;font-family:'Malgun Gothic',sans-serif;
      ">■ 중지</button>
    `;

    document.body.appendChild(bar);

    // 저장된 설정 복원 (자리 없어 새로고침 시에도 체크 상태 유지)
    try {
      chrome.storage.local.get(
        ['ktxRunning', 'ktxAttempts', 'ktxTime1', 'ktxTime2', 'ktxAllowStanding', 'ktxAllowWaitlist', 'ktxRefreshInterval'],
        (r) => {
          if (r.ktxRunning) setQuickStatus('searching');
          if (r.ktxAttempts) document.getElementById('__ktx_qcount').textContent = r.ktxAttempts + '회';
          if (r.ktxTime1) {
            document.getElementById('__ktx_time1').value = r.ktxTime1;
            document.getElementById('__ktx_time2_wrap').style.display = 'flex';
            if (r.ktxTime2) document.getElementById('__ktx_time2').value = r.ktxTime2;
          }
          const standingEl = document.getElementById('__ktx_qstanding');
          const waitlistEl = document.getElementById('__ktx_qwaitlist');
          const intervalEl = document.getElementById('__ktx_qinterval');
          if (standingEl) standingEl.checked = !!r.ktxAllowStanding;
          if (waitlistEl) waitlistEl.checked = !!r.ktxAllowWaitlist;
          if (intervalEl && typeof r.ktxRefreshInterval === 'number' && r.ktxRefreshInterval >= 3) {
            intervalEl.value = r.ktxRefreshInterval;
          }
        }
      );
    } catch(e) {}

    // 체크박스/간격 변경 시 즉시 저장 (탐색 중에도 반영)
    document.getElementById('__ktx_qstanding').addEventListener('change', (e) => {
      try { chrome.storage.local.set({ ktxAllowStanding: e.target.checked }); } catch(err) {}
    });
    document.getElementById('__ktx_qwaitlist').addEventListener('change', (e) => {
      try { chrome.storage.local.set({ ktxAllowWaitlist: e.target.checked }); } catch(err) {}
    });
    document.getElementById('__ktx_qinterval').addEventListener('change', (e) => {
      let v = parseInt(e.target.value, 10);
      if (isNaN(v) || v < 3) v = 3;
      if (v > 60) v = 60;
      e.target.value = v;
      try {
        chrome.storage.local.set({ ktxRefreshInterval: v });
        // 탐색 중이면 새 간격으로 재시작 알림
        chrome.runtime.sendMessage({ action: 'intervalChanged', interval: v }).catch(() => {});
      } catch(err) {}
    });

    // 시간1 선택 시 시간2 창 열기
    document.getElementById('__ktx_time1').addEventListener('change', () => {
      const t1 = document.getElementById('__ktx_time1').value;
      const wrap = document.getElementById('__ktx_time2_wrap');
      wrap.style.display = t1 ? 'flex' : 'none';
      if (!t1) document.getElementById('__ktx_time2').value = '';
    });

    // 시작 버튼
    document.getElementById('__ktx_qstart').addEventListener('click', () => {
      // 중지 버튼 다시 활성화
      const stopBtn = document.getElementById('__ktx_qstop');
      stopBtn.disabled = false;
      stopBtn.style.opacity = '1';
      stopBtn.style.cursor = 'pointer';
      stopBtn.textContent = '■ 중지';
      const time1 = document.getElementById('__ktx_time1').value;
      const time2 = document.getElementById('__ktx_time2').value;
      const allowStanding = document.getElementById('__ktx_qstanding').checked;
      const allowWaitlist = document.getElementById('__ktx_qwaitlist').checked;
      let refreshInterval = parseInt(document.getElementById('__ktx_qinterval').value, 10);
      if (isNaN(refreshInterval) || refreshInterval < 3) refreshInterval = 3;
      if (refreshInterval > 60) refreshInterval = 60;
      document.getElementById('__ktx_qinterval').value = refreshInterval;
      try {
        chrome.storage.local.set({
          ktxRunning: true, ktxAttempts: 0,
          ktxTime1: time1, ktxTime2: time2,
          ktxAllowStanding: allowStanding,
          ktxAllowWaitlist: allowWaitlist,
          ktxRefreshInterval: refreshInterval,
        });
        chrome.runtime.sendMessage({ action: 'start' }).catch(() => {});
      } catch(e) {}
      setQuickStatus('searching');
      document.getElementById('__ktx_qcount').textContent = '0회';
    });

    // 중지 버튼
    document.getElementById('__ktx_qstop').addEventListener('click', () => {
      const stopBtn = document.getElementById('__ktx_qstop');
      // 깜빡임 이펙트
      stopBtn.style.animation = 'ktxBlink 0.3s ease 3';
      setTimeout(() => {
        stopBtn.disabled = true;
        stopBtn.style.animation = '';
        stopBtn.style.opacity = '0.4';
        stopBtn.style.cursor = 'not-allowed';
        stopBtn.textContent = '■ 중지됨';
      }, 900);
      try {
        chrome.storage.local.set({ ktxRunning: false });
        chrome.runtime.sendMessage({ action: 'stop' }).catch(() => {});
      } catch(e) {}
      setQuickStatus('idle');
    });
  }

  function setQuickStatus(state) {
    const el = document.getElementById('__ktx_qstatus');
    if (!el) return;

    const icon = document.getElementById('__ktx_icon');

    if (state === 'searching') {
      el.textContent = '탐색 중...';
      el.style.color = '#e67e00';
      el.style.fontWeight = 'normal';
      if (icon) {
        icon.textContent = '🚄';
        icon.style.display = 'inline-block';
        icon.style.animation = 'ktxTrain 0.5s ease infinite';
      }
    } else if (state === 'found') {
      el.textContent = '예매 중!';
      el.style.color = '#1a9e4a';
      el.style.fontWeight = 'normal';
      if (icon) {
        icon.textContent = '🚄';
        icon.style.display = 'inline-block';
        icon.style.animation = 'ktxTrain 0.2s ease infinite';
      }
    } else if (state === 'done') {
      el.textContent = '🎉 예약완료!';
      el.style.color = '#1a9e4a';
      el.style.fontWeight = '700';
      if (icon) {
        icon.textContent = '🔔';
        icon.style.display = 'inline-block';
        icon.style.animation = 'ktxBellRepeat 1s ease infinite';
      }
    } else {
      // idle
      el.textContent = '대기 중';
      el.style.color = '#666';
      el.style.fontWeight = 'normal';
      if (icon) { icon.textContent = '🚄'; icon.style.animation = ''; }
    }
  }

  function showToast(msg, type = 'info') {
    let el = document.getElementById('__ktx_toast');
    if (!el) {
      el = document.createElement('div');
      el.id = '__ktx_toast';
      el.style.cssText = `
        position:fixed;top:12px;right:12px;z-index:999999;
        padding:10px 16px;border-radius:8px;font-size:13px;
        font-family:'Malgun Gothic',sans-serif;font-weight:500;
        box-shadow:0 4px 16px rgba(0,0,0,0.35);transition:opacity 0.3s;
        max-width:320px;line-height:1.6;pointer-events:none;
      `;
      document.body.appendChild(el);
    }
    const c = {
      info:    ['#0d1a30','#0066cc','#7ab8ff'],
      success: ['#061a10','#00c853','#00e676'],
      warn:    ['#1a1200','#e69000','#ffb300'],
      error:   ['#1a0606','#cc2222','#ff5252'],
    }[type];
    el.style.background = c[0];
    el.style.border = `1px solid ${c[1]}`;
    el.style.color = c[2];
    el.innerHTML = `🚄 KTX 도우미: ${msg}`;
    el.style.opacity = '1';
    clearTimeout(el._t);
    el._t = setTimeout(() => { el.style.opacity = '0'; }, 4000);
  }

  // ── 랜덤 대기 (ms) ────────────────────────────────────
  function randomDelay(min, max) {
    return new Promise(r => setTimeout(r, min + Math.random() * (max - min)));
  }

  // ── 페이지 이동 감지 → reservation/detail 이동 시만 종료 ──
  // beforeunload에서는 이동할 URL을 알 수 없으므로
  // background에서 탭 URL 변화를 감지해 처리

  // ── MutationObserver: reservbtn 클릭 후에만 활성화 ──
  window.__ktxObserverActive = false;
  const YES_TEXTS = new Set(['네', '확인', '예', '동의']);

  function tryClickYes(root) {
    if (!window.__ktxObserverActive) return false;
    const POPUP_SEL = [
      '.popup','.pop_wrap','.pop-wrap','.modal',
      '.layer_pop','.layer-pop','.dialog','.alert',
      '.layerWrap','.ReactModal__Content',
      '[class*="popup"]','[class*="modal"]',
      '[class*="layer_pop"]','[class*="confirm"]',
      '[role="dialog"]','[role="alertdialog"]',
    ].join(',');

    const popups = (root.matches && root.matches(POPUP_SEL))
      ? [root]
      : Array.from(root.querySelectorAll(POPUP_SEL));

    for (const popup of popups) {
      if (!popup.offsetParent) continue;
      if (getComputedStyle(popup).display === 'none') continue;

      for (const btn of popup.querySelectorAll('button, a, input[type="button"]')) {
        const text = (btn.textContent || btn.value || '').trim();
        if (YES_TEXTS.has(text) && btn.offsetParent && !btn.disabled) {
          showToast(`"${text}" 클릭!`, 'success');
          btn.focus();
          btn.click();
          window.__ktxObserverActive = false;
          return true;
        }
      }
    }
    return false;
  }

  const observer = new MutationObserver((mutations) => {
    if (!window.__ktxObserverActive) return;
    for (const m of mutations) {
      for (const node of m.addedNodes) {
        if (node.nodeType === 1) tryClickYes(node);
      }
      if (m.type === 'attributes' && m.target.nodeType === 1) {
        tryClickYes(m.target);
      }
    }
  });

  observer.observe(document.body, {
    childList: true, subtree: true,
    attributes: true, attributeFilter: ['style', 'class'],
  });

  // window.confirm/alert 오버라이드 제거 — MutationObserver로만 처리
  // (alert 막으면 "이용안내" 같은 필수 팝업이 차단되어 예매 불가)


  // ── STEP 2: 예매 버튼 클릭 ──────────────────────────
  // .reservbtnWrap 안의 button.reservbtn 중 disabled 아닌 것 클릭
  // 일반실:   button.btn_bn-blue02.reservbtn (활성)
  // 입석+좌석: button.btn_by-blue02.reservbtn (활성)
  //            button.btn_bn-blue02.reservbtn.btn-disabled[disabled] (비활성 → 건너뜀)
  function findReserveBtn() {
    const wrap = document.querySelector('.reservbtnWrap');
    if (!wrap) return null;

    // disabled 아닌 button.reservbtn 만 선택
    const btns = wrap.querySelectorAll('button.reservbtn:not([disabled]):not(.btn-disabled)');
    for (const btn of btns) {
      if (btn.offsetParent !== null && getComputedStyle(btn).display !== 'none') {
        return btn;
      }
    }
    return null;
  }

  async function waitAndClickReserveBtn(maxWait = 6000, interval = 300) {
    const start = Date.now();
    showToast('예매 버튼 대기 중...', 'info');

    return new Promise((resolve) => {
      const timer = setInterval(async () => {
        if (Date.now() - start >= maxWait) {
          clearInterval(timer);
          showToast('⚠️ 예매 버튼 못 찾음. 직접 눌러주세요.', 'warn');
          resolve(false);
          return;
        }

        const btn = findReserveBtn();
        if (btn) {
          clearInterval(timer);
          const text = (btn.textContent || btn.value || '').trim();

          // 사람처럼 랜덤 대기 후 클릭 (1000~2000ms)
          const delay = Math.floor(500 + Math.random() * 500);
          console.log(`[KTX 도우미] "${text}" 버튼 발견 — ${delay}ms 후 클릭`);
          showToast(`예매 버튼 ${(delay/1000).toFixed(1)}초 후 클릭...`, 'info');

          await randomDelay(delay, delay);
          reactClick(btn);
          showToast(`"${text}" 클릭!`, 'success');

          // 예매 버튼 클릭 후 이용안내 팝업 폴링 (ReactModal 대응)
          const popupTimer = setInterval(() => {
            const modal = document.querySelector('.ReactModal__Content, .layerWrap');
            if (!modal || modal.offsetParent === null) return;
            const btns = modal.querySelectorAll('button, a');
            for (const b of btns) {
              const t = b.textContent.trim();
              if (['확인','네','예','동의'].includes(t) && !b.disabled) {
                clearInterval(popupTimer);
                console.log(`[KTX 도우미] 이용안내 팝업 "${t}" 클릭`);
                showToast(`이용안내 "${t}" 자동 클릭`, 'success');
                reactClick(b);
                break;
              }
            }
          }, 200);
          setTimeout(() => clearInterval(popupTimer), 8000);

          resolve(true);
        }
      }, interval);
    });
  }

  // ── STEP 1: 예매 가능한 price_box 클릭 ───────────────
  function performSearch(config) {
    const tckLists = document.querySelectorAll('.tckList');
    if (tckLists.length === 0) {
      showToast('열차 목록 없음 — 로딩 중?', 'error');
      return { found: false, message: '.tckList 없음' };
    }

    const allowStanding = config?.allowStanding || false;
    const allowWaitlist = config?.allowWaitlist || false;

    for (const tck of tckLists) {
      for (const box of tck.querySelectorAll('.price_box')) {
        // sold_out = 매진 (항상 건너뜀)
        // sold_out_wait = 예약대기 (체크박스 꺼져있으면 건너뜀)
        // yms / yms_wait = 입석+좌석 (체크박스 꺼져있으면 건너뜀)
        if (box.classList.contains('sold_out')) continue;
        if (box.classList.contains('sold_out_wait') && !allowWaitlist) continue;

        // inner 텍스트가 "-" 이면 해당 좌석 없음
        if (box.querySelector('.inner')?.textContent.trim() === '-') continue;

        // .tck_etc_use 텍스트 확인
        const etcUse = box.querySelector('.tck_etc_use');
        const etcText = etcUse?.textContent.trim() || '';
        if (etcText === '매진') continue;

        // 입석+좌석 (yms / yms_wait) 체크박스 꺼져있으면 건너뜀
        const isStanding = box.classList.contains('yms') || box.classList.contains('yms_wait');
        if (isStanding && !allowStanding) continue;

        const link = box.querySelector('a');
        if (!link) continue;

        const seatLabel = box.querySelector('.txt_ch')?.textContent.trim() || '';
        const price     = box.querySelector('.txt_price')?.textContent.trim() || '';
        const trainName = (tck.querySelector('.blind')?.textContent || '') +
                          (tck.querySelector('.num')?.textContent  || '');

        console.log(`[KTX 도우미] ✅ 예매 가능: ${trainName} ${seatLabel} ${price}`);
        showToast(`${trainName} ${seatLabel} ${price} 선택!`, 'success');

        // 탐색 루프 일시정지 (중복 클릭 방지)
        safeSendMessage({ type: 'pause' });

        // 좌석 클릭 (React onClick 핸들러 직접 실행)
        reactClick(link);

        // STEP 2: 1.5~2.5초 랜덤 대기 후 예매버튼 탐색
        const waitMs = Math.floor(1500 + Math.random() * 1000);
        console.log(`[KTX 도우미] 좌석 클릭 완료 — ${waitMs}ms 후 예매버튼 탐색`);
        setTimeout(() => waitAndClickReserveBtn(6000, 300), waitMs);

        return { found: true, trainInfo: `${trainName} ${seatLabel} ${price}` };
      }
    }

    showToast('빈자리 없음, 계속 탐색...', 'warn');
    return { found: false, message: '빈자리 없음' };
  }

  // ── 재검색 ────────────────────────────────────────────
  function refreshSearch() {
    location.reload();
  }

  // ── 메시지 리스너 ────────────────────────────────────
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.action === 'ping')    { sendResponse({ alive: true }); return true; }
    if (msg.action === 'notify')  { showToast(msg.text, msg.level); return true; }
    if (msg.action === 'refresh') { refreshSearch(); sendResponse({ ok: true }); return true; }
    if (msg.action === 'search')  { sendResponse(performSearch(msg.config)); return true; }
  });

  // ── URL 변화 감지 (SPA 대응) ─────────────────────────
  let _lastUrl = location.href;

  function onUrlChange() {
    const url = location.href;
    const bar = document.getElementById('__ktx_quickbar');

    if (url.includes('reservation/detail')) {
      // detail 페이지: 퀵바 생성 후 종 모드
      if (!bar) createQuickBar();
      const startBtn = document.getElementById('__ktx_qstart');
      if (startBtn) startBtn.style.display = 'none';
      // setQuickStatus('done')이 🔔 + 애니메이션까지 처리
      setQuickStatus('done');

    } else if (url.includes('ticket/search/list')) {
      // list 페이지: 퀵바 생성 또는 초기화
      if (!bar) {
        createQuickBar();
      } else {
        // 시작버튼 복원
        const startBtn = document.getElementById('__ktx_qstart');
        if (startBtn) startBtn.style.display = '';
        // 중지버튼 복원
        const stopBtn = document.getElementById('__ktx_qstop');
        if (stopBtn) {
          stopBtn.disabled = false;
          stopBtn.style.opacity = '1';
          stopBtn.style.cursor = 'pointer';
          stopBtn.style.animation = '';
          stopBtn.textContent = '■ 중지';
        }
        // 상태에 따라 아이콘까지 자동 변경 (setQuickStatus가 처리)
        try {
          chrome.storage.local.get(['ktxRunning'], (r) => {
            setQuickStatus(r.ktxRunning ? 'searching' : 'idle');
          });
        } catch(e) {
          setQuickStatus('idle');
        }
      }
    }
  }

  // URL 폴링 감지 (100ms마다 URL 변화 체크 - 가장 확실한 SPA 대응)
  setInterval(() => {
    const currentUrl = location.href;
    if (currentUrl !== _lastUrl) {
      _lastUrl = currentUrl;
      setTimeout(onUrlChange, 200);
    }
  }, 100);

  // popstate 이벤트도 함께 감지
  window.addEventListener('popstate', () => {
    _lastUrl = location.href;
    setTimeout(onUrlChange, 200);
  });

  // 퀵바 생성
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { createQuickBar(); onUrlChange(); });
  } else {
    createQuickBar();
    onUrlChange();
  }

  chrome.storage.local.get(['ktxRunning'], (r) => {
    if (r.ktxRunning) showToast('자동 예매 탐색 중...', 'info');
  });

  // background 메시지 수신 → 퀵바 상태 업데이트
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'attempt') {
      const el = document.getElementById('__ktx_qcount');
      if (el) el.textContent = msg.count + '회';
    }
    if (msg.type === 'found')   setQuickStatus('found');
    if (msg.type === 'status' && !msg.running) setQuickStatus('idle');
    if (msg.type === 'reserved') setQuickStatus('done');

    // 알람 재생 중 중지 버튼 깜빡임
    if (msg.action === 'alarmStart') {
      const stopBtn = document.getElementById('__ktx_qstop');
      if (stopBtn) {
        stopBtn.style.animation = 'ktxBlink 0.6s ease infinite';
        stopBtn.style.fontWeight = '700';
      }
    }
    if (msg.action === 'alarmStop') {
      const stopBtn = document.getElementById('__ktx_qstop');
      if (stopBtn) {
        stopBtn.style.animation = '';
        stopBtn.style.fontWeight = '';
        stopBtn.disabled = true;
        stopBtn.style.opacity = '0.4';
        stopBtn.style.cursor = 'not-allowed';
        stopBtn.textContent = '■ 중지됨';
      }
      const icon = document.getElementById('__ktx_icon');
      if (icon) { icon.style.animation = ''; }
    }
  });

  // 예매 완료 페이지(reservation/detail) 종료 신호
  if (location.href.includes('korail.com/ticket/reservation/detail')) {
    try { chrome.storage.local.set({ ktxRunning: false }); } catch(e) {}
    try { chrome.runtime.sendMessage({ type: 'reserved' }).catch(() => {}); } catch(e) {}
  }

  console.log('[KTX 도우미] content.js 심플버전 로드 ✅');
})();
