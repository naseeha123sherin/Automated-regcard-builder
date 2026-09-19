import {ReferenceTemplateService} from '../shared/templates';
import {newProject,addMissingField,applyAnalysis} from '../shared/project';
import {generateRdl,validateRdl} from '../shared/rdl';
import {analyzePdfLayout,type PdfPage} from '../shared/pdf-layout';
import pairs from '../tests/reference-pairs.json';
const t=new ReferenceTemplateService().load();
const p=addMissingField(newProject(t),'Fullname','Guest Name',{x:.2,y:.15,width:.25,height:.03});
console.log(validateRdl(generateRdl(p),p).checks.filter(c=>!c.pass));
for(const pair of pairs){const q=applyAnalysis(newProject(t),analyzePdfLayout(pair.page as PdfPage),t);const sourceValues=q.fieldMappings.map(m=>m.detectedValue).filter(Boolean);console.log(pair.source,'static value collisions',q.elements.filter(e=>e.kind==='text'&&sourceValues.includes(e.text)).map(e=>({text:e.text,x:e.x,y:e.y})));}

 
console.log(pairs[0].page.texts.filter(t=>t.y<190&&t.y>155));
