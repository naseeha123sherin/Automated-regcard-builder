import { clone, fields, projectSchema, type Project, type Templates, type Analysis, type Config, type Element } from './model';
import { mapLabels } from './mapping';
import { APPROVED_FIELDS, isApprovedField, mirrorFieldName } from './dictionary';
import { lookup } from './expressions';
export const sampleData: Record<string,string> = { fullname: 'Sample Guest', Fullname: 'Sample Guest', confirmationNo: 'DEMO-100', confirmationN: 'DEMO-100', roomNumber: '101', roomRate: '250.00', arrivalDate: '01/01/2027', departureDate: '03/01/2027', adultCount: '2', childCount: '0', roomType: 'Sample room', email: '', phoneNumber: '' };
export function newProject(t: Templates): Project {
 const checkin=clone(t.checkin), checkout=clone(t.checkout);
 fields(checkin).filter(f=>f.field_type==='text').forEach(f=>f.field_value='');
 checkin.rows=checkin.rows.filter(r=>!r.fields.some(f=>f.field_type==='checkbox'));
 fields(checkout).filter(f=>f.field_type==='text').slice(1).forEach(f=>f.field_value='');
 return {version:1,id:crypto.randomUUID(),propertyName:'',propertyNameConfidence:0,propertyReviewed:false,orientation:'landscape',sourceDocument:null,sourceRdl:null,discoveredRdlFields:[],customFields:[],classifiedCheckboxes:[],logo:null,elements:[],fieldMappings:[],regcardConfig:clone(t.regcard),checkinTermsConfig:checkin,checkoutTermsConfig:checkout,termsReviewed:false,visualReviewed:false,analysisWarnings:[],rdlConfig:{pageWidth:20,pageHeight:25},previewSampleData:clone(sampleData),previewScreen:'registration'};
}
export function setProperty(p:Project,name:string):Project {const q=clone(p);q.propertyName=name;q.propertyReviewed=!!name.trim();const texts=fields(q.checkoutTermsConfig).filter(f=>f.field_type==='text');if(texts[1])texts[1].field_value=name;return q;}
export function setTerms(c:Config,text:string):Config {const q=clone(c),fs=fields(q).filter(f=>f.field_type==='text');if(fs.length){fs[0].field_value=text;fs.slice(1).forEach(f=>f.field_value='');}else q.rows.push({fields:[{field_type:'text',field_value:text}]});return q;}
export function currentTerms(t:Templates,text:string,checkboxLabels:string[]):Config {
 const q=setTerms(t.checkin,text);q.rows=q.rows.filter(r=>!r.fields.some(f=>f.field_type==='checkbox'));
 checkboxLabels.forEach((label,i)=>q.rows.splice(q.rows.length-1,0,{fields:[{field_type:'checkbox',field_name:`check_box${i+1}`,field_label:label,field_value:'false',is_enabled:true,is_mandatory:false}]}));return q;
}
export function applyAnalysis(p:Project,a:Analysis,t:Templates):Project {
 const q=setProperty(p,a.propertyName);q.propertyReviewed=false;q.propertyNameConfidence=a.propertyNameConfidence;q.orientation=a.orientation;q.elements=clone(a.elements).filter(e=>!/^hotel\s+stamp$/i.test((e.text||e.detectedLabel||'').trim()));q.visualReviewed=false;
 q.fieldMappings=q.elements.filter(e=>e.kind==='dynamic').map((e,i)=>{
  const m=mapLabels([e.detectedLabel||e.fieldName||'Unlabeled field'],t.regcard)[0];m.id=`mapping_${i}`;m.elementId=e.id;m.detectedValue=e.detectedValue||'';
  if(isApprovedField(e.fieldName)){m.fieldName=e.fieldName;m.confidence=Math.max(m.confidence,.9);}else e.fieldName=m.fieldName||undefined;
  m.expression=m.fieldName?lookup(m.fieldName):'';m.status=m.fieldName?'confirmed':'requires_review';e.expression=m.expression;return m;
 });
 for(const label of a.detectedLabels)if(!q.fieldMappings.some(m=>m.detectedLabel===label)){const m=mapLabels([label],t.regcard)[0];m.id=crypto.randomUUID();q.fieldMappings.push(m);}
 const detected=a.checkboxes.length?a.checkboxes:a.checkboxLabels.map(label=>({label,section:'TERMS_AND_CONDITIONS' as const,confidence:.6,mappedField:undefined}));q.classifiedCheckboxes=detected.map((c,i)=>({...c,id:`checkbox_${i}`}));
 const termsChecks=detected.filter(c=>c.section==='TERMS_AND_CONDITIONS').map(c=>c.label);q.checkinTermsConfig=currentTerms(t,a.terms.join('\n\n'),termsChecks);
 for(const [i,c] of detected.filter(c=>c.section==='REGCARD_DETAILS').entries()){const mapped=c.mappedField||mapLabels([c.label],t.regcard)[0].fieldName||`regcard_checkbox_${i+1}`;q.regcardConfig.rows.push({fields:[{field_type:'checkbox',field_name:mapped,field_label:c.label,field_value:'false',is_enabled:true,is_mandatory:false}]});}
 q.termsReviewed=false;q.analysisWarnings=a.warnings;return q;
}
export const sessionFields=(p:Project)=>[...new Set([...APPROVED_FIELDS,...p.discoveredRdlFields,...p.customFields])];
export const isSessionField=(p:Project,name:string|undefined|null):name is string=>!!name&&sessionFields(p).includes(name);
export function changeField(p:Project,id:string,name:string):Project {
 if(!isSessionField(p,name))throw Error('Choose a field from this session.');const q=clone(p),m=q.fieldMappings.find(m=>m.id===id);if(!m)throw Error('Mapping not found.');m.fieldName=name;m.expression=lookup(name);m.status='confirmed';const e=q.elements.find(e=>e.id===m.elementId);if(e){e.fieldName=name;e.expression=m.expression;}q.visualReviewed=false;return q;
}
export function acceptMapping(p:Project,id:string):Project {
 const q=clone(p),m=q.fieldMappings.find(m=>m.id===id);if(!m||!isSessionField(q,m.fieldName))throw Error('Choose a field from this session before accepting.');
 const f=fields(q.regcardConfig).find(f=>f.field_name===mirrorFieldName(m.fieldName!));if(f)f.field_label=m.fieldLabel;m.status='confirmed';m.expression=lookup(m.fieldName);
 const e=q.elements.find(e=>e.id===m.elementId);if(e){e.fieldName=m.fieldName;e.expression=m.expression;}return q;
}
export function addMissingField(p:Project,name:string,label:string,bounds:Pick<Element,'x'|'y'|'width'|'height'>):Project {
 if(!isSessionField(p,name))throw Error('Unknown field is not available in this session.');const q=clone(p),id=crypto.randomUUID();
 q.elements.push({id,kind:'dynamic',fieldName:name,expression:lookup(name),detectedLabel:label,...bounds,fontSize:9,bold:false,align:'Left'});
 q.fieldMappings.push({id:crypto.randomUUID(),elementId:id,detectedLabel:label,detectedValue:'',fieldName:name,fieldLabel:label,confidence:1,status:'confirmed',expression:lookup(name)});q.visualReviewed=false;return q;
}
export function addCustomField(p:Project,name:string):Project {if(!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name))throw Error('Use letters, numbers and underscores, beginning with a letter or underscore.');if(sessionFields(p).includes(name))throw Error('That system field already exists.');const q=clone(p);q.customFields.push(name);return q;}
export function applyCheckboxRouting(p:Project):Project{const q=clone(p);q.regcardConfig.rows=q.regcardConfig.rows.filter(r=>!r.fields.some(f=>f.field_type==='checkbox'));q.checkinTermsConfig.rows=q.checkinTermsConfig.rows.filter(r=>!r.fields.some(f=>f.field_type==='checkbox'));let ri=0,ti=0;for(const c of q.classifiedCheckboxes){if(c.section==='REGCARD_DETAILS'){const name=c.mappedField||`regcard_checkbox_${++ri}`;q.regcardConfig.rows.push({fields:[{field_type:'checkbox',field_name:name,field_label:c.label,field_value:'false',is_enabled:true,is_mandatory:false}]});}else if(c.section==='TERMS_AND_CONDITIONS'){q.checkinTermsConfig.rows.splice(Math.max(0,q.checkinTermsConfig.rows.length-1),0,{fields:[{field_type:'checkbox',field_name:`check_box${++ti}`,field_label:c.label,field_value:'false',is_enabled:true,is_mandatory:false}]});}}return q;}
// RDL geometry is exclusively the document/designer model. Never derive it from Mirror rows.
export const effectiveElements=(p:Project):Element[]=>p.elements;
export const serializeProject=(p:Project)=>JSON.stringify(p,null,2);
export const deserializeProject=(s:string)=>projectSchema.parse(JSON.parse(s));
export function safeName(name:string){return name.normalize('NFKD').replace(/[^a-zA-Z0-9_-]+/g,'_').replace(/^_+|_+$/g,'').slice(0,80);}
export const nextScreen=(s:Project['previewScreen']):Project['previewScreen']=>({registration:'terms',terms:'signature',signature:'checkout',checkout:'registration'} as const)[s];
