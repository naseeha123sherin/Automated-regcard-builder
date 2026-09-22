import { useEffect, useMemo, useState } from 'react';
import './upload.css';
import { Upload, ArrowRight, ShieldCheck, Download, FileCode2, Tablet, SlidersHorizontal, Braces, Files, Plus } from 'lucide-react';
import { ReferenceTemplateService } from '../shared/templates';
import { applyAnalysis, newProject, setTerms } from '../shared/project';
import { analysisSchema, fields, type Project, type Config, type Analysis } from '../shared/model';
import { generateFiles } from '../shared/generation';
import { dataUrl, download, readSource, zipDownload } from './services/files';
import { cropLogo } from './services/logo';
import ConfigPreview from './components/ConfigPreview';
import MirrorPreview from './components/MirrorPreview';
import JsonEditor from './components/JsonEditor';
import RdlPreview from './components/RdlPreview';
import LayoutEditor from './components/LayoutEditor';
import FieldMapping from './components/FieldMapping';
import CheckboxRouting from './components/CheckboxRouting';
import { discoverRdlFields } from '../shared/rdl-discovery';
const templates = new ReferenceTemplateService().load();
const navigation = [['Upload & Analyze', Upload], ['Field Mapping', SlidersHorizontal], ['RDL Designer', FileCode2], ['JSON Configuration', Braces], ['iPad Preview', Tablet], ['Validation', ShieldCheck], ['Generated Files', Files]] as const;
const titles: Record<string, [
    string,
    string
]> = { 'Upload & Analyze': ['Upload & analyze', 'Upload the required registration-card PDF and optional supporting files.'], 'Field Mapping': ['Field mapping', 'Review detected labels, system fields and exact Lookup expressions.'], 'RDL Designer': ['RDL designer', 'Compare the source with a deterministic report layout.'], 'JSON Configuration': ['JSON configuration', 'Three canonical configurations with previews of applied changes.'], 'iPad Preview': ['Test the guest journey.', 'Registration, terms, signature and checkout in a tablet frame.'], Validation: ['Inspect every output.', 'Check the actual generated XML and each JSON independently.'], 'Generated Files': ['Ready for handoff.', 'Download each valid file independently or all four as one ZIP.'] };
export default function App() {
    const [project,setProject]=useState<Project>(()=>newProject(templates)),[tab,setTab]=useState('Upload & Analyze'),[jsonTab,setJsonTab]=useState<'regcard'|'checkin'|'checkout'>('regcard'),[source,setSource]=useState<{dataUrl:string;preview:string;text:string;pages:number;analysis:Analysis|null}|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[vision,setVision]=useState(false),[selectedElement,setSelectedElement]=useState<string|null>(null),[status,setStatus]=useState({provider:'none',configured:false});
    const generated = useMemo(() => generateFiles(project, templates), [project]);
    useEffect(() => { fetch('/api/status').then(r => r.json()).then(setStatus).catch(() => setNotice('Backend unavailable. Manual editing and generation remain available.')); }, []);
    useEffect(() => { const context = (document as unknown as {
        modelContext?: {
            registerTool: (t: unknown, o: unknown) => void;
        };
    }).modelContext; if (!context)
        return; const life = new AbortController(); try {
        context.registerTool({ name: 'read_regcard_validation', description: 'Read output validation without changing the project.', inputSchema: { type: 'object', properties: {}, additionalProperties: false }, annotations: { readOnlyHint: true, untrustedContentHint: true }, execute: (input:unknown) => {
          if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).length)throw Error('Validation tool requires an empty object.');
          return { valid: generated.valid, rdl: generated.rdl, issues: generated.issues };
        } }, { signal: life.signal });
    }
    catch { /* Optional browser capability. */ } return () => life.abort(); }, [generated]);
    async function upload(file?: File) { if (!file)
        return; setError(''); setBusy(true); try {
        const parsed = await readSource(file);
        setSource(parsed);
        setProject(p => {const fresh={...newProject(templates),sourceDocument:{name:file.name,mime:file.type},sourceRdl:p.sourceRdl,discoveredRdlFields:p.discoveredRdlFields,logo:p.logo};return parsed.analysis?applyAnalysis(fresh,parsed.analysis,templates):fresh;});
        setNotice(`${file.name} loaded.${parsed.pages > 1 ? ' Only the first page is previewed.' : ''}`);
    }
    catch (e) {
        setError((e as Error).message);
    }
    finally {
        setBusy(false);
    } }
    async function analyze() { if (!source || !project.sourceDocument)
        return; setBusy(true); setError(''); try {
        if(source.analysis&&!vision){setProject(p=>applyAnalysis(p,source.analysis!,templates));setTab('Field Mapping');setNotice('Local PDF layout and initial mappings generated. Review uncertain fields and exact terms.');return;}
        const r = await fetch('/api/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: project.sourceDocument.name, mime: project.sourceDocument.mime, dataUrl: source.dataUrl }) });
        const value = await r.json();
        if (!r.ok)
            throw Error(value.error || 'Analysis failed.');
        const analysis = analysisSchema.parse(value);
        const logoBounds = analysis.elements.find(e => e.kind === 'image'&&e.y<.3);
        if(logoBounds&&!logoBounds.imageData){const crop=await cropLogo(source.preview,logoBounds);logoBounds.imageData=crop.dataUrl;logoBounds.imageReviewed=false;}
        setProject(p => applyAnalysis(p,analysis,templates));
        setTab('Field Mapping');
        setNotice('Review the extracted property, mappings and exact terms before export.');
    }
    catch (e) {
        setError((e as Error).message);
    }
    finally {
        setBusy(false);
    } }
    async function logo(file?: File) { if (!file)
        return; try {
        if (!['image/png', 'image/jpeg'].includes(file.type) || file.size > 2 * 1024 * 1024)
            throw Error('Logo must be PNG or JPEG, up to 2 MB.');
        const url = await dataUrl(file), img = new Image();
        img.src = url;
        await img.decode();
        setProject(p => ({ ...p, visualReviewed:false, logo: { dataUrl: url, mime: file.type as 'image/png'|'image/jpeg' },elements:p.elements.some(e=>e.id==='property_logo')?p.elements:[...p.elements,{id:'property_logo',kind:'image',x:.05,y:.02,width:.18,height:.08,fontSize:9,bold:false,align:'Left',imageReviewed:true}] }));
    }
    catch (e) {
        setError((e as Error).message);
    } }
    async function uploadRdl(file?:File){if(!file)return;setError('');try{if(!/\.(rdl|rdlc)$/i.test(file.name)||file.size>5*1024*1024)throw Error('Existing report must be an RDL or RDLC file up to 5 MB.');const names=discoverRdlFields(await file.text());setProject(p=>({...p,sourceRdl:{name:file.name},discoveredRdlFields:names}));setNotice(`${names.length} system field${names.length===1?'':'s'} detected from ${file.name}.`);}catch(e){setError((e as Error).message);}}
    function reset() { if (!confirm('Start a new session? Unsaved work will be discarded.'))
        return; setProject(newProject(templates)); setSource(null); setTab('Upload & Analyze'); setNotice('New session started.'); }
    function applyConfig(c: Config) { const key = jsonTab === 'regcard' ? 'regcardConfig' : jsonTab === 'checkin' ? 'checkinTermsConfig' : 'checkoutTermsConfig'; setProject(p => ({ ...p, [key]: c, ...(jsonTab === 'checkin' ? { termsReviewed: false } : {}) })); }
    const config = jsonTab === 'regcard' ? project.regcardConfig : jsonTab === 'checkin' ? project.checkinTermsConfig : project.checkoutTermsConfig;
    return <div className="app"><aside><div className="brand"><img src="/samsotech-logo.png" alt="Samsotech"/><div className="brand-product">Reg Card Automator</div></div><span className="eyebrow">WORKSPACE</span><nav aria-label="Main navigation">{navigation.map(([name, Icon]) => <button className={tab === name ? 'active' : ''} onClick={() => setTab(name)} key={name}><Icon size={17}/>{name}</button>)}</nav><div className="aside-bottom"><ShieldCheck size={18}/><span>Documents remain in this session.</span></div></aside><main><header><div>{project.propertyName||'Property pending'} <span>/</span> {project.sourceDocument?.name||'No PDF uploaded'}</div><div className="toolbar compact"><span className="pill">{project.elements.length?'Analyzed · needs review':'Awaiting PDF'}</span><span className="pill">Memory only</span></div></header><section className="page"><div className="title"><div><p className="eyebrow">{String(navigation.findIndex(([n]) => n === tab) + 1).padStart(2, '0')} / {tab.toUpperCase()}</p><h1>{titles[tab][0]}</h1><p>{titles[tab][1]}</p></div><button onClick={reset}><Plus size={16}/> New session</button></div>{error && <div className="error" role="alert">{error}<button onClick={() => setError('')}>Dismiss</button></div>}{notice && <div className="notice" role="status">{notice}</div>}
 {tab === 'Upload & Analyze' && <><div className="panel"><div className="panel-head"><h2>Source files</h2><span>Current session only</span></div><label className="dropzone" onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); void upload(e.dataTransfer.files[0]); }}><Upload size={32}/><h3>{project.sourceDocument?.name || 'Upload registration-card PDF'}</h3><p>Required · PDF up to 10 MB</p><input aria-label="Upload registration card PDF" type="file" accept=".pdf,application/pdf" disabled={busy} onChange={e => void upload(e.target.files?.[0])}/></label><div className="upload-options"><label className="file-label">Optional property logo<input aria-label="Upload property logo" type="file" accept=".png,.jpg,.jpeg" onChange={e => void logo(e.target.files?.[0])}/><span>{project.logo?'Logo loaded':'PNG or JPEG · registration screen only'}</span></label><label className="file-label">Optional existing RDL<input aria-label="Upload existing RDL" type="file" accept=".rdl,.rdlc" onChange={e=>void uploadRdl(e.target.files?.[0])}/><span>{project.sourceRdl?`${project.sourceRdl.name} · ${project.discoveredRdlFields.length} fields`:'Discover reusable system fields'}</span></label></div><div className="upload-footer"><p className="muted">PDF text, vectors and mappings are analyzed locally. Scanned PDFs can use the configured vision provider with your consent.</p><button className="primary" disabled={busy || !source || (!source.analysis && !status.configured)} onClick={() => void analyze()}>{busy ? 'Processing…' : 'Analyze document'}<ArrowRight size={16}/></button></div>{status.configured&&<label className="consent"><input type="checkbox" checked={vision} onChange={e=>setVision(e.target.checked)}/> Send this document to the configured vision provider when Analyze is clicked</label>}</div>{source && <details className="panel"><summary>Source PDF and extracted text</summary><div className="grid"><img className="source-image" src={source.preview} alt="Uploaded source"/><pre>{source.text || 'No extractable text was found.'}</pre></div></details>}</>}
 {tab === 'Field Mapping' && <><div className="metrics">{[[project.fieldMappings.length, 'Dynamic fields'], [project.fieldMappings.filter(m => !!m.fieldName).length, 'Auto-mapped'], [project.fieldMappings.filter(m => !m.fieldName).length, 'May need review'], [fields(project.regcardConfig).filter(f => f.field_name).length, 'Mirror fields']].map(([n, label]) => <div key={label}><strong>{n}</strong><span>{label}</span></div>)}</div>{project.analysisWarnings.map((w, i) => <div className="notice" key={i}>{w}</div>)}<FieldMapping project={project} onUpdate={setProject} onPreview={id=>{setSelectedElement(id);setTab('RDL Designer');}}/><div className="panel terms-review"><h2>Check-in terms review</h2><p>Copy exact wording from the current document. Do not summarize or reuse reference legal text.</p><textarea rows={12} aria-label="Exact check-in terms" value={fields(project.checkinTermsConfig).filter(f => f.field_type === 'text').map(f => f.field_value || '').join('\n\n')} onChange={e => setProject({ ...project, checkinTermsConfig: setTerms(project.checkinTermsConfig, e.target.value), termsReviewed: false })}/>{fields(project.checkinTermsConfig).filter(f=>f.field_type==='checkbox').map((f,i)=><label className="form-label" key={i}>Checkbox statement {i+1}<input dir="auto" value={f.field_label||''} onChange={e=>{const config=structuredClone(project.checkinTermsConfig);fields(config).filter(f=>f.field_type==='checkbox')[i].field_label=e.target.value;setProject({...project,checkinTermsConfig:config,termsReviewed:false});}}/></label>)}<p className="muted">Checkboxes are added only when detected in this source. Use the check-in JSON editor to correct their structure.</p><label className="consent"><input type="checkbox" checked={project.termsReviewed} onChange={e => setProject({ ...project, termsReviewed: e.target.checked })}/> Reviewed against the current source document</label><button className="primary" onClick={() => setTab('RDL Designer')}>Continue to RDL <ArrowRight size={16}/></button></div></>}
 {tab==='Field Mapping'&&<CheckboxRouting project={project} onUpdate={setProject}/>} {tab === 'RDL Designer' && <><div className={`export-status ${generated.files[0].valid?'ready':''}`}><FileCode2/><div><strong>{generated.files[0].valid?'RDL generated':'RDL generation blocked'}</strong><p>{generated.files[0].name} · {project.fieldMappings.filter(m=>m.fieldName).length} mapped · {project.fieldMappings.filter(m=>!m.fieldName).length} may require review</p></div><button className="primary" disabled={!generated.files[0].valid} onClick={()=>download(generated.files[0].name,generated.files[0].content,generated.files[0].mime)}><Download size={16}/> Download RDL</button><button onClick={()=>setTab('Field Mapping')}>Edit fields / expressions</button></div><div className="panel"><RdlPreview project={project} source={source?.preview || null} selectedId={selectedElement}/> <label className="consent"><input type="checkbox" checked={project.visualReviewed} disabled={!project.elements.length||!source} onChange={e=>setProject({...project,visualReviewed:e.target.checked})}/> Visual comparison complete (optional)</label><p className="muted">RDL structure: {generated.rdl.valid?'PASS':'GENERATED WITH WARNINGS'} · Visual review: {project.visualReviewed?'COMPLETE':'OPTIONAL'}</p></div><LayoutEditor project={project} onUpdate={setProject} selectedId={selectedElement}/><details className="panel"><summary>Generated RDL XML</summary><pre>{generated.files[0].content}</pre></details></>}
 {tab === 'JSON Configuration' && <><div className="segmented json-tabs">{(['regcard', 'checkin', 'checkout'] as const).map(k => <button className={jsonTab === k ? 'selected' : ''} onClick={() => setJsonTab(k)} key={k}>{k === 'regcard' ? 'Reg Card JSON' : k === 'checkin' ? 'Check-in Terms JSON' : 'Checkout Terms JSON'}</button>)}</div><div className="grid equal"><div className="panel"><JsonEditor key={jsonTab} config={config} reference={templates[jsonTab]} kind={jsonTab} onApply={applyConfig}/></div><div className="panel"><div className="panel-head"><h2>Applied configuration</h2><span>LIVE PREVIEW</span></div><ConfigPreview config={config} values={project.previewSampleData}/></div></div></>}
 {tab === 'iPad Preview' && <MirrorPreview project={project} onUpdate={setProject}/>}
 {tab === 'Validation' && <div className="grid equal"><div className="panel"><h2>RDL · actual XML</h2><p>Expected expressions: {generated.rdl.expectedLookupCount} · Actual expressions: {generated.rdl.actualLookupCount}</p><p>Structure: {generated.rdl.valid?'PASS':'FAIL'} · Visual review: {project.visualReviewed?'APPROVED':'REQUIRES REVIEW'}</p>{generated.rdl.checks.map(c => <div className="validation-row" key={c.name}><div>{c.name}<small>{c.detail}</small></div><span className={`pill ${c.pass ? '' : 'failed'}`}>{c.pass ? 'PASS' : 'FAIL'}</span></div>)}</div><div className="panel"><h2>JSON & review gates</h2>{generated.issues.length ? generated.issues.map((i, n) => <div className="validation-row" key={n}><div><strong>{i.path}</strong><small>{i.message}</small></div><span className={`pill ${i.severity === 'error' ? 'failed' : ''}`}>{i.severity}</span></div>) : <div className="notice">JSON structures and review gates passed.</div>}<button className="primary" onClick={() => setTab('Generated Files')}>View files <ArrowRight size={16}/></button></div></div>}
 {tab === 'Generated Files' && <><div className={`export-status ${generated.valid ? 'ready' : ''}`}><ShieldCheck /><div><strong>{generated.valid ? 'Generation complete' : `${generated.files.filter(f=>f.valid).length} of 4 files ready`}</strong><p>{generated.valid ? 'Four validated files are ready to download.' : 'Valid files remain downloadable while unrelated items are reviewed.'}</p></div><button onClick={() => setTab('Validation')}>View validation</button></div><div className="files-grid">{generated.files.map((f, i) => <div className="panel file-card" key={f.name}>{i === 0 ? <FileCode2 /> : <Braces />}<span className="eyebrow">{['MICROSOFT REPORT BUILDER', 'REGISTRATION CONFIGURATION', 'CHECK-IN TERMS', 'CHECKOUT TERMS'][i]}</span><h3>{f.name}</h3><p>{f.status} · {i === 0 ? '20 × 25 cm RDL 2016 XML' : 'Canonical rows / fields JSON'}</p>{!f.valid&&<button onClick={()=>setTab(i===0?'RDL Designer':i===2?'Field Mapping':i===3?'Field Mapping':'JSON Configuration')}>Review {f.key}</button>}<button disabled={!f.valid} onClick={() => download(f.name, f.content, f.mime)}><Download size={16}/> Download {i === 0 ? 'RDL' : 'JSON'}</button></div>)}</div><button className="primary" disabled={!generated.valid} onClick={() => void zipDownload(generated.files)}>Download all four · ZIP <Download size={16}/></button></>}
 </section><footer><span>REG CARD AUTOMATOR</span><span>Separate PDF / Mirror models · {generated.rdl.actualLookupCount} dynamic Lookup expressions</span></footer></main></div>;
}
