/* Counter first, one page menu, and recoverable page/session navigation. */
const APP_PAGES=[['arena','Counter','i-home'],['queue','Waiting','i-queue'],['rides','Transactions','i-history'],['batteries','Equipment','i-battery']];
const OWNER_PAGES=[['overview','Business overview','i-home'],['activities','Activities & prices','i-play'],['finance','Sales & closing','i-wallet'],['partners','Partners & investment','i-users'],['staff','Team & access','i-user'],['settings','Settings & backup','i-settings']];
let appMenuOpen=false,sessionReturnScroll=0;
function renderAppNavigation(){
 const signed=!!memory.currentUser,owner=memory.currentUser?.role==='owner',desktop=innerWidth>=850,nav=$('#appNavigation');if(!nav)return;
 nav.hidden=!signed||(!desktop&&!appMenuOpen);$('#navigationBackdrop').hidden=!signed||desktop||!appMenuOpen;$('#accountToggle').setAttribute('aria-expanded',String(appMenuOpen));document.body.classList.toggle('menu-open',signed&&!desktop&&appMenuOpen);
 const current=memory.portal==='owner'?(portalSection(memory.ownerTab)==='equipment'?'batteries':memory.ownerTab):memory.currentView;
 const ownerRoute=OWNER_PAGES.some(([id])=>id===current)?current:portalSection(current);
 const links=(pages,kind)=>pages.map(([id,label,icon])=>`<button type="button" data-app-${kind}="${id}" ${(kind==='owner'?ownerRoute===id:current===id)?'class="active" aria-current="page"':''}>${svg(icon)}<span>${label}</span>${id==='queue'?`<b id="queueBadge" class="nav-count ${data.queue.length?'':'hidden'}">${data.queue.length}</b>`:''}</button>`).join('');
 $('#navigationLinks').innerHTML=`<p class="navigation-group">Daily work</p>${links(APP_PAGES.filter(([id])=>can(id)),'view')}${owner?`<p class="navigation-group">Business management</p>${links(OWNER_PAGES,'owner')}`:''}`;
 $('#navigationLinks').querySelectorAll('[data-app-view]').forEach(b=>b.onclick=()=>goAppView(b.dataset.appView));$('#navigationLinks').querySelectorAll('[data-app-owner]').forEach(b=>b.onclick=()=>navigateOwner(b.dataset.appOwner));
 $('#accountMenu').hidden=!signed||desktop;
}
function closeAppMenu(){appMenuOpen=false;renderAppNavigation()}
function goAppView(view){if(!discardOwnerDraft()||!can(view))return;if(view==='batteries'&&memory.currentUser?.role==='owner'){memory.equipmentPage=null;navigateOwner('equipment');return}closeAllModals();memory.portal='counter';if(view==='batteries')memory.equipmentPage=null;syncPortalVisibility();switchView(view,false);if(historyReady)setHistory(view,null,'push');window.scrollTo({top:0,behavior:'instant'});renderAppNavigation();}
$('#accountToggle').onclick=()=>{appMenuOpen=!appMenuOpen;renderAppNavigation();if(appMenuOpen)$('#closeNavigation').focus()};$('#closeNavigation').onclick=()=>{closeAppMenu();$('#accountToggle').focus()};$('#navigationBackdrop').onclick=closeAppMenu;
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&appMenuOpen){e.preventDefault();closeAppMenu();$('#accountToggle').focus()}if(e.key==='Tab'&&appMenuOpen&&innerWidth<850){const targets=[...$('#appNavigation').querySelectorAll('button:not([hidden]):not(.hidden)')],first=targets[0],last=targets.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}}});
window.addEventListener('resize',()=>{appMenuOpen=false;renderAppNavigation()});
setHistory=(view=memory.currentView,modal=null,mode='push')=>{const state={kas:true,view:view||'arena',modal:modal||null,portal:memory.portal||'counter',ownerTab:memory.ownerTab||'overview',equipment:memory.equipmentPage?structuredClone(memory.equipmentPage):null};try{history[mode==='replace'?'replaceState':'pushState'](state,'')}catch{}};
applyHistoryState=state=>{
 const dialog=document.querySelector('dialog[open]');if(dialog){if(dialog.dataset.saving==='true'){setHistory(memory.currentView,memory.portal==='owner'?'ownerModal':null,'push');toast('Payment is saving — please wait');return}if(!discardOwnerDraft()){setHistory(memory.currentView,memory.portal==='owner'?'ownerModal':null,'push');return}dialog.close();markOwnerSaved();setHistory(memory.currentView,memory.portal==='owner'?'ownerModal':null,'push');return}
 if(!discardOwnerDraft()){setHistory(memory.currentView,memory.portal==='owner'?'ownerModal':null,'push');return}
 closeAllModals();memory.equipmentPage=state?.equipment||null;const owner=memory.currentUser?.role==='owner'&&(state?.portal==='owner'||state?.modal==='ownerModal');memory.portal=owner?'owner':'counter';memory.ownerTab=state?.ownerTab||'overview';syncPortalVisibility();switchView(can(state?.view)?state.view:'arena',false);if(owner)renderOwnerPortal();if(state?.modal&&state.modal!=='ownerModal'&&$('#'+state.modal))open(state.modal,false);window.scrollTo({top:0,behavior:'instant'});renderAppNavigation();
};
const navigationSwitch=switchView;switchView=(view,push=true)=>{if(view==='batteries'&&memory.currentUser?.role==='owner'&&memory.portal!=='owner'){navigateOwner('equipment',push);return}navigationSwitch(view,push);renderAppNavigation();window.scrollTo({top:0,behavior:'instant'})};
// Each task opens as its own full-screen form, preserving the originating page.
const navigationOpen=open;open=(id,push=true)=>{if(id!=='ownerModal'){sessionReturnScroll=scrollY;document.body.classList.add('session-open');const modal=$('#'+id);modal?.classList.add('session-page');const card=modal?.querySelector('.modal-card');card?.scrollTo({top:0});modal?.querySelector('[data-close]')?.focus();}navigationOpen(id,push);if(id!=='ownerModal')$('#'+id)?.querySelector('[data-close]')?.focus();closeAppMenu();};
const navigationClose=close;close=(id,skipHistory=false)=>{navigationClose(id,skipHistory);if(!document.querySelector('.modal:not(.hidden)')){document.body.classList.remove('session-open');window.scrollTo({top:sessionReturnScroll,behavior:'instant'})}};
const navigationCloseAll=closeAllModals;closeAllModals=()=>{navigationCloseAll();document.body.classList.remove('session-open');closeAppMenu()};
// Clear Back labels replace ambiguous close icons in task pages.
document.querySelectorAll('.modal [data-close]').forEach(button=>{button.classList.add('session-back');button.textContent='← Back';button.setAttribute('aria-label','Back to previous page')});

$('#backToCounter').onclick=()=>goAppView('arena');

for(const view of ['queue','rides']){const back=document.createElement('button');back.className='page-back';back.textContent='← Counter';back.onclick=()=>goAppView('arena');$('#view-'+view).prepend(back)}
