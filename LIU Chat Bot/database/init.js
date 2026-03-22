// ============================================
// LIU CHATBOT – MongoDB DATABASE INIT
// Production database with MongoDB Atlas
// ============================================
const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const MONGO_URI = process.env.MONGO_URI;
const DB_NAME = 'liu_chatbot';

let client, db;

async function initDB() {
  // Force Google DNS for SRV resolution on restrictive networks
  const dns = require('dns');
  dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);

  client = new MongoClient(MONGO_URI, {
    serverSelectionTimeoutMS: 10000,
    connectTimeoutMS: 10000,
  });
  await client.connect();
  db = client.db(DB_NAME);
  console.log('✅ Connected to MongoDB Atlas');

  // Create collections
  const collections = ['users', 'campuses', 'programs', 'tuition_fees', 'registration_periods', 'scholarships', 'questions_log', 'knowledge_base'];
  const existing = await db.listCollections().toArray();
  const existingNames = existing.map(c => c.name);
  for (const col of collections) {
    if (!existingNames.includes(col)) await db.createCollection(col);
  }

  // Create indexes
  await db.collection('users').createIndex({ email: 1 }, { unique: true });
  await db.collection('questions_log').createIndex({ created_at: -1 });
  await db.collection('knowledge_base').createIndex({ category: 1 });

  // Seed admin
  const adminExists = await db.collection('users').findOne({ role: 'admin' });
  if (!adminExists) {
    await db.collection('users').insertOne({
      _id: uuidv4(), full_name: 'LIU Admin', email: 'admin@liu.edu.lb',
      password_hash: bcrypt.hashSync('admin123', 10), role: 'admin',
      created_at: new Date().toISOString()
    });
    console.log('✅ Admin seeded: admin@liu.edu.lb / admin123');
  }

  // Seed knowledge base
  const kbCount = await db.collection('knowledge_base').countDocuments({});
  if (kbCount === 0) {
    const entries = [
      { title: 'About LIU', title_ar: 'عن الجامعة', content: 'Lebanese International University (LIU) was founded by Dr. Abdul Rahim Mourad through the Azm & Saade Association. It is one of the largest private universities in Lebanon with 9 campuses: Beirut (Main), Saida, Tripoli, Nabatieh, Tyre, Bekaa, Mount Lebanon, Halba-Akkar, and Rayak. LIU provides accessible, high-quality education at affordable rates.', content_ar: 'تأسست الجامعة اللبنانية الدولية على يد الدكتور عبد الرحيم مراد عبر جمعية العزم والسعادة. وهي من أكبر الجامعات الخاصة في لبنان مع 9 فروع.', category: 'about' },
      { title: 'Admission Requirements', title_ar: 'شروط القبول', content: 'To apply to LIU: Official secondary school certificate (Baccalaureate II or equivalent), ID/passport copy, passport photos, completed application form, and application fee payment. SAT scores or passing the LIU English Entrance Exam (EEE) are also required.', content_ar: 'للتقديم: شهادة ثانوية رسمية، نسخة عن الهوية/جواز سفر، صور شخصية، طلب التحاق، دفع رسوم الطلب. مطلوب SAT أو امتحان اللغة الإنجليزية.', category: 'admission' },
      { title: 'GPA System', title_ar: 'نظام المعدل', content: 'LIU uses a 4.0 GPA scale. A=4.0 (93-100%), A-=3.67 (90-92%), B+=3.33 (87-89%), B=3.0 (83-86%), B-=2.67 (80-82%), C+=2.33 (77-79%), C=2.0 (73-76%), C-=1.67 (70-72%), D+=1.33 (67-69%), D=1.0 (63-66%), F=0.0 (below 63%). Minimum 2.0 cumulative GPA required for graduation. Dean\'s Honor List requires 3.5+ GPA.', content_ar: 'تعتمد الجامعة نظام 4.0 للمعدل. A=4.0، B=3.0، C=2.0، D=1.0، F=0.0. الحد الأدنى للتخرج 2.0.', category: 'grading' },
      { title: 'Registration via UMIS', title_ar: 'التسجيل عبر UMIS', content: 'Course registration is done through the UMIS portal (syslb.liu.edu.lb). Steps: Log in → Check academic calendar → Meet advisor → Select courses → Confirm registration → Pay tuition fees (monthly installments within the semester). The UMIS portal offers 10 features including GPA Calculator, Schedule view, Course Offering, and Registration Advising.', content_ar: 'يتم التسجيل عبر بوابة UMIS. الخطوات: تسجيل دخول ← التقويم الأكاديمي ← مقابلة المرشد ← اختيار المواد ← تأكيد ← دفع الأقساط الشهرية.', category: 'registration' },
      { title: 'Tuition & Fees', title_ar: 'الرسوم الدراسية', content: 'Tuition fees at LIU are paid in monthly installments throughout each semester. The total cost varies by faculty/school. Engineering and Pharmacy are slightly higher. Additional fees include: application fee, registration fee per semester, lab fees, graduation fee, and transcript request fee. Payment can be made by cash, bank transfer, or check.', content_ar: 'الرسوم تُدفع كأقساط شهرية خلال الفصل الدراسي. تختلف حسب الكلية. تشمل الرسوم الإضافية رسوم تسجيل ومختبرات وتخرج.', category: 'tuition' },
      { title: 'Financial Aid & Scholarships', title_ar: 'المساعدات المالية والمنح', content: 'LIU offers: Social Aid (based on financial need), Merit Scholarships (GPA 3.2+=25%, 3.5+=50%, 3.7+=75%, 3.85+=100%), Sibling Discount, Employee Benefits. Apply at the Financial Aid Office on your campus.', content_ar: 'تقدم الجامعة: مساعدات اجتماعية، منح تفوق (معدل 3.2+=25%، 3.5+=50%، 3.7+=75%، 3.85+=100%)، خصم أخوة، مزايا موظفين.', category: 'financial' },
      { title: 'Student Phone Plan', title_ar: 'خط الطالب الجامعي', content: 'LIU offers a discounted mobile phone plan through ALFA and Touch operators. Register via UMIS portal under the ALFA/TOUCH Student Plan section. Enter your 8-digit mobile number and confirm your date of birth. You will receive an SMS confirmation within the first 2 weeks of the month.', content_ar: 'توفر الجامعة خط هاتف بأسعار مخفضة عبر ألفا وتاتش. سجّل عبر بوابة UMIS في قسم خطة الطالب.', category: 'phone_plan' },
      { title: 'Academic Schools', title_ar: 'الكليات', content: 'LIU has 5 schools: School of Engineering (Civil, Electrical, Mechanical, Computer, Industrial), School of Pharmacy (PharmD, BS Pharmaceutical Sciences), School of Business (Accounting, Management, Marketing, Hospitality, Banking, Economics, MBA), School of Arts & Sciences (CS, IT, Biology, Biochem, Math, Nutrition, Graphic Design, Communication, Psychology), School of Education (Elementary Education, Teaching Diploma, MA in Education).', content_ar: 'كليات الجامعة: الهندسة، الصيدلة، إدارة الأعمال، الآداب والعلوم، التربية.', category: 'schools' },
      { title: 'Campuses', title_ar: 'الفروع', content: 'LIU has 9 campuses across Lebanon: Beirut (Main) at Mouseitbeh (+961-1-706881), Saida/Sidon (+961-7-723543), Tripoli (+961-6-218970), Nabatieh (+961-7-761920), Tyre/Sour (+961-7-346060), Bekaa (+961-8-900037), Mount Lebanon (+961-5-807100), Halba-Akkar, and Rayak.', content_ar: 'للجامعة 9 فروع: بيروت، صيدا، طرابلس، النبطية، صور، البقاع، جبل لبنان، حلبا عكار، رياق.', category: 'campuses' },
      { title: 'Career Services', title_ar: 'خدمات التوظيف', content: 'LIU Career Services offers: CV review & optimization, annual job fairs, internship connections, interview preparation, career counseling, and alumni networking events. Available to all current students and graduates.', content_ar: 'تقدم خدمات التوظيف: مراجعة السيرة الذاتية، معارض عمل، تدريب، إعداد للمقابلات، إرشاد مهني.', category: 'career' },
    ];
    await db.collection('knowledge_base').insertMany(entries.map(e => ({ _id: uuidv4(), ...e, source: 'seed', updated_at: new Date().toISOString() })));
    console.log('✅ Knowledge base seeded with', entries.length, 'entries');
  }

  return db;
}

function getDB() { return db; }

async function closeDB() { if (client) await client.close(); }

module.exports = { initDB, getDB, closeDB };
