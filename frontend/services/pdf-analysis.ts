import { OPS, Util, type PDFPageProxy } from 'pdfjs-dist';
import { analyzePdfLayout, type PdfText, type PdfGeometry, type PdfPage } from '../../shared/pdf-layout';
import { cropLogo } from './logo';
import type { Analysis } from '../../shared/model';

export async function extractPdfPage(page:PDFPageProxy,pages:number):Promise<PdfPage> {
 const vp=page.getViewport({scale:1}),content=await page.getTextContent(),ops=await page.getOperatorList();
 const texts:PdfText[]=content.items.filter(i=>'str' in i).map(i=>{
  if(!('str' in i))throw Error('Invalid text run');const tr=Util.transform(vp.transform,i.transform),height=Math.hypot(tr[2],tr[3]);const style=content.styles[i.fontName];
  return {text:i.str,x:tr[4],y:tr[5]-height*(style?.ascent||.8),width:i.width,height:height*1.12,fontSize:height,fontFamily:style?.fontFamily||'Arial',bold:/bold/i.test(style?.fontFamily||''),italic:/italic|oblique/i.test(style?.fontFamily||'')};
 });
 let matrix=[1,0,0,1,0,0],lineWidth=.5,color='#000000',fill='#FFFFFF';const stack:{matrix:number[];lineWidth:number;color:string;fill:string}[]=[];const geometry:PdfGeometry[]=[];
 const save=()=>stack.push({matrix:[...matrix],lineWidth,color,fill});const restore=()=>{const s=stack.pop();if(s){matrix=s.matrix;lineWidth=s.lineWidth;color=s.color;fill=s.fill;}};
 const point=(x:number,y:number)=>{const tr=Util.transform(vp.transform,matrix);return [tr[0]*x+tr[2]*y+tr[4],tr[1]*x+tr[3]*y+tr[5]];};
 const box=(bounds:number[])=>{const a=point(bounds[0],bounds[1]),b=point(bounds[2],bounds[3]);return {x:Math.min(a[0],b[0]),y:Math.min(a[1],b[1]),width:Math.abs(a[0]-b[0]),height:Math.abs(a[1]-b[1])};};
 const rgb=(args:unknown[])=>typeof args[0]==='string'?String(args[0]):'#'+args.slice(0,3).map(n=>Math.max(0,Math.min(255,Number(n))).toString(16).padStart(2,'0')).join('');
 for(let i=0;i<ops.fnArray.length;i++){
  const op=ops.fnArray[i],a=ops.argsArray[i] as unknown[];
  if(op===OPS.save)save();else if(op===OPS.restore)restore();else if(op===OPS.transform)matrix=Util.transform(matrix,a as number[]);
  else if(op===OPS.paintFormXObjectBegin){save();if(a[0])matrix=Util.transform(matrix,a[0] as number[]);}else if(op===OPS.paintFormXObjectEnd)restore();
  else if(op===OPS.setLineWidth)lineWidth=Number(a[0]);else if(op===OPS.setStrokeRGBColor)color=rgb(a);else if(op===OPS.setFillRGBColor)fill=rgb(a);
  else if(op===OPS.paintImageXObject||op===OPS.paintInlineImageXObject){geometry.push({kind:'image',...box([0,0,1,1])});}
  else if(op===OPS.constructPath&&a[2]){
   const b=box(a[2] as number[]),draw=(a[1] as (number[]|Float32Array)[])[0];if(!draw||!(Array.isArray(draw)||ArrayBuffer.isView(draw)))continue;
   let p=0,cur:number[]|null=null,start:number[]|null=null,curved=false;const segments:number[][]=[];
   while(p<draw.length){const code=draw[p++];if(code===0){cur=[draw[p++],draw[p++]];start=cur;}else if(code===1){const next=[draw[p++],draw[p++]];if(cur)segments.push([...cur,...next]);cur=next;}else if(code===4){if(cur&&start)segments.push([...cur,...start]);}else if(code===2){p+=6;curved=true;}else if(code===3){p+=4;curved=true;}else break;}
   const painting=Number(a[0]);if(![OPS.stroke,OPS.closeStroke,OPS.fill,OPS.eoFill,OPS.fillStroke,OPS.eoFillStroke,OPS.closeFillStroke,OPS.closeEOFillStroke].includes(painting))continue;const hasStroke=[OPS.stroke,OPS.closeStroke,OPS.fillStroke,OPS.eoFillStroke,OPS.closeFillStroke,OPS.closeEOFillStroke].includes(painting),isFill=[OPS.fill,OPS.eoFill,OPS.fillStroke,OPS.eoFillStroke].includes(painting);
   if(curved)continue;
   if(b.width>.5&&b.height>.5&&segments.length>=4&&segments.every(s=>Math.abs(s[0]-s[2])<.01||Math.abs(s[1]-s[3])<.01))geometry.push({kind:'rectangle',...b,lineWidth:hasStroke?lineWidth:0,borderColor:color,background:isFill?fill:undefined});
   else for(const segment of segments){const r=box(segment);if(r.width>.5||r.height>.5)geometry.push({kind:'line',...r,lineWidth,borderColor:color});}
  }
 }
 return {width:vp.width,height:vp.height,texts,geometry,pages};
}
export async function localPdfAnalysis(page:PdfPage,preview:string):Promise<Analysis>{
 const a=analyzePdfLayout(page);
 for(const e of a.elements.filter(e=>e.kind==='image')){
  const signature=a.elements.find(t=>t.kind==='text'&&/signature/i.test(t.text||'')&&Math.abs(t.y-e.y)<.05);
  if(signature){a.elements=a.elements.filter(t=>t.id!==e.id);a.warnings.push('Source guest-signature image omitted. Add an approved Signature dynamic field if required.');continue;}
  const image=await cropLogo(preview,e);e.imageData=image.dataUrl;e.imageReviewed=false;
 }
 return a;
}
