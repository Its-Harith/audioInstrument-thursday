// Browser loads HTML
// Browser loads JS
// JS opens modal
// User presses OK on modal
// Modal closes
// Audio initializes


// Find my test button
const testButton = document.getElementById("test-button");

// Find my key-test button
const key = document.getElementById("key-test");

// Find our intro modal
const introModal = document.getElementById("intro-modal");

// Find modal close button
const introModalCloseButton = document.getElementById("intro-modal-close");


// Is the mouse button held?
let mouseButtonDown = false;


// Mouse

window.addEventListener("mousedown", function() {

    mouseButtonDown = true;

});

window.addEventListener("mouseup", function() {

    mouseButtonDown = false;

});


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
const synth = new Tone.PolySynth();

function toneInit() {

    // Connect synth to audio output
    synth.toDestination();

}


function playNote(e) {

    // Find the element that the event ran on
    let keyPressed = e.target;

    console.log(keyPressed);

    // Find the data-note attribute of that element
    let note = keyPressed.dataset.note;

    console.log(note);

    // Play the note
    synth.triggerAttack(note);

}


function endNote(e) {

    // Find the element that the event ran on
    let keyPressed = e.target;

    console.log(keyPressed);

    // Find the data-note attribute of that element
    let note = keyPressed.dataset.note;

    console.log(note);

    // Release the note
    synth.triggerRelease(note);

}


// Test button
testButton.addEventListener("mousedown", playNote);
testButton.addEventListener("mouseup", endNote);
testButton.addEventListener("mouseleave", endNote);
testButton.addEventListener("mouseenter", playNote);


// Key button
key.addEventListener("mousedown", playNote);
key.addEventListener("mouseup", endNote);
key.addEventListener("mouseleave", endNote);