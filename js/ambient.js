/* =========================================================================
 *  LifeOS — Focus Ambiance System
 *  Procedurally generated ambient soundscapes via the Web Audio API.
 *  No external audio files required — every sound is synthesised in the
 *  browser using oscillators, filtered noise buffers, and gain envelopes.
 * ========================================================================= */

const Ambient = (() => {
  'use strict';

  /* -----------------------------------------------------------------------
   *  Audio context (lazy, resumed on first user gesture)
   * ----------------------------------------------------------------------- */
  let _ctx        = null;   // AudioContext
  let _masterGain = null;   // GainNode at end of chain
  let _activeNodes = [];    // nodes to disconnect on stop

  const _ensureCtx = () => {
    if (!_ctx) {
      _ctx = new (window.AudioContext || window.webkitAudioContext)();
      _masterGain = _ctx.createGain();
      _masterGain.gain.value = _volume;
      _masterGain.connect(_ctx.destination);
    }
    if (_ctx.state === 'suspended') _ctx.resume();
    return _ctx;
  };

  /* -----------------------------------------------------------------------
   *  State
   * ----------------------------------------------------------------------- */
  let _currentSound = null;
  let _isPlaying    = false;
  let _volume       = 0.5;

  /* -----------------------------------------------------------------------
   *  Sound catalogue
   * ----------------------------------------------------------------------- */
  const sounds = [
    { id: 'rain',       name: 'Rain',          icon: '🌧️',  type: 'nature'  },
    { id: 'forest',     name: 'Forest',        icon: '🌲',  type: 'nature'  },
    { id: 'ocean',      name: 'Ocean Waves',   icon: '🌊',  type: 'nature'  },
    { id: 'thunder',    name: 'Thunderstorm',  icon: '⛈️',  type: 'nature'  },
    { id: 'fire',       name: 'Fireplace',     icon: '🔥',  type: 'nature'  },
    { id: 'cafe',       name: 'Coffee Shop',   icon: '☕',  type: 'ambient' },
    { id: 'library',    name: 'Library',       icon: '📚',  type: 'ambient' },
    { id: 'whitenoise', name: 'White Noise',   icon: '📻',  type: 'noise'   },
    { id: 'brownnoise', name: 'Brown Noise',   icon: '🟤',  type: 'noise'   },
    { id: 'pinknoise',  name: 'Pink Noise',    icon: '🩷',  type: 'noise'   }
  ];

  /* -----------------------------------------------------------------------
   *  Utility: create a mono noise buffer
   * ----------------------------------------------------------------------- */
  const _noiseBuffer = (seconds, generator) => {
    const ctx    = _ensureCtx();
    const len    = ctx.sampleRate * seconds;
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data   = buffer.getChannelData(0);
    generator(data, len);
    return buffer;
  };

  /** White noise generator */
  const _whiteGen = (data, len) => {
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  };

  /** Brown noise generator (integrated white noise) */
  const _brownGen = (data, len) => {
    let last = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      last = (last + 0.02 * w) / 1.02;
      data[i] = last * 3.5;
    }
  };

  /** Pink noise generator (Voss-McCartney algorithm) */
  const _pinkGen = (data, len) => {
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + w * 0.0555179;
      b1 = 0.99332 * b1 + w * 0.0750759;
      b2 = 0.96900 * b2 + w * 0.1538520;
      b3 = 0.86650 * b3 + w * 0.3104856;
      b4 = 0.55000 * b4 + w * 0.5329522;
      b5 = -0.7616 * b5 - w * 0.0168980;
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
      b6 = w * 0.115926;
    }
  };

  /* -----------------------------------------------------------------------
   *  Helper: looping noise source with optional filter
   * ----------------------------------------------------------------------- */
  const _loopNoise = (gen, filterType, freq, Q, gain) => {
    const ctx  = _ensureCtx();
    const buf  = _noiseBuffer(4, gen);  // 4 s buffer, looped
    const src  = ctx.createBufferSource();
    src.buffer = buf;
    src.loop   = true;

    let node = src;

    if (filterType) {
      const filt  = ctx.createBiquadFilter();
      filt.type   = filterType;
      filt.frequency.value = freq || 1000;
      if (Q) filt.Q.value = Q;
      node.connect(filt);
      node = filt;
      _activeNodes.push(filt);
    }

    const g = ctx.createGain();
    g.gain.value = gain !== undefined ? gain : 1;
    node.connect(g);
    g.connect(_masterGain);

    src.start();
    _activeNodes.push(src, g);
    return { src, gain: g };
  };

  /* -----------------------------------------------------------------------
   *  Helper: LFO-modulated gain (for wave / breathing effects)
   * ----------------------------------------------------------------------- */
  const _lfo = (target, rate, depth, offset) => {
    const ctx = _ensureCtx();
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = rate;
    amp.gain.value = depth;
    osc.connect(amp);
    amp.connect(target);
    // Set the base value (the offset)
    target.value = offset;
    osc.start();
    _activeNodes.push(osc, amp);
  };

  /* -----------------------------------------------------------------------
   *  Sound generators
   * ----------------------------------------------------------------------- */

  /**
   * Rain — filtered white noise with two layers at different frequencies
   * plus a slow amplitude modulation for variation.
   */
  const createRainSound = () => {
    // Base rain: bandpass-filtered white noise
    const base = _loopNoise(_whiteGen, 'bandpass', 3000, 0.7, 0.5);
    // Higher layer — lighter drizzle
    const hi   = _loopNoise(_whiteGen, 'highpass', 5000, 0.5, 0.15);
    // Low rumble layer
    const lo   = _loopNoise(_brownGen, 'lowpass', 400, 1, 0.15);
    // Slow amplitude swell
    _lfo(base.gain.gain, 0.08, 0.15, 0.5);
  };

  /**
   * Forest — layered filtered noise for wind + birds via modulated
   * high oscillators.
   */
  const createForestSound = () => {
    // Wind through leaves
    const wind = _loopNoise(_pinkGen, 'bandpass', 800, 0.5, 0.25);
    _lfo(wind.gain.gain, 0.05, 0.12, 0.25);

    // Rustling layer
    _loopNoise(_whiteGen, 'bandpass', 2500, 2, 0.08);

    // Simulated bird chirps — periodic high-pitched blips
    const ctx = _ensureCtx();
    const birdBuf = _noiseBuffer(8, (data, len) => {
      // Mostly silence with occasional chirp bursts
      const sr = ctx.sampleRate;
      for (let i = 0; i < len; i++) data[i] = 0;
      // Place 3-5 chirps randomly
      const chirpCount = 3 + Math.floor(Math.random() * 3);
      for (let c = 0; c < chirpCount; c++) {
        const start = Math.floor(Math.random() * (len - sr * 0.15));
        const dur   = Math.floor(sr * (0.03 + Math.random() * 0.12));
        const freq  = 3000 + Math.random() * 3000;
        for (let j = 0; j < dur && (start + j) < len; j++) {
          const env = Math.sin(Math.PI * j / dur);
          data[start + j] = env * 0.3 * Math.sin(2 * Math.PI * freq * j / sr);
        }
      }
    });
    const birdSrc  = ctx.createBufferSource();
    birdSrc.buffer = birdBuf;
    birdSrc.loop   = true;
    const birdGain = ctx.createGain();
    birdGain.gain.value = 0.25;
    birdSrc.connect(birdGain);
    birdGain.connect(_masterGain);
    birdSrc.start();
    _activeNodes.push(birdSrc, birdGain);
  };

  /**
   * Ocean Waves — brown noise with a strong slow LFO to simulate
   * the rise and fall of waves crashing on shore.
   */
  const createOceanSound = () => {
    // Deep wave layer
    const wave = _loopNoise(_brownGen, 'lowpass', 600, 1, 0.55);
    _lfo(wave.gain.gain, 0.07, 0.4, 0.55);

    // Foam / hiss layer
    const foam = _loopNoise(_whiteGen, 'bandpass', 4000, 0.6, 0.12);
    _lfo(foam.gain.gain, 0.07, 0.1, 0.12);

    // Sub-bass rumble
    const ctx = _ensureCtx();
    const sub = ctx.createOscillator();
    sub.type = 'sine';
    sub.frequency.value = 55;
    const subG = ctx.createGain();
    subG.gain.value = 0.08;
    sub.connect(subG);
    subG.connect(_masterGain);
    _lfo(subG.gain, 0.07, 0.06, 0.08);
    sub.start();
    _activeNodes.push(sub, subG);
  };

  /**
   * Thunderstorm — rain base + periodic low rumbles synthesised
   * from shaped brown noise.
   */
  const createThunderSound = () => {
    // Rain base
    createRainSound();

    // Thunder rumble layer — very low filtered noise with slow surges
    const rumble = _loopNoise(_brownGen, 'lowpass', 180, 1, 0.3);
    _lfo(rumble.gain.gain, 0.03, 0.25, 0.3);

    // Occasional deep boom
    const ctx = _ensureCtx();
    const boomBuf = _noiseBuffer(10, (data, len) => {
      const sr = ctx.sampleRate;
      for (let i = 0; i < len; i++) data[i] = 0;
      // 1-2 booms in 10 seconds
      const count = 1 + Math.floor(Math.random() * 2);
      for (let c = 0; c < count; c++) {
        const start = Math.floor(Math.random() * (len - sr * 2));
        const dur   = Math.floor(sr * (1 + Math.random()));
        for (let j = 0; j < dur && (start + j) < len; j++) {
          const env = Math.pow(1 - j / dur, 2);
          data[start + j] = env * (Math.random() * 2 - 1) * 0.7;
        }
      }
    });
    const boomSrc  = ctx.createBufferSource();
    boomSrc.buffer = boomBuf;
    boomSrc.loop   = true;
    const boomFilt = ctx.createBiquadFilter();
    boomFilt.type  = 'lowpass';
    boomFilt.frequency.value = 200;
    const boomGain = ctx.createGain();
    boomGain.gain.value = 0.5;
    boomSrc.connect(boomFilt);
    boomFilt.connect(boomGain);
    boomGain.connect(_masterGain);
    boomSrc.start();
    _activeNodes.push(boomSrc, boomFilt, boomGain);
  };

  /**
   * Fireplace — crackling pops over a warm low hum.
   */
  const createFireSound = () => {
    // Warm base — low filtered brown noise
    _loopNoise(_brownGen, 'lowpass', 350, 1, 0.3);

    // Crackle layer — sparse random pops
    const ctx = _ensureCtx();
    const crackleBuf = _noiseBuffer(6, (data, len) => {
      const sr = ctx.sampleRate;
      for (let i = 0; i < len; i++) data[i] = 0;

      // Scatter 30-60 tiny pops
      const popCount = 30 + Math.floor(Math.random() * 30);
      for (let p = 0; p < popCount; p++) {
        const start = Math.floor(Math.random() * (len - 500));
        const dur   = Math.floor(80 + Math.random() * 400);
        const amp   = 0.15 + Math.random() * 0.4;
        for (let j = 0; j < dur && (start + j) < len; j++) {
          const env = Math.exp(-j / (dur * 0.15));
          data[start + j] += env * (Math.random() * 2 - 1) * amp;
        }
      }
    });
    const crackleSrc  = ctx.createBufferSource();
    crackleSrc.buffer = crackleBuf;
    crackleSrc.loop   = true;
    const crackleHP   = ctx.createBiquadFilter();
    crackleHP.type    = 'highpass';
    crackleHP.frequency.value = 800;
    const crackleGain = ctx.createGain();
    crackleGain.gain.value = 0.6;
    crackleSrc.connect(crackleHP);
    crackleHP.connect(crackleGain);
    crackleGain.connect(_masterGain);
    crackleSrc.start();
    _activeNodes.push(crackleSrc, crackleHP, crackleGain);

    // Ember glow — very quiet low oscillation
    const ember = ctx.createOscillator();
    ember.type = 'sine';
    ember.frequency.value = 80;
    const emberGain = ctx.createGain();
    emberGain.gain.value = 0.04;
    ember.connect(emberGain);
    emberGain.connect(_masterGain);
    _lfo(emberGain.gain, 0.15, 0.02, 0.04);
    ember.start();
    _activeNodes.push(ember, emberGain);
  };

  /**
   * Coffee Shop — background murmur (filtered noise) + occasional
   * cup-clink and quiet ambience hum.
   */
  const createCafeSound = () => {
    // Background chatter — bandpassed noise centred on speech freq
    const chatter = _loopNoise(_pinkGen, 'bandpass', 1200, 0.6, 0.25);
    _lfo(chatter.gain.gain, 0.04, 0.08, 0.25);

    // Higher murmur layer
    _loopNoise(_whiteGen, 'bandpass', 2400, 1.5, 0.06);

    // Very low room tone
    _loopNoise(_brownGen, 'lowpass', 250, 1, 0.1);

    // Periodic clinks / cup sounds
    const ctx = _ensureCtx();
    const clinkBuf = _noiseBuffer(12, (data, len) => {
      const sr = ctx.sampleRate;
      for (let i = 0; i < len; i++) data[i] = 0;
      const count = 3 + Math.floor(Math.random() * 4);
      for (let c = 0; c < count; c++) {
        const start = Math.floor(Math.random() * (len - sr * 0.1));
        const dur   = Math.floor(sr * (0.02 + Math.random() * 0.08));
        const freq  = 2500 + Math.random() * 3500;
        for (let j = 0; j < dur && (start + j) < len; j++) {
          const env = Math.exp(-j / (dur * 0.2));
          data[start + j] = env * Math.sin(2 * Math.PI * freq * j / sr) * 0.15;
        }
      }
    });
    const clinkSrc  = ctx.createBufferSource();
    clinkSrc.buffer = clinkBuf;
    clinkSrc.loop   = true;
    const clinkGain = ctx.createGain();
    clinkGain.gain.value = 0.25;
    clinkSrc.connect(clinkGain);
    clinkGain.connect(_masterGain);
    clinkSrc.start();
    _activeNodes.push(clinkSrc, clinkGain);
  };

  /**
   * Library — very quiet, almost ASMR-like: soft air-conditioning hum,
   * distant page turns, muffled atmosphere.
   */
  const createLibrarySound = () => {
    // HVAC / air-con hum
    const ctx = _ensureCtx();
    const hum = ctx.createOscillator();
    hum.type = 'sine';
    hum.frequency.value = 100;
    const humGain = ctx.createGain();
    humGain.gain.value = 0.06;
    const humFilt = ctx.createBiquadFilter();
    humFilt.type = 'lowpass';
    humFilt.frequency.value = 200;
    hum.connect(humFilt);
    humFilt.connect(humGain);
    humGain.connect(_masterGain);
    hum.start();
    _activeNodes.push(hum, humFilt, humGain);

    // Very soft air noise
    _loopNoise(_pinkGen, 'lowpass', 800, 0.5, 0.07);

    // Occasional page-turn rustles
    const rustleBuf = _noiseBuffer(16, (data, len) => {
      const sr = ctx.sampleRate;
      for (let i = 0; i < len; i++) data[i] = 0;
      const count = 2 + Math.floor(Math.random() * 3);
      for (let c = 0; c < count; c++) {
        const start = Math.floor(Math.random() * (len - sr * 0.3));
        const dur   = Math.floor(sr * (0.1 + Math.random() * 0.2));
        for (let j = 0; j < dur && (start + j) < len; j++) {
          const env = Math.sin(Math.PI * j / dur);
          data[start + j] = env * (Math.random() * 2 - 1) * 0.08;
        }
      }
    });
    const rustleSrc = ctx.createBufferSource();
    rustleSrc.buffer = rustleBuf;
    rustleSrc.loop = true;
    const rustleHP = ctx.createBiquadFilter();
    rustleHP.type = 'highpass';
    rustleHP.frequency.value = 2000;
    const rustleGain = ctx.createGain();
    rustleGain.gain.value = 0.4;
    rustleSrc.connect(rustleHP);
    rustleHP.connect(rustleGain);
    rustleGain.connect(_masterGain);
    rustleSrc.start();
    _activeNodes.push(rustleSrc, rustleHP, rustleGain);
  };

  /** White noise — clean, flat spectrum. */
  const createWhiteNoise = () => {
    _loopNoise(_whiteGen, null, null, null, 0.35);
  };

  /** Brown noise — deep, warm rumble. */
  const createBrownNoise = () => {
    _loopNoise(_brownGen, 'lowpass', 800, 1, 0.55);
  };

  /** Pink noise — balanced, natural-sounding. */
  const createPinkNoise = () => {
    _loopNoise(_pinkGen, null, null, null, 0.4);
  };

  /* -----------------------------------------------------------------------
   *  Generator dispatch
   * ----------------------------------------------------------------------- */
  const _generators = {
    rain:       createRainSound,
    forest:     createForestSound,
    ocean:      createOceanSound,
    thunder:    createThunderSound,
    fire:       createFireSound,
    cafe:       createCafeSound,
    library:    createLibrarySound,
    whitenoise: createWhiteNoise,
    brownnoise: createBrownNoise,
    pinknoise:  createPinkNoise
  };

  /* -----------------------------------------------------------------------
   *  Playback controls
   * ----------------------------------------------------------------------- */

  const _stopNodes = () => {
    _activeNodes.forEach((n) => {
      try { if (n.stop) n.stop(); } catch (_) { /* already stopped */ }
      try { n.disconnect(); } catch (_) { /* ok */ }
    });
    _activeNodes = [];
  };

  const play = (soundId) => {
    _ensureCtx();

    // If same sound, just resume
    if (soundId === _currentSound && _isPlaying) return;

    // Stop previous
    _stopNodes();

    const gen = _generators[soundId];
    if (!gen) { console.warn(`[Ambient] Unknown sound: ${soundId}`); return; }

    gen();
    _currentSound = soundId;
    _isPlaying = true;
  };

  const pause = () => {
    _stopNodes();
    _isPlaying = false;
    // Keep _currentSound so toggle can resume
  };

  const toggle = () => {
    if (_isPlaying) {
      pause();
    } else if (_currentSound) {
      play(_currentSound);
    } else {
      // Default to rain
      play('rain');
    }
  };

  const setVolume = (vol) => {
    _volume = Math.max(0, Math.min(1, vol));
    if (_masterGain) {
      _masterGain.gain.setTargetAtTime(_volume, _ctx.currentTime, 0.05);
    }
  };

  const getSounds = () => sounds.map((s) => ({
    ...s,
    active: s.id === _currentSound && _isPlaying
  }));

  /* -----------------------------------------------------------------------
   *  Fullscreen
   * ----------------------------------------------------------------------- */

  const enterFullscreen = () => {
    const el = document.documentElement;
    const rfs = el.requestFullscreen || el.webkitRequestFullscreen
             || el.mozRequestFullScreen || el.msRequestFullscreen;
    if (rfs) rfs.call(el);
  };

  const exitFullscreen = () => {
    const efs = document.exitFullscreen || document.webkitExitFullscreen
             || document.mozCancelFullScreen || document.msExitFullscreen;
    if (efs) efs.call(document);
  };

  const toggleFullscreen = () => {
    isFullscreen() ? exitFullscreen() : enterFullscreen();
  };

  const isFullscreen = () =>
    !!(document.fullscreenElement || document.webkitFullscreenElement
    || document.mozFullScreenElement || document.msFullscreenElement);

  /* -----------------------------------------------------------------------
   *  Spotify embed (optional enrichment)
   * ----------------------------------------------------------------------- */

  /**
   * Inject a Spotify embed iframe into a target container.
   * @param {string} uri   Spotify URI, e.g. 'spotify:playlist:37i9dQZF1DX5trt9i14X7j'
   * @param {string} [containerId='spotify-embed']  DOM id of the container
   */
  const embedSpotifyPlaylist = (uri, containerId = 'spotify-embed') => {
    const container = document.getElementById(containerId);
    if (!container) {
      console.warn(`[Ambient] Container #${containerId} not found`);
      return;
    }

    // Convert URI → embed URL
    // spotify:playlist:ID  →  https://open.spotify.com/embed/playlist/ID
    const parts    = uri.replace('spotify:', '').split(':');
    const type     = parts[0] || 'playlist';
    const id       = parts[1] || parts[0];
    const embedUrl = `https://open.spotify.com/embed/${type}/${id}?utm_source=generator&theme=0`;

    container.innerHTML = '';
    const iframe = document.createElement('iframe');
    iframe.src             = embedUrl;
    iframe.width           = '100%';
    iframe.height          = '152';
    iframe.frameBorder     = '0';
    iframe.allow           = 'autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture';
    iframe.loading         = 'lazy';
    iframe.style.borderRadius = '12px';
    container.appendChild(iframe);
  };

  /* -----------------------------------------------------------------------
   *  Public API
   * ----------------------------------------------------------------------- */
  return {
    /* State (read-only getters) */
    get currentSound() { return _currentSound; },
    get isPlaying()    { return _isPlaying; },
    get volume()       { return _volume; },

    /* Catalogue */
    sounds,

    /* Playback */
    play,
    pause,
    toggle,
    setVolume,
    getSounds,

    /* Sound generators (exposed for advanced use) */
    createRainSound,
    createOceanSound,
    createWhiteNoise,
    createBrownNoise,
    createPinkNoise,
    createFireSound,
    createCafeSound,
    createForestSound,
    createLibrarySound,
    createThunderSound,

    /* Fullscreen */
    enterFullscreen,
    exitFullscreen,
    toggleFullscreen,
    isFullscreen,

    /* Spotify */
    embedSpotifyPlaylist
  };
})();
