// ============================================
// LIU CHATBOT – SMART AI ENGINE v3
// Professional Intent Classification + Confidence
// ============================================

const AI_ENGINE = {
    // Score how well a query matches keywords
    score(query, keywords) {
        const q = query.toLowerCase();
        let s = 0, matched = 0;
        for (const k of keywords) {
            if (q.includes(k)) { s += k.length > 3 ? 3 : 2; matched++; }
        }
        return { score: s, matched, total: keywords.length };
    },

    // All intents with extensive keyword coverage
    intents: [
        { id: 'greeting', keys: ['hello', 'hi', 'hey', 'hii', 'helo', 'good morning', 'good evening', 'good afternoon', 'sup', 'yo', 'whats up', 'what\'s up', 'howdy', 'مرحب', 'أهلا', 'هلا', 'سلام', 'صباح', 'مساء', 'شو', 'هاي', 'كيفك', 'كيف حالك', 'مرحبا', 'اهلا', 'السلام عليكم', 'عليكم السلام'], confidence: 95 },
        { id: 'thanks', keys: ['thank', 'thanks', 'thx', 'ty', 'appreciate', 'grateful', 'شكر', 'ممنون', 'يسلمو', 'يعطيك', 'مشكور'], confidence: 95 },
        { id: 'help', keys: ['help', 'assist', 'what can you', 'how to use', 'guide', 'مساعد', 'ساعدني', 'شو بتقدر', 'كيف استخدم'], confidence: 90 },
        { id: 'about', keys: ['about liu', 'about the university', 'history', 'founded', 'who founded', 'establish', 'mission', 'vision', 'عن الجامع', 'تاريخ', 'تأسس', 'رسال', 'رؤي', 'مؤسس', 'من أسس'], confidence: 92 },
        { id: 'admission', keys: ['apply', 'admission', 'accept', 'enter', 'join', 'enroll', 'entrance', 'how to join', 'how to apply', 'application', 'requirement', 'document', 'needed', 'submit', 'baccalaureate', 'bacc', 'sat', 'eee', 'entrance exam', 'secondary', 'high school', 'قبول', 'تقديم', 'طلب', 'انتسا', 'التحا', 'دخول', 'كيف ادخل', 'كيف انتسب', 'كيف اتقدم', 'وثائق', 'شروط', 'مطلوب', 'بكالوريا', 'امتحان'], confidence: 95 },
        { id: 'registration', keys: ['register', 'registration', 'course', 'umis', 'select course', 'sign up', 'enroll course', 'schedule', 'class', 'section', 'مواد', 'تسجيل', 'سجل', 'كورس', 'جدول', 'حصص', 'شعب', 'ماد'], confidence: 94 },
        { id: 'gpa', keys: ['gpa', 'gba', 'grade', 'grading', 'scale', 'point', 'cgpa', 'cumulative', 'calculate gpa', 'how calculate', '4.0', 'معدل', 'درجا', 'علاما', 'نتائج', 'تقدير', 'حساب المعدل', 'كيف احسب', 'معدلي', 'نقاط'], confidence: 96 },
        { id: 'campuses', keys: ['campus', 'location', 'branch', 'where', 'address', 'beirut campus', 'bekaa', 'saida', 'tripoli', 'nabatieh', 'tyre', 'rayak', 'halba', 'akkar', 'mount lebanon', 'فرع', 'حرم', 'موقع', 'أين', 'وين', 'بيروت', 'بقاع', 'صيدا', 'طرابلس', 'نبطية', 'صور', 'رياق', 'حلبا', 'عكار', 'جبل لبنان'], confidence: 95 },
        { id: 'schools', keys: ['school', 'faculty', 'major', 'program', 'department', 'degree', 'bachelor', 'master', 'what major', 'available major', 'offer', 'كلي', 'تخصص', 'قسم', 'برنامج', 'بكالوريوس', 'ماجستير', 'ماستر', 'شو التخصصات', 'متاح'], confidence: 93 },
        { id: 'engineering', keys: ['engineering', 'engineer', 'computer engineering', 'electrical', 'mechanical', 'civil', 'biomedical', 'industrial', 'هندس', 'كهربا', 'ميكانيك', 'مدني', 'طبي', 'صناعي'], confidence: 94 },
        { id: 'pharmacy', keys: ['pharmacy', 'pharmd', 'pharmacist', 'drug', 'pharmaceutical', 'صيدل', 'دواء', 'صيدلاني', 'فارم'], confidence: 96 },
        { id: 'business', keys: ['business', 'accounting', 'finance', 'marketing', 'management', 'hospitality', 'mba', 'banking', 'economics', 'economy', 'أعمال', 'تجار', 'محاسب', 'مالي', 'تسويق', 'إدار', 'ضياف', 'بنوك', 'اقتصاد'], confidence: 93 },
        { id: 'cs_it', keys: ['computer science', 'information technology', 'cs major', 'it major', 'programming', 'software', 'coding', 'cyber', 'network', 'data', 'ai', 'artificial', 'حاسوب', 'كمبيوتر', 'برمج', 'تكنولوجيا', 'معلومات', 'شبكات', 'ذكاء اصطناعي', 'سايبر', 'بيانات'], confidence: 94 },
        { id: 'education', keys: ['education school', 'teaching', 'teacher', 'pedagog', 'elementary', 'diploma', 'تربي', 'تعليم', 'معلم', 'مدرس', 'دبلوم'], confidence: 92 },
        { id: 'arts_sciences', keys: ['arts', 'science', 'biology', 'chemistry', 'math', 'nutrition', 'graphic', 'design', 'communication', 'psychology', 'english', 'literature', 'radio', 'television', 'علوم', 'أحياء', 'كيمياء', 'رياضيات', 'تغذي', 'جرافيك', 'تصميم', 'نفس', 'انكليز', 'إذاع', 'تلفزيون'], confidence: 91 },
        { id: 'tuition', keys: ['tuition', 'fee', 'cost', 'price', 'pay', 'payment', 'credit cost', 'how much', 'expensive', 'cheap', 'affordable', 'installment', 'رسوم', 'أقساط', 'سعر', 'تكلف', 'دفع', 'كلف', 'كم', 'أسعار', 'غالي', 'رخيص', 'قسط', 'تقسيط'], confidence: 93 },
        { id: 'financial', keys: ['financial', 'scholarship', 'aid', 'discount', 'social aid', 'honor', 'merit', 'free', 'waiver', 'sibling', 'منح', 'مساعد', 'خصم', 'مالي', 'مجان', 'إعفاء', 'أخوة', 'تفوق'], confidence: 94 },
        { id: 'transfer', keys: ['transfer', 'credit transfer', 'equivalence', 'equivalent', 'previous university', 'change university', 'move', 'تحويل', 'انتقال', 'نقل', 'معادلة', 'جامعة سابقة'], confidence: 95 },
        { id: 'contact', keys: ['contact', 'phone', 'email', 'call', 'reach', 'number', 'telephone', 'fax', 'اتصال', 'تواصل', 'هاتف', 'بريد', 'عنوان', 'رقم', 'تلفون', 'ايميل'], confidence: 96 },
        { id: 'student_life', keys: ['club', 'society', 'sport', 'activity', 'student affairs', 'event', 'volunteer', 'counseling', 'orientation', 'نادي', 'نواد', 'رياض', 'نشاط', 'شؤون', 'فعالي', 'تطوع', 'إرشاد', 'توجيه'], confidence: 92 },
        { id: 'calendar', keys: ['calendar', 'semester', 'date', 'when start', 'when end', 'midterm', 'final', 'exam', 'summer', 'fall', 'spring', 'holiday', 'vacation', 'break', 'تقويم', 'فصل', 'موعد', 'متى', 'امتحان', 'نصفي', 'نهائي', 'صيفي', 'خريف', 'ربيع', 'عطل'], confidence: 93 },
        { id: 'career', keys: ['career', 'job', 'employ', 'cv', 'resume', 'internship', 'work', 'vacancy', 'hire', 'recruit', 'وظيف', 'عمل', 'مهن', 'سيرة', 'تدريب', 'فرص', 'توظيف'], confidence: 92 },
        { id: 'add_drop', keys: ['add', 'drop', 'withdraw', 'withdrawal', 'remove course', 'cancel course', 'حذف', 'إضاف', 'سحب', 'انسحاب', 'الغاء', 'حذف ماد'], confidence: 94 },
        { id: 'dean_honor', keys: ['dean', 'honor', 'honour', 'probation', 'distinction', 'standing', 'academic standing', 'وضع أكاديمي', 'عميد', 'شرف', 'مراقب', 'امتياز'], confidence: 93 },
        { id: 'graduation', keys: ['graduat', 'diploma', 'commencement', 'finish', 'complete degree', 'how many credit', 'total credit', 'تخرج', 'شهادة', 'إتمام', 'كم ساعة', 'رصيد'], confidence: 94 },
        { id: 'freshman', keys: ['freshman', 'first year', 'foundation', 'preparatory', 'new student', 'سنة أولى', 'تحضيري', 'تمهيدي', 'طالب جديد'], confidence: 93 },
        { id: 'login_portal', keys: ['login', 'log in', 'portal', 'umis login', 'password', 'account', 'student portal', 'sign in', 'تسجيل دخول', 'بوابة', 'حساب', 'كلمة سر', 'كلمة مرور'], confidence: 95 },
        { id: 'advisor', keys: ['advisor', 'adviser', 'advising', 'academic advisor', 'مرشد', 'مستشار', 'إرشاد', 'أكاديمي'], confidence: 92 },
        { id: 'social_media', keys: ['social media', 'facebook', 'instagram', 'twitter', 'linkedin', 'follow', 'تواصل اجتماعي', 'فيسبوك', 'انستغرام', 'تويتر'], confidence: 91 },
        { id: 'phone_plan', keys: ['phone plan', 'student plan', 'phone line', 'mobile plan', 'alfa', 'touch', 'student line', 'خط', 'خط الجامع', 'خط طالب', 'ألفا', 'تاتش', 'خط جوال', 'موبايل', 'هاتف طالب', 'خط جامعي', 'تسجيل خط'], confidence: 94 },
        { id: 'umis_features', keys: ['umis feature', 'portal feature', 'student portal feature', 'ميزات', 'خدمات البوابة', 'خدمات umis'], confidence: 90 },
        { id: 'semester_timeline', keys: ['semester timeline', 'timeline', 'semester date', 'semester period', 'جدول زمني', 'مواعيد الفصل', 'فترات الفصل'], confidence: 93 },
        { id: 'gpa_calculator', keys: ['gpa calculator', 'gpa simulator', 'calculate gpa', 'simulate', 'حاسبة المعدل', 'محاكي', 'حساب المعدل', 'كيف احسب معدلي'], confidence: 95 },
        { id: 'schedule_view', keys: ['schedule', 'my schedule', 'class schedule', 'timetable', 'download schedule', 'جدولي', 'جدول الحصص', 'جدول المحاضرات', 'تحميل الجدول'], confidence: 92 },
        { id: 'course_offering', keys: ['course offering', 'available course', 'offered course', 'what courses', 'المواد المتاحة', 'المواد المطروحة', 'شو المواد'], confidence: 93 },
        { id: 'curriculum', keys: ['curriculum', 'graphical curriculum', 'course tree', 'degree map', 'roadmap', 'gc', 'منهج', 'خارطة', 'شجرة المواد', 'خطة دراسية'], confidence: 92 },
        { id: 'electives', keys: ['elective', 'free elective', 'major elective', 'general elective', 'اختياري', 'مواد اختيار', 'مواد حرة'], confidence: 93 },
        { id: 'course_desc', keys: ['course description', 'course detail', 'what is course', 'course about', 'وصف الماد', 'تفاصيل الماد', 'شو هالماد', 'عن الماد'], confidence: 91 },
        { id: 'prerequisites', keys: ['prerequisite', 'prereq', 'pre-requisite', 'corequisite', 'co-requisite', 'before course', 'متطلب', 'متطلبات مسبق', 'قبل الماد', 'شروط الماد'], confidence: 94 },
        { id: 'reg_advising', keys: ['advising record', 'registration advising', 'advising session', 'سجل إرشاد', 'إرشاد تسجيل', 'جلسة إرشاد'], confidence: 92 },
        { id: 'course_exams', keys: ['dawrat', 'past exam', 'old exam', 'previous exam', 'exam paper', 'past paper', 'midterm paper', 'final paper', 'course material', 'study material', 'pdf', 'exam pdf', 'download exam', 'نموذج امتحان', 'دورات', 'دورة', 'دورات سابقة', 'امتحان سابق', 'امتحانات سابقة', 'اوراق امتحان', 'أوراق امتحان', 'نماذج', 'نماذج امتحانات', 'ملفات', 'مواد دراسية', 'تحميل دورات', 'بدي دورات', 'وين الدورات', 'وين بلاقي دورات', 'اريد دورات', 'عندك دورات'], confidence: 96 },
    ],

    // Check if query is out of scope (not related to LIU)
    isOutOfScope(query) {
        const q = query.toLowerCase();
        const offTopicKeys = ['weather', 'cook', 'recipe', 'movie', 'song', 'game', 'football', 'messi', 'ronaldo', 'politics', 'war', 'bitcoin', 'crypto', 'stock', 'forex', 'love', 'girlfriend', 'boyfriend', 'married', 'diet', 'workout', 'gym', 'hack', 'crack', 'pirate', 'طبخ', 'طقس', 'فيلم', 'أغنية', 'لعبة', 'كرة', 'سياس', 'حرب', 'بتكوين', 'حب', 'صديقة', 'تمارين'];
        let offScore = 0;
        for (const k of offTopicKeys) { if (q.includes(k)) offScore += 3; }
        const liuKeys = ['liu', 'university', 'جامع', 'univ', 'student', 'طالب', 'course', 'مادة', 'campus', 'فرع', 'register', 'تسجيل', 'gpa', 'معدل', 'admission', 'قبول', 'tuition', 'رسوم', 'scholarship', 'منح'];
        let onScore = 0;
        for (const k of liuKeys) { if (q.includes(k)) onScore += 4; }
        return offScore > 3 && onScore === 0;
    },

    // Find best intent with confidence
    findIntent(query) {
        let best = null, bestScore = 0, bestConf = 0;
        for (const intent of this.intents) {
            const r = this.score(query, intent.keys);
            if (r.score > bestScore) {
                bestScore = r.score;
                best = intent.id;
                bestConf = Math.min(intent.confidence, 70 + Math.min(r.matched * 10, 28));
            }
        }
        return bestScore >= 2 ? { id: best, confidence: bestConf } : null;
    }
};
