import { clone, fields, projectSchema, type Project, type Templates, type Analysis, type Config, type Element } from './model';
import { mapLabels } from './mapping';
export const sampleData: Record<string, string> = { fullname: 'Mr Amr Farid', confirmationNo: '477308', arrivalDate: '07/04/2026', departureDate: '12/04/2026', roomType: 'Superior Overwater', roomNumber: '218', roomRate: '1165.88', adultCount: '1', childCount: '0', companyName: 'Gulf Travel & Tours', phoneNumber: '', email: '', address1: '', reservationGroup: '' };
export function newProject(t: Templates): Project { const checkin = clone(t.checkin), checkout = clone(t.checkout); fields(checkin).filter(f => f.field_type === 'text').forEach(f => f.field_value = ''); fields(checkout).filter(f => f.field_type === 'text').slice(1).forEach(f => f.field_value = ''); return { version: 1, id: crypto.randomUUID(), projectName: 'Untitled registration card', propertyName: '', propertyNameConfidence: 0, propertyReviewed: false, orientation: 'landscape', sourceDocument: null, logo: null, elements: [], fieldMappings: [], regcardConfig: clone(t.regcard), checkinTermsConfig: checkin, checkoutTermsConfig: checkout, termsReviewed: false, analysisWarnings: [], rdlConfig: { pageWidth: 19, pageHeight: 24 }, previewSampleData: clone(sampleData), previewScreen: 'registration' }; }
export function setProperty(p: Project, name: string): Project { const q = clone(p); q.propertyName = name; q.propertyReviewed = !!name.trim(); const texts = fields(q.checkoutTermsConfig).filter(f => f.field_type === 'text'); if (texts[1])
    texts[1].field_value = name; return q; }
export function setTerms(c: Config, text: string): Config { const q = clone(c); const fs = fields(q).filter(f => f.field_type === 'text'); if (fs.length) {
    fs[0].field_value = text;
    fs.slice(1).forEach(f => f.field_value = '');
}
else
    q.rows.push({ fields: [{ field_type: 'text', field_value: text }] }); return q; }
export function applyAnalysis(p: Project, a: Analysis, t: Templates): Project { const q = setProperty(p, a.propertyName); q.propertyReviewed = false; q.propertyNameConfidence = a.propertyNameConfidence; q.orientation = a.orientation; q.elements = a.elements; q.fieldMappings = mapLabels(a.detectedLabels, t.regcard); q.checkinTermsConfig = setTerms(q.checkinTermsConfig, a.terms.join('\n\n')); q.termsReviewed = false; q.analysisWarnings = a.warnings; for (const label of a.checkboxLabels)
    q.checkinTermsConfig.rows.push({ fields: [{ field_type: 'checkbox', field_label: label, is_enabled: true }] }); return q; }
export function acceptMapping(p: Project, id: string): Project { const q = clone(p), m = q.fieldMappings.find(x => x.id === id); if (!m?.fieldName)
    throw Error('Choose an existing field before accepting.'); const f = fields(q.regcardConfig).find(f => f.field_name === m.fieldName); if (!f)
    throw Error('System field does not exist.'); f.field_label = m.fieldLabel; m.status = 'confirmed'; for (const e of q.elements) {
    if (e.fieldName === m.detectedLabel || e.fieldName === m.fieldName)
        e.fieldName = m.fieldName;
    if (e.kind === 'text' && e.text === m.detectedLabel) {
        e.fieldName = m.fieldName;
        e.text = m.fieldLabel;
    }
} return q; }
export function effectiveElements(p: Project): Element[] { if (p.elements.length)
    return p.elements; const out: Element[] = [{ id: 'title', kind: 'text', text: 'GUEST REGISTRATION CARD', x: .05, y: .03, width: .9, height: .04, fontSize: 18, bold: true, align: 'Right' }]; let y = .11; for (const [ri, row] of p.regcardConfig.rows.entries()) {
    if (row.fields.every(f => f.field_type === 'line-break')) {
        y += .008;
        continue;
    }
    row.fields.forEach((f, ci) => { const x = .05 + ci * .9 / row.fields.length, w = .9 / row.fields.length - .015; if (f.field_type === 'input-text' && f.field_name) {
        out.push({ id: `value_${ri}_${ci}`, kind: 'dynamic', fieldName: f.field_name, x, y, width: w, height: .022, fontSize: 12, bold: true, align: 'Left' }, { id: `label_${ri}_${ci}`, kind: 'text', text: f.field_label, x, y: y + .026, width: w, height: .022, fontSize: 10, bold: false, align: 'Left' }, { id: `line_${ri}_${ci}`, kind: 'line', x, y: y + .025, width: w, height: 0, fontSize: 12, bold: false, align: 'Left' });
    }
    else if (f.field_type === 'line-separator')
        out.push({ id: `sep_${ri}`, kind: 'line', x, y, width: w, height: 0, fontSize: 12, bold: false, align: 'Left' });
    else if (f.field_type === 'text')
        out.push({ id: `text_${ri}_${ci}`, kind: 'text', text: f.field_value, x, y, width: w, height: .05, fontSize: 12, bold: false, align: 'Left' }); });
    y += .065;
} return out; }
export const serializeProject = (p: Project) => JSON.stringify(p, null, 2);
export const deserializeProject = (s: string) => projectSchema.parse(JSON.parse(s));
export function safeName(name: string) { return name.normalize('NFKD').replace(/[^a-zA-Z0-9_-]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 80); }
export const nextScreen = (s: Project['previewScreen']): Project['previewScreen'] => ({ registration: 'terms', terms: 'signature', signature: 'checkout', checkout: 'registration' } as const)[s];
