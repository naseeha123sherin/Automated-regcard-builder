import { configSchema, fields, type Config, type Project } from './model';
export type Issue = {
    path: string;
    message: string;
    severity: 'error' | 'warning';
};
export function validateConfig(value: unknown, kind: 'regcard' | 'checkin' | 'checkout', reference?: Config): Issue[] { const r = configSchema.safeParse(value); if (!r.success)
    return r.error.issues.map(i => ({ path: i.path.join('.'), message: i.message, severity: 'error' })); const issues: Issue[] = [], seen = new Set<string>(); r.data.rows.forEach((row, ri) => row.fields.forEach((f, fi) => { const path = `rows[${ri}].fields[${fi}]`; if (f.field_type.startsWith('input-') && !f.field_name)
    issues.push({ path: path + '.field_name', message: 'System field name is required.', severity: 'error' }); if (f.field_name) {
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(f.field_name))
        issues.push({ path: path + '.field_name', message: 'Use a system identifier (letters, numbers, underscore).', severity: 'error' });
    if (seen.has(f.field_name))
        issues.push({ path: path + '.field_name', message: `Duplicate system field: ${f.field_name}`, severity: 'error' });
    seen.add(f.field_name);
} const ref = reference && fields(reference).find(x => x.field_name && x.field_name === f.field_name); if (ref)
    for (const key of Object.keys(ref))
        if (!(key in f))
            issues.push({ path: path + '.' + key, message: 'Required reference property was removed.', severity: 'error' }); if (!['input-text', 'header', 'text', 'line-break', 'line-separator', 'checkbox'].includes(f.field_type))
    issues.push({ path, message: `Unsupported preview type ${f.field_type}; inspect before deployment.`, severity: 'warning' }); })); if (kind === 'checkin' && !fields(r.data).some(f => f.field_type === 'text' && f.field_value?.trim()))
    issues.push({ path: 'rows', message: 'Enter terms from the current document.', severity: 'error' }); if (kind === 'checkout' && !fields(r.data).filter(f => f.field_type === 'text')[1]?.field_value?.trim())
    issues.push({ path: 'rows', message: 'Property text is required.', severity: 'error' }); return issues; }
export function parseConfig(text: string, kind: 'regcard' | 'checkin' | 'checkout', reference?: Config) { let v: unknown; try {
    v = JSON.parse(text);
}
catch (e) {
    throw Error(`JSON syntax: ${(e as Error).message}`);
} const errors = validateConfig(v, kind, reference).filter(i => i.severity === 'error'); if (errors.length)
    throw Error(errors.map(i => `${i.path}: ${i.message}`).join('\n')); return configSchema.parse(v); }
export function rdlReadiness(p:Project):Issue[]{const out:Issue[]=[];if(!p.visualReviewed)out.push({path:'RDL visual review',message:'Compare the PDF and generated layout, then approve the visual design.',severity:'error'});if(p.elements.some(e=>e.kind==='image'&&!e.imageReviewed))out.push({path:'Document images',message:'Review unknown image areas; remove signatures or supply approved artwork.',severity:'error'});for(const m of p.fieldMappings)if(!['confirmed','ignored'].includes(m.status))out.push({path:m.detectedLabel,message:'Accept or ignore this mapping.',severity:'error'});return out;}
export function checkinReadiness(p:Project):Issue[]{return p.termsReviewed?[]:[{path:'terms',message:'Review and confirm source terms before downloading.',severity:'error'}];}
export function checkoutReadiness(p:Project):Issue[]{const out:Issue[]=[];if(!p.propertyReviewed||!p.propertyName.trim())out.push({path:'propertyName',message:'Confirm the current property name.',severity:'error'});const value=fields(p.checkoutTermsConfig).filter(f=>f.field_type==='text')[1]?.field_value;if(value!==p.propertyName)out.push({path:'checkout property',message:'Checkout property differs from the confirmed property name.',severity:'error'});return out;}
export function readiness(p:Project):Issue[]{return [...rdlReadiness(p),...checkinReadiness(p),...checkoutReadiness(p)];}
