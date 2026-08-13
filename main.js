// browser loads HTML
// browser loads JS
// JS opens modal
// user presses OK on modal
// modal closes
// audio initializes


// Find my test button
const testButton = document.getElementById("test-button");

// Find our intro modal
const introModal = document.getElementById("intro-modal");

// Find modal close button
const introModalCloseButton = document.getElementById("intro-modal-close");


// ////// Modal

// Show modal on page
introModal.showModal();

// When OK is clicked, close modal
introModalCloseButton.addEventListener("click", function closeIntroModal() {
  // Close our modal
  introModal.close();
});

// When modal closes, initialize Tone
introModal.addEventListener("close", toneInit);


// ////// Tone

// Create instrument
const synth = new Tone.Synth();

function toneInit() {
  // Connect synth to audio output
  synth.toDestination();
}


// Do something when we click that button
testButton.addEventListener("click", playTestNote);

function playTestNote() {
  synth.triggerAttackRelease("C4", "8n");
}