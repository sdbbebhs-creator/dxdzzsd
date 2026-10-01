/**
 * High-Fidelity Synthesized Game Sound Effects using Web Audio API
 * Realistic acoustic synthesis, dynamic harmonics & zero external dependencies.
 */

let audioCtx: AudioContext | null = null;
let isMuted: boolean = false;
let isBgmDisabled: boolean = false;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export function setGameAudioMuted(muted: boolean) {
  isMuted = muted;
  try {
    localStorage.setItem('game_audio_muted', muted ? 'true' : 'false');
  } catch {}
  if (muted) {
    stopGameBGM();
  }
}

export function isGameAudioMuted(): boolean {
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem('game_audio_muted');
      if (saved !== null) return saved === 'true';
    } catch {}
  }
  return isMuted;
}

export function setGameBGMMuted(muted: boolean) {
  isBgmDisabled = muted;
  try {
    localStorage.setItem('game_bgm_muted', muted ? 'true' : 'false');
  } catch {}
  if (muted) {
    stopGameBGM();
  }
}

export function isGameBGMMuted(): boolean {
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem('game_bgm_muted');
      if (saved !== null) return saved === 'true';
    } catch {}
  }
  return isBgmDisabled;
}

// ==========================================
// BACKGROUND MUSIC (BGM) SYNTHESIZER ENGINE
// ==========================================
type BGMTheme = 'space' | 'western' | 'missile' | null;
let currentBGMTheme: BGMTheme = null;
let bgmInterval: NodeJS.Timeout | null = null;
let bgmStep = 0;
let bgmMasterGain: GainNode | null = null;

function ensureBgmMaster(): GainNode | null {
  const ctx = getAudioContext();
  if (!ctx) return null;
  if (!bgmMasterGain) {
    bgmMasterGain = ctx.createGain();
    bgmMasterGain.gain.setValueAtTime(0.18, ctx.currentTime);
    bgmMasterGain.connect(ctx.destination);
  }
  return bgmMasterGain;
}

/**
 * Stop any currently running background music smoothly
 */
export function stopGameBGM() {
  if (bgmInterval) {
    clearInterval(bgmInterval);
    bgmInterval = null;
  }
  if (bgmMasterGain && audioCtx) {
    try {
      const now = audioCtx.currentTime;
      bgmMasterGain.gain.setValueAtTime(bgmMasterGain.gain.value, now);
      bgmMasterGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);
      setTimeout(() => {
        if (bgmMasterGain && !currentBGMTheme) {
          bgmMasterGain.gain.setValueAtTime(0.18, audioCtx ? audioCtx.currentTime : 0);
        }
      }, 300);
    } catch {}
  }
  currentBGMTheme = null;
  bgmStep = 0;
}

/**
 * 1. SPACE SHOOTER BGM: Driving Cyberpunk Synthwave / Deep Space Pulse (125 BPM)
 */
