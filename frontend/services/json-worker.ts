export default class JsonWorker extends Worker {
    constructor() { super('/assets/json.worker.js', { type: 'module' }); }
}
