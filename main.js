// ---------- SETTINGS ----------
// Timer presets in minutes. Pomodoro (25 study / 5 break) is the default.
// "demo" is a short run so you can see the whole cycle quickly.
const PRESETS = {
  pomodoro: { study: 25, rest: 5 },
  long: { study: 50, rest: 10 },
  demo: { study: 0.25, rest: 0.25 }
};

// One note per flower, all from the same pentatonic scale across
// octaves, so any number of them sounding together stays harmonious.
// Low notes come first, so the harmony grows from a deep base upward.
const flowerNotes = ["C3", "G3", "C4", "D4", "E4", "G4", "A4", "C5"];
const frequencies = {
  C3: 130.81, G3: 196.0, C4: 261.63, D4: 293.66,
  E4: 329.63, G4: 392.0, A4: 440.0, C5: 523.25
};
// Lotus colours: rose, pink, blush, orchid and a warm peach-pink
const colors = ["#ec6fa5", "#f48fb1", "#f7a8c6", "#d988c9", "#f9a98f"];

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

// How fast a wave travels across the water (pixels per second).
// A wave chimes each lotus it reaches, so this sets the pace of the melody.
const WAVE_SPEED = 280;

const statusEl = document.getElementById("status");
const statusTag = statusEl.querySelector(".tag");
const statusMsg = statusEl.querySelector(".msg");
const setupPanel = document.getElementById("setup");
const form = document.getElementById("settings");
const studyInput = document.getElementById("studyMinutes");
const breakInput = document.getElementById("breakMinutes");
const presetButtons = document.querySelectorAll(".preset");
const againButton = document.getElementById("again");
const sky = document.getElementById("sky");
const sun = document.getElementById("sun");
const pond = document.getElementById("pond");
const glitterCanvas = document.getElementById("glitter");
const glitterCtx = glitterCanvas.getContext("2d");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const flowers = [];
let breakActive = false;
let sunProgress = 0; // 0 = sunrise, 1 = fully set; kept so resizing can re-place the sun
let sunX = 0;        // sun's horizontal position in px, used to centre the reflection
let sunGlint = 0;    // 0 to 1, how strongly the sun is reflected (0 once it has set)
let sunHue = 50;     // current sun colour, so the reflection matches it

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

// Layers that make up each kind of note. detune is in cents (100 = one
// semitone); the tiny detuned copy beats slowly against the main note,
// which sounds like a gentle chorus. mult 2 = one octave up.
const DRONE_LAYERS = [
  { type: "sine", mult: 1, detune: 0, level: 1 },
  { type: "triangle", mult: 1, detune: 6, level: 0.3 },
  { type: "sine", mult: 2, detune: -5, level: 0.1 }
];
const HOLD_LAYERS = [
  { type: "sine", mult: 1, detune: 0, level: 1 },
  { type: "triangle", mult: 2, detune: 3, level: 0.2 }
];

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
  reverb.buffer = makeReverbImpulse(3.2, 3);
  const reverbSend = audioCtx.createGain();
  reverbSend.gain.value = 0.45;
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
  droneFilter.frequency.setValueAtTime(450, now);
  droneFilter.frequency.linearRampToValueAtTime(2600, now + studyMs / 1000);
  droneFilter.connect(mix);

  // A very slow LFO makes the filter breathe in and out, so the sustained
  // chord shimmers a little instead of sitting perfectly still.
  const lfo = audioCtx.createOscillator();
  lfo.frequency.value = 0.08;
  const lfoDepth = audioCtx.createGain();
  lfoDepth.gain.value = 180; // Hz of cutoff movement either way
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
  env.gain.exponentialRampToValueAtTime(0.0005, now + 2.4);           // long fade
  // A lowpass filter makes distant chimes (low strength) duller and mellower
  const soften = audioCtx.createBiquadFilter();
  soften.type = "lowpass";
  soften.frequency.value = 700 + 3300 * strength;
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
    osc.stop(now + 2.5);
  });
}

// ---------- START ----------
// Submitting the form is a user click, which also unlocks browser audio
form.addEventListener("submit", function (event) {
  event.preventDefault();

  const studyMs = clamp(studyInput.value, 0.25, 180, 25) * 60 * 1000;
  const breakMs = clamp(breakInput.value, 0.25, 60, 5) * 60 * 1000;

  setupAudio(studyMs);

  setupPanel.hidden = true;
  setStatus("Study", "Watch the sun cross the sky");
  studyPhase(studyMs, breakMs);
});

