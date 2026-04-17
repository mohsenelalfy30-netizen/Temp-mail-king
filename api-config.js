/**
 * ملف إعدادات الاتصال بـ Cloudflare Worker
 * مشروع: Temp Mail King
 * الرابط الجديد: api.king-tmail.tech
 */

// الرابط الاحترافي الجديد الذي قمت بتفعيله كـ Custom Domain
const WORKER_URL = 'https://api.king-tmail.tech'; 

/**
 * دالة جلب الرسائل من المخزن عبر الـ Worker
 * @param {string} email - عنوان البريد الإلكتروني المختار
 * @returns {Promise<Array>} - مصفوفة تحتوي على الرسائل المستلمة
 */
export async function fetchInbox(email) {
    // التأكد من وجود إيميل قبل إرسال الطلب
    if (!email) {
        console.warn("لم يتم تحديد بريد إلكتروني.");
        return [];
    }
    
    // تنظيف الإيميل لضمان مطابقة البحث في قاعدة D1
    const cleanEmail = email.trim().toLowerCase();
    
    /**
     * التعديل الجوهري هنا:
     * الـ Worker الجديد يبحث عن البريد باستخدام البرامتر 'address' بدلاً من 'email'
     * ولا يحتاج لمسار '/api/messages' لأننا برمجناه ليعمل على الرابط المباشر
     */
    const fetchUrl = `${WORKER_URL}/?address=${encodeURIComponent(cleanEmail)}`;

    try {
        const response = await fetch(fetchUrl, {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        });

        // إذا كان الرد ناجحاً
        if (response.ok) {
            const data = await response.json();
            
            // التأكد أن البيانات القادمة مصفوفة لتعرض في الموقع بدون أخطاء
            return Array.isArray(data) ? data : [];
        } 
        
        // إذا كان الإيميل جديداً ولا توجد رسائل بعد
        if (response.status === 404) {
            return [];
        }

        throw new Error(`خطأ في السيرفر: ${response.status}`);

    } catch (error) {
        console.error("حدث خطأ أثناء الاتصال بالـ API:", error);
        return [];
    }
}

