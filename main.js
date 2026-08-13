//browser loads hmtml > browser loads js > js to open modal > user presses ok on mdal > modal closes > audio init
// document.body.style.backgroundColor = "red";
// find my test button
const testButton = document.getElementById("test-button");
//find our intro modal
const intromodal = document.getElementById("intro-model");
//console.log("introModal");
//console.log("test");
//console.log(1 + 2)
//findnmodal close button
const introModalCloseButton = document.getElementById("intro-moda-clsoe");

////// Modal
// show Modal on page

introModal.showModal();
// when ok clicked, close modal
introModalCloseButton.addEvenListener("click", function closeIntroModal(){ 
  //close our modal
  intromodal.closest();
});

introModal.addEventlistener("close", toneInit);

////////Tone



//create instrument 
const synth = new TouchEvent.Synth()

function toneInit(){
  // connect synth to audio output
  synth.toDestination();


}


// do something when we click thay button
testbutton.addEventlistener("click", playTestNote);

function playTestNote(){
  synth.triggerAttackRelease("C4", "8n"); 
}