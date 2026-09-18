import { useEffect, useMemo, useState } from 'react';
import { FileStack, Upload, ArrowRight, ShieldCheck, Save, Download, Check, FileCode2, Tablet, SlidersHorizontal, Braces, Files, Plus, FolderOpen } from 'lucide-react';
import { ReferenceTemplateService } from '../shared/templates';
import { acceptMapping, applyAnalysis, deserializeProject, newProject, serializeProject, setProperty, setTerms } from '../shared/project';
import { analysisSchema, clone, fields, type Project, type Config } from '../shared/model';
import { mapLabels } from '../shared/mapping';
import { generateFiles } from '../shared/generation';
import { dataUrl, download, readSource, zipDownload } from './services/files';
import { cropLogo } from './services/logo';
import ConfigPreview from './components/ConfigPreview';
import MirrorPreview from './components/MirrorPreview';
import JsonEditor from './components/JsonEditor';
import RdlPreview from './components/RdlPreview';
import LayoutEditor from './components/LayoutEditor';
const templates = new ReferenceTemplateService().load(), storageKey = 'regcard-project-v1';
const navigation = [['Project', FolderOpen], ['Upload', Upload], ['Field Mapping', SlidersHorizontal], ['RDL', FileCode2], ['JSON', Braces], ['Application Preview', Tablet], ['Validation', ShieldCheck], ['Generated Files', Files]] as const;
const titles: Record<string, [
    string,
    string
]> = { Project: ['A single source of truth.', 'Save, import and manage your registration card project.'], Upload: ['Start with the source.', 'Upload the original card. Review what is extracted before generating.'], 'Field Mapping': ['Keep system fields intact.', 'Confirm source labels against your reference template.'], RDL: ['Reconstruct the report.', 'Compare the source with a deterministic report layout.'], JSON: ['Edit with precision.', 'Three canonical configurations with previews of applied changes.'], 'Application Preview': ['Test the guest journey.', 'Registration, terms, signature and checkout in a tablet frame.'], Validation: ['Inspect every output.', 'Check the actual generated XML and each JSON independently.'], 'Generated Files': ['Ready for handoff.', 'Download reviewed files individually or as one ZIP.'] };
export default function App() {
    const [project, setProject] = useState<Project>(() => { try {
        const s = localStorage.getItem(storageKey);
        if (s)
            return deserializeProject(s);
    }
    catch { /* Do not load invalid projects. */ } return newProject(templates); }), [tab, setTab] = useState('Upload'), [jsonTab, setJsonTab] = useState<'regcard' | 'checkin' | 'checkout'>('regcard'), [source, setSource] = useState<{
        dataUrl: string;
        preview: string;
        text: string;
        pages: number;
    } | null>(null), [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState(''), [labels, setLabels] = useState(''), [status, setStatus] = useState({ provider: 'none', configured: false }), [persist, setPersist] = useState(false);
    const generated = useMemo(() => generateFiles(project, templates), [project]);
    useEffect(() => { fetch('/api/status').then(r => r.json()).then(setStatus).catch(() => setNotice('Backend unavailable. Manual editing and generation remain available.')); }, []);
    useEffect(() => { if (persist)
        try {
            localStorage.setItem(storageKey, serializeProject({ ...project, previewSampleData: newProject(templates).previewSampleData }));
        }
        catch {
            setError('Storage is full. Export project.json instead.');
        } }, [project, persist]);
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
        setProject(p => ({ ...newProject(templates), projectName: p.projectName, sourceDocument: { name: file.name, mime: file.type }, logo: p.logo }));
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
        const r = await fetch('/api/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: project.sourceDocument.name, mime: project.sourceDocument.mime, dataUrl: source.dataUrl }) });
        const value = await r.json();
        if (!r.ok)
            throw Error(value.error || 'Analysis failed.');
        const analysis = analysisSchema.parse(value);
        const logoBounds = analysis.elements.find(e => e.kind === 'image');
        const detectedLogo = !project.logo && logoBounds ? await cropLogo(source.preview, logoBounds) : null;
        setProject(p => ({ ...applyAnalysis(p, analysis, templates), logo: p.logo || detectedLogo }));
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
        setProject(p => ({ ...p, logo: { dataUrl: url, mime: file.type as 'image/png'|'image/jpeg' } }));
    }
    catch (e) {
        setError((e as Error).message);
    } }
    function reset() { if (!confirm('Start a new project? Export or save your work first.'))
        return; setProject(newProject(templates)); setSource(null); setLabels(''); setPersist(false); setNotice('New project created.'); }
    function save() { try {
        localStorage.setItem(storageKey, serializeProject({ ...project, previewSampleData: newProject(templates).previewSampleData }));
        setPersist(true);
        setNotice('Saved on this device. Uploaded source documents are not stored.');
    }
    catch {
        setError('Unable to save locally. Export project.json instead.');
    } }
    function changeMapping(id: string, key: 'fieldName' | 'fieldLabel', value: string) { const q = clone(project), m = q.fieldMappings.find(m => m.id === id)!; m[key] = value; m.status = 'requires_review'; setProject(q); }
    function applyConfig(c: Config) { const key = jsonTab === 'regcard' ? 'regcardConfig' : jsonTab === 'checkin' ? 'checkinTermsConfig' : 'checkoutTermsConfig'; setProject(p => ({ ...p, [key]: c, ...(jsonTab === 'checkin' ? { termsReviewed: false } : {}) })); }
    const config = jsonTab === 'regcard' ? project.regcardConfig : jsonTab === 'checkin' ? project.checkinTermsConfig : project.checkoutTermsConfig;
    return <div className="app"><aside><div className="brand"><FileStack /> REG CARD<br />AUTOMATOR</div><span className="eyebrow">ENGINEERING WORKSPACE</span><nav>{navigation.map(([name, Icon]) => <button className={tab === name ? 'active' : ''} onClick={() => setTab(name)} key={name}><Icon size={17}/>{name}</button>)}</nav><div className="aside-bottom"><ShieldCheck size={18}/><span>Source documents stay in memory.<br />You control the final output.</span></div></aside><main><header><div>Workspace <span>/</span> {project.projectName}</div><div className="toolbar compact"><span className="pill">{status.configured ? 'AI configured' : 'Manual mode'}</span><button onClick={save}><Save size={15}/> Save project</button></div></header><section className="page"><div className="title"><div><p className="eyebrow">{String(navigation.findIndex(([n]) => n === tab) + 1).padStart(2, '0')} / {tab.toUpperCase()}</p><h1>{titles[tab][0]}</h1><p>{titles[tab][1]}</p></div><button onClick={reset}><Plus size={16}/> New project</button></div>{error && <div className="error" role="alert">{error}<button onClick={() => setError('')}>Dismiss</button></div>}{notice && <div className="notice" role="status">{notice}</div>}
 {tab === 'Upload' && <><div className="grid"><div className="panel"><div className="panel-head"><h2>Registration card</h2><span>PDF · PNG · JPG</span></div><label className="dropzone" onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); void upload(e.dataTransfer.files[0]); }}><Upload size={32}/><h3>{project.sourceDocument?.name || 'Choose your registration card'}</h3><p>Drag a document here, or browse · up to 10 MB</p><input aria-label="Upload registration card" type="file" accept=".pdf,.png,.jpg,.jpeg" disabled={busy} onChange={e => void upload(e.target.files?.[0])}/></label><div className="upload-footer"><label className="file-label">Optional property logo<input aria-label="Upload property logo" type="file" accept=".png,.jpg,.jpeg" onChange={e => void logo(e.target.files?.[0])}/></label><button className="primary" disabled={busy || !source || !status.configured} onClick={() => void analyze()}>{busy ? 'Processing…' : 'Analyze document'}<ArrowRight size={16}/></button></div>{!status.configured && <p className="muted">AI is not configured. Use manual labels, terms and layout editing.</p>}</div><div className="panel"><h2>Reference templates</h2><p>Original schemas preserved. Automatic analysis never creates system fields.</p>{['regcard_form.json', 'checkin_terms.json', 'checkout_terms.json'].map(n => <div className="template" key={n}><FileStack size={18}/><span>{n}</span><span className="pill"><Check size={12}/> Loaded</span></div>)}<hr /><div className="contract"><strong>19 × 24 in</strong><span>Report paper size</span><strong>DataSet1</strong><span>FieldName / FieldValue</span></div><button onClick={() => setTab('Field Mapping')}>Continue manually <ArrowRight size={16}/></button></div></div>{source && <details className="panel"><summary>Source document and PDF text</summary><div className="grid"><img className="source-image" src={source.preview} alt="Uploaded source"/><pre>{source.text || 'Image source requires AI analysis or manual transcription.'}</pre></div></details>}</>}
 {tab === 'Project' && <div className="grid"><div className="panel"><h2>Project details</h2><label className="form-label">Project name<input value={project.projectName} onChange={e => setProject({ ...project, projectName: e.target.value })}/></label><label className="form-label">Property name<input value={project.propertyName} onChange={e => setProject(setProperty(project, e.target.value))}/></label><p className="muted">Confidence: {Math.round(project.propertyNameConfidence * 100)}%. {project.propertyReviewed ? 'Confirmed.' : 'Requires review.'}</p><button disabled={!project.propertyName.trim()} onClick={() => setProject(setProperty(project, project.propertyName))}>Confirm property</button><label className="form-label">Tablet orientation<select value={project.orientation} onChange={e => setProject({ ...project, orientation: e.target.value as Project['orientation'] })}><option>landscape</option><option>portrait</option></select></label>{project.logo && <div className="logo-display"><img src={project.logo.dataUrl} alt="Property logo"/><button onClick={() => setProject({ ...project, logo: null })}>Remove logo</button></div>}</div><div className="panel"><h2>Save & restore</h2><p>Local saves exclude source documents and reset editable sample data. Project export contains configuration, logo and layout; inspect it before sharing.</p><div className="toolbar"><button onClick={save}>Save project</button><button onClick={() => { try {
        const s = localStorage.getItem(storageKey);
        if (!s)
            throw Error('No saved project.');
        setProject(deserializeProject(s));
        setSource(null);
        setNotice('Loaded. Re-upload source to analyze or compare.');
    }
    catch (e) {
        setError((e as Error).message);
    } }}>Load project</button><button onClick={() => download('project.json', serializeProject({ ...project, previewSampleData: newProject(templates).previewSampleData }))}>Export project.json</button></div><label className="file-label">Import project.json<input type="file" accept=".json" onChange={async (e) => { try {
        const f = e.target.files?.[0];
        if (!f)
            return;
        if (f.size > 5 * 1024 * 1024)
            throw Error('Project exceeds 5 MB.');
        setProject(deserializeProject(await f.text()));
        setSource(null);
    }
    catch (err) {
        setError((err as Error).message);
    } }}/></label><label className="consent"><input type="checkbox" checked={persist} onChange={e => setPersist(e.target.checked)}/> Auto-save on this device</label><button onClick={() => { if (confirm('Remove saved project from this browser?')) {
        localStorage.removeItem(storageKey);
        setPersist(false);
        setNotice('Browser copy removed. Current workspace is unchanged.');
    } }}>Clear saved copy</button></div></div>}
 {tab === 'Field Mapping' && <><div className="metrics">{[[project.fieldMappings.length, 'Source labels'], [project.fieldMappings.filter(m => m.status === 'confirmed').length, 'Confirmed'], [project.fieldMappings.filter(m => !['confirmed', 'ignored'].includes(m.status)).length, 'Awaiting review'], [fields(project.regcardConfig).filter(f => f.field_name).length, 'System fields']].map(([n, label]) => <div key={label}><strong>{n}</strong><span>{label}</span></div>)}</div><div className="panel"><h2>Manual document understanding</h2><div className="grid"><label className="form-label">Current property<input placeholder="From current document" value={project.propertyName} onChange={e => setProject(setProperty(project, e.target.value))}/></label><div><label className="form-label">Source labels · one per line<textarea rows={4} value={labels} onChange={e => setLabels(e.target.value)} placeholder={'Guest Name / اسم الضيف\nRoom No.\nFlight Number'}/></label><button onClick={() => { if (!labels.trim()) {
        setError('Enter source labels first.');
        return;
    } setProject({ ...project, fieldMappings: mapLabels(labels.split('\n').filter(l => l.trim()), templates.regcard) }); }}>Map labels</button></div></div></div>{project.analysisWarnings.map((w, i) => <div className="notice" key={i}>{w}</div>)}<div className="panel table-scroll mapping-table"><table><thead><tr><th>Detected label</th><th>System field</th><th>Display label</th><th>Confidence</th><th>Review</th></tr></thead><tbody>{project.fieldMappings.map(m => <tr key={m.id}><td><strong dir="auto">{m.detectedLabel}</strong><span className={`mapping-status ${m.status}`}>{m.status.replace('_', ' ')}</span></td><td><select aria-label={`System field for ${m.detectedLabel}`} value={m.fieldName || ''} onChange={e => changeMapping(m.id, 'fieldName', e.target.value)}><option value="">Unmapped · review required</option>{fields(templates.regcard).filter(f => f.field_name).map(f => <option key={f.field_name}>{f.field_name}</option>)}</select></td><td><input dir="auto" aria-label={`Display label for ${m.detectedLabel}`} value={m.fieldLabel} onChange={e => changeMapping(m.id, 'fieldLabel', e.target.value)}/></td><td>{Math.round(m.confidence * 100)}%</td><td><div className="toolbar"><button disabled={!m.fieldName} onClick={() => { try {
        setProject(acceptMapping(project, m.id));
    }
    catch (e) {
        setError((e as Error).message);
    } }}>Accept</button><button onClick={() => { const q = clone(project); q.fieldMappings.find(x => x.id === m.id)!.status = 'ignored'; setProject(q); }}>Ignore</button>{!m.fieldName && <button onClick={() => { const name = prompt('Manually add a system identifier:'); if (!name)
        return; if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name) || fields(project.regcardConfig).some(f => f.field_name === name)) {
        setError('Invalid or duplicate system field.');
        return;
    } const q = clone(project); q.regcardConfig.rows.push({ fields: [{ field_type: 'input-text', field_name: name, field_label: m.fieldLabel, is_enabled: true }] }); q.fieldMappings.find(x => x.id === m.id)!.fieldName = name; setProject(acceptMapping(q, m.id)); }}>Add manually</button>}</div></td></tr>)}</tbody></table>{!project.fieldMappings.length && <div className="empty">Analyze a document or enter labels above. No extraction results are fabricated.</div>}</div><div className="panel terms-review"><h2>Check-in terms review</h2><p>Copy exact wording from the current document. Do not summarize or reuse reference legal text.</p><textarea rows={12} aria-label="Exact check-in terms" value={fields(project.checkinTermsConfig).filter(f => f.field_type === 'text').map(f => f.field_value || '').join('\n\n')} onChange={e => setProject({ ...project, checkinTermsConfig: setTerms(project.checkinTermsConfig, e.target.value), termsReviewed: false })}/><label className="consent"><input type="checkbox" checked={project.termsReviewed} onChange={e => setProject({ ...project, termsReviewed: e.target.checked })}/> Reviewed against the current source document</label><button className="primary" onClick={() => setTab('RDL')}>Continue to RDL <ArrowRight size={16}/></button></div></>}
 {tab === 'RDL' && <><div className="panel"><RdlPreview project={project} source={source?.preview || null}/></div><LayoutEditor project={project} onUpdate={setProject}/><details className="panel"><summary>Generated RDL XML</summary><pre>{generated.files[0].content}</pre></details></>}
 {tab === 'JSON' && <><div className="segmented json-tabs">{(['regcard', 'checkin', 'checkout'] as const).map(k => <button className={jsonTab === k ? 'selected' : ''} onClick={() => setJsonTab(k)} key={k}>{k === 'regcard' ? 'Reg Card JSON' : k === 'checkin' ? 'Check-in Terms JSON' : 'Checkout Terms JSON'}</button>)}</div><div className="grid equal"><div className="panel"><JsonEditor key={jsonTab} config={config} reference={templates[jsonTab]} kind={jsonTab} onApply={applyConfig}/></div><div className="panel"><div className="panel-head"><h2>Applied configuration</h2><span>LIVE PREVIEW</span></div><ConfigPreview config={config} values={project.previewSampleData}/></div></div></>}
 {tab === 'Application Preview' && <MirrorPreview project={project} onUpdate={setProject}/>}
 {tab === 'Validation' && <div className="grid equal"><div className="panel"><h2>RDL · actual XML</h2>{generated.rdl.checks.map(c => <div className="validation-row" key={c.name}><div>{c.name}<small>{c.detail}</small></div><span className={`pill ${c.pass ? '' : 'failed'}`}>{c.pass ? 'PASS' : 'FAIL'}</span></div>)}</div><div className="panel"><h2>JSON & review gates</h2>{generated.issues.length ? generated.issues.map((i, n) => <div className="validation-row" key={n}><div><strong>{i.path}</strong><small>{i.message}</small></div><span className={`pill ${i.severity === 'error' ? 'failed' : ''}`}>{i.severity}</span></div>) : <div className="notice">JSON structures and review gates passed.</div>}<button className="primary" onClick={() => setTab('Generated Files')}>View files <ArrowRight size={16}/></button></div></div>}
 {tab === 'Generated Files' && <><div className={`export-status ${generated.valid ? 'ready' : ''}`}><ShieldCheck /><div><strong>{generated.valid ? 'Reviewed and validated' : 'Review required before final export'}</strong><p>{generated.valid ? 'Four files generated from the current project.' : `${generated.issues.filter(i => i.severity === 'error').length} issues. Inspect Validation for details.`}</p></div><button onClick={() => setTab('Validation')}>View validation</button></div><div className="files-grid">{generated.files.map((f, i) => <div className="panel file-card" key={f.name}>{i === 0 ? <FileCode2 /> : <Braces />}<span className="eyebrow">{['MICROSOFT REPORT BUILDER', 'REGISTRATION CONFIGURATION', 'CHECK-IN TERMS', 'CHECKOUT TERMS'][i]}</span><h3>{f.name}</h3><p>{i === 0 ? 'RDL 2016 XML · Lookup expressions' : 'Original rows / fields schema'}</p><button disabled={!generated.valid} onClick={() => download(f.name, f.content, f.mime)}><Download size={16}/> Download {i === 0 ? 'RDL' : 'JSON'}</button></div>)}</div><button className="primary" disabled={!generated.valid} onClick={() => void zipDownload(generated.files)}>Download all · ZIP <Download size={16}/></button></>}
 </section><footer><span>REG CARD AUTOMATOR</span><span>One shared model · {generated.rdl.actualLookupCount} dynamic Lookup expressions</span></footer></main></div>;
}
