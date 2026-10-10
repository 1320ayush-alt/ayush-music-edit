(() => {
"use strict";
const $ = id => document.getElementById(id);
const state = {audioCtx:null, micStream:null, recorder:null, chunks:[], voiceBlob:null, voiceUrl:null, beatTimer:null, beatStep:0, beatStart:0, beatPlaying:false, recordingStart:0, recordInterval:null, mixRecorder:null, mixChunks:[], mixBlob:null, voiceSource:null, voiceGain:null, beatGain:null, masterGain:null, dest:null, activeOsc:[]};
const tracks = [
  {name:"KICK", key:"kick", pattern:[1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0]},
  {name:"SNARE", key:"snare", pattern:[0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0]},
  {name:"HI-HAT", key:"hat", pattern:[1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0]},
  {name:"CLAP", key:"clap", pattern:[0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0]}
];
let pattern = tracks.map(t => [...t.pattern]);
function toast(msg){const el=$("toast");el.textContent=msg;el.classList.add("show");clearTimeout(toast.t);toast.t=setTimeout(()=>el.classList.remove("show"),2300)}
function fmt(seconds, decimals=2){seconds=Math.max(0,Number(seconds)||0);const m=Math.floor(seconds/60),s=seconds%60;return String(m).padStart(2,"0")+":"+s.toFixed(decimals).padStart(decimals===2?5:4,"0")}
function getCtx(){if(!state.audioCtx){state.audioCtx=new (window.AudioContext||window.webkitAudioContext)();state.masterGain=state.audioCtx.createGain();state.masterGain.gain.value=.85;state.dest=state.audioCtx.createMediaStreamDestination();state.masterGain.connect(state.audioCtx.destination);state.masterGain.connect(state.dest)}if(state.audioCtx.state==="suspended")state.audioCtx.resume();return state.audioCtx}
function renderGrid(){
 const grid=$("sequencer");grid.innerHTML="";
 const blank=document.createElement("div");grid.append(blank);
 for(let i=0;i<16;i++){const n=document.createElement("div");n.className="step-number";n.textContent=i%4===0?String(i/4+1):"·";grid.append(n)}
 tracks.forEach((track,r)=>{
  const name=document.createElement("div");name.className="track-name";name.textContent=track.name;grid.append(name);
  for(let s=0;s<16;s++){const b=document.createElement("button");b.className="step"+(pattern[r][s]?" on":"")+(s%4===3?" beat4":"");b.setAttribute("aria-label",track.name+" step "+(s+1));b.title=track.name+" step "+(s+1);b.addEventListener("click",()=>{pattern[r][s]=pattern[r][s]?0:1;b.classList.toggle("on",!!pattern[r][s])});grid.append(b)}
 });
}
function synth(type, time, volume=1){
 const ctx=getCtx(), out=ctx.createGain();out.gain.value=volume*Number($("beatVol").value)/100;out.connect(state.masterGain);
 if(type==="kick"){const o=ctx.createOscillator(),g=ctx.createGain();o.type="sine";o.frequency.setValueAtTime(145,time);o.frequency.exponentialRampToValueAtTime(42,time+.14);g.gain.setValueAtTime(.95,time);g.gain.exponentialRampToValueAtTime(.001,time+.18);o.connect(g);g.connect(out);o.start(time);o.stop(time+.2)}
 else if(type==="snare"||type==="clap"){const n=Math.floor(ctx.sampleRate*.18),buf=ctx.createBuffer(1,n,ctx.sampleRate),d=buf.getChannelData(0);for(let i=0;i<n;i++)d[i]=(Math.random()*2-1)*(1-i/n);const src=ctx.createBufferSource(),g=ctx.createGain();src.buffer=buf;g.gain.setValueAtTime(type==="clap"?.55:.48,time);g.gain.exponentialRampToValueAtTime(.001,time+.16);src.connect(g);g.connect(out);src.start(time);if(type==="snare"){const o=ctx.createOscillator(),og=ctx.createGain();o.type="triangle";o.frequency.value=185;og.gain.setValueAtTime(.24,time);og.gain.exponentialRampToValueAtTime(.001,time+.1);o.connect(og);og.connect(out);o.start(time);o.stop(time+.11)}}
 else {const n=Math.floor(ctx.sampleRate*.045),buf=ctx.createBuffer(1,n,ctx.sampleRate),d=buf.getChannelData(0);for(let i=0;i<n;i++)d[i]=(Math.random()*2-1)*(1-i/n);const src=ctx.createBufferSource(),g=ctx.createGain(),hp=ctx.createBiquadFilter();hp.type="highpass";hp.frequency.value=6500;g.gain.value=.22;src.buffer=buf;src.connect(hp);hp.connect(g);g.connect(out);src.start(time)}
}
function tick(){
 const ctx=getCtx(), step=state.beatStep%16;
 pattern.forEach((row,r)=>{if(row[step])synth(tracks[r].key,ctx.currentTime)});
 const buttons=$("sequencer").querySelectorAll(".step");buttons.forEach((b,i)=>b.classList.toggle("playing",i%16===step));
 state.beatStep++;const bpm=Number($("bpm").value);state.beatTimer=setTimeout(tick,60000/bpm/4);
}
function startBeat(){if(state.beatPlaying)return;getCtx();state.beatPlaying=true;state.beatStep=0;$("playBeatBtn").disabled=true;$("stopBeatBtn").disabled=false;state.beatStart=performance.now();tick()}
function stopBeat(){state.beatPlaying=false;clearTimeout(state.beatTimer);$("playBeatBtn").disabled=false;$("stopBeatBtn").disabled=true;$("sequencer").querySelectorAll(".step").forEach(b=>b.classList.remove("playing"))}
async function startRecording(){
 try{
  state.micStream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true}});
  const mime=["audio/webm;codecs=opus","audio/webm","audio/mp4"].find(t=>window.MediaRecorder&&MediaRecorder.isTypeSupported(t));
  state.recorder=new MediaRecorder(state.micStream,mime?{mimeType:mime}:undefined);state.chunks=[];
  state.recorder.ondataavailable=e=>{if(e.data.size)state.chunks.push(e.data)};
  state.recorder.onstop=()=>{state.voiceBlob=new Blob(state.chunks,{type:state.recorder.mimeType||"audio/webm"});if(state.voiceUrl)URL.revokeObjectURL(state.voiceUrl);state.voiceUrl=URL.createObjectURL(state.voiceBlob);$("voiceAudio").src=state.voiceUrl;$("playVoiceBtn").disabled=false;$("downloadVoiceBtn").disabled=false;$("playMixBtn").disabled=false;$("exportMixBtn").disabled=false;$("mixMessage").textContent="Ready to play and export a voice + beat mix.";state.micStream.getTracks().forEach(t=>t.stop());state.micStream=null;$("micStatus").textContent="RECORDING SAVED";$("recordMessage").textContent="Recording saved temporarily in this page.";};
  state.recorder.start();state.recordingStart=performance.now();$("recordBtn").disabled=true;$("stopRecordBtn").disabled=false;$("recordPulse").classList.add("active");$("micStatus").textContent="MIC CONNECTED";$("recordMessage").textContent="Recording…";state.recordInterval=setInterval(()=>$("recordTimer").textContent=fmt((performance.now()-state.recordingStart)/1000,1),100);
 }catch(e){toast("Microphone permission was blocked. Allow it in your browser and try again.");$("recordMessage").textContent="Microphone unavailable. Check browser permissions."}
}
function stopRecording(){if(state.recorder&&state.recorder.state!=="inactive"){state.recorder.stop();clearInterval(state.recordInterval);$("recordBtn").disabled=false;$("stopRecordBtn").disabled=true;$("recordPulse").classList.remove("active");$("recordTimer").textContent=fmt((performance.now()-state.recordingStart)/1000,1)}}
function stopMixPlayback(){const a=$("mixAudio");a.pause();a.currentTime=0;if(state.voiceSource){try{state.voiceSource.stop()}catch(e){}state.voiceSource=null}stopBeat();$("stopMixBtn").disabled=true;$("playMixBtn").disabled=!state.voiceBlob}
async function playMix(){
 if(!state.voiceBlob){toast("Record a vocal first.");return}
 stopMixPlayback();const ctx=getCtx();state.beatStep=0;
 const voiceBuf=await state.voiceBlob.arrayBuffer();let decoded;
 try{decoded=await ctx.decodeAudioData(voiceBuf.slice(0))}catch(e){toast("This browser could not decode the voice recording for mixing.");return}
 const src=ctx.createBufferSource(),gain=ctx.createGain();src.buffer=decoded;gain.gain.value=Number($("voiceVol").value)/100;src.connect(gain);gain.connect(state.masterGain);state.voiceSource=src;
 // Use an independent beat scheduler so the mix and vocal start together.
 state.beatPlaying=true;$("playMixBtn").disabled=true;$("stopMixBtn").disabled=false;src.start(ctx.currentTime+.04);
 let step=0;const start=ctx.currentTime+.04, beatDur=60/Number($("bpm").value)/4, totalSteps=Math.ceil(decoded.duration/beatDur);
 const schedule=()=>{if(!state.beatPlaying)return;const now=ctx.currentTime;while(step<totalSteps&&start+step*beatDur<now+.12){const s=step%16;pattern.forEach((row,r)=>{if(row[s])synth(tracks[r].key,start+step*beatDur)});step++}if(step<totalSteps){state.beatTimer=setTimeout(schedule,25)}else{state.beatPlaying=false}};
 schedule();src.onended=()=>{state.beatPlaying=false;clearTimeout(state.beatTimer);$("playMixBtn").disabled=false;$("stopMixBtn").disabled=true};
}
async function exportMix(){
 if(!state.voiceBlob)return;
 const ctx=getCtx();stopMixPlayback();
 let decoded;try{decoded=await ctx.decodeAudioData((await state.voiceBlob.arrayBuffer()).slice(0))}catch(e){toast("Could not decode this recording for mix export.");return}
 const duration=decoded.duration, bpm=Number($("bpm").value), beatDur=60/bpm/4;
 // Render the synthetic beat and vocal into an offline buffer, then encode WAV locally.
 const sampleRate=44100, length=Math.ceil((duration+.1)*sampleRate), off=new OfflineAudioContext(2,length,sampleRate);
 const voice=off.createBufferSource();voice.buffer=decoded;const vg=off.createGain();vg.gain.value=Number($("voiceVol").value)/100;voice.connect(vg);vg.connect(off.destination);voice.start(0);
 function addTone(type,t){
  const g=off.createGain();g.gain.value=Number($("mixBeatVol").value)/100;
  if(type==="kick"){const o=off.createOscillator();o.type="sine";o.frequency.setValueAtTime(145,t);o.frequency.exponentialRampToValueAtTime(42,t+.14);const eg=off.createGain();eg.gain.setValueAtTime(.8,t);eg.gain.exponentialRampToValueAtTime(.001,t+.18);o.connect(eg);eg.connect(g);g.connect(off.destination);o.start(t);o.stop(t+.2)}
  else {const n=Math.floor(sampleRate*(type==="hat"?.045:.16)),buf=off.createBuffer(1,n,sampleRate),d=buf.getChannelData(0);for(let i=0;i<n;i++)d[i]=(Math.random()*2-1)*(1-i/n);const s=off.createBufferSource(),eg=off.createGain();s.buffer=buf;eg.gain.setValueAtTime(type==="hat"?.13:.35,t);eg.gain.exponentialRampToValueAtTime(.001,t+(type==="hat"?.045:.16));if(type==="hat"){const hp=off.createBiquadFilter();hp.type="highpass";hp.frequency.value=6000;s.connect(hp);hp.connect(eg)}else s.connect(eg);eg.connect(g);g.connect(off.destination);s.start(t)}
 }
 let step=0;for(let t=0;t<duration;t+=beatDur,step++){pattern.forEach((row,r)=>{if(row[step%16])addTone(tracks[r].key,t)})}
 const rendered=await off.startRendering();const wav=audioBufferToWav(rendered);const url=URL.createObjectURL(new Blob([wav],{type:"audio/wav"}));downloadUrl(url,"beatforge-mix.wav");setTimeout(()=>URL.revokeObjectURL(url),10000);toast("Mixed WAV exported to your device.");
}
function audioBufferToWav(buffer){const channels=buffer.numberOfChannels,rate=buffer.sampleRate,frames=buffer.length,bytes=2, dataSize=frames*channels*bytes, out=new ArrayBuffer(44+dataSize),v=new DataView(out);function str(o,s){for(let i=0;i<s.length;i++)v.setUint8(o+i,s.charCodeAt(i))}str(0,"RIFF");v.setUint32(4,36+dataSize,true);str(8,"WAVE");str(12,"fmt ");v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,channels,true);v.setUint32(24,rate,true);v.setUint32(28,rate*channels*bytes,true);v.setUint16(32,channels*bytes,true);v.setUint16(34,16,true);str(36,"data");v.setUint32(40,dataSize,true);let offset=44;for(let i=0;i<frames;i++)for(let c=0;c<channels;c++){let x=Math.max(-1,Math.min(1,buffer.getChannelData(c)[i]));v.setInt16(offset,x<0?x*32768:x*32767,true);offset+=2}return out}
function downloadUrl(url,name){const a=document.createElement("a");a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove()}
function downloadBlob(blob,name){downloadUrl(URL.createObjectURL(blob),name)}
function syncLabels(){$("bpmLabel").textContent=$("bpm").value+" BPM";$("beatVolLabel").textContent=$("beatVol").value+"%";$("mixBeatVolLabel").textContent=$("mixBeatVol").value+"%";$("voiceVolLabel").textContent=$("voiceVol").value+"%"}
$("recordBtn").addEventListener("click",startRecording);$("stopRecordBtn").addEventListener("click",stopRecording);
$("playVoiceBtn").addEventListener("click",()=>{if($("voiceAudio").src)$("voiceAudio").play()});
$("downloadVoiceBtn").addEventListener("click",()=>{if(state.voiceBlob)downloadBlob(state.voiceBlob,"beatforge-vocals.webm")});
$("playBeatBtn").addEventListener("click",startBeat);$("stopBeatBtn").addEventListener("click",stopBeat);
$("clearBeatBtn").addEventListener("click",()=>{pattern=tracks.map(()=>Array(16).fill(0));renderGrid();toast("Beat pattern cleared.")});
$("downloadPatternBtn").addEventListener("click",()=>downloadBlob(new Blob([JSON.stringify({bpm:Number($("bpm").value),bars:Number($("bars").value),tracks:tracks.map((t,i)=>({name:t.name,steps:pattern[i]}))},null,2)],{type:"application/json"}),"beatforge-pattern.json"));
$("playMixBtn").addEventListener("click",playMix);$("stopMixBtn").addEventListener("click",stopMixPlayback);$("exportMixBtn").addEventListener("click",exportMix);
["bpm","beatVol","mixBeatVol","voiceVol"].forEach(id=>$(id).addEventListener("input",syncLabels));
window.addEventListener("beforeunload",()=>{if(state.voiceUrl)URL.revokeObjectURL(state.voiceUrl);if(state.micStream)state.micStream.getTracks().forEach(t=>t.stop())});
renderGrid();syncLabels();
})();
