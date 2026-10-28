// ---------- SETTINGS ----------
// Timer presets in minutes. Pomodoro (25 study / 5 break) is the default.
// "demo" is a short run so you can see the whole cycle quickly.
const PRESETS = {
  pomodoro: { study: 25, rest: 5 },
  long: { study: 50, rest: 10 },
  demo: { study: 0.25, rest: 0.25 }
};

// MOOD: the start screen lets the user pick Bright or Mellow, and the choice
// changes the whole feel of the session:
//   - the scale (both are pentatonic: five notes per octave, so any notes
//     played together sound pleasant). Bright is major, which is lively and
//     clear; Mellow is minor, which is softer and more wistful.
//   - the sound: how each growth note is built (its layers), how dark the
//     filter is, how slowly notes fade in, and how much reverb there is.
//   - the colours: sky, sun, water and lotuses (the rest is in style.css).
//   - the pace of the waves in the break.
// Low notes come first, so the harmony grows from a deep base upward.
const MOODS = {
  bright: {
    notes: ["C3", "G3", "C4", "D4", "E4", "G4", "A4", "C5"],
    // colours
    colors: ["#ec6fa5", "#f48fb1", "#f7a8c6", "#d988c9", "#f9a98f"], // rose, pink, blush, orchid, peach
    hazeDay: [207, 234, 242],  // pale blue-white at the horizon in daylight
    hazeDusk: [255, 154, 92],  // sunset orange
    sunHue: [50, 14],          // sun goes from golden yellow to deep orange
    sunSat: 95,
    butterflyColours: ["#ffb347", "#ffd166", "#f48fb1", "#8ec5ff"],
    fireflyColour: "230, 255, 120", // warm yellow-green glow (r, g, b)
    // sound: growth notes. layers: type, mult (2 = an octave up), detune (cents), level
    droneLayers: [
      { type: "sine", mult: 1, detune: 0, level: 1 },
      { type: "triangle", mult: 1, detune: 7, level: 0.35 },
      { type: "sine", mult: 2, detune: -5, level: 0.16 },  // octave shimmer
      { type: "sine", mult: 3, detune: 3, level: 0.05 }    // a sparkle above it
    ],
    dronePeak: 0.055,   // loudness of each growth note
    droneAttack: 3.5,   // seconds for each growth note to fade in
    filterMin: 700,     // the harmony's filter starts here and opens to filterMax (Hz)
    filterMax: 3400,
    lfoRate: 0.12,      // how fast the filter breathes (Hz) and how far (Hz of cutoff)
    lfoDepth: 300,
    reverb: 0.35,       // how much reverb is mixed in, and how long the room rings (seconds)
    reverbSeconds: 3,
    // sound: notes you play in the break
    holdLayers: [
      { type: "sine", mult: 1, detune: 0, level: 1 },
      { type: "triangle", mult: 2, detune: 3, level: 0.25 }
    ],
    pluckBase: 900,     // chime brightness in Hz is pluckBase + pluckRange * strength
    pluckRange: 3600,
    pluckDecay: 2,      // seconds a chime rings for
    waveSpeed: 280      // how fast tap waves travel (px per second)
  },
  mellow: {
    notes: ["C3", "G3", "C4", "Eb4", "F4", "G4", "Bb4", "C5"],
    colors: ["#b9a0e0", "#d08fc0", "#e8a0b8", "#9db4e8", "#f0c0d0"], // lilac, mauve, soft rose, periwinkle, blush
    hazeDay: [230, 217, 236],  // pale lavender at the horizon
    hazeDusk: [240, 163, 160], // soft rose
    sunHue: [40, -5],          // sun goes from pale gold to rose
    sunSat: 70,
    butterflyColours: ["#c9b3f0", "#f0b8d0", "#9db4e8", "#ffd9a8"],
    fireflyColour: "200, 235, 255", // cool pale blue glow
    droneLayers: [
      { type: "sine", mult: 1, detune: 0, level: 1 },
      { type: "sine", mult: 1, detune: 9, level: 0.55 },   // thick, slow chorus
      { type: "triangle", mult: 1, detune: -4, level: 0.12 }
    ],
    dronePeak: 0.06,
    droneAttack: 7,
    filterMin: 250,     // darker and more muffled than Bright, and never opens as far
    filterMax: 900,
    lfoRate: 0.05,
    lfoDepth: 140,
    reverb: 0.7,
    reverbSeconds: 4.5,
    holdLayers: [
      { type: "sine", mult: 1, detune: 0, level: 1 },
      { type: "sine", mult: 2, detune: 4, level: 0.1 }
    ],
    pluckBase: 350,
    pluckRange: 1200,
    pluckDecay: 3.4,
    waveSpeed: 200
  }
};
let mood = MOODS.bright;           // updated whenever the user picks a mood on the start screen
let flowerNotes = mood.notes;
const frequencies = {
  C3: 130.81, G3: 196.0, C4: 261.63, D4: 293.66, Eb4: 311.13, E4: 329.63,
  F4: 349.23, G4: 392.0, A4: 440.0, Bb4: 466.16, C5: 523.25
};

// Petals of a lotus, in three rows seen from a low angle. angle = how far it
// leans from upright when fully open (degrees), len = how long it grows
// (1 = full length), w = how wide it is (relative to the lotus size).
// The rows are drawn back to front, so the front petals overlap the rest.
const backPetals = [   // pale, narrow petals standing behind everything
  { angle: -48, len: 0.92, w: 0.34 }, { angle: -24, len: 0.96, w: 0.34 },
  { angle: 0, len: 1, w: 0.34 },
  { angle: 24, len: 0.96, w: 0.34 }, { angle: 48, len: 0.92, w: 0.34 }
];
const midPetals = [    // the full body of the flower, leaving a gap in the middle for the stamens
  { angle: -64, len: 1, w: 0.44 }, { angle: -42, len: 1.02, w: 0.44 }, { angle: -19, len: 1, w: 0.42 },
  { angle: 19, len: 1, w: 0.42 }, { angle: 42, len: 1.02, w: 0.44 }, { angle: 64, len: 1, w: 0.44 }
];
const frontPetals = [  // wide petals that spread low and sideways, with a short one at the front
  { angle: -74, len: 0.9, w: 0.42 }, { angle: 0, len: 0.62, w: 0.48 }, { angle: 74, len: 0.9, w: 0.42 }
];


