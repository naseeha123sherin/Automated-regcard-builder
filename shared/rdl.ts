import { DOMParser } from '@xmldom/xmldom';
import { validateXmlClosure } from './xml';
import { type Project } from './model';
import { effectiveElements } from './project';
export const RDL_NS = 'http://schemas.microsoft.com/sqlserver/reporting/2016/01/reportdefinition';
export const RDL_DESIGNER_NS = 'http://schemas.microsoft.com/SQLServer/reporting/reportdesigner';
export const RDL_AUTHORING_NS = 'http://schemas.microsoft.com/sqlserver/reporting/authoringmetadata';
export const RDL_PAGE_WIDTH_CM = 20, RDL_PAGE_HEIGHT_CM = 25;
export const PAGE_WIDTH = RDL_PAGE_WIDTH_CM, PAGE_HEIGHT = RDL_PAGE_HEIGHT_CM;
export const escapeXml = (s: string) => s.replace(/[<>&"']/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' }[c]!));
export { lookup } from './expressions';
import { lookup } from './expressions';
import { sessionFields } from './project';
const inch = (n: number) => `${Math.max(0, n).toFixed(4)}cm`;
export function generateRdl(p:Project):string {
 const w=RDL_PAGE_WIDTH_CM,h=RDL_PAGE_HEIGHT_CM,es=effectiveElements(p);
 const position=(e:{x:number;y:number;width:number;height:number})=>`<Top>${inch(e.y*h)}</Top><Left>${inch(e.x*w)}</Left><Height>${inch(e.height*h)}</Height><Width>${inch(e.width*w)}</Width>`;
 const embedded:{name:string;mime:string;data:string}[]=[];
 const items=es.map((e,i)=>{
  const pos=position(e),border=`<Border><Color>${e.borderColor||'#000000'}</Color><Style>${e.lineWidth===0?'None':e.lineStyle||'Solid'}</Style><Width>${e.lineWidth??.5}pt</Width></Border>`;
  if(e.kind==='line')return {layer:0,xml:`<Line Name="Line_${i}">${pos}<Style>${border}</Style></Line>`};
  if(e.kind==='rectangle')return {layer:0,xml:`<Rectangle Name="Rectangle_${i}"><ReportItems/>${pos}<Style>${border}<BackgroundColor>${e.background||'Transparent'}</BackgroundColor></Style></Rectangle>`};
  if(e.kind==='image'){
   if(!e.imageReviewed||!e.imageData)return {layer:1,xml:''};
   const name=`Image_${i}`,mime=e.imageData.startsWith('data:image/jpeg')?'image/jpeg':'image/png';embedded.push({name,mime,data:e.imageData.split(',')[1]});
   return {layer:1,xml:`<Image Name="${name}"><Source>Embedded</Source><Value>${name}</Value><Sizing>FitProportional</Sizing>${pos}<Style/></Image>`};
  }
  const value=e.kind==='dynamic'?(e.expression||(e.fieldName?lookup(e.fieldName):'')):(e.text||'');
  return {layer:2,xml:`<Textbox Name="Textbox_${i}"><CanGrow>false</CanGrow><KeepTogether>true</KeepTogether><Paragraphs><Paragraph><TextRuns><TextRun><Value>${escapeXml(value)}</Value><Style><FontFamily>${escapeXml(e.fontFamily||'Arial')}</FontFamily><FontSize>${e.fontSize}pt</FontSize><FontWeight>${e.bold?'Bold':'Normal'}</FontWeight><FontStyle>${e.italic?'Italic':'Normal'}</FontStyle><Color>${e.color||'#000000'}</Color></Style></TextRun></TextRuns><Style><TextAlign>${e.align}</TextAlign></Style></Paragraph></Paragraphs>${pos}<Style><VerticalAlign>Top</VerticalAlign><PaddingLeft>0pt</PaddingLeft><PaddingRight>0pt</PaddingRight><PaddingTop>0pt</PaddingTop><PaddingBottom>0pt</PaddingBottom></Style></Textbox>`};
 }).sort((a,b)=>a.layer-b.layer).map(x=>x.xml).join('');
 let logo='';
 if(p.logo){embedded.push({name:'PropertyLogo',mime:p.logo.mime,data:p.logo.dataUrl.split(',')[1]});const bounds=es.find(e=>e.id==='property_logo')||{x:.05,y:.02,width:.18,height:.08};logo=`<Image Name="PropertyLogo"><Source>Embedded</Source><Value>PropertyLogo</Value><Sizing>FitProportional</Sizing>${position(bounds)}<Style/></Image>`;}
 const images=embedded.length?`<EmbeddedImages>${embedded.map(i=>`<EmbeddedImage Name="${i.name}"><MIMEType>${i.mime}</MIMEType><ImageData>${i.data}</ImageData></EmbeddedImage>`).join('')}</EmbeddedImages>`:'';
 // RDL is an ordered XML schema. Keep this sequence aligned with the known-good
 // Microsoft Report Builder reference rather than treating it like unordered XML.
 return `<?xml version="1.0" encoding="utf-8"?><Report xmlns="${RDL_NS}" xmlns:rd="${RDL_DESIGNER_NS}" xmlns:am="${RDL_AUTHORING_NS}"><rd:ReportUnitType>Cm</rd:ReportUnitType><rd:ReportID>79f1ae5c-8d0b-43cf-8953-262970b38871</rd:ReportID><am:AuthoringMetadata><am:CreatedBy><am:Name>Reg Card Automator</am:Name><am:Version>1.0</am:Version></am:CreatedBy><am:UpdatedBy><am:Name>Reg Card Automator</am:Name><am:Version>1.0</am:Version></am:UpdatedBy></am:AuthoringMetadata><AutoRefresh>0</AutoRefresh><DataSources><DataSource Name="ReportDataset"><rd:SecurityType>None</rd:SecurityType><ConnectionProperties><DataProvider>System.Data.DataSet</DataProvider><ConnectString>/* Local Connection */</ConnectString></ConnectionProperties><rd:DataSourceID>d5c72f58-46b1-487a-8747-0fe88e187969</rd:DataSourceID></DataSource></DataSources><DataSets><DataSet Name="DataSet1"><Query><DataSourceName>ReportDataset</DataSourceName><CommandText>/* Local Query */</CommandText></Query><Fields><Field Name="FieldName"><rd:TypeName>System.String</rd:TypeName><DataField>FieldName</DataField></Field><Field Name="FieldValue"><rd:TypeName>System.String</rd:TypeName><DataField>FieldValue</DataField></Field></Fields><rd:DataSetInfo><rd:DataSetName>ReportDataset</rd:DataSetName><rd:TableName>DynamicRDLC</rd:TableName><rd:TableAdapterFillMethod/><rd:TableAdapterGetDataMethod/><rd:TableAdapterName/></rd:DataSetInfo></DataSet></DataSets><ReportSections><ReportSection><Body><ReportItems>${items}${logo}</ReportItems><Height>${h}cm</Height><Style/></Body><Width>${w}cm</Width><Page><PageHeight>${h}cm</PageHeight><PageWidth>${w}cm</PageWidth><LeftMargin>0cm</LeftMargin><RightMargin>0cm</RightMargin><TopMargin>0cm</TopMargin><BottomMargin>0cm</BottomMargin><Style/></Page></ReportSection></ReportSections>${images}</Report>`;
}
export type RdlValidation = {
    valid: boolean;
    expectedLookupCount: number;
    actualLookupCount: number;
    checks: {
        name: string;
        pass: boolean;
        detail: string;
    }[];
};
export function validateRdl(xml: string, p: Project): RdlValidation { const checks: RdlValidation['checks'] = [], errors: string[] = []; const check = (name: string, pass: boolean, detail = '') => checks.push({ name, pass, detail }); let doc: ReturnType<DOMParser['parseFromString']> | undefined; try {
    if (/<!DOCTYPE|<!ENTITY/i.test(xml))
        throw Error('DTD/entity declarations are forbidden.');
    doc = new DOMParser({ errorHandler: { warning: m => errors.push(m), error: m => errors.push(m), fatalError: m => errors.push(m) } }).parseFromString(xml, 'text/xml');
}
catch (e) {
    errors.push((e as Error).message);
} check('XML parses', !!doc && !errors.length, errors.join('; ')); const syntax = validateXmlClosure(xml); check('XML closure', syntax === null, syntax || ''); const root = doc?.documentElement; check('Report namespace', root?.localName === 'Report' && root.namespaceURI === RDL_NS); const children=(node:Element|undefined)=>Array.from(node?.childNodes||[]).filter(n=>n.nodeType===1) as Element[];const rootOrder=children(root).map(n=>n.nodeName);check('Report Builder root order',rootOrder.indexOf('rd:ReportUnitType')<rootOrder.indexOf('AutoRefresh')&&rootOrder.indexOf('AutoRefresh')<rootOrder.indexOf('DataSources')&&rootOrder.indexOf('DataSources')<rootOrder.indexOf('DataSets')&&rootOrder.indexOf('DataSets')<rootOrder.indexOf('ReportSections')&&(rootOrder.indexOf('EmbeddedImages')<0||rootOrder.indexOf('ReportSections')<rootOrder.indexOf('EmbeddedImages')),rootOrder.join(' → ')); const text = (tag: string) => doc?.getElementsByTagName(tag)[0]?.textContent; check('Page dimensions', text('PageWidth') === '20cm' && text('PageHeight') === '25cm', '20 × 25 centimeters'); const dataSource=Array.from(doc?.getElementsByTagName('DataSource')||[]).find(x=>x.getAttribute('Name')==='ReportDataset');const dataSourceOrder=children(dataSource).map(n=>n.nodeName);check('Report Builder data source order',dataSourceOrder.join(',')==='rd:SecurityType,ConnectionProperties,rd:DataSourceID',dataSourceOrder.join(' → '));const datasets = Array.from(doc?.getElementsByTagName('DataSet') || []), ds = datasets.find(x => x.getAttribute('Name') === 'DataSet1'); check('DataSet1', !!ds); const fieldNodes=Array.from(ds?.getElementsByTagName('Field')||[]);const names=fieldNodes.map(x => x.getAttribute('Name')); check('Dataset fields', names.includes('FieldName') && names.includes('FieldValue'));check('Report Builder field order',fieldNodes.every(f=>children(f).map(n=>n.nodeName).join(',')==='rd:TypeName,DataField')); const expected = effectiveElements(p).filter(e => e.kind === 'dynamic'), values = Array.from(doc?.getElementsByTagName('Value') || []).map(x => x.textContent || ''), actual = values.filter(v => v.startsWith('=Lookup')); check('Lookup count', expected.length === actual.length, `${actual.length} / ${expected.length}`); const allowed = new Set(sessionFields(p)); const used = new Map<string, number>(); for (const v of actual) {
    const m = /^=Lookup\("([A-Za-z_][A-Za-z0-9_]*)", Fields!FieldName\.Value, Fields!FieldValue\.Value, "DataSet1"\)$/.exec(v);
    if (m)
        used.set(m[1], (used.get(m[1]) || 0) + 1);
} check('Lookup syntax & system fields', actual.every(v => { const m = /^=Lookup\("([A-Za-z_][A-Za-z0-9_]*)", Fields!FieldName\.Value, Fields!FieldValue\.Value, "DataSet1"\)$/.exec(v); return !!m && allowed.has(m[1]); })); const expectedCounts = new Map<string, number>(); for (const e of expected)
    expectedCounts.set(e.fieldName!, (expectedCounts.get(e.fieldName!) || 0) + 1); const reportItems=Array.from(doc?.getElementsByTagName('ReportItems')||[]);check('ReportItem types',reportItems.every(r=>Array.from(r.childNodes).filter(n=>n.nodeType===1).every(n=>['Textbox','Line','Rectangle','Image'].includes(n.nodeName||''))));const actualItems=reportItems.flatMap(r=>Array.from(r.childNodes).filter(n=>n.nodeType===1));const length=(n:typeof actualItems[number],tag:string)=>{const child=Array.from(n.childNodes).find(c=>c.nodeType===1&&c.nodeName===tag);const raw=child?.textContent||'';return /^-?\d+(?:\.\d+)?cm$/.test(raw)?Number.parseFloat(raw):NaN;};check('Final XML item bounds',actualItems.every(n=>{const x=length(n,'Left'),y=length(n,'Top'),w=length(n,'Width'),h=length(n,'Height');return [x,y,w,h].every(Number.isFinite)&&x>=0&&y>=0&&w>=0&&h>=0&&x+w<=20.0001&&y+h<=25.0001;}));check('Layout bounds', effectiveElements(p).every(e => e.x + e.width <= 1.00001 && e.y + e.height <= 1.00001 && e.x >= 0 && e.y >= 0)); check('Document layout exists', p.elements.length > 0); check('Dynamic content exists', expected.length > 0); check('Every dynamic field', Array.from(expectedCounts).every(([name, n]) => used.get(name) === n)); const textboxes=Array.from(doc?.getElementsByTagName('Textbox')||[]); check('Per-textbox dynamic expressions',esValidate(p).every(({e,i})=>e.kind!=='dynamic'||textboxes.find(t=>t.getAttribute('Name')===`Textbox_${i}`)?.getElementsByTagName('Value')[0]?.textContent===lookup(e.fieldName||''))); check('Report structure',!!doc?.getElementsByTagName('ReportSections').length&&!!doc?.getElementsByTagName('Body').length&&!!doc?.getElementsByTagName('ReportItems').length); check('Image references',Array.from(doc?.getElementsByTagName('Image')||[]).every(i=>i.getElementsByTagName('Source')[0]?.textContent==='Embedded'&&Array.from(doc?.getElementsByTagName('EmbeddedImage')||[]).some(e=>e.getAttribute('Name')===i.getElementsByTagName('Value')[0]?.textContent&&['image/png','image/jpeg'].includes(e.getElementsByTagName('MIMEType')[0]?.textContent||'')&&/^[A-Za-z0-9+/]+={0,2}$/.test(e.getElementsByTagName('ImageData')[0]?.textContent||'')))); check('Source values not static',!values.some(v=>!v.startsWith('=')&&p.fieldMappings.some(m=>m.detectedValue&&v===m.detectedValue))); check('No placeholder values', !values.some(v => /\{\{|^=Fields!|^=[A-Za-z_]+$/.test(v))); check('Logo', !p.logo || (!!doc?.getElementsByTagName('Image').length && !!doc?.getElementsByTagName('ImageData')[0]?.textContent)); return { valid: checks.every(c => c.pass), expectedLookupCount: expected.length, actualLookupCount: actual.length, checks }; }


const esValidate=(p:Project)=>effectiveElements(p).map((e,i)=>({e,i}));