export function startSpaceBGM() {
  if (isGameAudioMuted() || isGameBGMMuted()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  stopGameBGM();
  currentBGMTheme = 'space';
  bgmStep = 0;

  const master = ensureBgmMaster();
  if (!master) return;
  master.gain.cancelScheduledValues(ctx.currentTime);
  master.gain.setValueAtTime(0.18, ctx.currentTime);

  const stepMs = 120; // ~125 BPM 16th notes
  // D minor synthwave progression: D -> F -> C -> G
  const bassNotes = [
    73.42, 73.42, 146.83, 73.42, // D2, D2, D3, D2
    87.31, 87.31, 174.61, 87.31, // F2, F2, F3, F2
    65.41, 65.41, 130.81, 65.41, // C2, C2, C3, C2
    98.00, 98.00, 196.00, 98.00, // G2, G2, G3, G2
  ];

  const leadNotes = [
    293.66, 0, 349.23, 0, 440.0, 0, 392.0, 0, // D4, F4, A4, G4
    523.25, 0, 440.0, 0, 392.0, 349.23, 293.66, 0, // C5, A4, G4, F4, D4
  ];

  bgmInterval = setInterval(() => {
    if (isGameAudioMuted() || isGameBGMMuted() || currentBGMTheme !== 'space') {
      stopGameBGM();
      return;
    }
    const now = ctx.currentTime;
    const step = bgmStep % 16;

    // 1. Kick on beat 0, 4, 8, 12
    if (step % 4 === 0) {
      try {
        const kickOsc = ctx.createOscillator();
        const kickGain = ctx.createGain();
        kickOsc.type = 'sine';
        kickOsc.frequency.setValueAtTime(140, now);
        kickOsc.frequency.exponentialRampToValueAtTime(32, now + 0.08);
        kickGain.gain.setValueAtTime(0.38, now);
        kickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        kickOsc.connect(kickGain);
        kickGain.connect(master);
        kickOsc.start(now);
        kickOsc.stop(now + 0.09);
      } catch {}
    }

    // 2. Hi-hat on offbeats (2, 6, 10, 14)
    if (step % 2 === 1) {
      try {
        const hhBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.03, ctx.sampleRate);
        const data = hhBuffer.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.15;
        const hhSource = ctx.createBufferSource();
        hhSource.buffer = hhBuffer;
        const hhFilter = ctx.createBiquadFilter();
        hhFilter.type = 'highpass';
        hhFilter.frequency.setValueAtTime(7000, now);
        const hhGain = ctx.createGain();
        hhGain.gain.setValueAtTime(step % 4 === 2 ? 0.12 : 0.06, now);
        hhGain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
        hhSource.connect(hhFilter);
        hhFilter.connect(hhGain);
        hhGain.connect(master);
        hhSource.start(now);
        hhSource.stop(now + 0.035);
      } catch {}
    }

    // 3. Rolling Bassline
    const bassFreq = bassNotes[step];
    if (bassFreq > 0) {
      try {
        const bassOsc = ctx.createOscillator();
        const bassGain = ctx.createGain();
        const bassFilter = ctx.createBiquadFilter();
        bassOsc.type = 'sawtooth';
        bassOsc.frequency.setValueAtTime(bassFreq, now);

        bassFilter.type = 'lowpass';
        bassFilter.frequency.setValueAtTime(450, now);
        bassFilter.Q.setValueAtTime(3, now);

        bassGain.gain.setValueAtTime(0.18, now);
        bassGain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);

        bassOsc.connect(bassFilter);
        bassFilter.connect(bassGain);
        bassGain.connect(master);
        bassOsc.start(now);
        bassOsc.stop(now + 0.12);
      } catch {}
    }

    // 4. Ethereal Space Lead
    const leadFreq = leadNotes[step];
    if (leadFreq > 0) {
      try {
        const leadOsc = ctx.createOscillator();
        const leadGain = ctx.createGain();
        leadOsc.type = 'triangle';
        leadOsc.frequency.setValueAtTime(leadFreq, now);
        leadGain.gain.setValueAtTime(0.08, now);
        leadGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
        leadOsc.connect(leadGain);
        leadGain.connect(master);
        leadOsc.start(now);
        leadOsc.stop(now + 0.24);
      } catch {}
    }

    bgmStep++;
  }, stepMs);
}

/**
 * 2. WILD WEST BGM: Ennio Morricone Standoff Atmosphere (90 BPM)
 * Haunting acoustic guitar twangs, whistle motifs, and steady desert heartbeat.
 */
