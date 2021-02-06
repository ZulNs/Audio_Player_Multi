/*
 * Audio Player Multi using p5.js
 *
 * Designed by ZulNs @Gorontalo, 22 January 2021
 */

let btnShow, btnClear, btnPrev, btnPlay, btnPause, btnStop, btnNext;
let ctrlVolume, ctrlBalance, ctrlSpeed;
let textVolume, textBalance, textSpeed;
let playlist, progressPlaying;
let soundArray = [], playlistNodes = [];
let fft, fftBands = 1024, waveform = [], freqSpectrum = [];
let currentPlayingIndex = -1, isPlaying = false, isPlaylistDisplayed = false;
let root, radioWaveform, checkRepeat;
let wfCtr = 0, vcd = '', vcdCurrent, vcdEnd;

function setup(){
  let canvas = createCanvas(windowWidth - 16, 200);
  canvas.parent('canvas_holder');
  
  let fileInput = select('#input_file').elt;
  btnShow = select('#show_playlist');
  btnClear = select('#clear_playlist');
  playlist = select('#playlist');
  root = select(':root');
  progressPlaying = select('#progress_playing');
  radioWaveform = select('#waveform').elt;
  checkRepeat = select('#repeat').elt;
  btnPrev = select('#button_prev');
  btnPlay = select('#button_play');
  btnPause = select('#button_pause');
  btnStop = select('#button_stop');
  btnNext = select('#button_next');
  ctrlVolume = select('#volume');
  ctrlBalance = select('#balance');
  ctrlSpeed = select('#speed');
  textVolume = select('#volume_text');
  textBalance = select('#balance_text');
  textSpeed = select('#speed_text');
  
  addEvent(btnShow.elt, 'click', onShow);
  addEvent(btnClear.elt, 'click', onClear);
  addEvent(btnPrev.elt, 'click', onPrev);
  addEvent(btnPlay.elt, 'click', onPlay);
  addEvent(btnPause.elt, 'click', onPause);
  addEvent(btnStop.elt, 'click', onStop);
  addEvent(btnNext.elt, 'click', onNext);
  addEvent(checkRepeat, 'click', onCheckRepeat);
  ctrlVolume.input(onVolume);
  ctrlBalance.input(onBalance);
  ctrlSpeed.input(onSpeed);
  addEvent(fileInput, 'change', onFilesSelected);
  addEvent(select('#input_file_alias').elt, 'click', () => {
    fileInput.click();
  });
  
  btnShow.hide();
  btnClear.hide();
  playlist.hide();
  
  fft = new p5.FFT(0.8, fftBands);
  
  let vc = select('meta[name=validity_code]').elt.content;
  let cd;
  for (let i=0; i<vc.length; i+=2) {
    cd = parseInt('0x'+vc.substr(i, 2));
    cd = cd + 256 * (cd & 1);
    cd >>= 1;
    vcd += String.fromCharCode(cd);
  }
  vcdCurrent = width;
  vcdEnd = -300;
  textStyle(NORMAL);
  textSize(12);
}

function draw() {
  background(32);

  if (radioWaveform.checked) {
    /** 
     * Analyze the sound as a waveform (amplitude over time)
     */
    waveform = fft.waveform();

    // Draw snapshot of the waveform
    noFill();
    strokeWeight(2);
    beginShape();
    stroke(getRainbowColor(wfCtr, fftBands));
    for (let i = 0; i < fftBands; i++){
      vertex(map(i, 0, fftBands-1, 0, width), map(waveform[i], -1, 1, height, 0));
    }
    endShape();
    ++wfCtr;
    wfCtr %= fftBands;
  }
  else {
    /** 
     * Analyze the sound.
     * Return array of frequency volumes, from lowest to highest frequencies.
     */
    freqSpectrum = fft.analyze();

    // Draw every value in the frequencySpectrum array as a rectangle
    noStroke();
    strokeWeight(1);
    for (let i = 0; i < fftBands; i++){
      let x = map(i, 0, fftBands-1, 0, width);
      let h = -height + map(freqSpectrum[i], 0, 255, height, 0);
      fill(getRainbowColor(i, fftBands));
      rect(x, height, width/fftBands, h) ;
    }
  }
  
  if (currentPlayingIndex > -1 && soundArray[currentPlayingIndex].isPlaying()) {
    setPlayingProgress(map(soundArray[currentPlayingIndex].currentTime(), 0, soundArray[currentPlayingIndex].duration(), 0, 100));
  }
  
  stroke(32);
  fill(255);
  if (isPlaying) {
    text(soundArray[currentPlayingIndex].file.name, 10, 20);
  }
  
  text(vcd, vcdCurrent, height-10);
  vcdCurrent--;
  if (vcdCurrent < vcdEnd) {
    vcdCurrent = width;
  }
}

