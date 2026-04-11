/**
 * Temp Mail King - Hybrid Decoding Engine (Professional + Manual Fallback)
 * التحديث: دعم ربط الصور المضمنة (CID) في المحركين الاحترافي واليدوي.
 */

import PostalMime from 'https://cdn.jsdelivr.net/npm/postal-mime@2.1.0/+esm';

export const EmailDecoder = {
    async parse(rawContent) {
        if (!rawContent) return "";

        try {
            const parser = new PostalMime();
            const email = await parser.parse(rawContent);
            
            if (email.html) {
                let processedHtml = email.html;

                // التعديل الجوهري: ربط المرفقات المضمنة (Inline Images) داخل المحرك الاحترافي
                if (email.attachments && email.attachments.length > 0) {
                    email.attachments.forEach(att => {
                        if (att.contentId) {
                            // تحويل الـ Blob إلى Base64 لعرضه
                            const blob = new Blob([att.content], { type: att.mimeType });
                            const reader = new FileReader();
                            
                            // ملاحظة: بما أننا في async function، يفضل استخدام الـ CID مباشرة إذا كان متاحاً
                            const base64 = this.arrayBufferToBase64(att.content);
                            const dataUrl = `data:${att.mimeType};base64,${base64}`;
                            
                            // استبدال كل cid: بهذا الـ Data URL
                            const cidClean = att.contentId.replace(/[<>]/g, '');
                            const regex = new RegExp(`cid:${cidClean}`, 'g');
                            processedHtml = processedHtml.replace(regex, dataUrl);
                        }
                    });
                }
                return processedHtml;
            }
            
            if (email.text) return `<pre style="white-space: pre-wrap; font-family: inherit;">${email.text}</pre>`;
            
        } catch (error) {
            console.warn("Professional Parser failed, switching to Manual Engine...", error);
        }

        return this.manualParse(rawContent);
    },

    // دالة مساعدة لتحويل ArrayBuffer إلى Base64 (مهمة لصور LinkedIn)
    arrayBufferToBase64(buffer) {
        let binary = '';
        const bytes = new Uint8Array(buffer);
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    },

    manualParse(rawContent) {
        const boundaryMatch = rawContent.match(/boundary=(?:"?)([^"\s;]+)(?:"?)/i);
        if (boundaryMatch) {
            return this.handleMultipart(rawContent, boundaryMatch[1]);
        }
        return this.processSinglePart(rawContent);
    },

    handleMultipart(content, boundary) {
        const parts = content.split('--' + boundary);
        let htmlContent = "";
        let plainText = "";
        const attachments = {};

        parts.forEach(part => {
            if (part.includes('Content-Type: text/html')) {
                htmlContent = this.extractBody(part);
            } else if (part.includes('Content-Type: text/plain') && !htmlContent) {
                plainText = this.extractBody(part);
            } 
            else if (part.includes('Content-ID:')) {
                const cidMatch = part.match(/Content-ID:\s*<([^>]+)>/i);
                const contentTypeMatch = part.match(/Content-Type:\s*([^;\s]+)/i);
                if (cidMatch && contentTypeMatch) {
                    const cid = cidMatch[1];
                    const base64Data = this.extractBody(part, true);
                    attachments[cid] = `data:${contentTypeMatch[1]};base64,${base64Data}`;
                }
            }
        });

        let finalHTML = htmlContent || `<pre style="white-space: pre-wrap;">${plainText}</pre>`;

        Object.keys(attachments).forEach(cid => {
            const regex = new RegExp(`cid:${cid}`, 'g');
            finalHTML = finalHTML.replace(regex, attachments[cid]);
        });

        return finalHTML;
    },

    processSinglePart(part) {
        return this.extractBody(part);
    },

    extractBody(part, returnRawBase64 = false) {
        const separator = part.indexOf('\n\n');
        const header = separator !== -1 ? part.substring(0, separator) : "";
        let body = separator !== -1 ? part.substring(separator + 2).trim() : part.trim();
        body = body.replace(/--\s*$/, '');

        const encodingMatch = header.match(/Content-Transfer-Encoding:\s*([^\s;]+)/i);
        const encoding = encodingMatch ? encodingMatch[1].toLowerCase() : "";

        if (encoding === 'base64') {
            return returnRawBase64 ? body.replace(/\s+/g, '') : this.decodeBase64(body);
        } else if (encoding === 'quoted-printable') {
            return this.decodeQuotedPrintable(body);
        }
        return body;
    },

    decodeBase64(str) {
        try {
            const cleanStr = str.replace(/\s+/g, '');
            const bytes = Uint8Array.from(atob(cleanStr), c => c.charCodeAt(0));
            return new TextDecoder('utf-8').decode(bytes);
        } catch (e) { return str; }
    },

    decodeQuotedPrintable(str) {
        let decoded = str.replace(/=\r?\n/g, '');
        const bytes = [];
        for (let i = 0; i < decoded.length; i++) {
            if (decoded[i] === '=' && i + 2 < decoded.length) {
                const hex = decoded.substring(i + 1, i + 3);
                if (/^[0-9A-F]{2}$/i.test(hex)) {
                    bytes.push(parseInt(hex, 16));
                    i += 2;
                    continue;
                }
            }
            bytes.push(decoded.charCodeAt(i));
        }
        try {
            return new TextDecoder('utf-8').decode(new Uint8Array(bytes));
        } catch (e) { return decoded; }
    }
};

