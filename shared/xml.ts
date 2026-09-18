// Supplement DOM parsing: xmldom can recover an unclosed root without an error.
// This lexical pass rejects unmatched/truncated tags rather than accepting recovery.
export function validateXmlClosure(xml:string):string|null {
 const stack:string[]=[];
 const tokens=xml.match(/<!--[\s\S]*?-->|<!\[CDATA\[[\s\S]*?\]\]>|<\?[\s\S]*?\?>|<\/?[A-Za-z_][\w:.-]*(?:\s+(?:[^"'<>]|"[^"]*"|'[^']*')*)?\s*\/?>/g)||[];
 for(const tag of tokens){if(tag.startsWith('<!--')||tag.startsWith('<![')||tag.startsWith('<?'))continue;const name=/^<\/?([\w:.-]+)/.exec(tag)![1];if(tag.startsWith('</')){if(stack.pop()!==name)return `Mismatched closing tag: ${name}`;}else if(!tag.endsWith('/>'))stack.push(name);}
 return stack.length?`Unclosed XML element: ${stack.at(-1)}`:null;
}
