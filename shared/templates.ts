import regcard from '../reference/regcard_form.json';
import checkin from '../reference/checkin_terms.json';
import checkout from '../reference/checkout_terms.json';
import { clone, configSchema, type Templates } from './model';
export class ReferenceTemplateService {
    loadRegcardTemplate() { return configSchema.parse(clone(regcard)); }
    loadCheckinTermsTemplate() { return configSchema.parse(clone(checkin)); }
    loadCheckoutTermsTemplate() { return configSchema.parse(clone(checkout)); }
    load(): Templates { return { regcard: this.loadRegcardTemplate(), checkin: this.loadCheckinTermsTemplate(), checkout: this.loadCheckoutTermsTemplate() }; }
}
