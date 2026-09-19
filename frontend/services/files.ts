import * as pdfjs from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import JSZip from 'jszip';
import { extractPdfPage, localPdfAnalysis } from './pdf-analysis';
pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
export function downloadTextFile({filename,content,mimeType='text/plain;charset=utf-8'}:{filename:string;content:string|Blob;mimeType?:string}) { if(typeof content==='string'&&!content.length)throw Error('Generated file is empty.');const blob=content instanceof Blob?content:new Blob([content],{type:mimeType});const url=URL.createObjectURL(blob);const anchor=document.createElement('a');anchor.href=url;anchor.download=filename;anchor.style.display='none';document.body.appendChild(anchor);anchor.click();anchor.remove();setTimeout(()=>URL.revokeObjectURL(url),10_000); }
export function download(name:string,content:string|Blob,mime='application/json'){downloadTextFile({filename:name,content,mimeType:mime});}
export async function createZipBlob(files: {
    name: string;
    content: string;
}[]) { const zip = new JSZip(); for (const f of files)zip.file(f.name,f.content);return zip.generateAsync({type:'blob'}); }
export async function zipDownload(files: {name:string;content:string;}[]) {download('registration-card-package.zip',await createZipBlob(files));}
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
        const layout=await extractPdfPage(page,doc.numPages);
        await page.render({ canvas, viewport: vp }).promise;
        const text = await page.getTextContent();
        const analysis=await localPdfAnalysis(layout,canvas.toDataURL('image/png'));
        return { dataUrl: url, preview: canvas.toDataURL('image/png'), text: text.items.filter(i => 'str' in i).map(i => 'str' in i ? i.str : '').join('\n'), pages: doc.numPages, analysis };
    }
    finally {
        await task.destroy();
    }
} const image = new Image(); image.src = url; try {
    await image.decode();
}
catch {
    throw Error('Image is corrupted.');
} return { dataUrl: url, preview: url, text: '', pages: 1, analysis: null }; }
