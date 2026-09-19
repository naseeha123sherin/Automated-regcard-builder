import { z } from 'zod';
export const fieldSchema = z.object({ field_type: z.string().min(1), field_name: z.string().optional(), field_label: z.string().optional(), field_value: z.string().optional(), is_enabled: z.boolean().optional(), is_mandatory: z.boolean().optional() }).passthrough();
export const configSchema = z.object({ rows: z.array(z.object({ fields: z.array(fieldSchema) }).passthrough()) }).passthrough();
export type Config = z.infer<typeof configSchema>;
export type Field = z.infer<typeof fieldSchema>;
export const elementSchema = z.object({ id: z.string(), kind: z.enum(['text', 'dynamic', 'line', 'rectangle', 'image']), x: z.number().min(0).max(1), y: z.number().min(0).max(1), width: z.number().min(0).max(1), height: z.number().min(0).max(1), text: z.string().optional(), fieldName: z.string().optional(), fontFamily: z.string().optional(), italic: z.boolean().optional(), color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(), background: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(), borderColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(), lineStyle: z.enum(['Solid', 'Dashed', 'Dotted']).optional(), lineWidth: z.number().min(0).max(10).optional(), imageData: z.string().regex(/^data:image\/(png|jpeg);base64,[A-Za-z0-9+/]+={0,2}$/).optional(), imageReviewed: z.boolean().optional(), detectedLabel: z.string().optional(), detectedValue: z.string().optional(), fontSize: z.number().min(5).max(72).default(12), bold: z.boolean().default(false), align: z.enum(['Left', 'Center', 'Right']).default('Left') });
export type Element = z.infer<typeof elementSchema>;
export const analysisSchema = z.object({ propertyName: z.string(), propertyNameConfidence: z.number().min(0).max(1), orientation: z.enum(['portrait', 'landscape']), elements: z.array(elementSchema).max(500), detectedLabels: z.array(z.string()).max(150), terms: z.array(z.string()).max(100), checkboxLabels: z.array(z.string()).default([]), warnings: z.array(z.string()).default([]) });
export type Analysis = z.infer<typeof analysisSchema>;
export interface Mapping {
    id: string;
    detectedLabel: string;
    detectedValue?: string;
    elementId?: string;
    expression?: string;
    fieldName: string | null;
    fieldLabel: string;
    confidence: number;
    status: 'confirmed' | 'suggested' | 'requires_review' | 'ignored';
}
export const projectSchema = z.object({ version: z.literal(1), id: z.string(), propertyName: z.string(), propertyNameConfidence: z.number(), propertyReviewed: z.boolean(), orientation: z.enum(['portrait', 'landscape']), sourceDocument: z.object({ name: z.string(), mime: z.string() }).nullable(), sourceRdl: z.object({ name: z.string() }).nullable(), discoveredRdlFields: z.array(z.string()), customFields: z.array(z.string()), logo: z.object({ dataUrl: z.string().regex(/^data:image\/(png|jpeg);base64,[A-Za-z0-9+/]+={0,2}$/), mime: z.enum(['image/png', 'image/jpeg']) }).nullable(), elements: z.array(elementSchema), fieldMappings: z.array(z.object({ id: z.string(), detectedLabel: z.string(), detectedValue: z.string().optional(), elementId: z.string().optional(), expression: z.string().optional(), fieldName: z.string().nullable(), fieldLabel: z.string(), confidence: z.number(), status: z.enum(['confirmed', 'suggested', 'requires_review', 'ignored']) })), regcardConfig: configSchema, checkinTermsConfig: configSchema, checkoutTermsConfig: configSchema, termsReviewed: z.boolean(), visualReviewed: z.boolean(), analysisWarnings: z.array(z.string()), rdlConfig: z.object({ pageWidth: z.literal(20), pageHeight: z.literal(25) }), previewSampleData: z.record(z.string()), previewScreen: z.enum(['registration', 'terms', 'signature', 'checkout']) });
export type Project = z.infer<typeof projectSchema>;
export type Templates = {
    regcard: Config;
    checkin: Config;
    checkout: Config;
};
export const fields = (c: Config) => c.rows.flatMap(r => r.fields);
export const clone = <T>(x: T): T => structuredClone(x);