export function startWesternBGM() {
  if (isGameAudioMuted() || isGameBGMMuted()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  stopGameBGM();
  currentBGMTheme = 'western';
  bgmStep = 0;

  const master = ensureBgmMaster();
  if (!master) return;
  master.gain.cancelScheduledValues(ctx.currentTime);
  master.gain.setValueAtTime(0.18, ctx.currentTime);

  const stepMs = 170; // 90 BPM eighth-note pulse
  // Acoustic Western E minor / A minor cadence
  const guitarChords = [
    [164.81, 246.94, 329.63], // E minor (E3, B3, E4)
    [0, 0, 0],
    [196.0, 246.94, 392.0],  // G major
    [0, 0, 0],
    [220.0, 261.63, 440.0],  // A minor (A3, C4, A4)
    [0, 0, 0],
    [246.94, 311.13, 493.88], // B7 (B3, D#4, B4)
    [0, 0, 0],
  ];

  // Whistling desert melody (E4 -> G4 -> A4 -> B4 -> A4 -> G4 -> E4)
  const whistleMelody = [
    329.63, 0, 392.0, 0, 440.0, 493.88, 440.0, 0,
    392.0, 0, 329.63, 0, 293.66, 0, 329.63, 0,
  ];

  bgmInterval = setInterval(() => {
    if (isGameAudioMuted() || isGameBGMMuted() || currentBGMTheme !== 'western') {
      stopGameBGM();
      return;
    }
    const now = ctx.currentTime;
    const step = bgmStep % 16;
    const chordIdx = (Math.floor(step / 2)) % guitarChords.length;

    // 1. Desert Heartbeat / Standoff Thud (beats 0, 4, 8, 12)
    if (step % 4 === 0) {
      try {
        const thudOsc = ctx.createOscillator();
        const thudGain = ctx.createGain();
        thudOsc.type = 'sine';
        thudOsc.frequency.setValueAtTime(85, now);
        thudOsc.frequency.exponentialRampToValueAtTime(38, now + 0.14);
        thudGain.gain.setValueAtTime(0.28, now);
        thudGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        thudOsc.connect(thudGain);
        thudGain.connect(master);
        thudOsc.start(now);
        thudOsc.stop(now + 0.16);
      } catch {}
    }

    // 2. Cowboy Spur Clink (tambourine/metallic snap on beats 2, 6, 10, 14)
    if (step % 4 === 2) {
      try {
        const spurOsc = ctx.createOscillator();
        const spurGain = ctx.createGain();
        spurOsc.type = 'triangle';
        spurOsc.frequency.setValueAtTime(2400, now);
        spurOsc.frequency.exponentialRampToValueAtTime(800, now + 0.05);
        spurGain.gain.setValueAtTime(0.09, now);
        spurGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
        spurOsc.connect(spurGain);
        spurGain.connect(master);
        spurOsc.start(now);
        spurOsc.stop(now + 0.06);
      } catch {}
    }

    // 3. Acoustic Guitar Twang
    const chord = guitarChords[chordIdx];
    if (chord && chord[0] > 0 && step % 2 === 0) {
      chord.forEach((freq, idx) => {
        try {
          const strumNow = now + idx * 0.02;
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, strumNow);
          gain.gain.setValueAtTime(0.12, strumNow);
          gain.gain.exponentialRampToValueAtTime(0.001, strumNow + 0.32);
          osc.connect(gain);
          gain.connect(master);
          osc.start(strumNow);
          osc.stop(strumNow + 0.34);
        } catch {}
      });
    }

    // 4. Haunting Whistle Melody with gentle vibrato
    const whistleFreq = whistleMelody[step];
    if (whistleFreq > 0) {
      try {
        const whistleOsc = ctx.createOscillator();
        const whistleGain = ctx.createGain();
        whistleOsc.type = 'sine';
        // Add subtle pitch glide/vibrato
        whistleOsc.frequency.setValueAtTime(whistleFreq * 0.99, now);
        whistleOsc.frequency.linearRampToValueAtTime(whistleFreq, now + 0.06);

        whistleGain.gain.setValueAtTime(0.14, now);
        whistleGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

        whistleOsc.connect(whistleGain);
        whistleGain.connect(master);
        whistleOsc.start(now);
        whistleOsc.stop(now + 0.32);
      } catch {}
    }

    bgmStep++;
  }, stepMs);
}

/**
 * 3. MISSILE DEFENSE BGM: Tactical Radar Countdown / Military Cyber Action (135 BPM)
 * Driving high-tension sonar pings, urgent synth arpeggio and defense sirens.
 */
