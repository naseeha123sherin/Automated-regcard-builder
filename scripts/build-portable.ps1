$ErrorActionPreference='Stop'
$compiler=(Get-ChildItem -LiteralPath 'node_modules/.pnpm' -Directory | Where-Object Name -Like '@esbuild+win32-x64@0.25.*' | Select-Object -First 1).FullName + '/node_modules/@esbuild/win32-x64/esbuild.exe'
node node_modules/typescript/bin/tsc --noEmit
if($LASTEXITCODE -ne 0){throw 'Typecheck failed'}
& $compiler frontend/main.tsx --bundle --format=esm --platform=browser --minify --outfile=dist/client/assets/app.js '--alias:monaco-editor/esm/vs/editor/editor.worker?worker=./frontend/services/editor-worker.ts' '--alias:monaco-editor/esm/vs/language/json/json.worker?worker=./frontend/services/json-worker.ts' '--alias:pdfjs-dist/build/pdf.worker.min.mjs?url=./frontend/services/pdf-worker-url.ts' --external:tailwindcss --loader:.ttf=file
if($LASTEXITCODE -ne 0){throw 'Frontend build failed'}
& $compiler node_modules/monaco-editor/esm/vs/editor/editor.worker.js --bundle --format=esm --platform=browser --minify --outfile=dist/client/assets/editor.worker.js
& $compiler node_modules/monaco-editor/esm/vs/language/json/json.worker.js --bundle --format=esm --platform=browser --minify --outfile=dist/client/assets/json.worker.js
& $compiler backend/worker.ts --bundle --format=esm --platform=browser --minify --outfile=dist/server/index.js
& $compiler backend/server.ts --bundle --format=esm --platform=node --packages=external --outfile=generated/server.js
& $compiler tests/native.test.ts --bundle --format=esm --platform=node --outfile=generated/native.test.mjs
if($LASTEXITCODE -ne 0){throw 'Backend/test build failed'}
node scripts/portable-assets.mjs
node generated/native.test.mjs
if($LASTEXITCODE -ne 0){throw 'Native tests failed'}
