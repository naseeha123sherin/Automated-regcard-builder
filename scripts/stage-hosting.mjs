import fs from 'node:fs';
fs.mkdirSync('dist/.openai',{recursive:true});
fs.copyFileSync('.openai/hosting.json','dist/.openai/hosting.json');
