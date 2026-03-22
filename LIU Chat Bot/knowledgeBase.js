// ============================================
// LIU CHATBOT - COMPREHENSIVE KNOWLEDGE BASE
// Lebanese International University
// ============================================

const LIU_KNOWLEDGE = {

  // ──────────────────────────────────────────
  // ABOUT LIU
  // ──────────────────────────────────────────
  about: {
    name: "Lebanese International University (LIU)",
    nameAr: "الجامعة اللبنانية الدولية",
    founded: "Founded by Dr. Abdul Rahim Mourad",
    website: "https://liu.edu.lb",
    portalLogin: "https://syslb.liu.edu.lb/login/",
    description: "The Lebanese International University (LIU) is one of the largest private universities in Lebanon, committed to providing high-quality yet affordable higher education to students from all social and economic backgrounds. LIU offers a wide range of undergraduate and graduate programs across multiple schools and campuses throughout Lebanon.",
    descriptionAr: "الجامعة اللبنانية الدولية (LIU) هي واحدة من أكبر الجامعات الخاصة في لبنان، ملتزمة بتقديم تعليم عالي الجودة وبأسعار معقولة للطلاب من جميع الخلفيات الاجتماعية والاقتصادية.",
    mission: "To provide high-quality yet affordable higher education to students from all social and economic backgrounds, fostering academic excellence, innovation, and community engagement.",
    missionAr: "تقديم تعليم عالٍ بجودة عالية وبأسعار معقولة للطلاب من جميع الخلفيات الاجتماعية والاقتصادية.",
    vision: "To be a leading institution in the region, fostering innovation, research, and community service while maintaining academic excellence and accessibility.",
    visionAr: "أن تكون مؤسسة رائدة في المنطقة، تعزز الابتكار والبحث وخدمة المجتمع.",
    values: [
      "Academic Excellence",
      "Accessibility & Affordability",
      "Innovation & Research",
      "Community Engagement",
      "Diversity & Inclusion",
      "Integrity & Ethics"
    ]
  },

  // ──────────────────────────────────────────
  // CAMPUSES
  // ──────────────────────────────────────────
  campuses: [
    {
      name: "Beirut Campus (Main)",
      nameAr: "حرم بيروت (الرئيسي)",
      location: "Mouseitbeh, Beirut",
      address: "P.O. Box: 146404 - Beirut, Lebanon",
      phone: "(+961) 1-706881/2/3/4",
      description: "The main campus located in the heart of Beirut, housing the central administration and all major schools."
    },
    {
      name: "Bekaa Campus (Al-Khyara)",
      nameAr: "حرم البقاع (الخيارة)",
      location: "Al-Khyara, Bekaa Valley",
      phone: "(+961) 8-660380/1/2",
      description: "One of the largest campuses, located in the Bekaa Valley with extensive facilities."
    },
    {
      name: "Saida Campus",
      nameAr: "حرم صيدا",
      location: "Saida (Sidon), South Lebanon",
      phone: "(+961) 7-720980/1/2",
      description: "Serving students in the Saida region and surrounding areas."
    },
    {
      name: "Tripoli Campus",
      nameAr: "حرم طرابلس",
      location: "Tripoli, North Lebanon",
      phone: "(+961) 6-427957/8",
      description: "Located in the northern city of Tripoli, providing education to students from the north."
    },
    {
      name: "Nabatieh Campus",
      nameAr: "حرم النبطية",
      location: "Nabatieh, South Lebanon",
      phone: "(+961) 7-761920/1",
      description: "Serving the Nabatieh region in southern Lebanon."
    },
    {
      name: "Tyre Campus (Sour)",
      nameAr: "حرم صور",
      location: "Tyre (Sour), South Lebanon",
      phone: "(+961) 7-346060/1",
      description: "Located in the historic city of Tyre, serving students from the deep south."
    },
    {
      name: "Rayak Campus",
      nameAr: "حرم رياق",
      location: "Rayak, Bekaa",
      phone: "(+961) 8-900890",
      description: "Located in Rayak in the Bekaa region."
    },
    {
      name: "Halba-Akkar Campus",
      nameAr: "حرم حلبا - عكار",
      location: "Halba, Akkar, North Lebanon",
      phone: "(+961) 6-690686",
      description: "Serving the Akkar region in the far north of Lebanon."
    },
    {
      name: "Mount Lebanon Campus",
      nameAr: "حرم جبل لبنان",
      location: "Mount Lebanon",
      phone: "(+961) 5-807100",
      description: "Covering the Mount Lebanon area for students in the region."
    }
  ],

  // ──────────────────────────────────────────
  // ACADEMIC SCHOOLS
  // ──────────────────────────────────────────
  schools: [
    {
      name: "School of Engineering",
      nameAr: "كلية الهندسة",
      description: "Offers comprehensive engineering programs with hands-on labs and modern facilities.",
      majors: [
        { name: "Computer Engineering", nameAr: "هندسة الحاسوب", degree: "BE", credits: 174 },
        { name: "Electrical Engineering", nameAr: "هندسة كهربائية", degree: "BE", credits: 174 },
        { name: "Mechanical Engineering", nameAr: "هندسة ميكانيكية", degree: "BE", credits: 174 },
        { name: "Civil Engineering", nameAr: "هندسة مدنية", degree: "BE", credits: 174 },
        { name: "Biomedical Engineering", nameAr: "هندسة طبية حيوية", degree: "BE", credits: 174 },
        { name: "Industrial Engineering", nameAr: "هندسة صناعية", degree: "BE", credits: 174 }
      ],
      graduatePrograms: [
        { name: "Master in Computer Engineering", degree: "ME" },
        { name: "Master in Electrical Engineering", degree: "ME" }
      ]
    },
    {
      name: "School of Pharmacy",
      nameAr: "كلية الصيدلة",
      description: "Accredited pharmacy program preparing students for careers in pharmaceutical sciences, clinical pharmacy, and drug research.",
      majors: [
        { name: "Doctor of Pharmacy (Pharm.D.)", nameAr: "دكتور صيدلة", degree: "Pharm.D.", credits: 198 }
      ],
      features: [
        "Fully equipped pharmaceutical labs",
        "Clinical training in partner hospitals",
        "Research opportunities in drug development"
      ]
    },
    {
      name: "School of Business",
      nameAr: "كلية إدارة الأعمال",
      description: "Prepares students for the dynamic business world with practical and theoretical knowledge.",
      majors: [
        { name: "Accounting & Finance", nameAr: "محاسبة ومالية", degree: "BBA", credits: 100 },
        { name: "Management", nameAr: "إدارة أعمال", degree: "BBA", credits: 100 },
        { name: "Marketing", nameAr: "تسويق", degree: "BBA", credits: 100 },
        { name: "Hospitality Management", nameAr: "إدارة ضيافة", degree: "BBA", credits: 100 },
        { name: "Banking & Finance", nameAr: "مصارف ومالية", degree: "BBA", credits: 100 },
        { name: "Economics", nameAr: "اقتصاد", degree: "BA", credits: 100 }
      ],
      graduatePrograms: [
        { name: "Master of Business Administration (MBA)", degree: "MBA" },
        { name: "Master in Accounting & Finance", degree: "MA" }
      ]
    },
    {
      name: "School of Arts & Sciences",
      nameAr: "كلية الآداب والعلوم",
      email: "sas@liu.edu.lb",
      description: "The largest school at LIU, offering a diverse range of programs in sciences, humanities, and creative arts. Math program ranked 1st in Lebanon.",
      majors: [
        { name: "Computer Science", nameAr: "علوم الحاسوب", degree: "BS", credits: 100 },
        { name: "Information Technology", nameAr: "تكنولوجيا المعلومات", degree: "BS", credits: 100 },
        { name: "Biology", nameAr: "علم الأحياء", degree: "BS", credits: 100 },
        { name: "Biochemistry", nameAr: "كيمياء حيوية", degree: "BS", credits: 100 },
        { name: "Mathematics", nameAr: "رياضيات", degree: "BS", credits: 100 },
        { name: "Nutrition & Dietetics", nameAr: "تغذية وحمية", degree: "BS", credits: 100 },
        { name: "Graphic Design", nameAr: "تصميم جرافيك", degree: "BA", credits: 100 },
        { name: "Communication Arts", nameAr: "فنون التواصل", degree: "BA", credits: 100 },
        { name: "Radio & Television", nameAr: "إذاعة وتلفزيون", degree: "BA", credits: 100 },
        { name: "English Language & Literature", nameAr: "اللغة الانكليزية وآدابها", degree: "BA", credits: 100 },
        { name: "Psychology", nameAr: "علم النفس", degree: "BA", credits: 100 }
      ],
      achievements: [
        "Math program: 1st rank in Lebanon",
        "Outstanding results in the nutrition colloquium",
        "Huawei ICT competition winners",
        "Radio & TV Short Film Award winners"
      ]
    },
    {
      name: "School of Education",
      nameAr: "كلية التربية",
      description: "Prepares future educators with modern teaching methodologies and practical experience.",
      majors: [
        { name: "Elementary Education", nameAr: "تعليم ابتدائي", degree: "BA", credits: 100 },
        { name: "Teaching Diploma (TD)", nameAr: "دبلوم تعليم", degree: "TD", credits: 36 }
      ],
      graduatePrograms: [
        { name: "Master in Education", degree: "MA" }
      ]
    },
    {
      name: "Freshman Degree Unit",
      nameAr: "وحدة السنة التحضيرية",
      description: "The Freshman Degree Unit provides foundation courses for all new students, ensuring they have the necessary skills in English, Arabic, mathematics, and sciences before entering their major programs.",
      courses: [
        "English Composition",
        "Arabic Language",
        "Mathematics",
        "Natural Sciences",
        "Computer Skills",
        "University Life Skills"
      ]
    }
  ],

  // ──────────────────────────────────────────
  // ADMISSION
  // ──────────────────────────────────────────
  admission: {
    overview: "Admission to LIU is open to all students who meet the academic requirements. The university welcomes students from Lebanon and internationally.",
    overviewAr: "القبول في الجامعة اللبنانية الدولية مفتوح لجميع الطلاب الذين يستوفون المتطلبات الأكاديمية.",
    requirements: [
      "Completed Application Form (available online or at the admission office)",
      "Official Secondary School Certificate (Baccalaureate II / Brevet / equivalent)",
      "Official transcripts of all secondary school years",
      "Copy of National ID Card or Passport",
      "SAT scores (if available) or passing the LIU English Entrance Exam (EEE)",
      "Two recent passport-sized photos",
      "Application fee payment"
    ],
    requirementsAr: [
      "استمارة طلب مكتملة",
      "شهادة الثانوية الرسمية (البكالوريا اللبنانية أو ما يعادلها)",
      "كشوف درجات رسمية لجميع سنوات الثانوية",
      "صورة عن بطاقة الهوية أو جواز السفر",
      "نتائج SAT أو اجتياز امتحان الدخول في اللغة الإنجليزية",
      "صورتان شمسيتان حديثتان",
      "دفع رسوم الطلب"
    ],
    applicationSteps: [
      "1️⃣ Visit the Admission Office at your nearest campus or apply online",
      "2️⃣ Fill out the application form with your personal and academic information",
      "3️⃣ Submit all required documents (transcripts, ID, photos)",
      "4️⃣ Take the English Entrance Exam (EEE) if you don't have SAT scores",
      "5️⃣ Pay the application fee",
      "6️⃣ Wait for the admission decision (usually within 1-2 weeks)",
      "7️⃣ Once accepted, complete registration through the UMIS portal",
      "8️⃣ Pay tuition fees and finalize your enrollment"
    ],
    applicationStepsAr: [
      "١- زيارة مكتب القبول في أقرب حرم جامعي أو تقديم طلب عبر الإنترنت",
      "٢- ملء استمارة الطلب بمعلوماتك الشخصية والأكاديمية",
      "٣- تقديم جميع الوثائق المطلوبة",
      "٤- إجراء امتحان الدخول في اللغة الإنجليزية إذا لم تكن لديك نتائج SAT",
      "٥- دفع رسوم الطلب",
      "٦- انتظار قرار القبول (عادة خلال ١-٢ أسبوع)",
      "٧- بعد القبول، إكمال التسجيل عبر بوابة UMIS",
      "٨- دفع الرسوم الدراسية وإتمام القيد"
    ],
    entranceExam: "The English Entrance Exam (EEE) is required for students without SAT scores. It tests English language proficiency including reading, writing, and grammar.",
    specialRequirements: {
      engineering: "Students applying to the School of Engineering must have a scientific Baccalaureate (Bacc II Sciences) or equivalent with strong math and science grades.",
      pharmacy: "Students applying to Pharmacy must have a scientific Baccalaureate with excellent grades in Chemistry, Biology, and Mathematics. PharmD admission is competitive.",
      business: "Open to all Baccalaureate holders. No specific subject requirements.",
      education: "Open to all Baccalaureate holders."
    },
    officeContact: {
      email1: "noura.boukarroum@liu.edu.lb",
      email2: "nabil.Kouatly@liu.edu.lb",
      phone: "(+961) 1-706881/2/3/4",
      location: "Block B, 1st Floor, Beirut Campus"
    }
  },

  // ──────────────────────────────────────────
  // REGISTRATION & UMIS
  // ──────────────────────────────────────────
  registration: {
    system: "UMIS (University Management Information System)",
    portal: "https://syslb.liu.edu.lb/login/",
    description: "Students register for courses through the UMIS online portal. The system allows students to view available courses, check schedules, register for classes, view grades, and manage their academic records.",
    descriptionAr: "يسجل الطلاب المواد من خلال بوابة UMIS الإلكترونية. يتيح النظام للطلاب عرض المواد المتاحة والجداول والتسجيل وعرض الدرجات.",
    steps: [
      "1️⃣ Log in to UMIS portal (syslb.liu.edu.lb/login)",
      "2️⃣ Check the academic calendar for registration dates",
      "3️⃣ Meet with your academic advisor to plan your courses",
      "4️⃣ Select your courses based on your degree plan and advisor's recommendations",
      "5️⃣ Check for time conflicts in your schedule",
      "6️⃣ Confirm your course registration",
      "7️⃣ Pay tuition fees (monthly installments within the semester)",
      "8️⃣ Download your class schedule"
    ],
    stepsAr: [
      "١- تسجيل الدخول إلى بوابة UMIS",
      "٢- التحقق من التقويم الأكاديمي لمواعيد التسجيل",
      "٣- مقابلة المرشد الأكاديمي لتخطيط المواد",
      "٤- اختيار المواد بناءً على خطتك الدراسية",
      "٥- التحقق من عدم وجود تعارض في الجدول",
      "٦- تأكيد تسجيل المواد",
      "٧- دفع الرسوم الدراسية (أقساط شهرية ضمن الفصل الدراسي)",
      "٨- تحميل جدول الحصص"
    ],
    addDrop: "Students can add or drop courses during the first week of classes (Add/Drop Period). After this period, dropping a course will result in a 'W' (Withdrawal) on the transcript.",
    addDropAr: "يمكن للطلاب إضافة أو حذف المواد خلال الأسبوع الأول من الدراسة. بعد هذه الفترة، حذف مادة سيظهر كـ 'W' في السجل الأكاديمي.",
    importantDates: {
      fallSemester: "Usually starts in October",
      springSemester: "Usually starts in February",
      summerSemester: "Usually starts in July"
    }
  },

  // ──────────────────────────────────────────
  // UMIS PORTAL FEATURES
  // ──────────────────────────────────────────
  umisPortal: {
    overview: "The UMIS (University Management Information System) student portal provides 10 key features for managing your academic life at LIU. Accessible at syslb.liu.edu.lb/login.",
    overviewAr: "توفر بوابة UMIS عشر خدمات رئيسية لإدارة حياتك الأكاديمية في الجامعة اللبنانية الدولية.",
    features: [
      {
        name: "Semester Timeline",
        nameAr: "الجدول الزمني للفصل",
        icon: "📅",
        description: "View the complete semester timeline including add/drop periods, registration windows, midterm weeks, final exam schedules, and important academic deadlines. This helps you know exactly when you can register, when to add or drop courses, and when exams are scheduled.",
        descriptionAr: "عرض الجدول الزمني الكامل للفصل الدراسي بما في ذلك فترات الإضافة والحذف، ونوافذ التسجيل، وأسابيع الامتحانات النصفية والنهائية، والمواعيد الأكاديمية المهمة.",
        howToUse: "Log in to UMIS → Select your semester → Click 'Semester Timeline' → View all dates and deadlines",
        howToUseAr: "سجّل الدخول إلى UMIS ← اختر الفصل الدراسي ← اضغط على 'Semester Timeline' ← عرض جميع التواريخ والمواعيد"
      },
      {
        name: "GPA Calculator",
        nameAr: "حاسبة المعدل التراكمي",
        icon: "🧮",
        description: "Use the GPA simulator to calculate how any grade letter for any course will affect your overall cumulative GPA. You can input hypothetical grades to see how they would impact your GPA before finalizing your courses. This is very useful for planning your semester and understanding what grades you need to achieve your target GPA.",
        descriptionAr: "استخدم محاكي المعدل التراكمي لحساب كيف ستؤثر أي درجة في أي مادة على معدلك التراكمي الإجمالي. يمكنك إدخال درجات افتراضية لمعرفة تأثيرها قبل تثبيت المواد.",
        howToUse: "Log in to UMIS → Click 'GPA Calculator' → Enter your expected grades for each course → View the simulated GPA result",
        howToUseAr: "سجّل الدخول إلى UMIS ← اضغط على 'GPA Calculator' ← أدخل العلامات المتوقعة لكل مادة ← شاهد النتيجة"
      },
      {
        name: "Schedule",
        nameAr: "الجدول الدراسي",
        icon: "🗓️",
        description: "View and download your complete course schedule as a PDF file. The schedule shows your registered courses, class times, days, room numbers, and instructor names for the current semester.",
        descriptionAr: "عرض وتحميل جدولك الدراسي الكامل كملف PDF. يعرض الجدول المواد المسجلة وأوقات الحصص والأيام وأرقام القاعات وأسماء المدرسين.",
        howToUse: "Log in to UMIS → Click 'Schedule' → Select semester → Download or print your schedule PDF",
        howToUseAr: "سجّل الدخول إلى UMIS ← اضغط على 'Schedule' ← اختر الفصل ← حمّل أو اطبع الجدول"
      },
      {
        name: "Course Offering",
        nameAr: "عرض المواد المتاحة",
        icon: "📖",
        description: "Browse all courses available for the current semester. You can filter by campus location, instructor, schedule, and section. This allows you to see which courses are offered, who teaches them, at what times, and at which campus before registering.",
        descriptionAr: "تصفّح جميع المواد المتاحة للفصل الحالي. يمكنك التصفية حسب الموقع، المدرّس، الجدول، والشعبة. يتيح لك معرفة المواد المطروحة ومن يدرّسها وأوقاتها وفي أي حرم جامعي.",
        howToUse: "Log in to UMIS → Click 'Course Offering' → Filter by campus/instructor/time → Browse available sections",
        howToUseAr: "سجّل الدخول إلى UMIS ← اضغط على 'Course Offering' ← فلتر حسب الموقع/المدرّس/الوقت ← تصفّح الشُعب المتاحة"
      },
      {
        name: "Registration",
        nameAr: "التسجيل",
        icon: "📝",
        description: "Register for your courses according to the course offering available for the semester. Select your desired courses and sections, check for time conflicts, and confirm your registration. This is the main tool for enrolling in classes each semester.",
        descriptionAr: "سجّل موادك الدراسية حسب المواد المطروحة للفصل. اختر المواد والشُعب المطلوبة، تحقق من عدم وجود تعارض في الأوقات، وأكّد تسجيلك.",
        howToUse: "Log in to UMIS → Click 'Registration' → Select courses → Choose sections → Check for conflicts → Confirm registration",
        howToUseAr: "سجّل الدخول إلى UMIS ← اضغط على 'Registration' ← اختر المواد ← اختر الشُعب ← تحقق من التعارض ← أكّد التسجيل"
      },
      {
        name: "Graphical Curriculum (GC)",
        nameAr: "المنهج الدراسي المرئي",
        icon: "🗺️",
        description: "Navigate your degree course tree visually. The Graphical Curriculum shows all required courses for your major in a visual flowchart, showing which courses you've completed, which are in progress, and which remain. It also shows prerequisite chains so you can plan your semesters ahead.",
        descriptionAr: "تصفّح شجرة مواد تخصصك بشكل مرئي. يعرض المنهج المرئي جميع المواد المطلوبة لتخصصك على شكل مخطط انسيابي، يوضح المواد المكتملة والجارية والمتبقية، بالإضافة إلى سلاسل المتطلبات المسبقة.",
        howToUse: "Log in to UMIS → Click 'Graphical Curriculum (GC)' → View your degree roadmap → Click on any course for details",
        howToUseAr: "سجّل الدخول إلى UMIS ← اضغط على 'Graphical Curriculum' ← شاهد خارطة طريق تخصصك ← اضغط على أي مادة للتفاصيل"
      },
      {
        name: "List of Electives",
        nameAr: "قائمة المواد الاختيارية",
        icon: "📋",
        description: "View both major electives and general electives available for your specific major. This helps you choose the right elective courses that count toward your degree requirements.",
        descriptionAr: "عرض المواد الاختيارية الخاصة بتخصصك والمواد الاختيارية العامة. يساعدك على اختيار المواد الاختيارية الصحيحة التي تُحسب ضمن متطلبات شهادتك.",
        howToUse: "Log in to UMIS → Click 'List of Electives' → Select your major → View available elective courses",
        howToUseAr: "سجّل الدخول إلى UMIS ← اضغط على 'List of Electives' ← اختر تخصصك ← عرض المواد الاختيارية المتاحة"
      },
      {
        name: "Course Descriptions",
        nameAr: "وصف المواد",
        icon: "📄",
        description: "View detailed descriptions for each course in your major. Each description includes the course objectives, topics covered, credit hours, and learning outcomes. This helps you understand what each course is about before registering.",
        descriptionAr: "عرض وصف تفصيلي لكل مادة في تخصصك. يتضمن أهداف المادة، المواضيع المغطاة، الساعات المعتمدة، ومخرجات التعلم.",
        howToUse: "Log in to UMIS → Click 'Course Descriptions' → Select your major → Browse course details",
        howToUseAr: "سجّل الدخول إلى UMIS ← اضغط على 'Course Descriptions' ← اختر تخصصك ← تصفّح تفاصيل المواد"
      },
      {
        name: "List of Prerequisites",
        nameAr: "قائمة المتطلبات المسبقة",
        icon: "🔗",
        description: "View each course's prerequisite and co-requisite requirements through a visual aid. This shows which courses you must complete before taking a specific course, and which courses must be taken concurrently (co-requisites).",
        descriptionAr: "عرض المتطلبات المسبقة والمتطلبات المتوازية لكل مادة بشكل مرئي. يوضح أي المواد يجب إتمامها قبل أخذ مادة معينة، وأي المواد يجب أخذها بالتوازي.",
        howToUse: "Log in to UMIS → Click 'List of Prereq' → View prerequisite chains for your courses",
        howToUseAr: "سجّل الدخول إلى UMIS ← اضغط على 'List of Prereq' ← عرض سلاسل المتطلبات المسبقة لموادك"
      },
      {
        name: "Registration Advising",
        nameAr: "الإرشاد التسجيلي",
        icon: "🧑‍🏫",
        description: "View your advising records for registration. This shows your academic advisor's recommendations, approved course selections, and any notes from your advising sessions. You must meet with your advisor before each registration period.",
        descriptionAr: "عرض سجلات الإرشاد التسجيلي الخاصة بك. يعرض توصيات مرشدك الأكاديمي، المواد المعتمدة، وأي ملاحظات من جلسات الإرشاد. يجب مقابلة مرشدك قبل كل فترة تسجيل.",
        howToUse: "Log in to UMIS → Click 'Registration Advising' → View your advisor's notes and approved courses",
        howToUseAr: "سجّل الدخول إلى UMIS ← اضغط على 'Registration Advising' ← عرض ملاحظات المرشد والمواد المعتمدة"
      }
    ]
  },

  // ──────────────────────────────────────────
  // GPA & GRADING SYSTEM
  // ──────────────────────────────────────────
  grading: {
    system: "LIU uses the 4.0 GPA (Grade Point Average) scale, also known as GBA (Grade-Based Average).",
    systemAr: "تستخدم الجامعة مقياس GPA من 4.0 (المعدل التراكمي).",
    scale: [
      { grade: "A", range: "90-100", points: 4.0, description: "Excellent" },
      { grade: "A-", range: "85-89", points: 3.7, description: "Excellent" },
      { grade: "B+", range: "80-84", points: 3.3, description: "Very Good" },
      { grade: "B", range: "75-79", points: 3.0, description: "Good" },
      { grade: "B-", range: "70-74", points: 2.7, description: "Good" },
      { grade: "C+", range: "65-69", points: 2.3, description: "Satisfactory" },
      { grade: "C", range: "60-64", points: 2.0, description: "Satisfactory" },
      { grade: "C-", range: "55-59", points: 1.7, description: "Below Average" },
      { grade: "D+", range: "50-54", points: 1.3, description: "Poor" },
      { grade: "D", range: "45-49", points: 1.0, description: "Poor" },
      { grade: "F", range: "Below 45", points: 0.0, description: "Fail" }
    ],
    gpaCalculation: "GPA = Sum of (Grade Points × Credit Hours) / Total Credit Hours. For example, if you get an A (4.0) in a 3-credit course and a B (3.0) in a 3-credit course, your GPA = (4.0×3 + 3.0×3) / 6 = 3.5",
    gpaCalculationAr: "المعدل التراكمي = مجموع (نقاط الدرجة × الساعات المعتمدة) / إجمالي الساعات المعتمدة",
    requirements: {
      graduation: "Minimum cumulative GPA of 2.0 required for graduation",
      deansList: "GPA of 3.5 or higher qualifies for the Dean's Honor List",
      deansListAr: "معدل تراكمي 3.5 أو أعلى يؤهلك لقائمة عميد الشرف",
      academicProbation: "Students with GPA below 2.0 are placed on Academic Probation",
      academicProbationAr: "الطلاب الذين يحصلون على معدل تراكمي أقل من 2.0 يوضعون تحت المراقبة الأكاديمية",
      honorsGraduation: "Students graduating with GPA 3.5+ receive 'Honors' distinction"
    }
  },

  // ──────────────────────────────────────────
  // TUITION & FEES
  // ──────────────────────────────────────────
  tuition: {
    structure: "Tuition fees at LIU are paid in monthly installments throughout each semester. The total cost varies by faculty/school, and is divided into equal monthly payments within the semester period.",
    structureAr: "يتم دفع الرسوم الدراسية في الجامعة على شكل أقساط شهرية خلال كل فصل دراسي. تختلف التكلفة الإجمالية حسب الكلية، ويتم تقسيمها إلى دفعات شهرية متساوية ضمن فترة الفصل.",
    notes: [
      "Tuition is paid monthly during the semester (not per credit hour)",
      "Engineering and Pharmacy programs typically have higher semester fees",
      "Business, Education, and Arts & Sciences have standard rates",
      "Fees are subject to change each academic year",
      "Monthly payment deadlines are announced at the start of each semester",
      "Additional lab fees may apply for science and engineering courses"
    ],
    additionalFees: [
      "Application fee (one-time upon admission)",
      "Registration fee (per semester)",
      "Lab fees (for applicable courses)",
      "Graduation fee",
      "Transcript request fee",
      "Late registration penalty"
    ],
    paymentMethods: [
      "Cash payment at the financial office",
      "Bank transfer",
      "Check payment",
      "Installment plans (available upon request)"
    ]
  },

  // ──────────────────────────────────────────
  // FINANCIAL AID & SCHOLARSHIPS
  // ──────────────────────────────────────────
  financialAid: {
    overview: "LIU is committed to making education affordable. The university offers various financial aid programs and scholarships to eligible students.",
    overviewAr: "تلتزم الجامعة بجعل التعليم ميسّر التكلفة. تقدم الجامعة برامج مساعدات مالية ومنح دراسية متنوعة.",
    types: [
      {
        name: "Social Aid",
        nameAr: "المساعدة الاجتماعية",
        description: "Need-based financial assistance for students from low-income families. The discount percentage depends on the family's financial situation.",
        requirements: "Financial need documentation, family income proof, application form"
      },
      {
        name: "Honor Scholarships",
        nameAr: "منح التفوق",
        description: "Merit-based scholarships for students with high GPAs. Discounts range from 25% to 100% on tuition fees.",
        tiers: [
          { gpa: "3.70 - 4.00", discount: "Up to 100% tuition waiver" },
          { gpa: "3.50 - 3.69", discount: "Up to 75% discount" },
          { gpa: "3.20 - 3.49", discount: "Up to 50% discount" },
          { gpa: "3.00 - 3.19", discount: "Up to 25% discount" }
        ]
      },
      {
        name: "Sibling Discount",
        nameAr: "خصم الأشقاء",
        description: "Families with multiple children enrolled at LIU may be eligible for a sibling discount."
      },
      {
        name: "Employee/Staff Discount",
        nameAr: "خصم الموظفين",
        description: "LIU employees and their dependents receive special tuition discounts."
      }
    ],
    howToApply: [
      "1️⃣ Visit the Student Affairs Office on your campus",
      "2️⃣ Fill out the Financial Aid Application Form",
      "3️⃣ Submit required documentation (income proof, family documents)",
      "4️⃣ Applications are reviewed by the Financial Aid Committee",
      "5️⃣ Decisions are communicated to students within 2-4 weeks"
    ]
  },

  // ──────────────────────────────────────────
  // TRANSFER STUDENTS
  // ──────────────────────────────────────────
  transfer: {
    overview: "LIU welcomes transfer students from recognized universities. Credits earned at previous institutions can be transferred if they meet LIU's criteria.",
    overviewAr: "ترحب الجامعة بالطلاب المنتقلين من جامعات معترف بها. يمكن تحويل الساعات المعتمدة من المؤسسات السابقة.",
    requirements: [
      "Official transcripts from the previous university",
      "Course descriptions/syllabi for credit evaluation",
      "Minimum grade of 'C' (2.0) in each course to be transferred",
      "Courses must align with LIU's curriculum",
      "Maximum transfer credits vary by program (typically up to 50% of total credits)",
      "Student must be in good academic standing at previous institution"
    ],
    process: [
      "1️⃣ Apply for admission to LIU as a transfer student",
      "2️⃣ Submit official transcripts and course descriptions from your previous university",
      "3️⃣ The academic department evaluates your courses for equivalency",
      "4️⃣ An equivalency report is prepared showing which credits transfer",
      "5️⃣ You are placed at the appropriate level in your LIU program",
      "6️⃣ Register for remaining courses to complete your degree"
    ]
  },

  // ──────────────────────────────────────────
  // STUDENT AFFAIRS
  // ──────────────────────────────────────────
  studentAffairs: {
    description: "The Student Affairs Office (SAO) is responsible for the overall functioning of Student Affairs Units in all campuses, providing leadership with respect to financial aids, social security, student activities, community services, athletics, student engagement, counseling services, and educational services.",
    descriptionAr: "مكتب شؤون الطلاب مسؤول عن الأداء العام لوحدات شؤون الطلاب في جميع الحرم الجامعية.",
    email: "student-affairs@liu.edu.lb",
    phone: "(+961) 1-706881/2/3/4",
    services: [
      "Financial Aid & Social Aid processing",
      "Student counseling and advising",
      "Student clubs and societies management",
      "Sports teams and athletics",
      "Cultural and social activities",
      "Community service programs",
      "Career guidance",
      "Complaint and grievance handling",
      "Student orientation for new students"
    ],
    clubs: [
      "Computer Science Club",
      "Engineering Club",
      "Business Club",
      "Photography Club",
      "Drama & Theater Club",
      "Music Club",
      "Environmental Club",
      "Volunteer & Community Service Club",
      "Debate Club",
      "Sports Clubs (Football, Basketball, Volleyball, etc.)"
    ]
  },

  // ──────────────────────────────────────────
  // CAREER SERVICES
  // ──────────────────────────────────────────
  careerServices: {
    description: "LIU provides career services to help students and alumni find employment opportunities, prepare for the job market, and develop professional skills.",
    services: [
      "Job placement assistance",
      "CV/Resume building workshops",
      "Interview preparation and coaching",
      "Internship opportunities",
      "Career fairs and recruitment events",
      "Professional development seminars",
      "Alumni networking events"
    ],
    cvSubmission: "https://applb.liu.edu.lb/cv/",
    vacanciesPage: "Available on the LIU website under Employment > Vacancies"
  },

  // ──────────────────────────────────────────
  // CONTACT INFORMATION
  // ──────────────────────────────────────────
  contact: {
    generalEmail: "info@liu.edu.lb",
    admissionEmail1: "noura.boukarroum@liu.edu.lb",
    admissionEmail2: "nabil.Kouatly@liu.edu.lb",
    studentAffairsEmail: "student-affairs@liu.edu.lb",
    artsAndSciencesEmail: "sas@liu.edu.lb",
    mainPhone: "(+961) 1-706881/2/3/4",
    mainAddress: "P.O. Box: 146404 - Beirut, Lebanon",
    website: "https://liu.edu.lb",
    socialMedia: {
      facebook: "https://www.facebook.com/LIULebanon",
      instagram: "https://www.instagram.com/liulebanon",
      twitter: "https://twitter.com/LIULebanon",
      linkedin: "https://www.linkedin.com/school/liulebanon"
    }
  },

  // ──────────────────────────────────────────
  // ACADEMIC CALENDAR
  // ──────────────────────────────────────────
  academicCalendar: {
    fallSemester: {
      name: "Fall Semester",
      registration: "September - October",
      classes: "October - January",
      midterms: "November - December",
      finals: "January",
      addDrop: "First week of classes"
    },
    springSemester: {
      name: "Spring Semester",
      registration: "January - February",
      classes: "February - May",
      midterms: "March - April",
      finals: "May - June",
      addDrop: "First week of classes"
    },
    summerSemester: {
      name: "Summer Semester",
      registration: "June - July",
      classes: "July - August",
      finals: "August",
      note: "Shorter session, not all courses available"
    }
  },

  // ──────────────────────────────────────────
  // STUDENT PHONE PLAN (ALFA / TOUCH)
  // ──────────────────────────────────────────
  studentPhonePlan: {
    description: "LIU offers students a special mobile phone plan through ALFA and Touch operators at discounted student rates. This plan is available exclusively to enrolled LIU students.",
    descriptionAr: "توفر الجامعة اللبنانية الدولية لطلابها خط هاتف جامعي بأسعار مخفضة خاصة بالطلاب عبر شركتي ألفا وتاتش.",
    operators: ["Alfa", "Touch"],
    howToRegister: [
      "1️⃣ Log in to your UMIS student portal (syslb.liu.edu.lb/login)",
      "2️⃣ Navigate to the 'ALFA/TOUCH Student Plan' section",
      "3️⃣ Choose your mobile operator (Alfa or Touch)",
      "4️⃣ Enter your mobile number (8 digits, without country code)",
      "5️⃣ Confirm your date of birth for verification",
      "6️⃣ Click 'Save' to submit your request",
      "7️⃣ You will receive a confirmation SMS within the first 2 weeks of the month",
      "8️⃣ The student plan will be activated on your phone line automatically"
    ],
    howToRegisterAr: [
      "١- تسجيل الدخول إلى بوابة UMIS الخاصة بك",
      "٢- الذهاب إلى قسم 'ALFA/TOUCH Student Plan' (خطة الطالب)",
      "٣- اختيار شركة الاتصالات (ألفا أو تاتش)",
      "٤- إدخال رقم هاتفك المحمول (٨ أرقام بدون رمز البلد)",
      "٥- تأكيد تاريخ ميلادك للتحقق من هويتك",
      "٦- الضغط على 'Save' (حفظ) لإرسال الطلب",
      "٧- ستتلقى رسالة SMS للتأكيد خلال أول أسبوعين من الشهر",
      "٨- سيتم تفعيل خطة الطالب على خطك تلقائياً"
    ],
    requirements: [
      "Must be an actively enrolled LIU student",
      "Must have a valid Lebanese mobile number (Alfa or Touch)",
      "Mobile number must be 8 digits",
      "Access to UMIS student portal is required"
    ],
    requirementsAr: [
      "يجب أن تكون طالباً مسجلاً في الجامعة",
      "يجب أن يكون لديك رقم هاتف لبناني (ألفا أو تاتش)",
      "رقم الهاتف يجب أن يكون من ٨ أرقام",
      "مطلوب الوصول إلى بوابة UMIS"
    ],
    benefits: [
      "Discounted monthly rates for students",
      "Special data and call bundles",
      "Available for both Alfa and Touch operators",
      "Easy registration through the university portal"
    ],
    benefitsAr: [
      "أسعار شهرية مخفضة للطلاب",
      "باقات بيانات ومكالمات خاصة",
      "متاح لشركتي ألفا وتاتش",
      "تسجيل سهل عبر بوابة الجامعة"
    ],
    importantNotes: [
      "You will receive an SMS during the first 2 weeks of the start of the month confirming activation",
      "The plan is linked to your student enrollment status",
      "If you graduate or leave the university, the student plan may be deactivated",
      "Contact Student Affairs if you face any issues with activation"
    ],
    importantNotesAr: [
      "ستتلقى رسالة SMS خلال أول أسبوعين من بداية الشهر لتأكيد التفعيل",
      "الخطة مرتبطة بوضعك كطالب مسجّل في الجامعة",
      "إذا تخرجت أو تركت الجامعة، قد يتم إلغاء خطة الطالب",
      "تواصل مع شؤون الطلاب إذا واجهت أي مشاكل في التفعيل"
    ]
  },

  // ──────────────────────────────────────────
  // COURSE MATERIALS (دورات) – PAST EXAMS & PDFs
  // ──────────────────────────────────────────
  courseExams: {
    driveLink: "https://drive.google.com/drive/folders/1wf6zAUz4AG6iMz4olqqUuxt24bMk6IIN?usp=sharing",
    description: "LIU provides a shared Google Drive folder containing past exam papers (دورات), study materials, and PDF resources organized by specialization and course. This is an unofficial student resource maintained by LIU students to help each other succeed.",
    descriptionAr: "توفر الجامعة مجلد Google Drive مشترك يحتوي على دورات سابقة وملفات PDF ومواد دراسية مرتبة حسب الاختصاص والمادة. هذا مورد غير رسمي يديره طلاب LIU لمساعدة بعضهم البعض.",
    categories: [
      { name: "Engineering Courses", nameAr: "دورات الهندسة", icon: "⚙️", subjects: ["Calculus", "Physics", "Circuits", "Programming", "Thermodynamics", "Statics", "Dynamics"] },
      { name: "Pharmacy Courses", nameAr: "دورات الصيدلة", icon: "💊", subjects: ["Organic Chemistry", "Biochemistry", "Pharmacology", "Anatomy", "Physiology"] },
      { name: "Business Courses", nameAr: "دورات إدارة الأعمال", icon: "📈", subjects: ["Accounting", "Finance", "Marketing", "Management", "Economics", "Statistics"] },
      { name: "Arts & Sciences Courses", nameAr: "دورات الآداب والعلوم", icon: "🔬", subjects: ["Computer Science", "IT", "Biology", "Chemistry", "Mathematics", "Psychology"] },
      { name: "Freshman Courses", nameAr: "دورات السنة التحضيرية", icon: "📖", subjects: ["English Composition", "Arabic Language", "Mathematics", "Computer Skills"] }
    ],
    howToUse: "1. Click the Google Drive link below\n2. Browse folders by specialization\n3. Find your course\n4. Download or view the PDF files",
    howToUseAr: "١- اضغط على رابط Google Drive أدناه\n٢- تصفّح المجلدات حسب الاختصاص\n٣- ابحث عن مادتك\n٤- حمّل أو شاهد ملفات PDF",
    note: "These materials are shared by students for educational purposes. Always study the official course material provided by your professors.",
    noteAr: "هذه المواد مشاركة من الطلاب لأغراض تعليمية. احرص دائماً على دراسة المواد الرسمية التي يقدمها أساتذتك."
  },

  // ──────────────────────────────────────────
  // SUGGESTED QUESTIONS
  // ──────────────────────────────────────────
  suggestedQuestions: [
    { text: "How do I apply to LIU?", textAr: "كيف أقدم طلب إلى الجامعة؟", category: "admission" },
    { text: "What are the admission requirements?", textAr: "ما هي شروط القبول؟", category: "admission" },
    { text: "Where are LIU campuses located?", textAr: "أين تقع حرم الجامعة؟", category: "campuses" },
    { text: "What majors does LIU offer?", textAr: "ما هي التخصصات المتاحة؟", category: "schools" },
    { text: "How do I register for courses?", textAr: "كيف أسجل المواد؟", category: "registration" },
    { text: "How is GPA calculated?", textAr: "كيف يُحسب المعدل التراكمي؟", category: "grading" },
    { text: "What financial aid is available?", textAr: "ما هي المساعدات المالية المتاحة؟", category: "financial" },
    { text: "How do I transfer to LIU?", textAr: "كيف أنتقل إلى الجامعة؟", category: "transfer" },
    { text: "What are the tuition fees?", textAr: "ما هي الرسوم الدراسية؟", category: "tuition" },
    { text: "Tell me about student clubs", textAr: "أخبرني عن النوادي الطلابية", category: "student_affairs" },
    { text: "How to register for student phone plan?", textAr: "كيف أسجل خط الجامعة؟", category: "phone_plan" },
    { text: "How do I contact admissions?", textAr: "كيف أتواصل مع قسم القبول؟", category: "contact" },
    { text: "Where can I find past exams (dawrat)?", textAr: "وين بلاقي دورات سابقة؟", category: "course_exams" }
  ]
};

// Export for use in app.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = LIU_KNOWLEDGE;
}
