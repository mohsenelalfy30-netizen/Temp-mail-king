/**
 * Temp Mail King - Hybrid Decoding Engine (Unabridged Version)
 * Author: Development Team
 * Features: Professional MIME Parsing, CID Image Mapping, UTF-8 Arabic Support, 
 * Automatic Manual Fallback, Base64 & Quoted-Printable Decoding.
 */

// استيراد المكتبة الاحترافية لمعالجة الـ MIME
import PostalMime from 'https://cdn.jsdelivr.net/npm/postal-mime@2.1.0/+esm';

export const EmailDecoder = {
    /**
     * الدالة الأساسية: البدء بالمحرك الاحترافي ثم الانتقال لليجوي عند الضرورة
     */
    async parse(rawContent) {
        if (!rawContent) return "";

        try {
            // 1. المحرك الاحترافي (PostalMime)
            const parser = new PostalMime();
            const email = await parser.parse(rawContent);
            
            if (email.html) {
                let processedHtml = email.html;

                // معالجة الصور المضمنة (CID) مثل أكواد LinkedIn و Adobe
                if (email.attachments && email.attachments.length > 0) {
                    email.attachments.forEach(att => {
                        if (att.contentId) {
                            // تحويل محتوى المرفق (ArrayBuffer) إلى Base64 لعرضه كصورة
                            const base64 = this.arrayBufferToBase64(att.content);
                            const dataUrl = `data:${att.mimeType};base64,${base64}`;
                            
                            // تنظيف معرف الصورة واستبداله في كود HTML
                            const cidClean = att.contentId.replace(/[<>]/g, '');
                            const regex = new RegExp(`cid:${cidClean}`, 'g');
                            processedHtml = processedHtml.replace(regex, dataUrl);
                        }
                    });
                }
                return processedHtml;
            }
            
            // إذا كانت الرسالة نصية فقط (Plain Text)
            if (email.text) {
                return `<pre style="white-space: pre-wrap; font-family: inherit; line-height: 1.6;">${email.text}</pre>`;
            }
            
        } catch (error) {
            console.error("Professional Engine Error:", error);
        }

        // 2. المحرك اليدوي الاحتياطي (Manual Fallback) - يعمل تلقائياً عند فشل المكتبة
        return this.manualParse(rawContent);
    },

    /**
     * تحويل ملفات الـ Buffer إلى Base64 (محرك الصور)
     */
    arrayBufferToBase64(buffer) {
        let binary = '';
        const bytes = new Uint8Array(buffer);
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    },

    /**
     * المحرك اليدوي (Manual Engine) لمعالجة الرسائل الخام
     */
    manualParse(rawContent) {
        // البحث عن الحدود الفاصلة للرسائل متعددة الأجزاء
        const boundaryMatch = rawContent.match(/boundary=(?:"?)([^"\s;]+)(?:"?)/i);
        
        if (boundaryMatch) {
            return this.handleMultipart(rawContent, boundaryMatch[1]);
        }

        return this.processSinglePart(rawContent);
    },

    /**
     * معالجة الرسائل ذات الأجزاء المتعددة (HTML + Text + Images)
     */
    handleMultipart(content, boundary) {
        const parts = content.split('--' + boundary);
        let htmlContent = "";
        let plainText = "";
        const attachments = {};

        parts.forEach(part => {
            // استخراج جزء HTML
            if (part.includes('Content-Type: text/html')) {
                htmlContent = this.extractBody(part);
            } 
            // استخراج جزء النص العادي
            else if (part.includes('Content-Type: text/plain') && !htmlContent) {
                plainText = this.extractBody(part);
            } 
            // استخراج الصور المضمنة (CID) يدوياً
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

        let finalResult = htmlContent || `<pre style="white-space: pre-wrap;">${plainText}</pre>`;

        // ربط الصور المضمنة في المحرك اليدوي
        Object.keys(attachments).forEach(cid => {
            const regex = new RegExp(`cid:${cid}`, 'g');
            finalResult = finalResult.replace(regex, attachments[cid]);
        });

        return finalResult;
    },

    /**
     * معالجة الرسائل البسيطة (جزء واحد)
     */
    processSinglePart(part) {
        return this.extractBody(part);
    },

    /**
     * استخراج المحتوى وفك التشفير بناءً على النوع (Base64 / Quoted-Printable)
     */
    extractBody(part, returnRawBase64 = false) {
        const separator = part.indexOf('\n\n');
        const header = separator !== -1 ? part.substring(0, separator) : "";
        let body = separator !== -1 ? part.substring(separator + 2).trim() : part.trim();

        // إزالة حدود النهاية
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
     * فك تشفير Base64 مع دعم كامل للغة العربية (UTF-8)
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
            console.error("Base64 Decode Error:", e);
            return str;
        }
    },

    /**
     * فك تشفير Quoted-Printable المطور (للعربية والرموز الخاصة)
     */
    decodeQuotedPrintable(str) {
        // معالجة السطور المكسورة (Soft Line Breaks)
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
        } catch (e) {
            return decoded;
        }
    }
};

