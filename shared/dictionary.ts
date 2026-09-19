import suppliedNames from '../reference/approved-fields.json';
export const APPROVED_FIELDS: readonly string[] = Object.freeze([...suppliedNames]);
export const isApprovedField = (name: string | undefined | null): name is string => !!name && APPROVED_FIELDS.includes(name);
// Separate integration contracts: never rename Mirror JSON fields to RDL names.
export const mirrorFieldName = (rdlName: string) => ({ Fullname: 'fullname', confirmationN: 'confirmationNo' } as Record<string, string>)[rdlName] || rdlName;
