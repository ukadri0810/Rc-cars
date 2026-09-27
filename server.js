const http = require('http');
const fs = require('fs');
const path = require('path');
const port = process.env.PORT || 4173;
const root = __dirname;
const types = {'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.svg':'image/svg+xml','.ico':'image/x-icon'};
http.createServer((req,res)=>{
  const clean = decodeURIComponent(req.url.split('?')[0]);
  let filePath = path.join(root, clean === '/' ? 'index.html' : clean);
  if (!filePath.startsWith(root)) { res.writeHead(403); return res.end('Forbidden'); }
  fs.stat(filePath,(err,stat)=>{
    if(!err && stat.isDirectory()) filePath=path.join(filePath,'index.html');
    fs.readFile(filePath,(e,data)=>{
      if(e){res.writeHead(404); return res.end('Not found');}
      res.writeHead(200,{'Content-Type':types[path.extname(filePath)]||'application/octet-stream','Cache-Control':'no-cache'}); res.end(data);
    });
  });
}).listen(port,()=>console.log(`KAS RC Arena running on http://localhost:${port}`));