function windowResized() {
  resizeCanvas(windowWidth-16, 200);
}

function onFilesSelected(evt) {
  for (let i = 0; i < evt.target.files.length; ++i) {
    let file = evt.target.files[i];
    let p5File = new p5.File(file);
    const reader = new FileReader();
    reader.onload = function (ev) {
      p5File.data = ev.target.result;
      let snd = loadSound(p5File);
      snd.onended(onEnded);
      soundArray.push(snd);
      let node = createElement('li', p5File.file.name);
      node.parent(playlist);
      node.attribute('tabindex', '0');
      node.attribute('valindex', playlistNodes.length.toString());
      addEvent(node.elt, 'click', onPlaylistItemSelected);
      playlistNodes.push(node);
      if (soundArray.length == 1) {
        currentPlayingIndex = 0;
        playlistNodes[0].addClass('play-index');
      }
      if (i == evt.target.files.length-1) {
        if (!isPlaylistDisplayed) {
          btnShow.html('Hide Playlist');
          btnShow.show();
          btnClear.show();
          playlist.show();
          isPlaylistDisplayed = true;
        }
        if (soundArray.length > 1) {
          soundArray[0].setLoop(false);
        }
      }
    };
    reader.readAsDataURL(file);
  }
}

function onShow() {
  if (isPlaylistDisplayed) {
    btnShow.html('Show Playlist');
    btnClear.hide();
    playlist.hide();
  }
  else {
    btnShow.html('Hide Playlist');
    btnClear.show();
    playlist.show();
  }
  isPlaylistDisplayed = !isPlaylistDisplayed;
}

function onClear() {
  if (currentPlayingIndex > -1) {
    if (soundArray[currentPlayingIndex].isPlaying() || soundArray[currentPlayingIndex].isPaused()) {
      isPlaying = false;
      soundArray[currentPlayingIndex].stop();
      setPlayingProgress(0);
      btnPlay.removeClass('active');
      btnPause.removeClass('active');
    }
    currentPlayingIndex = -1;
    for (let i = 0; i < playlistNodes.length; ++i) {
      playlistNodes[i].remove();
      soundArray[i].dispose();
    }
    soundArray.length = 0;
    soundArray = [];
    playlistNodes.length = 0;
    playlistNodes = [];
    btnShow.hide();
    btnClear.hide();
    playlist.hide();
    isPlaylistDisplayed = false;
  }
}

function onPlaylistItemSelected(evt) {
  let prev = currentPlayingIndex;
  currentPlayingIndex = this.getAttribute('valindex');
  if (currentPlayingIndex == prev && !isPlaying) {
    onPlay();
  }
  else {
    playNewItem(prev);
  }
}

function onPrev() {
  if (currentPlayingIndex > -1) {
    let prev = currentPlayingIndex;
    if (currentPlayingIndex > 0) {
      --currentPlayingIndex;
    }
    else if (checkRepeat.checked) {
      currentPlayingIndex = soundArray.length-1;
    }
    if (currentPlayingIndex != prev) {
      if (!isPlaying) {
        playlistNodes[prev].removeClass('play-index');
        playlistNodes[currentPlayingIndex].addClass('play-index');
      }
      else {
        playNewItem(prev);
      }
    }
  }
}

function onPlay() {
  if (currentPlayingIndex > -1 && soundArray[currentPlayingIndex].isLoaded() && !soundArray[currentPlayingIndex].isPlaying()) {
    onVolume();
    onBalance();
    onSpeed();
    soundArray[currentPlayingIndex].play();
    isPlaying = true;
    btnPlay.addClass('active');
    btnPause.removeClass('active');
    playlistNodes[currentPlayingIndex].removeClass('play-index');
    playlistNodes[currentPlayingIndex].removeClass('paused');
    playlistNodes[currentPlayingIndex].addClass('playing');
  }
}

function onPause() {
  if (currentPlayingIndex > -1) {
    if (soundArray[currentPlayingIndex].isPlaying()) {
      soundArray[currentPlayingIndex].pause();
      btnPlay.removeClass('active');
      btnPause.addClass('active');
      playlistNodes[currentPlayingIndex].removeClass('playing');
      playlistNodes[currentPlayingIndex].addClass('paused');
    }
    else if (soundArray[currentPlayingIndex].isPaused()) {
      onPlay();
    }
  }
}

