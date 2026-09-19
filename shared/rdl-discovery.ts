import { DOMParser } from '@xmldom/xmldom';
import { validateXmlClosure } from './xml';

const LOOKUP = /^=Lookup\("([A-Za-z_][A-Za-z0-9_]*)",[\s\S]*,\s*"DataSet1"\)$/;
export function discoverRdlFields(xml:string):string[]{
 if(/<!DOCTYPE|<!ENTITY/i.test(xml))throw Error('DTD/entity declarations are forbidden.');
 const closure=validateXmlClosure(xml);if(closure)throw Error(`Invalid RDL XML: ${closure}`);
 const errors:string[]=[];const doc=new DOMParser({errorHandler:{warning:m=>errors.push(m),error:m=>errors.push(m),fatalError:m=>errors.push(m)}}).parseFromString(xml,'text/xml');
 if(errors.length||doc.documentElement?.localName!=='Report')throw Error(`Invalid RDL XML${errors.length?`: ${errors.join('; ')}`:''}.`);
 const found=Array.from(doc.getElementsByTagName('Value')).map(v=>LOOKUP.exec(v.textContent||'')?.[1]).filter((v):v is string=>!!v);
 return [...new Set(found)];
}