const statusEl = document.getElementById("status");
const statusTag = statusEl.querySelector(".tag");
const statusMsg = statusEl.querySelector(".msg");
const setupPanel = document.getElementById("setup");
const form = document.getElementById("settings");
const studyInput = document.getElementById("studyMinutes");
const breakInput = document.getElementById("breakMinutes");
const presetButtons = document.querySelectorAll(".presets .preset");
const moodButtons = document.querySelectorAll(".moods .preset");
const timeButtons = document.querySelectorAll(".times .preset");
const againButton = document.getElementById("again");
const sky = document.getElementById("sky");
const sun = document.getElementById("sun");
const moon = document.getElementById("moon");
const pond = document.getElementById("pond");
const glitterCanvas = document.getElementById("glitter");
const glitterCtx = glitterCanvas.getContext("2d");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const flowers = [];
let breakActive = false;
let scene = "day";  // "day" or "night": chosen on the start screen
let sunX = 0;        // sun's horizontal position in px, used to centre the reflection
let sunGlint = 0;    // 0 to 1, how strongly the sun is reflected (0 once it has set)
let glitterColour = { h: 50, s: 95, l: 70 }; // colour of the warm dashes in the reflection (sun or moon)

// Update the caption bar: a short label (Study / Break) and a message
function setStatus(tag, message) {
  statusTag.textContent = tag;
  statusMsg.textContent = message;
  statusEl.classList.remove("swap");
  void statusEl.offsetWidth; // restart the fade-in animation
  statusEl.classList.add("swap");
}

// If anything goes wrong, show it on screen instead of failing silently
window.onerror = function (message) {
  statusEl.classList.add("error");
  setStatus("Error", String(message));
};

// ---------- SETUP SCREEN ----------
// Highlight the preset that matches the current values (none = custom)
function syncPresetButtons() {
  const study = parseFloat(studyInput.value);
  const rest = parseFloat(breakInput.value);
  presetButtons.forEach(function (button) {
    const p = PRESETS[button.dataset.preset];
    const match = p.study === study && p.rest === rest;
    button.setAttribute("aria-pressed", match ? "true" : "false");
  });
}

presetButtons.forEach(function (button) {
  button.addEventListener("click", function () {
    const p = PRESETS[button.dataset.preset];
    studyInput.value = p.study;
    breakInput.value = p.rest;
    syncPresetButtons();
  });
});
studyInput.addEventListener("input", syncPresetButtons);
breakInput.addEventListener("input", syncPresetButtons);

// Time-of-day buttons: Day (butterflies) or Night (crickets and fireflies).
// Picking one previews the sky straight away.
timeButtons.forEach(function (button) {
  button.addEventListener("click", function () {
    scene = button.dataset.time;
    timeButtons.forEach(function (b) {
      b.setAttribute("aria-pressed", b === button ? "true" : "false");
    });
    showSky(PHASES[scene + "Study"].place, 0);
  });
});

// Mood buttons: pick the bright or mellow scale (Bright is the default)
let selectedMood = "bright";
moodButtons.forEach(function (button) {
  button.addEventListener("click", function () {
    selectedMood = button.dataset.mood;
    moodButtons.forEach(function (b) {
      b.setAttribute("aria-pressed", b === button ? "true" : "false");
    });
    // Preview the mood straight away: the colours in style.css switch on
    // this attribute, and the sky is redrawn with the mood's own colours
    mood = MOODS[selectedMood];
    flowerNotes = mood.notes;
    document.documentElement.dataset.mood = selectedMood;
    skyState.place(skyState.progress);
  });
});

// Keep typed values inside sensible limits
function clamp(value, min, max, fallback) {
  const n = parseFloat(value);
  if (isNaN(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

// ---------- SOUND (built-in Web Audio, no library needed) ----------
//
// Signal flow:
//   growth notes -> lowpass filter (slowly opens) --\
//   chimes / held notes ----------------------------+--> mix --> master --> compressor --> speakers
//                                                    \--> reverb --/
//
// Each note is several layered oscillators instead of one plain sine,
// which gives a warmer, softer tone. A reverb places everything in one
// shared space, and the filter makes the harmony brighten as the session goes on.
let audioCtx = null;
let master = null;
let mix = null;          // chimes and held notes go in here
let droneFilter = null;  // growth notes go in here
const droneVoices = {};  // note -> { oscs, gain }, sustained during growth
const playVoices = {};   // note -> { oscs, gain }, held while pressing in the break

// Each note is several layered oscillators instead of one plain sine, which
// gives a warmer tone. The layers for each mood are listed in MOODS above.
// (detune is in cents, 100 = one semitone: a tiny detuned copy beats slowly
// against the main note, which sounds like a gentle chorus.)

// Build a reverb "room" from decaying noise: loud at first, fading to silence
function makeReverbImpulse(seconds, steepness) {
  const rate = audioCtx.sampleRate;
  const length = Math.floor(rate * seconds);
  const buffer = audioCtx.createBuffer(2, length, rate);
  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch);
    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, steepness);
    }
  }
  return buffer;
}

function setupAudio(studyMs) {
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  audioCtx.resume();
  const now = audioCtx.currentTime;

  // Last stage: master volume into a gentle compressor so many notes never clip
  master = audioCtx.createGain();
  master.gain.value = 0.7;
  const compressor = audioCtx.createDynamicsCompressor();
  master.connect(compressor);
  compressor.connect(audioCtx.destination);

  // Reverb, mixed in quietly alongside the dry sound
  const reverb = audioCtx.createConvolver();
  reverb.buffer = makeReverbImpulse(mood.reverbSeconds, 3);
  const reverbSend = audioCtx.createGain();
  reverbSend.gain.value = mood.reverb;
  reverbSend.connect(reverb);
  reverb.connect(master);

  mix = audioCtx.createGain();
  mix.connect(master);
  mix.connect(reverbSend);

  // Growth notes pass through a lowpass filter that opens over the whole
  // study phase: the harmony starts dark and muffled and ends bright.
  droneFilter = audioCtx.createBiquadFilter();
  droneFilter.type = "lowpass";
  droneFilter.Q.value = 0.7;
  droneFilter.frequency.setValueAtTime(mood.filterMin, now);
  droneFilter.frequency.linearRampToValueAtTime(mood.filterMax, now + studyMs / 1000);
  droneFilter.connect(mix);

  // A very slow LFO makes the filter breathe in and out, so the sustained
  // chord shimmers a little instead of sitting perfectly still.
  const lfo = audioCtx.createOscillator();
  lfo.frequency.value = mood.lfoRate;
  const lfoDepth = audioCtx.createGain();
  lfoDepth.gain.value = mood.lfoDepth; // Hz of cutoff movement either way
  lfo.connect(lfoDepth);
  lfoDepth.connect(droneFilter.frequency);
  lfo.start();
}

