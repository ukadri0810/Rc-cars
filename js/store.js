const KEY='kas_rc_arena_v1';
const now=()=>Date.now();
const uid=(p='id')=>`${p}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,8)}`;

export const defaultState=()=>({
  version:1,
  business:{name:'KAS RC Arena',phone:'',upiId:'',currency:'₹',ownerPin:'1234',operatorPin:'1111',alarmEnabled:true,warningSeconds:60},
  currentUser:null,
  vehicleTypes:[
    {id:'vt_car',name:'RC Car',icon:'🏎️',active:true},
    {id:'vt_boat',name:'RC Boat',icon:'🚤',active:true},
    {id:'vt_exc',name:'Excavator',icon:'🚜',active:true},
    {id:'vt_truck',name:'RC Truck',icon:'🚚',active:true}
  ],
  batteryTypes:[{id:'bt_2s',name:'2S LiPo',voltage:'7.4V',capacity:'5200mAh',connector:'XT60',compatibleVehicleTypeIds:['vt_car']}],
  vehicles:[
    {id:'veh_1',code:'CAR-01',name:'RC Car 01',typeId:'vt_car',status:'available',batteryIds:['bat_1'],pricingProfileId:'pp_car',extensionProfileId:'ep_car',notes:''},
    {id:'veh_2',code:'CAR-02',name:'RC Car 02',typeId:'vt_car',status:'available',batteryIds:['bat_2'],pricingProfileId:'pp_car',extensionProfileId:'ep_car',notes:''}
  ],
  batteries:[
    {id:'bat_1',code:'B01',typeId:'bt_2s',status:'in_use',assignedVehicleId:'veh_1',cycles:0,notes:'',maintenance:false},
    {id:'bat_2',code:'B02',typeId:'bt_2s',status:'in_use',assignedVehicleId:'veh_2',cycles:0,notes:'',maintenance:false},
    {id:'bat_3',code:'B03',typeId:'bt_2s',status:'ready',assignedVehicleId:null,cycles:0,notes:'',maintenance:false},
    {id:'bat_4',code:'B04',typeId:'bt_2s',status:'ready',assignedVehicleId:null,cycles:0,notes:'',maintenance:false},
    {id:'bat_5',code:'B05',typeId:'bt_2s',status:'ready',assignedVehicleId:null,cycles:0,notes:'',maintenance:false},
    {id:'bat_6',code:'B06',typeId:'bt_2s',status:'ready',assignedVehicleId:null,cycles:0,notes:'',maintenance:false},
    {id:'bat_7',code:'B07',typeId:'bt_2s',status:'ready',assignedVehicleId:null,cycles:0,notes:'',maintenance:false}
  ],
  pricingProfiles:[{id:'pp_car',name:'RC Car Standard',vehicleTypeIds:['vt_car']}],
  packages:[
    {id:'pkg_5',profileId:'pp_car',name:'Standard',minutes:5,price:200,active:true,sort:1},
    {id:'pkg_10',profileId:'pp_car',name:'Fun Ride',minutes:10,price:350,active:true,sort:2},
    {id:'pkg_15',profileId:'pp_car',name:'Pro Ride',minutes:15,price:500,active:true,sort:3}
  ],
  extensionProfiles:[{id:'ep_car',name:'RC Car Extensions',vehicleTypeIds:['vt_car']}],
  extensions:[
    {id:'ext_2',profileId:'ep_car',name:'+2 min',minutes:2,price:80,active:true,sort:1},
    {id:'ext_3',profileId:'ep_car',name:'+3 min',minutes:3,price:100,active:true,sort:2},
    {id:'ext_5',profileId:'ep_car',name:'+5 min',minutes:5,price:150,active:true,sort:3}
  ],
  rides:[], payments:[], queue:[], batteryLogs:[], maintenance:[], audit:[], eod:[]
});

