const map = {
  'Kokoro Heart': 'af_heart',
  'Kokoro Alloy': 'af_alloy',
  'Kokoro Aoede': 'af_aoede',
  'Kokoro Bella': 'af_bella',
  'Kokoro Jessica': 'af_jessica',
  'Kokoro Kore': 'af_kore',
  'Kokoro Nicole': 'af_nicole',
  'Kokoro Nova': 'af_nova',
  'Kokoro River': 'af_river',
  'Kokoro Sarah': 'af_sarah',
  'Kokoro Sky': 'af_sky',
  'Kokoro Adam': 'am_adam',
  'Kokoro Echo': 'am_echo',
  'Kokoro Eric': 'am_eric',
  'Kokoro Fenrir': 'am_fenrir',
  'Kokoro Liam': 'am_liam',
  'Kokoro Michael': 'am_michael',
  'Kokoro Onyx': 'am_onyx',
  'Kokoro Puck': 'am_puck',
  'Kokoro Santa': 'am_santa',
  'Kokoro Emma': 'bf_emma',
  'Kokoro Isabella': 'bf_isabella',
  'Kokoro George': 'bm_george',
  'Kokoro Lewis': 'bm_lewis',
  'Kokoro Alice': 'bf_alice',
  'Kokoro Lily': 'bf_lily',
  'Kokoro Daniel': 'bm_daniel',
  'Kokoro Fable': 'bm_fable'
};

const prepare = async ({device = 'wasm', dtype = 'q8'}) => {
  if (typeof self.tts === 'undefined') {
    const {env, KokoroTTS} = await import('/offscreen/kokoro/kokoro.web.js');
    env.wasmPaths = {
      wasm: '/offscreen/ort/ort-wasm-simd-threaded.jsep.wasm',
      mjs: '/offscreen/ort/ort-wasm-simd-threaded.jsep.mjs'
    };
    env.telemetry = false;
    env.useNetwork = false;

    self.tts = await KokoroTTS.from_pretrained('onnx-community/Kokoro-82M-v1.0-ONNX', {
      dtype,
      device
    });
  }
};

// Chrome's HTMLAudioElement only decodes PCM (format 1) WAV, not IEEE Float (format 3).
// kokoro-js toBlob() emits format 3, so we re-encode as 16-bit PCM here.
const toPCMBlob = (samples, sampleRate) => {
  const buf = new ArrayBuffer(44 + samples.length * 2);
  const v = new DataView(buf);
  const s = (o, str) => { for (let i = 0; i < str.length; i++) v.setUint8(o + i, str.charCodeAt(i)); };
  s(0, 'RIFF'); v.setUint32(4, 36 + samples.length * 2, true);
  s(8, 'WAVE'); s(12, 'fmt '); v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);                    // PCM
  v.setUint16(22, 1, true);                    // mono
  v.setUint32(24, sampleRate, true);
  v.setUint32(28, sampleRate * 2, true);       // byte rate
  v.setUint16(32, 2, true);                    // block align
  v.setUint16(34, 16, true);                   // bits per sample
  s(36, 'data'); v.setUint32(40, samples.length * 2, true);
  for (let i = 0; i < samples.length; i++) {
    const x = Math.max(-1, Math.min(1, samples[i]));
    v.setInt16(44 + i * 2, x < 0 ? x * 0x8000 : x * 0x7FFF, true);
  }
  return new Blob([buf], {type: 'audio/wav'});
};

onmessage = async e => {
  const {data} = e;

  if (data.command === 'tts-request') {
    await prepare(data);

    const r = await self.tts.generate(data.segment, {
      voice: map[data.options.voiceName] || 'am_adam'
    });

    postMessage({
      command: 'tts-response',
      uuid: data.uuid,
      blob: toPCMBlob(r.audio, r.sampling_rate)
    });
  }
};