// Start a layered note that fades in and keeps sounding until stopped
function startVoice(store, note, layers, peak, attack, destination) {
  if (store[note]) return;
  const now = audioCtx.currentTime;
  const env = audioCtx.createGain();
  env.gain.setValueAtTime(0, now);
  env.gain.linearRampToValueAtTime(peak, now + attack);
  env.connect(destination);

  const oscs = layers.map(function (layer) {
    const osc = audioCtx.createOscillator();
    const level = audioCtx.createGain();
    osc.type = layer.type;
    osc.frequency.value = frequencies[note] * layer.mult;
    osc.detune.value = layer.detune;
    level.gain.value = layer.level;
    osc.connect(level);
    level.connect(env);
    osc.start();
    return osc;
  });
  store[note] = { oscs: oscs, gain: env };
}

// Fade a note out over `release` seconds, then remove it
function stopVoice(store, note, release) {
  const voice = store[note];
  if (!voice) return;
  const now = audioCtx.currentTime;
  voice.gain.gain.cancelScheduledValues(now);
  voice.gain.gain.setValueAtTime(voice.gain.gain.value, now);
  voice.gain.gain.linearRampToValueAtTime(0, now + release);
  voice.oscs.forEach(function (osc) { osc.stop(now + release + 0.05); });
  delete store[note];
}

// A short, bell-like chime that rings out and fades. `strength` (0 to 1)
// sets how loud it is: wave chimes get quieter the further the wave travelled.
function pluck(note, strength) {
  const now = audioCtx.currentTime;
  // Low notes are lifted an octave so they stay audible on small speakers
  const base = frequencies[note] < 250 ? frequencies[note] * 2 : frequencies[note];

  const env = audioCtx.createGain();
  env.gain.setValueAtTime(0.0001, now);
  env.gain.exponentialRampToValueAtTime(0.16 * Math.pow(strength, 1.3), now + 0.01); // quick soft strike; distant chimes are much quieter
  env.gain.exponentialRampToValueAtTime(0.0005, now + mood.pluckDecay); // long fade
  // A lowpass filter makes distant chimes (low strength) duller and mellower
  const soften = audioCtx.createBiquadFilter();
  soften.type = "lowpass";
  soften.frequency.value = mood.pluckBase + mood.pluckRange * strength;
  env.connect(soften);
  soften.connect(mix);

  // Main tone plus a faint higher partial, which is what makes it sound like a bell
  [{ mult: 1, level: 1 }, { mult: 3, level: 0.12 }].forEach(function (partial) {
    const osc = audioCtx.createOscillator();
    const level = audioCtx.createGain();
    osc.type = "sine";
    osc.frequency.value = base * partial.mult;
    level.gain.value = partial.level;
    osc.connect(level);
    level.connect(env);
    osc.start(now);
    osc.stop(now + mood.pluckDecay + 0.1);
  });
}

// ---------- CRICKETS (night sessions) ----------
// Synthesised, no recording. Each cricket is one steady high tone (about
// 4 to 5 kHz) switched on and off in quick pulses: a chirp is 3 or 4 pulses
// about 55 ms apart, repeated roughly twice a second. Four crickets at
// slightly different pitches and rhythms, with a few chirps skipped at
// random, sound like a field rather than a machine.
const CRICKET_VOLUME = 0.035; // overall loudness of the crickets (try 0.02 for quieter)
let cricketBus = null;
let cricketTimer = null;
const crickets = [];

function startCrickets() {
  cricketBus = audioCtx.createGain();
  cricketBus.gain.value = 0; // faded in by setCrickets
  cricketBus.connect(mix);

  [4300, 4650, 5000, 5350].forEach(function (freq, i) {
    const osc = audioCtx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = freq;
    const env = audioCtx.createGain();
    env.gain.value = 0;
    osc.connect(env);
    env.connect(cricketBus);
    osc.start();
    crickets.push({
      osc: osc,
      env: env,
      next: audioCtx.currentTime + Math.random() * 2, // when this cricket chirps next
      rate: 1.7 + Math.random() * 0.9,                // chirps per second
      pulses: 3 + (i % 2)                             // pulses in each chirp
    });
  });

  cricketTimer = setInterval(scheduleCrickets, 300);
  scheduleCrickets();
}

// Plan the next second or so of chirps ahead of time (Web Audio plays them
// exactly on schedule, which a plain setTimeout cannot do)
function scheduleCrickets() {
  const now = audioCtx.currentTime;
  crickets.forEach(function (c) {
    while (c.next < now + 1.2) {
      const start = Math.max(c.next, now);
      if (Math.random() > 0.15) { // skip some chirps so it isn't a machine
        for (let k = 0; k < c.pulses; k++) {
          const t = start + k * 0.055;
          c.env.gain.setValueAtTime(0, t);
          c.env.gain.linearRampToValueAtTime(0.5, t + 0.012);
          c.env.gain.linearRampToValueAtTime(0, t + 0.042);
        }
      }
      c.next = start + (1 / c.rate) * (0.85 + Math.random() * 0.3);
    }
  });
}

// Fade the crickets to a level between 0 (silent) and 1 (full)
function setCrickets(level) {
  if (!cricketBus) return;
  cricketBus.gain.setTargetAtTime(level * CRICKET_VOLUME, audioCtx.currentTime, 1.5);
  if (level === 0) setTimeout(stopCrickets, 9000); // once faded out, switch them off
}

function stopCrickets() {
  if (cricketTimer === null) return;
  clearInterval(cricketTimer);
  cricketTimer = null;
  crickets.forEach(function (c) { c.osc.stop(); });
}