export function startMissileBGM() {
  if (isGameAudioMuted() || isGameBGMMuted()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  stopGameBGM();
  currentBGMTheme = 'missile';
  bgmStep = 0;

  const master = ensureBgmMaster();
  if (!master) return;
  master.gain.cancelScheduledValues(ctx.currentTime);
  master.gain.setValueAtTime(0.18, ctx.currentTime);

  const stepMs = 110; // ~136 BPM tactical 16th rhythm
  // Urgent tactical sequence in A minor
  const arpNotes = [
    220.0, 261.63, 329.63, 440.0, // A3, C4, E4, A4
    220.0, 261.63, 329.63, 392.0, // A3, C4, E4, G4
    207.65, 246.94, 329.63, 415.3, // G#3, B3, E4, G#4
    220.0, 293.66, 349.23, 440.0, // A3, D4, F4, A4
  ];

  bgmInterval = setInterval(() => {
    if (isGameAudioMuted() || isGameBGMMuted() || currentBGMTheme !== 'missile') {
      stopGameBGM();
      return;
    }
    const now = ctx.currentTime;
    const step = bgmStep % 16;

    // 1. Radar Sonar Ping on step 0 and 8
    if (step === 0 || step === 8) {
      try {
        const pingOsc = ctx.createOscillator();
        const pingGain = ctx.createGain();
        pingOsc.type = 'sine';
        pingOsc.frequency.setValueAtTime(1760, now); // High A6 sonar
        pingGain.gain.setValueAtTime(0.15, now);
        pingGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        pingOsc.connect(pingGain);
        pingGain.connect(master);
        pingOsc.start(now);
        pingOsc.stop(now + 0.36);
      } catch {}
    }

    // 2. Tactical Military Kick / Sub-beat (every 4 steps)
    if (step % 4 === 0) {
      try {
        const kickOsc = ctx.createOscillator();
        const kickGain = ctx.createGain();
        kickOsc.type = 'triangle';
        kickOsc.frequency.setValueAtTime(160, now);
        kickOsc.frequency.exponentialRampToValueAtTime(45, now + 0.08);
        kickGain.gain.setValueAtTime(0.36, now);
        kickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
        kickOsc.connect(kickGain);
        kickGain.connect(master);
        kickOsc.start(now);
        kickOsc.stop(now + 0.1);
      } catch {}
    }

    // 3. Urgent Tactical Arpeggio
    const arpFreq = arpNotes[step];
    if (arpFreq) {
      try {
        const arpOsc = ctx.createOscillator();
        const arpGain = ctx.createGain();
        const arpFilter = ctx.createBiquadFilter();
        arpOsc.type = 'sawtooth';
        arpOsc.frequency.setValueAtTime(arpFreq, now);

        arpFilter.type = 'bandpass';
        arpFilter.frequency.setValueAtTime(900, now);
        arpFilter.Q.setValueAtTime(2, now);

        arpGain.gain.setValueAtTime(0.15, now);
        arpGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

        arpOsc.connect(arpFilter);
        arpFilter.connect(arpGain);
        arpGain.connect(master);
        arpOsc.start(now);
        arpOsc.stop(now + 0.11);
      } catch {}
    }

    bgmStep++;
  }, stepMs);
}

/**
 * High-tech plasma laser shot with dual oscillator & frequency modulation
 */
export function playLaserShot() {
  if (isGameAudioMuted()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(1100, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.14);

    // Filter to give high-energy pulse
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(3500, now);
    filter.frequency.exponentialRampToValueAtTime(300, now + 0.14);

    gain.gain.setValueAtTime(0.28, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.15);
  } catch {}
}

/**
 * Western Revolver hammer cocking (crisp metallic click-clack)
 */
export function playRevolverCock() {
  if (isGameAudioMuted()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    [0, 0.06].forEach((offset) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1800, now + offset);
      osc.frequency.exponentialRampToValueAtTime(900, now + offset + 0.025);

      gain.gain.setValueAtTime(0.2, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.025);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + offset);
      osc.stop(now + offset + 0.03);
    });
  } catch {}
}

/**
 * Western Gunshot with crisp powder crack + sub-bass body + reverberant desert tail
 */
