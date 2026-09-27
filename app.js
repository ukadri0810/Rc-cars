const DB_NAME = "kas-rc-arena-local";
const DB_STORE = "app";
const STATE_KEY = "state-v3";
const LEGACY_KEY = "rc-rental-v2";
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const money = n => {const x=Number(n||0);return `${x<0?"-":""}₹${Math.abs(x).toLocaleString("en-IN")}`};
const svg = id => `<svg aria-hidden="true"><use href="#${id}"/></svg>`;
const uid = prefix => `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,7)}`;
const esc = s => String(s ?? "").replace(/[&<>"']/g, m => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
const localDateKey = d => {
  const x = d ? new Date(d) : new Date();
  return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,"0")}-${String(x.getDate()).padStart(2,"0")}`;
};
const dateKeyOffset = (key,days) => {
  const [y,m,d]=String(key||localDateKey()).split("-").map(Number),x=new Date(y,m-1,d);x.setDate(x.getDate()+days);return localDateKey(x);
};
const prettyDate = key => {const [y,m,d]=String(key||localDateKey()).split("-").map(Number);return new Date(y,m-1,d).toLocaleDateString([], {day:"numeric",month:"short",year:"numeric"})};
const fmt = ms => { ms = Math.max(0, ms); const s = Math.floor(ms/1000), m = Math.floor(s/60), r = s%60; return `${String(m).padStart(2,"0")}:${String(r).padStart(2,"0")}`; };
const minutesBetween = (a,b) => Math.max(0, Math.round((b-a)/60000));

const DEFAULT = {
  version:5,
  business:{name:"KAS RC Arena"},
  vehicleTypes:[
    {id:"type_car",name:"RC Car",active:true},
    {id:"type_truck",name:"RC Truck",active:true},
    {id:"type_excavator",name:"RC Excavator",active:true},
    {id:"type_boat",name:"RC Boat",active:true},
    {id:"type_sumo",name:"RC Sumo",active:true}
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
  sumoPackages:[
    {id:"sumo_standard",name:"Standard Sumo",pricingMode:"per_player",price:150,minPlayers:4,maxPlayers:5,durationMinutes:3,active:true}
  ],
  batteryTypes:[{id:"bt_2s",name:"2S LiPo",voltage:"7.4V",capacity:"5200mAh",connector:"XT60",compatibleTypeIds:["type_car","type_truck","type_excavator","type_sumo"]}],
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
  rides:[],sumoMatches:[],queue:[],maintenance:[],expenses:[],eodClosings:[],
  staff:[
    {id:"op_01",name:"Operator 1",pin:"1111",active:true,permissions:{arena:true,sumo:true,queue:true,rides:true,batteries:true,batteryActions:true,maintenance:true,viewRevenue:true}}
  ],
  settings:{alarmRepeat:2,warningSeconds:60,ownerPin:"1234",paymentMethods:["Cash","UPI","Other"],expenseCategories:["Fuel / Transport","Repair / Parts","Staff / Food","Rent / Fees","Cleaning / Supplies","Other"],nextRideNumber:1,nextSumoNumber:1}
};

let data = structuredClone(DEFAULT);
let memory = {selectedVehicle:null, selectedPackage:null, payment:"Cash", lastPayment:"Cash", selectedRide:null, selectedExtension:null, extensionPayment:"Cash", endReason:"Customer finished", selectedQueue:null, selectedMaintenanceReason:"Vehicle issue", ownerUnlocked:false, ownerTab:"overview", rideRange:"today", batteryFilter:"all", highlightBatteryId:null, loginRole:"operator",selectedOperator:null,currentUser:null,currentView:"arena", sumoPlayerCount:4, selectedSumoPackage:null, sumoPayment:"Cash", sumoAssignments:{}, sumoQueueId:null, queueActivityType:"ride", queuePlayerCount:4,eodDate:localDateKey(),expenseCategory:null,expensePayment:"Cash"};
const PERMISSIONS={
  sumo:{label:"Sumo Battle",desc:"Start and manage RC Sumo matches"},
  queue:{label:"Queue",desc:"View, add, start and remove waiting customers"},
  rides:{label:"Ride History",desc:"View and search ride transactions"},
  batteries:{label:"Equipment",desc:"View vehicle and battery status in one operational screen"},
  batteryActions:{label:"Equipment Controls",desc:"Assign or swap batteries and manage charging with quick actions"},
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
  ["vehicleTypes","pricingProfiles","packages","extensionProfiles","extensions","sumoPackages","batteryTypes","batteries","vehicles","rides","sumoMatches","queue","maintenance","expenses","eodClosings","staff"].forEach(k=>{if(!Array.isArray(merged[k]))merged[k]=structuredClone(DEFAULT[k])});
  const basePerm={arena:true,sumo:false,queue:true,rides:true,batteries:true,batteryActions:true,maintenance:true,viewRevenue:true};
  merged.staff=(merged.staff||[]).map(s=>({...s,permissions:{...basePerm,...(s.permissions||{})}}));
  if(!merged.staff.length) merged.staff=structuredClone(DEFAULT.staff);
  return merged;
}
function normalizeOperationalState(state){
  if(!(state.vehicleTypes||[]).some(t=>t.id==="type_sumo"))state.vehicleTypes.push({id:"type_sumo",name:"RC Sumo",active:true});
  const validBatteryStatuses=new Set(["ready","installed","in_use","charging","needs_charge","maintenance"]);
  const typeIds=new Set((state.batteryTypes||[]).map(t=>t.id));
  const vehicleIds=new Set((state.vehicles||[]).map(v=>v.id));
  const batteryIds=new Set((state.batteries||[]).map(b=>b.id));
  const fallbackType=state.batteryTypes?.[0]?.id||null;

  // Normalize every battery so older/corrupt local records can never disappear from Battery Station.
  (state.batteries||[]).forEach((b,i)=>{
    if(!b.id)b.id=uid("bat");
    if(!b.code)b.code=`B${String(i+1).padStart(2,"0")}`;
    b.code=String(b.code).trim().toUpperCase();
    if(!typeIds.has(b.typeId))b.typeId=fallbackType;
    if(!validBatteryStatuses.has(b.status))b.status="ready";
    if(b.assignedVehicleId&&!vehicleIds.has(b.assignedVehicleId))b.assignedVehicleId=null;
    b.cycles=Math.max(0,Number(b.cycles)||0);
    b.totalRuntimeMin=Math.max(0,Number(b.totalRuntimeMin)||0);
    b.notes=String(b.notes||"");
  });

  // Reconcile vehicle <-> battery links. Vehicle assignment is authoritative for installed batteries.
  (state.vehicles||[]).forEach(v=>{
    if(v.currentBatteryId&&!batteryIds.has(v.currentBatteryId))v.currentBatteryId=null;
    const b=(state.batteries||[]).find(x=>x.id===v.currentBatteryId);
    if(b){
      b.assignedVehicleId=v.id;
      const r=(state.rides||[]).find(x=>x.vehicleId===v.id&&!x.endedAt);
      b.status=r?"in_use":"installed";
    }
  });
  // Any battery claiming an assignment that the vehicle no longer references is returned to ready.
  (state.batteries||[]).forEach(b=>{
    if(!b.assignedVehicleId)return;
    const v=(state.vehicles||[]).find(x=>x.id===b.assignedVehicleId);
    if(!v||v.currentBatteryId!==b.id){b.assignedVehicleId=null;if(["installed","in_use"].includes(b.status))b.status="ready"}
  });

  // Keep timer-only package data valid and visible to the ride flow.
  (state.packages||[]).forEach(p=>{p.minutes=Math.max(1,Number(p.minutes)||1);p.price=Math.max(0,Number(p.price)||0);if(p.active===undefined)p.active=true});
  (state.extensions||[]).forEach(e=>{e.minutes=Math.max(1,Number(e.minutes)||1);e.price=Math.max(0,Number(e.price)||0);if(e.active===undefined)e.active=true});
  (state.sumoPackages||[]).forEach(p=>{p.name=String(p.name||"Sumo Package");p.pricingMode=["per_player","per_match"].includes(p.pricingMode)?p.pricingMode:"per_player";p.price=Math.max(0,Number(p.price)||0);p.minPlayers=Math.min(5,Math.max(2,Number(p.minPlayers)||4));p.maxPlayers=Math.min(5,Math.max(p.minPlayers,Number(p.maxPlayers)||5));p.durationMinutes=Math.max(0,Number(p.durationMinutes)||0);if(p.active===undefined)p.active=true});
  (state.sumoMatches||[]).forEach(m=>{m.participants=Array.isArray(m.participants)?m.participants:[];m.totalAmount=Math.max(0,Number(m.totalAmount)||0);m.alarmAcknowledged=!!m.alarmAcknowledged});
  (state.queue||[]).forEach(q=>{q.activityType=q.activityType==="sumo"?"sumo":"ride";if(q.activityType==="sumo")q.playerCount=[4,5].includes(Number(q.playerCount))?Number(q.playerCount):4});
  if(!Array.isArray(state.settings.expenseCategories)||!state.settings.expenseCategories.length)state.settings.expenseCategories=structuredClone(DEFAULT.settings.expenseCategories);
  state.settings.expenseCategories=state.settings.expenseCategories.map(x=>String(x||"").trim()).filter(Boolean);
  (state.expenses||[]).forEach(e=>{e.id=e.id||uid("exp");e.date=e.date||localDateKey(e.createdAt||Date.now());e.amount=Math.max(0,Number(e.amount)||0);e.category=String(e.category||"Other");e.paymentMethod=state.settings.paymentMethods.includes(e.paymentMethod)?e.paymentMethod:(state.settings.paymentMethods[0]||"Cash");e.note=String(e.note||"");});
  (state.eodClosings||[]).forEach(c=>{c.id=c.id||uid("eod");c.date=c.date||localDateKey(c.closedAt||Date.now());c.actualCash=c.actualCash===null||c.actualCash===undefined?null:Math.max(0,Number(c.actualCash)||0);});
  return state;
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
  const stored=await dbGet(); if(stored){data=normalizeOperationalState(mergeDefaults(stored));await dbSet(data);return}
  try{const fallback=JSON.parse(localStorage.getItem("kas-rc-fallback")||"null");if(fallback){data=normalizeOperationalState(mergeDefaults(fallback));await dbSet(data);return}}catch{}
  try{const old=JSON.parse(localStorage.getItem(LEGACY_KEY)||"null");const migrated=migrateLegacy(old);if(migrated){data=normalizeOperationalState(migrated);await dbSet(data);return}}catch{}
  data=normalizeOperationalState(structuredClone(DEFAULT));await dbSet(data);
}
const SYNC_DIRTY_KEY="kas-sync-dirty";
let pendingRemoteState=null;
let syncBusy=false;
function markLocalDirty(){
  try{localStorage.setItem(SYNC_DIRTY_KEY,String(Date.now()))}catch{}
  updateSyncStatus();
}
function clearLocalDirty(){try{localStorage.removeItem(SYNC_DIRTY_KEY)}catch{}updateSyncStatus()}
function hasLocalDirty(){try{return !!localStorage.getItem(SYNC_DIRTY_KEY)}catch{return false}}
let persistQueue=Promise.resolve();
function persistLocalSnapshot(){
  const snapshot=structuredClone(data);
  persistQueue=persistQueue.catch(()=>{}).then(()=>dbSet(snapshot));
  return persistQueue;
}
function save(){persistLocalSnapshot();markLocalDirty();scheduleBackgroundSync();}
function isEditable(el=document.activeElement){return !!el&&(el.matches?.("input,textarea,select,[contenteditable=true]")||el.isContentEditable)}
function isUserInteracting(){
  if(isEditable()) return true;
  return $$(".modal:not(.hidden)").some(m=>m.querySelector("input:focus,textarea:focus,select:focus,[contenteditable=true]:focus"));
}
function updateSyncStatus(forced){
  const el=$("#syncStatus"),text=$("#syncStatusText");if(!el||!text)return;
  el.classList.remove("offline","syncing","error","pending");
  if(forced==="syncing"){el.classList.add("syncing");text.textContent="Syncing";return}
  if(forced==="error"){el.classList.add("error");text.textContent="Sync error";return}
  if(!navigator.onLine){el.classList.add("offline");text.textContent="Offline · saved locally";return}
  if(hasLocalDirty()){el.classList.add("pending");text.textContent=window.KAS_CLOUD_SYNC?"Pending sync":"Local saved";return}
  text.textContent=window.KAS_CLOUD_SYNC?"Synced":"Local";
}
let syncTimer=null;
function scheduleBackgroundSync(delay=1200){
  clearTimeout(syncTimer);
  syncTimer=setTimeout(()=>backgroundSync(),delay);
}
async function backgroundSync(){
  if(syncBusy||!navigator.onLine||!window.KAS_CLOUD_SYNC)return updateSyncStatus();
  if(isUserInteracting()) return scheduleBackgroundSync(2500);
  syncBusy=true;updateSyncStatus("syncing");
  try{
    const adapter=window.KAS_CLOUD_SYNC;
    if(hasLocalDirty()&&typeof adapter.pushState==="function"){await adapter.pushState(structuredClone(data));clearLocalDirty()}
    if(typeof adapter.pullState==="function"){const remote=await adapter.pullState();if(remote){if(isUserInteracting())pendingRemoteState=remote;else applyRemoteState(remote)}}
    updateSyncStatus();
  }catch(e){console.warn("Background sync failed",e);updateSyncStatus("error")}finally{syncBusy=false}
}
function applyRemoteState(remote){
  if(!remote||typeof remote!=="object")return;
  // Never replace live form DOM while a user is typing. This function is only called at a safe checkpoint.
  data=normalizeOperationalState(mergeDefaults(remote));dbSet(data);pendingRemoteState=null;render();
}
function applyPendingRemoteWhenSafe(){if(pendingRemoteState&&!isUserInteracting())applyRemoteState(pendingRemoteState)}
window.addEventListener("online",()=>{updateSyncStatus();scheduleBackgroundSync(300)});
window.addEventListener("offline",()=>updateSyncStatus());
window.addEventListener("focus",()=>{applyPendingRemoteWhenSafe();scheduleBackgroundSync(600)});
document.addEventListener("focusout",()=>setTimeout(()=>{applyPendingRemoteWhenSafe();scheduleBackgroundSync(800)},50));
setInterval(()=>{if(navigator.onLine&&!isUserInteracting())backgroundSync()},60000);
function toast(t){const e=$("#toast");e.textContent=t;e.classList.add("show");clearTimeout(toast.t);toast.t=setTimeout(()=>e.classList.remove("show"),1900)}
let historyReady=false;
function setHistory(view=memory.currentView,modal=null,mode="push"){
  const state={kas:true,view:view||"arena",modal:modal||null};
  try{if(mode==="replace")history.replaceState(state,"");else history.pushState(state,"")}catch{}
}
function open(id,push=true){$("#"+id)?.classList.remove("hidden");if(push&&historyReady)setHistory(memory.currentView,id,"push")}
function close(id,skipHistory=false){$("#"+id)?.classList.add("hidden");if(!skipHistory&&historyReady&&history.state?.kas&&history.state?.modal===id){history.back()}}
function closeAllModals(){$$('.modal:not(.hidden)').forEach(m=>m.classList.add('hidden'))}
function applyHistoryState(state){
  closeAllModals();
  if(!state?.kas){memory.currentView="arena";switchView("arena",false);return}
  const view=can(state.view)?state.view:"arena";switchView(view,false);
  if(state.modal&&$("#"+state.modal))open(state.modal,false);
}
function vehicle(id){return data.vehicles.find(v=>v.id===id)}
function vehicleType(id){return data.vehicleTypes.find(x=>x.id===id)}
function battery(id){return data.batteries.find(x=>x.id===id)}
function batteryType(id){return data.batteryTypes.find(x=>x.id===id)}
function packageBy(id){return data.packages.find(x=>x.id===id)}
function extensionBy(id){return data.extensions.find(x=>x.id===id)}
function sumoPackageBy(id){return data.sumoPackages.find(x=>x.id===id)}
function isSumoVehicle(v){return !!v&&v.typeId==="type_sumo"}
function activeSumoMatchForVehicle(vehicleId){return data.sumoMatches.find(m=>!m.endedAt&&(m.participants||[]).some(p=>p.vehicleId===vehicleId))}
function activeSumoMatches(){return data.sumoMatches.filter(m=>!m.endedAt)}
function activeRide(vehicleId){return data.rides.find(r=>r.vehicleId===vehicleId&&!r.endedAt)}
function rideTotal(r){return Number(r.baseAmount||0)+Number((r.extensions||[]).reduce((a,e)=>a+Number(e.amount||0),0))-Number(r.discount||0)}
function remainingMs(r,now=Date.now()){const ref=r.pausedAt||now;return Math.max(0,r.endsAt-ref)}
function rideStatus(r){if(r.endedAt)return"completed";if(r.pausedAt)return"paused";const rem=r.endsAt-Date.now();if(rem<=0)return"over";if(rem<=Number(data.settings.warningSeconds||60)*1000)return"ending";return"running"}
function vehicleState(v){
  const sm=activeSumoMatchForVehicle(v.id);if(sm)return"sumo";
  const r=activeRide(v.id); if(r)return rideStatus(r);
  if(v.manualStatus==="maintenance")return"maintenance";
  if(!v.currentBatteryId)return"no-battery";
  const b=battery(v.currentBatteryId); if(!b || !["installed","ready"].includes(b.status))return"no-battery";
  return"available";
}
function nextRideNumber(){const n=Number(data.settings.nextRideNumber||1);data.settings.nextRideNumber=n+1;return `KAS-R-${String(n).padStart(6,"0")}`}
function nextSumoNumber(){const n=Number(data.settings.nextSumoNumber||1);data.settings.nextSumoNumber=n+1;return `KAS-S-${String(n).padStart(5,"0")}`}
function todayRides(){return data.rides.filter(r=>r.date===localDateKey())}
function todaySumoMatches(){return data.sumoMatches.filter(m=>m.date===localDateKey())}
function sumoRevenue(matches){return matches.reduce((a,m)=>a+Number(m.totalAmount||0),0)}
function sumoRemainingMs(m,now=Date.now()){return m.endsAt?Math.max(0,m.endsAt-now):null}
function sumoActivePlayers(m){return (m.participants||[]).filter(p=>!p.eliminatedAt)}
function sumoStatus(m){if(m.endedAt)return"completed";const alive=sumoActivePlayers(m).length;if(alive===1)return"winner";if(m.endsAt&&Date.now()>=m.endsAt)return"time_up";return"running"}
function paymentsTotal(r,method){return (r.payments||[]).filter(p=>!method||p.method===method).reduce((a,p)=>a+Number(p.amount||0),0)}
function totalRevenue(rides){return rides.reduce((a,r)=>a+rideTotal(r),0)}
function ridesForDate(date){return data.rides.filter(r=>r.date===date)}
function sumoForDate(date){return data.sumoMatches.filter(m=>m.date===date)}
function expensesForDate(date){return (data.expenses||[]).filter(e=>e.date===date)}
function expenseTotal(items){return items.reduce((a,e)=>a+Number(e.amount||0),0)}
function eodClosingForDate(date){return (data.eodClosings||[]).find(c=>c.date===date)}
function salesBreakdownForDate(date){
  const rides=ridesForDate(date),sumo=sumoForDate(date),sales=totalRevenue(rides)+sumoRevenue(sumo),by={Cash:0,UPI:0,Other:0};
  for(const r of rides)for(const p of r.payments||[]){const k=by[p.method]!==undefined?p.method:"Other";by[k]+=Number(p.amount||0)}
  for(const m of sumo){for(const p of m.payments||[{method:m.paymentMethod,amount:m.totalAmount}]){const k=by[p.method]!==undefined?p.method:"Other";by[k]+=Number(p.amount||0)}}
  return {rides,sumo,sales,by};
}
function expenseBreakdownForDate(date){const items=expensesForDate(date),by={Cash:0,UPI:0,Other:0};for(const e of items){const k=by[e.paymentMethod]!==undefined?e.paymentMethod:"Other";by[k]+=Number(e.amount||0)}return {items,total:expenseTotal(items),by}}
function nextBatteryCode(){let n=1;const used=new Set(data.batteries.map(b=>String(b.code||"").toUpperCase()));while(used.has(`B${String(n).padStart(2,"0")}`))n++;return `B${String(n).padStart(2,"0")}`}
function nextVehicleCode(){let n=1;const used=new Set(data.vehicles.map(v=>String(v.code||"").toUpperCase()));while(used.has(`VEH-${String(n).padStart(2,"0")}`))n++;return `VEH-${String(n).padStart(2,"0")}`}
function readyBatteriesFor(v){return data.batteries.filter(b=>b.status==="ready"&&b.typeId===v?.batteryTypeId).slice().sort((a,b)=>(Number(a.cycles||0)-Number(b.cycles||0))||(Number(a.totalRuntimeMin||0)-Number(b.totalRuntimeMin||0))||String(a.code).localeCompare(String(b.code),undefined,{numeric:true,sensitivity:"base"}))}
function recommendedBattery(v){return readyBatteriesFor(v)[0]||null}
function equipmentCounts(){return {needsCharge:data.batteries.filter(b=>b.status==="needs_charge").length,charging:data.batteries.filter(b=>b.status==="charging").length,ready:data.batteries.filter(b=>b.status==="ready").length,maintenance:data.vehicles.filter(v=>v.active!==false&&v.manualStatus==="maintenance").length,missingBattery:data.vehicles.filter(v=>v.active!==false&&!v.currentBatteryId&&v.manualStatus!=="maintenance").length}}
function equipmentVehicleStatusLabel(v){const st=vehicleState(v);return st==="available"?"Ready":st==="no-battery"?"Battery Required":st==="maintenance"?"Maintenance":st==="sumo"?"In Sumo":st==="over"?"Time Up":st==="ending"?"Ending Soon":st==="paused"?"Paused":"In Use"}
function focusOwnerField(selector){requestAnimationFrame(()=>{const el=$(selector);if(!el)return;el.classList.add("just-added");el.scrollIntoView({block:"center",behavior:"smooth"});setTimeout(()=>{el.focus?.();el.select?.()},250);setTimeout(()=>el.classList.remove("just-added"),1800)})}

function render(){
  applyAccessUI();
  $("#businessTitle").textContent=data.business.name||"KAS RC Arena";
  const rides=todayRides(),sumo=todaySumoMatches(),active=data.vehicles.filter(v=>activeRide(v.id)||activeSumoMatchForVehicle(v.id)).length,ready=data.vehicles.filter(v=>vehicleState(v)==="available").length;
  $("#activeCount").textContent=active;$("#readyCount").textContent=ready;$("#todayRevenue").textContent=money(totalRevenue(rides)+sumoRevenue(sumo));$("#rideCountText").textContent=`${rides.length} ride${rides.length===1?"":"s"}`;
  renderFleet();renderRecentRides();renderSumo();renderQueue();renderRideHistory();renderBatteries();updateQueueBadge();
}
function renderFleet(){
  $("#fleet").innerHTML=data.vehicles.filter(v=>v.active!==false&&!isSumoVehicle(v)).map(v=>{
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
  $$('[data-end]').forEach(b=>b.onclick=()=>handleCompleteRide(b.dataset.end));
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
  const free=data.vehicles.filter(v=>vehicleState(v)==="available"&&!isSumoVehicle(v));
  $("#queueList").innerHTML=data.queue.map((q,i)=>{const isSumo=q.activityType==="sumo",canStart=isSumo?(can("sumo")&&availableSumoVehicles().length>=(q.playerCount||4)):free.length;return `<div class="queue-row"><div><strong>${i+1}. ${esc(q.name)}</strong><span>${isSumo?`Sumo Battle · ${q.playerCount||4} players`:q.mobile?esc(q.mobile):"Timed Ride"}</span></div><span>${Math.max(1,Math.round((Date.now()-q.addedAt)/60000))}m</span><div class="queue-actions">${canStart?`<button class="start" data-queue-start="${q.id}">Start</button>`:""}<button data-queue-remove="${q.id}">Remove</button></div></div>`}).join("")||`<div class="notice">Queue is empty.</div>`;
  $$('[data-queue-start]').forEach(b=>b.onclick=()=>openQueueStart(b.dataset.queueStart));$$('[data-queue-remove]').forEach(b=>b.onclick=()=>removeQueue(b.dataset.queueRemove));
}
function renderRideHistory(){
  if(!$("#rideHistory")) return;
  const q=$("#rideSearch")?.value.trim().toLowerCase()||"";let rides=data.rides.slice().reverse();if(memory.rideRange==="today")rides=rides.filter(r=>r.date===localDateKey());if(q)rides=rides.filter(r=>[r.customer,r.mobile,r.rideNumber,r.vehicleName].some(v=>String(v||"").toLowerCase().includes(q)));$("#rideHistory").innerHTML=rides.map(rideRow).join("")||`<div class="notice">No rides match this view.</div>`;
}
function equipmentVehicleCard(v,mode="operator"){
  const state=vehicleState(v),b=battery(v.currentBatteryId),rec=recommendedBattery(v),activeRideNow=!!activeRide(v.id),activeSumoNow=!!activeSumoMatchForVehicle(v.id),active=activeRideNow||activeSumoNow;
  const canBattery=mode==="owner"||can("batteryActions"),canMaint=mode==="owner"||can("maintenance");
  const prefix=mode==="owner"?"owner-equipment-":"equipment-";
  const batteryAction=canBattery?(!v.currentBatteryId&&rec?`<button class="equipment-command primary-command" data-${prefix}assign="${v.id}">${svg("i-battery")} Assign ${esc(rec.code)}</button>`:v.currentBatteryId&&!activeSumoNow?`<button class="equipment-command" data-${prefix}swap="${v.id}">${svg("i-battery")} Change Battery</button>`:!v.currentBatteryId?`<button class="equipment-command" disabled>No Ready Battery</button>`:""):"";
  const maintAction=canMaint&&!active?(state==="maintenance"?`<button class="equipment-command success-command" data-${prefix}repair="${v.id}">${svg("i-check")} Mark Ready</button>`:`<button class="equipment-command" data-${prefix}issue="${v.id}">${svg("i-wrench")} Report Issue</button>`):"";
  return `<article class="equipment-vehicle-card ${esc(state)}"><div class="equipment-vehicle-main"><div><strong>${esc(v.name)}</strong><span>${esc(v.code)} · ${esc(vehicleType(v.typeId)?.name||"Vehicle")}</span></div><b>${esc(equipmentVehicleStatusLabel(v))}</b></div><div class="equipment-battery-line">${svg("i-battery")} ${b?`<span><strong>${esc(b.code)}</strong> · ${esc((b.status||"installed").replaceAll("_"," "))}</span>`:`<span>No battery assigned${rec?` · Recommended ${esc(rec.code)}`:""}</span>`}</div>${batteryAction||maintAction?`<div class="equipment-command-row">${batteryAction}${maintAction}</div>`:""}</article>`;
}
function equipmentAttentionHtml(mode="operator"){
  const c=equipmentCounts(),prefix=mode==="owner"?"owner-equipment-":"equipment-",canBattery=mode==="owner"||can("batteryActions"),canMaint=mode==="owner"||can("maintenance");
  const tasks=[];
  data.vehicles.filter(v=>v.active!==false&&!v.currentBatteryId&&v.manualStatus!=="maintenance").forEach(v=>{const r=recommendedBattery(v);tasks.push(`<div class="attention-row"><div>${svg("i-battery")}<span><strong>${esc(v.name)} needs a battery</strong><small>${r?`Use ${esc(r.code)} — least-used compatible battery`:"No compatible Ready battery"}</small></span></div>${canBattery&&r?`<button data-${prefix}assign="${v.id}">Assign ${esc(r.code)}</button>`:""}</div>`)});
  data.batteries.filter(b=>b.status==="needs_charge").forEach(b=>tasks.push(`<div class="attention-row"><div>${svg("i-battery")}<span><strong>${esc(b.code)} needs charging</strong><small>Connect it to the charger, then start charging here.</small></span></div>${canBattery?`<button data-${prefix}batt-action="charge" data-batt="${b.id}">Start Charging</button>`:""}</div>`));
  data.vehicles.filter(v=>v.active!==false&&v.manualStatus==="maintenance").forEach(v=>tasks.push(`<div class="attention-row"><div>${svg("i-wrench")}<span><strong>${esc(v.name)} is in maintenance</strong><small>It stays unavailable until marked ready.</small></span></div>${canMaint?`<button data-${prefix}repair="${v.id}">Mark Ready</button>`:""}</div>`));
  return `<div class="attention-head"><div><strong>${tasks.length?`${tasks.length} action${tasks.length===1?"":"s"} need attention`:"Everything ready"}</strong><span>${tasks.length?"Do only the physical step; the system updates the records automatically.":`${c.ready} spare batteries ready · ${c.charging} charging`}</span></div><div class="attention-counts"><span>${c.ready} Ready</span><span>${c.needsCharge} Charge</span><span>${c.maintenance} Issue</span></div></div>${tasks.length?`<div class="attention-list">${tasks.join("")}</div>`:`<div class="all-good">${svg("i-check")} No equipment action required right now.</div>`}`;
}
function renderBatteries(){
  if(!$("#batterySummary")||!$("#batteryStation")) return;
  const attention=$("#equipmentAttention"),vehicles=$("#equipmentVehicles");
  if(attention)attention.innerHTML=equipmentAttentionHtml("operator");
  if(vehicles)vehicles.innerHTML=data.vehicles.filter(v=>v.active!==false).map(v=>equipmentVehicleCard(v,"operator")).join("")||`<div class="notice">No active vehicles configured.</div>`;
  const counts={ready:0,installed:0,in_use:0,charging:0,needs_charge:0,maintenance:0};
  data.batteries.forEach(b=>counts[b.status]=(counts[b.status]||0)+1);
  const total=data.batteries.length;
  $("#batterySummary").innerHTML=[
    ["all","Total",total],["ready","Ready",counts.ready||0],["in_use","In Use",(counts.in_use||0)+(counts.installed||0)],["charging","Charging",counts.charging||0],["needs_charge","Needs Charge",counts.needs_charge||0],["maintenance","Issue",counts.maintenance||0]
  ].map(([k,l,n])=>`<button class="battery-summary-card ${memory.batteryFilter===k?"active":""}" data-battery-filter="${k}"><strong>${n}</strong><span>${l}</span></button>`).join("");
  const list=data.batteries.filter(b=>memory.batteryFilter==="all"||(memory.batteryFilter==="in_use"?["in_use","installed"].includes(b.status):b.status===memory.batteryFilter)).slice().sort((a,b)=>String(a.code).localeCompare(String(b.code),undefined,{numeric:true,sensitivity:"base"}));
  $("#batteryStation").innerHTML=(!can("batteryActions")?`<div class="notice read-only-banner">Equipment controls are read-only for this operator.</div>`:"")+(list.length?list.map(b=>{const t=batteryType(b.typeId),v=vehicle(b.assignedVehicleId);const actions=!can("batteryActions")?"":b.status==="needs_charge"?`<button class="primary-mini" data-batt-action="charge" data-batt="${b.id}">Start Charging</button>`:b.status==="charging"?`<button class="primary-mini" data-batt-action="ready" data-batt="${b.id}">Mark Ready</button>`:b.status==="maintenance"?`<button class="primary-mini" data-batt-action="ready" data-batt="${b.id}">Return to Ready</button>`:b.status==="ready"?`<button data-batt-action="issue" data-batt="${b.id}">Report Issue</button>`:"";return `<article id="battery-card-${esc(b.id)}" class="battery-card battery-${esc(b.status)} ${memory.highlightBatteryId===b.id?"battery-new-highlight":""}"><div class="battery-card-top"><div><h3>${esc(b.code)}</h3><p>${esc(t?.name||"Battery")} · ${esc(t?.voltage||"")} ${esc(t?.capacity||"")}</p></div><span class="battery-status">${esc(b.status.replaceAll("_"," "))}</span></div><p>${v?`Assigned: ${esc(v.name)}`:`Cycles: ${b.cycles||0} · Runtime: ${b.totalRuntimeMin||0} min`}</p><div class="actions">${actions}</div></article>`}).join(""):`<div class="notice">No batteries match this filter.</div>`);
  $$('[data-battery-filter]').forEach(b=>b.onclick=()=>{memory.batteryFilter=b.dataset.batteryFilter;renderBatteries()});
  $$('[data-batt-action]').forEach(b=>b.onclick=()=>batteryAction(b.dataset.batt,b.dataset.battAction));
  $$('[data-equipment-assign]').forEach(b=>b.onclick=()=>assignRecommendedBattery(b.dataset.equipmentAssign));
  $$('[data-equipment-swap]').forEach(b=>b.onclick=()=>openBatterySwap(b.dataset.equipmentSwap));
  $$('[data-equipment-issue]').forEach(b=>b.onclick=()=>openMaintenance(b.dataset.equipmentIssue));
  $$('[data-equipment-repair]').forEach(b=>b.onclick=()=>markRepaired(b.dataset.equipmentRepair));
  $$('[data-equipment-batt-action]').forEach(b=>b.onclick=()=>batteryAction(b.dataset.batt,b.dataset.equipmentBattAction));
  if(memory.highlightBatteryId){const id=memory.highlightBatteryId;requestAnimationFrame(()=>document.getElementById("battery-card-"+id)?.scrollIntoView({block:"center",behavior:"smooth"}));setTimeout(()=>{if(memory.highlightBatteryId===id){memory.highlightBatteryId=null;renderBatteries()}},1800)}
}
function renderSumo(){
  if(!$("#sumoActive")||!$("#sumoHistory"))return;
  const today=todaySumoMatches(),readyVehicles=data.vehicles.filter(v=>v.active!==false&&isSumoVehicle(v)&&vehicleState(v)==="available"),active=activeSumoMatches();
  $("#sumoCountText").textContent=`${today.length} match${today.length===1?"":"es"} today`;
  $("#sumoSummary").innerHTML=`<div><strong>${active.length}</strong><span>Active Matches</span></div><div><strong>${readyVehicles.length}</strong><span>Ready Sumo Vehicles</span></div><div><strong>${today.reduce((a,m)=>a+(m.participants?.length||0),0)}</strong><span>Players Today</span></div>${can("viewRevenue")?`<div><strong>${money(sumoRevenue(today))}</strong><span>Sumo Revenue</span></div>`:""}`;
  if(!active.length){
    $("#sumoActive").innerHTML=`<div class="sumo-empty"><div class="sumo-empty-icon">${svg("i-sumo")}</div><div><strong>No Sumo match running</strong><p>${readyVehicles.length>=4?`${readyVehicles.length} Sumo vehicles are ready.`:`You need at least 4 ready RC Sumo vehicles. Add them in Owner Console → Equipment and assign batteries.`}</p></div>${readyVehicles.length>=4?`<button class="primary compact-primary" data-open-sumo>${svg("i-plus")} New Match</button>`:""}</div>`;
  } else {
    $("#sumoActive").innerHTML=active.map(m=>sumoMatchCard(m)).join("");
  }
  $("#sumoHistory").innerHTML=data.sumoMatches.slice().reverse().slice(0,12).map(m=>sumoHistoryRow(m)).join("")||`<div class="notice">No Sumo matches yet.</div>`;
  $$('[data-open-sumo]').forEach(b=>b.onclick=()=>openSumoMatch());
  $$('[data-sumo-eliminate]').forEach(b=>b.onclick=()=>eliminateSumoPlayer(b.dataset.sumoEliminate,b.dataset.participant));
  $$('[data-sumo-undo]').forEach(b=>b.onclick=()=>undoSumoElimination(b.dataset.sumoUndo));
  $$('[data-sumo-ack]').forEach(b=>b.onclick=()=>ackSumoMatch(b.dataset.sumoAck));
  $$('[data-sumo-complete]').forEach(b=>b.onclick=()=>completeSumoMatch(b.dataset.sumoComplete,false));
  $$('[data-sumo-draw]').forEach(b=>b.onclick=()=>completeSumoMatch(b.dataset.sumoDraw,true));
}
function sumoMatchCard(m){
  const pkg=sumoPackageBy(m.packageId),alive=sumoActivePlayers(m),status=sumoStatus(m),remaining=sumoRemainingMs(m),winner=alive.length===1?alive[0]:null;
  const participantCards=(m.participants||[]).map((p,i)=>{
    const eliminated=!!p.eliminatedAt;
    return `<div class="sumo-player ${eliminated?"eliminated":winner?.id===p.id?"winner":"active"}"><div class="sumo-player-head"><div><strong>${esc(p.name||`Player ${i+1}`)}</strong><span>${esc(p.vehicleName||vehicle(p.vehicleId)?.name||"Vehicle")}</span></div><b>${eliminated?(p.place?`${p.place}${ordinalSuffix(p.place)}`:"OUT"):winner?.id===p.id?"WINNER":"IN"}</b></div>${!eliminated&&alive.length>1?`<button data-sumo-eliminate="${m.id}" data-participant="${p.id}">ELIMINATE</button>`:""}</div>`;
  }).join("");
  const timer=remaining===null?`<div class="sumo-clock no-limit">NO TIME LIMIT</div>`:`<div class="sumo-clock ${status==="time_up"?"time-up":""}">${fmt(remaining)}</div>`;
  const controls=[];
  if((m.participants||[]).some(p=>p.eliminatedAt))controls.push(`<button class="secondary" data-sumo-undo="${m.id}">${svg("i-undo")} Undo Last</button>`);
  if(status==="time_up"&&!m.alarmAcknowledged)controls.push(`<button class="secondary" data-sumo-ack="${m.id}">${svg("i-alert")} Acknowledge</button>`);
  if(winner)controls.push(`<button class="primary compact-primary" data-sumo-complete="${m.id}">${svg("i-trophy")} Complete Match</button>`);
  if(status==="time_up"&&alive.length>1)controls.push(`<button class="secondary" data-sumo-draw="${m.id}">End as Draw</button>`);
  return `<article class="sumo-match-card ${status}"><div class="sumo-match-head"><div><div class="eyebrow">${esc(m.matchNumber)}</div><h3>${esc(pkg?.name||m.packageName||"Sumo Match")}</h3><p>${m.participants.length} players · ${money(m.totalAmount)} · ${esc(m.paymentMethod||"")}</p></div>${timer}</div>${winner?`<div class="sumo-winner-banner">${svg("i-trophy")} <strong>${esc(winner.name||"Player")} is the last one standing</strong></div>`:status==="time_up"?`<div class="sumo-timeup-banner">Time is up. Eliminate remaining players to choose a winner, or end as draw.</div>`:""}<div class="sumo-player-grid">${participantCards}</div><div class="sumo-controls">${controls.join("")}</div></article>`;
}
function ordinalSuffix(n){const j=n%10,k=n%100;return j===1&&k!==11?"st":j===2&&k!==12?"nd":j===3&&k!==13?"rd":"th"}
function sumoHistoryRow(m){const winner=(m.participants||[]).find(p=>p.place===1),status=m.endedAt?(m.draw?"Draw":winner?`Winner: ${winner.name}`:"Completed"):sumoStatus(m)==="time_up"?"Time Up":"Active";return `<div class="ride-row"><div><strong>${esc(m.matchNumber||m.id)}</strong><span>${m.playerCount||m.participants?.length||0} players · ${esc(status)}</span><span class="ride-id">${esc(m.packageName||sumoPackageBy(m.packageId)?.name||"Sumo")}</span></div><span>${new Date(m.startedAt).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})}</span><span class="amount">${money(m.totalAmount)}</span></div>`}
function availableSumoVehicles(){return data.vehicles.filter(v=>v.active!==false&&isSumoVehicle(v)&&vehicleState(v)==="available")}
function sumoVehicleUsage(vehicleId){let uses=0,last=0;for(const m of data.sumoMatches||[]){for(const p of m.participants||[]){if(p.vehicleId!==vehicleId)continue;uses++;last=Math.max(last,Number(m.endedAt||m.startedAt||0))}}return {uses,last}}
function rankedAvailableSumoVehicles(){return availableSumoVehicles().slice().sort((a,b)=>{const A=sumoVehicleUsage(a.id),B=sumoVehicleUsage(b.id);return A.uses-B.uses||A.last-B.last||String(a.code||a.name).localeCompare(String(b.code||b.name),undefined,{numeric:true})})}
function autoAssignSumoVehicles(preserveNames=true){const available=rankedAvailableSumoVehicles(),count=memory.sumoPlayerCount,old=memory.sumoAssignments||{};memory.sumoAssignments={};for(let i=0;i<count;i++)memory.sumoAssignments[i]={name:preserveNames?(old[i]?.name||""):"",vehicleId:available[i]?.id||null}}
function cycleSumoVehicle(slot){const available=rankedAvailableSumoVehicles(),current=memory.sumoAssignments[slot]?.vehicleId,taken=new Set(Object.entries(memory.sumoAssignments).filter(([k])=>Number(k)!==Number(slot)).map(([,a])=>a?.vehicleId).filter(Boolean)),options=available.filter(v=>!taken.has(v.id));if(!options.length)return toast("No other ready Sumo vehicle available");const idx=Math.max(-1,options.findIndex(v=>v.id===current));memory.sumoAssignments[slot].vehicleId=options[(idx+1)%options.length].id;renderSumoSetup()}
function openSumoMatch(prefill=null,queueId=null){
  if(!requirePerm("sumo"))return;
  const available=rankedAvailableSumoVehicles();if(available.length<4)return toast("At least 4 ready Sumo vehicles are required");
  memory.sumoPlayerCount=Math.min(5,Math.max(4,Number(prefill?.playerCount)||4));memory.selectedSumoPackage=data.sumoPackages.find(p=>p.active!==false&&memory.sumoPlayerCount>=p.minPlayers&&memory.sumoPlayerCount<=p.maxPlayers)?.id||data.sumoPackages.find(p=>p.active!==false)?.id||null;memory.sumoPayment=data.settings.paymentMethods.includes(memory.lastPayment)?memory.lastPayment:(data.settings.paymentMethods[0]||"Cash");memory.sumoAssignments={};memory.sumoQueueId=queueId;
  for(let i=0;i<memory.sumoPlayerCount;i++)memory.sumoAssignments[i]={name:i===0?(prefill?.name||""):"",vehicleId:null};
  autoAssignSumoVehicles(true);renderSumoSetup();if($("#startSumoMatch"))$("#startSumoMatch").disabled=false;open("sumoModal");
}
function renderSumoSetup(){
  const count=memory.sumoPlayerCount,available=rankedAvailableSumoVehicles();
  // Repair assignments if availability changed while setup was open, then auto-fill any empty slots.
  const validIds=new Set(available.map(v=>v.id)),used=new Set();
  for(let i=0;i<count;i++){const a=memory.sumoAssignments[i]||(memory.sumoAssignments[i]={name:"",vehicleId:null});if(!validIds.has(a.vehicleId)||used.has(a.vehicleId))a.vehicleId=null;if(a.vehicleId)used.add(a.vehicleId)}
  for(let i=0;i<count;i++){const a=memory.sumoAssignments[i];if(a.vehicleId)continue;const next=available.find(v=>!used.has(v.id));if(next){a.vehicleId=next.id;used.add(next.id)}}
  $("#sumoPlayerCountButtons").innerHTML=[4,5].map(n=>`<button class="${count===n?"active":""}" data-sumo-count="${n}" ${available.length<n?"disabled":""}>${n}</button>`).join("");
  const packages=data.sumoPackages.filter(p=>p.active!==false&&count>=p.minPlayers&&count<=p.maxPlayers);if(!packages.some(p=>p.id===memory.selectedSumoPackage))memory.selectedSumoPackage=packages[0]?.id||null;
  $("#sumoPackageButtons").innerHTML=packages.map(p=>`<button class="choice-card sumo-package-card ${memory.selectedSumoPackage===p.id?"active":""}" data-sumo-package="${p.id}"><strong>${esc(p.name)}</strong><span>${p.pricingMode==="per_player"?`${money(p.price)}/player`:`${money(p.price)}/match`} · ${p.durationMinutes?`${p.durationMinutes} min`:"No limit"}</span></button>`).join("")||`<div class="notice">No active Sumo package supports ${count} players.</div>`;
  $("#sumoParticipants").innerHTML=Array.from({length:count},(_,i)=>{const a=memory.sumoAssignments[i],v=vehicle(a.vehicleId);return `<div class="sumo-setup-player compact"><div class="sumo-player-number">P${i+1}</div><input aria-label="Player ${i+1} name" data-sumo-name="${i}" maxlength="30" autocomplete="off" value="${esc(a.name||"")}" placeholder="Player ${i+1}"><button class="sumo-assigned-vehicle" type="button" data-sumo-cycle="${i}" title="Tap to change vehicle"><strong>${esc(v?.code||"No vehicle")}</strong><span>${esc(v?.name||"Tap to assign")}</span></button></div>`}).join("");
  $("#sumoPaymentButtons").innerHTML=data.settings.paymentMethods.map(m=>`<button class="${memory.sumoPayment===m?"active":""}" data-sumo-payment="${esc(m)}">${esc(m)}</button>`).join("");
  const pkg=sumoPackageBy(memory.selectedSumoPackage),total=pkg?(pkg.pricingMode==="per_player"?pkg.price*count:pkg.price):0;$("#sumoTotal").textContent=money(total);
  $$('[data-sumo-count]').forEach(b=>b.onclick=()=>{const n=Number(b.dataset.sumoCount);if(available.length<n)return;const old=memory.sumoAssignments;memory.sumoPlayerCount=n;memory.sumoAssignments={};for(let i=0;i<n;i++)memory.sumoAssignments[i]={name:old[i]?.name||"",vehicleId:null};autoAssignSumoVehicles(true);renderSumoSetup()});
  $$('[data-sumo-package]').forEach(b=>b.onclick=()=>{memory.selectedSumoPackage=b.dataset.sumoPackage;renderSumoSetup()});
  $$('[data-sumo-payment]').forEach(b=>b.onclick=()=>{memory.sumoPayment=b.dataset.sumoPayment;memory.lastPayment=memory.sumoPayment;renderSumoSetup()});
  $$('[data-sumo-name]').forEach(inp=>inp.oninput=()=>{memory.sumoAssignments[Number(inp.dataset.sumoName)].name=inp.value});
  $$('[data-sumo-cycle]').forEach(b=>b.onclick=()=>cycleSumoVehicle(Number(b.dataset.sumoCycle)));
  if($("#sumoReassign"))$("#sumoReassign").onclick=()=>{autoAssignSumoVehicles(true);renderSumoSetup();toast("Sumo vehicles auto-assigned")};
}
function startSumoMatch(){
  if(!requirePerm("sumo"))return;const pkg=sumoPackageBy(memory.selectedSumoPackage);if(!pkg)return toast("Choose a Sumo package");const count=memory.sumoPlayerCount,assignments=Array.from({length:count},(_,i)=>memory.sumoAssignments[i]);if(assignments.some(a=>!a?.vehicleId))return toast("Assign a vehicle to every player");const ids=assignments.map(a=>a.vehicleId);if(new Set(ids).size!==ids.length)return toast("Each player needs a different vehicle");const vehicles=ids.map(vehicle);if(vehicles.some(v=>!v||vehicleState(v)!=="available"||!isSumoVehicle(v)))return toast("One of the Sumo vehicles is no longer ready");const now=Date.now(),participants=[];
  if(vehicles.some(v=>!battery(v.currentBatteryId)))return toast("Every Sumo vehicle needs a battery");
  if($("#startSumoMatch").disabled)return;$("#startSumoMatch").disabled=true;
  vehicles.forEach((v,i)=>{const b=battery(v.currentBatteryId);b.status="in_use";b.assignedVehicleId=v.id;participants.push({id:uid("sp"),name:assignments[i].name.trim()||`Player ${i+1}`,vehicleId:v.id,vehicleName:v.name,batteryId:b.id,eliminatedAt:null,place:null})});
  memory.lastPayment=memory.sumoPayment;const total=pkg.pricingMode==="per_player"?pkg.price*count:pkg.price,match={id:uid("sumo"),matchNumber:nextSumoNumber(),packageId:pkg.id,packageName:pkg.name,pricingMode:pkg.pricingMode,unitPrice:pkg.price,playerCount:count,totalAmount:total,paymentMethod:memory.sumoPayment,payments:[{method:memory.sumoPayment,amount:total,at:now}],participants,startedAt:now,endsAt:pkg.durationMinutes?now+pkg.durationMinutes*60000:null,endedAt:null,date:localDateKey(now),winnerParticipantId:null,draw:false,alarmAcknowledged:false,createdBy:actor()};data.sumoMatches.push(match);if(memory.sumoQueueId){data.queue=data.queue.filter(q=>q.id!==memory.sumoQueueId);memory.sumoQueueId=null}save();close("sumoModal");unlockAudio();render();switchView("sumo",false);toast("Sumo match started")
}
function eliminateSumoPlayer(matchId,participantId){const m=data.sumoMatches.find(x=>x.id===matchId);if(!m||m.endedAt)return;const alive=sumoActivePlayers(m),p=m.participants.find(x=>x.id===participantId);if(!p||p.eliminatedAt||alive.length<=1)return;p.eliminatedAt=Date.now();p.place=alive.length;const remain=sumoActivePlayers(m);m.winnerParticipantId=remain.length===1?remain[0].id:null;save();renderSumo();toast(remain.length===1?`${remain[0].name} is the winner`:`${p.name} eliminated`)}
function undoSumoElimination(matchId){const m=data.sumoMatches.find(x=>x.id===matchId);if(!m||m.endedAt)return;const last=(m.participants||[]).filter(p=>p.eliminatedAt).sort((a,b)=>b.eliminatedAt-a.eliminatedAt)[0];if(!last)return toast("Nothing to undo");last.eliminatedAt=null;last.place=null;m.winnerParticipantId=null;save();renderSumo();toast("Last elimination undone")}
function ackSumoMatch(matchId){const m=data.sumoMatches.find(x=>x.id===matchId);if(!m)return;m.alarmAcknowledged=true;save();stopAlertIfClear();renderSumo();toast("Sumo alarm acknowledged")}
function completeSumoMatch(matchId,draw=false){const m=data.sumoMatches.find(x=>x.id===matchId);if(!m||m.endedAt)return;const alive=sumoActivePlayers(m);if(!draw&&alive.length!==1)return toast("One player must remain to complete with a winner");if(draw&&!confirm("End this Sumo match as a draw?"))return;const now=Date.now();m.endedAt=now;m.draw=draw;m.alarmAcknowledged=true;if(!draw&&alive[0]){alive[0].place=1;m.winnerParticipantId=alive[0].id}for(const p of m.participants){const v=vehicle(p.vehicleId),b=battery(v?.currentBatteryId||p.batteryId);if(b){b.status="installed";b.assignedVehicleId=v?.id||p.vehicleId;b.totalRuntimeMin=(b.totalRuntimeMin||0)+minutesBetween(m.startedAt,now);b.cycles=(b.cycles||0)+1}}save();stopAlertIfClear();render();toast(draw?"Sumo match ended as draw":"Sumo match completed")}

function updateQueueBadge(){const n=data.queue.length,e=$("#queueBadge");if(!e)return;e.textContent=n;e.classList.toggle("hidden",!n)}

function newRide(vehicleId,prefill,queueId=null){
  const v=vehicle(vehicleId);if(!v||isSumoVehicle(v))return toast("Use Sumo Battle for this vehicle");if(vehicleState(v)!=="available")return toast("Vehicle is not ready");memory.selectedVehicle=vehicleId;memory.selectedQueue=queueId;memory.selectedPackage=null;memory.payment=data.settings.paymentMethods.includes(memory.lastPayment)?memory.lastPayment:(data.settings.paymentMethods[0]||"Cash");$("#rideVehicleTitle").textContent=v.name;$("#customerName").value=prefill?.name||"";$("#customerMobile").value=prefill?.mobile||"";renderRideChoices();if($("#startRide"))$("#startRide").disabled=false;open("rideModal");
}
function renderRideChoices(){
  const v=vehicle(memory.selectedVehicle), list=data.packages.filter(p=>p.active!==false&&p.profileId===v.pricingProfileId);if(!memory.selectedPackage&&list[0])memory.selectedPackage=list[0].id;
  $("#packageButtons").innerHTML=list.map(p=>`<button class="choice-card ${memory.selectedPackage===p.id?"active":""}" data-package="${p.id}"><strong>${esc(p.name)}</strong><span>${p.minutes} min · ${money(p.price)}</span></button>`).join("")||`<div class="notice">No packages assigned to this pricing profile.</div>`;
  $("#paymentButtons").innerHTML=data.settings.paymentMethods.map(m=>`<button class="${memory.payment===m?"active":""}" data-payment="${esc(m)}">${esc(m)}</button>`).join("");
  const p=packageBy(memory.selectedPackage);$("#rideTotal").textContent=money(p?.price||0);$$('[data-package]').forEach(b=>b.onclick=()=>{memory.selectedPackage=b.dataset.package;renderRideChoices()});$$('[data-payment]').forEach(b=>b.onclick=()=>{memory.payment=b.dataset.payment;memory.lastPayment=memory.payment;renderRideChoices()});
}
$("#startRide").onclick=()=>{
  const v=vehicle(memory.selectedVehicle),p=packageBy(memory.selectedPackage);if(!v||!p)return toast("Choose a package");if(vehicleState(v)!=="available")return toast("Vehicle is no longer available");if($("#startRide").disabled)return;$("#startRide").disabled=true;memory.lastPayment=memory.payment;const now=Date.now(),b=battery(v.currentBatteryId);if(!b){$("#startRide").disabled=false;return toast("Assign a battery first")}b.status="in_use";b.assignedVehicleId=v.id;
  const ride={id:uid("ride"),rideNumber:nextRideNumber(),vehicleId:v.id,vehicleName:v.name,customer:$("#customerName").value.trim(),mobile:$("#customerMobile").value.trim(),packageId:p.id,baseMinutes:p.minutes,baseAmount:p.price,extensions:[],discount:0,totalAmount:p.price,payments:[{method:memory.payment,amount:p.price,at:now}],startedAt:now,endsAt:now+p.minutes*60000,endedAt:null,date:localDateKey(now),pausedAt:null,totalPausedMs:0,endReason:null,alarmAcknowledged:false,batteryId:b.id,batteryHistory:[{batteryId:b.id,installedAt:now,removedAt:null}],createdBy:actor()};data.rides.push(ride);
  if(memory.selectedQueue){data.queue=data.queue.filter(q=>q.id!==memory.selectedQueue);memory.selectedQueue=null}
  save();close("rideModal");unlockAudio();render();toast("Ride started");
};
function openExtend(id){const r=data.rides.find(x=>x.id===id);if(!r)return;memory.selectedRide=id;memory.selectedExtension=null;const last=(r.payments||[]).at?.(-1)?.method||memory.lastPayment;memory.extensionPayment=data.settings.paymentMethods.includes(last)?last:(data.settings.paymentMethods[0]||"Cash");$("#extendVehicleTitle").textContent=r.vehicleName;renderExtensionChoices();if($("#confirmExtend"))$("#confirmExtend").disabled=false;open("extendModal")}
function renderExtensionChoices(){const r=data.rides.find(x=>x.id===memory.selectedRide),v=vehicle(r?.vehicleId);const list=data.extensions.filter(e=>e.active!==false&&e.profileId===v?.extensionProfileId);if(!memory.selectedExtension&&list[0])memory.selectedExtension=list[0].id;$("#extensionButtons").innerHTML=list.map(e=>`<button class="choice-card ${memory.selectedExtension===e.id?"active":""}" data-extension="${e.id}"><strong>+${e.minutes} min</strong><span>${esc(e.name)} · ${money(e.price)}</span></button>`).join("")||`<div class="notice">No extension options configured.</div>`;$("#extensionPaymentButtons").innerHTML=data.settings.paymentMethods.map(m=>`<button class="${memory.extensionPayment===m?"active":""}" data-ext-payment="${esc(m)}">${esc(m)}</button>`).join("");const e=extensionBy(memory.selectedExtension);$("#extensionTotal").textContent=money(e?.price||0);$$('[data-extension]').forEach(b=>b.onclick=()=>{memory.selectedExtension=b.dataset.extension;renderExtensionChoices()});$$('[data-ext-payment]').forEach(b=>b.onclick=()=>{memory.extensionPayment=b.dataset.extPayment;memory.lastPayment=memory.extensionPayment;renderExtensionChoices()})}
$("#confirmExtend").onclick=()=>{const r=data.rides.find(x=>x.id===memory.selectedRide),e=extensionBy(memory.selectedExtension);if(!r||!e)return toast("Choose an extension");if($("#confirmExtend").disabled)return;$("#confirmExtend").disabled=true;memory.lastPayment=memory.extensionPayment;const now=Date.now();r.endsAt=Math.max(r.pausedAt||now,r.endsAt)+e.minutes*60000;r.extensions.push({id:uid("rext"),extensionId:e.id,minutes:e.minutes,amount:e.price,addedAt:now,paymentMethod:memory.extensionPayment,addedBy:actor()});r.payments.push({method:memory.extensionPayment,amount:e.price,at:now});r.totalAmount=rideTotal(r);r.alarmAcknowledged=false;save();close("extendModal");stopAlertIfClear();render();toast(`Added ${e.minutes} minutes`)};
function finalizeRide(id,reason){const r=data.rides.find(x=>x.id===id);if(!r||r.endedAt)return;if($("#confirmEnd"))$("#confirmEnd").disabled=true;const now=Date.now();if(r.pausedAt){r.totalPausedMs+=(now-r.pausedAt);r.pausedAt=null}r.endedAt=now;r.endReason=reason||"Completed";r.alarmAcknowledged=true;const v=vehicle(r.vehicleId),b=battery(v?.currentBatteryId);if(b){b.status="installed";const currentSeg=[...(r.batteryHistory||[])].reverse().find(x=>!x.removedAt&&x.batteryId===b.id);const segStart=currentSeg?.installedAt||r.startedAt;if(currentSeg)currentSeg.removedAt=now;b.totalRuntimeMin=(b.totalRuntimeMin||0)+minutesBetween(segStart,now);b.cycles=(b.cycles||0)+1}save();close("endModal",true);stopAlertIfClear();render();toast("Ride completed")}
function handleCompleteRide(id){const r=data.rides.find(x=>x.id===id);if(!r)return;if(remainingMs(r)<=0&&!r.pausedAt){finalizeRide(id,"Time completed");return}openEnd(id)}
function openEnd(id){const r=data.rides.find(x=>x.id===id);if(!r)return;const isNew=memory.selectedRide!==id;memory.selectedRide=id;const rem=remainingMs(r);const reasons=rem>0?["Customer finished","Vehicle issue","Battery issue","Track issue","Other"]:["Time completed","Vehicle issue","Battery issue","Other"];if(isNew||!reasons.includes(memory.endReason))memory.endReason=reasons[0];$("#endVehicleTitle").textContent=r.vehicleName;$("#endRemaining").textContent=rem>0?`${fmt(rem)} still remaining. Select a reason before completing the ride.`:"Timer has finished. Complete the ride to make the vehicle available.";const paint=()=>{$("#endReasonButtons").innerHTML=reasons.map(x=>`<button class="choice-card ${memory.endReason===x?"active":""}" data-end-reason="${esc(x)}"><strong>${esc(x)}</strong></button>`).join("");$$('[data-end-reason]').forEach(b=>b.onclick=()=>{memory.endReason=b.dataset.endReason;paint()})};paint();if($("#confirmEnd"))$("#confirmEnd").disabled=false;open("endModal")}
$("#confirmEnd").onclick=()=>finalizeRide(memory.selectedRide,memory.endReason);
function pauseRide(id){const r=data.rides.find(x=>x.id===id);if(!r||r.pausedAt)return;r.pausedAt=Date.now();save();render();toast("Ride paused")}
function resumeRide(id){const r=data.rides.find(x=>x.id===id);if(!r||!r.pausedAt)return;const now=Date.now(),paused=now-r.pausedAt;r.endsAt+=paused;r.totalPausedMs=(r.totalPausedMs||0)+paused;r.pausedAt=null;save();render();toast("Ride resumed")}
function ackRide(id){const r=data.rides.find(x=>x.id===id);if(!r)return;r.alarmAcknowledged=true;save();stopAlertIfClear();render();toast("Alarm acknowledged")}

function assignRecommendedBattery(vehicleId){if(!requirePerm("batteryActions"))return;const v=vehicle(vehicleId);if(!v)return;const rec=recommendedBattery(v);if(!rec)return toast("No compatible Ready battery available");performBatterySwap(vehicleId,rec.id)}
function openBatterySwap(vehicleId){if(!requirePerm("batteryActions"))return;const v=vehicle(vehicleId);if(!v)return;memory.selectedVehicle=vehicleId;const r=activeRide(v.id);$("#swapVehicleTitle").textContent=v.name;const current=battery(v.currentBatteryId);$("#swapInfo").textContent=current?`Current battery: ${current.code}. ${r&&!r.pausedAt?"Choosing a replacement will pause the ride so the battery change does not use customer time.":"Choose a replacement battery."}`:"No battery currently assigned.";const list=readyBatteriesFor(v);$("#swapBatteryButtons").innerHTML=list.map((b,i)=>`<button class="choice-card ${i===0?"recommended-choice":""}" data-swap-battery="${b.id}"><strong>${esc(b.code)}${i===0?" · Recommended":""}</strong><span>${esc(batteryType(b.typeId)?.name||"Battery")} · ${b.cycles||0} cycles</span></button>`).join("")||`<div class="notice">No compatible ready batteries. Open Equipment to check charging status.</div>`;$$('[data-swap-battery]').forEach(b=>b.onclick=()=>performBatterySwap(vehicleId,b.dataset.swapBattery));open("batterySwapModal")}
function performBatterySwap(vehicleId,newId){const v=vehicle(vehicleId),old=battery(v?.currentBatteryId),fresh=battery(newId),r=activeRide(vehicleId),sm=activeSumoMatchForVehicle(vehicleId),now=Date.now();if(!v||!fresh)return;if(r&&!r.pausedAt)r.pausedAt=now;if(old){old.status="needs_charge";old.assignedVehicleId=null;if(r?.batteryHistory?.length){const current=r.batteryHistory.findLast?.(x=>!x.removedAt)||[...r.batteryHistory].reverse().find(x=>!x.removedAt);if(current){current.removedAt=now;old.totalRuntimeMin=(old.totalRuntimeMin||0)+minutesBetween(current.installedAt,now);old.cycles=(old.cycles||0)+1}}}fresh.status=(r||sm)?"in_use":"installed";fresh.assignedVehicleId=v.id;v.currentBatteryId=fresh.id;if(r){r.batteryId=fresh.id;r.batteryHistory=r.batteryHistory||[];r.batteryHistory.push({batteryId:fresh.id,installedAt:now,removedAt:null})}save();close("batterySwapModal");render();const instruction=r?`Install ${fresh.code} in ${v.name}. Ride paused — resume after the physical swap.`:old?`Install ${fresh.code} in ${v.name}. ${old.code} now needs charging.`:`Install ${fresh.code} in ${v.name}.`;toast(instruction)}
function batteryAction(id,action){if(!requirePerm("batteryActions"))return;const b=battery(id);if(!b)return;const assigned=b.assignedVehicleId?vehicle(b.assignedVehicleId):null;if(action==="charge"){b.status="charging";b.chargeStartedAt=Date.now()}if(action==="ready"){if(assigned&&assigned.currentBatteryId===b.id)assigned.currentBatteryId=null;b.status="ready";b.chargeStartedAt=null;b.assignedVehicleId=null}if(action==="issue"){if(assigned&&assigned.currentBatteryId===b.id)assigned.currentBatteryId=null;b.status="maintenance";b.chargeStartedAt=null;b.assignedVehicleId=null}save();render();toast(action==="charge"?`${b.code} marked Charging`:action==="ready"?`${b.code} is Ready`:`${b.code} removed from service`)}

function openMaintenance(vehicleId){if(!requirePerm("maintenance"))return;memory.selectedVehicle=vehicleId;memory.selectedMaintenanceReason="Vehicle issue";$("#maintenanceVehicleTitle").textContent=vehicle(vehicleId)?.name||"Vehicle";$("#maintenanceNote").value="";renderMaintenanceReasons();open("maintenanceModal")}
function renderMaintenanceReasons(){const reasons=["Vehicle issue","Steering / servo","Motor / drive","Wheel / track","Body damage","Other"];$("#maintenanceReasonButtons").innerHTML=reasons.map(x=>`<button class="choice-card ${memory.selectedMaintenanceReason===x?"active":""}" data-maint-reason="${esc(x)}"><strong>${esc(x)}</strong></button>`).join("");$$('[data-maint-reason]').forEach(b=>b.onclick=()=>{memory.selectedMaintenanceReason=b.dataset.maintReason;renderMaintenanceReasons()})}
$("#confirmMaintenance").onclick=()=>{const v=vehicle(memory.selectedVehicle);if(!v)return;if(activeRide(v.id)||activeSumoMatchForVehicle(v.id))return toast("Complete the active ride or Sumo match first");v.manualStatus="maintenance";data.maintenance.push({id:uid("mnt"),vehicleId:v.id,vehicleName:v.name,reason:memory.selectedMaintenanceReason,note:$("#maintenanceNote").value.trim(),reportedAt:Date.now(),resolvedAt:null});save();close("maintenanceModal");render();toast("Vehicle marked for maintenance")};
function markRepaired(id){if(!requirePerm("maintenance"))return;const v=vehicle(id);if(!v)return;v.manualStatus="available";const openIssue=[...data.maintenance].reverse().find(m=>m.vehicleId===id&&!m.resolvedAt);if(openIssue)openIssue.resolvedAt=Date.now();save();render();toast("Vehicle returned to service")}

function renderQueueActivityForm(){const sumoAllowed=can("sumo");if(memory.queueActivityType==="sumo"&&!sumoAllowed)memory.queueActivityType="ride";$$('[data-queue-activity]').forEach(b=>{b.classList.toggle("active",b.dataset.queueActivity===memory.queueActivityType);if(b.dataset.queueActivity==="sumo")b.hidden=!sumoAllowed});$("#queueSumoPlayers")?.classList.toggle("hidden",memory.queueActivityType!=="sumo");$("#queueNameLabel").childNodes[0].textContent=memory.queueActivityType==="sumo"?"Group / lead customer name":"Customer name";$$('[data-queue-players]').forEach(b=>b.classList.toggle("active",Number(b.dataset.queuePlayers)===memory.queuePlayerCount))}
function openQueueModal(){if(!requirePerm("queue"))return;memory.queueActivityType="ride";memory.queuePlayerCount=4;$("#queueName").value="";$("#queueMobile").value="";renderQueueActivityForm();if($("#saveQueue"))$("#saveQueue").disabled=false;open("queueModal")}
if($("#addQueue")) $("#addQueue").onclick=openQueueModal;
$$('[data-queue-activity]').forEach(b=>b.onclick=()=>{memory.queueActivityType=b.dataset.queueActivity;renderQueueActivityForm()});$$('[data-queue-players]').forEach(b=>b.onclick=()=>{memory.queuePlayerCount=Number(b.dataset.queuePlayers);renderQueueActivityForm()});
$("#saveQueue").onclick=()=>{const name=$("#queueName").value.trim();if(!name)return toast(memory.queueActivityType==="sumo"?"Enter group or lead customer name":"Enter customer name");if($("#saveQueue").disabled)return;$("#saveQueue").disabled=true;data.queue.push({id:uid("q"),name,mobile:$("#queueMobile").value.trim(),activityType:memory.queueActivityType,playerCount:memory.queueActivityType==="sumo"?memory.queuePlayerCount:null,addedAt:Date.now()});save();close("queueModal");render();toast(memory.queueActivityType==="sumo"?"Sumo group added to queue":"Added to queue")};
function removeQueue(id){if(!requirePerm("queue"))return;data.queue=data.queue.filter(q=>q.id!==id);save();render();toast("Removed from queue")}
function openQueueStart(id){if(!requirePerm("queue"))return;const q=data.queue.find(x=>x.id===id);if(!q)return;if(q.activityType==="sumo"){close("queueStartModal",true);openSumoMatch(q,id);return}memory.selectedQueue=id;const free=data.vehicles.filter(v=>vehicleState(v)==="available"&&!isSumoVehicle(v));if(free.length===1){newRide(free[0].id,q,id);toast(`${free[0].name} auto-selected`);return}$("#queueCustomerTitle").textContent=q.name;$("#queueVehicleButtons").innerHTML=free.map(v=>`<button class="choice-card" data-queue-vehicle="${v.id}"><strong>${esc(v.name)}</strong><span>${esc(v.code)} · ${esc(vehicleType(v.typeId)?.name||"Vehicle")}</span></button>`).join("")||`<div class="notice">No vehicle is currently available.</div>`;$$('[data-queue-vehicle]').forEach(b=>b.onclick=()=>{close("queueStartModal",true);if(historyReady)setHistory(memory.currentView,null,"replace");newRide(b.dataset.queueVehicle,q,id)});open("queueStartModal")}

function switchView(name,push=true){if(!can(name))return toast("Access not enabled for this operator");const changed=memory.currentView!==name;memory.currentView=name;$$('.view').forEach(v=>v.classList.toggle('active',v.id===`view-${name}`));$$('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===name));if(name==="rides")renderRideHistory();if(name==="sumo")renderSumo();if(name==="batteries")renderBatteries();if(push&&changed&&historyReady)setHistory(name,null,"push");window.scrollTo({top:0,behavior:"smooth"})}
$$('[data-view]').forEach(b=>b.onclick=()=>switchView(b.dataset.view));
if($("#newSumoMatch"))$("#newSumoMatch").onclick=()=>openSumoMatch();if($("#startSumoMatch"))$("#startSumoMatch").onclick=startSumoMatch;
if($("#rideSearch")) $("#rideSearch").addEventListener("input",renderRideHistory);$$('[data-range]').forEach(b=>b.onclick=()=>{memory.rideRange=b.dataset.range;$$('[data-range]').forEach(x=>x.classList.toggle('active',x===b));renderRideHistory()});

$("#adminBtn").onclick=()=>{if(memory.currentUser?.role!=="owner")return;memory.ownerUnlocked=true;memory.ownerTab="overview";renderOwner();open("ownerModal")};
$("#ownerTabs").onclick=e=>{const b=e.target.closest('[data-owner-tab]');if(!b)return;memory.ownerTab=b.dataset.ownerTab;renderOwner()};
function renderOwner(){
  if(["fleet","batteries","maintenance"].includes(memory.ownerTab))memory.ownerTab="equipment";
  $$('[data-owner-tab]').forEach(b=>b.classList.toggle('active',b.dataset.ownerTab===memory.ownerTab));const c=$("#ownerContent");
  if(memory.ownerTab==="overview")c.innerHTML=ownerOverview();
  if(memory.ownerTab==="eod")c.innerHTML=ownerEod();
  if(memory.ownerTab==="equipment")c.innerHTML=ownerEquipment();
  if(memory.ownerTab==="pricing")c.innerHTML=ownerPricing();
  if(memory.ownerTab==="activities")c.innerHTML=ownerActivities();
  if(memory.ownerTab==="staff")c.innerHTML=ownerStaff();
  if(memory.ownerTab==="settings")c.innerHTML=ownerSettings();
  if(memory.ownerTab==="backup")c.innerHTML=ownerBackup();
  if(["equipment","pricing","activities","staff","settings"].includes(memory.ownerTab)) c.insertAdjacentHTML("afterbegin",`<div class="owner-autosave-note">${svg("i-check")} Routine operations are one-tap. Detailed setup is collapsed below and auto-saves when you leave a field.</div>`);
  const ownerNames={overview:"Overview",eod:"End of Day",equipment:"Equipment Control",pricing:"Ride Pricing",activities:"Activities & Sumo",staff:"Staff & Access",settings:"Business Settings",backup:"Backup & Data"};if($("#ownerConsoleTitle"))$("#ownerConsoleTitle").textContent=ownerNames[memory.ownerTab]||"Owner Console";
  $$(`[data-owner-goto]`).forEach(b=>b.onclick=()=>{memory.ownerTab=b.dataset.ownerGoto;renderOwner();$("#ownerContent")?.scrollTo({top:0,behavior:"smooth"})});
  bindOwnerActions();
}
function ownerOverview(){
  const date=localDateKey(),salesInfo=salesBreakdownForDate(date),expInfo=expenseBreakdownForDate(date),rides=salesInfo.rides,sumo=salesInfo.sumo,total=salesInfo.sales,expenses=expInfo.total,net=total-expenses;
  const byVehicle=data.vehicles.filter(v=>!isSumoVehicle(v)).map(v=>{const vr=rides.filter(r=>r.vehicleId===v.id);return {v,count:vr.length,rev:totalRevenue(vr)}}).sort((a,b)=>b.rev-a.rev);
  return `<div class="owner-home-grid"><button class="owner-module eod-module" data-owner-goto="eod">${svg("i-receipt")}<strong>End of Day</strong><span>Sales, expenses, cash check and daily closing in one place.</span></button><button class="owner-module featured-module" data-owner-goto="equipment">${svg("i-battery")}<strong>Equipment</strong><span>Vehicles, battery rack, charging and maintenance in one simple control screen.</span></button><button class="owner-module" data-owner-goto="pricing">${svg("i-history")}<strong>Ride Pricing</strong><span>Timed ride packages, extensions and profiles.</span></button><button class="owner-module" data-owner-goto="activities">${svg("i-sumo")}<strong>Activities & Sumo</strong><span>Configure Sumo pricing and quickly add Sumo vehicles.</span></button><button class="owner-module" data-owner-goto="staff">${svg("i-users")}<strong>Staff & Access</strong><span>Operator accounts, PINs and permissions.</span></button><button class="owner-module" data-owner-goto="settings">${svg("i-settings")}<strong>Settings</strong><span>Business name, timer warning and ringer settings.</span></button></div><div class="owner-metrics"><div class="metric"><strong>${money(total)}</strong><span>Today's Sales</span></div><div class="metric expense-metric"><strong>${money(expenses)}</strong><span>Today's Expenses</span></div><div class="metric net-metric"><strong>${money(net)}</strong><span>Net After Expenses</span></div><div class="metric"><strong>${rides.length+sumo.length}</strong><span>Transactions</span></div></div><div class="owner-grid two" style="margin-top:10px"><div class="panel"><h3>Activity Sales</h3><table class="simple-table"><tr><td>Timed Rides</td><td>${money(totalRevenue(rides))}</td></tr><tr><td>Sumo Battle</td><td>${money(sumoRevenue(sumo))}</td></tr><tr><td><strong>Total Sales</strong></td><td><strong>${money(total)}</strong></td></tr></table></div><div class="panel"><h3>Payments</h3><table class="simple-table"><tr><td>Cash</td><td>${money(salesInfo.by.Cash)}</td></tr><tr><td>UPI</td><td>${money(salesInfo.by.UPI)}</td></tr><tr><td>Other</td><td>${money(salesInfo.by.Other)}</td></tr></table></div></div><div class="panel" style="margin-top:10px"><h3>Timed Ride Fleet Performance</h3><table class="simple-table"><thead><tr><th>Vehicle</th><th>Rides</th><th>Revenue</th></tr></thead><tbody>${byVehicle.map(x=>`<tr><td>${esc(x.v.name)}</td><td>${x.count}</td><td>${money(x.rev)}</td></tr>`).join("")||`<tr><td colspan="3">No timed rides yet.</td></tr>`}</tbody></table></div>`
}
function ownerEod(){
  const date=memory.eodDate||localDateKey(),salesInfo=salesBreakdownForDate(date),expInfo=expenseBreakdownForDate(date),closing=eodClosingForDate(date),net=salesInfo.sales-expInfo.total,expectedCash=salesInfo.by.Cash-expInfo.by.Cash,closedDiff=closing?.actualCash==null?null:closing.actualCash-expectedCash;
  const activityCount=salesInfo.rides.length+salesInfo.sumo.length,openActivities=salesInfo.rides.filter(r=>!r.endedAt).length+salesInfo.sumo.filter(m=>!m.endedAt).length,changedSinceClose=!!closing&&(Number(closing.salesTotal||0)!==Number(salesInfo.sales||0)||Number(closing.expenseTotal||0)!==Number(expInfo.total||0));
  const expenseRows=expInfo.items.slice().sort((a,b)=>(b.createdAt||0)-(a.createdAt||0)).map(e=>`<div class="expense-row"><div><strong>${esc(e.category)}</strong><span>${e.note?`${esc(e.note)} · `:""}${esc(e.paymentMethod)} · ${new Date(e.createdAt||Date.now()).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})}</span></div><b>${money(e.amount)}</b><button class="icon-btn expense-delete" type="button" aria-label="Delete expense" data-delete-expense="${e.id}">${svg("i-trash")}</button></div>`).join("")||`<div class="notice">No expenses recorded for this day.</div>`;
  const closeStatus=closing?`<div class="eod-closed ${Math.abs(Number(closedDiff||0))<0.01&&!changedSinceClose?"balanced":"difference"}">${svg(Math.abs(Number(closedDiff||0))<0.01&&!changedSinceClose?"i-check":"i-alert")}<div><strong>${changedSinceClose?"Closing needs review":`Day closed ${new Date(closing.closedAt).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})}`}</strong><span>${changedSinceClose?"Sales or expenses changed after closing. Update the closing below.":`Recorded cash ${closing.actualCash==null?"not entered":money(closing.actualCash)}${closedDiff==null?"":` · Difference ${money(closedDiff)}`}`}</span></div></div>`:"";
  const openWarning=openActivities?`<div class="eod-warning">${svg("i-alert")} ${openActivities} active session${openActivities===1?" is":"s are"} still running. Complete them before closing the day.</div>`:"";
  return `<div class="eod-toolbar"><button class="icon-btn" type="button" data-eod-prev aria-label="Previous day">‹</button><label><span>Date</span><input type="date" data-eod-date max="${localDateKey()}" value="${esc(date)}"></label><button class="secondary compact-btn" type="button" data-eod-today>Today</button><button class="icon-btn" type="button" data-eod-next aria-label="Next day" ${date>=localDateKey()?"disabled":""}>›</button></div>${closeStatus}${openWarning}<div class="eod-metrics"><div class="eod-metric sales"><span>Sales</span><strong>${money(salesInfo.sales)}</strong><small>${activityCount} transaction${activityCount===1?"":"s"}</small></div><div class="eod-metric expenses"><span>Expenses</span><strong>${money(expInfo.total)}</strong><small>${expInfo.items.length} entr${expInfo.items.length===1?"y":"ies"}</small></div><div class="eod-metric net"><span>Net after expenses</span><strong>${money(net)}</strong><small>Sales − expenses</small></div><div class="eod-metric cash"><span>Expected cash</span><strong>${money(expectedCash)}</strong><small>Cash sales − cash expenses</small></div></div><div class="eod-quick-actions"><button class="primary compact-primary" type="button" data-add-expense>${svg("i-plus")} Add Expense</button></div><div class="owner-grid two"><div class="panel"><h3>Sales Breakdown</h3><table class="simple-table"><tr><td>Timed rides</td><td>${salesInfo.rides.length}</td><td>${money(totalRevenue(salesInfo.rides))}</td></tr><tr><td>Sumo matches</td><td>${salesInfo.sumo.length}</td><td>${money(sumoRevenue(salesInfo.sumo))}</td></tr><tr><td>Cash sales</td><td></td><td>${money(salesInfo.by.Cash)}</td></tr><tr><td>UPI sales</td><td></td><td>${money(salesInfo.by.UPI)}</td></tr><tr><td>Other sales</td><td></td><td>${money(salesInfo.by.Other)}</td></tr></table></div><div class="panel"><div class="section-head compact"><div><h3>Expenses</h3><p>Fast owner-only expense log.</p></div><button class="secondary compact-btn" type="button" data-add-expense>${svg("i-plus")} Add</button></div><div class="expense-list">${expenseRows}</div></div></div><div class="panel eod-close-panel"><div class="section-head compact"><div><h3>${closing?"Update Day Closing":"Close Day"}</h3><p>Optional cash check. The system calculates everything else automatically.</p></div></div><div class="eod-close-grid"><label>Actual cash counted <span class="optional">Optional</span><input id="eodActualCash" type="number" inputmode="decimal" min="0" step="1" value="${closing?.actualCash??""}" placeholder="₹ Actual cash"></label><label>Closing note <span class="optional">Optional</span><input id="eodNote" maxlength="100" value="${esc(closing?.note||"")}" placeholder="Short note"></label></div><div class="eod-close-summary"><span>Expected cash</span><strong>${money(expectedCash)}</strong></div><button class="primary" type="button" data-close-day ${openActivities?"disabled":""}>${svg("i-check")} ${closing?"Update Closing":"Close Day"}</button></div>`
}
function openExpenseModal(){
  if(memory.currentUser?.role!=="owner")return toast("Owner access required");
  memory.expenseCategory=(data.settings.expenseCategories||[]).includes(memory.expenseCategory)?memory.expenseCategory:(data.settings.expenseCategories?.[0]||"Other");
  memory.expensePayment=data.settings.paymentMethods.includes(memory.lastPayment)?memory.lastPayment:(data.settings.paymentMethods[0]||"Cash");
  $("#expenseAmount").value="";$("#expenseNote").value="";renderExpenseModal();if($("#saveExpense"))$("#saveExpense").disabled=false;open("expenseModal");setTimeout(()=>$("#expenseAmount")?.focus(),120);
}
function renderExpenseModal(){
  const date=memory.eodDate||localDateKey();$("#expenseDateNote").textContent=`Expense date: ${prettyDate(date)}`;
  $("#expenseCategoryButtons").innerHTML=(data.settings.expenseCategories||["Other"]).map(x=>`<button class="choice-card ${memory.expenseCategory===x?"active":""}" type="button" data-exp-category="${esc(x)}"><strong>${esc(x)}</strong></button>`).join("");
  $("#expensePaymentButtons").innerHTML=data.settings.paymentMethods.map(x=>`<button type="button" class="${memory.expensePayment===x?"active":""}" data-exp-payment="${esc(x)}">${esc(x)}</button>`).join("");
  $$('[data-exp-category]').forEach(b=>b.onclick=()=>{memory.expenseCategory=b.dataset.expCategory;renderExpenseModal()});
  $$('[data-exp-payment]').forEach(b=>b.onclick=()=>{memory.expensePayment=b.dataset.expPayment;memory.lastPayment=memory.expensePayment;renderExpenseModal()});
}
function saveExpenseEntry(){
  if(memory.currentUser?.role!=="owner")return;const amount=Math.max(0,Number($("#expenseAmount")?.value)||0);if(amount<=0)return toast("Enter expense amount");if($("#saveExpense")?.disabled)return;$("#saveExpense").disabled=true;
  const now=Date.now();data.expenses.push({id:uid("exp"),date:memory.eodDate||localDateKey(),amount,category:memory.expenseCategory||"Other",paymentMethod:memory.expensePayment||"Cash",note:$("#expenseNote")?.value.trim()||"",createdAt:now,createdBy:actor()});memory.lastPayment=memory.expensePayment;save();close("expenseModal");renderOwner();toast(`Expense ${money(amount)} saved`);
}
function deleteExpenseEntry(id){if(memory.currentUser?.role!=="owner")return;const e=(data.expenses||[]).find(x=>x.id===id);if(!e)return;if(!confirm(`Delete ${e.category} expense of ${money(e.amount)}?`))return;data.expenses=data.expenses.filter(x=>x.id!==id);save();renderOwner();toast("Expense deleted")}
function closeEodDay(){
  if(memory.currentUser?.role!=="owner")return;const date=memory.eodDate||localDateKey(),sales=salesBreakdownForDate(date),exp=expenseBreakdownForDate(date);if(sales.rides.some(r=>!r.endedAt)||sales.sumo.some(m=>!m.endedAt))return toast("Complete active sessions before closing the day");const expectedCash=sales.by.Cash-exp.by.Cash,raw=$("#eodActualCash")?.value.trim(),actualCash=raw===""?null:Math.max(0,Number(raw)||0),note=$("#eodNote")?.value.trim()||"",now=Date.now();let c=eodClosingForDate(date);
  if(!c){c={id:uid("eod"),date};data.eodClosings.push(c)}Object.assign(c,{salesTotal:sales.sales,expenseTotal:exp.total,netTotal:sales.sales-exp.total,expectedCash,actualCash,note,closedAt:now,closedBy:actor()});save();renderOwner();toast(actualCash==null?"Day closed":"Day closing saved");
}
function ownerEquipment(){
  const activeVehicles=data.vehicles.filter(v=>v.active!==false);
  const batteryCards=data.batteries.slice().sort((a,b)=>String(a.code).localeCompare(String(b.code),undefined,{numeric:true,sensitivity:"base"})).map(b=>{const v=vehicle(b.assignedVehicleId);const action=b.status==="needs_charge"?`<button data-owner-equipment-batt-action="charge" data-batt="${b.id}">Start Charging</button>`:b.status==="charging"?`<button data-owner-equipment-batt-action="ready" data-batt="${b.id}">Mark Ready</button>`:b.status==="maintenance"?`<button data-owner-equipment-batt-action="ready" data-batt="${b.id}">Return Ready</button>`:"";return `<article class="battery-card battery-${esc(b.status)}"><div class="battery-card-top"><div><h3>${esc(b.code)}</h3><p>${v?`Installed in ${esc(v.name)}`:`${esc(batteryType(b.typeId)?.name||"Battery")}`}</p></div><span class="battery-status">${esc((b.status||"ready").replaceAll("_"," "))}</span></div>${action?`<div class="actions">${action}</div>`:""}</article>`}).join("");
  return `<div class="owner-command-intro"><div>${svg("i-check")}<div><strong>Command-based equipment control</strong><span>You tell the system what physical action you did. It handles status, assignment and availability automatically.</span></div></div></div><div class="equipment-attention owner-equipment-attention">${equipmentAttentionHtml("owner")}</div><div class="section-head compact owner-equipment-heading"><div><h3>Vehicles</h3><p>Battery and maintenance controls are directly on each vehicle.</p></div></div><div class="equipment-vehicle-grid">${activeVehicles.map(v=>equipmentVehicleCard(v,"owner")).join("")||`<div class="notice">No active vehicles.</div>`}</div><div class="section-head compact owner-equipment-heading"><div><h3>Battery Rack</h3><p>The system moves batteries through Ready → In Use → Needs Charge → Charging → Ready.</p></div></div><div class="battery-grid owner-battery-rack">${batteryCards||`<div class="notice">No batteries saved.</div>`}</div><details class="owner-advanced"><summary>${svg("i-settings")} Inventory & Advanced Setup</summary><div class="owner-advanced-body"><p class="hint">Open this only when adding/editing vehicles, batteries or hardware types. Day-to-day work should happen above.</p>${ownerFleet()}${ownerBatteries()}</div></details><details class="owner-advanced"><summary>${svg("i-wrench")} Maintenance History</summary><div class="owner-advanced-body">${ownerMaintenance()}</div></details>`;
}
function ownerFleet(){return `<div class="panel"><h3>Fleet</h3>${data.vehicles.map(v=>`<div class="editor-row"><div class="editor-grid"><input data-v-name="${v.id}" value="${esc(v.name)}" placeholder="Vehicle name"><input data-v-code="${v.id}" value="${esc(v.code)}" placeholder="Code"><select data-v-type="${v.id}">${data.vehicleTypes.map(t=>`<option value="${t.id}" ${t.id===v.typeId?"selected":""}>${esc(t.name)}</option>`).join("")}</select><select data-v-price="${v.id}">${data.pricingProfiles.map(p=>`<option value="${p.id}" ${p.id===v.pricingProfileId?"selected":""}>${esc(p.name)}</option>`).join("")}</select><select data-v-ext="${v.id}">${data.extensionProfiles.map(p=>`<option value="${p.id}" ${p.id===v.extensionProfileId?"selected":""}>${esc(p.name)}</option>`).join("")}</select><select data-v-btype="${v.id}">${data.batteryTypes.map(t=>`<option value="${t.id}" ${t.id===v.batteryTypeId?"selected":""}>${esc(t.name)}</option>`).join("")}</select></div><div class="editor-actions"><button class="mini-btn" data-save-vehicle="${v.id}">Save</button><button class="mini-btn" data-owner-assign-battery="${v.id}" ${activeRide(v.id)||activeSumoMatchForVehicle(v.id)?"disabled":""}>${v.currentBatteryId?"Change Battery":"Assign Battery"}</button><button class="mini-btn ${v.active===false?"":"danger"}" data-toggle-vehicle="${v.id}" ${activeRide(v.id)||activeSumoMatchForVehicle(v.id)?"disabled":""}>${v.active===false?"Restore":"Archive"}</button></div></div>`).join("")}<button class="secondary" data-add-vehicle>${svg("i-plus")} Add Vehicle</button></div><div class="panel" style="margin-top:10px"><h3>Vehicle Types</h3>${data.vehicleTypes.map(t=>`<div class="editor-row"><div class="add-row"><input data-type-name="${t.id}" value="${esc(t.name)}"><button class="mini-btn" data-save-type="${t.id}">Save</button></div></div>`).join("")}<button class="secondary" data-add-type>${svg("i-plus")} Add Type</button></div>`}
function ownerBatteries(){return `<div class="panel battery-owner-summary"><div><h3>Battery Inventory</h3><p class="hint">${data.batteries.length} batteries saved in local inventory. New batteries default to Ready and appear immediately in Equipment.</p></div><button class="secondary compact-btn" data-open-battery-station>${svg("i-battery")} Open Equipment</button></div><div class="owner-grid two" style="margin-top:10px"><div class="panel"><h3>Inventory</h3>${data.batteries.map(b=>`<div class="editor-row"><div class="battery-owner-row"><div class="editor-grid"><input data-b-code="${b.id}" value="${esc(b.code)}" placeholder="Code"><select data-b-type="${b.id}">${data.batteryTypes.map(t=>`<option value="${t.id}" ${t.id===b.typeId?"selected":""}>${esc(t.name)}</option>`).join("")}</select></div><span class="battery-status owner-battery-status">${esc((b.status||"ready").replaceAll("_"," "))}</span></div><div class="editor-actions"><button class="mini-btn" data-save-battery="${b.id}">Save</button><button class="mini-btn danger" data-delete-battery="${b.id}" ${b.assignedVehicleId?"disabled":""}>Delete</button></div></div>`).join("")}<button class="secondary" data-add-battery>${svg("i-plus")} Add Battery</button></div><div class="panel"><h3>Battery Types</h3>${data.batteryTypes.map(t=>`<div class="editor-row"><div class="editor-grid"><input data-bt-name="${t.id}" value="${esc(t.name)}" placeholder="Type name"><input data-bt-volt="${t.id}" value="${esc(t.voltage||"")}" placeholder="Voltage"><input data-bt-cap="${t.id}" value="${esc(t.capacity||"")}" placeholder="Capacity"><input data-bt-conn="${t.id}" value="${esc(t.connector||"")}" placeholder="Connector"></div><div class="editor-actions"><button class="mini-btn" data-save-btype="${t.id}">Save</button></div></div>`).join("")}<button class="secondary" data-add-btype>${svg("i-plus")} Add Battery Type</button></div></div>`}
function ownerPricing(){return `<div class="owner-grid two"><div class="panel"><h3>Ride Packages</h3>${data.packages.map(p=>`<div class="editor-row"><div class="editor-grid"><input data-p-name="${p.id}" value="${esc(p.name)}"><select data-p-prof="${p.id}">${data.pricingProfiles.map(x=>`<option value="${x.id}" ${x.id===p.profileId?"selected":""}>${esc(x.name)}</option>`).join("")}</select><input data-p-min="${p.id}" type="number" min="1" value="${p.minutes}"><input data-p-price="${p.id}" type="number" min="0" value="${p.price}"></div><div class="editor-actions"><button class="mini-btn" data-save-package="${p.id}">Save</button><button class="mini-btn danger" data-delete-package="${p.id}" ${data.packages.length<=1?"disabled":""}>Delete</button></div></div>`).join("")}<button class="secondary" data-add-package>${svg("i-plus")} Add Package</button><hr class="sep"><h3>Pricing Profiles</h3>${data.pricingProfiles.map(p=>`<div class="add-row"><input data-price-profile="${p.id}" value="${esc(p.name)}"><button class="mini-btn" data-save-price-profile="${p.id}">Save</button></div>`).join("")}<button class="secondary" style="margin-top:8px" data-add-price-profile>${svg("i-plus")} Add Profile</button></div><div class="panel"><h3>Extension Options</h3>${data.extensions.map(e=>`<div class="editor-row"><div class="editor-grid"><input data-e-name="${e.id}" value="${esc(e.name)}"><select data-e-prof="${e.id}">${data.extensionProfiles.map(x=>`<option value="${x.id}" ${x.id===e.profileId?"selected":""}>${esc(x.name)}</option>`).join("")}</select><input data-e-min="${e.id}" type="number" min="1" value="${e.minutes}"><input data-e-price="${e.id}" type="number" min="0" value="${e.price}"></div><div class="editor-actions"><button class="mini-btn" data-save-extension="${e.id}">Save</button><button class="mini-btn danger" data-delete-extension="${e.id}" ${data.extensions.length<=1?"disabled":""}>Delete</button></div></div>`).join("")}<button class="secondary" data-add-extension>${svg("i-plus")} Add Extension</button><hr class="sep"><h3>Extension Profiles</h3>${data.extensionProfiles.map(p=>`<div class="add-row"><input data-ext-profile="${p.id}" value="${esc(p.name)}"><button class="mini-btn" data-save-ext-profile="${p.id}">Save</button></div>`).join("")}<button class="secondary" style="margin-top:8px" data-add-ext-profile>${svg("i-plus")} Add Profile</button></div></div>`}
function ownerActivities(){const sumoVehicles=data.vehicles.filter(isSumoVehicle);return `<div class="owner-grid two"><div class="panel"><div class="section-head compact"><div><h3>RC Sumo Battle</h3><p>Separate pricing from normal timed rides. Matches support 4–5 players.</p></div><button class="secondary compact-btn" data-owner-open-sumo>${svg("i-sumo")} Open Sumo</button></div><div class="activity-kpis"><div><strong>${sumoVehicles.filter(v=>v.active!==false).length}</strong><span>Sumo Vehicles</span></div><div><strong>${todaySumoMatches().length}</strong><span>Matches Today</span></div><div><strong>${money(sumoRevenue(todaySumoMatches()))}</strong><span>Revenue Today</span></div></div><button class="secondary" data-add-sumo-vehicle>${svg("i-plus")} Add Sumo Vehicle</button><p class="hint">New Sumo vehicles are created without a battery. Assign a compatible ready battery before starting a match.</p></div><div class="panel"><h3>Sumo Packages</h3>${data.sumoPackages.map(p=>`<div class="editor-row"><div class="editor-grid"><input data-sumo-p-name="${p.id}" value="${esc(p.name)}" placeholder="Package name"><select data-sumo-p-mode="${p.id}"><option value="per_player" ${p.pricingMode==="per_player"?"selected":""}>Per Player</option><option value="per_match" ${p.pricingMode==="per_match"?"selected":""}>Per Match</option></select><input data-sumo-p-price="${p.id}" type="number" min="0" value="${p.price}" placeholder="Price"><input data-sumo-p-duration="${p.id}" type="number" min="0" max="60" value="${p.durationMinutes||0}" placeholder="Max minutes"><select data-sumo-p-min="${p.id}"><option value="4" ${p.minPlayers===4?"selected":""}>Min 4 players</option><option value="5" ${p.minPlayers===5?"selected":""}>Min 5 players</option></select><select data-sumo-p-max="${p.id}"><option value="4" ${p.maxPlayers===4?"selected":""}>Max 4 players</option><option value="5" ${p.maxPlayers===5?"selected":""}>Max 5 players</option></select></div><div class="editor-actions"><button class="mini-btn" data-save-sumo-package="${p.id}">Save</button><button class="mini-btn danger" data-delete-sumo-package="${p.id}" ${data.sumoPackages.length<=1?"disabled":""}>Delete</button></div></div>`).join("")}<button class="secondary" data-add-sumo-package>${svg("i-plus")} Add Sumo Package</button><p class="hint">Set Max minutes to 0 for no time limit. Pricing can be per player or a flat amount per match.</p></div></div>`}
function ownerMaintenance(){const list=data.maintenance.slice().reverse();return `<div class="panel"><h3>Maintenance Log</h3><div class="table-scroll"><table class="simple-table"><thead><tr><th>Vehicle</th><th>Issue</th><th>Reported</th><th>Status</th></tr></thead><tbody>${list.map(m=>`<tr><td>${esc(m.vehicleName)}</td><td>${esc(m.reason)}${m.note?` · ${esc(m.note)}`:""}</td><td>${new Date(m.reportedAt).toLocaleString()}</td><td>${m.resolvedAt?"Resolved":"Open"}</td></tr>`).join("")||`<tr><td colspan="4">No maintenance records yet.</td></tr>`}</tbody></table></div></div>`}
function ownerStaff(){return `<div class="panel"><div class="section-head compact"><div><h3>Operators & Access</h3><p>Each operator signs in separately. Enable only the features they need.</p></div><button class="secondary compact-btn" data-add-staff>${svg("i-plus")} Add Operator</button></div>${data.staff.map(s=>`<div class="staff-card"><div class="staff-head"><div><strong>${esc(s.name)}</strong><span>${s.active!==false?"Active":"Disabled"}</span></div><div class="editor-actions"><button class="mini-btn" data-save-staff="${s.id}">Save</button><button class="mini-btn danger" data-delete-staff="${s.id}" ${data.staff.length<=1?"disabled":""}>Delete</button></div></div><div class="editor-grid" style="margin-top:9px"><input data-staff-name="${s.id}" value="${esc(s.name)}" placeholder="Operator name"><input data-staff-pin="${s.id}" value="${esc(s.pin)}" inputmode="numeric" maxlength="8" placeholder="PIN"></div><label class="permission-item" style="margin-top:8px"><input type="checkbox" data-staff-active="${s.id}" ${s.active!==false?"checked":""}><div><strong>Account active</strong><span>Allow this operator to sign in</span></div></label><div class="permission-grid">${Object.entries(PERMISSIONS).map(([key,m])=>`<label class="permission-item"><input type="checkbox" data-staff-perm="${s.id}" data-perm-key="${key}" ${s.permissions?.[key]?"checked":""}><div><strong>${esc(m.label)}</strong><span>${esc(m.desc)}</span></div></label>`).join("")}</div></div>`).join("")}</div>`}
function ownerSettings(){return `<div class="owner-grid two"><div class="panel"><h3>Business</h3><label>Business name<input id="settingBusiness" value="${esc(data.business.name)}"></label><label>Owner PIN<input id="settingPin" type="password" inputmode="numeric" value="${esc(data.settings.ownerPin)}"></label><button class="primary" data-save-settings>Save Business Settings</button></div><div class="panel"><h3>Ride Timer</h3><label>Warning before time over (seconds)<input id="settingWarning" type="number" min="10" max="300" value="${data.settings.warningSeconds}"></label><label>Alarm repeat count<input id="settingRepeat" type="number" min="1" max="5" value="${data.settings.alarmRepeat}"></label><div class="editor-actions settings-actions"><button class="secondary" data-owner-sound>${svg("i-volume")} Test Ringer</button><button class="primary compact-primary" data-save-settings>Save Timer Settings</button></div></div></div>`}
function ownerBackup(){return `<div class="owner-grid two"><div class="panel"><h3>Backup</h3><p class="hint">This build stores business data locally on this device using IndexedDB. Export backups regularly until Firebase is connected.</p><div class="backup-actions"><button class="secondary" data-export>${svg("i-download")} Export JSON Backup</button><button class="secondary" data-import>${svg("i-upload")} Import Backup</button></div></div><div class="panel danger-zone"><h3>Reset Local Data</h3><p class="hint">Deletes ride history and returns the app to its initial local setup.</p><button class="danger-primary" data-reset>Reset Everything</button></div></div>`}
function commitOwnerField(el){
  if(!el||!memory.ownerUnlocked)return false;
  let changed=false,id;
  const val=()=>el.value?.trim?.()??"";
  if((id=el.dataset.vName)){const x=vehicle(id);if(x){x.name=val()||x.name;changed=true}}
  else if((id=el.dataset.vCode)){const x=vehicle(id);if(x){const code=val().toUpperCase()||x.code;if(!data.vehicles.some(y=>y.id!==id&&String(y.code).toUpperCase()===code)){x.code=code;changed=true}}}
  else if((id=el.dataset.vType)){const x=vehicle(id);if(x){x.typeId=el.value;changed=true}}
  else if((id=el.dataset.vPrice)){const x=vehicle(id);if(x){x.pricingProfileId=el.value;changed=true}}
  else if((id=el.dataset.vExt)){const x=vehicle(id);if(x){x.extensionProfileId=el.value;changed=true}}
  else if((id=el.dataset.vBtype)){const x=vehicle(id);if(x){x.batteryTypeId=el.value;const assigned=battery(x.currentBatteryId);if(assigned&&assigned.typeId!==x.batteryTypeId){assigned.status="ready";assigned.assignedVehicleId=null;x.currentBatteryId=null}changed=true}}
  else if((id=el.dataset.typeName)){const x=data.vehicleTypes.find(y=>y.id===id);if(x){x.name=val()||x.name;changed=true}}
  else if((id=el.dataset.bCode)){const x=battery(id);if(x){const code=val().toUpperCase()||x.code;if(!data.batteries.some(y=>y.id!==id&&String(y.code).toUpperCase()===code)){x.code=code;changed=true}}}
  else if((id=el.dataset.bType)){const x=battery(id);if(x){x.typeId=el.value;changed=true}}
  else if((id=el.dataset.btName)){const x=batteryType(id);if(x){x.name=val()||x.name;changed=true}}
  else if((id=el.dataset.btVolt)){const x=batteryType(id);if(x){x.voltage=val();changed=true}}
  else if((id=el.dataset.btCap)){const x=batteryType(id);if(x){x.capacity=val();changed=true}}
  else if((id=el.dataset.btConn)){const x=batteryType(id);if(x){x.connector=val();changed=true}}
  else if((id=el.dataset.pName)){const x=packageBy(id);if(x){x.name=val()||x.name;changed=true}}
  else if((id=el.dataset.pProf)){const x=packageBy(id);if(x){x.profileId=el.value;changed=true}}
  else if((id=el.dataset.pMin)){const x=packageBy(id);if(x){x.minutes=Math.max(1,Number(el.value)||1);changed=true}}
  else if((id=el.dataset.pPrice)){const x=packageBy(id);if(x){x.price=Math.max(0,Number(el.value)||0);changed=true}}
  else if((id=el.dataset.eName)){const x=extensionBy(id);if(x){x.name=val()||x.name;changed=true}}
  else if((id=el.dataset.eProf)){const x=extensionBy(id);if(x){x.profileId=el.value;changed=true}}
  else if((id=el.dataset.eMin)){const x=extensionBy(id);if(x){x.minutes=Math.max(1,Number(el.value)||1);changed=true}}
  else if((id=el.dataset.ePrice)){const x=extensionBy(id);if(x){x.price=Math.max(0,Number(el.value)||0);changed=true}}
  else if((id=el.dataset.priceProfile)){const x=data.pricingProfiles.find(y=>y.id===id);if(x){x.name=val()||x.name;changed=true}}
  else if((id=el.dataset.extProfile)){const x=data.extensionProfiles.find(y=>y.id===id);if(x){x.name=val()||x.name;changed=true}}
  else if((id=el.dataset.sumoPName)){const x=sumoPackageBy(id);if(x){x.name=val()||x.name;changed=true}}
  else if((id=el.dataset.sumoPMode)){const x=sumoPackageBy(id);if(x){x.pricingMode=el.value;changed=true}}
  else if((id=el.dataset.sumoPPrice)){const x=sumoPackageBy(id);if(x){x.price=Math.max(0,Number(el.value)||0);changed=true}}
  else if((id=el.dataset.sumoPDuration)){const x=sumoPackageBy(id);if(x){x.durationMinutes=Math.max(0,Number(el.value)||0);changed=true}}
  else if((id=el.dataset.sumoPMin)){const x=sumoPackageBy(id);if(x){x.minPlayers=Math.min(5,Math.max(4,Number(el.value)||4));if(x.maxPlayers<x.minPlayers)x.maxPlayers=x.minPlayers;changed=true}}
  else if((id=el.dataset.sumoPMax)){const x=sumoPackageBy(id);if(x){x.maxPlayers=Math.min(5,Math.max(x.minPlayers,Number(el.value)||5));changed=true}}
  else if((id=el.dataset.staffName)){const x=data.staff.find(y=>y.id===id);if(x){x.name=val()||x.name;changed=true}}
  else if((id=el.dataset.staffPin)){const x=data.staff.find(y=>y.id===id);if(x){x.pin=val()||x.pin;changed=true}}
  else if((id=el.dataset.staffActive)){const x=data.staff.find(y=>y.id===id);if(x){x.active=el.checked;changed=true}}
  else if((id=el.dataset.staffPerm)){const x=data.staff.find(y=>y.id===id),k=el.dataset.permKey;if(x&&k){x.permissions[k]=el.checked;changed=true}}
  else if(el.id==="settingBusiness"){data.business.name=val()||data.business.name;changed=true}
  else if(el.id==="settingPin"){data.settings.ownerPin=val()||data.settings.ownerPin;changed=true}
  else if(el.id==="settingWarning"){data.settings.warningSeconds=Math.min(300,Math.max(10,Number(el.value)||60));changed=true}
  else if(el.id==="settingRepeat"){data.settings.alarmRepeat=Math.min(5,Math.max(1,Number(el.value)||2));changed=true}
  if(changed){save(); if(id?.startsWith?.("op_"))renderLoginChoices();}
  return changed;
}
let ownerAutosaveBound=false;
function bindOwnerAutosave(){
  if(ownerAutosaveBound)return;ownerAutosaveBound=true;
  const root=$("#ownerContent");if(!root)return;
  root.addEventListener("change",e=>{if(e.target.matches("select,input[type=checkbox]"))commitOwnerField(e.target)});
  root.addEventListener("focusout",e=>{if(e.target.matches("input:not([type=checkbox]),textarea"))commitOwnerField(e.target)});
}
function bindOwnerActions(){
  bindOwnerAutosave();
  $('[data-eod-prev]')?.addEventListener('click',()=>{memory.eodDate=dateKeyOffset(memory.eodDate||localDateKey(),-1);renderOwner()});
  $('[data-eod-next]')?.addEventListener('click',()=>{const next=dateKeyOffset(memory.eodDate||localDateKey(),1);memory.eodDate=next>localDateKey()?localDateKey():next;renderOwner()});
  $('[data-eod-today]')?.addEventListener('click',()=>{memory.eodDate=localDateKey();renderOwner()});
  $('[data-eod-date]')?.addEventListener('change',e=>{memory.eodDate=e.target.value||localDateKey();if(memory.eodDate>localDateKey())memory.eodDate=localDateKey();renderOwner()});
  $$('[data-add-expense]').forEach(b=>b.onclick=openExpenseModal);
  $$('[data-delete-expense]').forEach(b=>b.onclick=()=>deleteExpenseEntry(b.dataset.deleteExpense));
  $('[data-close-day]')?.addEventListener('click',closeEodDay);
  $('[data-open-battery-station]')?.addEventListener('click',()=>{memory.batteryFilter="all";close("ownerModal",true);switchView("batteries",false);if(historyReady)setHistory("batteries",null,"replace")});
  $$('[data-owner-equipment-assign]').forEach(b=>b.onclick=()=>{assignRecommendedBattery(b.dataset.ownerEquipmentAssign);renderOwner()});
  $$('[data-owner-equipment-swap]').forEach(b=>b.onclick=()=>{close("ownerModal",true);openBatterySwap(b.dataset.ownerEquipmentSwap)});
  $$('[data-owner-equipment-issue]').forEach(b=>b.onclick=()=>{close("ownerModal",true);openMaintenance(b.dataset.ownerEquipmentIssue)});
  $$('[data-owner-equipment-repair]').forEach(b=>b.onclick=()=>{markRepaired(b.dataset.ownerEquipmentRepair);renderOwner()});
  $$('[data-owner-equipment-batt-action]').forEach(b=>b.onclick=()=>{batteryAction(b.dataset.batt,b.dataset.ownerEquipmentBattAction);renderOwner()});
  $$('[data-owner-assign-battery]').forEach(b=>b.onclick=()=>{const id=b.dataset.ownerAssignBattery;close("ownerModal",true);openBatterySwap(id)});
  $('[data-owner-open-sumo]')?.addEventListener('click',()=>{close("ownerModal",true);switchView("sumo",false);if(historyReady)setHistory("sumo",null,"replace")});
  $('[data-add-sumo-vehicle]')?.addEventListener('click',()=>{let type=data.vehicleTypes.find(t=>t.id==="type_sumo");if(!type){type={id:"type_sumo",name:"RC Sumo",active:true};data.vehicleTypes.push(type)}let n=1,code;const used=new Set(data.vehicles.map(v=>String(v.code||"").toUpperCase()));do{code=`SUMO-${String(n++).padStart(2,"0")}`}while(used.has(code));const id=uid("veh");data.vehicles.push({id,code,name:`Sumo ${n-1}`,typeId:"type_sumo",pricingProfileId:data.pricingProfiles[0]?.id,extensionProfileId:data.extensionProfiles[0]?.id,batteryTypeId:data.batteryTypes[0]?.id,currentBatteryId:null,manualStatus:"available",active:true});save();renderOwner();render();toast(`${code} added — assign a battery before use`)});
  $('[data-add-sumo-package]')?.addEventListener('click',()=>{const id=uid("sumopkg");data.sumoPackages.push({id,name:"New Sumo Package",pricingMode:"per_player",price:150,minPlayers:4,maxPlayers:5,durationMinutes:3,active:true});save();renderOwner();toast("Sumo package added");focusOwnerField(`[data-sumo-p-name="${id}"]`)});
  $$('[data-save-sumo-package]').forEach(b=>b.onclick=()=>{const id=b.dataset.saveSumoPackage,p=sumoPackageBy(id);if(!p)return;p.name=$(`[data-sumo-p-name="${id}"]`).value.trim()||p.name;p.pricingMode=$(`[data-sumo-p-mode="${id}"]`).value;p.price=Math.max(0,Number($(`[data-sumo-p-price="${id}"]`).value)||0);p.durationMinutes=Math.max(0,Number($(`[data-sumo-p-duration="${id}"]`).value)||0);p.minPlayers=Math.min(5,Math.max(4,Number($(`[data-sumo-p-min="${id}"]`).value)||4));p.maxPlayers=Math.min(5,Math.max(p.minPlayers,Number($(`[data-sumo-p-max="${id}"]`).value)||5));save();renderOwner();renderSumo();toast("Sumo package saved")});
  $$('[data-delete-sumo-package]').forEach(b=>b.onclick=()=>{const p=sumoPackageBy(b.dataset.deleteSumoPackage);if(!p||data.sumoPackages.length<=1)return;if(!confirm(`Delete ${p.name}? Existing match history will be preserved.`))return;data.sumoPackages=data.sumoPackages.filter(x=>x.id!==p.id);save();renderOwner();renderSumo();toast("Sumo package deleted")});
  $('[data-add-staff]')?.addEventListener('click',()=>{const i=data.staff.length+1;data.staff.push({id:uid("op"),name:`Operator ${i}`,pin:"1111",active:true,permissions:{arena:true,sumo:false,queue:true,rides:true,batteries:true,batteryActions:false,maintenance:false,viewRevenue:false}});save();renderOwner()});
  $$('[data-save-staff]').forEach(b=>b.onclick=()=>{const s=data.staff.find(x=>x.id===b.dataset.saveStaff);if(!s)return;s.name=$(`[data-staff-name="${s.id}"]`).value.trim()||s.name;s.pin=$(`[data-staff-pin="${s.id}"]`).value.trim()||"1111";s.active=$(`[data-staff-active="${s.id}"]`).checked;Object.keys(PERMISSIONS).forEach(k=>{const el=$(`[data-staff-perm="${s.id}"][data-perm-key="${k}"]`);s.permissions[k]=!!el?.checked});save();renderLoginChoices();renderOwner();toast("Operator access updated")});
  $$('[data-delete-staff]').forEach(b=>b.onclick=()=>{if(data.staff.length<=1)return;const st=data.staff.find(x=>x.id===b.dataset.deleteStaff);if(!confirm(`Delete ${st?.name||"this operator"}?`))return;data.staff=data.staff.filter(x=>x.id!==b.dataset.deleteStaff);save();renderLoginChoices();renderOwner();toast("Operator deleted")});
  $$('[data-save-vehicle]').forEach(b=>b.onclick=()=>{const id=b.dataset.saveVehicle,v=vehicle(id);if(!v)return;v.name=$(`[data-v-name="${id}"]`).value.trim()||v.name;const code=$(`[data-v-code="${id}"]`).value.trim().toUpperCase()||v.code;if(data.vehicles.some(x=>x.id!==id&&String(x.code).toUpperCase()===code))return toast("Vehicle code already exists");v.code=code;v.typeId=$(`[data-v-type="${id}"]`).value;v.pricingProfileId=$(`[data-v-price="${id}"]`).value;v.extensionProfileId=$(`[data-v-ext="${id}"]`).value;v.batteryTypeId=$(`[data-v-btype="${id}"]`).value;const assigned=battery(v.currentBatteryId);if(assigned&&assigned.typeId!==v.batteryTypeId){assigned.status="ready";assigned.assignedVehicleId=null;v.currentBatteryId=null}save();renderOwner();render();toast("Vehicle saved")});
  $$('[data-toggle-vehicle]').forEach(b=>b.onclick=()=>{const id=b.dataset.toggleVehicle,v=vehicle(id);if(!v)return;if(activeRide(id)||activeSumoMatchForVehicle(id))return toast("Complete the active ride or Sumo match first");if(v.active!==false){if(!confirm(`Archive ${v.name}? Its ride history will be preserved.`))return;const bat=battery(v.currentBatteryId);if(bat){bat.status="ready";bat.assignedVehicleId=null}v.currentBatteryId=null;v.active=false;toast("Vehicle archived")}else{v.active=true;toast("Vehicle restored")}save();render();renderOwner()});
  $('[data-add-vehicle]')?.addEventListener('click',()=>{const id=uid("veh"),i=data.vehicles.length+1;data.vehicles.push({id,code:nextVehicleCode(),name:`Vehicle ${i}`,typeId:data.vehicleTypes[0]?.id,pricingProfileId:data.pricingProfiles[0]?.id,extensionProfileId:data.extensionProfiles[0]?.id,batteryTypeId:data.batteryTypes[0]?.id,currentBatteryId:null,manualStatus:"available",active:true});save();renderOwner();render();toast("Vehicle added — edit details and they will auto-save");focusOwnerField(`[data-v-name="${id}"]`)});
  $$('[data-save-type]').forEach(b=>b.onclick=()=>{const t=data.vehicleTypes.find(x=>x.id===b.dataset.saveType);if(!t)return;t.name=$(`[data-type-name="${t.id}"]`).value.trim()||t.name;save();renderOwner();render();toast("Vehicle type saved")});
  $('[data-add-type]')?.addEventListener('click',()=>{const id=uid("type");data.vehicleTypes.push({id,name:"New Vehicle Type",active:true});save();renderOwner();toast("Vehicle type added");focusOwnerField(`[data-type-name="${id}"]`)});
  $$('[data-save-battery]').forEach(b=>b.onclick=()=>{const x=battery(b.dataset.saveBattery);if(!x)return;const code=$(`[data-b-code="${x.id}"]`).value.trim().toUpperCase()||x.code;if(data.batteries.some(y=>y.id!==x.id&&String(y.code).toUpperCase()===code))return toast("Battery code already exists");x.code=code;x.typeId=$(`[data-b-type="${x.id}"]`).value;normalizeOperationalState(data);memory.highlightBatteryId=x.id;memory.batteryFilter="all";save();renderOwner();render();toast(`${x.code} saved`)});
  $$('[data-delete-battery]').forEach(b=>b.onclick=()=>{const x=battery(b.dataset.deleteBattery);if(!x||x.assignedVehicleId)return;if(!confirm(`Delete battery ${x.code}?`))return;data.batteries=data.batteries.filter(v=>v.id!==x.id);save();renderOwner();render();toast("Battery deleted")});
  $('[data-add-battery]')?.addEventListener('click',()=>{if(!data.batteryTypes.length)return toast("Add a battery type first");const id=uid("bat");const item={id,code:nextBatteryCode(),typeId:data.batteryTypes[0]?.id,status:"ready",assignedVehicleId:null,cycles:0,totalRuntimeMin:0,notes:""};data.batteries.push(item);memory.highlightBatteryId=id;memory.batteryFilter="all";normalizeOperationalState(data);save();renderOwner();render();toast(`${item.code} added and ready in Equipment`);focusOwnerField(`[data-b-code="${id}"]`)});
  $$('[data-save-btype]').forEach(b=>b.onclick=()=>{const t=batteryType(b.dataset.saveBtype);if(!t)return;t.name=$(`[data-bt-name="${t.id}"]`).value.trim()||t.name;t.voltage=$(`[data-bt-volt="${t.id}"]`).value.trim();t.capacity=$(`[data-bt-cap="${t.id}"]`).value.trim();t.connector=$(`[data-bt-conn="${t.id}"]`).value.trim();save();renderOwner();render();toast("Battery type saved")});
  $('[data-add-btype]')?.addEventListener('click',()=>{const id=uid("bt");data.batteryTypes.push({id,name:"New Battery Type",voltage:"",capacity:"",connector:"",compatibleTypeIds:[]});save();renderOwner();toast("Battery type added");focusOwnerField(`[data-bt-name="${id}"]`)});
  $$('[data-save-package]').forEach(b=>b.onclick=()=>{const id=b.dataset.savePackage,p=packageBy(id);if(!p)return;p.name=$(`[data-p-name="${id}"]`).value.trim()||p.name;p.profileId=$(`[data-p-prof="${id}"]`).value;p.minutes=Math.max(1,Number($(`[data-p-min="${id}"]`).value)||1);p.price=Math.max(0,Number($(`[data-p-price="${id}"]`).value)||0);save();renderOwner();render();toast("Package saved")});
  $$('[data-delete-package]').forEach(b=>b.onclick=()=>{const p=packageBy(b.dataset.deletePackage);if(!p||!confirm(`Delete package ${p.name}? Existing ride amounts will remain in history.`))return;data.packages=data.packages.filter(x=>x.id!==b.dataset.deletePackage);save();renderOwner();render();toast("Package deleted")});
  $('[data-add-package]')?.addEventListener('click',()=>{if(!data.pricingProfiles.length)return toast("Add a pricing profile first");const id=uid("pkg");data.packages.push({id,profileId:data.pricingProfiles[0]?.id,name:"New Package",minutes:5,price:200,active:true});save();renderOwner();render();toast("Package added — edit name, time and price");focusOwnerField(`[data-p-name="${id}"]`)});
  $$('[data-save-extension]').forEach(b=>b.onclick=()=>{const id=b.dataset.saveExtension,e=extensionBy(id);if(!e)return;e.name=$(`[data-e-name="${id}"]`).value.trim()||e.name;e.profileId=$(`[data-e-prof="${id}"]`).value;e.minutes=Math.max(1,Number($(`[data-e-min="${id}"]`).value)||1);e.price=Math.max(0,Number($(`[data-e-price="${id}"]`).value)||0);save();renderOwner();render();toast("Extension saved")});
  $$('[data-delete-extension]').forEach(b=>b.onclick=()=>{const e=extensionBy(b.dataset.deleteExtension);if(!e||!confirm(`Delete extension ${e.name}?`))return;data.extensions=data.extensions.filter(x=>x.id!==b.dataset.deleteExtension);save();renderOwner();toast("Extension deleted")});
  $('[data-add-extension]')?.addEventListener('click',()=>{if(!data.extensionProfiles.length)return toast("Add an extension profile first");const id=uid("ext");data.extensions.push({id,profileId:data.extensionProfiles[0]?.id,name:"New Extension",minutes:2,price:80,active:true});save();renderOwner();toast("Extension added");focusOwnerField(`[data-e-name="${id}"]`)});
  $$('[data-save-price-profile]').forEach(b=>b.onclick=()=>{const p=data.pricingProfiles.find(x=>x.id===b.dataset.savePriceProfile);if(!p)return;p.name=$(`[data-price-profile="${p.id}"]`).value.trim()||p.name;save();renderOwner();render();toast("Pricing profile saved")});
  $('[data-add-price-profile]')?.addEventListener('click',()=>{const id=uid("price");data.pricingProfiles.push({id,name:"New Pricing Profile"});save();renderOwner();toast("Pricing profile added");focusOwnerField(`[data-price-profile="${id}"]`)});
  $$('[data-save-ext-profile]').forEach(b=>b.onclick=()=>{const p=data.extensionProfiles.find(x=>x.id===b.dataset.saveExtProfile);if(!p)return;p.name=$(`[data-ext-profile="${p.id}"]`).value.trim()||p.name;save();renderOwner();render();toast("Extension profile saved")});
  $('[data-add-ext-profile]')?.addEventListener('click',()=>{const id=uid("extp");data.extensionProfiles.push({id,name:"New Extension Profile"});save();renderOwner();toast("Extension profile added");focusOwnerField(`[data-ext-profile="${id}"]`)});
  $$('[data-save-settings]').forEach(btn=>btn.addEventListener('click',()=>{data.business.name=$("#settingBusiness").value.trim()||"KAS RC Arena";data.settings.ownerPin=$("#settingPin").value.trim()||"1234";data.settings.warningSeconds=Math.min(300,Math.max(10,Number($("#settingWarning")?.value||60)));data.settings.alarmRepeat=Math.min(5,Math.max(1,Number($("#settingRepeat")?.value||2)));save();render();toast("Settings saved locally")}));
  $('[data-owner-sound]')?.addEventListener('click',()=>playRinger());
  $('[data-export]')?.addEventListener('click',exportBackup);$('[data-import]')?.addEventListener('click',()=>$("#importFile").click());
  $('[data-reset]')?.addEventListener('click',async()=>{if(!confirm("Reset all local KAS RC Arena data? This cannot be undone unless you exported a backup."))return;data=normalizeOperationalState(structuredClone(DEFAULT));await dbSet(data);memory.ownerUnlocked=false;close("ownerModal",true);logout();render();toast("Local data reset")});
}
function exportBackup(){const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"}),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`KAS-RC-Arena-Backup-${localDateKey()}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);toast("Backup exported")}
$("#saveExpense").onclick=saveExpenseEntry;
$("#expenseAmount")?.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();e.target.blur();saveExpenseEntry()}});
$("#importFile").onchange=async e=>{const f=e.target.files?.[0];if(!f)return;try{const parsed=JSON.parse(await f.text());if(!parsed||!Array.isArray(parsed.vehicles)||!Array.isArray(parsed.rides))throw new Error();if(!confirm("Import this backup and replace current local data?"))return;data=normalizeOperationalState(mergeDefaults(parsed));await dbSet(data);render();renderOwner();toast("Backup imported")}catch{toast("Invalid backup file")}e.target.value=""};


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
function login(role,user){memory.currentUser={role,id:user?.id||"owner",name:user?.name||"Owner"};memory.ownerUnlocked=role==="owner";sessionStorage.setItem("kas-session",JSON.stringify(memory.currentUser));memory.currentView="arena";applyAccessUI();render();if(historyReady)setHistory("arena",null,"replace");toast(`Signed in as ${memory.currentUser.name}`)}
function logout(){sessionStorage.removeItem("kas-session");memory.currentUser=null;memory.ownerUnlocked=false;memory.currentView="arena";closeAllModals();applyAccessUI();renderLoginChoices();if(historyReady)setHistory("arena",null,"replace")}
$$('[data-login-role]').forEach(b=>b.onclick=()=>{memory.loginRole=b.dataset.loginRole;$$('[data-login-role]').forEach(x=>x.classList.toggle('active',x===b));$("#operatorLoginPanel").classList.toggle("hidden",memory.loginRole!=="operator");$("#ownerLoginPanel").classList.toggle("hidden",memory.loginRole!=="owner")});
$("#operatorLoginBtn").onclick=()=>{const s=data.staff.find(x=>x.id===memory.selectedOperator&&x.active!==false);if(!s)return toast("Select an active operator");if($("#operatorPinInput").value!==String(s.pin||"1111"))return toast("Incorrect operator PIN");$("#operatorPinInput").value="";login("operator",s)};
$("#ownerLoginBtn").onclick=()=>{if($("#ownerLoginPin").value!==String(data.settings.ownerPin||"1234"))return toast("Incorrect owner PIN");$("#ownerLoginPin").value="";login("owner")};
$("#logoutBtn").onclick=logout;

