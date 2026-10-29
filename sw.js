const C='week-tracker-v4';
const A=['./','./index.html','./manifest.json','./style.css','./app.js','./icons/icon-192.png','./icons/icon-512.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(A)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==C).map(x=>caches.delete(x)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;e.respondWith(fetch(e.request).then(r=>{if(r.ok&&new URL(e.request.url).origin===location.origin){const c=r.clone();caches.open(C).then(x=>x.put(e.request,c))}return r}).catch(()=>caches.match(e.request).then(m=>m||caches.match('./index.html'))))});

self.addEventListener('notificationclick',e=>{
  const n=e.notification,d=n.data||{};n.close();
  if(!d.id)return;
  const a=e.action||'open';
  e.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(cl=>{
    if(cl.length){cl[0].postMessage({wtck:1,id:d.id,t:d.t,a:a==='open'?'':a});return cl[0].focus()}
    return self.clients.openWindow('./index.html?ck='+encodeURIComponent(d.id)+'&t='+d.t+(a==='open'?'':'&a='+a));
  }));
});
