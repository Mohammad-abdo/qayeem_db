import { PrismaClient, BookStatus, BookType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...\n');

  // Create users
  console.log('👥 Creating users...');
  const hashedPassword = await bcrypt.hash('admin123', 10);
  const userPassword = await bcrypt.hash('user123', 10);
  
  const admin = await prisma.user.upsert({
    where: { email: 'admin@qayeem.com' },
    update: {},
    create: {
      email: 'admin@qayeem.com',
      name: 'Admin User',
      nameAr: 'المدير',
      password: hashedPassword,
      role: 'ADMIN',
    },
  });
  
  const manager = await prisma.user.upsert({
    where: { email: 'manager@qayeem.com' },
    update: {},
    create: {
      email: 'manager@qayeem.com',
      name: 'Manager User',
      nameAr: 'المدير التنفيذي',
      password: hashedPassword,
      role: 'MANAGER',
    },
  });

  const evaluator = await prisma.user.upsert({
    where: { email: 'evaluator@qayeem.com' },
    update: {},
    create: {
      email: 'evaluator@qayeem.com',
      name: 'Evaluator User',
      nameAr: 'المقيّم',
      password: hashedPassword,
      role: 'EVALUATOR',
    },
  });
  
  const testUser = await prisma.user.upsert({
    where: { email: 'user@qayeem.com' },
    update: {},
    create: {
      email: 'user@qayeem.com',
      name: 'Test User',
      nameAr: 'مستخدم تجريبي',
      password: userPassword,
      role: 'USER',
    },
  });

  // Create additional users
  const users = await Promise.all([
    prisma.user.upsert({
      where: { email: 'ahmed@qayeem.com' },
      update: {},
      create: {
        email: 'ahmed@qayeem.com',
        name: 'Ahmed Ali',
        nameAr: 'أحمد علي',
        password: userPassword,
        role: 'USER',
      },
    }),
    prisma.user.upsert({
      where: { email: 'fatima@qayeem.com' },
      update: {},
      create: {
        email: 'fatima@qayeem.com',
        name: 'Fatima Hassan',
        nameAr: 'فاطمة حسن',
        password: userPassword,
        role: 'USER',
      },
    }),
    prisma.user.upsert({
      where: { email: 'mohammed@qayeem.com' },
      update: {},
      create: {
        email: 'mohammed@qayeem.com',
        name: 'Mohammed Saleh',
        nameAr: 'محمد صالح',
        password: userPassword,
        role: 'USER',
      },
    }),
  ]);

  console.log(`✅ Created ${users.length + 4} users\n`);

  // Create book categories first
  console.log('📁 Creating book categories...');
  const categoryMapping: { [key: string]: any } = {};
  
  const categoryData = [
    { name: 'Personal Growth', nameAr: 'النمو الشخصي', order: 1 },
    { name: 'Self-Development', nameAr: 'تطوير الذات', order: 2 },
    { name: 'Finance', nameAr: 'المالية', order: 3 },
    { name: 'Business', nameAr: 'الأعمال', order: 4 },
    { name: 'Success', nameAr: 'النجاح', order: 5 },
    { name: 'Spirituality', nameAr: 'الروحانيات', order: 6 },
    { name: 'History', nameAr: 'التاريخ', order: 7 },
    { name: 'Strategy', nameAr: 'الاستراتيجية', order: 8 },
    { name: 'Communication', nameAr: 'التواصل', order: 9 },
    { name: 'Psychology', nameAr: 'علم النفس', order: 10 },
    { name: 'Lifestyle', nameAr: 'نمط الحياة', order: 11 },
    { name: 'Mental Health', nameAr: 'الصحة النفسية', order: 12 },
    { name: 'Professional Development', nameAr: 'التطوير المهني', order: 13 },
    { name: 'Productivity', nameAr: 'الإنتاجية', order: 14 },
    { name: 'Philosophy', nameAr: 'الفلسفة', order: 15 },
    { name: 'Leadership', nameAr: 'القيادة', order: 16 },
  ];

  for (const cat of categoryData) {
    const category = await prisma.bookCategory.upsert({
      where: { name: cat.name },
      update: {},
      create: {
        name: cat.name,
        nameAr: cat.nameAr,
        description: `Books about ${cat.name}`,
        descriptionAr: `كتب عن ${cat.nameAr}`,
        order: cat.order,
        isActive: true,
      },
    });
    categoryMapping[cat.name] = category.id;
    categoryMapping[cat.nameAr] = category.id;
  }
  console.log(`✅ Created/Updated ${categoryData.length} categories\n`);

  // Create books with real data
  console.log('📚 Creating books...');
  const books = [
    {
      title: 'The 7 Habits of Highly Effective People',
      titleAr: 'العادات السبع للناس الأكثر فعالية',
      description: 'A powerful lesson in personal change. Stephen Covey presents a framework for living with fairness, integrity, honesty, and human dignity.',
      descriptionAr: 'درس قوي في التغيير الشخصي. يقدم ستيفن كوفي إطاراً للعيش مع العدالة والنزاهة والصدق والكرامة الإنسانية.',
      author: 'Stephen R. Covey',
      authorAr: 'ستيفن كوفي',
      isbn: '978-0743269513',
      price: 89.50,
      category: 'Self-Development',
      categoryAr: 'تطوير الذات',
      coverImage: 'https://images-na.ssl-images-amazon.com/images/I/71-4h7DPUXL.jpg',
      stock: 25,
      status: BookStatus.ACTIVE,
      createdBy: admin.id,
    },
    {
      title: 'Atomic Habits',
      titleAr: 'العادات الذرية',
      description: 'An Easy & Proven Way to Build Good Habits & Break Bad Ones. Tiny changes that make a remarkable difference.',
      descriptionAr: 'طريقة سهلة ومثبتة لبناء عادات جيدة وكسر العادات السيئة. تغييرات صغيرة تحدث فرقاً ملحوظاً.',
      author: 'James Clear',
      authorAr: 'جيمس كلير',
      isbn: '978-0735211292',
      price: 95.00,
      category: 'Self-Development',
      categoryAr: 'تطوير الذات',
      coverImage: 'https://images-na.ssl-images-amazon.com/images/I/81wgcld4vlL.jpg',
      stock: 30,
      status: BookStatus.ACTIVE,
      createdBy: admin.id,
    },
    {
      title: 'Rich Dad Poor Dad',
      titleAr: 'الأب الغني والأب الفقير',
      description: 'What the Rich Teach Their Kids About Money That the Poor and Middle Class Do Not!',
      descriptionAr: 'ما يعلمه الأثرياء لأطفالهم عن المال الذي لا يعلمه الفقراء والطبقة الوسطى!',
      author: 'Robert T. Kiyosaki',
      authorAr: 'روبرت كيوساكي',
      isbn: '978-1612680194',
      price: 75.00,
      category: 'Finance',
      categoryAr: 'المالية',
      coverImage: 'https://images-na.ssl-images-amazon.com/images/I/81bsw6fnUiL.jpg',
      stock: 20,
      status: BookStatus.ACTIVE,
      createdBy: admin.id,
    },
    {
      title: 'The Lean Startup',
      titleAr: 'الشركة الناشئة الرشيقة',
      description: 'How Today\'s Entrepreneurs Use Continuous Innovation to Create Radically Successful Businesses',
      descriptionAr: 'كيف يستخدم رواد الأعمال اليوم الابتكار المستمر لإنشاء أعمال ناجحة بشكل جذري',
      author: 'Eric Ries',
      authorAr: 'إريك ريس',
      isbn: '978-0307887894',
      price: 85.00,
      category: 'Business',
      categoryAr: 'الأعمال',
      coverImage: 'https://images-na.ssl-images-amazon.com/images/I/81-QB7nDh4L.jpg',
      stock: 15,
      status: BookStatus.ACTIVE,
      createdBy: admin.id,
    },
    {
      title: 'Think and Grow Rich',
      titleAr: 'فكر وازدد ثراء',
      description: 'The Landmark Bestseller Now Revised and Updated for the 21st Century',
      descriptionAr: 'الكتاب الأكثر مبيعاً الآن منقح ومحدث للقرن الحادي والعشرين',
      author: 'Napoleon Hill',
      authorAr: 'نابليون هيل',
      isbn: '978-1585424337',
      price: 70.00,
      category: 'Success',
      categoryAr: 'النجاح',
      coverImage: 'https://images-na.ssl-images-amazon.com/images/I/71QKQ9mwV7L.jpg',
      stock: 18,
      status: BookStatus.ACTIVE,
      createdBy: admin.id,
    },
    {
      title: 'The Power of Now',
      titleAr: 'قوة الآن',
      description: 'A Guide to Spiritual Enlightenment',
      descriptionAr: 'دليل للتنوير الروحي',
      author: 'Eckhart Tolle',
      authorAr: 'إيكهارت تول',
      isbn: '978-1577314806',
      price: 80.00,
      category: 'Spirituality',
      categoryAr: 'الروحانيات',
      coverImage: 'https://images-na.ssl-images-amazon.com/images/I/81qW97ndkvL.jpg',
      stock: 22,
      status: BookStatus.ACTIVE,
      createdBy: admin.id,
    },
    {
      title: 'Sapiens: A Brief History of Humankind',
      titleAr: 'سابينز: تاريخ مختصر للجنس البشري',
      description: 'From Stone Age to the Modern Era',
      descriptionAr: 'من العصر الحجري إلى العصر الحديث',
      author: 'Yuval Noah Harari',
      authorAr: 'يوفال نوح هراري',
      isbn: '978-0062316097',
      price: 100.00,
      category: 'History',
      categoryAr: 'التاريخ',
      coverImage: 'https://images-na.ssl-images-amazon.com/images/I/713jIoNE3pL.jpg',
      stock: 12,
      status: BookStatus.ACTIVE,
      createdBy: admin.id,
    },
    {
      title: 'The Art of War',
      titleAr: 'فن الحرب',
      description: 'An Ancient Chinese Military Treatise',
      descriptionAr: 'رسالة عسكرية صينية قديمة',
      author: 'Sun Tzu',
      authorAr: 'سون تزو',
      isbn: '978-0486425576',
      price: 45.00,
      category: 'Strategy',
      categoryAr: 'الاستراتيجية',
      coverImage: 'https://images-na.ssl-images-amazon.com/images/I/71Kj7C8uGZL.jpg',
      stock: 35,
      status: BookStatus.ACTIVE,
      createdBy: admin.id,
    },
    {
      title: 'How to Win Friends and Influence People',
      titleAr: 'كيف تكسب الأصدقاء وتؤثر في الناس',
      description: 'The Only Book You Need to Lead You to Success',
      descriptionAr: 'الكتاب الوحيد الذي تحتاجه لتقودك إلى النجاح',
      author: 'Dale Carnegie',
      authorAr: 'ديل كارنيجي',
      isbn: '978-0671027032',
      price: 65.00,
      category: 'Communication',
      categoryAr: 'التواصل',
      coverImage: 'https://images-na.ssl-images-amazon.com/images/I/71Qx3u0qj+L.jpg',
      stock: 28,
      status: BookStatus.ACTIVE,
      createdBy: admin.id,
    },
    {
      title: 'The 48 Laws of Power',
      titleAr: 'القوانين الثمانية والأربعون للسلطة',
      description: 'A Practical Guide for Anyone Who Wants Power, Observes Power, or Wants to Arm Themselves Against Power',
      descriptionAr: 'دليل عملي لأي شخص يريد السلطة أو يراقب السلطة أو يريد تسليح نفسه ضد السلطة',
      author: 'Robert Greene',
      authorAr: 'روبرت جرين',
      isbn: '978-0140280197',
      price: 90.00,
      category: 'Psychology',
      categoryAr: 'علم النفس',
      coverImage: 'https://images-na.ssl-images-amazon.com/images/I/71H4qLQRJGL.jpg',
      stock: 16,
      status: BookStatus.ACTIVE,
      createdBy: admin.id,
    },
    {
      title: 'The Subtle Art of Not Giving a F*ck',
      titleAr: 'الفن الرفيع في عدم الاكتراث',
      description: 'A Counterintuitive Approach to Living a Good Life',
      descriptionAr: 'نهج غير بديهي للعيش حياة جيدة',
      author: 'Mark Manson',
      authorAr: 'مارك مانسون',
      isbn: '978-0062457714',
      price: 88.00,
      category: 'Self-Development',
      categoryAr: 'تطوير الذات',
      coverImage: 'https://images-na.ssl-images-amazon.com/images/I/71QKQ9mwV7L.jpg',
      stock: 24,
      status: BookStatus.ACTIVE,
      createdBy: admin.id,
    },
    {
      title: 'The Intelligent Investor',
      titleAr: 'المستثمر الذكي',
      description: 'The Definitive Book on Value Investing',
      descriptionAr: 'الكتاب النهائي عن الاستثمار في القيمة',
      author: 'Benjamin Graham',
      authorAr: 'بنجامين جراهام',
      isbn: '978-0060555665',
      price: 110.00,
      category: 'Finance',
      categoryAr: 'المالية',
      coverImage: 'https://images-na.ssl-images-amazon.com/images/I/91+v4T6pO+L.jpg',
      stock: 14,
      status: BookStatus.ACTIVE,
      createdBy: admin.id,
    },
    {
      title: 'Good to Great',
      titleAr: 'من الجيد إلى العظيم',
      description: 'Why Some Companies Make the Leap... and Others Don\'t',
      descriptionAr: 'لماذا تقوم بعض الشركات بالقفزة... وأخرى لا',
      author: 'Jim Collins',
      authorAr: 'جيم كولينز',
      isbn: '978-0066620992',
      price: 95.00,
      category: 'Business',
      categoryAr: 'الأعمال',
      coverImage: 'https://images-na.ssl-images-amazon.com/images/I/71QKQ9mwV7L.jpg',
      stock: 19,
      status: BookStatus.ACTIVE,
      createdBy: admin.id,
    },
    {
      title: 'The 4-Hour Workweek',
      titleAr: 'أسبوع العمل 4 ساعات',
      description: 'Escape 9-5, Live Anywhere, and Join the New Rich',
      descriptionAr: 'الهروب من 9-5، العيش في أي مكان، والانضمام إلى الأثرياء الجدد',
      author: 'Timothy Ferriss',
      authorAr: 'تيموثي فيريس',
      isbn: '978-0307465351',
      price: 85.00,
      category: 'Lifestyle',
      categoryAr: 'نمط الحياة',
      coverImage: 'https://images-na.ssl-images-amazon.com/images/I/81QKQ9mwV7L.jpg',
      stock: 21,
      status: BookStatus.ACTIVE,
      createdBy: admin.id,
    },
    {
      title: 'Daring Greatly',
      titleAr: 'التجرؤ بجرأة',
      description: 'How the Courage to Be Vulnerable Transforms the Way We Live, Love, Parent, and Lead',
      descriptionAr: 'كيف تتحول الشجاعة في أن تكون ضعيفاً إلى طريقة نعيش ونحب ونربي ونقود بها',
      author: 'Brené Brown',
      authorAr: 'بريني براون',
      isbn: '978-1592407330',
      price: 75.00,
      category: 'Psychology',
      categoryAr: 'علم النفس',
      coverImage: 'https://images-na.ssl-images-amazon.com/images/I/71QKQ9mwV7L.jpg',
      stock: 17,
      status: BookStatus.ACTIVE,
      createdBy: admin.id,
    },
    {
      title: 'Best Practices for Success',
      titleAr: 'أفضل الممارسات للنجاح',
      description: 'A comprehensive guide to implementing best practices in personal and professional life. Learn effective strategies and proven methods.',
      descriptionAr: 'دليل شامل لتنفيذ أفضل الممارسات في الحياة الشخصية والمهنية. تعلم الاستراتيجيات الفعالة والطرق المجربة.',
      author: 'John Smith',
      authorAr: 'جون سميث',
      isbn: '978-1592407331',
      price: 85.00,
      category: 'Self-Development',
      categoryAr: 'تطوير الذات',
      coverImage: 'https://images-na.ssl-images-amazon.com/images/I/71QKQ9mwV7L.jpg',
      stock: 20,
      status: BookStatus.ACTIVE,
      createdBy: admin.id,
    },
    {
      title: 'Effective Practices for Leaders',
      titleAr: 'ممارسات فعالة للقادة',
      description: 'Leadership practices that drive results and inspire teams to achieve excellence.',
      descriptionAr: 'ممارسات قيادية تحقق النتائج وتلهم الفرق لتحقيق التميز.',
      author: 'Sarah Johnson',
      authorAr: 'سارة جونسون',
      isbn: '978-1592407332',
      price: 90.00,
      category: 'Professional Development',
      categoryAr: 'التطوير المهني',
      coverImage: 'https://images-na.ssl-images-amazon.com/images/I/71QKQ9mwV7L.jpg',
      stock: 15,
      status: BookStatus.ACTIVE,
      createdBy: admin.id,
    },
    {
      title: 'Mindfulness Practices',
      titleAr: 'ممارسات اليقظة',
      description: 'Daily practices for mindfulness and mental clarity. Transform your life with simple yet powerful techniques.',
      descriptionAr: 'ممارسات يومية لليقظة والوضوح الذهني. حول حياتك بتقنيات بسيطة لكنها قوية.',
      author: 'David Lee',
      authorAr: 'ديفيد لي',
      isbn: '978-1592407333',
      price: 70.00,
      category: 'Mental Health',
      categoryAr: 'الصحة النفسية',
      coverImage: 'https://images-na.ssl-images-amazon.com/images/I/71QKQ9mwV7L.jpg',
      stock: 25,
      status: BookStatus.ACTIVE,
      createdBy: admin.id,
    },
    {
      title: 'Patterns of Success',
      titleAr: 'أنماط النجاح',
      description: 'Discover the patterns that successful people follow and learn how to apply them in your own life.',
      descriptionAr: 'اكتشف الأنماط التي يتبعها الأشخاص الناجحون وتعلم كيفية تطبيقها في حياتك الخاصة.',
      author: 'Michael Brown',
      authorAr: 'مايكل براون',
      isbn: '978-1592407334',
      price: 95.00,
      category: 'Success',
      categoryAr: 'النجاح',
      coverImage: 'https://images-na.ssl-images-amazon.com/images/I/71QKQ9mwV7L.jpg',
      stock: 18,
      status: BookStatus.ACTIVE,
      createdBy: admin.id,
    },
    {
      title: 'Thinking Patterns',
      titleAr: 'أنماط التفكير',
      description: 'Understand different thinking patterns and how they affect your decisions and outcomes.',
      descriptionAr: 'افهم أنماط التفكير المختلفة وكيف تؤثر على قراراتك ونتائجك.',
      author: 'Emma Wilson',
      authorAr: 'إيما ويلسون',
      isbn: '978-1592407335',
      price: 80.00,
      category: 'Psychology',
      categoryAr: 'علم النفس',
      coverImage: 'https://images-na.ssl-images-amazon.com/images/I/71QKQ9mwV7L.jpg',
      stock: 22,
      status: BookStatus.ACTIVE,
      createdBy: admin.id,
    },
    {
      title: 'Behavioral Patterns',
      titleAr: 'أنماط السلوك',
      description: 'A deep dive into behavioral patterns and how to change them for better outcomes.',
      descriptionAr: 'غوص عميق في أنماط السلوك وكيفية تغييرها لتحقيق نتائج أفضل.',
      author: 'Robert Taylor',
      authorAr: 'روبرت تايلور',
      isbn: '978-1592407336',
      price: 88.00,
      category: 'Psychology',
      categoryAr: 'علم النفس',
      coverImage: 'https://images-na.ssl-images-amazon.com/images/I/71QKQ9mwV7L.jpg',
      stock: 16,
      status: BookStatus.ACTIVE,
      createdBy: admin.id,
    },
    // Additional books from internet with full details
    {
      title: 'The 5 AM Club',
      titleAr: 'نادي الخامسة صباحاً',
      description: 'Own Your Morning. Elevate Your Life. The 5 AM Club is a book that will transform your life. Through an enchanting story about two struggling strangers who meet an eccentric tycoon, Robin Sharma reveals the early-rising habit that has helped his clients maximize their productivity, activate their best health and bulletproof their serenity.',
      descriptionAr: 'امتلك صباحك. ارفع مستوى حياتك. نادي الخامسة صباحاً هو كتاب سيحول حياتك. من خلال قصة ساحرة عن غريبين يعانيان يلتقيان برجل أعمال غريب الأطوار، يكشف روبن شارما عن عادة الاستيقاظ المبكر التي ساعدت عملاءه على تعظيم إنتاجيتهم وتفعيل أفضل صحتهم وحماية هدوئهم.',
      author: 'Robin Sharma',
      authorAr: 'روبن شارما',
      isbn: '978-1443456624',
      price: 92.00,
      category: 'Self-Development',
      categoryAr: 'تطوير الذات',
      coverImage: 'https://images-na.ssl-images-amazon.com/images/I/71zytzrg6lL.jpg',
      stock: 28,
      status: BookStatus.ACTIVE,
      createdBy: admin.id,
    },
    {
      title: 'Deep Work',
      titleAr: 'العمل العميق',
      description: 'Rules for Focused Success in a Distracted World. Deep work is the ability to focus without distraction on a cognitively demanding task.',
      descriptionAr: 'قواعد للنجاح المركز في عالم مشتت. العمل العميق هو القدرة على التركيز دون تشتت في مهمة تتطلب إدراكاً.',
      author: 'Cal Newport',
      authorAr: 'كال نيوبورت',
      isbn: '978-1455586691',
      price: 87.00,
      category: 'Productivity',
      categoryAr: 'الإنتاجية',
      coverImage: 'https://images-na.ssl-images-amazon.com/images/I/81WmojBxvbL.jpg',
      stock: 22,
      status: BookStatus.ACTIVE,
      createdBy: admin.id,
    },
    {
      title: 'The Millionaire Fastlane',
      titleAr: 'المسار السريع للمليونير',
      description: 'Crack the Code to Wealth and Live Rich for a Lifetime. The Fastlane is a business and life strategy designed for wealth acceleration.',
      descriptionAr: 'اكسر رمز الثراء وعش غنياً مدى الحياة. المسار السريع هو استراتيجية أعمال وحياة مصممة لتسريع الثراء.',
      author: 'MJ DeMarco',
      authorAr: 'إم جاي دي ماركو',
      isbn: '978-0984358106',
      price: 78.00,
      category: 'Finance',
      categoryAr: 'المالية',
      coverImage: 'https://images-na.ssl-images-amazon.com/images/I/71QKQ9mwV7L.jpg',
      stock: 19,
      status: BookStatus.ACTIVE,
      createdBy: admin.id,
    },
    {
      title: 'The Psychology of Money',
      titleAr: 'سيكولوجية المال',
      description: 'Timeless lessons on wealth, greed, and happiness. Doing well with money isn\'t necessarily about what you know. It\'s about how you behave.',
      descriptionAr: 'دروس خالدة عن الثراء والجشع والسعادة. النجاح مع المال ليس بالضرورة حول ما تعرفه. إنه حول كيفية تصرفك.',
      author: 'Morgan Housel',
      authorAr: 'مورجان هاوسل',
      isbn: '978-0857197689',
      price: 85.00,
      category: 'Finance',
      categoryAr: 'المالية',
      coverImage: 'https://images-na.ssl-images-amazon.com/images/I/81QKQ9mwV7L.jpg',
      stock: 24,
      status: BookStatus.ACTIVE,
      createdBy: admin.id,
    },
    {
      title: 'Can\'t Hurt Me',
      titleAr: 'لا يمكن أن يؤذيني',
      description: 'Master Your Mind and Defy the Odds. David Goggins shares his astonishing life story and reveals that most of us only tap into 40% of our capabilities.',
      descriptionAr: 'أتقن عقلك وتحدى الصعاب. يشارك ديفيد جوجينز قصة حياته المذهلة ويكشف أن معظمنا يستخدم فقط 40% من قدراتنا.',
      author: 'David Goggins',
      authorAr: 'ديفيد جوجينز',
      isbn: '978-1544512273',
      price: 95.00,
      category: 'Self-Development',
      categoryAr: 'تطوير الذات',
      coverImage: 'https://images-na.ssl-images-amazon.com/images/I/81QKQ9mwV7L.jpg',
      stock: 21,
      status: BookStatus.ACTIVE,
      createdBy: admin.id,
    },
    {
      title: 'The Compound Effect',
      titleAr: 'تأثير المركب',
      description: 'Jumpstart Your Income, Your Life, Your Success. Small, seemingly insignificant steps completed consistently over time will create a radical difference.',
      descriptionAr: 'ابدأ دخلتك وحياتك ونجاحك. خطوات صغيرة تبدو غير مهمة تُكمل باستمرار مع الوقت ستنشئ فرقاً جذرياً.',
      author: 'Darren Hardy',
      authorAr: 'دارين هاردي',
      isbn: '978-1593157241',
      price: 73.00,
      category: 'Success',
      categoryAr: 'النجاح',
      coverImage: 'https://images-na.ssl-images-amazon.com/images/I/71QKQ9mwV7L.jpg',
      stock: 26,
      status: BookStatus.ACTIVE,
      createdBy: admin.id,
    },
    {
      title: 'Meditations',
      titleAr: 'تأملات',
      description: 'A personal journal written by Roman Emperor Marcus Aurelius. A series of spiritual exercises filled with wisdom, practical guidance, and profound understanding of human behavior.',
      descriptionAr: 'مذكرات شخصية كتبها الإمبراطور الروماني ماركوس أوريليوس. سلسلة من التمارين الروحية مليئة بالحكمة والإرشاد العميق والفهم العميق للسلوك البشري.',
      author: 'Marcus Aurelius',
      authorAr: 'ماركوس أوريليوس',
      isbn: '978-0486298238',
      price: 55.00,
      category: 'Philosophy',
      categoryAr: 'الفلسفة',
      coverImage: 'https://images-na.ssl-images-amazon.com/images/I/71QKQ9mwV7L.jpg',
      stock: 32,
      status: BookStatus.ACTIVE,
      createdBy: admin.id,
    },
    {
      title: 'The Obstacle Is The Way',
      titleAr: 'العقبة هي الطريق',
      description: 'The Timeless Art of Turning Trials into Triumph. The impediment to action advances action. What stands in the way becomes the way.',
      descriptionAr: 'فن خالد لتحويل المحن إلى انتصارات. العائق أمام العمل يدفع العمل. ما يقف في الطريق يصبح الطريق.',
      author: 'Ryan Holiday',
      authorAr: 'ريان هوليداي',
      isbn: '978-1591846352',
      price: 82.00,
      category: 'Philosophy',
      categoryAr: 'الفلسفة',
      coverImage: 'https://images-na.ssl-images-amazon.com/images/I/71QKQ9mwV7L.jpg',
      stock: 18,
      status: BookStatus.ACTIVE,
      createdBy: admin.id,
    },
    {
      title: 'The 10X Rule',
      titleAr: 'قاعدة 10X',
      description: 'The Only Difference Between Success and Failure. Set targets that are 10X what you think you want and then do 10X what you think it will take to accomplish those targets.',
      descriptionAr: 'الفرق الوحيد بين النجاح والفشل. حدد أهدافاً أكبر بعشر مرات مما تعتقد أنك تريده ثم افعل عشرة أضعاف ما تعتقد أنه سيستغرق لتحقيق هذه الأهداف.',
      author: 'Grant Cardone',
      authorAr: 'جرانت كاردون',
      isbn: '978-0470627600',
      price: 88.00,
      category: 'Business',
      categoryAr: 'الأعمال',
      coverImage: 'https://images-na.ssl-images-amazon.com/images/I/71QKQ9mwV7L.jpg',
      stock: 17,
      status: BookStatus.ACTIVE,
      createdBy: admin.id,
    },
    {
      title: 'Start with Why',
      titleAr: 'ابدأ باللماذا',
      description: 'How Great Leaders Inspire Everyone to Take Action. People don\'t buy what you do; they buy why you do it.',
      descriptionAr: 'كيف يلهم القادة العظماء الجميع لاتخاذ إجراء. الناس لا يشترون ما تفعله؛ يشترون لماذا تفعله.',
      author: 'Simon Sinek',
      authorAr: 'سايمون سينك',
      isbn: '978-1591846444',
      price: 79.00,
      category: 'Leadership',
      categoryAr: 'القيادة',
      coverImage: 'https://images-na.ssl-images-amazon.com/images/I/71QKQ9mwV7L.jpg',
      stock: 23,
      status: BookStatus.ACTIVE,
      createdBy: admin.id,
    },
  ];

  const createdBooks = await Promise.all(
    books.map(async (book) => {
      // Map category to categoryId
      const categoryId = categoryMapping[book.category] || categoryMapping[book.categoryAr] || null;
      
      // Determine bookType based on title/content
      let bookType: BookType | null = null;
      const titleLower = (book.title || '').toLowerCase();
      const titleArLower = (book.titleAr || '').toLowerCase();
      
      if (titleLower.includes('practice') || titleArLower.includes('ممارسة') || 
          titleLower.includes('habit') || titleArLower.includes('عادة')) {
        bookType = BookType.PRACTICES;
      } else if (titleLower.includes('pattern') || titleArLower.includes('نمط')) {
        bookType = BookType.PATTERNS;
      } else {
        // Random assignment for variety (alternate between types)
        bookType = Math.random() > 0.5 ? BookType.PRACTICES : BookType.PATTERNS;
      }
      
      const bookData = {
        ...book,
        categoryId,
        bookType,
      };
      
      // Try to find existing book by ISBN first, then by title
      let existingBook = null;
      if (book.isbn) {
        existingBook = await prisma.book.findUnique({
          where: { isbn: book.isbn },
        });
      }
      
      // If not found by ISBN, try to find by title
      if (!existingBook && book.title) {
        existingBook = await prisma.book.findFirst({
          where: {
            OR: [
              { title: book.title },
              { titleAr: book.titleAr },
            ],
          },
        });
      }
      
      // If book exists, update it; otherwise create new
      if (existingBook) {
        return prisma.book.update({
          where: { id: existingBook.id },
          data: {
            title: book.title,
            titleAr: book.titleAr,
            description: book.description,
            descriptionAr: book.descriptionAr,
            author: book.author,
            authorAr: book.authorAr,
            isbn: book.isbn || existingBook.isbn, // Preserve existing ISBN if new one is missing
            price: book.price,
            category: book.category,
            categoryAr: book.categoryAr,
            categoryId: categoryId,
            bookType: bookType,
            coverImage: book.coverImage,
            stock: book.stock,
            status: book.status,
            createdBy: book.createdBy,
          },
        });
      } else {
        return prisma.book.create({
          data: bookData,
        });
      }
    })
  );
  console.log(`✅ Created/Updated ${createdBooks.length} books with categories linked\n`);

  // Create evaluations with practicesPercentage and patternsPercentage
  console.log('📊 Creating evaluations...');
  const evaluations = await Promise.all([
    prisma.evaluation.create({
      data: {
        title: 'Employee Performance Review Q1 2024',
        titleAr: 'مراجعة أداء الموظفين الربع الأول 2024',
        description: 'Quarterly performance evaluation for all employees',
        descriptionAr: 'تقييم الأداء الربعي لجميع الموظفين',
        type: 'PERFORMANCE_REVIEW',
        status: BookStatus.ACTIVE,
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-03-31'),
        practicesPercentage: 50.0,
        patternsPercentage: 50.0,
        createdBy: admin.id,
      },
    }),
    prisma.evaluation.create({
      data: {
        title: 'Team Collaboration Assessment',
        titleAr: 'تقييم التعاون الجماعي',
        description: 'Assessment of team collaboration and communication skills',
        descriptionAr: 'تقييم مهارات التعاون والتواصل الجماعي',
        type: 'TEAM_EVALUATION',
        status: BookStatus.ACTIVE,
        startDate: new Date('2024-02-01'),
        endDate: new Date('2024-02-28'),
        practicesPercentage: 40.0,
        patternsPercentage: 60.0,
        createdBy: manager.id,
      },
    }),
    prisma.evaluation.create({
      data: {
        title: 'Self-Assessment Program',
        titleAr: 'برنامج التقييم الذاتي',
        description: 'Self-assessment for personal development',
        descriptionAr: 'التقييم الذاتي للتطوير الشخصي',
        type: 'SELF_ASSESSMENT',
        status: BookStatus.ACTIVE, // Changed to ACTIVE so users can complete it
        practicesPercentage: 60.0,
        patternsPercentage: 40.0,
        createdBy: admin.id,
      },
    }),
    // Add more evaluations
    prisma.evaluation.create({
      data: {
        title: 'Leadership Development Assessment',
        titleAr: 'تقييم تطوير القيادة',
        description: 'Comprehensive assessment for leadership skills and development',
        descriptionAr: 'تقييم شامل لمهارات القيادة والتطوير',
        type: 'SELF_ASSESSMENT',
        status: BookStatus.ACTIVE,
        practicesPercentage: 55.0,
        patternsPercentage: 45.0,
        createdBy: admin.id,
      },
    }),
    prisma.evaluation.create({
      data: {
        title: 'Personal Growth Evaluation',
        titleAr: 'تقييم النمو الشخصي',
        description: 'Evaluate your personal growth and development journey',
        descriptionAr: 'قيم رحلتك في النمو والتطوير الشخصي',
        type: 'SELF_ASSESSMENT',
        status: BookStatus.ACTIVE,
        practicesPercentage: 65.0,
        patternsPercentage: 35.0,
        createdBy: admin.id,
      },
    }),
    prisma.evaluation.create({
      data: {
        title: 'Professional Skills Assessment',
        titleAr: 'تقييم المهارات المهنية',
        description: 'Assess your professional skills and competencies',
        descriptionAr: 'قيم مهاراتك وكفاءاتك المهنية',
        type: 'PERFORMANCE_REVIEW',
        status: BookStatus.ACTIVE,
        practicesPercentage: 45.0,
        patternsPercentage: 55.0,
        createdBy: manager.id,
      },
    }),
  ]);
  console.log(`✅ Created ${evaluations.length} evaluations\n`);

  // Create criteria for first evaluation
  console.log('📋 Creating criteria...');
  const criteria = await Promise.all([
    prisma.criterion.create({
      data: {
        evaluationId: evaluations[0].id,
        title: 'Communication Skills',
        titleAr: 'مهارات التواصل',
        description: 'Ability to communicate effectively with team members',
        descriptionAr: 'القدرة على التواصل الفعال مع أعضاء الفريق',
        weight: 1.5,
        maxScore: 10,
        order: 1,
        isRequired: true,
        questionPercentage: 33.33,
        answer1Percentage: 20,
        answer2Percentage: 20,
        answer3Percentage: 20,
        answer4Percentage: 20,
        answer5Percentage: 20,
      },
    }),
    prisma.criterion.create({
      data: {
        evaluationId: evaluations[0].id,
        title: 'Problem Solving',
        titleAr: 'حل المشكلات',
        description: 'Ability to identify and solve problems efficiently',
        descriptionAr: 'القدرة على تحديد وحل المشكلات بكفاءة',
        weight: 2.0,
        maxScore: 10,
        order: 2,
        isRequired: true,
        questionPercentage: 33.33,
        answer1Percentage: 20,
        answer2Percentage: 20,
        answer3Percentage: 20,
        answer4Percentage: 20,
        answer5Percentage: 20,
      },
    }),
    prisma.criterion.create({
      data: {
        evaluationId: evaluations[0].id,
        title: 'Time Management',
        titleAr: 'إدارة الوقت',
        description: 'Ability to manage time and meet deadlines',
        descriptionAr: 'القدرة على إدارة الوقت والوفاء بالمواعيد النهائية',
        weight: 1.0,
        maxScore: 10,
        order: 3,
        isRequired: false,
        questionPercentage: 33.34,
        answer1Percentage: 20,
        answer2Percentage: 20,
        answer3Percentage: 20,
        answer4Percentage: 20,
        answer5Percentage: 20,
      },
    }),
  ]);
  console.log(`✅ Created ${criteria.length} criteria\n`);

  // Link evaluations to books by bookType
  console.log('🔗 Linking evaluations to books by bookType...');
  const bookTypeLinks = await Promise.all([
    // Link Self-Assessment (evaluations[2]) to PRACTICES books
    prisma.bookEvaluation.upsert({
      where: {
        bookType_evaluationId: {
          bookType: BookType.PRACTICES,
          evaluationId: evaluations[2].id, // Self-Assessment
        },
      },
      update: {},
      create: {
        bookType: BookType.PRACTICES,
        evaluationId: evaluations[2].id,
        isRequired: false,
        minScorePercentage: 50.0, // Lower threshold for better recommendations
        order: 0,
      },
    }),
    // Link Team Collaboration (evaluations[1]) to PATTERNS books
    prisma.bookEvaluation.upsert({
      where: {
        bookType_evaluationId: {
          bookType: BookType.PATTERNS,
          evaluationId: evaluations[1].id, // Team Collaboration
        },
      },
      update: {},
      create: {
        bookType: BookType.PATTERNS,
        evaluationId: evaluations[1].id,
        isRequired: false,
        minScorePercentage: 50.0, // Lower threshold for better recommendations
        order: 0,
      },
    }),
    // Link Performance Review (evaluations[0]) to both types as optional
    prisma.bookEvaluation.upsert({
      where: {
        bookType_evaluationId: {
          bookType: BookType.PRACTICES,
          evaluationId: evaluations[0].id, // Performance Review
        },
      },
      update: {},
      create: {
        bookType: BookType.PRACTICES,
        evaluationId: evaluations[0].id,
        isRequired: false,
        minScorePercentage: 40.0, // Lower threshold
        order: 1,
      },
    }),
    prisma.bookEvaluation.upsert({
      where: {
        bookType_evaluationId: {
          bookType: BookType.PATTERNS,
          evaluationId: evaluations[0].id, // Performance Review
        },
      },
      update: {},
      create: {
        bookType: BookType.PATTERNS,
        evaluationId: evaluations[0].id,
        isRequired: false,
        minScorePercentage: 40.0, // Lower threshold
        order: 1,
      },
    }),
    // Link Leadership Development (evaluations[3]) to PRACTICES books
    prisma.bookEvaluation.upsert({
      where: {
        bookType_evaluationId: {
          bookType: BookType.PRACTICES,
          evaluationId: evaluations[3].id, // Leadership Development
        },
      },
      update: {},
      create: {
        bookType: BookType.PRACTICES,
        evaluationId: evaluations[3].id,
        isRequired: false,
        minScorePercentage: 45.0,
        order: 2,
      },
    }),
    // Link Personal Growth (evaluations[4]) to PRACTICES books
    prisma.bookEvaluation.upsert({
      where: {
        bookType_evaluationId: {
          bookType: BookType.PRACTICES,
          evaluationId: evaluations[4].id, // Personal Growth
        },
      },
      update: {},
      create: {
        bookType: BookType.PRACTICES,
        evaluationId: evaluations[4].id,
        isRequired: false,
        minScorePercentage: 50.0,
        order: 3,
      },
    }),
    // Link Professional Skills (evaluations[5]) to PATTERNS books
    prisma.bookEvaluation.upsert({
      where: {
        bookType_evaluationId: {
          bookType: BookType.PATTERNS,
          evaluationId: evaluations[5].id, // Professional Skills
        },
      },
      update: {},
      create: {
        bookType: BookType.PATTERNS,
        evaluationId: evaluations[5].id,
        isRequired: false,
        minScorePercentage: 45.0,
        order: 2,
      },
    }),
  ]);
  console.log(`✅ Linked ${bookTypeLinks.length} evaluations to book types\n`);

  // Create roles and permissions
  console.log('🔐 Creating roles and permissions...');
  const adminRole = await prisma.role.upsert({
    where: { name: 'Administrator' },
    update: {},
    create: {
      name: 'Administrator',
      nameAr: 'المدير',
      description: 'Full system access',
      descriptionAr: 'وصول كامل للنظام',
      isSystem: true,
    },
  });

  const userRole = await prisma.role.upsert({
    where: { name: 'Standard User' },
    update: {},
    create: {
      name: 'Standard User',
      nameAr: 'مستخدم عادي',
      description: 'Basic user access',
      descriptionAr: 'وصول المستخدم الأساسي',
      isSystem: true,
    },
  });

  // Create permissions
  const permissions = await Promise.all([
    prisma.permission.upsert({
      where: { name: 'books.create' },
      update: {},
      create: {
        name: 'books.create',
        nameAr: 'إنشاء كتب',
        resource: 'books',
        resourceAr: 'الكتب',
        action: 'create',
        actionAr: 'إنشاء',
        description: 'Create new books',
        descriptionAr: 'إنشاء كتب جديدة',
      },
    }),
    prisma.permission.upsert({
      where: { name: 'books.read' },
      update: {},
      create: {
        name: 'books.read',
        nameAr: 'قراءة كتب',
        resource: 'books',
        resourceAr: 'الكتب',
        action: 'read',
        actionAr: 'قراءة',
        description: 'Read books',
        descriptionAr: 'قراءة الكتب',
      },
    }),
    prisma.permission.upsert({
      where: { name: 'books.update' },
      update: {},
      create: {
        name: 'books.update',
        nameAr: 'تحديث كتب',
        resource: 'books',
        resourceAr: 'الكتب',
        action: 'update',
        actionAr: 'تحديث',
        description: 'Update books',
        descriptionAr: 'تحديث الكتب',
      },
    }),
    prisma.permission.upsert({
      where: { name: 'books.delete' },
      update: {},
      create: {
        name: 'books.delete',
        nameAr: 'حذف كتب',
        resource: 'books',
        resourceAr: 'الكتب',
        action: 'delete',
        actionAr: 'حذف',
        description: 'Delete books',
        descriptionAr: 'حذف الكتب',
      },
    }),
  ]);

  // Assign all permissions to admin role
  await Promise.all(
    permissions.map((permission) =>
      prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: adminRole.id,
            permissionId: permission.id,
          },
        },
        update: {},
        create: {
          roleId: adminRole.id,
          permissionId: permission.id,
        },
      })
    )
  );

  // Assign read permission to user role
  await prisma.rolePermission.upsert({
    where: {
      roleId_permissionId: {
        roleId: userRole.id,
        permissionId: permissions[1].id, // books.read
      },
    },
    update: {},
    create: {
      roleId: userRole.id,
      permissionId: permissions[1].id, // books.read
    },
  });

  console.log(`✅ Created roles and permissions\n`);

  // Create settings
  console.log('⚙️ Creating settings...');
  await Promise.all([
    prisma.setting.upsert({
      where: { key: 'site_name' },
      update: {},
      create: {
        key: 'site_name',
        value: 'Qayeem System',
        valueAr: 'نظام قيم',
        description: 'Site name',
        descriptionAr: 'اسم الموقع',
      },
    }),
    prisma.setting.upsert({
      where: { key: 'site_description' },
      update: {},
      create: {
        key: 'site_description',
        value: 'Comprehensive evaluation and rating system',
        valueAr: 'نظام شامل للتقييم والتصنيف',
        description: 'Site description',
        descriptionAr: 'وصف الموقع',
      },
    }),
    prisma.setting.upsert({
      where: { key: 'currency' },
      update: {},
      create: {
        key: 'currency',
        value: 'SAR',
        valueAr: 'ريال سعودي',
        description: 'Default currency',
        descriptionAr: 'العملة الافتراضية',
      },
    }),
    prisma.setting.upsert({
      where: { key: 'recommendation_threshold' },
      update: {},
      create: {
        key: 'recommendation_threshold',
        value: '70',
        valueAr: '70',
        description: 'Minimum match percentage (0-100) to highlight recommended books with green border',
        descriptionAr: 'الحد الأدنى لنسبة التطابق (0-100) لتمييز الكتب الموصى بها بحد أخضر',
      },
    }),
    prisma.setting.upsert({
      where: { key: 'recommended_book_discount' },
      update: {},
      create: {
        key: 'recommended_book_discount',
        value: '10',
        valueAr: '10',
        description: 'Discount percentage (0-100) applied to recommended books only',
        descriptionAr: 'نسبة الخصم (0-100) المطبقة على الكتب الموصى بها فقط',
      },
    }),
  ]);
  console.log(`✅ Created/Updated settings\n`);

  // Create sample payments
  console.log('💳 Creating sample payments...');
  const payments = await Promise.all([
    prisma.payment.create({
      data: {
        userId: testUser.id,
        bookId: createdBooks[0].id,
        amount: createdBooks[0].price,
        currency: 'SAR',
        status: 'COMPLETED',
        paymentMethod: 'CREDIT_CARD',
        transactionId: 'TXN-' + Date.now(),
        paymentDate: new Date(),
      },
    }),
    prisma.payment.create({
      data: {
        userId: users[0].id,
        bookId: createdBooks[1].id,
        amount: createdBooks[1].price,
        currency: 'SAR',
        status: 'PENDING',
        paymentMethod: 'BANK_TRANSFER',
        transactionId: 'TXN-' + (Date.now() + 1),
      },
    }),
  ]);
  console.log(`✅ Created ${payments.length} payments\n`);

  // Create book reviews with different ratings
  console.log('⭐ Creating book reviews with ratings...');
  const ratingData = [
    // Book 1 - High ratings (4.5 average)
    { bookIndex: 0, userId: testUser.id, rating: 5, comment: 'Excellent book!', commentAr: 'كتاب رائع!', isApproved: true },
    { bookIndex: 0, userId: users[0].id, rating: 4, comment: 'Very good', commentAr: 'جيد جداً', isApproved: true },
    { bookIndex: 0, userId: users[1].id, rating: 5, comment: 'Amazing', commentAr: 'رائع', isApproved: true },
    { bookIndex: 0, userId: users[2].id, rating: 4, comment: 'Great read', commentAr: 'قراءة رائعة', isApproved: true },
    
    // Book 2 - Medium-high ratings (4.0 average)
    { bookIndex: 1, userId: testUser.id, rating: 4, comment: 'Good book', commentAr: 'كتاب جيد', isApproved: true },
    { bookIndex: 1, userId: users[0].id, rating: 4, comment: 'Nice', commentAr: 'جميل', isApproved: true },
    { bookIndex: 1, userId: users[1].id, rating: 4, comment: 'Recommended', commentAr: 'موصى به', isApproved: true },
    
    // Book 3 - Very high ratings (4.8 average)
    { bookIndex: 2, userId: testUser.id, rating: 5, comment: 'Outstanding!', commentAr: 'ممتاز!', isApproved: true },
    { bookIndex: 2, userId: users[0].id, rating: 5, comment: 'Perfect', commentAr: 'مثالي', isApproved: true },
    { bookIndex: 2, userId: users[1].id, rating: 5, comment: 'Best book ever', commentAr: 'أفضل كتاب على الإطلاق', isApproved: true },
    { bookIndex: 2, userId: users[2].id, rating: 4, comment: 'Very helpful', commentAr: 'مفيد جداً', isApproved: true },
    
    // Book 4 - Medium ratings (3.5 average)
    { bookIndex: 3, userId: testUser.id, rating: 3, comment: 'Okay', commentAr: 'لا بأس', isApproved: true },
    { bookIndex: 3, userId: users[0].id, rating: 4, comment: 'Decent', commentAr: 'لائق', isApproved: true },
    { bookIndex: 3, userId: users[1].id, rating: 4, comment: 'Not bad', commentAr: 'ليس سيئاً', isApproved: true },
    
    // Book 5 - Low-medium ratings (3.0 average)
    { bookIndex: 4, userId: testUser.id, rating: 3, comment: 'Average', commentAr: 'متوسط', isApproved: true },
    { bookIndex: 4, userId: users[0].id, rating: 3, comment: 'Could be better', commentAr: 'يمكن أن يكون أفضل', isApproved: true },
    
    // Book 6 - High ratings (4.3 average)
    { bookIndex: 5, userId: testUser.id, rating: 4, comment: 'Great', commentAr: 'عظيم', isApproved: true },
    { bookIndex: 5, userId: users[0].id, rating: 5, comment: 'Wonderful', commentAr: 'رائع', isApproved: true },
    { bookIndex: 5, userId: users[1].id, rating: 4, comment: 'Enjoyed it', commentAr: 'استمتعت به', isApproved: true },
    
    // Book 7 - Very high ratings (4.7 average)
    { bookIndex: 6, userId: testUser.id, rating: 5, comment: 'Brilliant', commentAr: 'رائع', isApproved: true },
    { bookIndex: 6, userId: users[0].id, rating: 5, comment: 'Excellent', commentAr: 'ممتاز', isApproved: true },
    { bookIndex: 6, userId: users[1].id, rating: 4, comment: 'Great content', commentAr: 'محتوى رائع', isApproved: true },
    
    // Book 8 - Medium ratings (3.7 average)
    { bookIndex: 7, userId: testUser.id, rating: 4, comment: 'Good', commentAr: 'جيد', isApproved: true },
    { bookIndex: 7, userId: users[0].id, rating: 4, comment: 'Interesting', commentAr: 'مثير للاهتمام', isApproved: true },
    { bookIndex: 7, userId: users[1].id, rating: 3, comment: 'Okay read', commentAr: 'قراءة عادية', isApproved: true },
    
    // Book 9 - High ratings (4.4 average)
    { bookIndex: 8, userId: testUser.id, rating: 4, comment: 'Very informative', commentAr: 'مفيد جداً', isApproved: true },
    { bookIndex: 8, userId: users[0].id, rating: 5, comment: 'Highly recommended', commentAr: 'موصى به بشدة', isApproved: true },
    { bookIndex: 8, userId: users[1].id, rating: 4, comment: 'Worth reading', commentAr: 'يستحق القراءة', isApproved: true },
    
    // Book 10 - Medium-high ratings (4.2 average)
    { bookIndex: 9, userId: testUser.id, rating: 4, comment: 'Good insights', commentAr: 'رؤى جيدة', isApproved: true },
    { bookIndex: 9, userId: users[0].id, rating: 4, comment: 'Helpful', commentAr: 'مفيد', isApproved: true },
    { bookIndex: 9, userId: users[1].id, rating: 5, comment: 'Great book', commentAr: 'كتاب رائع', isApproved: true },
    
    // Book 11 - High ratings (4.6 average)
    { bookIndex: 10, userId: testUser.id, rating: 5, comment: 'Excellent read', commentAr: 'قراءة ممتازة', isApproved: true },
    { bookIndex: 10, userId: users[0].id, rating: 4, comment: 'Very good', commentAr: 'جيد جداً', isApproved: true },
    { bookIndex: 10, userId: users[1].id, rating: 5, comment: 'Amazing insights', commentAr: 'رؤى مذهلة', isApproved: true },
    
    // Book 12 - Low ratings (2.5 average)
    { bookIndex: 11, userId: testUser.id, rating: 2, comment: 'Not impressed', commentAr: 'لست معجباً', isApproved: true },
    { bookIndex: 11, userId: users[0].id, rating: 3, comment: 'Could improve', commentAr: 'يمكن التحسين', isApproved: true },
    
    // Book 13 - High ratings (4.5 average)
    { bookIndex: 12, userId: testUser.id, rating: 5, comment: 'Fantastic', commentAr: 'رائع', isApproved: true },
    { bookIndex: 12, userId: users[0].id, rating: 4, comment: 'Very useful', commentAr: 'مفيد جداً', isApproved: true },
    { bookIndex: 12, userId: users[1].id, rating: 5, comment: 'Top rated', commentAr: 'الأعلى تقييماً', isApproved: true },
    
    // Book 14 - Medium ratings (3.3 average)
    { bookIndex: 13, userId: testUser.id, rating: 3, comment: 'Decent read', commentAr: 'قراءة لائقة', isApproved: true },
    { bookIndex: 13, userId: users[0].id, rating: 4, comment: 'Okay', commentAr: 'لا بأس', isApproved: true },
    { bookIndex: 13, userId: users[1].id, rating: 3, comment: 'Average', commentAr: 'متوسط', isApproved: true },
    
    // Book 15 - Very high ratings (4.9 average)
    { bookIndex: 14, userId: testUser.id, rating: 5, comment: 'Perfect!', commentAr: 'مثالي!', isApproved: true },
    { bookIndex: 14, userId: users[0].id, rating: 5, comment: 'Outstanding', commentAr: 'ممتاز', isApproved: true },
    { bookIndex: 14, userId: users[1].id, rating: 5, comment: 'Best book', commentAr: 'أفضل كتاب', isApproved: true },
    { bookIndex: 14, userId: users[2].id, rating: 5, comment: 'Exceptional', commentAr: 'استثنائي', isApproved: true },
    
    // Book 16 - Low-medium ratings (2.8 average)
    { bookIndex: 15, userId: testUser.id, rating: 3, comment: 'Could be better', commentAr: 'يمكن أن يكون أفضل', isApproved: true },
    { bookIndex: 15, userId: users[0].id, rating: 2, comment: 'Not great', commentAr: 'ليس رائعاً', isApproved: true },
    
    // Book 17 - High ratings (4.4 average)
    { bookIndex: 16, userId: testUser.id, rating: 4, comment: 'Very helpful', commentAr: 'مفيد جداً', isApproved: true },
    { bookIndex: 16, userId: users[0].id, rating: 5, comment: 'Great resource', commentAr: 'مورد رائع', isApproved: true },
    { bookIndex: 16, userId: users[1].id, rating: 4, comment: 'Worth it', commentAr: 'يستحق', isApproved: true },
  ];

  for (const reviewData of ratingData) {
    if (createdBooks[reviewData.bookIndex]) {
      await prisma.bookReview.upsert({
        where: {
          bookId_userId: {
            bookId: createdBooks[reviewData.bookIndex].id,
            userId: reviewData.userId,
          },
        },
        update: {
          rating: reviewData.rating,
          comment: reviewData.comment,
          commentAr: reviewData.commentAr,
          isApproved: reviewData.isApproved,
        },
        create: {
          bookId: createdBooks[reviewData.bookIndex].id,
          userId: reviewData.userId,
          rating: reviewData.rating,
          comment: reviewData.comment,
          commentAr: reviewData.commentAr,
          isApproved: reviewData.isApproved,
        },
      });
    }
  }
  console.log(`✅ Created ${ratingData.length} book reviews with different ratings\n`);

  // Create notifications (skip if they already exist)
  console.log('🔔 Creating notifications...');
  const existingNotifications = await prisma.notification.findMany({
    where: { userId: testUser.id },
    take: 2,
  });
  
  if (existingNotifications.length < 2) {
    await Promise.all([
      prisma.notification.create({
        data: {
          userId: testUser.id,
          title: 'Welcome to Qayeem System',
          titleAr: 'مرحباً بك في نظام قيم',
          message: 'Thank you for joining our platform!',
          messageAr: 'شكراً لك على الانضمام إلى منصتنا!',
          type: 'INFO',
          isRead: false,
        },
      }).catch(() => {}), // Ignore if already exists
      prisma.notification.create({
        data: {
          userId: testUser.id,
          title: 'New Evaluation Available',
          titleAr: 'تقييم جديد متاح',
          message: 'A new evaluation has been assigned to you.',
          messageAr: 'تم تعيين تقييم جديد لك.',
          type: 'EVALUATION_CREATED',
          isRead: false,
          link: `/dashboard/evaluations/${evaluations[0].id}`,
        },
      }).catch(() => {}), // Ignore if already exists
    ]);
  }
  console.log(`✅ Created/Updated notifications\n`);

  console.log('✨ Database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


