const KEY="rc-rental-v2";
const DEFAULT={
  packages:[
    {id:"p5",name:"Quick Ride",minutes:5,price:200},
    {id:"p10",name:"Standard",minutes:10,price:350},
    {id:"p15",name:"Long Ride",minutes:15,price:500}
  ],
  cars:[{id:"c1",name:"Car 01"},{id:"c2",name:"Car 02"}],
  rides:[],
  settings:{alarmRepeat:2}
};
let data=load(), selectedCar=null, selectedRide=null;
const $=s=>document.querySelector(s);
const money=n=>"₹"+Number(n).toLocaleString("en-IN");
function load(){try{return JSON.parse(localStorage.getItem(KEY))||structuredClone(DEFAULT)}catch{return structuredClone(DEFAULT)}}
function save(){localStorage.setItem(KEY,JSON.stringify(data))}
function toast(t){const e=$("#toast");e.textContent=t;e.classList.add("show");setTimeout(()=>e.classList.remove("show"),1800)}
function fmt(ms){ms=Math.max(0,ms);const s=Math.floor(ms/1000),m=Math.floor(s/60),r=s%60;return String(m).padStart(2,"0")+":"+String(r).padStart(2,"0")}
function activeRide(carId){return data.rides.find(r=>r.carId===carId&&!r.endedAt)}
function pkg(id){return data.packages.find(p=>p.id===id)}
function todayRides(){const d=new Date();const key=d.toISOString().slice(0,10);return data.rides.filter(r=>r.date===key)}
function open(id){$("#"+id).classList.remove("hidden")}
function close(id){$("#"+id).classList.add("hidden")}
document.querySelectorAll("[data-close]").forEach(b=>b.onclick=()=>close(b.dataset.close));

function render(){
  const now=Date.now(), rides=todayRides();
  const active=data.cars.filter(c=>activeRide(c.id)).length;
  $("#activeCount").textContent=active;
  $("#readyCount").textContent=data.cars.length-active;
  $("#todayRevenue").textContent=money(rides.reduce((a,r)=>a+(r.price||0),0));
  $("#rideCountText").textContent=`${rides.length} ride${rides.length===1?"":"s"}`;

  $("#cars").innerHTML=data.cars.map(c=>{
    const r=activeRide(c.id);
    if(!r) return `<article class="car-card">
      <div class="car-top"><div class="car-name">${c.name}</div><div class="status">Available</div></div>
      <div class="ready-row"><span class="ready-note">Ready for next customer</span><button class="new" data-new="${c.id}">NEW RIDE</button></div>
    </article>`;
    const remaining=r.endsAt-now, over=remaining<=0, ending=!over&&remaining<=60000;
    const cls=over?"over":ending?"ending":"running";
    const status=over?"Time Over":ending?"Ending Soon":"Running";
    return `<article class="car-card ${cls}">
      <div class="car-top"><div class="car-name">${c.name}</div><div class="status">${status}</div></div>
      <div class="car-mid">
        <div><div class="customer">${esc(r.customer||"Walk-in customer")} · ${pkg(r.packageId)?.minutes||r.minutes} min · ${esc(r.payment)}</div><div class="meta">${esc(pkg(r.packageId)?.name||"Ride")}</div></div>
        <div class="timer">${fmt(remaining)}</div>
      </div>
      <div class="actions"><button class="extend" data-extend="${r.id}">+ EXTEND</button><button class="end" data-end="${r.id}">${over?"END RIDE":"END"}</button></div>
    </article>`;
  }).join("");

  $("#rideList").innerHTML=rides.slice().reverse().slice(0,8).map(r=>
    `<div class="ride-row"><div><strong>${esc(r.customer||"Walk-in customer")}</strong><span>${esc(r.carName)} · ${esc(r.payment)}</span></div><span>${new Date(r.startedAt).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})}</span><span class="amount">${money(r.price)}</span></div>`
  ).join("") || `<div class="ride-row"><span>No rides yet today.</span></div>`;

  document.querySelectorAll("[data-new]").forEach(b=>b.onclick=()=>newRide(b.dataset.new));
  document.querySelectorAll("[data-extend]").forEach(b=>b.onclick=()=>extendRide(b.dataset.extend));
  document.querySelectorAll("[data-end]").forEach(b=>b.onclick=()=>endRide(b.dataset.end));
}
function esc(s){return String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}

function newRide(carId){
  if(activeRide(carId))return;
  selectedCar=carId;
  $("#rideCarTitle").textContent=data.cars.find(c=>c.id===carId).name;
  $("#customerName").value="";
  $("#packageSelect").innerHTML=data.packages.map(p=>`<option value="${p.id}">${esc(p.name)} · ${p.minutes} min · ${money(p.price)}</option>`).join("");
  open("rideModal"); setTimeout(()=>$("#customerName").focus(),50);
}
$("#startRide").onclick=()=>{
  const car=data.cars.find(c=>c.id===selectedCar), p=pkg($("#packageSelect").value);
  const now=Date.now();
  data.rides.push({id:"r"+now,carId:car.id,carName:car.name,customer:$("#customerName").value.trim(),packageId:p.id,minutes:p.minutes,price:p.price,payment:$("#paymentSelect").value,startedAt:now,endsAt:now+p.minutes*60000,endedAt:null,date:new Date().toISOString().slice(0,10),alarmPlayed:false});
  save(); close("rideModal"); unlockAudio(); render(); toast("Ride started");
};
function extendRide(id){
  selectedRide=id;
  const r=data.rides.find(x=>x.id===id);
  $("#extendCarTitle").textContent=r.carName;
  $("#extendSelect").innerHTML=data.packages.map(p=>`<option value="${p.minutes}">${p.minutes} minutes</option>`).join("");
  open("extendModal");
}
$("#confirmExtend").onclick=()=>{
  const r=data.rides.find(x=>x.id===selectedRide), mins=Number($("#extendSelect").value);
  r.endsAt=Math.max(Date.now(),r.endsAt)+mins*60000;
  save(); close("extendModal"); render(); toast(`Added ${mins} minutes`);
};
function endRide(id){
  const r=data.rides.find(x=>x.id===id);
  if(!r)return;
  r.endedAt=Date.now(); save(); stopRinger(); render(); toast("Ride ended");
}

