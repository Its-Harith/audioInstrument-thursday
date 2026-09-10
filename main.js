  // ---------- SOUND SETUP ----------
  const synth = new Tone.PolySynth().toDestination();

  // Pentatonic scale — any combination of these notes sounds pleasant together
  const scale = ["C4", "D4", "E4", "G4", "A4"];

  // ---------- STUDY PHASE: spawn flowers over time ----------
  // Real Pomodoro = 25 min. Sped up here to 8 seconds so you can test it now.
  // To match a real session later, change STUDY_DURATION_MS to 25 * 60 * 1000
  const STUDY_DURATION_MS = 8000;
  const FLOWER_COUNT = 10;
  const colors = ["#e08ab3", "#f2c14e", "#7dd87d", "#8ab6e0", "#c98ae0"];

  const status = document.getElementById('status');
  let flowersSpawned = 0;

  function spawnFlower() {
    const flower = document.createElement('div');
    flower.className = 'field-flower';

    // random position on screen, staying away from the very edges
    const x = Math.random() * (window.innerWidth - 40) + 20;
    const y = Math.random() * (window.innerHeight - 40) + 20;
    flower.style.left = x + 'px';
    flower.style.top = y + 'px';

    // random colour, random note from the pleasant scale
    const color = colors[Math.floor(Math.random() * colors.length)];
    flower.style.background = color;
    flower.style.color = color; // used by the glow effect (currentColor)
    flower.dataset.note = scale[Math.floor(Math.random() * scale.length)];

    document.body.appendChild(flower);

    // trigger the grow animation on the next frame
    requestAnimationFrame(function () {
      flower.classList.add('grown');
    });

    flowersSpawned++;
  }

  function studyPhase() {
    const interval = STUDY_DURATION_MS / FLOWER_COUNT;
    let spawned = 0;

    const spawnTimer = setInterval(function () {
      spawnFlower();
      spawned++;
      if (spawned >= FLOWER_COUNT) {
        clearInterval(spawnTimer);
        startBreak();
      }
    }, interval);
  }

  // ---------- BREAK PHASE: hover to play ----------
  function startBreak() {
    document.body.classList.add('break-mode');
    status.textContent = 'Break — move your mouse over the flowers';

    const flowers = document.querySelectorAll('.field-flower');

    flowers.forEach(function (flower) {
      flower.addEventListener('mouseenter', function () {
        const note = flower.dataset.note;
        synth.triggerAttack(note);
        flower.classList.add('playing');
      });

      flower.addEventListener('mouseleave', function () {
        const note = flower.dataset.note;
        synth.triggerRelease(note);
        flower.classList.remove('playing');
      });
    });
  }

  // Tone needs a user click to start (browser rule) — so we kick off
  // the whole thing on the first click anywhere on the page.
  document.body.addEventListener('click', function startOnce() {
    status.textContent = 'Study phase: flowers growing...';
    studyPhase();
    document.body.removeEventListener('click', startOnce);
  }, { once: true });

