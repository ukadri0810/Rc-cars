/* One navigation system per role; owner pages share the existing business logic. */
let ownerDraft=false;
const ownerSectionNames={overview:'Overview',operations:'Operations',equipment:'Equipment',activities:'Activities & Pricing',finance:'Finance',staff:'Staff',settings:'Settings'};
function portalSection(tab){return ({pricing:'activities',partners:'finance',eod:'finance',backup:'settings',fleet:'equipment',batteries:'equipment',maintenance:'equipment'})[tab]||tab}
function markOwnerSaved(){ownerDraft=false;const status=$('#ownerSaveStatus');if(status)status.textContent='All changes saved'}
function discardOwnerDraft(){if(!ownerDraft)return true;if(!confirm('You have unsaved changes. Discard them and leave this page?'))return false;markOwnerSaved();return true}
const portalSave=save;save=()=>{portalSave();markOwnerSaved()};
function syncPortalVisibility(){
 const signed=!!memory.currentUser,on=signed&&memory.currentUser.role==='owner'&&memory.portal==='owner';
 document.body.classList.toggle('owner-portal',on);
 $('#counterWorkspace').hidden=!signed||on;
 $('#mainNav').hidden=true;
 $('#ownerModal').hidden=!on;
 $('#ownerModal').classList.toggle('hidden',!on);if(!on)$('#ownerContent').replaceChildren();
 $('#accountMenu').hidden=!signed;if(typeof renderAppNavigation==='function')renderAppNavigation();
}
function closeAccountMenu(){if(typeof closeAppMenu==='function')closeAppMenu();}
function setOwnerPortal(on){document.body.classList.toggle('owner-portal',on);memory.portal=on?'owner':'counter';$('#ownerModal').classList.toggle('hidden',!on);if(!on)$('#ownerContent').replaceChildren();closeAccountMenu();syncPortalVisibility();if(on)renderOwnerPortal();window.scrollTo({top:0})}
const portalOpen=open;open=(id,push=true)=>{if(id==='ownerModal'){if(memory.currentUser?.role!=='owner')return;setOwnerPortal(true);if(push&&historyReady)setHistory(memory.currentView,id,'push');return}portalOpen(id,push)};
const portalClose=close;close=(id,skipHistory=false)=>{if(id==='ownerModal'){if(!discardOwnerDraft())return;setOwnerPortal(false);if(!skipHistory&&history.state?.modal===id)history.back();return}portalClose(id,skipHistory)};
const portalCloseAll=closeAllModals;closeAllModals=()=>{portalCloseAll();document.body.classList.remove('owner-portal');$('#ownerModal').classList.add('hidden');memory.portal='counter';syncPortalVisibility()};
const portalLogin=login;login=(role,user)=>{memory.portal='counter';memory.equipmentPage=null;portalLogin(role,user);setOwnerPortal(false);switchView('arena',false);if(historyReady)setHistory('arena',null,'replace')};
const portalLogout=logout;logout=()=>{if(!discardOwnerDraft())return;portalLogout();document.body.classList.remove('owner-portal');$('#ownerModal').classList.add('hidden');memory.portal=undefined;syncPortalVisibility();closeAccountMenu()};$('#logoutBtn').onclick=logout;
const portalAccess=applyAccessUI;applyAccessUI=()=>{portalAccess();if(memory.currentUser?.role==='owner'&&memory.portal===undefined){memory.portal='counter'}if(memory.currentUser?.role!=='owner'){document.body.classList.remove('owner-portal');$('#ownerModal').classList.add('hidden')}syncPortalVisibility()};
$('#adminBtn').onclick=()=>{if(memory.currentUser?.role!=='owner')return;memory.ownerTab='overview';open('ownerModal')};
$('#ownerCounter').onclick=()=>{if(discardOwnerDraft()){setOwnerPortal(false);switchView('arena',false);if(historyReady)setHistory('arena',null,'push')}};
function navigateOwner(tab,push=true){if(memory.currentUser?.role!=='owner'||!discardOwnerDraft())return;memory.ownerTab=tab;if(tab==='equipment')memory.equipmentPage=null;memory.portal='owner';syncPortalVisibility();closeAccountMenu();renderOwnerPortal();if(push&&historyReady)setHistory(memory.currentView,'ownerModal','push');window.scrollTo({top:0,behavior:'instant'})}
$('#ownerTabs').onclick=e=>{const b=e.target.closest('[data-owner-tab]');if(b)navigateOwner(b.dataset.ownerTab)};
$('#ownerContent').addEventListener('input',e=>{if(!e.target.matches('input,select,textarea')||e.target.matches('[data-eod-start],[data-eod-end],#eodActualCash,#eodNote,[data-finance-search],[data-finance-filter],[data-eq-search]'))return;ownerDraft=true;$('#ownerSaveStatus').textContent='Unsaved changes — tap Save'});
$('#ownerContent').addEventListener('change',e=>{if(e.target.matches('[data-staff-active],[data-staff-perm],[data-v-type],[data-v-price],[data-v-ext],[data-v-btype]')){ownerDraft=true;$('#ownerSaveStatus').textContent='Unsaved changes — tap Save'}});
window.addEventListener('beforeunload',e=>{if(ownerDraft){e.preventDefault();e.returnValue=''}});
function ownerSubnav(items,selected){return `<nav class="owner-section-tabs" aria-label="Section pages">${items.map(([id,name])=>`<button data-owner-sub="${id}" ${selected===id?'class="active" aria-current="page"':''}>${name}</button>`).join('')}</nav>`}
function renderOwnerPortal(){
 if(memory.currentUser?.role!=='owner')return;const tab=memory.ownerTab||'overview',section=portalSection(tab),c=$('#ownerContent');let content='';
 if(section==='overview')content=ownerOverview();
 if(section==='equipment')content=ownerEquipment();
 if(section==='staff')content=ownerStaff();
 if(section==='operations')content=wsOperationsPage();
 if(section==='activities')content=ownerSubnav([['activities','Activities & battery policy'],['pricing','Packages & extensions']],tab)+(tab==='pricing'?ownerPricing():activityOSSettings());
 if(section==='finance')content=ownerSubnav([['finance','Sales, expenses & closing'],['partners','Partners & investment']],tab)+(tab==='partners'?partnerDashboard():ownerEod());
 if(section==='settings')content=ownerSubnav([['settings','Business & alarm'],['backup','Backup & data']],tab)+(tab==='backup'?ownerBackup():ownerSettings());
 c.innerHTML=content;$('#ownerConsoleTitle').textContent=ownerSectionNames[section]||'Owner portal';$$('[data-owner-tab]').forEach(b=>{b.classList.toggle('active',b.dataset.ownerTab===section);if(b.dataset.ownerTab===section)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current')});
 bindOwnerActions();bindActivityOSActions();
 $$('[data-owner-sub]').forEach(b=>b.onclick=()=>navigateOwner(b.dataset.ownerSub));$$('[data-owner-goto]').forEach(b=>b.onclick=()=>navigateOwner(b.dataset.ownerGoto));$$('[data-counter-view]').forEach(b=>b.onclick=()=>{if(!discardOwnerDraft())return;setOwnerPortal(false);switchView(b.dataset.counterView)});
 c.querySelectorAll('.owner-autosave-note').forEach(e=>e.remove());
 labelOwnerFields(c);if(tab==='pricing')tidyPricingEditors(c);if(tab==='partners')bindFinanceDashboard(c);decorateWorkspace(c,tab);if(section==='equipment')bindEquipmentPage(c);if(typeof renderAppNavigation==='function')renderAppNavigation();markOwnerSaved();
}
function labelOwnerFields(root){const labels={'vName':'Equipment name','vCode':'Equipment code','vType':'Equipment type','vPrice':'Pricing profile','vExt':'Extension profile','vBtype':'Battery type','pName':'Package name','pProf':'Pricing profile','pMin':'Duration (minutes)','pPrice':'Price (₹)','eName':'Extension name','eProf':'Extension profile','eMin':'Extra minutes','ePrice':'Price (₹)','bCode':'Battery code','bType':'Battery type','btName':'Battery type name','btVolt':'Voltage','btCap':'Capacity','btConn':'Connector','staffName':'Operator name','staffPin':'Operator PIN','typeName':'Equipment type name','priceProfile':'Pricing profile name','extProfile':'Extension profile name'};root.querySelectorAll('.editor-grid input,.editor-grid select,.add-row input').forEach(input=>{const key=Object.keys(labels).find(k=>input.dataset[k]!==undefined);if(!key||input.parentElement.tagName==='LABEL')return;const label=document.createElement('label');label.textContent=labels[key];input.before(label);label.append(input)})}
const portalFleet=renderFleet;renderFleet=()=>{const expanded=new Set([...document.querySelectorAll('#fleet .ride-more[open]')].map(e=>e.closest('.car-card').querySelector('[data-end]')?.dataset.end||e.closest('.car-card').querySelector('[data-swap]')?.dataset.swap));portalFleet();const fleet=$('#fleet');if(!fleet)return;
 // Active/expired rides first; keep ordering stable within each group.
 const cards=[...fleet.children];cards.sort((a,b)=>Number(!a.classList.contains('over'))-Number(!b.classList.contains('over'))||Number(!a.querySelector('[data-end]'))-Number(!b.querySelector('[data-end]')));cards.forEach(card=>fleet.append(card));
 fleet.querySelectorAll('.actions').forEach(actions=>{const card=actions.closest('.car-card'),over=card.classList.contains('over');const end=actions.querySelector('[data-end]');if(end)end.innerHTML=over?'RETURNED':'END RIDE';const extend=actions.querySelector('[data-extend]');if(extend)extend.textContent='EXTEND';const resume=actions.querySelector('[data-resume]');if(resume)resume.textContent='INSTALLED — RESUME';const secondary=[...actions.children].filter(b=>!b.matches('[data-extend],[data-resume]')&&!(over&&b.matches('[data-end]')));if(secondary.length){const more=document.createElement('details');more.className='ride-more';const summary=document.createElement('summary');summary.textContent='More';more.append(summary);const body=document.createElement('div');body.className='ride-more-actions';secondary.forEach(b=>body.append(b));more.append(body);actions.append(more);const key=card.querySelector('[data-end]')?.dataset.end||card.querySelector('[data-swap]')?.dataset.swap;if(expanded.has(key))more.open=true}});
 fleet.querySelectorAll('[data-new]').forEach(b=>b.textContent='START');
};
const portalSmart=renderSmartOperations;renderSmartOperations=()=>{portalSmart();const box=$('#smartOperations');if(!box)return;const starts=box.querySelector('.os-starts');if(starts){starts.querySelectorAll('[data-os-start]').forEach(b=>{const a=data.activities.find(a=>a.id===b.dataset.osStart),p=data.packages.find(p=>p.active!==false&&p.profileId===a?.profileId);if(p)b.innerHTML=`<span>+ START ${esc(a.name.toUpperCase())}</span><small>${p.minutes} min · ${money(p.price)}</small>`});const heading=box.querySelector('h3');if(box.querySelector('.os-task')){heading.textContent='Action required';box.append(starts)}else heading.textContent='Ready for customers'} };
const portalRideChoices=renderRideChoices;renderRideChoices=()=>{portalRideChoices();const v=vehicle(memory.selectedVehicle),b=battery(v?.currentBatteryId);let info=$('#rideReadySummary');if(!info){info=document.createElement('p');info.id='rideReadySummary';info.className='notice';$('#packageButtons').before(info)}info.textContent=`Use ${v?.name||'car'} · ${b?.code||'No battery'} · estimated safe time ${batteryRemaining(b).toFixed(1)} min`;$('#packageButtons').querySelectorAll('[data-package]').forEach(button=>{const p=packageBy(button.dataset.package);button.disabled=!batteryCanRun(b,p.minutes)});const p=packageBy(memory.selectedPackage);$('#startRide').disabled=!p||!batteryCanRun(b,p.minutes)};
// Queue tokens keep names optional.
const portalQueue=openQueueModal;openQueueModal=()=>{portalQueue();$('#queueName').placeholder='Optional — token generated automatically'};$('#addQueue').onclick=openQueueModal;
const portalQueueSave=$('#saveQueue').onclick;$('#saveQueue').onclick=()=>{if(!$('#queueName').value.trim())$('#queueName').value=`Q-${String((data.settings.nextQueueToken||1)).padStart(3,'0')}`;data.settings.nextQueueToken=(data.settings.nextQueueToken||1)+1;portalQueueSave()};
// Customer tokens are displayed on the card without asking for personal details.
const portalStart=$('#startRide').onclick;$('#startRide').onclick=()=>{const before=data.rides.length;portalStart();if(data.rides.length>before){const r=data.rides.at(-1);if(!r.customer){r.customer='Customer '+r.rideNumber.split('-').at(-1);save();renderFleet()}}};

const portalHistory=applyHistoryState;applyHistoryState=state=>{if(!discardOwnerDraft()){setHistory(memory.currentView,'ownerModal','push');return}portalHistory(state)};

function tidyPricingEditors(root){
 for(const [key,collection,saveKey] of [['p',data.packages,'package'],['e',data.extensions,'extension']]){
  const rows=[...root.querySelectorAll(`[data-${key}-name]`)];
  for(const input of rows){const id=input.dataset[key+'Name'],item=collection.find(p=>p.id===id),row=input.closest('.editor-row');if(!item||!row)continue;const enabled=document.createElement('label');enabled.className='package-enabled';enabled.innerHTML=`<input type="checkbox" data-enabled-package="${esc(id)}" ${item.active!==false?'checked':''}> Available to staff`;row.prepend(enabled);const button=row.querySelector(`[data-save-${saveKey}]`),original=button.onclick;button.onclick=()=>{item.active=enabled.querySelector('input').checked;original()};if(item.active===false){const panel=row.closest('.panel');let archive=panel.querySelector('.archived-pricing');if(!archive){archive=document.createElement('details');archive.className='archived-pricing';archive.innerHTML='<summary>Inactive options</summary>';panel.append(archive)}archive.append(row)}
  }
 }
}

