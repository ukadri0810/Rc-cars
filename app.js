const DB_NAME = "kas-rc-arena-local";
const DB_STORE = "app";
const STATE_KEY = "state-v3";
const LEGACY_KEY = "rc-rental-v2";
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const money = n => "₹" + Number(n || 0).toLocaleString("en-IN");
const svg = id => `<svg aria-hidden="true"><use href="#${id}"/></svg>`;
const uid = prefix => `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,7)}`;
const esc = s => String(s ?? "").replace(/[&<>"']/g, m => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
const localDateKey = d => {
  const x = d ? new Date(d) : new Date();
  return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,"0")}-${String(x.getDate()).padStart(2,"0")}`;
};
const fmt = ms => { ms = Math.max(0, ms); const s = Math.floor(ms/1000), m = Math.floor(s/60), r = s%60; return `${String(m).padStart(2,"0")}:${String(r).padStart(2,"0")}`; };
const minutesBetween = (a,b) => Math.max(0, Math.round((b-a)/60000));

const DEFAULT = {
  version:3,
  business:{name:"KAS RC Arena"},
  vehicleTypes:[
    {id:"type_car",name:"RC Car",active:true},
    {id:"type_truck",name:"RC Truck",active:true},
    {id:"type_excavator",name:"RC Excavator",active:true},
    {id:"type_boat",name:"RC Boat",active:true}
  ],
  pricingProfiles:[{id:"price_standard",name:"RC Standard"}],
  packages:[
    {id:"pkg_5",profileId:"price_standard",name:"Quick Ride",minutes:5,price:200,active:true},
    {id:"pkg_10",profileId:"price_standard",name:"Standard",minutes:10,price:350,active:true},
    {id:"pkg_15",profileId:"price_standard",name:"Long Ride",minutes:15,price:500,active:true}
  ],
  extensionProfiles:[{id:"ext_standard",name:"Standard Extensions"}],
  extensions:[
    {id:"ext_2",profileId:"ext_standard",name:"Quick Extend",minutes:2,price:80,active:true},
    {id:"ext_3",profileId:"ext_standard",name:"Extra Time",minutes:3,price:100,active:true},
    {id:"ext_5",profileId:"ext_standard",name:"Long Extend",minutes:5,price:150,active:true}
  ],
  batteryTypes:[{id:"bt_2s",name:"2S LiPo",voltage:"7.4V",capacity:"5200mAh",connector:"XT60",compatibleTypeIds:["type_car","type_truck","type_excavator"]}],
  batteries:[
    {id:"bat_01",code:"B01",typeId:"bt_2s",status:"installed",assignedVehicleId:"veh_01",cycles:0,totalRuntimeMin:0,notes:""},
    {id:"bat_02",code:"B02",typeId:"bt_2s",status:"installed",assignedVehicleId:"veh_02",cycles:0,totalRuntimeMin:0,notes:""},
    {id:"bat_03",code:"B03",typeId:"bt_2s",status:"ready",assignedVehicleId:null,cycles:0,totalRuntimeMin:0,notes:""},
    {id:"bat_04",code:"B04",typeId:"bt_2s",status:"ready",assignedVehicleId:null,cycles:0,totalRuntimeMin:0,notes:""},
    {id:"bat_05",code:"B05",typeId:"bt_2s",status:"ready",assignedVehicleId:null,cycles:0,totalRuntimeMin:0,notes:""},
    {id:"bat_06",code:"B06",typeId:"bt_2s",status:"ready",assignedVehicleId:null,cycles:0,totalRuntimeMin:0,notes:""},
    {id:"bat_07",code:"B07",typeId:"bt_2s",status:"ready",assignedVehicleId:null,cycles:0,totalRuntimeMin:0,notes:""}
  ],
  vehicles:[
    {id:"veh_01",code:"CAR-01",name:"Car 01",typeId:"type_car",pricingProfileId:"price_standard",extensionProfileId:"ext_standard",batteryTypeId:"bt_2s",currentBatteryId:"bat_01",manualStatus:"available",active:true},
    {id:"veh_02",code:"CAR-02",name:"Car 02",typeId:"type_car",pricingProfileId:"price_standard",extensionProfileId:"ext_standard",batteryTypeId:"bt_2s",currentBatteryId:"bat_02",manualStatus:"available",active:true}
  ],
  rides:[],queue:[],maintenance:[],
  staff:[
    {id:"op_01",name:"Operator 1",pin:"1111",active:true,permissions:{arena:true,queue:true,rides:true,batteries:true,batteryActions:true,maintenance:true,viewRevenue:true}}
  ],
  settings:{alarmRepeat:2,warningSeconds:60,ownerPin:"1234",paymentMethods:["Cash","UPI","Other"],nextRideNumber:1}
};

let data = structuredClone(DEFAULT);
let memory = {selectedVehicle:null, selectedPackage:null, payment:"Cash", selectedRide:null, selectedExtension:null, extensionPayment:"Cash", endReason:"Customer finished", selectedQueue:null, selectedMaintenanceReason:"Vehicle issue", ownerUnlocked:false, ownerTab:"overview", rideRange:"today",loginRole:"operator",selectedOperator:null,currentUser:null,currentView:"arena"};
const PERMISSIONS={
  queue:{label:"Queue",desc:"View, add, start and remove waiting customers"},
  rides:{label:"Ride History",desc:"View and search ride transactions"},
  batteries:{label:"Battery Station",desc:"View battery status and availability"},
  batteryActions:{label:"Battery Controls",desc:"Swap batteries, start charging and change status"},
  maintenance:{label:"Maintenance",desc:"Report vehicle issues and mark vehicles repaired"},
  viewRevenue:{label:"Revenue",desc:"See today's revenue on the operator dashboard"}
};
function currentStaff(){return memory.currentUser?.role==="operator"?data.staff.find(s=>s.id===memory.currentUser.id):null}
function can(key){if(memory.currentUser?.role==="owner")return true;if(key==="arena")return !!memory.currentUser;return !!currentStaff()?.permissions?.[key]}
function requirePerm(key){if(can(key))return true;toast("Access not enabled for this operator");return false}
function actor(){return memory.currentUser?{role:memory.currentUser.role,id:memory.currentUser.id||"owner",name:memory.currentUser.name||"Owner"}:{role:"unknown",id:"",name:""}}

let dbPromise;
function openDb(){
  if(dbPromise) return dbPromise;
  dbPromise = new Promise((resolve,reject)=>{
    const req=indexedDB.open(DB_NAME,1);
    req.onupgradeneeded=()=>{const db=req.result;if(!db.objectStoreNames.contains(DB_STORE))db.createObjectStore(DB_STORE)};
    req.onsuccess=()=>resolve(req.result); req.onerror=()=>reject(req.error);
  });
  return dbPromise;
}
async function dbGet(){try{const db=await openDb();return await new Promise((res,rej)=>{const tx=db.transaction(DB_STORE,"readonly"),r=tx.objectStore(DB_STORE).get(STATE_KEY);r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})}catch{return null}}
async function dbSet(value){try{const db=await openDb();await new Promise((res,rej)=>{const tx=db.transaction(DB_STORE,"readwrite");tx.objectStore(DB_STORE).put(value,STATE_KEY);tx.oncomplete=res;tx.onerror=()=>rej(tx.error)})}catch(e){localStorage.setItem("kas-rc-fallback",JSON.stringify(value))}}
function mergeDefaults(x){
  if(!x || typeof x!=="object") return structuredClone(DEFAULT);
  const merged={...structuredClone(DEFAULT),...x};
  merged.business={...DEFAULT.business,...(x.business||{})};
  merged.settings={...DEFAULT.settings,...(x.settings||{})};
  ["vehicleTypes","pricingProfiles","packages","extensionProfiles","extensions","batteryTypes","batteries","vehicles","rides","queue","maintenance","staff"].forEach(k=>{if(!Array.isArray(merged[k]))merged[k]=structuredClone(DEFAULT[k])});
  const basePerm={arena:true,queue:true,rides:true,batteries:true,batteryActions:true,maintenance:true,viewRevenue:true};
  merged.staff=(merged.staff||[]).map(s=>({...s,permissions:{...basePerm,...(s.permissions||{})}}));
  if(!merged.staff.length) merged.staff=structuredClone(DEFAULT.staff);
  return merged;
}
function migrateLegacy(old){
  if(!old?.cars) return null;
  const n=structuredClone(DEFAULT); n.rides=[]; n.vehicles=[]; n.batteries=[];const carIdMap={};
  old.cars.forEach((c,i)=>{const vid=`veh_${String(i+1).padStart(2,"0")}`,bid=`bat_${String(i+1).padStart(2,"0")}`;carIdMap[c.id||`c${i+1}`]=vid;n.vehicles.push({id:vid,code:`CAR-${String(i+1).padStart(2,"0")}`,name:c.name||`Car ${i+1}`,typeId:"type_car",pricingProfileId:"price_standard",extensionProfileId:"ext_standard",batteryTypeId:"bt_2s",currentBatteryId:bid,manualStatus:"available",active:true});n.batteries.push({id:bid,code:`B${String(i+1).padStart(2,"0")}`,typeId:"bt_2s",status:"installed",assignedVehicleId:vid,cycles:0,totalRuntimeMin:0,notes:""})});
  while(n.batteries.length<7){const i=n.batteries.length+1;n.batteries.push({id:`bat_${String(i).padStart(2,"0")}`,code:`B${String(i).padStart(2,"0")}`,typeId:"bt_2s",status:"ready",assignedVehicleId:null,cycles:0,totalRuntimeMin:0,notes:""})}
  if(Array.isArray(old.packages)&&old.packages.length) n.packages=old.packages.map(p=>({...p,profileId:"price_standard",active:true}));
  if(Array.isArray(old.rides)) n.rides=old.rides.map((r,idx)=>({id:r.id||uid("ride"),rideNumber:`KAS-R-${String(idx+1).padStart(6,"0")}`,vehicleId:carIdMap[r.carId]||r.carId,vehicleName:r.carName,customer:r.customer||"",mobile:"",packageId:r.packageId,baseMinutes:r.minutes||0,baseAmount:r.price||0,extensions:[],discount:0,totalAmount:r.price||0,payments:[{method:r.payment||"Cash",amount:r.price||0,at:r.startedAt}],startedAt:r.startedAt,endsAt:r.endsAt,endedAt:r.endedAt,date:r.date||localDateKey(r.startedAt),pausedAt:null,totalPausedMs:0,endReason:r.endedAt?"Migrated ride":null,alarmAcknowledged:!!r.alarmPlayed,batteryId:null}));
  n.settings.alarmRepeat=old.settings?.alarmRepeat||2;n.settings.nextRideNumber=n.rides.length+1;return n;
}
async function initState(){
  const stored=await dbGet(); if(stored){data=mergeDefaults(stored);return}
  try{const fallback=JSON.parse(localStorage.getItem("kas-rc-fallback")||"null");if(fallback){data=mergeDefaults(fallback);await dbSet(data);return}}catch{}
  try{const old=JSON.parse(localStorage.getItem(LEGACY_KEY)||"null");const migrated=migrateLegacy(old);if(migrated){data=migrated;await dbSet(data);return}}catch{}
  data=structuredClone(DEFAULT);await dbSet(data);
}
function save(){dbSet(data);}
function toast(t){const e=$("#toast");e.textContent=t;e.classList.add("show");clearTimeout(toast.t);toast.t=setTimeout(()=>e.classList.remove("show"),1900)}
function open(id){$("#"+id).classList.remove("hidden")}
function close(id){$("#"+id).classList.add("hidden")}
function vehicle(id){return data.vehicles.find(v=>v.id===id)}
function vehicleType(id){return data.vehicleTypes.find(x=>x.id===id)}
function battery(id){return data.batteries.find(x=>x.id===id)}
function batteryType(id){return data.batteryTypes.find(x=>x.id===id)}
function packageBy(id){return data.packages.find(x=>x.id===id)}
function extensionBy(id){return data.extensions.find(x=>x.id===id)}
function activeRide(vehicleId){return data.rides.find(r=>r.vehicleId===vehicleId&&!r.endedAt)}
function rideTotal(r){return Number(r.baseAmount||0)+Number((r.extensions||[]).reduce((a,e)=>a+Number(e.amount||0),0))-Number(r.discount||0)}
function remainingMs(r,now=Date.now()){const ref=r.pausedAt||now;return Math.max(0,r.endsAt-ref)}
function rideStatus(r){if(r.endedAt)return"completed";if(r.pausedAt)return"paused";const rem=r.endsAt-Date.now();if(rem<=0)return"over";if(rem<=Number(data.settings.warningSeconds||60)*1000)return"ending";return"running"}
function vehicleState(v){
  const r=activeRide(v.id); if(r)return rideStatus(r);
  if(v.manualStatus==="maintenance")return"maintenance";
  if(!v.currentBatteryId)return"no-battery";
  const b=battery(v.currentBatteryId); if(!b || !["installed","ready"].includes(b.status))return"no-battery";
  return"available";
}
function nextRideNumber(){const n=Number(data.settings.nextRideNumber||1);data.settings.nextRideNumber=n+1;return `KAS-R-${String(n).padStart(6,"0")}`}
function todayRides(){return data.rides.filter(r=>r.date===localDateKey())}
function paymentsTotal(r,method){return (r.payments||[]).filter(p=>!method||p.method===method).reduce((a,p)=>a+Number(p.amount||0),0)}
function totalRevenue(rides){return rides.reduce((a,r)=>a+rideTotal(r),0)}

function render(){
  applyAccessUI();
  $("#businessTitle").textContent=data.business.name||"KAS RC Arena";
  const active=data.vehicles.filter(v=>activeRide(v.id)).length, ready=data.vehicles.filter(v=>vehicleState(v)==="available").length, rides=todayRides();
  $("#activeCount").textContent=active;$("#readyCount").textContent=ready;$("#todayRevenue").textContent=money(totalRevenue(rides));$("#rideCountText").textContent=`${rides.length} ride${rides.length===1?"":"s"}`;
  renderFleet();renderRecentRides();renderQueue();renderRideHistory();renderBatteries();updateQueueBadge();
}
function renderFleet(){
  $("#fleet").innerHTML=data.vehicles.filter(v=>v.active!==false).map(v=>{
    const r=activeRide(v.id), state=vehicleState(v), type=vehicleType(v.typeId)?.name||"Vehicle", b=battery(v.currentBatteryId);
    if(!r){
      const status=state==="maintenance"?"Maintenance":state==="no-battery"?"Battery Required":"Available";
      return `<article class="car-card ${state}"><div class="car-top"><div><div class="car-name">${esc(v.name)}</div><div class="vehicle-sub">${esc(v.code)} · ${esc(type)}</div></div><div class="status">${status}</div></div><div class="battery-line">${svg("i-battery")}<span>${b?`${esc(b.code)} · ${esc(b.status.replaceAll("_"," "))}`:"No battery assigned"}</span></div><div class="ready-row"><span class="ready-note">${state==="available"?"Ready for next customer":state==="maintenance"?"Unavailable — maintenance":"Battery not ready"}</span>${state==="available"?`<button class="new" data-new="${v.id}">NEW RIDE</button>`:""}</div>${(can("batteryActions")||can("maintenance"))?`<div class="actions">${can("batteryActions")?`<button class="battery-action" data-swap="${v.id}">${svg("i-battery")} BATTERY</button>`:""}${can("maintenance")?(state==="maintenance"?`<button class="issue" data-repair="${v.id}">${svg("i-wrench")} REPAIRED</button>`:`<button class="issue" data-issue="${v.id}">${svg("i-wrench")} ISSUE</button>`):""}</div>`:""}</article>`;
    }
    const stateCls=rideStatus(r), status=stateCls==="over"?"Time Up":stateCls==="ending"?"Ending Soon":stateCls==="paused"?"Paused":"Running";
    const pkg=packageBy(r.packageId); const bNow=battery(v.currentBatteryId);
    return `<article class="car-card ${stateCls}"><div class="car-top"><div><div class="car-name">${esc(v.name)}</div><div class="vehicle-sub">${esc(v.code)} · ${esc(type)}</div></div><div class="status">${status}</div></div><div class="car-mid"><div><div class="customer">${esc(r.customer||"Walk-in customer")} · ${r.baseMinutes} min · ${money(rideTotal(r))}</div><div class="meta">${esc(pkg?.name||"Ride")} · ${esc((r.payments||[]).map(p=>p.method).join(" + "))}</div></div><div class="timer">${fmt(remainingMs(r))}</div></div><div class="battery-line">${svg("i-battery")}<span>${bNow?`${esc(bNow.code)} · ${esc(bNow.status.replaceAll("_"," "))}`:"No battery"}</span></div><div class="actions">${stateCls==="over"?`<button class="ack" data-ack="${r.id}">${svg("i-alert")} ACK</button>`:""}<button class="extend" data-extend="${r.id}">${svg("i-plus")} EXTEND</button>${stateCls==="paused"?`<button class="pause" data-resume="${r.id}">${svg("i-play")} RESUME</button>`:`<button class="pause" data-pause="${r.id}">${svg("i-pause")} PAUSE</button>`}${can("batteryActions")?`<button class="battery-action" data-swap="${v.id}">${svg("i-battery")} BATTERY</button>`:""}<button class="end" data-end="${r.id}">${svg("i-stop")} COMPLETE</button></div></article>`;
  }).join("")||`<div class="notice">No active vehicles configured.</div>`;
  $$('[data-new]').forEach(b=>b.onclick=()=>newRide(b.dataset.new));
  $$('[data-extend]').forEach(b=>b.onclick=()=>openExtend(b.dataset.extend));
  $$('[data-end]').forEach(b=>b.onclick=()=>openEnd(b.dataset.end));
  $$('[data-pause]').forEach(b=>b.onclick=()=>pauseRide(b.dataset.pause));
  $$('[data-resume]').forEach(b=>b.onclick=()=>resumeRide(b.dataset.resume));
  $$('[data-ack]').forEach(b=>b.onclick=()=>ackRide(b.dataset.ack));
  $$('[data-swap]').forEach(b=>b.onclick=()=>openBatterySwap(b.dataset.swap));
  $$('[data-issue]').forEach(b=>b.onclick=()=>openMaintenance(b.dataset.issue));
  $$('[data-repair]').forEach(b=>b.onclick=()=>markRepaired(b.dataset.repair));
}
function renderRecentRides(){const rides=todayRides().slice().reverse().slice(0,8);$("#recentRideList").innerHTML=rides.map(rideRow).join("")||`<div class="ride-row"><span>No rides yet today.</span></div>`}
function rideRow(r){const status=r.endedAt?"Completed":rideStatus(r)==="paused"?"Paused":"Active";return `<div class="ride-row"><div><strong>${esc(r.customer||"Walk-in customer")}</strong><span>${esc(r.vehicleName)} · ${status}</span><span class="ride-id">${esc(r.rideNumber||r.id)}</span></div><span>${new Date(r.startedAt).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})}</span><span class="amount">${money(rideTotal(r))}</span></div>`}
function renderQueue(){
  if(!$("#queueList")) return;
  const free=data.vehicles.filter(v=>vehicleState(v)==="available");
  $("#queueList").innerHTML=data.queue.map((q,i)=>`<div class="queue-row"><div><strong>${i+1}. ${esc(q.name)}</strong><span>${q.mobile?esc(q.mobile):"Waiting"}</span></div><span>${Math.max(1,Math.round((Date.now()-q.addedAt)/60000))}m</span><div class="queue-actions">${free.length?`<button class="start" data-queue-start="${q.id}">Start</button>`:""}<button data-queue-remove="${q.id}">Remove</button></div></div>`).join("")||`<div class="notice">Queue is empty.</div>`;
  $$('[data-queue-start]').forEach(b=>b.onclick=()=>openQueueStart(b.dataset.queueStart));$$('[data-queue-remove]').forEach(b=>b.onclick=()=>removeQueue(b.dataset.queueRemove));
}
function renderRideHistory(){
  if(!$("#rideHistory")) return;
  const q=$("#rideSearch")?.value.trim().toLowerCase()||"";let rides=data.rides.slice().reverse();if(memory.rideRange==="today")rides=rides.filter(r=>r.date===localDateKey());if(q)rides=rides.filter(r=>[r.customer,r.mobile,r.rideNumber,r.vehicleName].some(v=>String(v||"").toLowerCase().includes(q)));$("#rideHistory").innerHTML=rides.map(rideRow).join("")||`<div class="notice">No rides match this view.</div>`;
}
function renderBatteries(){
  if(!$("#batterySummary")||!$("#batteryStation")) return;
  const counts={ready:0,installed:0,in_use:0,charging:0,needs_charge:0,maintenance:0};data.batteries.forEach(b=>counts[b.status]=(counts[b.status]||0)+1);
  $("#batterySummary").innerHTML=[['ready','Ready'],['in_use','In Use'],['charging','Charging'],['needs_charge','Needs Charge']].map(([k,l])=>`<div><strong>${counts[k]||0}</strong><span>${l}</span></div>`).join("");
  $("#batteryStation").innerHTML=(!can("batteryActions")?`<div class="notice read-only-banner">Battery controls are read-only for this operator.</div>`:"")+data.batteries.map(b=>{const t=batteryType(b.typeId),v=vehicle(b.assignedVehicleId);const actions=!can("batteryActions")?"":b.status==="needs_charge"?`<button class="primary-mini" data-batt-action="charge" data-batt="${b.id}">Start Charging</button>`:b.status==="charging"?`<button class="primary-mini" data-batt-action="ready" data-batt="${b.id}">Mark Ready</button>`:b.status==="maintenance"?`<button class="primary-mini" data-batt-action="ready" data-batt="${b.id}">Return to Ready</button>`:b.status==="ready"?`<button data-batt-action="issue" data-batt="${b.id}">Report Issue</button>`:"";return `<article class="battery-card"><div class="battery-card-top"><div><h3>${esc(b.code)}</h3><p>${esc(t?.name||"Battery")} · ${esc(t?.voltage||"")} ${esc(t?.capacity||"")}</p></div><span class="battery-status">${esc(b.status.replaceAll("_"," "))}</span></div><p>${v?`Assigned: ${esc(v.name)}`:`Cycles: ${b.cycles||0} · Runtime: ${b.totalRuntimeMin||0} min`}</p><div class="actions">${actions}</div></article>`}).join("");
  $$('[data-batt-action]').forEach(b=>b.onclick=()=>batteryAction(b.dataset.batt,b.dataset.battAction));
}
function updateQueueBadge(){const n=data.queue.length,e=$("#queueBadge");if(!e)return;e.textContent=n;e.classList.toggle("hidden",!n)}

function newRide(vehicleId,prefill,queueId=null){
  const v=vehicle(vehicleId);if(!v||vehicleState(v)!=="available")return toast("Vehicle is not ready");memory.selectedVehicle=vehicleId;memory.selectedQueue=queueId;memory.selectedPackage=null;memory.payment=data.settings.paymentMethods[0]||"Cash";$("#rideVehicleTitle").textContent=v.name;$("#customerName").value=prefill?.name||"";$("#customerMobile").value=prefill?.mobile||"";renderRideChoices();open("rideModal");setTimeout(()=>$("#customerName").focus(),60);
}
function renderRideChoices(){
  const v=vehicle(memory.selectedVehicle), list=data.packages.filter(p=>p.active!==false&&p.profileId===v.pricingProfileId);if(!memory.selectedPackage&&list[0])memory.selectedPackage=list[0].id;
  $("#packageButtons").innerHTML=list.map(p=>`<button class="choice-card ${memory.selectedPackage===p.id?"active":""}" data-package="${p.id}"><strong>${esc(p.name)}</strong><span>${p.minutes} min · ${money(p.price)}</span></button>`).join("")||`<div class="notice">No packages assigned to this pricing profile.</div>`;
  $("#paymentButtons").innerHTML=data.settings.paymentMethods.map(m=>`<button class="${memory.payment===m?"active":""}" data-payment="${esc(m)}">${esc(m)}</button>`).join("");
  const p=packageBy(memory.selectedPackage);$("#rideTotal").textContent=money(p?.price||0);$$('[data-package]').forEach(b=>b.onclick=()=>{memory.selectedPackage=b.dataset.package;renderRideChoices()});$$('[data-payment]').forEach(b=>b.onclick=()=>{memory.payment=b.dataset.payment;renderRideChoices()});
}
$("#startRide").onclick=()=>{
  const v=vehicle(memory.selectedVehicle),p=packageBy(memory.selectedPackage);if(!v||!p)return toast("Choose a package");const now=Date.now(),b=battery(v.currentBatteryId);if(!b)return toast("Assign a battery first");b.status="in_use";b.assignedVehicleId=v.id;
  const ride={id:uid("ride"),rideNumber:nextRideNumber(),vehicleId:v.id,vehicleName:v.name,customer:$("#customerName").value.trim(),mobile:$("#customerMobile").value.trim(),packageId:p.id,baseMinutes:p.minutes,baseAmount:p.price,extensions:[],discount:0,totalAmount:p.price,payments:[{method:memory.payment,amount:p.price,at:now}],startedAt:now,endsAt:now+p.minutes*60000,endedAt:null,date:localDateKey(now),pausedAt:null,totalPausedMs:0,endReason:null,alarmAcknowledged:false,batteryId:b.id,batteryHistory:[{batteryId:b.id,installedAt:now,removedAt:null}],createdBy:actor()};data.rides.push(ride);
  if(memory.selectedQueue){data.queue=data.queue.filter(q=>q.id!==memory.selectedQueue);memory.selectedQueue=null}
  save();close("rideModal");unlockAudio();render();toast("Ride started");
};
function openExtend(id){const r=data.rides.find(x=>x.id===id);if(!r)return;memory.selectedRide=id;memory.selectedExtension=null;memory.extensionPayment=data.settings.paymentMethods[0]||"Cash";$("#extendVehicleTitle").textContent=r.vehicleName;renderExtensionChoices();open("extendModal")}
function renderExtensionChoices(){const r=data.rides.find(x=>x.id===memory.selectedRide),v=vehicle(r?.vehicleId);const list=data.extensions.filter(e=>e.active!==false&&e.profileId===v?.extensionProfileId);if(!memory.selectedExtension&&list[0])memory.selectedExtension=list[0].id;$("#extensionButtons").innerHTML=list.map(e=>`<button class="choice-card ${memory.selectedExtension===e.id?"active":""}" data-extension="${e.id}"><strong>+${e.minutes} min</strong><span>${esc(e.name)} · ${money(e.price)}</span></button>`).join("")||`<div class="notice">No extension options configured.</div>`;$("#extensionPaymentButtons").innerHTML=data.settings.paymentMethods.map(m=>`<button class="${memory.extensionPayment===m?"active":""}" data-ext-payment="${esc(m)}">${esc(m)}</button>`).join("");const e=extensionBy(memory.selectedExtension);$("#extensionTotal").textContent=money(e?.price||0);$$('[data-extension]').forEach(b=>b.onclick=()=>{memory.selectedExtension=b.dataset.extension;renderExtensionChoices()});$$('[data-ext-payment]').forEach(b=>b.onclick=()=>{memory.extensionPayment=b.dataset.extPayment;renderExtensionChoices()})}
$("#confirmExtend").onclick=()=>{const r=data.rides.find(x=>x.id===memory.selectedRide),e=extensionBy(memory.selectedExtension);if(!r||!e)return toast("Choose an extension");const now=Date.now();r.endsAt=Math.max(r.pausedAt||now,r.endsAt)+e.minutes*60000;r.extensions.push({id:uid("rext"),extensionId:e.id,minutes:e.minutes,amount:e.price,addedAt:now,paymentMethod:memory.extensionPayment,addedBy:actor()});r.payments.push({method:memory.extensionPayment,amount:e.price,at:now});r.totalAmount=rideTotal(r);r.alarmAcknowledged=false;save();close("extendModal");stopAlertIfClear();render();toast(`Added ${e.minutes} minutes`)};
function openEnd(id){const r=data.rides.find(x=>x.id===id);if(!r)return;const isNew=memory.selectedRide!==id;memory.selectedRide=id;const rem=remainingMs(r);const reasons=rem>0?["Customer finished","Vehicle issue","Battery issue","Track issue","Other"]:["Time completed","Vehicle issue","Battery issue","Other"];if(isNew||!reasons.includes(memory.endReason))memory.endReason=reasons[0];$("#endVehicleTitle").textContent=r.vehicleName;$("#endRemaining").textContent=rem>0?`${fmt(rem)} still remaining. Select a reason before completing the ride.`:"Timer has finished. Complete the ride to make the vehicle available.";const paint=()=>{$("#endReasonButtons").innerHTML=reasons.map(x=>`<button class="choice-card ${memory.endReason===x?"active":""}" data-end-reason="${esc(x)}"><strong>${esc(x)}</strong></button>`).join("");$$('[data-end-reason]').forEach(b=>b.onclick=()=>{memory.endReason=b.dataset.endReason;paint()})};paint();open("endModal")}
$("#confirmEnd").onclick=()=>{const r=data.rides.find(x=>x.id===memory.selectedRide);if(!r)return;const now=Date.now();if(r.pausedAt){r.totalPausedMs+=(now-r.pausedAt);r.pausedAt=null}r.endedAt=now;r.endReason=memory.endReason;r.alarmAcknowledged=true;const v=vehicle(r.vehicleId),b=battery(v?.currentBatteryId);if(b){b.status="installed";const currentSeg=[...(r.batteryHistory||[])].reverse().find(x=>!x.removedAt&&x.batteryId===b.id);const segStart=currentSeg?.installedAt||r.startedAt;if(currentSeg)currentSeg.removedAt=now;b.totalRuntimeMin=(b.totalRuntimeMin||0)+minutesBetween(segStart,now);b.cycles=(b.cycles||0)+1}save();close("endModal");stopAlertIfClear();render();toast("Ride completed")};
function pauseRide(id){const r=data.rides.find(x=>x.id===id);if(!r||r.pausedAt)return;r.pausedAt=Date.now();save();render();toast("Ride paused")}
function resumeRide(id){const r=data.rides.find(x=>x.id===id);if(!r||!r.pausedAt)return;const now=Date.now(),paused=now-r.pausedAt;r.endsAt+=paused;r.totalPausedMs=(r.totalPausedMs||0)+paused;r.pausedAt=null;save();render();toast("Ride resumed")}
function ackRide(id){const r=data.rides.find(x=>x.id===id);if(!r)return;r.alarmAcknowledged=true;save();stopAlertIfClear();render();toast("Alarm acknowledged")}

function openBatterySwap(vehicleId){if(!requirePerm("batteryActions"))return;const v=vehicle(vehicleId);if(!v)return;memory.selectedVehicle=vehicleId;const r=activeRide(v.id);$("#swapVehicleTitle").textContent=v.name;const current=battery(v.currentBatteryId);$("#swapInfo").textContent=current?`Current battery: ${current.code}. ${r&&!r.pausedAt?"Choosing a replacement will pause the ride so the battery change does not use customer time.":"Choose a replacement battery."}`:"No battery currently assigned.";const bt=v.batteryTypeId;const list=data.batteries.filter(b=>b.status==="ready"&&b.typeId===bt);$("#swapBatteryButtons").innerHTML=list.map(b=>`<button class="choice-card" data-swap-battery="${b.id}"><strong>${esc(b.code)}</strong><span>${esc(batteryType(b.typeId)?.name||"Battery")}</span></button>`).join("")||`<div class="notice">No compatible ready batteries. Check Battery Station.</div>`;$$('[data-swap-battery]').forEach(b=>b.onclick=()=>performBatterySwap(vehicleId,b.dataset.swapBattery));open("batterySwapModal")}
function performBatterySwap(vehicleId,newId){const v=vehicle(vehicleId),old=battery(v.currentBatteryId),fresh=battery(newId),r=activeRide(vehicleId),now=Date.now();if(!v||!fresh)return;if(r&&!r.pausedAt)r.pausedAt=now;if(old){old.status="needs_charge";old.assignedVehicleId=null;if(r?.batteryHistory?.length){const current=r.batteryHistory.findLast?.(x=>!x.removedAt)||[...r.batteryHistory].reverse().find(x=>!x.removedAt);if(current){current.removedAt=now;old.totalRuntimeMin=(old.totalRuntimeMin||0)+minutesBetween(current.installedAt,now);old.cycles=(old.cycles||0)+1}}}fresh.status=r?"in_use":"installed";fresh.assignedVehicleId=v.id;v.currentBatteryId=fresh.id;if(r){r.batteryId=fresh.id;r.batteryHistory=r.batteryHistory||[];r.batteryHistory.push({batteryId:fresh.id,installedAt:now,removedAt:null})}save();close("batterySwapModal");render();toast(`${fresh.code} assigned. Old battery needs charging.`)}
function batteryAction(id,action){if(!requirePerm("batteryActions"))return;const b=battery(id);if(!b)return;if(action==="charge"){b.status="charging";b.chargeStartedAt=Date.now()}if(action==="ready"){b.status="ready";b.chargeStartedAt=null;b.assignedVehicleId=null}if(action==="issue"){b.status="maintenance";b.assignedVehicleId=null}save();render();toast("Battery status updated")}

function openMaintenance(vehicleId){if(!requirePerm("maintenance"))return;memory.selectedVehicle=vehicleId;memory.selectedMaintenanceReason="Vehicle issue";$("#maintenanceVehicleTitle").textContent=vehicle(vehicleId)?.name||"Vehicle";$("#maintenanceNote").value="";renderMaintenanceReasons();open("maintenanceModal")}
function renderMaintenanceReasons(){const reasons=["Vehicle issue","Steering / servo","Motor / drive","Wheel / track","Body damage","Other"];$("#maintenanceReasonButtons").innerHTML=reasons.map(x=>`<button class="choice-card ${memory.selectedMaintenanceReason===x?"active":""}" data-maint-reason="${esc(x)}"><strong>${esc(x)}</strong></button>`).join("");$$('[data-maint-reason]').forEach(b=>b.onclick=()=>{memory.selectedMaintenanceReason=b.dataset.maintReason;renderMaintenanceReasons()})}
$("#confirmMaintenance").onclick=()=>{const v=vehicle(memory.selectedVehicle);if(!v)return;if(activeRide(v.id))return toast("Complete the active ride first");v.manualStatus="maintenance";data.maintenance.push({id:uid("mnt"),vehicleId:v.id,vehicleName:v.name,reason:memory.selectedMaintenanceReason,note:$("#maintenanceNote").value.trim(),reportedAt:Date.now(),resolvedAt:null});save();close("maintenanceModal");render();toast("Vehicle marked for maintenance")};
function markRepaired(id){if(!requirePerm("maintenance"))return;const v=vehicle(id);if(!v)return;v.manualStatus="available";const openIssue=[...data.maintenance].reverse().find(m=>m.vehicleId===id&&!m.resolvedAt);if(openIssue)openIssue.resolvedAt=Date.now();save();render();toast("Vehicle returned to service")}

function openQueueModal(){if(!requirePerm("queue"))return;$("#queueName").value="";$("#queueMobile").value="";open("queueModal");setTimeout(()=>$("#queueName").focus(),50)}
if($("#addQueue")) $("#addQueue").onclick=openQueueModal;if($("#addQueueQuick")) $("#addQueueQuick").onclick=openQueueModal;
$("#saveQueue").onclick=()=>{const name=$("#queueName").value.trim();if(!name)return toast("Enter customer name");data.queue.push({id:uid("q"),name,mobile:$("#queueMobile").value.trim(),addedAt:Date.now()});save();close("queueModal");render();toast("Added to queue")};
function removeQueue(id){if(!requirePerm("queue"))return;data.queue=data.queue.filter(q=>q.id!==id);save();render();toast("Removed from queue")}
function openQueueStart(id){if(!requirePerm("queue"))return;const q=data.queue.find(x=>x.id===id);if(!q)return;memory.selectedQueue=id;$("#queueCustomerTitle").textContent=q.name;const free=data.vehicles.filter(v=>vehicleState(v)==="available");$("#queueVehicleButtons").innerHTML=free.map(v=>`<button class="choice-card" data-queue-vehicle="${v.id}"><strong>${esc(v.name)}</strong><span>${esc(v.code)} · ${esc(vehicleType(v.typeId)?.name||"Vehicle")}</span></button>`).join("")||`<div class="notice">No vehicle is currently available.</div>`;$$('[data-queue-vehicle]').forEach(b=>b.onclick=()=>{close("queueStartModal");newRide(b.dataset.queueVehicle,q,id)});open("queueStartModal")}

function switchView(name){if(!can(name))return toast("Access not enabled for this operator");memory.currentView=name;$$('.view').forEach(v=>v.classList.toggle('active',v.id===`view-${name}`));$$('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===name));if(name==="rides")renderRideHistory();if(name==="batteries")renderBatteries();window.scrollTo({top:0,behavior:"smooth"})}
$$('[data-view]').forEach(b=>b.onclick=()=>switchView(b.dataset.view));
if($("#rideSearch")) $("#rideSearch").addEventListener("input",renderRideHistory);$$('[data-range]').forEach(b=>b.onclick=()=>{memory.rideRange=b.dataset.range;$$('[data-range]').forEach(x=>x.classList.toggle('active',x===b));renderRideHistory()});

$("#adminBtn").onclick=()=>{if(memory.currentUser?.role!=="owner")return;memory.ownerUnlocked=true;renderOwner();open("ownerModal")};
$("#ownerTabs").onclick=e=>{const b=e.target.closest('[data-owner-tab]');if(!b)return;memory.ownerTab=b.dataset.ownerTab;renderOwner()};
function renderOwner(){
  $$('[data-owner-tab]').forEach(b=>b.classList.toggle('active',b.dataset.ownerTab===memory.ownerTab));const c=$("#ownerContent");
  if(memory.ownerTab==="overview")c.innerHTML=ownerOverview();
  if(memory.ownerTab==="fleet")c.innerHTML=ownerFleet();
  if(memory.ownerTab==="batteries")c.innerHTML=ownerBatteries();
  if(memory.ownerTab==="pricing")c.innerHTML=ownerPricing();
  if(memory.ownerTab==="maintenance")c.innerHTML=ownerMaintenance();
  if(memory.ownerTab==="staff")c.innerHTML=ownerStaff();
  if(memory.ownerTab==="settings")c.innerHTML=ownerSettings();
  if(memory.ownerTab==="backup")c.innerHTML=ownerBackup();
  bindOwnerActions();
}
function ownerOverview(){const rides=todayRides(),cash=rides.reduce((a,r)=>a+paymentsTotal(r,"Cash"),0),upi=rides.reduce((a,r)=>a+paymentsTotal(r,"UPI"),0),runtime=rides.reduce((a,r)=>a+Math.max(0,minutesBetween(r.startedAt,r.endedAt||Date.now())-Math.round((r.totalPausedMs||0)/60000)),0);const byVehicle=data.vehicles.map(v=>{const vr=rides.filter(r=>r.vehicleId===v.id);return {v,count:vr.length,rev:totalRevenue(vr)}}).sort((a,b)=>b.rev-a.rev);return `<div class="owner-metrics"><div class="metric"><strong>${money(totalRevenue(rides))}</strong><span>Today's Revenue</span></div><div class="metric"><strong>${rides.length}</strong><span>Rides</span></div><div class="metric"><strong>${money(rides.length?Math.round(totalRevenue(rides)/rides.length):0)}</strong><span>Avg Ticket</span></div><div class="metric"><strong>${runtime} min</strong><span>Runtime</span></div></div><div class="owner-grid two" style="margin-top:10px"><div class="panel"><h3>Payments</h3><div class="simple-table"><table class="simple-table"><tr><td>Cash</td><td>${money(cash)}</td></tr><tr><td>UPI</td><td>${money(upi)}</td></tr><tr><td>Other</td><td>${money(Math.max(0,totalRevenue(rides)-cash-upi))}</td></tr></table></div></div><div class="panel"><h3>Fleet Performance</h3><table class="simple-table"><thead><tr><th>Vehicle</th><th>Rides</th><th>Revenue</th></tr></thead><tbody>${byVehicle.map(x=>`<tr><td>${esc(x.v.name)}</td><td>${x.count}</td><td>${money(x.rev)}</td></tr>`).join("")}</tbody></table></div></div>`}
function ownerFleet(){return `<div class="panel"><h3>Fleet</h3>${data.vehicles.map(v=>`<div class="editor-row"><div class="editor-grid"><input data-v-name="${v.id}" value="${esc(v.name)}" placeholder="Vehicle name"><input data-v-code="${v.id}" value="${esc(v.code)}" placeholder="Code"><select data-v-type="${v.id}">${data.vehicleTypes.map(t=>`<option value="${t.id}" ${t.id===v.typeId?"selected":""}>${esc(t.name)}</option>`).join("")}</select><select data-v-price="${v.id}">${data.pricingProfiles.map(p=>`<option value="${p.id}" ${p.id===v.pricingProfileId?"selected":""}>${esc(p.name)}</option>`).join("")}</select><select data-v-ext="${v.id}">${data.extensionProfiles.map(p=>`<option value="${p.id}" ${p.id===v.extensionProfileId?"selected":""}>${esc(p.name)}</option>`).join("")}</select><select data-v-btype="${v.id}">${data.batteryTypes.map(t=>`<option value="${t.id}" ${t.id===v.batteryTypeId?"selected":""}>${esc(t.name)}</option>`).join("")}</select></div><div class="editor-actions"><button class="mini-btn" data-save-vehicle="${v.id}">Save</button><button class="mini-btn ${v.active===false?"":"danger"}" data-toggle-vehicle="${v.id}" ${activeRide(v.id)?"disabled":""}>${v.active===false?"Restore":"Archive"}</button></div></div>`).join("")}<button class="secondary" data-add-vehicle>${svg("i-plus")} Add Vehicle</button></div><div class="panel" style="margin-top:10px"><h3>Vehicle Types</h3>${data.vehicleTypes.map(t=>`<div class="editor-row"><div class="add-row"><input data-type-name="${t.id}" value="${esc(t.name)}"><button class="mini-btn" data-save-type="${t.id}">Save</button></div></div>`).join("")}<button class="secondary" data-add-type>${svg("i-plus")} Add Type</button></div>`}
function ownerBatteries(){return `<div class="owner-grid two"><div class="panel"><h3>Battery Inventory</h3>${data.batteries.map(b=>`<div class="editor-row"><div class="editor-grid"><input data-b-code="${b.id}" value="${esc(b.code)}" placeholder="Code"><select data-b-type="${b.id}">${data.batteryTypes.map(t=>`<option value="${t.id}" ${t.id===b.typeId?"selected":""}>${esc(t.name)}</option>`).join("")}</select></div><div class="editor-actions"><button class="mini-btn" data-save-battery="${b.id}">Save</button><button class="mini-btn danger" data-delete-battery="${b.id}" ${b.assignedVehicleId?"disabled":""}>Delete</button></div></div>`).join("")}<button class="secondary" data-add-battery>${svg("i-plus")} Add Battery</button></div><div class="panel"><h3>Battery Types</h3>${data.batteryTypes.map(t=>`<div class="editor-row"><div class="editor-grid"><input data-bt-name="${t.id}" value="${esc(t.name)}" placeholder="Type name"><input data-bt-volt="${t.id}" value="${esc(t.voltage||"")}" placeholder="Voltage"><input data-bt-cap="${t.id}" value="${esc(t.capacity||"")}" placeholder="Capacity"><input data-bt-conn="${t.id}" value="${esc(t.connector||"")}" placeholder="Connector"></div><div class="editor-actions"><button class="mini-btn" data-save-btype="${t.id}">Save</button></div></div>`).join("")}<button class="secondary" data-add-btype>${svg("i-plus")} Add Battery Type</button></div></div>`}
function ownerPricing(){return `<div class="owner-grid two"><div class="panel"><h3>Ride Packages</h3>${data.packages.map(p=>`<div class="editor-row"><div class="editor-grid"><input data-p-name="${p.id}" value="${esc(p.name)}"><select data-p-prof="${p.id}">${data.pricingProfiles.map(x=>`<option value="${x.id}" ${x.id===p.profileId?"selected":""}>${esc(x.name)}</option>`).join("")}</select><input data-p-min="${p.id}" type="number" min="1" value="${p.minutes}"><input data-p-price="${p.id}" type="number" min="0" value="${p.price}"></div><div class="editor-actions"><button class="mini-btn" data-save-package="${p.id}">Save</button><button class="mini-btn danger" data-delete-package="${p.id}" ${data.packages.length<=1?"disabled":""}>Delete</button></div></div>`).join("")}<button class="secondary" data-add-package>${svg("i-plus")} Add Package</button><hr class="sep"><h3>Pricing Profiles</h3>${data.pricingProfiles.map(p=>`<div class="add-row"><input data-price-profile="${p.id}" value="${esc(p.name)}"><button class="mini-btn" data-save-price-profile="${p.id}">Save</button></div>`).join("")}<button class="secondary" style="margin-top:8px" data-add-price-profile>${svg("i-plus")} Add Profile</button></div><div class="panel"><h3>Extension Options</h3>${data.extensions.map(e=>`<div class="editor-row"><div class="editor-grid"><input data-e-name="${e.id}" value="${esc(e.name)}"><select data-e-prof="${e.id}">${data.extensionProfiles.map(x=>`<option value="${x.id}" ${x.id===e.profileId?"selected":""}>${esc(x.name)}</option>`).join("")}</select><input data-e-min="${e.id}" type="number" min="1" value="${e.minutes}"><input data-e-price="${e.id}" type="number" min="0" value="${e.price}"></div><div class="editor-actions"><button class="mini-btn" data-save-extension="${e.id}">Save</button><button class="mini-btn danger" data-delete-extension="${e.id}" ${data.extensions.length<=1?"disabled":""}>Delete</button></div></div>`).join("")}<button class="secondary" data-add-extension>${svg("i-plus")} Add Extension</button><hr class="sep"><h3>Extension Profiles</h3>${data.extensionProfiles.map(p=>`<div class="add-row"><input data-ext-profile="${p.id}" value="${esc(p.name)}"><button class="mini-btn" data-save-ext-profile="${p.id}">Save</button></div>`).join("")}<button class="secondary" style="margin-top:8px" data-add-ext-profile>${svg("i-plus")} Add Profile</button></div></div>`}
function ownerMaintenance(){const list=data.maintenance.slice().reverse();return `<div class="panel"><h3>Maintenance Log</h3><div class="table-scroll"><table class="simple-table"><thead><tr><th>Vehicle</th><th>Issue</th><th>Reported</th><th>Status</th></tr></thead><tbody>${list.map(m=>`<tr><td>${esc(m.vehicleName)}</td><td>${esc(m.reason)}${m.note?` · ${esc(m.note)}`:""}</td><td>${new Date(m.reportedAt).toLocaleString()}</td><td>${m.resolvedAt?"Resolved":"Open"}</td></tr>`).join("")||`<tr><td colspan="4">No maintenance records yet.</td></tr>`}</tbody></table></div></div>`}
function ownerStaff(){return `<div class="panel"><div class="section-head compact"><div><h3>Operators & Access</h3><p>Each operator signs in separately. Enable only the features they need.</p></div><button class="secondary compact-btn" data-add-staff>${svg("i-plus")} Add Operator</button></div>${data.staff.map(s=>`<div class="staff-card"><div class="staff-head"><div><strong>${esc(s.name)}</strong><span>${s.active!==false?"Active":"Disabled"}</span></div><div class="editor-actions"><button class="mini-btn" data-save-staff="${s.id}">Save</button><button class="mini-btn danger" data-delete-staff="${s.id}" ${data.staff.length<=1?"disabled":""}>Delete</button></div></div><div class="editor-grid" style="margin-top:9px"><input data-staff-name="${s.id}" value="${esc(s.name)}" placeholder="Operator name"><input data-staff-pin="${s.id}" value="${esc(s.pin)}" inputmode="numeric" maxlength="8" placeholder="PIN"></div><label class="permission-item" style="margin-top:8px"><input type="checkbox" data-staff-active="${s.id}" ${s.active!==false?"checked":""}><div><strong>Account active</strong><span>Allow this operator to sign in</span></div></label><div class="permission-grid">${Object.entries(PERMISSIONS).map(([key,m])=>`<label class="permission-item"><input type="checkbox" data-staff-perm="${s.id}" data-perm-key="${key}" ${s.permissions?.[key]?"checked":""}><div><strong>${esc(m.label)}</strong><span>${esc(m.desc)}</span></div></label>`).join("")}</div></div>`).join("")}</div>`}
function ownerSettings(){return `<div class="owner-grid two"><div class="panel"><h3>Business</h3><label>Business name<input id="settingBusiness" value="${esc(data.business.name)}"></label><label>Owner PIN<input id="settingPin" type="password" inputmode="numeric" value="${esc(data.settings.ownerPin)}"></label><button class="primary" data-save-settings>Save Business Settings</button></div><div class="panel"><h3>Ride Timer</h3><label>Warning before time over (seconds)<input id="settingWarning" type="number" min="10" max="300" value="${data.settings.warningSeconds}"></label><label>Alarm repeat count<input id="settingRepeat" type="number" min="1" max="5" value="${data.settings.alarmRepeat}"></label><button class="secondary" data-owner-sound>${svg("i-volume")} Test Ringer</button></div></div>`}
function ownerBackup(){return `<div class="owner-grid two"><div class="panel"><h3>Backup</h3><p class="hint">This build stores business data locally on this device using IndexedDB. Export backups regularly until Firebase is connected.</p><div class="backup-actions"><button class="secondary" data-export>${svg("i-download")} Export JSON Backup</button><button class="secondary" data-import>${svg("i-upload")} Import Backup</button></div></div><div class="panel danger-zone"><h3>Reset Local Data</h3><p class="hint">Deletes ride history and returns the app to its initial local setup.</p><button class="danger-primary" data-reset>Reset Everything</button></div></div>`}
function bindOwnerActions(){
  $('[data-add-staff]')?.addEventListener('click',()=>{const i=data.staff.length+1;data.staff.push({id:uid("op"),name:`Operator ${i}`,pin:"1111",active:true,permissions:{arena:true,queue:true,rides:true,batteries:true,batteryActions:false,maintenance:false,viewRevenue:false}});save();renderOwner()});
  $$('[data-save-staff]').forEach(b=>b.onclick=()=>{const s=data.staff.find(x=>x.id===b.dataset.saveStaff);if(!s)return;s.name=$(`[data-staff-name="${s.id}"]`).value.trim()||s.name;s.pin=$(`[data-staff-pin="${s.id}"]`).value.trim()||"1111";s.active=$(`[data-staff-active="${s.id}"]`).checked;Object.keys(PERMISSIONS).forEach(k=>{const el=$(`[data-staff-perm="${s.id}"][data-perm-key="${k}"]`);s.permissions[k]=!!el?.checked});save();renderLoginChoices();renderOwner();toast("Operator access updated")});
  $$('[data-delete-staff]').forEach(b=>b.onclick=()=>{if(data.staff.length<=1)return;const st=data.staff.find(x=>x.id===b.dataset.deleteStaff);if(!confirm(`Delete ${st?.name||"this operator"}?`))return;data.staff=data.staff.filter(x=>x.id!==b.dataset.deleteStaff);save();renderLoginChoices();renderOwner();toast("Operator deleted")});
  $$('[data-save-vehicle]').forEach(b=>b.onclick=()=>{const id=b.dataset.saveVehicle,v=vehicle(id);v.name=$(`[data-v-name="${id}"]`).value.trim()||v.name;v.code=$(`[data-v-code="${id}"]`).value.trim()||v.code;v.typeId=$(`[data-v-type="${id}"]`).value;v.pricingProfileId=$(`[data-v-price="${id}"]`).value;v.extensionProfileId=$(`[data-v-ext="${id}"]`).value;v.batteryTypeId=$(`[data-v-btype="${id}"]`).value;const assigned=battery(v.currentBatteryId);if(assigned&&assigned.typeId!==v.batteryTypeId){assigned.status="ready";assigned.assignedVehicleId=null;v.currentBatteryId=null}save();render();toast("Vehicle saved")});
  $$('[data-toggle-vehicle]').forEach(b=>b.onclick=()=>{const id=b.dataset.toggleVehicle,v=vehicle(id);if(!v)return;if(activeRide(id))return toast("Complete the active ride first");if(v.active!==false){if(!confirm(`Archive ${v.name}? Its ride history will be preserved.`))return;const bat=battery(v.currentBatteryId);if(bat){bat.status="ready";bat.assignedVehicleId=null}v.currentBatteryId=null;v.active=false;toast("Vehicle archived")}else{v.active=true;toast("Vehicle restored")}save();render();renderOwner()});
  $('[data-add-vehicle]')?.addEventListener('click',()=>{const i=data.vehicles.length+1;data.vehicles.push({id:uid("veh"),code:`VEH-${String(i).padStart(2,"0")}`,name:`Vehicle ${i}`,typeId:data.vehicleTypes[0]?.id,pricingProfileId:data.pricingProfiles[0]?.id,extensionProfileId:data.extensionProfiles[0]?.id,batteryTypeId:data.batteryTypes[0]?.id,currentBatteryId:null,manualStatus:"available",active:true});save();renderOwner();render()});
  $$('[data-save-type]').forEach(b=>b.onclick=()=>{const t=data.vehicleTypes.find(x=>x.id===b.dataset.saveType);t.name=$(`[data-type-name="${t.id}"]`).value.trim()||t.name;save();renderOwner();render()});
  $('[data-add-type]')?.addEventListener('click',()=>{data.vehicleTypes.push({id:uid("type"),name:"New Vehicle Type",active:true});save();renderOwner()});
  $$('[data-save-battery]').forEach(b=>b.onclick=()=>{const x=battery(b.dataset.saveBattery);x.code=$(`[data-b-code="${x.id}"]`).value.trim()||x.code;x.typeId=$(`[data-b-type="${x.id}"]`).value;save();renderOwner();render()});
  $$('[data-delete-battery]').forEach(b=>b.onclick=()=>{const x=battery(b.dataset.deleteBattery);if(!x||x.assignedVehicleId)return;if(!confirm(`Delete battery ${x.code}?`))return;data.batteries=data.batteries.filter(v=>v.id!==x.id);save();renderOwner();render();toast("Battery deleted")});
  $('[data-add-battery]')?.addEventListener('click',()=>{const i=data.batteries.length+1;data.batteries.push({id:uid("bat"),code:`B${String(i).padStart(2,"0")}`,typeId:data.batteryTypes[0]?.id,status:"ready",assignedVehicleId:null,cycles:0,totalRuntimeMin:0,notes:""});save();renderOwner();render()});
  $$('[data-save-btype]').forEach(b=>b.onclick=()=>{const t=batteryType(b.dataset.saveBtype);t.name=$(`[data-bt-name="${t.id}"]`).value.trim()||t.name;t.voltage=$(`[data-bt-volt="${t.id}"]`).value.trim();t.capacity=$(`[data-bt-cap="${t.id}"]`).value.trim();t.connector=$(`[data-bt-conn="${t.id}"]`).value.trim();save();renderOwner();render()});
  $('[data-add-btype]')?.addEventListener('click',()=>{data.batteryTypes.push({id:uid("bt"),name:"New Battery Type",voltage:"",capacity:"",connector:"",compatibleTypeIds:[]});save();renderOwner()});
  $$('[data-save-package]').forEach(b=>b.onclick=()=>{const id=b.dataset.savePackage,p=packageBy(id);p.name=$(`[data-p-name="${id}"]`).value.trim()||p.name;p.profileId=$(`[data-p-prof="${id}"]`).value;p.minutes=Math.max(1,Number($(`[data-p-min="${id}"]`).value)||1);p.price=Math.max(0,Number($(`[data-p-price="${id}"]`).value)||0);save();renderOwner();render()});
  $$('[data-delete-package]').forEach(b=>b.onclick=()=>{const p=packageBy(b.dataset.deletePackage);if(!p||!confirm(`Delete package ${p.name}? Existing ride amounts will remain in history.`))return;data.packages=data.packages.filter(x=>x.id!==b.dataset.deletePackage);save();renderOwner();render();toast("Package deleted")});
  $('[data-add-package]')?.addEventListener('click',()=>{data.packages.push({id:uid("pkg"),profileId:data.pricingProfiles[0]?.id,name:"New Package",minutes:5,price:200,active:true});save();renderOwner()});
  $$('[data-save-extension]').forEach(b=>b.onclick=()=>{const id=b.dataset.saveExtension,e=extensionBy(id);e.name=$(`[data-e-name="${id}"]`).value.trim()||e.name;e.profileId=$(`[data-e-prof="${id}"]`).value;e.minutes=Math.max(1,Number($(`[data-e-min="${id}"]`).value)||1);e.price=Math.max(0,Number($(`[data-e-price="${id}"]`).value)||0);save();renderOwner();render()});
  $$('[data-delete-extension]').forEach(b=>b.onclick=()=>{const e=extensionBy(b.dataset.deleteExtension);if(!e||!confirm(`Delete extension ${e.name}?`))return;data.extensions=data.extensions.filter(x=>x.id!==b.dataset.deleteExtension);save();renderOwner();toast("Extension deleted")});
  $('[data-add-extension]')?.addEventListener('click',()=>{data.extensions.push({id:uid("ext"),profileId:data.extensionProfiles[0]?.id,name:"New Extension",minutes:2,price:80,active:true});save();renderOwner()});
  $$('[data-save-price-profile]').forEach(b=>b.onclick=()=>{const p=data.pricingProfiles.find(x=>x.id===b.dataset.savePriceProfile);p.name=$(`[data-price-profile="${p.id}"]`).value.trim()||p.name;save();renderOwner();render()});
  $('[data-add-price-profile]')?.addEventListener('click',()=>{data.pricingProfiles.push({id:uid("price"),name:"New Pricing Profile"});save();renderOwner()});
  $$('[data-save-ext-profile]').forEach(b=>b.onclick=()=>{const p=data.extensionProfiles.find(x=>x.id===b.dataset.saveExtProfile);p.name=$(`[data-ext-profile="${p.id}"]`).value.trim()||p.name;save();renderOwner();render()});
  $('[data-add-ext-profile]')?.addEventListener('click',()=>{data.extensionProfiles.push({id:uid("extp"),name:"New Extension Profile"});save();renderOwner()});
  $('[data-save-settings]')?.addEventListener('click',()=>{data.business.name=$("#settingBusiness").value.trim()||"KAS RC Arena";data.settings.ownerPin=$("#settingPin").value.trim()||"1234";data.settings.warningSeconds=Math.min(300,Math.max(10,Number($("#settingWarning")?.value||60)));data.settings.alarmRepeat=Math.min(5,Math.max(1,Number($("#settingRepeat")?.value||2)));save();render();toast("Settings saved")});
  $('[data-owner-sound]')?.addEventListener('click',()=>playRinger());
  $('[data-export]')?.addEventListener('click',exportBackup);$('[data-import]')?.addEventListener('click',()=>$("#importFile").click());
  $('[data-reset]')?.addEventListener('click',async()=>{if(!confirm("Reset all local KAS RC Arena data? This cannot be undone unless you exported a backup."))return;data=structuredClone(DEFAULT);await dbSet(data);memory.ownerUnlocked=false;close("ownerModal");logout();render();toast("Local data reset")});
}
function exportBackup(){const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"}),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`KAS-RC-Arena-Backup-${localDateKey()}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);toast("Backup exported")}
$("#importFile").onchange=async e=>{const f=e.target.files?.[0];if(!f)return;try{const parsed=JSON.parse(await f.text());if(!parsed||!Array.isArray(parsed.vehicles)||!Array.isArray(parsed.rides))throw new Error();if(!confirm("Import this backup and replace current local data?"))return;data=mergeDefaults(parsed);await dbSet(data);render();renderOwner();toast("Backup imported")}catch{toast("Invalid backup file")}e.target.value=""};


function renderLoginChoices(){
  const list=data.staff.filter(s=>s.active!==false);
  if(!memory.selectedOperator||!list.some(s=>s.id===memory.selectedOperator))memory.selectedOperator=list[0]?.id||null;
  const box=$("#operatorChoices");if(!box)return;
  box.innerHTML=list.map(s=>`<button class="choice-card ${memory.selectedOperator===s.id?"active":""}" data-login-operator="${s.id}"><strong>${esc(s.name)}</strong><span>Operator account</span></button>`).join("")||`<div class="notice">No active operator accounts. Sign in as Owner to enable one.</div>`;
  $$('[data-login-operator]').forEach(b=>b.onclick=()=>{memory.selectedOperator=b.dataset.loginOperator;renderLoginChoices()});
}
function applyAccessUI(){
  const signed=!!memory.currentUser;document.body.classList.toggle("signed-out",!signed);$("#loginScreen")?.classList.toggle("hidden",signed);
  if(!signed)return;
  const owner=memory.currentUser.role==="owner";$("#roleLabel").textContent=owner?"OWNER":(memory.currentUser.name||"OPERATOR").toUpperCase();
  $("#adminBtn").classList.toggle("hidden",!owner);$("#logoutBtn").classList.remove("hidden");$("#mainNav").classList.remove("hidden");
  $("#summaryCards").classList.toggle("revenue-hidden",!can("viewRevenue"));
  $$('[data-permission]').forEach(el=>{const allowed=can(el.dataset.permission);el.hidden=!allowed});
  if(!can(memory.currentView))memory.currentView="arena";
  $$('.view').forEach(v=>v.classList.toggle('active',v.id===`view-${memory.currentView}`));$$('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===memory.currentView));
}
function login(role,user){memory.currentUser={role,id:user?.id||"owner",name:user?.name||"Owner"};memory.ownerUnlocked=role==="owner";sessionStorage.setItem("kas-session",JSON.stringify(memory.currentUser));memory.currentView="arena";applyAccessUI();render();toast(`Signed in as ${memory.currentUser.name}`)}
function logout(){sessionStorage.removeItem("kas-session");memory.currentUser=null;memory.ownerUnlocked=false;memory.currentView="arena";$$('.modal:not(.hidden)').forEach(m=>m.classList.add('hidden'));applyAccessUI();renderLoginChoices()}
$$('[data-login-role]').forEach(b=>b.onclick=()=>{memory.loginRole=b.dataset.loginRole;$$('[data-login-role]').forEach(x=>x.classList.toggle('active',x===b));$("#operatorLoginPanel").classList.toggle("hidden",memory.loginRole!=="operator");$("#ownerLoginPanel").classList.toggle("hidden",memory.loginRole!=="owner")});
$("#operatorLoginBtn").onclick=()=>{const s=data.staff.find(x=>x.id===memory.selectedOperator&&x.active!==false);if(!s)return toast("Select an active operator");if($("#operatorPinInput").value!==String(s.pin||"1111"))return toast("Incorrect operator PIN");$("#operatorPinInput").value="";login("operator",s)};
$("#ownerLoginBtn").onclick=()=>{if($("#ownerLoginPin").value!==String(data.settings.ownerPin||"1234"))return toast("Incorrect owner PIN");$("#ownerLoginPin").value="";login("owner")};
$("#logoutBtn").onclick=logout;

const ringer=$("#ringer");let audioUnlocked=false,alertInterval=null;
function unlockAudio(){ringer.load();ringer.volume=1;audioUnlocked=true}
async function playRinger(){try{unlockAudio();ringer.pause();ringer.currentTime=0;ringer.volume=1;await ringer.play()}catch{toast("Tap Ringer once to enable sound")}}
function stopRinger(){ringer.pause();ringer.currentTime=0}
function unackOverRides(){return data.rides.filter(r=>!r.endedAt&&!r.pausedAt&&!r.alarmAcknowledged&&Date.now()>=r.endsAt)}
function ensureAlert(){if(!unackOverRides().length){stopAlertIfClear();return}if(alertInterval)return;playRinger();if(navigator.vibrate)navigator.vibrate([500,150,500,150,700]);alertInterval=setInterval(()=>{if(!unackOverRides().length)return stopAlertIfClear();playRinger()},10000)}
function stopAlertIfClear(){if(unackOverRides().length)return;clearInterval(alertInterval);alertInterval=null;stopRinger()}
$("#soundTest").onclick=()=>playRinger();
function checkTimers(){ensureAlert();renderFleet();const rides=todayRides();$("#activeCount").textContent=data.vehicles.filter(v=>activeRide(v.id)).length;$("#readyCount").textContent=data.vehicles.filter(v=>vehicleState(v)==="available").length;$("#todayRevenue").textContent=money(totalRevenue(rides))}

$$('[data-close]').forEach(b=>b.onclick=()=>close(b.dataset.close));
document.addEventListener('keydown',e=>{if(e.key==='Escape')$$('.modal:not(.hidden)').forEach(m=>m.classList.add('hidden'))});

(async function start(){await initState();renderLoginChoices();try{const s=JSON.parse(sessionStorage.getItem("kas-session")||"null");if(s?.role==="owner")memory.currentUser={role:"owner",id:"owner",name:"Owner"};if(s?.role==="operator"&&data.staff.some(x=>x.id===s.id&&x.active!==false))memory.currentUser=s}catch{}applyAccessUI();render();setInterval(checkTimers,1000);if("serviceWorker" in navigator&&(location.protocol==="https:"||location.hostname==="localhost"))navigator.serviceWorker.register("sw.js").catch(()=>{});})();
