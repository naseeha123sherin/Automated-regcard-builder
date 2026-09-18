import * as pdfjs from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import JSZip from 'jszip';
pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
export function download(name: string, content: string | Blob, mime = 'application/json') { const url = URL.createObjectURL(content instanceof Blob ? content : new Blob([content], { type: mime })); const a = document.createElement('a'); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
export async function zipDownload(files: {
    name: string;
    content: string;
}[]) { const zip = new JSZip(); for (const f of files)
    zip.file(f.name, f.content); download('registration-card-package.zip', await zip.generateAsync({ type: 'blob' })); }
export async function dataUrl(file: File) { return new Promise<string>((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(String(r.result)); r.onerror = () => reject(Error('Unable to read file.')); r.readAsDataURL(file); }); }
export async function readSource(file: File) { if (!['application/pdf', 'image/png', 'image/jpeg'].includes(file.type))
    throw Error('Upload PDF, PNG, JPG or JPEG.'); if (file.size > 10 * 1024 * 1024)
    throw Error('Maximum file size is 10 MB.'); const url = await dataUrl(file); if (file.type === 'application/pdf') {
    const task = pdfjs.getDocument({ data: await file.arrayBuffer() });
    const doc = await task.promise;
    try {
        const page = await doc.getPage(1), vp = page.getViewport({ scale: 1.3 }), canvas = document.createElement('canvas');
        canvas.width = vp.width;
        canvas.height = vp.height;
        await page.render({ canvas, viewport: vp }).promise;
        const text = await page.getTextContent();
        return { dataUrl: url, preview: canvas.toDataURL('image/png'), text: text.items.filter(i => 'str' in i).map(i => 'str' in i ? i.str : '').join('\n'), pages: doc.numPages };
    }
    finally {
        await task.destroy();
    }
} const image = new Image(); image.src = url; try {
    await image.decode();
}
catch {
    throw Error('Image is corrupted.');
} return { dataUrl: url, preview: url, text: '', pages: 1 }; }
