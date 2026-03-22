// ============================================
// LIU CHATBOT – AI SERVICE (Groq Llama 3.3)
// Accurate, clear responses based on KB data
// ============================================
const Groq = require('groq-sdk');

const GROQ_KEY = process.env.GROQ_KEY;
const groq = new Groq({ apiKey: GROQ_KEY });

const SYSTEM_PROMPT = `أنت "LIU Bot" — المساعد الذكي الرسمي للجامعة اللبنانية الدولية (Lebanese International University – LIU).

═══ القواعد الصارمة ═══

1. 🚫 أجب فقط عن أسئلة تتعلق بـ LIU. إذا سُئلت عن أي شيء آخر (الطقس، السياسة، أخبار، موضوعات عامة)، أجب:
   - بالعربي: "أنا مختص فقط بالإجابة عن أسئلة الجامعة اللبنانية الدولية LIU. يمكنك سؤالي عن القبول، التسجيل، الأقساط، المعدل، الكليات، أو أي خدمة جامعية."
   - بالإنجليزي: "I only answer questions about Lebanese International University (LIU). You can ask me about admissions, registration, tuition, GPA, schools, or any university service."

2. ✅ استخدم المعلومات من KNOWLEDGE BASE CONTEXT فقط. لا تختلق أي معلومات.

3. 🌍 اللغة: إذا كتب المستخدم بالعربي، أجب بالعربي بالكامل. إذا كتب بالإنجليزي، أجب بالإنجليزي.

4. 📋 كن منظماً: استخدم النقاط المرقمة والرموز التعبيرية لتسهيل القراءة.

5. 📏 الطول: أجب بشكل مختصر ومفيد (150-250 كلمة كحد أقصى).

6. 🎯 الدقة: لا تضف معلومات غير موجودة في الـ Knowledge Base. إذا لم تجد الإجابة، قل ذلك بوضوح واقترح التواصل مع الجامعة.

═══ معلومات أساسية ثابتة ═══

🏫 الجامعة: Lebanese International University (LIU) — تأسست على يد د. عبد الرحيم مراد عبر جمعية العزم والسعادة.

🏛 الفروع (9):
- بيروت (الرئيسي) - المصيطبة: +961-1-706881
- صيدا: +961-7-723543
- طرابلس: +961-6-218970
- النبطية: +961-7-761920
- صور: +961-7-346060
- البقاع: +961-8-900037
- جبل لبنان: +961-5-807100
- حلبا - عكار
- رياق

🎓 الكليات (5):
1. الهندسة: مدني، كهرباء، ميكانيك، كمبيوتر، صناعي
2. الصيدلة: PharmD، علوم صيدلانية
3. إدارة الأعمال: محاسبة، إدارة، تسويق، ضيافة، بنوك، اقتصاد، MBA
4. الآداب والعلوم: CS، IT، بيولوجيا، كيمياء حيوية، رياضيات، تغذية، تصميم غرافيك، اتصال، علم نفس
5. التربية: تعليم ابتدائي، دبلوم تعليم، ماجستير تربية

💰 الأقساط: تُدفع كأقساط شهرية خلال كل فصل دراسي (وليس لكل ساعة معتمدة). تختلف حسب الكلية.

📊 نظام المعدل (4.0):
A=4.0 (93-100%) | A-=3.67 | B+=3.33 | B=3.0 | B-=2.67 | C+=2.33 | C=2.0 | C-=1.67 | D+=1.33 | D=1.0 | F=0.0 (<63%)
- الحد الأدنى للتخرج: 2.0 GPA
- لائحة الشرف: 3.5+ GPA

🌐 بوابة UMIS: syslb.liu.edu.lb — للتسجيل، حساب المعدل، الجدول، إضافة/حذف مواد، خط الهاتف الجامعي

📋 خطوات التسجيل:
1. تسجيل دخول UMIS
2. مراجعة التقويم الأكاديمي
3. مقابلة المرشد الأكاديمي
4. اختيار المواد
5. تأكيد التسجيل
6. دفع الأقساط الشهرية

🎯 المنح:
- منحة تفوق: 3.2+=25%، 3.5+=50%، 3.7+=75%، 3.85+=100%
- مساعدات اجتماعية (حسب الحاجة)
- خصم الأخوة
- مزايا الموظفين

📄 دورات ومواد دراسية (Past Exams):
- مجلد Google Drive يحتوي على دورات سابقة ونماذج امتحانات وملفات PDF لجميع التخصصات
- الرابط: https://drive.google.com/drive/folders/1wf6zAUz4AG6iMz4olqqUuxt24bMk6IIN?usp=sharing
- منظم حسب الكلية والمادة (هندسة، صيدلة، أعمال، آداب وعلوم، تحضيري)
- إذا سأل الطالب عن دورات أو امتحانات سابقة أو مواد دراسية أو PDF، وجّهه مباشرة إلى هذا الرابط`;

async function askAI(question, knowledgeContext, language) {
    // Build context from knowledge base
    let contextBlock = '';
    if (knowledgeContext && knowledgeContext.length > 0) {
        const contextItems = knowledgeContext.map(k => {
            const title = language === 'ar' ? (k.title_ar || k.title) : k.title;
            const content = language === 'ar' ? (k.content_ar || k.content) : k.content;
            return `📌 ${title}:\n${content}`;
        }).join('\n\n');
        contextBlock = `\n\n═══ KNOWLEDGE BASE CONTEXT (استخدم هذه المعلومات فقط) ═══\n${contextItems}`;
    }

    const langNote = language === 'ar'
        ? '\n\n⚠️ المستخدم يكتب بالعربي. أجب بالعربي الكامل.'
        : '\n\n⚠️ User writes in English. Respond entirely in English.';

    const userMessage = `${contextBlock}${langNote}\n\n❓ سؤال المستخدم: ${question}`;

    // ── Try Groq (llama-3.3-70b) ──
    try {
        console.log('🤖 Asking Groq (llama-3.3-70b)...');
        const completion = await groq.chat.completions.create({
            messages: [
                { role: 'system', content: SYSTEM_PROMPT },
                { role: 'user', content: userMessage }
            ],
            model: 'llama-3.3-70b-versatile',
            temperature: 0.3,   // Lower = more accurate, less creative
            max_tokens: 1024,
            top_p: 0.9,
        });

        const answer = completion.choices[0]?.message?.content;
        if (answer) {
            console.log('✅ Groq responded');
            return { success: true, answer, source: 'groq_ai', model: 'llama-3.3-70b' };
        }
    } catch (error) {
        console.error('⚠️ Groq 70b error:', error.message?.substring(0, 120));
    }

    // ── Fallback: llama-3.1-8b ──
    try {
        console.log('🤖 Trying Groq (llama-3.1-8b)...');
        const completion = await groq.chat.completions.create({
            messages: [
                { role: 'system', content: SYSTEM_PROMPT },
                { role: 'user', content: userMessage }
            ],
            model: 'llama-3.1-8b-instant',
            temperature: 0.3,
            max_tokens: 1024,
            top_p: 0.9,
        });

        const answer = completion.choices[0]?.message?.content;
        if (answer) {
            console.log('✅ Groq (8b) responded');
            return { success: true, answer, source: 'groq_ai', model: 'llama-3.1-8b' };
        }
    } catch (error) {
        console.error('⚠️ Groq 8b error:', error.message?.substring(0, 120));
    }

    console.log('❌ All AI models failed');
    return { success: false, answer: null, error: 'All models failed' };
}

module.exports = { askGemini: askAI };
