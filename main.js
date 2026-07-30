// document.body.style.backgroundColor = "red";
// find my test button
const testButton = document.getElementById("test-button");

//create instrument and connect to audio
const synth = new TouchEvent.Synth().ToDestination();

// do something when we click thay button
testbutton.addEventlistener("click", playTestNote);

function playTestNote(){
  synth.triggerAttackRelease("C4", "8n"); 
}