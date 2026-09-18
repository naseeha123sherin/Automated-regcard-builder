import type { Element } from '../../shared/model';
export async function cropLogo(url: string, bounds: Element) {
 const img = new Image(); img.src = url; await img.decode();
 const canvas = document.createElement('canvas');
 canvas.width = Math.max(1, Math.round(bounds.width * img.width));
 canvas.height = Math.max(1, Math.round(bounds.height * img.height));
 canvas.getContext('2d')!.drawImage(img, bounds.x * img.width, bounds.y * img.height, canvas.width, canvas.height, 0, 0, canvas.width, canvas.height);
 return { dataUrl: canvas.toDataURL('image/png'), mime: 'image/png' as const };
}
