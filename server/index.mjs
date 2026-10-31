import http from 'node:http';
import { createReadStream, statSync } from 'node:fs';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createAiMiddleware, loadLocalEnvironment } from './ai.mjs';

loadLocalEnvironment();
const root=fileURLToPath(new URL('../dist/',import.meta.url));
const ai=createAiMiddleware();
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png','.woff2':'font/woff2','.jpg':'image/jpeg','.jpeg':'image/jpeg','.ico':'image/x-icon'};
const server=http.createServer((req,res)=>ai(req,res,()=>{
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);return res.end('Method not allowed');}
  let pathname;try{pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch{res.writeHead(400);return res.end('Invalid URL');}
  let path=resolve(root,'.'+pathname);
  if(path!==root&&!path.startsWith(root+sep)){res.writeHead(403);return res.end('Forbidden');}
  try{if(!statSync(path).isFile())path=resolve(root,'index.html');}catch{if(extname(path)){res.writeHead(404);return res.end('Not found');}path=resolve(root,'index.html');}
  try{const stat=statSync(path);res.setHeader('Content-Type',types[extname(path)]||'application/octet-stream');res.setHeader('Content-Length',stat.size);res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Cache-Control',extname(path)==='.html'?'no-cache':'public, max-age=3600');if(req.method==='HEAD')return res.end();createReadStream(path).pipe(res);}catch{res.writeHead(503,{'Content-Type':'text/plain'});res.end('Build the storefront first with npm run build.');}
}));
const port=Number(process.env.PORT||4173);
server.listen(port,'127.0.0.1',()=>console.log(`Floume storefront: http://127.0.0.1:${port}/en/`));
