export const money=(n,c='₹')=>`${c}${Number(n||0).toLocaleString('en-IN')}`;
export const fmtTime=ms=>{ms=Math.max(0,ms); const total=Math.ceil(ms/1000),m=Math.floor(total/60),s=total%60; return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;};
export const dt=ts=>new Date(ts).toLocaleString('en-IN',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'});
export const todayKey=()=>new Date().toISOString().slice(0,10);
export const escapeHtml=s=>String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
export function beep(){try{const ctx=new (window.AudioContext||window.webkitAudioContext)(); const o=ctx.createOscillator(),g=ctx.createGain(); o.frequency.value=880; o.type='square'; g.gain.setValueAtTime(.18,ctx.currentTime); g.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+.6); o.connect(g);g.connect(ctx.destination);o.start();o.stop(ctx.currentTime+.6); if(navigator.vibrate)navigator.vibrate([250,120,250]);}catch{}}