// ---------- START ----------
// Submitting the form is a user click, which also unlocks browser audio
form.addEventListener("submit", function (event) {
  event.preventDefault();

  const studyMs = clamp(studyInput.value, 0.25, 180, 25) * 60 * 1000;
  const breakMs = clamp(breakInput.value, 0.25, 60, 5) * 60 * 1000;

  mood = MOODS[selectedMood];
  flowerNotes = mood.notes;

  setupAudio(studyMs);
  if (scene === "night") startCrickets();
  spawnCreatures();
  // Day: butterflies. Night: fireflies and crickets.
  setCreatures(scene === "day" ? 1 : 0, scene === "night" ? 1 : 0);
  setCrickets(scene === "night" ? 1 : 0);

  setupPanel.hidden = true;
  setStatus("Study", scene === "day" ? "Watch the sun cross the sky" : "Watch the moon cross the sky");
  studyPhase(studyMs, breakMs);
});

againButton.addEventListener("click", function () {
  location.reload(); // simplest clean reset: back to the setup screen
});

// ---------- SKY: sun, moon and the colours of the sky ----------
// Each part of a session has its own sky, chosen by the Day / Night setting:
//   Day session:   study = the sun crosses the sky and sets (sunset);
//                  break = the moon rises and the sky turns to night.
//   Night session: study = the moon crosses a starry sky;
//                  break = dawn: the sun rises and the sky brightens.
// Each part is a function of its progress (0 to 1), driven by the real clock.

const NIGHT_HAZE = [66, 82, 136];                // horizon colour at night
const MOON_GLOW = "rgba(190, 210, 255, 0.3)";    // cool moonlight on the water
const MOON_GLITTER = { h: 218, s: 70, l: 88 };   // colour of the moon's reflection

// Blend between two [r, g, b] colours; t runs 0 to 1
function mixColour(a, b, t) {
  return "rgb(" + a.map(function (v, i) { return Math.round(v + (b[i] - v) * t); }).join(",") + ")";
}

// Put the sun or the moon on its arc across the sky. p runs from 0 to 1:
// the body travels left to right, rising from the water line, peaking
// halfway, then sinking back into the water as p reaches 1.
// Returns its horizontal position (px) and height (0 to 1).
function placeBody(el, p) {
  const w = sky.clientWidth;
  const h = sky.clientHeight;
  const s = el.offsetWidth;

  const x = s + p * (w - 2 * s);            // keep one body-width clear of each edge
  const hiddenY = h + s * 0.6;              // centre low enough to be fully below the water line
  const topY = s * 0.9;                     // highest point of the arc
  const lift = Math.pow(Math.sin(Math.PI * p), 0.7); // 0 at both ends, 1 at the middle (0.7 flattens the peak)
  const y = hiddenY - (hiddenY - topY) * lift;

  el.style.transform = "translate(" + (x - s / 2) + "px, " + (y - s / 2) + "px)";
  return { x: x, lift: lift };
}

// Set the sky and water colours. dusk and night are how much of the sunset
// and night layers show (0 to 1); haze is the colour at the horizon. These
// are CSS variables on the page root, so the sky, haze and water follow.
function setSkyColours(dusk, night, haze) {
  const root = document.documentElement.style;
  root.setProperty("--dusk", dusk.toFixed(3));
  root.setProperty("--night", night.toFixed(3));
  root.setProperty("--haze", haze);
}

// Colour the sun for a given hue (degrees)
function paintSun(hue) {
  document.documentElement.style.setProperty("--sun-color", "hsl(" + hue + ", " + mood.sunSat + "%, 62%)");
}

// The light on the water under the sun or moon: where it is, how strong,
// and its colour (for the glow and for the glittering reflection)
function setLight(body, glint, glow, glitter) {
  const root = document.documentElement.style;
  root.setProperty("--sun-glow", glow);
  root.setProperty("--sun-x", body.x.toFixed(1) + "px");
  root.setProperty("--glint", glint.toFixed(3));
  sunX = body.x; // the reflection follows whichever body is up
  sunGlint = glint;
  glitterColour = glitter;
}

// DAY, study: the sun crosses the sky and sets, and the sky turns to dusk
function placeDayStudy(p) {
  const body = placeBody(sun, p);
  const hue = mood.sunHue[0] + (mood.sunHue[1] - mood.sunHue[0]) * p; // warms as it goes
  const dusk = p * p; // squared, so dusk arrives late
  paintSun(hue);
  setSkyColours(dusk, 0, mixColour(mood.hazeDay, mood.hazeDusk, dusk));
  setLight(body, Math.min(1, body.lift * 1.6), "hsla(" + hue + ", " + mood.sunSat + "%, 60%, 0.45)", { h: hue, s: mood.sunSat, l: 70 });
}

// DAY, break: the moon rises as the sunset fades into night
function placeDayBreak(q) {
  const body = placeBody(moon, q);
  const dusk = Math.max(0, 1 - q / 0.6); // sunset colours fade out over the first 60% of the break
  const night = Math.min(1, q / 0.45);   // the night sky fades in over the first 45%
  setSkyColours(dusk, night, mixColour(NIGHT_HAZE, mood.hazeDusk, dusk)); // night blue, with a last glow of sunset
  setLight(body, Math.min(1, body.lift * 1.6) * 0.7, MOON_GLOW, MOON_GLITTER); // moonlight is gentler than sunlight
}

// NIGHT, study: the moon crosses a starry sky
function placeNightStudy(p) {
  const body = placeBody(moon, p);
  setSkyColours(0, 1, mixColour(NIGHT_HAZE, NIGHT_HAZE, 0));
  setLight(body, Math.min(1, body.lift * 1.6) * 0.7, MOON_GLOW, MOON_GLITTER);
}

