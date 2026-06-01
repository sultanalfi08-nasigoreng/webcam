// ========== Elements ==========
const v=document.getElementById('video'), cap=document.getElementById('captureBtn');
const bo=document.getElementById('borderOverlay'), bs=document.getElementById('borderStatus');
const cnt=document.getElementById('photoCountDisplay'), exp=document.getElementById('exportBtn');
const prev=document.getElementById('collagePreview'), hist=document.getElementById('photoHistory');
const imgs=[document.getElementById('slotImg0'),document.getElementById('slotImg1'),document.getElementById('slotImg2')];
const cards=document.querySelectorAll('.slot-card'), badges=[document.getElementById('badge1'),document.getElementById('badge2'),document.getElementById('badge3')];

// ========== Kondisi ==========
let frame=null, photos=[null,null,null], retake=null;

// ========== Helpers ==========
function m(t,e){let n=document.getElementById('notification'); n.textContent=t; n.style.background=e?'#8b3c3c':'#1f2c26'; n.classList.add('show'); setTimeout(()=>n.classList.remove('show'),2500);}
function ui(){
 for(let i=0;i<3;i++){let h=!!photos[i]; if(h){imgs[i].src=photos[i];cards[i].classList.add('filled');badges[i].classList.add('filled');}
 else{imgs[i].src='';cards[i].classList.remove('filled');badges[i].classList.remove('filled');}}
 let c=photos.filter(p=>p).length; cnt.innerText=c; exp.disabled=c!==3;
 if(c===3) exp.classList.add('active'); else exp.classList.remove('active');
 cap.disabled=(c===3&&retake===null); col();
}
function addHist(img){
 let d=document.createElement('div'); d.className='history-item';
 let i=document.createElement('img'); i.src=img;
 let o=document.createElement('div'); o.className='history-overlay'; o.innerHTML='<i class="fas fa-download"></i> save';
 d.appendChild(i); d.appendChild(o);
 d.onclick=(e)=>{e.stopPropagation();let a=document.createElement('a');a.download=`photo_${Date.now()}.png`;a.href=img;a.click();m('Saved');};
 hist.prepend(d); if(hist.children.length>12) hist.removeChild(hist.lastChild);
}

// ========== Load Frame (border1.png, border2.png, border3.png) ==========
async function load(frameFile){
 let img=new Image();
 await new Promise(resolve => {
  img.onload = () => resolve();
  img.onerror = () => { m(`Failed load ${frameFile}`,1); resolve(); };
  img.src = frameFile;
 });
 frame=img; 
 bo.style.backgroundImage=`url('${img.src}')`;
 bo.style.backgroundSize='cover';
 let name=frameFile.replace('.png','');
 bs.innerText=`${name} ready`;
 bs.classList.add('loaded');
}

// ========== Kolase ==========
async function draw(pre){
 let ex=photos.filter(p=>p); if(ex.length===0) return null;
 let w=pre?360:1200, pw=w-48, ph=pw*3/4, gap=12, h=ex.length*(ph+gap);
 let c=document.createElement('canvas'); c.width=w; c.height=h; let ctx=c.getContext('2d');
 ctx.fillStyle='#fff'; ctx.fillRect(0,0,w,c.height);
 let y=0;
 for(let i=0;i<3;i++) if(photos[i]){ let img=new Image(); await new Promise(r=>{img.onload=r;img.src=photos[i];}); ctx.drawImage(img,0,y,w,ph); y+=ph+gap; }
 return c;
}
async function col(){ if(photos.filter(p=>p).length===0){ prev.innerHTML='<div class="empty-preview"><i class="fas fa-camera"></i><br/>take photos</div>'; return;}
 let c=await draw(1); if(c){ let i=document.createElement('img'); i.src=c.toDataURL(); i.style.width='100%'; prev.innerHTML=''; prev.appendChild(i);}}
async function expStrip(){ if(photos.filter(p=>p).length!==3){m('Need 3 photos',1);return;}
 let c=await draw(0); if(c){let a=document.createElement('a');a.download=`strip_${Date.now()}.png`;a.href=c.toDataURL();a.click();m('Exported!');}}

// ========== Capture ==========
async function capture(){
 if(!v.srcObject){m('Camera error',1);return;} if(!frame){m('Wait frame',1);return;}
 let slot=null; if(retake!==null) slot=retake; else for(let i=0;i<3;i++) if(!photos[i]){slot=i;break;}
 if(slot===null){m('All slots full, click slot to retake',1);return;}
 let c=document.createElement('canvas'), ctx=c.getContext('2d'), w=1000,h=750; c.width=w; c.height=h;
 let vw=v.videoWidth, vh=v.videoHeight, sx=0,sy=0,sw=vw,sh=vh;
 if(vw/vh>4/3){ sw=vh*4/3; sx=(vw-sw)/2; } else if(vw/vh<4/3){ sh=vw*3/4; sy=(vh-sh)/2; }
 ctx.save(); ctx.scale(-1,1); ctx.translate(-w,0); ctx.drawImage(v,sx,sy,sw,sh,0,0,w,h); ctx.restore();
 if(frame.complete) ctx.drawImage(frame,0,0,w,h);
 let data=c.toDataURL(); photos[slot]=data;
 if(retake===null) addHist(data); else retake=null;
 ui(); m(`Slot ${slot+1} captured!`);
}

// ========== Init Kamera ==========
async function initCam(){ try{ let s=await navigator.mediaDevices.getUserMedia({video:{aspectRatio:4/3,facingMode:'user'}}); v.srcObject=s; await v.play(); m('Camera ready'); }catch(e){ m('Camera error',1); }}

// ========== Main ==========
function init(){
 initCam();
 document.querySelectorAll('.frame-option').forEach(o=>{ o.onclick=async()=>{ document.querySelectorAll('.frame-option').forEach(x=>x.classList.remove('active')); o.classList.add('active'); await load(o.dataset.frame); }; });
 load('border1.png');
 cards.forEach((c,i)=>{ c.onclick=()=>{ if(photos[i]){ retake=i; cap.disabled=false; m(`Retake slot ${i+1}, press shutter`); } else if(photos.filter(p=>p).length<3) m(`Slot ${i+1} empty`); }; });
 cap.onclick=capture; exp.onclick=expStrip; ui();
}
window.onload=init;
