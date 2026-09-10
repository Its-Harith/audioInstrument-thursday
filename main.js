// ---------- SOUND SETUP ----------
const synth = new Tone.PolySynth().toDestination();

function playNote(e) {
  synth.triggerAttack(e.currentTarget.dataset.note);
}
function endNote(e) {
  synth.triggerRelease(e.currentTarget.dataset.note);
}

// ---------- LAYOUT ----------
// 7 positions total, left to right. Notes are FIXED per position —
// unlike prototype 2, the same spot always plays the same note,
// which is what makes it feel like a real instrument instead of
// a random sound generator.
const notesLeftToRight = ["C4", "D4", "E4", "G4", "A4", "C5", "D5"];
const centerIndex = 3; // "G4" — the middle stem

const garden = document.getElementById('garden');
const status = document.getElementById('status');

// Build all 7 stems up front (invisible / height 0), so they already
// exist in the right left-to-right order before any growing starts.
const stems = [];

for (let i = 0; i < notesLeftToRight.length; i++) {
  const wrap = document.createElement('div');
  wrap.className = 'stem-wrap';

  const flower = document.createElement('div');
  flower.className = 'flower';
  flower.dataset.note = notesLeftToRight[i];
  flower.addEventListener('mousedown', playNote);
  flower.addEventListener('mouseup', endNote);
  flower.addEventListener('mouseleave', endNote);

  const stem = document.createElement('div');
  stem.className = 'stem';

  wrap.appendChild(flower);
  wrap.appendChild(stem);
  garden.appendChild(wrap);

  stems.push({ stem, flower, index: i });
}

// ---------- GROWTH ORDER ----------
// Center first, then outward in pairs: [3], [2,4], [1,5], [0,6]
// This is what makes it visually grow "from the middle outward,
// taller and taller" like you described.
const growthOrder = [
  [centerIndex],
  [centerIndex - 1, centerIndex + 1],
  [centerIndex - 2, centerIndex + 2],
  [centerIndex - 3, centerIndex + 3],
];

function heightForDistance(distanceFromCenter) {
  // Height increases the further a stem is from the center —
  // this is the "taller and taller outward" shape.
  return 60 + distanceFromCenter * 35;
}

function growStage(stageNum) {
  if (stageNum >= growthOrder.length) {
    status.textContent = 'Fully grown — click the flowers to play';
    return;
  }

  const indices = growthOrder[stageNum];
  indices.forEach(function (i) {
    const distance = Math.abs(i - centerIndex);
    stems[i].stem.style.height = heightForDistance(distance) + 'px';
    setTimeout(function () {
      stems[i].flower.style.transform = 'scale(1)';
    }, 600); // flower blooms shortly after its stem finishes growing
  });

  setTimeout(function () {
    growStage(stageNum + 1);
  }, 1400);
}

// Growing starts on first click (Tone.js needs a user gesture to allow sound)
document.body.addEventListener('click', function startOnce() {
  status.textContent = 'Growing...';
  growStage(0);
  document.body.removeEventListener('click', startOnce);
}, { once: true });