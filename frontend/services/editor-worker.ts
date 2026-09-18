export default class EditorWorker extends Worker {
    constructor() { super('/assets/editor.worker.js', { type: 'module' }); }
}
