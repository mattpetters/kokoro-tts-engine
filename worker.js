const offscreen = async () => {
  const exists = await chrome.offscreen.hasDocument();
  if (!exists) {
    await chrome.offscreen.createDocument({
      url: 'offscreen/index.html',
      reasons: ['AUDIO_PLAYBACK'],
      justification: 'Needed to play synthesized TTS audio'
    });
  }
};

const activeEvents = new Map();
chrome.runtime.onConnect.addListener(port => {
  if (port.name === 'offscreen') {
    port.onDisconnect.addListener(() => {
      for (const sendTtsEvent of activeEvents.values()) {
        sendTtsEvent({
          type: 'error',
          errorMessage: 'Unexpected termination of the offscreen page'
        });
      }
      activeEvents.clear();
    });
  }
});

chrome.ttsEngine.onSpeak.addListener(async (utterance, options, sendTtsEvent) => {
  const uuid = Date.now();
  activeEvents.set(uuid, sendTtsEvent);

  await offscreen();

  const prefs = await chrome.storage.local.get({
    'dtype': 'q8',   // "fp32", "fp16", "q8", "q4", "q4f16"
    'device': 'wasm' // "wasm", "webgpu", "cpu" — use wasm; webgpu requires fp16/q4f16 not q8
  });

  chrome.runtime.sendMessage({
    command: 'bg:speak',
    utterance,
    options,
    ...prefs,
    uuid
  });
});
chrome.ttsEngine.onStop.addListener(() => chrome.runtime.sendMessage({
  command: 'bg:stop-all'
}));

chrome.runtime.onMessage.addListener(request => {
  // handle offscreen responses
  if (request.command.startsWith('of:')) {
    const sendTtsEvent = activeEvents.get(request.uuid);
    if (sendTtsEvent) {
      if (request.command === 'of:start') {
        sendTtsEvent({type: 'start'});
      }
      else if (request.command === 'of:end') {
        sendTtsEvent({type: 'end', charIndex: request.length});
      }
      else if (request.command === 'of:sentence') {
        sendTtsEvent({type: 'sentence', charIndex: request.index});
      }
      else if (request.command === 'of:error') {
        sendTtsEvent({type: 'error', errorMessage: request.message});
      }
    }
  }
});

chrome.action.onClicked.addListener(tab => {
  chrome.tabs.sendMessage(tab.id, {command: 'toggle'});
});

self.addEventListener('fetch', e => {
  e.respondWith(fetch(e.request));
});

/* FAQs & Feedback */
{
  const {management, runtime: {onInstalled, setUninstallURL, getManifest}, storage, tabs} = chrome;
  if (navigator.webdriver !== true) {
    const {homepage_url: page, name, version} = getManifest();
    onInstalled.addListener(({reason, previousVersion}) => {
      management.getSelf(({installType}) => installType === 'normal' && storage.local.get({
        'faqs': true,
        'last-update': 0
      }, prefs => {
        if (reason === 'install' || (prefs.faqs && reason === 'update')) {
          const doUpdate = (Date.now() - prefs['last-update']) / 1000 / 60 / 60 / 24 > 45;
          if (doUpdate && previousVersion !== version) {
            tabs.query({active: true, lastFocusedWindow: true}, tbs => tabs.create({
              url: page + '?version=' + version + (previousVersion ? '&p=' + previousVersion : '') + '&type=' + reason,
              active: reason === 'install',
              ...(tbs && tbs.length && {index: tbs[0].index + 1})
            }));
            storage.local.set({'last-update': Date.now()});
          }
        }
      }));
    });
    setUninstallURL(page + '?rd=feedback&name=' + encodeURIComponent(name) + '&version=' + version);
  }
}