// NIGHT, break: dawn. The sun rises (and stays up) as the sky brightens
function placeNightBreak(q) {
  const body = placeBody(sun, q * 0.5); // only the rising half of the arc, so it ends high in the sky
  const hue = mood.sunHue[1] + (mood.sunHue[0] - mood.sunHue[1]) * q; // deep orange at first, then golden
  const night = Math.max(0, 1 - q / 0.5);                              // night fades out over the first half
  const dusk = q < 0.5 ? q / 0.5 : 1 - (q - 0.5) / 0.5;                // the dawn glow peaks halfway, then fades into daylight
  const haze = q < 0.5
    ? mixColour(NIGHT_HAZE, mood.hazeDusk, q / 0.5)
    : mixColour(mood.hazeDusk, mood.hazeDay, (q - 0.5) / 0.5);
  paintSun(hue);
  setSkyColours(dusk, night, haze);
  setLight(body, Math.min(1, body.lift * 1.6), "hsla(" + hue + ", " + mood.sunSat + "%, 60%, 0.45)", { h: hue, s: mood.sunSat, l: 70 });
}

// The four parts of a session. `sets` says what sets into the water at the
// end (it makes a ripple), if anything.
const PHASES = {
  dayStudy:   { place: placeDayStudy,   sets: "sun" },
  dayBreak:   { place: placeDayBreak,   sets: "moon" },
  nightStudy: { place: placeNightStudy, sets: "moon" },
  nightBreak: { place: placeNightBreak, sets: null }
};

// What the sky is showing right now, kept so a resize or a mood change can redraw it
let skyState = { place: placeDayStudy, progress: 0 };

function showSky(place, progress) {
  skyState = { place: place, progress: progress };
  place(progress);
}

// ---------- SUN REFLECTION ----------
// A small, repeatable pseudo-random number from a seed (0 to 1). Using a
// seed instead of Math.random() means each dash of light can be
// re-created in the same place from frame to frame.
function rnd(seed) {
  const v = Math.sin(seed * 127.1) * 43758.5453;
  return v - Math.floor(v);
}

// Draw the glittering path of light on the water under the sun. Real
// reflections are made of many short, bright dashes that appear and
// vanish, narrow at the horizon and spreading out toward the viewer.
// Each dash re-rolls its position at its own pace, so it twinkles.
function drawGlitter(now) {
  const w = glitterCanvas.width;
  const h = glitterCanvas.height;
  glitterCtx.clearRect(0, 0, w, h);
  if (sunGlint < 0.01) return; // nothing in the sky: nothing to reflect

  const t = reducedMotion ? 0 : now; // reduced motion: a still reflection
  const s = sun.offsetWidth;
  const rowHeight = 3;

  for (let y = 0, row = 0; y < h; y += rowHeight, row++) {
    const depth = y / h;                          // 0 at the horizon, 1 at the bottom of the path
    const spread = s * 0.6 + depth * s * 3.4;     // half-width of the path at this depth
    const fade = Math.pow(1 - depth, 1.3);        // light thins out toward the viewer
    const dashes = 3 + Math.floor(depth * 6);     // more, but dimmer, dashes closer up

    for (let k = 0; k < dashes; k++) {
      const base = row * 53 + k * 17;
      const period = 700 + 1500 * rnd(base);      // each dash changes at its own pace
      const cycle = Math.floor((t + rnd(base + 1) * period) / period);
      const seed = base * 1000 + cycle;

      // Averaging three randoms clusters dashes toward the centre of the path
      const offset = ((rnd(seed) + rnd(seed + 1) + rnd(seed + 2)) / 3) * 2 - 1;
      const dashX = sunX + offset * spread;
      const length = (4 + rnd(seed + 3) * 14) * (0.6 + depth * 1.8); // longer dashes up close (perspective)
      const alpha = (0.25 + rnd(seed + 4) * 0.55) * fade * (1 - Math.abs(offset) * 0.6);

      glitterCtx.fillStyle = k % 3 === 0
        ? "hsla(" + glitterColour.h + ", " + glitterColour.s + "%, " + glitterColour.l + "%, " + alpha.toFixed(3) + ")"  // matches the sun or moon
        : "rgba(255, 255, 255, " + alpha.toFixed(3) + ")";
      glitterCtx.fillRect(dashX - length / 2, y, length, 1.6);
    }
  }
}

function glitterLoop(now) {
  drawGlitter(now);
  requestAnimationFrame(glitterLoop);
}

// Match the canvas to its on-screen size (also re-run on resize)
function sizeGlitter() {
  glitterCanvas.width = glitterCanvas.clientWidth;
  glitterCanvas.height = glitterCanvas.clientHeight;
}
sizeGlitter();
requestAnimationFrame(glitterLoop);

// Run one part of the session: move the sky from 0 to 1 over `durationMs`.
// It uses the real clock (not a counter), so it stays accurate even if the
// browser slows down a background tab.
function runPhase(phase, durationMs, startTime) {
  function frame() {
    const p = Math.min(1, (Date.now() - startTime) / durationMs);
    showSky(phase.place, p);
    if (p < 1) {
      requestAnimationFrame(frame);
    } else if (phase.sets === "sun") {
      // The sun has set: a ripple spreads where it met the water
      makeRipple(sky.clientWidth - sun.offsetWidth, sky.clientHeight, "hsl(" + mood.sunHue[1] + ", " + mood.sunSat + "%, 62%)", { maxR: 240, speed: 110, strength: 0.9 });
    } else if (phase.sets === "moon") {
      makeRipple(sky.clientWidth - moon.offsetWidth, sky.clientHeight, "#cfd9ff", { maxR: 200, speed: 100, strength: 0.8 });
    }
  }
  frame();
}

// ---------- CREATURES: butterflies by day, fireflies by night ----------
// Drawn on a canvas. Each one follows its own slow, wandering path made from
// a few sine waves with random offsets, so none of them move in step.
const creatureCanvas = document.getElementById("creatures");
const creatureCtx = creatureCanvas.getContext("2d");
const butterflies = [];
const fireflies = [];
const creatureLevel = { butterflies: 0, fireflies: 0 };  // how visible each kind is right now (0 to 1)
const creatureTarget = { butterflies: 0, fireflies: 0 }; // what that is fading toward
let creatureScale = 1;      // grows with the screen size, like the lotuses
let lastCreatureTime = 0;

function sizeCreatures() {
  creatureCanvas.width = window.innerWidth;
  creatureCanvas.height = window.innerHeight;
  creatureScale = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--flower-size")) / 36;
}
sizeCreatures();

function randomPhases() {
  return [Math.random() * 6.28, Math.random() * 6.28, Math.random() * 6.28, Math.random() * 6.28];
}