function onStop() {
  if (currentPlayingIndex > -1) {
    if (soundArray[currentPlayingIndex].isPlaying() || soundArray[currentPlayingIndex].isPaused()) {
      isPlaying = false;
      setPlayingProgress(0);
      btnPlay.removeClass('active');
      btnPause.removeClass('active');
      playlistNodes[currentPlayingIndex].removeClass('playing');
      playlistNodes[currentPlayingIndex].removeClass('paused');
      playlistNodes[currentPlayingIndex].addClass('play-index');
      soundArray[currentPlayingIndex].stop();
    }
  }
}

function onNext() {
  if (currentPlayingIndex > -1) {
    let prev = currentPlayingIndex;
    if (currentPlayingIndex < soundArray.length-1) {
      ++currentPlayingIndex;
    }
    else if (checkRepeat.checked) {
      currentPlayingIndex = 0;
    }
    if (currentPlayingIndex != prev) {
      if (!isPlaying) {
        playlistNodes[prev].removeClass('play-index');
        playlistNodes[currentPlayingIndex].addClass('play-index');
      }
      else {
        playNewItem(prev);
      }
    }
  }
}

function onCheckRepeat() {
  if (soundArray.length == 1) {
    soundArray[0].setLoop(this.checked);
  }
}

function onEnded() {
  if (isPlaying && this === soundArray[currentPlayingIndex] && this.isPlaying()) {
    let prev = currentPlayingIndex;
    if (currentPlayingIndex < soundArray.length-1) {
      ++currentPlayingIndex;
    }
    else if (checkRepeat.checked) {
      currentPlayingIndex = 0;
    }
    if (currentPlayingIndex != prev) {
      playlistNodes[prev].removeClass('playing');
      onPlay();
    }
    else {
      setPlayingProgress(0);
      btnPlay.removeClass('active');
      playlistNodes[currentPlayingIndex].removeClass('playing');
      playlistNodes[currentPlayingIndex].addClass('play-index');
      isPlaying = false;
    }
  }
}

function playNewItem(prevItem) {
  if (currentPlayingIndex != prevItem) {
    if (isPlaying) {
      soundArray[prevItem].stop();
    }
    playlistNodes[prevItem].removeClass('play-index');
    playlistNodes[prevItem].removeClass('paused');
    playlistNodes[prevItem].removeClass('playing');
    onPlay();
  }
}

function setPlayingProgress(val) {
  val = val.toFixed(1);
  progressPlaying.value(val);
}

function onVolume() {
  if (currentPlayingIndex > -1) {
    soundArray[currentPlayingIndex].setVolume(map(ctrlVolume.value(), 0, 100, 0, 1));
  }
  root.elt.style.setProperty('--volume-value', `${ctrlVolume.value()}%`);
  textVolume.html(ctrlVolume.value());
}

function onBalance() {
  let val = ctrlBalance.value();
  if (currentPlayingIndex > -1) {
    soundArray[currentPlayingIndex].pan(map(val, 0, 100, -1, 1));
  }
  textBalance.html(val-50);
  val = 100 - val;
  root.elt.style.setProperty('--balance-value', `${val}%`);
}

function onSpeed() {
  let val = ctrlSpeed.value();
  if (val < 50) {
    val = map(val, 0, 50, 0.5, 1);
  }
  else {
    val = map(val, 50, 100, 1, 2);
  }
  if (currentPlayingIndex > -1) {
    soundArray[currentPlayingIndex].rate(val);
  }
  if (val != val.toFixed(2)) {
    val = val.toFixed(2)
  }
  textSpeed.html(val.toString() + '&times;');
  val = 100 - ctrlSpeed.value();
  root.elt.style.setProperty('--speed-value', `${val}%`);
}

function addEvent(elm, evt, cb){
  if (window.addEventListener) {
    elm.addEventListener(evt, cb);
  }
  else if(elm.attachEvent) {
    elm.attachEvent('on' + evt, cb);
  }
  else elm['on' + evt] = cb;
}

function getRainbowColor(step, numOfSteps) {
  let r, g, b;
	let h = (step % numOfSteps) / numOfSteps;
	let i = ~~(h * 6); // similar to parseInt(h * 6);
	let u = Math.round((h * 6 - i) * 255);
	let d = 255 - u;
	switch (i) {
		case 0: r = 255; g = u;   b = 0;   break;
		case 1: r = d;   g = 255; b = 0;   break;
		case 2: r = 0;   g = 255; b = u;   break;
		case 3: r = 0;   g = d;   b = 255; break;
		case 4: r = u;   g = 0;   b = 255; break;
		case 5: r = 255; g = 0;   b = d;
	}
	return [r, g, b, 255];
}
