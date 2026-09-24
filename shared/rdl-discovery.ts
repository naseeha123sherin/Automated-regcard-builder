import { DOMParser } from '@xmldom/xmldom';
import { validateXmlClosure } from './xml';

const LOOKUP = /^=Lookup\("([A-Za-z_][A-Za-z0-9_]*)",[\s\S]*,\s*"DataSet1"\)$/;
export function discoverRdlProfile(xml:string):{fields:string[];checkboxImages:{checked:string;empty:string}|null}{
 if(/<!DOCTYPE|<!ENTITY/i.test(xml))throw Error('DTD/entity declarations are forbidden.');
 const closure=validateXmlClosure(xml);if(closure)throw Error(`Invalid RDL XML: ${closure}`);
 const errors:string[]=[];const doc=new DOMParser({errorHandler:{warning:m=>errors.push(m),error:m=>errors.push(m),fatalError:m=>errors.push(m)}}).parseFromString(xml,'text/xml');
 if(errors.length||doc.documentElement?.localName!=='Report')throw Error(`Invalid RDL XML${errors.length?`: ${errors.join('; ')}`:''}.`);
 const expressionFields=Array.from(doc.getElementsByTagName('Value')).flatMap(v=>{const text=v.textContent||'',lookup=LOOKUP.exec(text)?.[1],first=/=First\(Fields!([A-Za-z_][A-Za-z0-9_]*)\.Value,\s*"DataSet1"\)/.exec(text)?.[1];return lookup||first?[lookup||first!]:[];});
 const rawDatasetFields=Array.from(doc.getElementsByTagName('DataSet')).filter(d=>d.getAttribute('Name')==='DataSet1').flatMap(d=>Array.from(d.getElementsByTagName('Field')).map(f=>f.getAttribute('Name')||'')).filter(Boolean);
 const datasetFields=rawDatasetFields.includes('FieldName')&&rawDatasetFields.includes('FieldValue')?rawDatasetFields.filter(n=>n!=='FieldName'&&n!=='FieldValue'):rawDatasetFields;
 const images=new Map(Array.from(doc.getElementsByTagName('EmbeddedImage')).map(e=>[e.getAttribute('Name')||'',e.getElementsByTagName('ImageData')[0]?.textContent||'']));
 const checked=images.get('checkboxwithchecksign')||'',empty=images.get('checkboxempty')||'';
 return {fields:[...new Set([...datasetFields,...expressionFields])],checkboxImages:checked&&empty?{checked,empty}:null};
}
export const discoverRdlFields=(xml:string)=>discoverRdlProfile(xml).fields;