// Make the creatures when a session starts: more on bigger screens
function spawnCreatures() {
  butterflies.length = 0;
  fireflies.length = 0;
  const nButterflies = Math.max(3, Math.min(8, Math.round(window.innerWidth / 220)));
  const nFireflies = Math.max(10, Math.min(30, Math.round(window.innerWidth / 55)));
  for (let i = 0; i < nButterflies; i++) {
    butterflies.push({
      colour: mood.butterflyColours[i % mood.butterflyColours.length],
      p: randomPhases(),
      speed: 0.7 + Math.random() * 0.6,
      flap: 9 + Math.random() * 4,   // wing beats per second (roughly)
      size: 0.8 + Math.random() * 0.5
    });
  }
  for (let i = 0; i < nFireflies; i++) {
    fireflies.push({
      p: randomPhases(),
      speed: 0.5 + Math.random() * 0.5,
      rate: 0.5 + Math.random() * 0.8, // how fast it blinks
      size: 0.7 + Math.random() * 0.6
    });
  }
}

// Fade each kind toward fully visible (1) or gone (0)
function setCreatures(butterflyAmount, fireflyAmount) {
  creatureTarget.butterflies = butterflyAmount;
  creatureTarget.fireflies = fireflyAmount;
}

// Where a creature is at time t: a slow drift across the whole pond plus a
// smaller loop on top. `c` holds its random numbers.
function wander(c, t) {
  const top = sky.offsetHeight + 10;
  const height = window.innerHeight - top - 90; // keep clear of the caption bar
  return {
    x: window.innerWidth * (0.5 + 0.45 * Math.sin(t * 0.05 * c.speed + c.p[0])) + 28 * Math.sin(t * 0.9 * c.speed + c.p[2]),
    y: top + height * (0.5 + 0.45 * Math.sin(t * 0.037 * c.speed + c.p[1])) + 18 * Math.sin(t * 1.4 * c.speed + c.p[3])
  };
}

function drawButterfly(b, t, alpha) {
  const here = wander(b, t);
  const next = wander(b, t + 0.08);
  const heading = Math.atan2(next.y - here.y, next.x - here.x);
  const s = 9 * b.size * creatureScale;
  const open = 0.3 + 0.7 * Math.abs(Math.sin(t * b.flap + b.p[0])); // wings open and close

  creatureCtx.save();
  creatureCtx.globalAlpha = alpha;
  creatureCtx.translate(here.x, here.y);
  creatureCtx.rotate(heading + Math.PI / 2); // head points the way it is flying
  [-1, 1].forEach(function (side) {
    creatureCtx.save();
    creatureCtx.scale(side, 1); // draw one wing, mirror it for the other
    creatureCtx.fillStyle = b.colour;
    creatureCtx.beginPath();
    creatureCtx.ellipse(0.6 * s * open, -0.5 * s, 0.65 * s * open, 0.95 * s, -0.4, 0, Math.PI * 2); // upper wing
    creatureCtx.fill();
    creatureCtx.globalAlpha = alpha * 0.85;
    creatureCtx.beginPath();
    creatureCtx.ellipse(0.45 * s * open, 0.55 * s, 0.45 * s * open, 0.6 * s, 0.4, 0, Math.PI * 2);   // lower wing
    creatureCtx.fill();
    creatureCtx.globalAlpha = alpha;
    creatureCtx.fillStyle = "rgba(255, 255, 255, 0.7)";
    creatureCtx.beginPath();
    creatureCtx.arc(0.7 * s * open, -0.7 * s, 0.16 * s, 0, Math.PI * 2); // a pale spot on the wing
    creatureCtx.fill();
    creatureCtx.restore();
  });
  creatureCtx.fillStyle = "#3a2a3f"; // body
  creatureCtx.beginPath();
  creatureCtx.ellipse(0, 0.05 * s, 0.12 * s, 0.75 * s, 0, 0, Math.PI * 2);
  creatureCtx.fill();
  creatureCtx.restore();
}

function drawFirefly(f, t, alpha) {
  const here = wander(f, t);
  const blink = Math.pow(Math.max(0, Math.sin(t * f.rate + f.p[3])), 2); // glows on and off
  const a = (0.15 + 0.85 * blink) * alpha;
  const r = 14 * f.size * creatureScale;
  const colour = mood.fireflyColour;

  const glow = creatureCtx.createRadialGradient(here.x, here.y, 0, here.x, here.y, r);
  glow.addColorStop(0, "rgba(" + colour + ", " + a.toFixed(3) + ")");
  glow.addColorStop(0.3, "rgba(" + colour + ", " + (a * 0.35).toFixed(3) + ")");
  glow.addColorStop(1, "rgba(" + colour + ", 0)");
  creatureCtx.fillStyle = glow;
  creatureCtx.beginPath();
  creatureCtx.arc(here.x, here.y, r, 0, Math.PI * 2);
  creatureCtx.fill();

  creatureCtx.fillStyle = "rgba(255, 255, 230, " + a.toFixed(3) + ")"; // the bright spark in the middle
  creatureCtx.beginPath();
  creatureCtx.arc(here.x, here.y, 1.8 * creatureScale, 0, Math.PI * 2);
  creatureCtx.fill();
}

function creatureLoop(now) {
  const dt = Math.min(0.1, (now - lastCreatureTime) / 1000);
  lastCreatureTime = now;
  // Ease each kind toward its target so they fade in and out gently
  ["butterflies", "fireflies"].forEach(function (kind) {
    creatureLevel[kind] += (creatureTarget[kind] - creatureLevel[kind]) * Math.min(1, dt * 0.7);
  });

  creatureCtx.clearRect(0, 0, creatureCanvas.width, creatureCanvas.height);
  if (!reducedMotion) { // people who prefer less motion get a still pond
    const t = now / 1000;
    if (creatureLevel.butterflies > 0.01) butterflies.forEach(function (b) { drawButterfly(b, t, creatureLevel.butterflies); });
    if (creatureLevel.fireflies > 0.01) fireflies.forEach(function (f) { drawFirefly(f, t, creatureLevel.fireflies); });
  }
  requestAnimationFrame(creatureLoop);
}
requestAnimationFrame(creatureLoop);

// Keep everything in the right place if the window is resized
window.addEventListener("resize", function () {
  sizeGlitter();
  sizeCreatures();
  skyState.place(skyState.progress);
});
showSky(placeDayStudy, 0); // the sun starts hidden below the water line
placeBody(moon, 0);        // and so does the moon