const ringer=$("#ringer");let audioUnlocked=false,alertInterval=null;
function unlockAudio(){ringer.load();ringer.volume=1;audioUnlocked=true}
async function playRinger(){try{unlockAudio();ringer.pause();ringer.currentTime=0;ringer.volume=1;await ringer.play()}catch{toast("Tap Ringer once to enable sound")}}
function stopRinger(){ringer.pause();ringer.currentTime=0}
function unackAlerts(){const rides=data.rides.filter(r=>!r.endedAt&&!r.pausedAt&&!r.alarmAcknowledged&&Date.now()>=r.endsAt);const sumo=data.sumoMatches.filter(m=>!m.endedAt&&m.endsAt&&!m.alarmAcknowledged&&Date.now()>=m.endsAt);return rides.concat(sumo)}
function ensureAlert(){if(!unackAlerts().length){stopAlertIfClear();return}if(alertInterval)return;playRinger();if(navigator.vibrate)navigator.vibrate([500,150,500,150,700]);alertInterval=setInterval(()=>{if(!unackAlerts().length)return stopAlertIfClear();playRinger()},10000)}
function stopAlertIfClear(){if(unackAlerts().length)return;clearInterval(alertInterval);alertInterval=null;stopRinger()}
$("#soundTest").onclick=()=>playRinger();
function checkTimers(){ensureAlert();renderFleet();if(memory.currentView==="sumo")renderSumo();const rides=todayRides(),sumo=todaySumoMatches();$("#activeCount").textContent=data.vehicles.filter(v=>activeRide(v.id)||activeSumoMatchForVehicle(v.id)).length;$("#readyCount").textContent=data.vehicles.filter(v=>vehicleState(v)==="available").length;$("#todayRevenue").textContent=money(totalRevenue(rides)+sumoRevenue(sumo))}

