// ---------- SOUND SETUP ----------
const synth = new Tone.PolySynth().toDestination();
const scale = ["C4", "D4", "E4", "G4", "A4"]; // same pentatonic scale as prototype 2

// ---------- WHAT THIS PROTOTYPE TESTS ----------
// Prototype 2 (Steady Bloom equivalent) would spawn flowers at an
// EVEN interval, so growth rate = elapsed time, 1:1.
// This prototype instead schedules flowers on a quadratic curve:
// flower i spawns at time = duration * (i / count)^2.
// Early on, spawn gaps are large (session feels slow / calm).
// Near the end, gaps shrink fast (session feels like it's rushing).
// The progress bar at the top still advances at a normal, constant
// rate, so you can directly compare "real time passing" against
// "how fast the garden feels like it's filling up."
const STUDY_DURATION_MS = 8000; // sped up for testing; use 25 * 60 * 1000 for a real session
const FLOWER_COUNT = 12;
const colors = ["#e08ab3", "#f2c14e", "#7dd87d", "#8ab6e0", "#c98ae0"];

const status = document.getElementById("status");
const progressFill = document.getElementById("progress-fill");

function spawnFlower() {
  const flower = document.createElement("div");
  flower.className = "field-flower";

  const x = Math.random() * (window.innerWidth - 40) + 20;
  const y = Math.random() * (window.innerHeight - 40) + 20;
  flower.style.left = x + "px";
  flower.style.top = y + "px";

  const color = colors[Math.floor(Math.random() * colors.length)];
  flower.style.background = color;
  flower.style.color = color;
  flower.dataset.note = scale[Math.floor(Math.random() * scale.length)];

  document.body.appendChild(flower);
  requestAnimationFrame(function () {
    flower.classList.add("grown");
  });
}

// Precompute the accelerating spawn schedule up front. Using the
// SQUARE ROOT of (i / count), not squaring it, is what creates the
// "slow start, rapid finish" feel: sqrt front-loads a long wait for
// the earliest flowers, then compresses the gaps between each later
// flower, so spawns visibly speed up as the session goes on.
function buildAcceleratingSchedule(count, duration) {
  const times = [];
  for (let i = 1; i <= count; i++) {
    const fraction = Math.sqrt(i / count); // 0 -> 1, front-loaded curve
    times.push(duration * fraction);
  }
  return times;
}

function studyPhase() {
  const schedule = buildAcceleratingSchedule(FLOWER_COUNT, STUDY_DURATION_MS);

  schedule.forEach(function (spawnTime) {
    setTimeout(spawnFlower, spawnTime);
  });

  // Progress bar runs on its own, genuinely linear timer — this is
  // the "real" elapsed time, separate from how fast flowers appear.
  const startTime = performance.now();
  function updateProgress() {
    const elapsed = performance.now() - startTime;
    const percent = Math.min(100, (elapsed / STUDY_DURATION_MS) * 100);
    progressFill.style.width = percent + "%";

    if (elapsed < STUDY_DURATION_MS) {
      requestAnimationFrame(updateProgress);
    } else {
      startBreak();
    }
  }
  requestAnimationFrame(updateProgress);
}

// ---------- BREAK PHASE: hover to play, same as prototype 2 ----------
function startBreak() {
  document.body.classList.add("break-mode");
  status.textContent = "Break — move your mouse over the flowers";

  const flowers = document.querySelectorAll(".field-flower");

  flowers.forEach(function (flower) {
    flower.addEventListener("mouseenter", function () {
      synth.triggerAttack(flower.dataset.note);
      flower.classList.add("playing");
    });

    flower.addEventListener("mouseleave", function () {
      synth.triggerRelease(flower.dataset.note);
      flower.classList.remove("playing");
    });
  });
}

document.body.addEventListener(
  "click",
  function startOnce() {
    status.textContent = "Study phase: flowers growing...";
    studyPhase();
    document.body.removeEventListener("click", startOnce);
  },
  { once: true }
);