// ---------- STUDY PHASE ----------
// A lotus appears at an even interval. Each one adds its own note
// to a sustained chord, so the sound gets richer as time passes,
// and its petals slowly open until the study time is over.
// The sun crosses the sky over the same period.
function studyPhase(studyMs, breakMs) {
  const interval = studyMs / flowerNotes.length;
  const startTime = Date.now();
  let i = 0;

  runPhase(PHASES[scene + "Study"], studyMs, startTime); // the sun or moon crosses the sky over the study time

  function addFlower() {
    const remaining = studyMs - (Date.now() - startTime);
    spawnFlower(flowerNotes[i], remaining);
    i++;
    if (i < flowerNotes.length) {
      setTimeout(addFlower, interval);
    } else {
      setTimeout(function () { startBreak(breakMs); }, interval); // one last interval, then break
    }
  }
  addFlower();
}

// ---------- RIPPLES ----------
// One ripple style for the whole page: thin rings that spread out as a
// flattened ellipse (water seen at a low angle, like the lily pads), with
// a white crest and two softer trailing rings, tinted by whatever made
// them. Used for blooming, taps, chimes and the sunset, so it all matches.
const RIPPLE_SQUASH = 0.55; // ring height compared to its width
const ripples = [];
let rippleLoopRunning = false;

// opts: x, y (screen px), speed (px/s), maxR (px, widest it grows),
//       fadeR (radius where it has faded out), strength (0 to 1, starting
//       opacity), color, and for tap waves: chime, source, reach
function addRipple(opts) {
  const el = document.createElement("div");
  el.className = "ripple";
  el.style.color = opts.color || "#ffffff";
  el.style.left = opts.x + "px";
  el.style.top = (opts.y - sky.offsetHeight) + "px"; // #pond starts at the horizon
  pond.appendChild(el);

  ripples.push({
    el: el,
    x: opts.x,
    y: opts.y,
    born: performance.now(),
    speed: opts.speed,
    maxR: opts.maxR,
    fadeR: opts.fadeR || opts.maxR,
    strength: opts.strength,
    chime: !!opts.chime,
    source: opts.source || null,
    reach: opts.reach || 0,
    hit: new Set()
  });

  if (!rippleLoopRunning) {
    rippleLoopRunning = true;
    requestAnimationFrame(rippleFrame);
  }
}

// A small, soft ripple (a lotus appearing, a chime landing)
function makeRipple(x, y, color, size) {
  const o = size || {};
  addRipple({
    x: x, y: y, color: color,
    speed: o.speed || 90,
    maxR: o.maxR || 120,
    strength: o.strength || 0.8
  });
}

function rippleFrame(now) {
  for (let i = ripples.length - 1; i >= 0; i--) {
    const rp = ripples[i];
    const r = ((now - rp.born) / 1000) * rp.speed; // current half-width in px

    if (r >= rp.maxR) {
      rp.el.remove();
      ripples.splice(i, 1);
      continue;
    }

    rp.el.style.width = r * 2 + "px";
    rp.el.style.height = r * 2 * RIPPLE_SQUASH + "px";
    // Fades out the further it travels, so far-away water is only a whisper
    const life = Math.min(1, r / rp.fadeR);
    rp.el.style.opacity = (rp.strength * Math.pow(1 - life, 1.4)).toFixed(3);

    if (rp.chime) chimeNearbyLotuses(rp, r);
  }

  if (ripples.length > 0) {
    requestAnimationFrame(rippleFrame);
  } else {
    rippleLoopRunning = false;
  }
}

// Centre of a lotus's lily pad, where ripples and waves start
function padCentre(flower) {
  // Uses the lotus's full layout size, not its on-screen size: while a lotus
  // is still growing (scaled down) its on-screen box is tiny, which would put
  // the ripple too high. The pad's centre is 73% of the way down the box.
  return {
    x: flower.offsetLeft + flower.offsetWidth / 2,
    y: flower.offsetTop + flower.offsetHeight * 0.73
  };
}

// Find a spot that doesn't sit on top of another lotus
function pickPosition(size) {
  const margin = 20;
  const top = sky.offsetHeight + 60; // keep lotuses on open water, clear of the pale horizon haze
  const maxX = Math.max(0, window.innerWidth - size - margin * 2);
  const maxY = Math.max(0, window.innerHeight - size - top - 80); // leave room for the caption bar at the bottom
  let spot = null;
  for (let tries = 0; tries < 40; tries++) {
    spot = { x: margin + Math.random() * maxX, y: top + Math.random() * maxY };
    const clear = flowers.every(function (f) {
      return Math.hypot(f.offsetLeft - spot.x, f.offsetTop - spot.y) > size * 0.9;
    });
    if (clear) return spot;
  }
  return spot; // crowded: accept the last try
}

function buildLotus(color) {
  const flower = document.createElement("div");
  flower.className = "flower droning";
  flower.style.color = color; // petals, shades and glow all come from this colour

  const pad = document.createElement("div");
  pad.className = "pad";
  flower.appendChild(pad);

  const bloom = document.createElement("div");
  bloom.className = "bloom";

  function addPetals(list, row) {
    list.forEach(function (petal) {
      const el = document.createElement("div");
      el.className = "petal " + row;
      el.style.setProperty("--angle", petal.angle + "deg");
      el.style.setProperty("--len", petal.len);
      el.style.setProperty("--w", petal.w);
      bloom.appendChild(el);
    });
  }

  addPetals(backPetals, "back");
  addPetals(midPetals, "mid");

  const centre = document.createElement("div"); // golden stamens, in front of the back and middle rows
  centre.className = "centre";
  bloom.appendChild(centre);

  addPetals(frontPetals, "front");
  flower.appendChild(bloom);

  // The reflection is a copy of the finished bloom, drawn under the pad
  // (CSS flips and fades it). It opens in step with the real one.
  const reflection = bloom.cloneNode(true);
  reflection.className = "reflection";
  flower.insertBefore(reflection, pad);

  return flower;
}