$$('[data-close]').forEach(b=>b.onclick=()=>close(b.dataset.close));
document.addEventListener('keydown',e=>{if(e.key==='Escape'){const m=$('.modal:not(.hidden)');if(m)close(m.id)}});


// PWA install, mobile keyboard and app-style navigation
let deferredInstallPrompt=null;
const installBtn=$("#installBtn");
const isStandalone=()=>window.matchMedia?.("(display-mode: standalone)").matches||navigator.standalone===true;
const isIOS=/iphone|ipad|ipod/i.test(navigator.userAgent);
window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();deferredInstallPrompt=e;if(!isStandalone())installBtn?.classList.remove("hidden")});
window.addEventListener("appinstalled",()=>{deferredInstallPrompt=null;installBtn?.classList.add("hidden");toast("KAS RC Arena installed")});
if(installBtn)installBtn.onclick=async()=>{
  if(isStandalone())return toast("App is already installed");
  if(deferredInstallPrompt){deferredInstallPrompt.prompt();await deferredInstallPrompt.userChoice;deferredInstallPrompt=null;installBtn.classList.add("hidden");return}
  if(isIOS)return alert("To install KAS RC Arena on iPhone/iPad: tap Share in Safari, then choose ‘Add to Home Screen’. ");
  toast("Open this site in Chrome and use Add to Home screen / Install app")
};
if(!isStandalone()&&(isIOS||location.protocol==="https:"))installBtn?.classList.remove("hidden");

