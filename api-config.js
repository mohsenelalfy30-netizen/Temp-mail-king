// ملف إعدادات الاتصال بـ Cloudflare KV
export const API_CONFIG = {
    BASE_URL: 'https://api.cloudflare.com/client/v4',
    // هذه القيم سيتم استبدالها تلقائياً من GitHub Secrets أثناء الـ Build
    ACCOUNT_ID: 'CLOUDFLARE_ACCOUNT_ID_PLACEHOLDER',
    KV_NAMESPACE_ID: 'CLOUDFLARE_KV_ID_PLACEHOLDER',
    API_TOKEN: 'CLOUDFLARE_API_TOKEN_PLACEHOLDER'
};

export async function fetchInbox(email) {
    if (!email) return [];
    
    // تنظيف الإيميل لضمان استخدامه كمفتاح صحيح في KV
    const cleanEmail = email.trim().toLowerCase();
    const url = `${API_CONFIG.BASE_URL}/accounts/${API_CONFIG.ACCOUNT_ID}/storage/kv/namespaces/${API_CONFIG.KV_NAMESPACE_ID}/values/${encodeURIComponent(cleanEmail)}`;

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${API_CONFIG.API_TOKEN}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            if (response.status === 404) return []; // لا توجد رسائل لهذا الإيميل بعد
            throw new Error('خطأ في الاتصال بالمخزن');
        }

        const data = await response.json();
        
        // التأكد أن البيانات مصفوفة لتعرض في القائمة
        return Array.isArray(data) ? data : [data];
        
    } catch (error) {
        console.error("Fetch Error:", error);
        return [];
    }
}
