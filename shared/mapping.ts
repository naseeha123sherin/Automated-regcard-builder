import { fields, type Config, type Mapping } from './model';
import { APPROVED_FIELDS, mirrorFieldName } from './dictionary';
import { lookup } from './expressions';
const aliases: Record<string, string[]> = {
 Fullname: ['name', 'guest name', 'guest full name', 'full name'], confirmationN: ['reservation no', 'reservation number', 'confirmation no', 'confirmation number', 'booking no', 'booking number'], roomNumber: ['room number', 'room no', 'room', 'room #'],
 arrivalDate: ['arrival', 'arrival date', 'check in', 'check in date'], departureDate: ['departure', 'departure date', 'check out', 'check out date'], arrivalTime: ['arrival time', 'check in time'], departureTime: ['departure time', 'check out time'],
 phoneNumber: ['phone', 'phone no', 'phone number', 'telephone', 'mobile', 'mobile number'], email: ['email', 'e mail', 'email address'], companyName: ['company', 'company name'], reservationGroup: ['group'], address1: ['address'], city: ['city'], state: ['state', 'prov state', 'province'], country: ['country'], zipCode: ['zip code', 'postal zip code', 'postal code'],
 adultCount: ['adults', 'number of adults', 'no of adults'], childCount: ['children', 'number of children', 'no of children', 'number of child'], roomType: ['room type', 'room category'], roomRate: ['room rate', 'rate', 'daily rate', 'daily rate $'], paymentType: ['payment', 'payment type', 'method of payment'], passportN: ['passport', 'passport no', 'passport number'], nationality: ['nationality'], noOfNights: ['number of nights', 'nights'], accompanyGuestName: ['name of accompanying guest', 'accompanying guest'], Signature: ['signature', 'guest signature'], suplemmentCharges: ['supplemental charges', 'supplemental room upsell fee'], rateChanges: ['rate changes']
};
export const normalizeLabel = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
export function mapLabels(labels: string[], c?: Config): Mapping[] {
 return labels.map((label, i) => {
  const n = normalizeLabel(label.split('/')[0]); let best: string | null = null, score = 0;
  for (const name of APPROVED_FIELDS) {
   const mirror = c && fields(c).find(f => f.field_name === mirrorFieldName(name));
   const candidates = [name.replace(/([a-z])([A-Z])/g, '$1 $2'), mirror?.field_label || '', ...(aliases[name] || [])].map(normalizeLabel).filter(Boolean);
   const v = candidates.includes(n) ? .97 : candidates.some(s => s.length > 4 && (n.includes(s) || s.includes(n))) ? .62 : 0;
   if (v > score) { best = name; score = v; }
  }
  return { id: `mapping_${i}`, detectedLabel: label, detectedValue: '', fieldName: best, fieldLabel: label, confidence: score, status: score >= .9 ? 'suggested' : 'requires_review', expression: best ? lookup(best) : '' };
 });
}