function spawnFlower(note, remainingMs) {
  const color = mood.colors[Math.floor(Math.random() * mood.colors.length)];
  const flower = buildLotus(color);
  flower.dataset.note = note;

  // Whole lotus is twice --flower-size (set per screen size in CSS)
  const baseSize = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--flower-size"));
  const spot = pickPosition(baseSize * 2);
  flower.style.left = spot.x + "px";
  flower.style.top = spot.y + "px";

  // Petals take all the remaining study time to open fully, so every
  // lotus finishes blooming exactly when the break begins
  flower.style.setProperty("--bloom-time", Math.max(remainingMs, 1000) + "ms");

  document.body.appendChild(flower);
  flowers.push(flower);
  void flower.offsetWidth; // let the browser paint the starting state first
  flower.classList.add("grown", "open");

  const c = padCentre(flower);
  makeRipple(c.x, c.y, color, { maxR: 120, speed: 70, strength: 0.8 }); // a soft ring as it appears

  // This flower's sustained note: a soft layered tone with a slow 4 second fade-in
  startVoice(droneVoices, note, mood.droneLayers, mood.dronePeak, mood.droneAttack, droneFilter);
}

// ---------- WAVES (break phase) ----------
// Pressing a lotus sends a wave across the water. The moment the ring
// reaches another lotus's pad, that lotus chimes its own note, glows and
// bobs. The further the wave has travelled, the fainter the ring and the
// quieter and mellower the chime, so the pond fades away like an echo.
// Every note is from the same pentatonic scale, so however the wave
// arrives, the result always sounds pleasant together.
function emitWave(source) {
  const c = padCentre(source);
  const reach = window.innerWidth * 0.8; // distance at which chimes drop to a whisper
  // Furthest corner, measured the same flattened way the ring grows
  const farthest = Math.hypot(
    Math.max(c.x, window.innerWidth - c.x),
    Math.max(c.y, window.innerHeight - c.y) / RIPPLE_SQUASH
  );
  addRipple({
    x: c.x, y: c.y,
    color: source.style.color,
    speed: mood.waveSpeed,
    maxR: farthest,
    fadeR: reach * 1.4,
    strength: 1,
    chime: true,
    source: source,
    reach: reach
  });
}

// Has this wave's ring just reached the edge of any lotus pad?
function chimeNearbyLotuses(wave, r) {
  flowers.forEach(function (flower) {
    if (flower === wave.source || wave.hit.has(flower)) return;
    const c = padCentre(flower);
    // Distance measured on the same flattened ellipse the ring grows on
    const distance = Math.hypot(c.x - wave.x, (c.y - wave.y) / RIPPLE_SQUASH);
    if (r >= distance - flower.offsetWidth * 0.4) {
      wave.hit.add(flower);
      const strength = Math.max(0.12, Math.pow(1 - Math.min(1, distance / wave.reach), 1.5));
      touchFlower(flower, strength);
    }
  });
}

// A wave reached this lotus: chime, glow, bob and a small ripple
function touchFlower(flower, strength) {
  const now = performance.now();
  if (flower.lastTouch && now - flower.lastTouch < 250) return; // overlapping waves shouldn't stack into a burst
  flower.lastTouch = now;

  pluck(flower.dataset.note, strength);
  flower.style.setProperty("--touch", strength.toFixed(2));
  flower.classList.add("touched");
  setTimeout(function () { flower.classList.remove("touched"); }, 900);

  const c = padCentre(flower);
  makeRipple(c.x, c.y, flower.style.color, {
    maxR: 60 + 70 * strength, // a louder chime makes a bigger ripple
    speed: 110,
    strength: 0.3 + 0.5 * strength
  });
}

// ---------- BREAK PHASE ----------
// The growth notes fade out, and the lotuses become playable. Press one
// to hear it (hold to sustain it) and send a wave across the pond. Works
// with mouse, touch and keyboard (Space / Enter).
function startBreak(breakMs) {
  breakActive = true;
  flowerNotes.forEach(function (note) { stopVoice(droneVoices, note, 4); });
  flowers.forEach(function (f) { f.classList.remove("droning"); });

  document.body.classList.add("playable");
  setStatus("Break", "Press a lotus and let the ripples play the pond");

  flowers.forEach(function (flower) {
    const note = flower.dataset.note;
    flower.tabIndex = 0;
    flower.setAttribute("role", "button");
    flower.setAttribute("aria-label", "Lotus, note " + note);

    function play() {
      if (!breakActive) return;
      flower.classList.add("playing");
      pluck(note, 1);                                              // the strike
      startVoice(playVoices, note, mood.holdLayers, 0.12, 0.05, mix);  // the held note under it
      emitWave(flower);
    }
    function stop() {
      flower.classList.remove("playing");
      stopVoice(playVoices, note, 0.8);
    }

    flower.addEventListener("pointerdown", play);
    flower.addEventListener("pointerup", stop);
    flower.addEventListener("pointerleave", stop);
    flower.addEventListener("pointercancel", stop);
    flower.addEventListener("keydown", function (e) {
      if ((e.key === " " || e.key === "Enter") && !e.repeat) { e.preventDefault(); play(); }
    });
    flower.addEventListener("keyup", stop);
  });

  runPhase(PHASES[scene + "Break"], breakMs, Date.now()); // moonrise (day session) or dawn (night session)

  // The creatures follow the sky: in a day session the butterflies leave
  // and fireflies appear as night falls; in a night session the fireflies
  // fade and the butterflies arrive with the dawn. Crickets stop at the break.
  if (scene === "day") setCreatures(0, 0.8); else setCreatures(1, 0);
  setCrickets(0);
  setTimeout(endBreak, breakMs);
}

// When the break time is up, the lotuses close and play stops
function endBreak() {
  breakActive = false;
  document.body.classList.remove("playable");
  Object.keys(playVoices).forEach(function (note) { stopVoice(playVoices, note, 1); });

  // Clear any tap waves still crossing the pond
  for (let i = ripples.length - 1; i >= 0; i--) {
    if (ripples[i].chime) {
      ripples[i].el.remove();
      ripples.splice(i, 1);
    }
  }

  flowers.forEach(function (flower) {
    flower.classList.remove("playing", "touched", "open");
    flower.style.setProperty("--bloom-time", "6s"); // close slowly
    flower.removeAttribute("tabindex");
  });

  setStatus("Done", "Break over. Ready for another session?");
  againButton.hidden = false;
}