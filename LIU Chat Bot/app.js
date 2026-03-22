// ============================================
// LIU CHATBOT – MAIN APP (v2 - Smart AI)
// ============================================

class LIUBot {
    constructor() {
        this.lang = 'en';
        this.chatActive = false;
        this.isTyping = false;
        this.init();
    }

    init() {
        this.els = {
            sidebar: document.getElementById('sidebar'),
            overlay: document.getElementById('sidebarOverlay'),
            menuBtn: document.getElementById('mobileMenuBtn'),
            welcome: document.getElementById('welcomeScreen'),
            messages: document.getElementById('chatMessages'),
            input: document.getElementById('messageInput'),
            sendBtn: document.getElementById('sendBtn'),
            newChat: document.getElementById('newChatBtn'),
        };
        this.bindEvents();
    }

    bindEvents() {
        this.els.sendBtn.addEventListener('click', () => this.sendMessage());
        this.els.input.addEventListener('input', () => {
            const t = this.els.input;
            t.style.height = 'auto';
            t.style.height = Math.min(t.scrollHeight, 150) + 'px';
            this.els.sendBtn.disabled = !t.value.trim();
        });
        this.els.input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this.sendMessage(); }
        });
        this.els.newChat.addEventListener('click', () => this.newChat());
        this.els.menuBtn.addEventListener('click', () => this.toggleSidebar());
        this.els.overlay.addEventListener('click', () => this.toggleSidebar(false));

        document.querySelectorAll('.suggestion-card').forEach(c =>
            c.addEventListener('click', () => this.askQuestion(c.dataset.question))
        );
        document.querySelectorAll('.topic-btn').forEach(b =>
            b.addEventListener('click', () => {
                const topicQ = {
                    admission: 'What are the admission requirements and how do I apply?',
                    registration: 'How do I register for courses at LIU?',
                    campuses: 'Where are LIU campuses located?',
                    grading: 'How is GPA calculated? What is the grading scale?',
                    schools: 'What schools and majors does LIU offer?',
                    financial: 'What financial aid and scholarships are available?',
                    tuition: 'What are the tuition fees at LIU?',
                    contact: 'How can I contact LIU?',
                    courses: 'Where can I find past exams and course materials (dawrat)?'
                };
                document.querySelectorAll('.topic-btn').forEach(x => x.classList.remove('active'));
                b.classList.add('active');
                this.askQuestion(topicQ[b.dataset.topic]);
                this.toggleSidebar(false);
            })
        );
        document.getElementById('langEn').addEventListener('click', () => this.setLang('en'));
        document.getElementById('langAr').addEventListener('click', () => this.setLang('ar'));
    }

    toggleSidebar(open) {
        const isOpen = open !== undefined ? open : !this.els.sidebar.classList.contains('open');
        this.els.sidebar.classList.toggle('open', isOpen);
        this.els.overlay.classList.toggle('active', isOpen);
    }

    setLang(lang) {
        this.lang = lang;
        document.getElementById('langEn').classList.toggle('active', lang === 'en');
        document.getElementById('langAr').classList.toggle('active', lang === 'ar');
        document.body.classList.toggle('rtl', lang === 'ar');
        document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
        this.els.input.placeholder = lang === 'ar' ? 'اسأل عن الجامعة اللبنانية الدولية...' : 'Ask about LIU... | ...اسأل عن الجامعة';
    }

    newChat() {
        this.chatActive = false;
        this.els.messages.innerHTML = '';
        this.els.messages.classList.remove('active');
        this.els.welcome.classList.remove('hidden');
        this.els.input.value = '';
        this.els.sendBtn.disabled = true;
        this.toggleSidebar(false);
    }

    askQuestion(q) { this.els.input.value = q; this.sendMessage(); }

    startChat() {
        if (!this.chatActive) {
            this.chatActive = true;
            this.els.welcome.classList.add('hidden');
            this.els.messages.classList.add('active');
        }
    }

    addMessage(text, type, isHtml = false) {
        this.startChat();
        const msg = document.createElement('div');
        msg.className = `message ${type}`;
        const isAr = this.detectArabic(text) && type === 'bot';
        msg.innerHTML = `<div class="message-inner">
      <div class="message-avatar">${type === 'bot' ? 'LIU' : '👤'}</div>
      <div class="message-content">
        <div class="message-bubble${isAr ? ' rtl' : ''}">${isHtml ? text : this.esc(text)}</div>
      </div>
    </div>`;
        this.els.messages.appendChild(msg);
        this.scroll();
    }

    addTyping() {
        this.startChat();
        const div = document.createElement('div');
        div.className = 'message bot'; div.id = 'typingMsg';
        div.innerHTML = `<div class="message-inner"><div class="message-avatar">LIU</div><div class="message-content"><div class="message-bubble"><div class="typing-indicator"><div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div></div></div></div></div>`;
        this.els.messages.appendChild(div);
        this.scroll();
    }

    removeTyping() { document.getElementById('typingMsg')?.remove(); }
    scroll() { setTimeout(() => this.els.messages.scrollTop = this.els.messages.scrollHeight, 50); }
    esc(t) { const d = document.createElement('div'); d.textContent = t; return d.innerHTML; }
    detectArabic(t) { return /[\u0600-\u06FF]/.test(t); }

    async sendMessage() {
        const text = this.els.input.value.trim();
        if (!text || this.isTyping) return;
        this.els.input.value = ''; this.els.input.style.height = 'auto'; this.els.sendBtn.disabled = true;
        this.addMessage(text, 'user');
        this.isTyping = true;
        this.addTyping();

        let response;
        const ar = this.detectArabic(text);
        const lang = ar ? 'ar' : 'en';

        // Try API (Gemini) first
        if (window.askAPI && window.AUTH_TOKEN) {
            try {
                const apiRes = await window.askAPI(text, lang);
                if (apiRes && apiRes.answer) {
                    // Convert markdown-like response to HTML
                    let formatted = apiRes.answer
                        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                        .replace(/\*(.*?)\*/g, '<em>$1</em>')
                        .replace(/\n- /g, '<br>• ')
                        .replace(/\n\d+\.\s/g, (m) => '<br>' + m.trim() + ' ')
                        .replace(/\n/g, '<br>')
                        .replace(/(https?:\/\/[^\s<,)]+)/g, '<a href="$1" target="_blank" class="info-link">$1</a>');
                    response = formatted;
                }
            } catch (e) { console.log('API fallback to local:', e); }
        }

        // Fallback to local AI engine
        if (!response) {
            response = this.getResponse(text);
        }

        await new Promise(r => setTimeout(r, 800));
        this.removeTyping();
        this.addMessage(response, 'bot', true);
        this.isTyping = false;
    }

    // ─── PROFESSIONAL RESPONSE FORMATTER ───
    wrap(title, answer, explain, details, warning, conf, ar) {
        const lbl = ar
            ? { a: '✅ الإجابة', e: '📌 التوضيح', d: '📍 التفاصيل', w: '⚠️ تنبيه' }
            : { a: '✅ DIRECT ANSWER', e: '📌 EXPLANATION', d: '📍 DETAILS', w: '⚠️ NOTICE' };
        let h = `<h3>${title}</h3>`;
        h += `<div class="response-section direct-answer"><h4>${lbl.a}</h4><p>${answer}</p></div>`;
        if (explain) h += `<div class="response-section explanation"><h4>${lbl.e}</h4><p>${explain}</p></div>`;
        if (details) h += `<div class="response-section details"><h4>${lbl.d}</h4>${details}</div>`;
        if (warning) h += `<div class="response-section warning"><h4>${lbl.w}</h4><p>${warning}</p></div>`;
        const cls = conf >= 90 ? 'high' : conf >= 80 ? 'medium' : 'low';
        const clbl = ar ? 'دقة الإجابة' : 'Confidence';
        h += `<div class="confidence-badge ${cls}">🎯 ${clbl}: ${conf}%</div>`;
        if (conf < 80) h += `<p style="margin-top:6px;font-size:0.82rem;color:var(--text-muted)">${ar ? 'يرجى مراجعة قسم التسجيل للتأكد.' : 'Please verify with the Registration Office.'}</p>`;
        return h;
    }

    // ─── SMART RESPONSE SYSTEM ───
    getResponse(query) {
        const ar = this.detectArabic(query);
        const K = LIU_KNOWLEDGE;
        // Out-of-scope check
        if (AI_ENGINE.isOutOfScope(query)) return this.rOutOfScope(ar);
        const result = AI_ENGINE.findIntent(query);
        const handlers = {
            greeting: () => this.rGreeting(ar),
            thanks: () => this.rThanks(ar),
            help: () => this.rHelp(ar),
            about: () => this.rAbout(K, ar),
            admission: () => this.rAdmission(K, ar),
            registration: () => this.rRegistration(K, ar),
            gpa: () => this.rGrading(K, ar),
            campuses: () => this.rCampuses(K, ar),
            schools: () => this.rSchools(K, ar),
            engineering: () => this.rSchoolDetail(K, 0, ar),
            pharmacy: () => this.rSchoolDetail(K, 1, ar),
            business: () => this.rSchoolDetail(K, 2, ar),
            cs_it: () => this.rCS(K, ar),
            education: () => this.rSchoolDetail(K, 4, ar),
            arts_sciences: () => this.rArtsSciences(K, ar),
            tuition: () => this.rTuition(K, ar),
            financial: () => this.rFinancial(K, ar),
            transfer: () => this.rTransfer(K, ar),
            contact: () => this.rContact(K, ar),
            student_life: () => this.rStudentLife(K, ar),
            calendar: () => this.rCalendar(K, ar),
            career: () => this.rCareer(K, ar),
            add_drop: () => this.rAddDrop(K, ar),
            dean_honor: () => this.rDeanHonor(K, ar),
            graduation: () => this.rGraduation(K, ar),
            freshman: () => this.rFreshman(K, ar),
            login_portal: () => this.rPortal(K, ar),
            advisor: () => this.rAdvisor(ar),
            social_media: () => this.rSocial(K, ar),
            phone_plan: () => this.rPhonePlan(K, ar),
            umis_features: () => this.rUmisFeatures(K, ar),
            semester_timeline: () => this.rUmisFeatureDetail(K, 0, ar),
            gpa_calculator: () => this.rUmisFeatureDetail(K, 1, ar),
            schedule_view: () => this.rUmisFeatureDetail(K, 2, ar),
            course_offering: () => this.rUmisFeatureDetail(K, 3, ar),
            curriculum: () => this.rUmisFeatureDetail(K, 5, ar),
            electives: () => this.rUmisFeatureDetail(K, 6, ar),
            course_desc: () => this.rUmisFeatureDetail(K, 7, ar),
            prerequisites: () => this.rUmisFeatureDetail(K, 8, ar),
            reg_advising: () => this.rUmisFeatureDetail(K, 9, ar),
            course_exams: () => this.rCourseExams(K, ar),
        };
        if (result && handlers[result.id]) { this._conf = result.confidence; return handlers[result.id](); }
        this._conf = 60;
        return this.rSmartFallback(query, K, ar);
    }

    // ─── OUT OF SCOPE ───
    rOutOfScope(ar) {
        return ar
            ? `<div class="out-of-scope"><div class="oos-icon">🚫</div><h3>خارج نطاق الخدمة</h3><p>هذا البوت مخصص حصرياً للإجابة عن أسئلة <strong>الجامعة اللبنانية الدولية (LIU)</strong> فقط.</p><p>يمكنك سؤالي عن: القبول، التسجيل، المعدل، الرسوم، الفروع، التخصصات، المنح، والخدمات الطلابية.</p></div>`
            : `<div class="out-of-scope"><div class="oos-icon">🚫</div><h3>Out of Scope</h3><p>This bot is exclusively designed to answer questions about the <strong>Lebanese International University (LIU)</strong>.</p><p>You can ask me about: Admission, Registration, GPA, Tuition, Campuses, Majors, Scholarships, and Student Services.</p></div>`;
    }

    // ─── SMART FALLBACK ───
    rSmartFallback(query, K, ar) {
        const q = query.toLowerCase();
        for (const c of K.campuses) {
            if (q.includes(c.name.toLowerCase().split(' ')[0].toLowerCase()) || q.includes(c.location.toLowerCase().split(',')[0].toLowerCase())) {
                return this.wrap(ar ? '🏛️ ' + c.nameAr : '🏛️ ' + c.name, ar ? `فرع ${c.nameAr} يقع في ${c.location}` : `The ${c.name} is located at ${c.location}`, null, `<p>📞 ${c.phone}</p>${c.address ? `<p>📮 ${c.address}</p>` : ''}`, ar ? 'للتأكد من الدوام، تواصل مع الفرع مباشرة.' : 'Contact the campus directly for working hours.', 78, ar);
            }
        }
        for (const s of K.schools) {
            if (s.majors) {
                for (const m of s.majors) {
                    if (q.includes(m.name.toLowerCase()) || (m.nameAr && q.includes(m.nameAr))) {
                        return this.wrap(ar ? '📘 ' + m.nameAr : '📘 ' + m.name, ar ? `يتوفر تخصص ${m.nameAr} ضمن ${s.nameAr}` : `${m.name} is offered under ${s.name}`, `${m.degree}${m.credits ? ' — ' + m.credits + ' credits' : ''}`, null, ar ? 'تواصل مع الكلية للتأكد من تفاصيل القبول.' : 'Contact the school for specific admission details.', 75, ar);
                    }
                }
            }
        }
        return this.rDefault(ar);
    }

    // ═══════════════════════════════════════
    // RESPONSE GENERATORS (30+ handlers)
    // ═══════════════════════════════════════

    rGreeting(ar) {
        return ar
            ? `<h3>👋 أهلاً وسهلاً!</h3><p>أنا <strong>مساعد LIU الذكي</strong>، هنا لمساعدتك بكل ما يتعلق بالجامعة اللبنانية الدولية.</p><p>يمكنك أن تسألني عن:</p><ul><li>📋 شروط القبول وكيفية التقديم</li><li>📝 تسجيل المواد عبر نظام UMIS</li><li>📊 المعدل التراكمي وحسابه</li><li>🏛️ مواقع الحرم الجامعية (٩ فروع)</li><li>📚 الكليات والتخصصات المتاحة</li><li>💰 الرسوم والمنح والمساعدات المالية</li><li>📅 التقويم الأكاديمي والمواعيد</li><li>📞 معلومات التواصل</li></ul><p>اكتب سؤالك وأنا بساعدك! 💬</p>`
            : `<h3>👋 Hello! Welcome to LIU Bot</h3><p>I'm your <strong>AI-powered assistant</strong> for the Lebanese International University. I'm here to help you with any question!</p><p>You can ask me about:</p><ul><li>📋 Admission requirements & how to apply</li><li>📝 Course registration via UMIS</li><li>📊 GPA calculation & grading scale</li><li>🏛️ Campus locations (9 campuses across Lebanon)</li><li>📚 Schools, majors & degree programs</li><li>💰 Tuition fees, financial aid & scholarships</li><li>📅 Academic calendar & important dates</li><li>📞 Contact information</li></ul><p>Just type your question and I'll help! 💬</p>`;
    }

    rAbout(K, ar) {
        const a = K.about;
        const c = this._conf || 94;
        return this.wrap(ar ? '🏛️ عن الجامعة اللبنانية الدولية' : '🏛️ About LIU',
            ar ? a.descriptionAr : a.description,
            ar ? `🎯 <strong>الرسالة:</strong> ${a.missionAr}<br>👁️ <strong>الرؤية:</strong> ${a.visionAr}` : `🎯 <strong>Mission:</strong> ${a.mission}<br>👁️ <strong>Vision:</strong> ${a.vision}`,
            `<p><strong>${ar ? 'المؤسس' : 'Founded'}:</strong> ${a.founded}</p><p>🌐 <a href="${a.website}" target="_blank" class="info-link">${a.website}</a></p><ul>${a.values.map(v => `<li>✅ ${v}</li>`).join('')}</ul>`,
            null, c, ar);
    }

    rAdmission(K, ar) {
        const a = K.admission; const c = this._conf || 95;
        return this.wrap(ar ? '📋 القبول والتسجيل' : '📋 Admission Requirements',
            ar ? a.overviewAr : a.overview,
            ar ? `الوثائق المطلوبة:<ul>${a.requirementsAr.map(r => `<li>✔️ ${r}</li>`).join('')}</ul>` : `Required Documents:<ul>${a.requirements.map(r => `<li>✔️ ${r}</li>`).join('')}</ul>`,
            `${ar ? '<strong>خطوات التقديم:</strong>' : '<strong>How to Apply:</strong>'}<ul>${(ar ? a.applicationStepsAr : a.applicationSteps).map(s => `<li>${s}</li>`).join('')}</ul><p>📧 ${a.officeContact.email1} | 📞 ${a.officeContact.phone}</p>`,
            ar ? 'بعض الكليات لها شروط إضافية (الهندسة، الصيدلة). يفضل التأكد من مكتب القبول.' : 'Some schools have additional requirements (Engineering, Pharmacy). Please verify with the Admissions Office.', c, ar);
    }

    rRegistration(K, ar) {
        const r = K.registration; const c = this._conf || 94;
        return this.wrap(ar ? '📝 تسجيل المواد' : '📝 Course Registration',
            ar ? r.descriptionAr : r.description,
            ar ? `خطوات التسجيل:<ul>${r.stepsAr.map(s => `<li>${s}</li>`).join('')}</ul>` : `Steps:<ul>${r.steps.map(s => `<li>${s}</li>`).join('')}</ul>`,
            `<p>🔗 <a href="${r.portal}" target="_blank" class="info-link">${ar ? 'بوابة UMIS' : 'UMIS Portal'}</a></p><ul><li>🍂 ${ar ? 'الخريف' : 'Fall'}: ${r.importantDates.fallSemester}</li><li>🌸 ${ar ? 'الربيع' : 'Spring'}: ${r.importantDates.springSemester}</li><li>☀️ ${ar ? 'الصيف' : 'Summer'}: ${r.importantDates.summerSemester}</li></ul>`,
            ar ? 'تأكد من مقابلة المرشد الأكاديمي قبل التسجيل. فترات التسجيل قد تتغير.' : 'Meet your academic advisor before registration. Dates may change.', c, ar);
    }

    rGrading(K, ar) {
        const g = K.grading; const c = this._conf || 96;
        let table = `<table class="grade-table"><tr><th>Grade</th><th>Range</th><th>Points</th><th>Level</th></tr>`;
        g.scale.forEach(s => { table += `<tr><td><strong>${s.grade}</strong></td><td>${s.range}</td><td>${s.points}</td><td>${s.description}</td></tr>`; });
        table += '</table>';
        return this.wrap(ar ? '📊 نظام الدرجات والمعدل' : '📊 GPA & Grading System',
            ar ? g.systemAr : g.system,
            ar ? `كيفية حساب المعدل:<br>${g.gpaCalculationAr}` : `How to Calculate:<br>${g.gpaCalculation}`,
            `${table}<ul><li>🎓 <strong>${ar ? 'التخرج' : 'Graduation'}:</strong> ${g.requirements.graduation}</li><li>⭐ <strong>${ar ? 'قائمة العميد' : "Dean's List"}:</strong> ${ar ? g.requirements.deansListAr : g.requirements.deansList}</li><li>⚠️ <strong>${ar ? 'المراقبة' : 'Probation'}:</strong> ${ar ? g.requirements.academicProbationAr : g.requirements.academicProbation}</li></ul>`,
            ar ? 'المعدل التراكمي يُحسب تلقائياً عبر نظام UMIS.' : 'GPA is automatically calculated in the UMIS system.', c, ar);
    }

    rCampuses(K, ar) {
        const cards = K.campuses.map(c =>
            `<div class="campus-card"><div><span class="campus-name">${ar ? c.nameAr : c.name}</span><br><span class="campus-location">📍 ${c.location}</span></div><span class="campus-phone">📞 ${c.phone}</span></div>`
        ).join('');
        return ar
            ? `<h3>🏛️ الحرم الجامعية (${K.campuses.length} فروع في لبنان)</h3><p>تنتشر الجامعة اللبنانية الدولية في جميع المناطق اللبنانية لتكون قريبة من الطلاب:</p>${cards}<div class="highlight">📮 العنوان الرئيسي: ${K.contact.mainAddress}</div>`
            : `<h3>🏛️ LIU Campuses (${K.campuses.length} Locations Across Lebanon)</h3><p>LIU has campuses spread across all regions of Lebanon to be accessible to all students:</p>${cards}<div class="highlight">📮 Main Address: ${K.contact.mainAddress}</div>`;
    }

    rSchools(K, ar) {
        const sections = K.schools.map(s => {
            const majors = s.majors ? s.majors.map(m => `<span class="tag">${ar ? m.nameAr : m.name}</span>`).join(' ') : '';
            return `<div class="school-section"><h4>${ar ? s.nameAr : s.name}</h4><p>${s.description}</p>${majors ? '<p style="margin-top:8px">' + majors + '</p>' : ''}</div>`;
        }).join('');
        return ar
            ? `<h3>📚 الكليات والتخصصات</h3><p>تقدم الجامعة مجموعة واسعة من البرامج في ${K.schools.length} كليات:</p>${sections}`
            : `<h3>📚 Schools & Majors</h3><p>LIU offers a wide range of programs across ${K.schools.length} schools:</p>${sections}`;
    }

    rSchoolDetail(K, idx, ar) {
        const s = K.schools[idx];
        if (!s) return this.rSchools(K, ar);
        const majors = s.majors ? s.majors.map(m => `<li><strong>${ar ? m.nameAr : m.name}</strong> — ${m.degree}${m.credits ? ` (${m.credits} cr)` : ''}</li>`).join('') : '';
        const grad = s.graduatePrograms ? `<h4>🎓 ${ar ? 'برامج الماجستير' : 'Graduate Programs'}:</h4><ul>` + s.graduatePrograms.map(g => `<li>${g.name} (${g.degree})</li>`).join('') + '</ul>' : '';
        const feats = s.features ? `<h4>✨ ${ar ? 'مميزات' : 'Features'}:</h4><ul>` + s.features.map(f => `<li>${f}</li>`).join('') + '</ul>' : '';
        return `<h3>🎓 ${ar ? s.nameAr : s.name}</h3><p>${s.description}</p><h4>📘 ${ar ? 'التخصصات' : 'Majors'}:</h4><ul>${majors}</ul>${grad}${feats}`;
    }

    rCS(K, ar) {
        const sas = K.schools[3];
        return ar
            ? `<h3>💻 علوم الحاسوب وتكنولوجيا المعلومات</h3><p>تُقدّم ضمن <strong>${sas.nameAr}</strong>:</p><ul><li><strong>علوم الحاسوب (BS)</strong> — برمجة، خوارزميات، ذكاء اصطناعي، هياكل بيانات</li><li><strong>تكنولوجيا المعلومات (BS)</strong> — شبكات، أنظمة، أمن سيبراني</li></ul><h4>🏆 إنجازات الكلية:</h4><ul>${sas.achievements.map(a => `<li>🏅 ${a}</li>`).join('')}</ul><div class="highlight">📧 التواصل: ${sas.email}</div>`
            : `<h3>💻 Computer Science & IT</h3><p>Offered under the <strong>${sas.name}</strong>:</p><ul><li><strong>Computer Science (BS)</strong> — Programming, algorithms, AI, data structures, software engineering</li><li><strong>Information Technology (BS)</strong> — Networking, systems administration, cybersecurity</li></ul><h4>🏆 Achievements:</h4><ul>${sas.achievements.map(a => `<li>🏅 ${a}</li>`).join('')}</ul><div class="highlight">📧 Contact: ${sas.email}</div>`;
    }

    rArtsSciences(K, ar) {
        return this.rSchoolDetail(K, 3, ar);
    }

    rTuition(K, ar) {
        const t = K.tuition; const c = this._conf || 93;
        return this.wrap(ar ? '💳 الرسوم الدراسية' : '💳 Tuition & Fees',
            ar ? t.structureAr : t.structure,
            `<ul>${t.notes.map(n => `<li>• ${n}</li>`).join('')}</ul>`,
            `<strong>${ar ? 'رسوم إضافية' : 'Additional Fees'}:</strong><ul>${t.additionalFees.map(f => `<li>• ${f}</li>`).join('')}</ul><strong>${ar ? 'طرق الدفع' : 'Payment Methods'}:</strong><ul>${t.paymentMethods.map(m => `<li>✅ ${m}</li>`).join('')}</ul>`,
            ar ? 'الأسعار الدقيقة قد تختلف حسب الفرع والتخصص. يرجى التواصل مع المكتب المالي.' : 'Exact prices vary by campus and program. Contact the Financial Office at your campus.', c, ar);
    }

    rFinancial(K, ar) {
        const f = K.financialAid;
        const tiers = f.types[1].tiers.map(t => `<li><strong>GPA ${t.gpa}:</strong> ${t.discount}</li>`).join('');
        const types = f.types.map(t => `<div class="school-section"><h4>${ar ? t.nameAr : t.name}</h4><p>${t.description}</p>${t.tiers ? '<ul>' + tiers + '</ul>' : ''}</div>`).join('');
        return ar
            ? `<h3>💰 المساعدات المالية والمنح</h3><p>${f.overviewAr}</p>${types}<h4>📝 كيفية التقديم:</h4><ul>${f.howToApply.map(s => `<li>${s}</li>`).join('')}</ul>`
            : `<h3>💰 Financial Aid & Scholarships</h3><p>${f.overview}</p>${types}<h4>📝 How to Apply:</h4><ul>${f.howToApply.map(s => `<li>${s}</li>`).join('')}</ul>`;
    }

    rTransfer(K, ar) {
        const t = K.transfer;
        return ar
            ? `<h3>🔄 تحويل الطلاب</h3><p>${t.overviewAr}</p><h4>📎 المتطلبات:</h4><ul>${t.requirements.map(r => `<li>✔️ ${r}</li>`).join('')}</ul><h4>📝 خطوات التحويل:</h4><ul>${t.process.map(p => `<li>${p}</li>`).join('')}</ul>`
            : `<h3>🔄 Transfer Students</h3><p>${t.overview}</p><h4>📎 Requirements:</h4><ul>${t.requirements.map(r => `<li>✔️ ${r}</li>`).join('')}</ul><h4>📝 Transfer Process:</h4><ul>${t.process.map(p => `<li>${p}</li>`).join('')}</ul>`;
    }

    rContact(K, ar) {
        const c = K.contact;
        return ar
            ? `<h3>📞 معلومات التواصل</h3><ul><li>📧 <strong>البريد العام:</strong> <a href="mailto:${c.generalEmail}">${c.generalEmail}</a></li><li>📧 <strong>القبول:</strong> <a href="mailto:${c.admissionEmail1}">${c.admissionEmail1}</a></li><li>📧 <strong>شؤون الطلاب:</strong> <a href="mailto:${c.studentAffairsEmail}">${c.studentAffairsEmail}</a></li><li>📧 <strong>الآداب والعلوم:</strong> <a href="mailto:${c.artsAndSciencesEmail}">${c.artsAndSciencesEmail}</a></li><li>📞 <strong>الهاتف:</strong> ${c.mainPhone}</li><li>📍 <strong>العنوان:</strong> ${c.mainAddress}</li><li>🌐 <strong>الموقع:</strong> <a href="${c.website}" target="_blank">${c.website}</a></li></ul>`
            : `<h3>📞 Contact Information</h3><ul><li>📧 <strong>General:</strong> <a href="mailto:${c.generalEmail}">${c.generalEmail}</a></li><li>📧 <strong>Admissions:</strong> <a href="mailto:${c.admissionEmail1}">${c.admissionEmail1}</a> | <a href="mailto:${c.admissionEmail2}">${c.admissionEmail2}</a></li><li>📧 <strong>Student Affairs:</strong> <a href="mailto:${c.studentAffairsEmail}">${c.studentAffairsEmail}</a></li><li>📧 <strong>Arts & Sciences:</strong> <a href="mailto:${c.artsAndSciencesEmail}">${c.artsAndSciencesEmail}</a></li><li>📞 <strong>Phone:</strong> ${c.mainPhone}</li><li>📍 <strong>Address:</strong> ${c.mainAddress}</li><li>🌐 <strong>Website:</strong> <a href="${c.website}" target="_blank">${c.website}</a></li></ul>`;
    }

    rStudentLife(K, ar) {
        const s = K.studentAffairs;
        return ar
            ? `<h3>🎉 الحياة الطلابية</h3><p>${s.descriptionAr}</p><h4>🏅 النوادي والجمعيات:</h4><ul>${s.clubs.map(c => `<li>🎯 ${c}</li>`).join('')}</ul><h4>🛎️ الخدمات:</h4><ul>${s.services.map(sv => `<li>✅ ${sv}</li>`).join('')}</ul><div class="highlight">📧 ${s.email} | 📞 ${s.phone}</div>`
            : `<h3>🎉 Student Life & Clubs</h3><p>${s.description}</p><h4>🏅 Clubs & Societies:</h4><ul>${s.clubs.map(c => `<li>🎯 ${c}</li>`).join('')}</ul><h4>🛎️ Services:</h4><ul>${s.services.map(sv => `<li>✅ ${sv}</li>`).join('')}</ul><div class="highlight">📧 ${s.email} | 📞 ${s.phone}</div>`;
    }

    rCalendar(K, ar) {
        const c = K.academicCalendar;
        const sem = (s) => `<div class="school-section"><h4>${s.name}</h4><ul><li>📅 Registration: ${s.registration}</li><li>📖 Classes: ${s.classes}</li>${s.midterms ? `<li>📝 Midterms: ${s.midterms}</li>` : ''}<li>📋 Finals: ${s.finals}</li>${s.note ? `<li>⚠️ ${s.note}</li>` : ''}</ul></div>`;
        return (ar ? '<h3>📅 التقويم الأكاديمي</h3>' : '<h3>📅 Academic Calendar</h3>') + sem(c.fallSemester) + sem(c.springSemester) + sem(c.summerSemester);
    }

    rCareer(K, ar) {
        const c = K.careerServices;
        return ar
            ? `<h3>💼 الخدمات المهنية</h3><p>${c.description}</p><ul>${c.services.map(s => `<li>✅ ${s}</li>`).join('')}</ul><div class="highlight">📤 إرسال السيرة الذاتية: <a href="${c.cvSubmission}" target="_blank" class="info-link">${c.cvSubmission}</a></div>`
            : `<h3>💼 Career Services</h3><p>${c.description}</p><ul>${c.services.map(s => `<li>✅ ${s}</li>`).join('')}</ul><div class="highlight">📤 Submit Your CV: <a href="${c.cvSubmission}" target="_blank" class="info-link">${c.cvSubmission}</a></div>`;
    }

    rAddDrop(K, ar) {
        return ar
            ? `<h3>📝 إضافة وحذف المواد</h3><p>${K.registration.addDropAr}</p><div class="highlight">⏰ فترة الإضافة/الحذف تكون خلال <strong>الأسبوع الأول</strong> من بداية الفصل. بعدها يتم تسجيل "W" في السجل.</div><p>🔗 <a href="${K.registration.portal}" target="_blank" class="info-link">الدخول إلى UMIS</a></p>`
            : `<h3>📝 Add/Drop Courses</h3><p>${K.registration.addDrop}</p><div class="highlight">⏰ The Add/Drop period is during the <strong>first week of classes</strong>. After this, dropping shows as "W" on transcript.</div><p>🔗 <a href="${K.registration.portal}" target="_blank" class="info-link">Go to UMIS Portal</a></p>`;
    }

    rDeanHonor(K, ar) {
        const g = K.grading.requirements;
        return ar
            ? `<h3>⭐ الوضع الأكاديمي</h3><ul><li>🏅 <strong>قائمة عميد الشرف:</strong> ${g.deansListAr}</li><li>⚠️ <strong>المراقبة الأكاديمية:</strong> ${g.academicProbationAr}</li><li>🎓 <strong>متطلبات التخرج:</strong> ${g.graduation}</li><li>🏆 <strong>التخرج بامتياز:</strong> ${g.honorsGraduation}</li></ul>`
            : `<h3>⭐ Academic Standing</h3><ul><li>🏅 <strong>Dean's Honor List:</strong> ${g.deansList}</li><li>⚠️ <strong>Academic Probation:</strong> ${g.academicProbation}</li><li>🎓 <strong>Graduation:</strong> ${g.graduation}</li><li>🏆 <strong>Honors:</strong> ${g.honorsGraduation}</li></ul>`;
    }

    rGraduation(K, ar) {
        const g = K.grading.requirements;
        return ar
            ? `<h3>🎓 متطلبات التخرج</h3><ul><li>📊 <strong>الحد الأدنى للمعدل:</strong> ${g.graduation}</li><li>🏆 <strong>التخرج بامتياز:</strong> ${g.honorsGraduation}</li><li>📘 <strong>الساعات المعتمدة:</strong> تختلف حسب التخصص (مثال: الهندسة ≈ ١٧٤ ساعة، الصيدلة ≈ ١٩٨ ساعة، إدارة الأعمال ≈ ١٠٠ ساعة)</li></ul><div class="highlight">تأكد من إتمام جميع المتطلبات الإجبارية والاختيارية لتخصصك قبل التقدم للتخرج.</div>`
            : `<h3>🎓 Graduation Requirements</h3><ul><li>📊 <strong>Minimum GPA:</strong> ${g.graduation}</li><li>🏆 <strong>Honors:</strong> ${g.honorsGraduation}</li><li>📘 <strong>Credits Required:</strong> Varies by program (e.g., Engineering ≈ 174, Pharmacy ≈ 198, Business ≈ 100 credits)</li></ul><div class="highlight">Make sure you complete all mandatory and elective requirements for your major before applying for graduation.</div>`;
    }

    rFreshman(K, ar) {
        const f = K.schools[5];
        return ar
            ? `<h3>📖 السنة التحضيرية (Freshman)</h3><p>${f.description}</p><h4>المواد:</h4><ul>${f.courses.map(c => `<li>📘 ${c}</li>`).join('')}</ul><div class="highlight">جميع الطلاب الجدد يبدأون ببرنامج السنة التحضيرية لتأسيس مهاراتهم الأكاديمية.</div>`
            : `<h3>📖 Freshman Degree Unit</h3><p>${f.description}</p><h4>Foundation Courses:</h4><ul>${f.courses.map(c => `<li>📘 ${c}</li>`).join('')}</ul><div class="highlight">All new students begin with the Freshman program to build essential academic skills.</div>`;
    }

    rPortal(K, ar) {
        return ar
            ? `<h3>🔐 بوابة UMIS</h3><p>نظام إدارة الجامعة (UMIS) هو البوابة الإلكترونية للطلاب حيث يمكنك:</p><ul><li>📝 تسجيل المواد واختيار الشعب</li><li>📊 عرض الدرجات والمعدل التراكمي</li><li>📅 الاطلاع على الجدول الدراسي</li><li>📋 طلب كشف العلامات</li><li>💰 عرض الرسوم المالية</li></ul><div class="highlight">🔗 <a href="${K.registration.portal}" target="_blank" class="info-link">تسجيل الدخول إلى UMIS</a></div><p>⚠️ إذا نسيت كلمة المرور، تواصل مع مكتب القبول والتسجيل.</p>`
            : `<h3>🔐 UMIS Student Portal</h3><p>The University Management Information System (UMIS) is your online portal where you can:</p><ul><li>📝 Register for courses & select sections</li><li>📊 View grades & cumulative GPA</li><li>📅 Check your class schedule</li><li>📋 Request transcripts</li><li>💰 View financial balance</li></ul><div class="highlight">🔗 <a href="${K.registration.portal}" target="_blank" class="info-link">Login to UMIS</a></div><p>⚠️ If you forgot your password, contact the Admission & Registration Office.</p>`;
    }

    rAdvisor(ar) {
        return ar
            ? `<h3>🧑‍🏫 المرشد الأكاديمي</h3><p>لكل طالب في LIU مرشد أكاديمي مسؤول عن:</p><ul><li>📋 مساعدتك في اختيار المواد المناسبة</li><li>📊 متابعة تقدمك الأكاديمي</li><li>🎯 تقديم نصائح حول خطتك الدراسية</li><li>⚠️ تنبيهك إذا كان معدلك منخفضاً</li><li>📝 المصادقة على تسجيل المواد</li></ul><div class="highlight">قبل كل فصل دراسي، يجب عليك مقابلة مرشدك الأكاديمي للموافقة على المواد.</div><p>يمكنك معرفة اسم مرشدك من خلال نظام UMIS أو مكتب الكلية.</p>`
            : `<h3>🧑‍🏫 Academic Advisor</h3><p>Every LIU student is assigned an academic advisor who:</p><ul><li>📋 Helps you choose the right courses</li><li>📊 Monitors your academic progress</li><li>🎯 Provides guidance on your study plan</li><li>⚠️ Alerts you if your GPA drops</li><li>📝 Approves your course registration</li></ul><div class="highlight">Before each semester, you must meet with your academic advisor to approve your courses.</div><p>Find your advisor through the UMIS portal or your school's office.</p>`;
    }

    rSocial(K, ar) {
        const s = K.contact.socialMedia;
        return ar
            ? `<h3>📱 وسائل التواصل الاجتماعي</h3><p>تابع أخبار الجامعة على:</p><ul><li>📘 <a href="${s.facebook}" target="_blank">Facebook</a></li><li>📸 <a href="${s.instagram}" target="_blank">Instagram</a></li><li>🐦 <a href="${s.twitter}" target="_blank">Twitter</a></li><li>💼 <a href="${s.linkedin}" target="_blank">LinkedIn</a></li></ul>`
            : `<h3>📱 Social Media</h3><p>Follow LIU on social media:</p><ul><li>📘 <a href="${s.facebook}" target="_blank">Facebook</a></li><li>📸 <a href="${s.instagram}" target="_blank">Instagram</a></li><li>🐦 <a href="${s.twitter}" target="_blank">Twitter</a></li><li>💼 <a href="${s.linkedin}" target="_blank">LinkedIn</a></li></ul>`;
    }

    rUmisFeatures(K, ar) {
        const u = K.umisPortal;
        const feats = u.features.map(f => `<div class="campus-card"><div><span class="campus-name">${f.icon} ${ar ? f.nameAr : f.name}</span><br><span class="campus-location">${ar ? f.descriptionAr.substring(0, 80) : f.description.substring(0, 80)}...</span></div></div>`).join('');
        return ar
            ? `<h3>🖥️ خدمات بوابة UMIS الطلابية</h3><p>${u.overviewAr}</p>${feats}<div class="highlight">🔗 <a href="${K.registration.portal}" target="_blank" class="info-link">الدخول إلى UMIS</a></div>`
            : `<h3>🖥️ UMIS Student Portal Features</h3><p>${u.overview}</p>${feats}<div class="highlight">🔗 <a href="${K.registration.portal}" target="_blank" class="info-link">Login to UMIS</a></div>`;
    }

    rUmisFeatureDetail(K, idx, ar) {
        const f = K.umisPortal.features[idx];
        if (!f) return this.rUmisFeatures(K, ar);
        return ar
            ? `<h3>${f.icon} ${f.nameAr}</h3><p>${f.descriptionAr}</p><h4>📌 كيفية الاستخدام:</h4><p>${f.howToUseAr}</p><div class="highlight">🔗 <a href="${K.registration.portal}" target="_blank" class="info-link">الدخول إلى UMIS</a></div>`
            : `<h3>${f.icon} ${f.name}</h3><p>${f.description}</p><h4>📌 How to Use:</h4><p>${f.howToUse}</p><div class="highlight">🔗 <a href="${K.registration.portal}" target="_blank" class="info-link">Login to UMIS</a></div>`;
    }

    rPhonePlan(K, ar) {
        const p = K.studentPhonePlan; const c = this._conf || 94;
        return this.wrap(ar ? '📱 خط الجامعة (ALFA / TOUCH)' : '📱 Student Phone Plan (ALFA / TOUCH)',
            ar ? p.descriptionAr : p.description,
            `${ar ? '<strong>كيفية التسجيل:</strong>' : '<strong>How to Register:</strong>'}<ul>${(ar ? p.howToRegisterAr : p.howToRegister).map(s => `<li>${s}</li>`).join('')}</ul>${ar ? '<strong>الشروط:</strong>' : '<strong>Requirements:</strong>'}<ul>${(ar ? p.requirementsAr : p.requirements).map(r => `<li>✔️ ${r}</li>`).join('')}</ul>`,
            `${ar ? '<strong>المميزات:</strong>' : '<strong>Benefits:</strong>'}<ul>${(ar ? p.benefitsAr : p.benefits).map(b => `<li>⭐ ${b}</li>`).join('')}</ul><p>🔗 <a href="${K.registration.portal}" target="_blank" class="info-link">${ar ? 'بوابة UMIS' : 'UMIS Portal'}</a></p>`,
            ar ? 'ستتلقى رسالة SMS خلال أول أسبوعين من الشهر. الخطة مرتبطة بوضعك كطالب.' : 'You will receive an SMS within the first 2 weeks. Plan is linked to enrollment status.', c, ar);
    }

    rThanks(ar) {
        return ar
            ? `<p>العفو! 😊 إذا عندك أي سؤال تاني، أنا هون لمساعدتك دائماً. حظاً موفقاً في دراستك! 🎓</p>`
            : `<p>You're welcome! 😊 If you have any other questions, don't hesitate to ask. Good luck with your studies! 🎓</p>`;
    }

    rCourseExams(K, ar) {
        const ce = K.courseExams;
        const cats = ce.categories.map(c =>
            `<div class="course-cat-card"><span class="course-cat-icon">${c.icon}</span><div class="course-cat-info"><strong>${ar ? c.nameAr : c.name}</strong><span class="course-cat-subjects">${c.subjects.slice(0, 4).join(', ')}${c.subjects.length > 4 ? '...' : ''}</span></div></div>`
        ).join('');
        return ar
            ? `<h3>📄 دورات ومواد دراسية – LIU</h3><p>${ce.descriptionAr}</p><div class="course-categories">${cats}</div><h4>📌 كيفية الاستخدام:</h4><ul>${ce.howToUseAr.split('\n').map(s => '<li>' + s + '</li>').join('')}</ul><div class="drive-btn-wrapper"><a href="${ce.driveLink}" target="_blank" class="drive-btn">📁 فتح مجلد Google Drive</a></div><div class="course-note"><span>⚠️</span> ${ce.noteAr}</div>`
            : `<h3>📄 Course Materials & Past Exams – LIU</h3><p>${ce.description}</p><div class="course-categories">${cats}</div><h4>📌 How to Use:</h4><ul>${ce.howToUse.split('\n').map(s => '<li>' + s + '</li>').join('')}</ul><div class="drive-btn-wrapper"><a href="${ce.driveLink}" target="_blank" class="drive-btn">📁 Open Google Drive Folder</a></div><div class="course-note"><span>⚠️</span> ${ce.note}</div>`;
    }

    rHelp(ar) {
        return this.rGreeting(ar);
    }

    rDefault(ar) {
        return ar
            ? `<h3>🤔 عذراً، لم أجد إجابة محددة</h3><p>يمكنك تجربة أحد هذه المواضيع:</p><ul><li>📋 <strong>"كيف أقدم طلب قبول؟"</strong></li><li>📝 <strong>"كيف أسجل المواد؟"</strong></li><li>📊 <strong>"كيف أحسب المعدل التراكمي؟"</strong></li><li>🏛️ <strong>"أين تقع الفروع؟"</strong></li><li>📚 <strong>"ما هي التخصصات المتاحة؟"</strong></li><li>💰 <strong>"ما هي المنح المتاحة؟"</strong></li><li>📞 <strong>"كيف أتواصل مع الجامعة؟"</strong></li></ul><p>أو يمكنك اختيار موضوع من القائمة الجانبية 👈</p><div class="highlight">💡 حاول كتابة سؤالك بكلمات مفتاحية واضحة مثل: قبول، تسجيل، معدل، رسوم، منح، فروع</div>`
            : `<h3>🤔 I couldn't find a specific answer</h3><p>Try one of these questions:</p><ul><li>📋 <strong>"How do I apply to LIU?"</strong></li><li>📝 <strong>"How do I register for courses?"</strong></li><li>📊 <strong>"How is GPA calculated?"</strong></li><li>🏛️ <strong>"Where are the campuses?"</strong></li><li>📚 <strong>"What majors are available?"</strong></li><li>💰 <strong>"What scholarships are available?"</strong></li><li>📞 <strong>"How do I contact LIU?"</strong></li></ul><p>Or pick a topic from the sidebar 👈</p><div class="highlight">💡 Try using clear keywords like: admission, registration, GPA, tuition, scholarship, campus</div>`;
    }
}

const bot = new LIUBot();
