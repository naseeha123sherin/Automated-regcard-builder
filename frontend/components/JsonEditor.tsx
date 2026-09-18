import { useEffect, useState } from 'react';
import Editor, { loader } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import EditorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import JsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker';
import type { Config } from '../../shared/model';
import { parseConfig } from '../../shared/validation';
import { download } from '../services/files';
loader.config({ monaco });
(globalThis as typeof globalThis & {
    MonacoEnvironment: unknown;
}).MonacoEnvironment = { getWorker: (_id: string, label: string) => label === 'json' ? new JsonWorker() : new EditorWorker() };
export default function JsonEditor({ config, reference, kind, onApply }: {
    config: Config;
    reference: Config;
    kind: 'regcard' | 'checkin' | 'checkout';
    onApply: (c: Config) => void;
}) { const [text, setText] = useState(JSON.stringify(config, null, 2)), [error, setError] = useState(''), [status, setStatus] = useState(''), [previous, setPrevious] = useState<string | null>(null); useEffect(() => { setText(JSON.stringify(config, null, 2)); setError(''); setStatus(''); }, [config, kind]); function action(apply = false) { try {
    const c = parseConfig(text, kind, kind === 'regcard' ? reference : undefined);
    setError('');
    setStatus(apply ? 'Applied to project and previews.' : 'Valid JSON and structure.');
    if (apply) {
        setPrevious(JSON.stringify(config, null, 2));
        onApply(c);
    }
    return c;
}
catch (e) {
    setError((e as Error).message);
    setStatus('');
} } return <div className="editor"><div className="toolbar"><button onClick={() => { try {
    setText(JSON.stringify(JSON.parse(text), null, 2));
    setError('');
}
catch (e) {
    setError((e as Error).message);
} }}>Format</button><button onClick={() => action()}>Validate</button><button onClick={() => { setPrevious(text); setText(JSON.stringify(reference, null, 2)); setStatus('Template loaded into draft. Review before applying.'); }}>Reset draft</button><button disabled={!previous} onClick={() => { const current = text; setText(previous!); setPrevious(current); }}>Undo</button></div><Editor height="520px" language="json" value={text} onChange={v => setText(v || '')} options={{ fontSize: 14, minimap: { enabled: false }, scrollBeyondLastLine: false, wordWrap: 'on', automaticLayout: true }}/>{error && <pre className="error" role="alert">{error}</pre>}{status && <p role="status">{status}</p>}<div className="toolbar"><button className="primary" onClick={() => action(true)}>Apply changes</button><button onClick={() => { const c = action(); if (c)
    download(`${kind === 'regcard' ? 'regcard' : kind + '_terms'}.json`, JSON.stringify(c, null, 2)); }}>Download draft JSON</button></div></div>; }