export function playGunshot() {
  if (isGameAudioMuted()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;

    // 1. Initial powder snap
    const snapOsc = ctx.createOscillator();
    const snapGain = ctx.createGain();
    snapOsc.type = 'triangle';
    snapOsc.frequency.setValueAtTime(600, now);
    snapOsc.frequency.exponentialRampToValueAtTime(50, now + 0.09);
    snapGain.gain.setValueAtTime(0.45, now);
    snapGain.gain.exponentialRampToValueAtTime(0.01, now + 0.09);
    snapOsc.connect(snapGain);
    snapGain.connect(ctx.destination);
    snapOsc.start(now);
    snapOsc.stop(now + 0.09);

    // 2. Powder explosion white noise burst with decay
    const bufferSize = ctx.sampleRate * 0.4;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.07));
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1200, now);
    filter.Q.setValueAtTime(1.8, now);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.55, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(ctx.destination);

    noise.start(now);
    noise.stop(now + 0.41);
  } catch {}
}

/**
 * Whistling ricochet bullet sound
 */
export function playRicochet() {
  if (isGameAudioMuted()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(2200, now);
    osc.frequency.linearRampToValueAtTime(3600, now + 0.07);
    osc.frequency.linearRampToValueAtTime(1400, now + 0.22);

    gain.gain.setValueAtTime(0.24, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.23);
  } catch {}
}

/**
 * Satisfying deep explosion with sub-bass rumble
 */
export function playExplosion() {
  if (isGameAudioMuted()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;

    // Sub-bass hit
    const subOsc = ctx.createOscillator();
    const subGain = ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(140, now);
    subOsc.frequency.exponentialRampToValueAtTime(35, now + 0.35);
    subGain.gain.setValueAtTime(0.4, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    subOsc.connect(subGain);
    subGain.connect(ctx.destination);
    subOsc.start(now);
    subOsc.stop(now + 0.36);

    // Shattering noise
    const bufferSize = ctx.sampleRate * 0.45;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(900, now);
    filter.frequency.linearRampToValueAtTime(70, now + 0.45);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    noise.start(now);
    noise.stop(now + 0.46);
  } catch {}
}

/**
 * Saloon / Western Stand-off Draw Gong Strike
 */
export function playDrawSignal() {
  if (isGameAudioMuted()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const notes = [440, 659.25];
    notes.forEach((freq) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.65);
    });
  } catch {}
}

/**
 * Shield Deflection / Damage Buzz
 */
export function playDamageBuzz() {
  if (isGameAudioMuted()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.setValueAtTime(100, now + 0.12);

    gain.gain.setValueAtTime(0.28, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.26);
  } catch {}
}

/**
 * Crystal Success Ping
 */
export function playSuccessPing() {
  if (isGameAudioMuted()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const notes = [587.33, 880]; // D5, A5
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);

      gain.gain.setValueAtTime(0.22, now + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 0.36);
    });
  } catch {}
}

/**
 * Dynamic Combo Streak announcement sound (elevates in pitch as combo builds!)
 */
export function playComboStreak(comboCount: number) {
  if (isGameAudioMuted()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const baseFreq = 440 + Math.min(comboCount, 10) * 55;
    const chord = [baseFreq, baseFreq * 1.25, baseFreq * 1.5]; // Major triad

    chord.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.04);

      gain.gain.setValueAtTime(0.18, now + idx * 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.04 + 0.28);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.04);
      osc.stop(now + idx * 0.04 + 0.3);
    });
  } catch {}
}

/**
 * Majestic Fanfare when unlocking a difficult game achievement badge!
 */
export function playBadgeUnlockFanfare() {
  if (isGameAudioMuted()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    // C5 -> E5 -> G5 -> B5 -> C6 triumphal fanfare
    const notes = [523.25, 659.25, 783.99, 987.77, 1046.5];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      const start = now + i * 0.1;
      const dur = i === notes.length - 1 ? 0.8 : 0.22;

      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.3, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + dur);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + dur + 0.05);
    });
  } catch {}
}

/**
 * Standard Victory Fanfare
 */
export function playVictoryFanfare() {
  if (isGameAudioMuted()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const chords = [523.25, 659.25, 783.99, 1046.5];
    chords.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      const startTime = now + i * 0.12;
      const duration = i === chords.length - 1 ? 0.6 : 0.2;
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.25, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + duration + 0.05);
    });
  } catch {}
}

/**
 * Quick tick sound for clock countdown
 */
export function playTick() {
  if (isGameAudioMuted()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1400, now);

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.025);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.03);
  } catch {}
}