export class Store {
  constructor(){ this.state=this.load(); this.listeners=new Set(); }
  load(){ try{const raw=localStorage.getItem(KEY); return raw?{...defaultState(),...JSON.parse(raw)}:defaultState();}catch{return defaultState();} }
  save(){localStorage.setItem(KEY,JSON.stringify(this.state)); this.listeners.forEach(fn=>fn(this.state));}
  subscribe(fn){this.listeners.add(fn); return ()=>this.listeners.delete(fn);}
  get(){return this.state;}
  set(mutator){mutator(this.state); this.save();}
  reset(){this.state=defaultState(); this.save();}
  export(){return JSON.stringify(this.state,null,2);}
  import(json){const parsed=JSON.parse(json); if(!parsed || typeof parsed!=='object') throw new Error('Invalid backup'); this.state={...defaultState(),...parsed}; this.save();}
  login(role,pin){const ok=role==='owner'?pin===this.state.business.ownerPin:pin===this.state.business.operatorPin; if(ok){this.state.currentUser={role,name:role==='owner'?'Owner':'Operator',loginAt:now()}; this.audit('login',{role}); this.save();} return ok;}
  logout(){this.state.currentUser=null; this.save();}
  audit(action,meta={}){this.state.audit.unshift({id:uid('aud'),ts:now(),action,user:this.state.currentUser?.role||'system',meta}); this.state.audit=this.state.audit.slice(0,1000);}
  addQueue(name,mobile=''){const q={id:uid('q'),name:name||`Walk-in ${this.state.queue.length+1}`,mobile,createdAt:now(),status:'waiting'}; this.set(s=>{s.queue.push(q); this.audit('queue_add',{id:q.id,name:q.name});}); return q;}
  removeQueue(id){this.set(s=>{const q=s.queue.find(x=>x.id===id); if(q) q.status='removed'; this.audit('queue_remove',{id});});}
  startRide({vehicleId,customerName,mobile,packageId,paymentMethod,queueId}){
    const s=this.state, vehicle=s.vehicles.find(v=>v.id===vehicleId), pkg=s.packages.find(p=>p.id===packageId);
    if(!vehicle||!pkg||vehicle.status!=='available') throw new Error('Vehicle is not available');
    const startAt=now(), ride={id:uid('ride'),number:`KAS-RIDE-${String(s.rides.length+1).padStart(6,'0')}`,vehicleId,customerName:customerName||`Walk-in ${s.rides.length+1}`,mobile:mobile||'',packageId,startAt,endAt:startAt+pkg.minutes*60000,completedAt:null,status:'active',pausedAt:null,pausedRemainingMs:null,extensions:[],baseAmount:pkg.price,totalAmount:pkg.price,paymentMethod,paymentStatus:'paid',pauseHistory:[]};
    s.rides.unshift(ride); vehicle.status='in_ride';
    s.payments.unshift({id:uid('pay'),rideId:ride.id,amount:pkg.price,method:paymentMethod,type:'ride',ts:startAt});
    if(queueId){const q=s.queue.find(x=>x.id===queueId); if(q) q.status='served';}
    this.audit('ride_start',{rideId:ride.id,vehicleId,amount:pkg.price}); this.save(); return ride;
  }
  extendRide(rideId,extensionId,paymentMethod){const s=this.state,r=s.rides.find(x=>x.id===rideId),e=s.extensions.find(x=>x.id===extensionId); if(!r||!e||!['active','time_up'].includes(r.status)) throw new Error('Ride cannot be extended'); const base=r.pausedAt?r.pausedRemainingMs:Math.max(0,r.endAt-now()); const newRemaining=base+e.minutes*60000; if(r.pausedAt)r.pausedRemainingMs=newRemaining; else r.endAt=now()+newRemaining; r.status='active'; r.extensions.push({id:uid('rex'),extensionId:e.id,minutes:e.minutes,price:e.price,ts:now(),paymentMethod}); r.totalAmount+=e.price; s.payments.unshift({id:uid('pay'),rideId:r.id,amount:e.price,method:paymentMethod,type:'extension',ts:now()}); this.audit('ride_extend',{rideId:r.id,extensionId:e.id,amount:e.price}); this.save();}
  pauseRide(rideId,reason='Other'){const r=this.state.rides.find(x=>x.id===rideId); if(!r||r.pausedAt) return; r.pausedRemainingMs=Math.max(0,r.endAt-now()); r.pausedAt=now(); r.status='paused'; r.pauseHistory.push({start:r.pausedAt,end:null,reason}); this.audit('ride_pause',{rideId,reason}); this.save();}
  resumeRide(rideId){const r=this.state.rides.find(x=>x.id===rideId); if(!r||!r.pausedAt) return; const t=now(); const last=r.pauseHistory[r.pauseHistory.length-1]; if(last&&!last.end)last.end=t; r.endAt=t+(r.pausedRemainingMs||0); r.pausedAt=null; r.pausedRemainingMs=null; r.status='active'; this.audit('ride_resume',{rideId}); this.save();}
  completeRide(rideId,reason='Completed'){const s=this.state,r=s.rides.find(x=>x.id===rideId); if(!r)return; const v=s.vehicles.find(x=>x.id===r.vehicleId); r.status='completed'; r.completedAt=now(); r.completeReason=reason; if(v)v.status='available'; this.audit('ride_complete',{rideId,reason}); this.save();}
  markTimeUp(rideId){const r=this.state.rides.find(x=>x.id===rideId); if(r&&r.status==='active'){r.status='time_up'; this.save();}}
  swapBattery(vehicleId,newBatteryId){const s=this.state,v=s.vehicles.find(x=>x.id===vehicleId),nb=s.batteries.find(x=>x.id===newBatteryId); if(!v||!nb||nb.status!=='ready') throw new Error('Battery is not ready'); const oldIds=[...(v.batteryIds||[])]; oldIds.forEach(id=>{const b=s.batteries.find(x=>x.id===id); if(b){b.status='charging'; b.assignedVehicleId=null; b.cycles=(b.cycles||0)+1; s.batteryLogs.unshift({id:uid('blog'),batteryId:b.id,vehicleId,action:'removed_to_charging',ts:now()});}}); nb.status='in_use'; nb.assignedVehicleId=vehicleId; v.batteryIds=[nb.id]; s.batteryLogs.unshift({id:uid('blog'),batteryId:nb.id,vehicleId,action:'installed',ts:now()}); this.audit('battery_swap',{vehicleId,newBatteryId,oldIds}); this.save();}
}
export {uid};
