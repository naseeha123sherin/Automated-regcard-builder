import { type Element, type Analysis } from './model';
import { mapLabels, normalizeLabel } from './mapping';

export interface PdfText { text:string; x:number; y:number; width:number; height:number; fontSize:number; fontFamily?:string; bold?:boolean; italic?:boolean }
export interface PdfGeometry { kind:'line'|'rectangle'|'image'; x:number; y:number; width:number; height:number; lineWidth?:number; borderColor?:string; background?:string }
export interface PdfPage { width:number; height:number; texts:PdfText[]; geometry:PdfGeometry[]; pages:number }
export const normalizedBounds=(box:{x:number;y:number;width:number;height:number},page:{width:number;height:number})=>({x:Math.max(0,Math.min(1,box.x/page.width)),y:Math.max(0,Math.min(1,box.y/page.height)),width:Math.max(0,Math.min(1-box.x/page.width,box.width/page.width)),height:Math.max(0,Math.min(1-box.y/page.height,box.height/page.height))});
export const pdfToRdlBounds=(box:{x:number;y:number;width:number;height:number},page:{width:number;height:number})=>{const n=normalizedBounds(box,page);return {x:n.x*20,y:n.y*25,width:n.width*20,height:n.height*25};};

// Deterministic first pass on actual text runs and vector bounds. Vision is an optional correction pass.
export function analyzePdfLayout(page:PdfPage):Analysis {
 const elements:Element[]=[],warnings=['Local PDF reconstruction is an initial design. Review every dynamic area and approve the visual comparison.'];
 const textRuns=page.texts.filter(t=>t.text.trim()).sort((a,b)=>Math.abs(a.y-b.y)<4?a.x-b.x:a.y-b.y);
 const scale=Math.min(20/(page.width/72*2.54),25/(page.height/72*2.54));
 const consumed=new Set<PdfText>();
 const labelInfo=(s:string)=>{const colon=s.indexOf(':');const candidate=colon>=0?s.slice(0,colon):s;const m=mapLabels([candidate])[0];return m.confidence>=.9&&candidate.length<55?{label:colon>=0?s.slice(0,colon+1):s,m,inline:colon>=0?s.slice(colon+1).trim():''}:null;};
 const addText=(t:PdfText,text:string,width=t.width)=>elements.push({id:`text_${elements.length}`,kind:'text',text,...normalizedBounds({...t,width},page),fontSize:Math.max(5,t.fontSize*scale),fontFamily:t.fontFamily||'Arial',bold:!!t.bold,italic:!!t.italic,align:'Left'});
 const addDynamic=(t:PdfText,label:string,name:string,value:string)=>elements.push({id:`value_${elements.length}`,kind:'dynamic',fieldName:name,detectedLabel:label,detectedValue:value,...normalizedBounds(t,page),fontSize:Math.max(5,t.fontSize*scale),fontFamily:t.fontFamily||'Arial',bold:!!t.bold,align:'Left'});
 for(const t of textRuns){
  if(consumed.has(t))continue;const info=labelInfo(t.text);
  if(info){
   const labelWidth=info.inline?Math.min(t.width,t.width*info.label.length/t.text.length):t.width;addText(t,info.label,labelWidth);
   const sameRow=textRuns.filter(o=>o!==t&&!consumed.has(o)&&Math.abs(o.y-t.y)<4&&o.x>=t.x+t.width-1).sort((a,b)=>a.x-b.x),next=sameRow[0],nextLabel=next&&labelInfo(next.text);
   const nextColumnLabel=textRuns.filter(o=>o!==t&&Math.abs(o.y-t.y)<Math.max(6,t.height*.7)&&o.x>t.x+t.width&&labelInfo(o.text)).sort((a,b)=>a.x-b.x)[0];
   const cellRight=nextColumnLabel?.x??Math.min(page.width*.96,t.x+Math.max(t.width*4,page.width*.26));
   const below=textRuns.filter(o=>o!==t&&!consumed.has(o)&&o.y>t.y+2&&o.y-t.y<Math.max(42,page.height*.065)&&o.x+o.width/2>=t.x-4&&o.x+o.width/2<cellRight&&!labelInfo(o.text)&&o.text.length<90&&!/^(business|leisure|cash|credit card|company|direct bill)$/i.test(o.text.trim())).sort((a,b)=>(a.y-b.y)||Math.abs((a.x+a.width/2)-(t.x+t.width/2))-Math.abs((b.x+b.width/2)-(t.x+t.width/2)))[0];
   const sample=info.inline?undefined:(!nextLabel&&next&&next.x-t.x-t.width<page.width*.3?next:below),value=info.inline||sample?.text||'';
   const box=info.inline?{...t,x:t.x+labelWidth+3,width:Math.max(12,t.width-labelWidth),height:Math.max(t.height*1.25,10)}:sample?{...sample,width:Math.max(sample.width,Math.min(cellRight-sample.x,page.width*.28))}:{...t,x:t.x+t.width+6,width:Math.max(12,cellRight-(t.x+t.width+6)),height:Math.max(t.height*1.25,10)};
   addDynamic(box,info.label,info.m.fieldName!,value);if(sample)consumed.add(sample);continue;
  }
  // Split the commonly printed combined adults / children value without copying it as static text.
  if(normalizeLabel(t.text).startsWith('guests')){
   const v=t.text.split(':').slice(1).join(':').trim().split('/');const next=textRuns.find(o=>o!==t&&Math.abs(o.y-t.y)<4&&o.x>t.x+t.width-1);
   addText(t,'Guests:',Math.min(t.width,40));const x=next?.x||t.x+45;const val=v.length>1?v:next?.text.split('/')||[];if(next)consumed.add(next);
   addDynamic({...t,x,width:18},'Adults','adultCount',val[0]?.trim()||'');addText({...t,x:x+20,width:8},'/');addDynamic({...t,x:x+30,width:18},'Children','childCount',val[1]?.trim()||'');continue;
  }
  // Unlabelled top-of-card names are provisional, never copied into static production XML.
  if(t.y/page.height>.08&&t.y/page.height<.18&&t.x/page.width<.35&&!/[0-9:@]/.test(t.text)&&!/(information|hotel|resort|registration|maldives|montage|setai|laguna)/i.test(t.text)){
   addDynamic(t,'Guest Name','Fullname',t.text);warnings.push('An unlabeled guest name was provisionally mapped to Fullname.');continue;
  }
  addText(t,t.text);
 }
 for(const g of page.geometry){const n=normalizedBounds(g,page);if(n.width<.0001&&n.height<.0001)continue;elements.push({id:`shape_${elements.length}`,kind:g.kind,...n,fontSize:9,bold:false,align:'Left',lineWidth:g.lineWidth??.5,borderColor:g.borderColor||'#000000',background:g.background,imageReviewed:g.kind==='image'?false:undefined});}
 const rectangles=elements.filter(e=>e.kind==='rectangle'&&e.width<.035&&e.height<.03);
 const checkboxTexts=textRuns.filter(t=>rectangles.some(r=>Math.abs(r.y-t.y/page.height)<.02&&t.x/page.width>r.x&&t.x/page.width<r.x+.16));
 const uniqueCheckboxTexts=checkboxTexts.filter((t,i,list)=>list.findIndex(o=>normalizeLabel(o.text)===normalizeLabel(t.text)&&Math.abs(o.x-t.x)<Math.max(3,t.width*.08)&&Math.abs(o.y-t.y)<Math.max(3,t.height*.35))===i);
 const checkboxLabels=checkboxTexts.map(t=>t.text);
 const all=textRuns.map(t=>t.text).join('\n');let start=textRuns.findIndex(t=>/liability information|terms (and|&) conditions|would you like to receive/i.test(t.text));
 if(start<0)start=textRuns.findIndex(t=>/^by signing|^i agree that|^important:/i.test(t.text));
 const termsY=start<0?Infinity:textRuns[start].y/page.height;
 const checkboxes=uniqueCheckboxTexts.map(t=>{const y=t.y/page.height,isTerms=y>=termsY||/agree|consent|promotion|questionnaire|acknowledge|privacy|offers?|invoice|quick check.?out/i.test(t.text);const nearby=textRuns.filter(o=>o!==t&&o.x<t.x&&Math.abs(o.y-t.y)<Math.max(8,t.height*1.2)).sort((a,b)=>b.x-a.x)[0];const above=textRuns.filter(o=>o!==t&&o.y<t.y&&t.y-o.y<35&&/purpose|payment|preference|method|stay/i.test(o.text)).sort((a,b)=>b.y-a.y)[0];const groupLabel=(nearby?.text||above?.text||'').replace(/[:：]\s*$/,'').trim()||undefined;const groupMap=groupLabel?mapLabels([groupLabel])[0].fieldName||undefined:undefined;const mapped=/smoking|smoker/i.test(t.text)?'isSmoking':groupMap||mapLabels([t.text])[0].fieldName||undefined;return {label:t.text,groupLabel,section:isTerms?'TERMS_AND_CONDITIONS' as const:'REGCARD_DETAILS' as const,mappedField:isTerms?undefined:mapped,confidence:isTerms||mapped?.length?0.94:0.68,x:t.x/page.width,y};});
 const terms=start<0?[]:textRuns.slice(start).filter(t=>t.y/page.height<.89&&!uniqueCheckboxTexts.includes(t)&&!/signature|contact information|name of accompanying|postal|^email:|^phone:|^address:|^city:|^prov/i.test(t.text)).map(t=>t.text);
 let propertyName='',propertyNameConfidence=0;
 const domain=/\b(?:www\.)?([a-z][a-z0-9-]+)\.(?:com|mv|ae)\b/i.exec(all);
 const heading=textRuns.find(t=>t.y/page.height<.1&&/hotel|resort|maldives|montage|setai/i.test(t.text));
 if(heading){propertyName=heading.text;propertyNameConfidence=.7;}else if(domain){propertyName=domain[1].replace(/[-_]/g,' ');propertyNameConfidence=.4;warnings.push('Property name inferred from a domain; exact display name requires review.');}
 if(page.pages>1)warnings.push(`${page.pages} PDF pages detected. This design covers page 1; review remaining pages before export.`);
 if(page.geometry.some(g=>g.kind==='image'))warnings.push('Image areas detected. Approve static artwork only; do not embed a source guest signature.');
 if(!terms.length)warnings.push('No terms region detected. Supply the current property terms, not reference legal text.');
 return {propertyName,propertyNameConfidence,orientation:page.width>page.height?'landscape':'portrait',elements,detectedLabels:[],terms,checkboxLabels,checkboxes,warnings};
}
