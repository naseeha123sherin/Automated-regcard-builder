import { type Config, type Project } from '../../shared/model';
export default function ConfigPreview({ config, values, onChange }: {
    config: Config;
    values?: Record<string, string>;
    onChange?: (name: string, value: string) => void;
}) { return <div className="config-preview" dir="auto">{config.rows.map((r, ri) => <div className="config-row" key={ri}>{r.fields.map((f, fi) => { const key = `${ri}_${fi}`; switch (f.field_type) {
    case 'line-break': return <div key={key} style={{ height: Math.min(80, Number(f.field_value) || 12), width: '100%' }}/>;
    case 'line-separator': return <hr key={key}/>;
    case 'header': return <h3 className="config-heading" dir="auto" key={key}>{f.field_value}</h3>;
    case 'text': return <p className="source-text" dir="auto" key={key}>{f.field_value}</p>;
    case 'checkbox': return <label className="consent" key={key}><input type="checkbox" disabled={!f.is_enabled}/>{f.field_label || f.field_value}</label>;
    case 'input-text': return <label className="mirror-field" key={key}><input aria-label={f.field_label || f.field_name} value={values?.[f.field_name || ''] || ''} disabled={!f.is_enabled || !onChange} required={f.is_mandatory} onChange={e => onChange?.(f.field_name!, e.target.value)}/><span dir="auto">{f.is_mandatory ? '* ' : ''}{f.field_label}</span></label>;
    default: return <div key={key} className="notice">Unsupported field type: {f.field_type}</div>;
} })}</div>)}</div>; }
export function PropertyHeader({ project }: {
    project: Project;
}) { return <div className="property-header">{project.logo ? <img src={project.logo.dataUrl} alt="Property logo"/> : <strong>{project.propertyName || 'Property name pending'}</strong>}<span>GUEST REGISTRATION CARD</span></div>; }
