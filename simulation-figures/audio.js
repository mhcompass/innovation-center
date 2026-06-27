// Procedural audio — generated in-browser with the Web Audio API.
// No media files: a sober ambient bed + sparse stage/gate cues. Air-gap friendly.

let ctx = null, master = null, ambient = null, muted = false, started = false, ducked = false;
const TARGET = 0.34; // master ceiling — initial level

function ensure() {
  if (ctx) return true;
  try {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);
    return true;
  } catch (e) { return false; }
}

// one short voice (used for ticks / chords / tones)
function voice(freq, { type = 'sine', dur = 0.4, attack = 0.01, peak = 0.12, dest = master, detune = 0 } = {}) {
  if (!ctx) return;
  const t = ctx.currentTime;
  const o = ctx.createOscillator(); o.type = type; o.frequency.value = freq; o.detune.value = detune;
  const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(dest);
  o.start(t); o.stop(t + dur + 0.05);
}

const Audio = {
  get muted() { return muted; },

  resume() { if (ensure() && ctx.state === 'suspended') ctx.resume(); },

  // fully silence the context (used when the page is hidden / navigated away so a
  // backgrounded demo can't overlap another one)
  suspend() { if (ctx && ctx.state === 'running') ctx.suspend(); },

  startAmbient() {
    if (!ensure() || started) { this.fadeMaster(muted ? 0 : TARGET); return; }
    started = true;
    const t = ctx.currentTime;
    ambient = ctx.createGain(); ambient.gain.value = 0.42; ambient.connect(master);

    // soft, warm pad — a quiet open chord of pure sines (no buzzy partials, no noise).
    // Two slightly detuned sines per note give it air without beating harshly.
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 700; lp.Q.value = 0.4;
    lp.connect(ambient);
    const notes = [110, 164.81, 220]; // A2 · E3 · A3 — open fifth, restful
    notes.forEach((f, i) => {
      [-3, 3].forEach(det => {
        const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f; o.detune.value = det;
        const g = ctx.createGain(); g.gain.value = (i === 0 ? 0.22 : 0.12) * 0.5;
        o.connect(g); g.connect(lp); o.start(t);
      });
    });

    // very slow, shallow swell so it evolves instead of sitting flat (not a tremolo)
    const lfo = ctx.createOscillator(); lfo.type = 'sine'; lfo.frequency.value = 0.045;
    const lfoGain = ctx.createGain(); lfoGain.gain.value = 0.05;
    lfo.connect(lfoGain); lfoGain.connect(ambient.gain); lfo.start(t);

    this.fadeMaster(muted ? 0 : TARGET);
  },

  fadeMaster(to, time = 1.2) {
    if (!ctx) return;
    const t = ctx.currentTime;
    master.gain.cancelScheduledValues(t);
    master.gain.setValueAtTime(Math.max(master.gain.value, 0.0001), t);
    master.gain.linearRampToValueAtTime(to, t + time);
  },

  setMuted(m) { muted = m; this.fadeMaster(m ? 0 : (ducked ? TARGET * 0.4 : TARGET), 0.4); },

  // duck the ambient bed under voiceover
  duck(on) { ducked = on; if (!muted) this.fadeMaster(on ? TARGET * 0.4 : TARGET, 0.4); },

  // cues -------------------------------------------------------
  tick()      { voice(720, { type: 'triangle', dur: 0.22, peak: 0.05 }); },
  gateChime() { voice(587.33, { dur: 0.9, peak: 0.07 }); voice(880, { dur: 1.1, peak: 0.04, attack: 0.03 }); },
  adoptChord() {
    [392, 493.88, 587.33].forEach((f, i) =>
      voice(f, { type: 'sine', dur: 1.6, attack: 0.18, peak: 0.05, detune: i * 1.5 }));
  },
  // fuller, resolving swell for the finale
  finalChord() {
    [130.81, 196, 261.63, 392, 523.25].forEach((f, i) =>
      voice(f, { type: 'sine', dur: 3.4, attack: 0.5, peak: i < 2 ? 0.06 : 0.045, detune: (i - 2) * 1.5 }));
  },
  stopTone()  { voice(130.81, { type: 'sine', dur: 0.8, peak: 0.08 }); },
};

export default Audio;
