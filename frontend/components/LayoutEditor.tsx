import { clone, type Project, type Element } from '../../shared/model';
import { effectiveElements } from '../../shared/project';
export default function LayoutEditor({ project, onUpdate }: {
    project: Project;
    onUpdate: (p: Project) => void;
}) { const elements = effectiveElements(project); function update(id: string, key: string, value: string) { const q = clone(project); q.elements = effectiveElements(q); const e = q.elements.find(e => e.id === id)!; if (['x', 'y', 'width', 'height', 'fontSize'].includes(key)) {
    const n = Number(value);
    if (!Number.isFinite(n) || n < 0 || (key !== 'fontSize' && n > 1))
        return;
    (e as unknown as Record<string, unknown>)[key] = n;
}
else
    (e as unknown as Record<string, unknown>)[key] = value; onUpdate(q); } return <details className="panel layout-editor"><summary>Layout editor · normalized coordinates</summary><p>Edit the model, then regenerate. Unknown fields must first be added manually in JSON.</p><button onClick={() => { const q = clone(project); q.elements = [...elements, { id: crypto.randomUUID(), kind: 'text', text: 'New static text', x: .05, y: .05, width: .3, height: .03, fontSize: 12, bold: false, align: 'Left' }]; onUpdate(q); }}>Add element</button><div className="table-scroll"><table><thead><tr>{['Type', 'Text / system field', 'X', 'Y', 'W', 'H', 'Font', ''].map((x, i) => <th key={i}>{x}</th>)}</tr></thead><tbody>{elements.map(e => <tr key={e.id}><td><select value={e.kind} aria-label="Element type" onChange={v => update(e.id, 'kind', v.target.value as Element['kind'])}>{['text', 'dynamic', 'line', 'rectangle'].map(x => <option key={x}>{x}</option>)}</select></td><td><input aria-label="Text or system field" value={e.kind === 'dynamic' ? e.fieldName || '' : e.text || ''} onChange={v => update(e.id, e.kind === 'dynamic' ? 'fieldName' : 'text', v.target.value)}/></td>{(['x', 'y', 'width', 'height', 'fontSize'] as const).map(k => <td key={k}><input aria-label={k} type="number" step={k === 'fontSize' ? 1 : .01} value={e[k]} onChange={v => update(e.id, k, v.target.value)}/></td>)}<td><button onClick={() => onUpdate({ ...project, elements: elements.filter(x => x.id !== e.id) })}>Remove</button></td></tr>)}</tbody></table></div></details>; }