function renderAdmin(){
  // Fleet editor
  $("#carEditor").innerHTML=data.cars.map((c,i)=>{
    const busy=!!activeRide(c.id);
    return `<div class="car-edit-line">
      <input data-c-name="${i}" value="${esc(c.name)}" maxlength="30" placeholder="Car name">
      <button class="remove" data-car-remove="${i}" type="button" ${busy||data.cars.length<=1?"disabled":""}>×</button>
    </div>`;
  }).join("");

  // Pricing editor
  $("#packageEditor").innerHTML=data.packages.map((p,i)=>`
    <div class="package-line">
      <input data-p-name="${i}" value="${esc(p.name)}" maxlength="30" placeholder="Name">
      <input data-p-min="${i}" type="number" min="1" value="${p.minutes}" aria-label="Minutes">
      <input data-p-price="${i}" type="number" min="0" value="${p.price}" aria-label="Price">
      <button class="remove" data-remove="${i}" type="button" ${data.packages.length<=1?"disabled":""}>×</button>
    </div>`).join("");

  $("#alarmRepeat").value=String(data.settings.alarmRepeat||2);

  document.querySelectorAll("[data-remove]").forEach(b=>b.onclick=()=>{
    data.packages.splice(Number(b.dataset.remove),1);
    renderAdmin();
  });

  document.querySelectorAll("[data-car-remove]").forEach(b=>b.onclick=()=>{
    const i=Number(b.dataset.carRemove);
    if(data.cars.length<=1 || activeRide(data.cars[i].id)) return;
    data.cars.splice(i,1);
    save(); renderAdmin(); render();
  });
}
$("#adminBtn").onclick=()=>{renderAdmin();open("adminModal")};

$("#addCar").onclick=()=>{
  const next=data.cars.length+1;
  data.cars.push({id:"c"+Date.now(),name:`Car ${String(next).padStart(2,"0")}`});
  renderAdmin();
  toast("New car added — edit its name before saving");
};

$("#addPackage").onclick=()=>{
  data.packages.push({id:"p"+Date.now(),name:"New Package",minutes:5,price:200});
  renderAdmin();
};

$("#saveSettings").onclick=()=>{
  // Save car names
  data.cars.forEach((c,i)=>{
    const input=document.querySelector(`[data-c-name="${i}"]`);
    if(input) c.name=input.value.trim() || `Car ${String(i+1).padStart(2,"0")}`;
  });

  // Save pricing
  data.packages.forEach((p,i)=>{
    p.name=document.querySelector(`[data-p-name="${i}"]`).value.trim()||"Package";
    p.minutes=Math.max(1,Number(document.querySelector(`[data-p-min="${i}"]`).value)||1);
    p.price=Math.max(0,Number(document.querySelector(`[data-p-price="${i}"]`).value)||0);
  });

  data.settings.alarmRepeat=Number($("#alarmRepeat").value);
  save(); close("adminModal"); render(); toast("All settings saved");
};

const ringer=$("#ringer");
let audioUnlocked=false;
function unlockAudio(){ringer.load(); ringer.volume=1; audioUnlocked=true}
async function playRinger(){
  try{
    ringer.pause(); ringer.currentTime=0; ringer.volume=1;
    await ringer.play();
  }catch(e){toast("Tap Test Ringer once to enable sound");}
}
function stopRinger(){ringer.pause();ringer.currentTime=0}
async function alarm(){
  if(!audioUnlocked) unlockAudio();
  for(let i=0;i<(data.settings.alarmRepeat||2);i++){
    await playRinger();
    await new Promise(res=>setTimeout(res,10000));
  }
}
$("#soundTest").onclick=async()=>{unlockAudio();await playRinger();toast("Ringer playing — raise phone media volume if needed")};
$("#adminSoundTest").onclick=async()=>{unlockAudio();await playRinger()};

function checkTimers(){
  const now=Date.now();
  data.rides.forEach(r=>{
    if(!r.endedAt && !r.alarmPlayed && now>=r.endsAt){
      r.alarmPlayed=true; save(); alarm();
      if(navigator.vibrate) navigator.vibrate([500,150,500,150,700,250,500]);
    }
  });
  render();
}
setInterval(checkTimers,1000);
render();
if("serviceWorker" in navigator && (location.protocol==="https:"||location.hostname==="localhost")) navigator.serviceWorker.register("sw.js");
