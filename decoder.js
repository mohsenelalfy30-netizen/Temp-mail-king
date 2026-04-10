/**
 * Temp Mail King - Advanced Email Decoder Engine
 * يدعم: Base64, Quoted-Printable, Multipart Messages, Inline Images (CID), Arabic Encoding
 */

export const EmailDecoder = {
    /**
     * الدالة الرئيسية لاستقبال محتوى الإيميل الخام وتحويله لـ HTML نظيف
     */
    parse: function(rawContent) {
        if (!rawContent) return "";

        // 1. استخراج الحدود (Boundary) إذا كانت الرسالة Multipart
        const boundaryMatch = rawContent.match(/boundary=(?:"?)([^"\s;]+)(?:"?)/i);
        
        if (boundaryMatch) {
            const boundary = boundaryMatch[1];
            return this.handleMultipart(rawContent, boundary);
        }

        // 2. إذا لم تكن Multipart، نعالجها كرسالة بسيطة
        return this.processSinglePart(rawContent);
    },

    /**
     * معالجة الرسائل المعقدة التي تحتوي على أجزاء مختلفة (نص + صور + روابط)
     */
    handleMultipart: function(content, boundary) {
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
            // معالجة الصور المضمنة داخل الإيميل (CID)
            else if (part.includes('Content-ID:')) {
                const cidMatch = part.match(/Content-ID:\s*<([^>]+)>/i);
                const contentTypeMatch = part.match(/Content-Type:\s*([^;\s]+)/i);
                if (cidMatch && contentTypeMatch) {
                    const cid = cidMatch[1];
                    const base64Data = this.extractBody(part, true); // استخراج الخام
                    attachments[cid] = `data:${contentTypeMatch[1]};base64,${base64Data}`;
                }
            }
        });

        let finalHTML = htmlContent || `<pre style="white-space: pre-wrap;">${plainText}</pre>`;

        // ربط الصور (CID) بمواقعها داخل الإيميل لتعمل الـ <img> بشكل صحيح
        Object.keys(attachments).forEach(cid => {
            const regex = new RegExp(`cid:${cid}`, 'g');
            finalHTML = finalHTML.replace(regex, attachments[cid]);
        });

        return finalHTML;
    },

    /**
     * معالجة الرسائل البسيطة (Single Part)
     */
    processSinglePart: function(part) {
        return this.extractBody(part);
    },

    /**
     * استخراج وتفكيك تشفير المحتوى (Base64 أو Quoted-Printable)
     */
    extractBody: function(part, returnRawBase64 = false) {
        const separator = part.indexOf('\n\n');
        const header = separator !== -1 ? part.substring(0, separator) : "";
        let body = separator !== -1 ? part.substring(separator + 2).trim() : part.trim();

        // إزالة الفواصل النهائية إن وجدت
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
    decodeBase64: function(str) {
        try {
            const cleanStr = str.replace(/\s+/g, '');
            const binaryString = atob(cleanStr);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            return new TextDecoder('utf-8').decode(bytes);
        } catch (e) {
            console.error("Decoder Error (Base64):", e);
            return str;
        }
    },

    /**
     * فك تشفير Quoted-Printable (يستخدم بكثرة في الرسائل التي تحتوي عربية وروابط)
     */
    decodeQuotedPrintable: function(str) {
        // 1. معالجة السطور المكسورة (= تليها نهاية سطر)
        let decoded = str.replace(/=\r\n/g, '').replace(/=\n/g, '');
        
        // 2. معالجة الرموز الست عشرية (مثل =D8=A7 للياء)
        decoded = decoded.replace(/=([0-9A-F]{2})/gi, (match, hex) => {
            return String.fromCharCode(parseInt(hex, 16));
        });

        try {
            // التحويل النهائي لـ UTF-8 لضمان ظهور الأحرف العربية بشكل سليم
            const bytes = new Uint8Array(decoded.length);
            for (let i = 0; i < decoded.length; i++) {
                bytes[i] = decoded.charCodeAt(i);
            }
            return new TextDecoder('utf-8').decode(bytes);
        } catch (e) {
            return decoded;
        }
    }
};

