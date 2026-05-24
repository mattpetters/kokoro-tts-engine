(() => {
  if (document.getElementById('kokoro-player')) return;

  // ── voices ──────────────────────────────────────────────────────────────────

  const VOICES_META = {
    af_heart: { name: 'Heart', flag: '🇺🇸', group: 'American' },
    af_alloy: { name: 'Alloy', flag: '🇺🇸', group: 'American' },
    af_aoede: { name: 'Aoede', flag: '🇺🇸', group: 'American' },
    af_bella: { name: 'Bella', flag: '🇺🇸', group: 'American' },
    af_jessica: { name: 'Jessica', flag: '🇺🇸', group: 'American' },
    af_kore: { name: 'Kore', flag: '🇺🇸', group: 'American' },
    af_nicole: { name: 'Nicole', flag: '🇺🇸', group: 'American' },
    af_nova: { name: 'Nova', flag: '🇺🇸', group: 'American' },
    af_river: { name: 'River', flag: '🇺🇸', group: 'American' },
    af_sarah: { name: 'Sarah', flag: '🇺🇸', group: 'American' },
    af_sky: { name: 'Sky', flag: '🇺🇸', group: 'American' },
    am_adam: { name: 'Adam', flag: '🇺🇸', group: 'American' },
    am_echo: { name: 'Echo', flag: '🇺🇸', group: 'American' },
    am_eric: { name: 'Eric', flag: '🇺🇸', group: 'American' },
    am_fenrir: { name: 'Fenrir', flag: '🇺🇸', group: 'American' },
    am_liam: { name: 'Liam', flag: '🇺🇸', group: 'American' },
    am_michael: { name: 'Michael', flag: '🇺🇸', group: 'American' },
    am_onyx: { name: 'Onyx', flag: '🇺🇸', group: 'American' },
    am_puck: { name: 'Puck', flag: '🇺🇸', group: 'American' },
    am_santa: { name: 'Santa', flag: '🇺🇸', group: 'American' },
    bf_emma: { name: 'Emma', flag: '🇬🇧', group: 'British' },
    bf_isabella: { name: 'Isabella', flag: '🇬🇧', group: 'British' },
    bm_george: { name: 'George', flag: '🇬🇧', group: 'British' },
    bm_lewis: { name: 'Lewis', flag: '🇬🇧', group: 'British' },
    bf_alice: { name: 'Alice', flag: '🇬🇧', group: 'British' },
    bf_lily: { name: 'Lily', flag: '🇬🇧', group: 'British' },
    bm_daniel: { name: 'Daniel', flag: '🇬🇧', group: 'British' },
    bm_fable: { name: 'Fable', flag: '🇬🇧', group: 'British' },
  };

  const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];

  // ── state ────────────────────────────────────────────────────────────────────

  let voices = [];
  let activeVoice = null;   // SpeechSynthesisVoice object
  let rate = 1;
  let pending = '';         // text queued to speak
  let visible = false;
  let voicePanelOpen = false;

  // ── DOM ──────────────────────────────────────────────────────────────────────

  const root = document.createElement('div');
  root.id = 'kokoro-player';
  root.innerHTML = `
    <div class="kp-voices-panel"></div>
    <div class="kp-bar">
      <button class="kp-voice-btn" title="Switch voice">
        <span class="kp-flag"></span>
        <span class="kp-name"></span>
        <svg class="kp-chevron" viewBox="0 0 10 6" fill="none">
          <path d="M1 1l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
      </button>
      <div class="kp-wave" aria-hidden="true">
        <span></span><span></span><span></span><span></span><span></span>
      </div>
      <div class="kp-controls">
        <button class="kp-play" title="Play / Pause">
          <svg class="kp-icon-play" viewBox="0 0 16 16" fill="currentColor">
            <path d="M3 2.5l10 5.5-10 5.5V2.5z"/>
          </svg>
          <svg class="kp-icon-pause" viewBox="0 0 16 16" fill="currentColor" hidden>
            <rect x="3" y="2" width="3.5" height="12" rx="1"/>
            <rect x="9.5" y="2" width="3.5" height="12" rx="1"/>
          </svg>
        </button>
        <button class="kp-speed" title="Speed"></button>
      </div>
      <button class="kp-close" title="Dismiss">
        <svg viewBox="0 0 12 12" fill="none">
          <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
      </button>
    </div>
  `;
  document.documentElement.appendChild(root);

  const $ = s => root.querySelector(s);
  const barFlag   = $('.kp-flag');
  const barName   = $('.kp-name');
  const wave      = $('.kp-wave');
  const playBtn   = $('.kp-play');
  const iconPlay  = $('.kp-icon-play');
  const iconPause = $('.kp-icon-pause');
  const speedBtn  = $('.kp-speed');
  const closeBtn  = $('.kp-close');
  const voiceBtn  = $('.kp-voice-btn');
  const panel     = $('.kp-voices-panel');

  // ── voice loading ─────────────────────────────────────────────────────────────

  const loadVoices = () => {
    voices = speechSynthesis.getVoices().filter(v => v.name.startsWith('Kokoro '));
    if (!voices.length) return;
    if (!activeVoice || !voices.includes(activeVoice)) {
      activeVoice = voices.find(v => v.name === 'Kokoro Sky') || voices[0];
    }
    renderVoiceButton();
    renderVoicePanel();
  };

  speechSynthesis.addEventListener('voiceschanged', loadVoices);
  loadVoices();

  const voiceKey = v => {
    const label = v.name.replace('Kokoro ', '');
    return Object.entries(VOICES_META).find(([, m]) => m.name === label)?.[0];
  };

  const renderVoiceButton = () => {
    const key = voiceKey(activeVoice);
    const meta = VOICES_META[key] || { name: activeVoice.name.replace('Kokoro ', ''), flag: '🎤' };
    barFlag.textContent = meta.flag;
    barName.textContent = meta.name;
  };

  const renderVoicePanel = () => {
    const groups = {};
    for (const v of voices) {
      const key = voiceKey(v);
      const meta = VOICES_META[key] || { name: v.name.replace('Kokoro ', ''), flag: '🎤', group: 'Other' };
      (groups[meta.group] ??= []).push({ v, meta, key });
    }
    panel.innerHTML = Object.entries(groups).map(([group, list]) => `
      <div class="kp-group">
        <div class="kp-group-label">${list[0].meta.flag} ${group}</div>
        <div class="kp-grid">
          ${list.map(({ v, meta, key }) => `
            <button class="kp-voice-item${v === activeVoice ? ' active' : ''}" data-name="${v.name}">
              ${meta.name}
            </button>
          `).join('')}
        </div>
      </div>
    `).join('');

    panel.querySelectorAll('.kp-voice-item').forEach(btn => {
      btn.addEventListener('click', () => {
        activeVoice = voices.find(v => v.name === btn.dataset.name) || activeVoice;
        renderVoiceButton();
        renderVoicePanel();
        if (speechSynthesis.speaking) {
          restartWithVoice();
        }
        toggleVoicePanel(false);
      });
    });
  };

  // ── playback ──────────────────────────────────────────────────────────────────

  const speak = text => {
    speechSynthesis.cancel();
    if (!text.trim()) return;
    const utt = new SpeechSynthesisUtterance(text);
    utt.voice = activeVoice;
    utt.rate = rate;
    utt.onstart = () => setPlaying(true);
    utt.onend = utt.onerror = () => setPlaying(false);
    speechSynthesis.speak(utt);
  };

  const restartWithVoice = () => {
    const text = pending;
    speak(text);
  };

  const setPlaying = playing => {
    iconPlay.hidden = playing;
    iconPause.hidden = !playing;
    wave.classList.toggle('active', playing);
  };

  // ── speed ────────────────────────────────────────────────────────────────────

  const updateSpeed = () => {
    speedBtn.textContent = rate === 1 ? '1×' : rate + '×';
  };
  updateSpeed();

  speedBtn.addEventListener('click', () => {
    const i = SPEEDS.indexOf(rate);
    rate = SPEEDS[(i + 1) % SPEEDS.length];
    updateSpeed();
    if (speechSynthesis.speaking) restartWithVoice();
  });

  // ── controls ──────────────────────────────────────────────────────────────────

  playBtn.addEventListener('click', () => {
    if (speechSynthesis.paused) {
      speechSynthesis.resume();
      setPlaying(true);
    } else if (speechSynthesis.speaking) {
      speechSynthesis.pause();
      setPlaying(false);
    } else if (pending) {
      speak(pending);
    }
  });

  closeBtn.addEventListener('click', () => {
    speechSynthesis.cancel();
    setVisible(false);
    toggleVoicePanel(false);
  });

  voiceBtn.addEventListener('click', e => {
    e.stopPropagation();
    toggleVoicePanel(!voicePanelOpen);
  });

  document.addEventListener('click', e => {
    if (voicePanelOpen && !root.contains(e.target)) toggleVoicePanel(false);
  });

  // ── visibility ────────────────────────────────────────────────────────────────

  const setVisible = show => {
    visible = show;
    root.classList.toggle('visible', show);
    if (!show) toggleVoicePanel(false);
  };

  const toggleVoicePanel = open => {
    voicePanelOpen = open;
    panel.classList.toggle('open', open);
    voiceBtn.classList.toggle('active', open);
  };

  // ── text selection trigger ────────────────────────────────────────────────────

  document.addEventListener('selectionchange', () => {
    const sel = window.getSelection();
    const text = sel?.toString().trim();
    if (text && text.length > 1) {
      pending = text;
      setVisible(true);
      if (speechSynthesis.speaking || speechSynthesis.paused) {
        speechSynthesis.cancel();
        setPlaying(false);
      }
    }
  });

  // auto-play on double-click selection
  document.addEventListener('mouseup', () => {
    const text = window.getSelection()?.toString().trim();
    if (text && text.length > 1 && !speechSynthesis.speaking) {
      pending = text;
      speak(text);
    }
  });

  // ── toolbar icon message ──────────────────────────────────────────────────────

  chrome.runtime.onMessage.addListener(msg => {
    if (msg.command === 'toggle') {
      if (speechSynthesis.speaking) {
        speechSynthesis.cancel();
        setPlaying(false);
        setVisible(false);
      } else if (pending) {
        setVisible(true);
        speak(pending);
      }
    }
  });
})();