function updateViewportHeight(){const h=window.visualViewport?.height||window.innerHeight;document.documentElement.style.setProperty("--app-vh",`${h}px`)}
updateViewportHeight();window.visualViewport?.addEventListener("resize",updateViewportHeight);window.addEventListener("resize",updateViewportHeight);
document.addEventListener("focusin",e=>{if(!e.target.matches("input,textarea"))return;setTimeout(()=>e.target.scrollIntoView({block:"center",behavior:"smooth"}),280)});
$("#customerName")?.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();$("#customerMobile")?.focus()}});
$("#customerMobile")?.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();e.target.blur();setTimeout(()=>$("#packageSection")?.scrollIntoView({block:"start",behavior:"smooth"}),120)}});
window.addEventListener("popstate",e=>{if(!memory.currentUser)return;applyHistoryState(e.state)});
(async function start(){await initState();renderLoginChoices();try{const s=JSON.parse(sessionStorage.getItem("kas-session")||"null");if(s?.role==="owner")memory.currentUser={role:"owner",id:"owner",name:"Owner"};if(s?.role==="operator"&&data.staff.some(x=>x.id===s.id&&x.active!==false))memory.currentUser=s}catch{}applyAccessUI();render();updateSyncStatus();historyReady=true;setHistory(memory.currentView||"arena",null,"replace");setInterval(checkTimers,1000);if("serviceWorker" in navigator&&(location.protocol==="https:"||location.hostname==="localhost"))navigator.serviceWorker.register("sw.js").catch(()=>{});})();
