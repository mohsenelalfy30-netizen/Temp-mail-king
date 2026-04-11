/**
 * Temp Mail King - Hybrid Decoding Engine (Professional + Manual Fallback)
 * المميزات: فك MIME، معالجة الصور CID، دعم كامل للعربية، نظام احتياطي عند انقطاع الإنترنت.
 */

// استيراد المكتبة الاحترافية من الـ CDN (سيتم حفظها في الـ Cache بواسطة Service Worker)
import PostalMime from 'https://cdn.jsdelivr.net/npm/postal-mime@2.1.0/+esm';

export const EmailDecoder = {
    /**
     * الدالة الرئيسية: تحاول استخدام المحرك الاحترافي أولاً، ثم اليدوي كاحتياط
     */
    async parse(rawContent) {
        if (!rawContent) return "";

        try {
            // 1. المحاولة باستخدام المحرك الاحترافي (PostalMime)
            const parser = new PostalMime();
            const email = await parser.parse(rawContent);
            
            // إذا نجح الاستخراج، ندمج الصور المضمنة (Inlined Images) ونعيد النتيجة
            if (email.html) return email.html;
            if (email.text) return `<pre style="white-space: pre-wrap; font-family: inherit;">${email.text}</pre>`;
            
        } catch (error) {
            console.warn("Professional Parser failed or offline, switching to Manual Engine...", error);
        }

        // 2. المحرك الاحتياطي (Manual Fallback) - يعمل بدون إنترنت وبدون مكتبات خارجية
        return this.manualParse(rawContent);
    },

    /**
     * المحرك اليدوي المطور (Manual Engine)
     */
    manualParse(rawContent) {
        // البحث عن الحدود (Boundary)
        const boundaryMatch = rawContent.match(/boundary=(?:"?)([^"\s;]+)(?:"?)/i);
        
        if (boundaryMatch) {
            return this.handleMultipart(rawContent, boundaryMatch[1]);
        }

        return this.processSinglePart(rawContent);
    },

    /**
     * معالجة الرسائل المتعددة الأجزاء يدوياً
     */
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

        // ربط الصور المضمنة (CID)
        Object.keys(attachments).forEach(cid => {
            const regex = new RegExp(`cid:${cid}`, 'g');
            finalHTML = finalHTML.replace(regex, attachments[cid]);
        });

        return finalHTML;
    },

    /**
     * معالجة الأجزاء المفردة
     */
    processSinglePart(part) {
        return this.extractBody(part);
    },

    /**
     * استخراج الجسد وفك التشفير (Base64 / Quoted-Printable)
     */
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

    /**
     * فك تشفير Base64 الاحترافي للعربية
     */
    decodeBase64(str) {
        try {
            const cleanStr = str.replace(/\s+/g, '');
            const binaryString = atob(cleanStr);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            return new TextDecoder('utf-8').decode(bytes);
        } catch (e) {
            return str;
        }
    },

    /**
     * فك تشفير Quoted-Printable المطور
     */
    decodeQuotedPrintable(str) {
        // تنظيف السطور المكسورة
        let decoded = str.replace(/=\r?\n/g, '');
        
        // فك الرموز الست عشرية وتحويلها لـ Bytes أولاً لمعالجة UTF-8 (العربية)
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
        } catch (e) {
            return decoded;
        }
    }
};

