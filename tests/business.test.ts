import { describe, it, expect } from 'vitest';
import { ReferenceTemplateService } from '../shared/templates';
import { clone, fields } from '../shared/model';
import { acceptMapping, applyAnalysis, deserializeProject, newProject, nextScreen, serializeProject, setProperty, setTerms, effectiveElements } from '../shared/project';
import { mapLabels } from '../shared/mapping';
import { generateRdl, lookup, validateRdl } from '../shared/rdl';
import { parseConfig, validateConfig } from '../shared/validation';
import { generateFiles } from '../shared/generation';
import { ManualProvider, validateUpload } from '../backend/analysis';
const service = new ReferenceTemplateService(), t = service.load();
describe('canonical templates and project', () => {
    it('loads three independently cloned templates', () => { const a = service.load(); fields(a.regcard)[3].field_label = 'Changed'; expect(service.loadRegcardTemplate()).toEqual(t.regcard); expect(t.checkin.rows.length).toBeGreaterThan(0); expect(t.checkout.rows.length).toBeGreaterThan(0); });
    it('clears inherited reference property and legal text', () => { const p = newProject(t); expect(JSON.stringify(p.checkinTermsConfig)).not.toContain('Florida'); expect(JSON.stringify(p.checkoutTermsConfig)).not.toContain('Setai'); });
    it('updates labels without renaming system fields, preserving multilingual text', () => { const p = newProject(t); p.fieldMappings = mapLabels(['Guest Name / اسم الضيف'], t.regcard); const q = acceptMapping(p, p.fieldMappings[0].id); expect(fields(q.regcardConfig).find(f => f.field_name === 'fullname')?.field_label).toBe('Guest Name / اسم الضيف'); expect(fields(q.regcardConfig).map(f => f.field_name)).toEqual(fields(p.regcardConfig).map(f => f.field_name)); });
    it('unknown fields remain review-only and cannot be automatically accepted', () => { const p = newProject(t); p.fieldMappings = mapLabels(['Flight Number'], t.regcard); expect(p.fieldMappings[0].status).toBe('requires_review'); expect(() => acceptMapping(p, p.fieldMappings[0].id)).toThrow(); expect(fields(p.regcardConfig).some(f => f.field_name === 'flightNumber')).toBe(false); });
    it('low-confidence matches are never confirmed', () => expect(mapLabels(['Hotel guest name printed'], t.regcard)[0].status).not.toBe('confirmed'));
    it('preserves config structure through generation', () => { const p = newProject(t); expect(JSON.parse(generateFiles(p, t).files[1].content)).toEqual(t.regcard); });
    it('preserves exact terms punctuation and paragraphs', () => { const s = 'Terms §\n\nDo NOT rewrite. / الشروط'; expect(fields(setTerms(t.checkin, s)).find(f => f.field_type === 'text')?.field_value).toBe(s); });
    it('replaces checkout property', () => { const p = setProperty(newProject(t), 'W Maldives'); expect(fields(p.checkoutTermsConfig).filter(f => f.field_type === 'text')[1].field_value).toBe('W Maldives'); expect(generateFiles(p, t).files[0].name).toBe('W_Maldives_RegistrationCard.rdl'); });
    it('serializes full model and orientation', () => { const p = newProject(t); p.orientation = 'portrait'; expect(deserializeProject(serializeProject(p))).toEqual(p); expect(() => deserializeProject('{bad')).toThrow(); });
    it('navigates guest screens in order', () => { expect(nextScreen('registration')).toBe('terms'); expect(nextScreen('terms')).toBe('signature'); expect(nextScreen('signature')).toBe('checkout'); expect(nextScreen('checkout')).toBe('registration'); });
    it('analysis stages suggested mappings without changing field identifiers', () => { const p = applyAnalysis(newProject(t), { propertyName: 'Hotel', propertyNameConfidence: .5, orientation: 'portrait', elements: [], detectedLabels: ['Room No.'], terms: ['Exact source'], checkboxLabels: [], warnings: [] }, t); expect(p.propertyReviewed).toBe(false); expect(p.fieldMappings[0].status).toBe('suggested'); expect(p.regcardConfig).toEqual(t.regcard); });
});
describe('RDL XML validation', () => {
    it('generates real 2016 RDL with dimensions and DataSet1', () => { const p = newProject(t), s = generateRdl(p); expect(s).toContain('<ReportSections>'); expect(s).toContain('<PageWidth>19in</PageWidth>'); expect(s).toContain('<PageHeight>24in</PageHeight>'); expect(s).toContain('DataSet Name="DataSet1"'); expect(validateRdl(s, p).valid).toBe(true); });
    it('uses exact Lookup expressions for every dynamic field', () => { const p = newProject(t), s = generateRdl(p), v = validateRdl(s, p); expect(lookup('roomNumber')).toBe('=Lookup("roomNumber", Fields!FieldName.Value, Fields!FieldValue.Value, "DataSet1")'); expect(v.actualLookupCount).toBe(effectiveElements(p).filter(e => e.kind === 'dynamic').length); expect(v.actualLookupCount).toBe(v.expectedLookupCount); });
    it('calculates counts dynamically after manual field insertion', () => { const p = newProject(t); p.regcardConfig.rows.push({ fields: [{ field_type: 'input-text', field_name: 'flightNumber', field_label: 'Flight' }] }); expect(validateRdl(generateRdl(p), p).actualLookupCount).toBe(fields(p.regcardConfig).filter(f => f.field_name).length); });
    it('rejects malformed XML, wrong dimensions, dataset and placeholders', () => { const p = newProject(t), s = generateRdl(p); for (const invalid of [s.replace('</Report>', ''), s.replace('19in', '18in'), s.replaceAll('DataSet1', 'BadSet'), s.replace('=Lookup(&quot;fullname&quot;, Fields!FieldName.Value, Fields!FieldValue.Value, &quot;DataSet1&quot;)', '{{fullname}}')])
        expect(validateRdl(invalid, p).valid).toBe(false); });
    it('embeds a genuine proportional logo image', () => { const p = newProject(t); p.logo = { mime: 'image/png', dataUrl: 'data:image/png;base64,iVBORw0KGgo=' }; const s = generateRdl(p); expect(s).toContain('<Image Name="PropertyLogo">'); expect(s).toContain('<Sizing>FitProportional</Sizing>'); expect(validateRdl(s, p).valid).toBe(true); });
});
describe('JSON validation and safety', () => {
    it('detects missing field name with location', () => { const c = clone(t.regcard); c.rows.push({ fields: [{ field_type: 'input-text' }] }); expect(validateConfig(c, 'regcard').some(i => i.path.includes('field_name'))).toBe(true); });
    it('detects duplicate system fields', () => { const c = clone(t.regcard); c.rows.push({ fields: [{ field_type: 'input-text', field_name: 'fullname' }] }); expect(validateConfig(c, 'regcard').some(i => i.message.includes('Duplicate'))).toBe(true); });
    it('handles invalid JSON and structure', () => { expect(() => parseConfig('{bad', 'regcard')).toThrow('JSON syntax'); expect(() => parseConfig('{"rows":1}', 'regcard')).toThrow(); });
    it('blocks final downloads until property and terms review', () => { let p = newProject(t); expect(generateFiles(p, t).valid).toBe(false); p = setProperty(p, 'Current Hotel'); p.checkinTermsConfig = setTerms(p.checkinTermsConfig, 'Exact reviewed terms'); p.termsReviewed = true; expect(generateFiles(p, t).valid).toBe(true); });
    it('rejects corrupt and oversize uploads', () => { expect(() => validateUpload({ name: 'x.pdf', mime: 'application/pdf', dataUrl: 'data:application/pdf;base64,YmFk' })).toThrow('signature'); expect(() => validateUpload({ name: 'x.pdf', mime: 'application/pdf', dataUrl: 'data:application/pdf;base64,' + btoa('%PDF-123') }, .000001)).toThrow('exceeds'); });
    it('never fabricates extraction without credentials', async () => { await expect(new ManualProvider().analyzeRegistrationCard()).rejects.toThrow('not configured'); });
});
