import regcard from '../reference/regcard_formnewref.json';
import checkboxTerms from '../reference/checkin_termsRef2.json';
import checkin from '../reference/checkin_terms.json';
import checkout from '../reference/checkout_terms.json';
import { clone, configSchema, type Templates } from './model';
export class ReferenceTemplateService {
    loadRegcardTemplate() { return configSchema.parse(clone(regcard)); }
    loadCheckinTermsTemplate() { return configSchema.parse(clone(checkin)); }
    loadCheckoutTermsTemplate() { return configSchema.parse(clone(checkout)); }
    loadCheckboxTermsTemplate() { return configSchema.parse(clone(checkboxTerms)); }
    load(): Templates { return { regcard: this.loadRegcardTemplate(), checkin: this.loadCheckinTermsTemplate(), checkout: this.loadCheckoutTermsTemplate() }; }
}
