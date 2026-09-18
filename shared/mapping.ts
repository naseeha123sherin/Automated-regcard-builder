import { fields, type Config, type Mapping } from './model';
const aliases: Record<string, string[]> = { fullname: ['name', 'guest name', 'guest full name', 'full name'], confirmationNo: ['reservation no', 'reservation number', 'confirmation no', 'confirmation number'], roomNumber: ['room number', 'room no', 'room'], arrivalDate: ['arrival', 'arrival date', 'check in', 'check in date'], departureDate: ['departure', 'departure date', 'check out', 'check out date'], phoneNumber: ['phone', 'phone no', 'phone number', 'mobile', 'mobile number'], email: ['email', 'e mail', 'email address'], companyName: ['company', 'company name'], address1: ['address'], adultCount: ['adults', 'number of adults', 'no of adults'], childCount: ['children', 'number of children', 'no of children'], roomType: ['room type'], roomRate: ['room rate'], reservationGroup: ['group'] };
const normalize = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
export function mapLabels(labels: string[], c: Config): Mapping[] { const available = fields(c).filter(f => f.field_name); return labels.map((label, i) => { const n = normalize(label.split('/')[0]); let best: string | null = null, score = 0; for (const f of available) {
    const candidates = [f.field_label || '', f.field_name!.replace(/([A-Z])/g, ' $1'), ...(aliases[f.field_name!] || [])].map(normalize);
    const exact = candidates.includes(n), partial = candidates.some(s => s.length > 3 && (n.includes(s) || s.includes(n)));
    const v = exact ? .96 : partial ? .65 : 0;
    if (v > score) {
        best = f.field_name!;
        score = v;
    }
} return { id: `mapping_${i}`, detectedLabel: label, fieldName: best, fieldLabel: label, confidence: score, status: best ? 'suggested' : 'requires_review' }; }); }