againButton.addEventListener("click", function () {
  location.reload(); // simplest clean reset: back to the setup screen
});

// ---------- SUN (shows how much study time has passed) ----------
// Blend between two [r, g, b] colours; t runs 0 to 1
function mixColour(a, b, t) {
  return "rgb(" + a.map(function (v, i) { return Math.round(v + (b[i] - v) * t); }).join(",") + ")";
}

// progress p runs from 0 to 1 across the study phase. The sun travels
// left to right and follows an arc: it rises from the water line, peaks
// halfway, then sinks back into the water as p reaches 1.
function placeSun(p) {
  sunProgress = p;
  const w = sky.clientWidth;
  const h = sky.clientHeight;
  const s = sun.offsetWidth;

  const x = s + p * (w - 2 * s);            // keep one sun-width clear of each edge
  const hiddenY = h + s * 0.6;              // sun centre low enough to be fully below the water line
  const topY = s * 0.9;                     // highest point of the arc
  const lift = Math.pow(Math.sin(Math.PI * p), 0.7); // 0 at both ends, 1 at the middle (0.7 flattens the peak)
  const y = hiddenY - (hiddenY - topY) * lift;

  sun.style.transform = "translate(" + (x - s / 2) + "px, " + (y - s / 2) + "px)";

  // Colour warms from pale gold to deep orange and the sky turns to dusk.
  // These are CSS variables on the page root, so the sky, haze, water
  // sheen and sun reflection all pick up the same colours.
  const hue = 50 - 36 * p;
  const dusk = p * p; // squared, so dusk arrives late
  const root = document.documentElement.style;
  root.setProperty("--sun-color", "hsl(" + hue + ", 95%, 62%)");
  root.setProperty("--sun-glow", "hsla(" + hue + ", 95%, 60%, 0.45)");
  root.setProperty("--dusk", dusk.toFixed(3));
  root.setProperty("--haze", mixColour([207, 234, 242], [255, 154, 92], dusk)); // day blue-white to sunset orange
  root.setProperty("--sun-x", x.toFixed(1) + "px");
  root.setProperty("--glint", Math.min(1, lift * 1.6).toFixed(3)); // reflection fades as the sun sinks

  sunX = x;
  sunGlint = Math.min(1, lift * 1.6);
  sunHue = hue;
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
  if (sunGlint < 0.01) return; // sun is down: nothing to reflect

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
        ? "hsla(" + sunHue + ", 95%, 70%, " + alpha.toFixed(3) + ")"  // warm, matches the sun
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

// Drive the sun from the real clock (not a counter) so it stays accurate
// even if the browser slows down a background tab.
function runSun(studyMs, startTime) {
  function frame() {
    const p = Math.min(1, (Date.now() - startTime) / studyMs);
    placeSun(p);
    if (p < 1) {
      requestAnimationFrame(frame);
    } else {
      // The sun has set: a ripple spreads where it met the water
      makeRipple(sky.clientWidth - sun.offsetWidth, sky.clientHeight, "hsl(14, 95%, 62%)", { maxR: 240, speed: 110, strength: 0.9 });
    }
  }
  frame();
}

// Keep the sun in the right place if the window is resized
window.addEventListener("resize", function () { sizeGlitter(); placeSun(sunProgress); });
placeSun(0); // starts hidden below the water line

// ---------- STUDY PHASE ----------
// A lotus appears at an even interval. Each one adds its own note
// to a sustained chord, so the sound gets richer as time passes,
// and its petals slowly open until the study time is over.
// The sun crosses the sky over the same period.
function studyPhase(studyMs, breakMs) {
  const interval = studyMs / flowerNotes.length;
  const startTime = Date.now();
  let i = 0;

  runSun(studyMs, startTime);

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
  const color = colors[Math.floor(Math.random() * colors.length)];
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
  startVoice(droneVoices, note, DRONE_LAYERS, 0.055, 4, droneFilter);
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
    speed: WAVE_SPEED,
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
      startVoice(playVoices, note, HOLD_LAYERS, 0.12, 0.05, mix);  // the held note under it
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