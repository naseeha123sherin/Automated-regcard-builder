import fs from 'node:fs';
import ts from 'typescript';
// Mechanical formatting through the TypeScript printer; never changes references.
const printer=ts.createPrinter({newLine:ts.NewLineKind.LineFeed});
function format(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const file=dir+'/'+entry.name;if(entry.isDirectory())format(file);else if(/\.tsx?$/.test(file)){const source=ts.createSourceFile(file,fs.readFileSync(file,'utf8'),ts.ScriptTarget.Latest,true,file.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);fs.writeFileSync(file,printer.printFile(source));}}}
for(const dir of ['frontend','backend','shared','tests'])format(dir);
