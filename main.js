// ---------- SOUND SETUP ----------
const synth = new Tone.PolySynth().toDestination();

// ---------- MAPPING LOGIC (what this prototype is testing) ----------
// Prototype 2 mapped note = random, independent of everything else.
// Prototype 3 mapped note = fixed to a screen position.
// This prototype maps note = which CLUSTER the flower belongs to.
// Each cluster is its own small chord, so moving within a cluster
// always sounds harmonious, and moving BETWEEN clusters creates a
// deliberate, audible tonal shift — the relationship between flowers
// is what carries the meaning, not any single flower's note.
const clusters = [
  { notes: ["C4", "E4", "G4"], color: "#e08ab3" },   // C major
  { notes: ["F4", "A4", "C5"], color: "#8ab6e0" },   // F major
  { notes: ["G4", "B4", "D5"], color: "#f2c14e" },   // G major
];

// Sped up for testing — change to 25 * 60 * 1000 to match a real session
const STUDY_DURATION_MS = 8000;
const FLOWERS_PER_CLUSTER = 4;
const CLUSTER_SPAWN_RADIUS = 90; // px, how tightly flowers hug their cluster center

const status = document.getElementById("status");

// Pick cluster centers once, spaced out so they don't overlap too much
function pickClusterCenters(count) {
  const centers = [];
  const margin = 140;
  for (let i = 0; i < count; i++) {
    centers.push({
      x: margin + Math.random() * (window.innerWidth - margin * 2),
      y: margin + Math.random() * (window.innerHeight - margin * 2),
    });
  }
  return centers;
}

const centers = pickClusterCenters(clusters.length);

// Draw a faint ring at each cluster center so the grouping this
// prototype explores is visible even before any flowers appear.
centers.forEach(function (center) {
  const marker = document.createElement("div");
  marker.className = "cluster-marker";
  const size = CLUSTER_SPAWN_RADIUS * 2;
  marker.style.width = size + "px";
  marker.style.height = size + "px";
  marker.style.left = center.x - CLUSTER_SPAWN_RADIUS + "px";
  marker.style.top = center.y - CLUSTER_SPAWN_RADIUS + "px";
  document.body.appendChild(marker);
});

function spawnFlower(clusterIndex) {
  const cluster = clusters[clusterIndex];
  const center = centers[clusterIndex];

  const flower = document.createElement("div");
  flower.className = "field-flower";

  // jitter within the cluster's radius, not the whole screen —
  // this is what visually groups flowers that share a chord
  const angle = Math.random() * Math.PI * 2;
  const distance = Math.random() * CLUSTER_SPAWN_RADIUS;
  const x = center.x + Math.cos(angle) * distance;
  const y = center.y + Math.sin(angle) * distance;
  flower.style.left = x + "px";
  flower.style.top = y + "px";

  flower.style.background = cluster.color;
  flower.style.color = cluster.color; // used by the glow effect (currentColor)

  // note comes from this cluster's chord only — the core of this prototype
  const note = cluster.notes[Math.floor(Math.random() * cluster.notes.length)];
  flower.dataset.note = note;

  document.body.appendChild(flower);

  requestAnimationFrame(function () {
    flower.classList.add("grown");
  });
}

function studyPhase() {
  const totalFlowers = clusters.length * FLOWERS_PER_CLUSTER;
  const interval = STUDY_DURATION_MS / totalFlowers;

  // Spawn order round-robins across clusters so all three grow
  // together rather than one cluster finishing before the next starts
  let spawned = 0;
  const spawnTimer = setInterval(function () {
    const clusterIndex = spawned % clusters.length;
    spawnFlower(clusterIndex);
    spawned++;
    if (spawned >= totalFlowers) {
      clearInterval(spawnTimer);
      startBreak();
    }
  }, interval);
}

// ---------- BREAK PHASE: hover to play, same interaction as prototype 2 ----------
function startBreak() {
  document.body.classList.add("break-mode");
  status.textContent = "Break — move your mouse across clusters to hear the shift";

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

// Tone.js needs a user gesture before it's allowed to make sound
document.body.addEventListener(
  "click",
  function startOnce() {
    status.textContent = "Study phase: flowers growing...";
    studyPhase();
    document.body.removeEventListener("click", startOnce);
  },
  { once: true }
);