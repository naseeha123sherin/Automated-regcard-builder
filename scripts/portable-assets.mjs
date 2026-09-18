// Generated asset staging only. This avoids process-spawning in restricted hosts.
import fs from 'node:fs';
import path from 'node:path';
fs.mkdirSync('dist/client/assets',{recursive:true});
fs.copyFileSync('public/favicon.svg','dist/client/favicon.svg');
fs.copyFileSync('node_modules/pdfjs-dist/build/pdf.worker.min.mjs','dist/client/assets/pdf.worker.min.mjs');
const css=fs.readFileSync('dist/client/assets/app.css','utf8');
fs.writeFileSync('dist/client/assets/app.css',css.replace(/@import\s*["']tailwindcss["'];?/g,''));
const html=fs.readFileSync('index.html','utf8').replace('/frontend/main.tsx','/assets/app.js').replace('</head>','<link rel="stylesheet" href="/assets/app.css"/></head>');
fs.writeFileSync('dist/client/index.html',html);
fs.mkdirSync('dist/.openai',{recursive:true});
const manifest=JSON.parse(fs.readFileSync('.openai/hosting.json','utf8'));delete manifest.build;delete manifest.static;
fs.writeFileSync('dist/.openai/hosting.json',JSON.stringify(manifest,null,2));
console.log('Portable assets staged:',path.resolve('dist'));
