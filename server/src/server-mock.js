import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Log all incoming requests
app.use((req, res, next) => {
  console.log(`🌐 ${req.method} ${req.url}`);
  next();
});

// In-memory database
const users = [];
const subjects = [];
const modules = []; // Модули (темы) по предметам
const tests = []; // Тесты в модулях
const testResults = []; // Результаты прохождения тестов
const testProgress = []; // Прогресс прохождения (для продолжения)
const classes = []; // Классы (grades)
const teacherTests = []; // Тесты для учителей (компетенции)
const teacherTestResults = []; // Результаты тестов учителей
const controlTests = []; // Контрольные работы
const controlTestResults = []; // Результаты контрольных работ
const otpCodes = []; // OTP codes with expiration

// Enable initial data setup (admin account)
const ADD_SAMPLE_DATA = false;

function initDefaultSubjects() {
  if (subjects.length > 0) {
    return;
  }

  subjects.push(
    { _id: '1', nameRu: 'Алгебра', nameUz: 'Algebra', questionsCount: 10 },
    { _id: '2', nameRu: 'Геометрия', nameUz: 'Geometriya', questionsCount: 10 },
    { _id: '3', nameRu: 'Физика', nameUz: 'Fizika', questionsCount: 10 },
    { _id: '4', nameRu: 'Химия', nameUz: 'Kimyo', questionsCount: 10 },
    { _id: '5', nameRu: 'Биология', nameUz: 'Biologiya', questionsCount: 10 },
    { _id: '6', nameRu: 'История', nameUz: 'Tarix', questionsCount: 10 },
    { _id: '7', nameRu: 'Литература', nameUz: 'Adabiyot', questionsCount: 10 },
    { _id: '8', nameRu: 'География', nameUz: 'Geografiya', questionsCount: 10 },
    { _id: '9', nameRu: 'Английский язык', nameUz: 'Ingliz tili', questionsCount: 10 },
    { _id: '10', nameRu: 'Информатика', nameUz: 'Informatika', questionsCount: 10 }
  );
}

// OTP Configuration
const OTP_EXPIRY_MINUTES = 300; // 5 hours
const OTP_LENGTH = 8;

// Generate OTP code
function generateOTP() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude confusing chars
  let otp = '';
  for (let i = 0; i < OTP_LENGTH; i++) {
    otp += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return otp;
}

// Initialize default users
async function initUsers() {
  const adminPassword = await bcrypt.hash('admin123', 10);
  const teacherPassword = await bcrypt.hash('teacher123', 10);
  const studentPassword = await bcrypt.hash('student123', 10);

  users.push({
    _id: '1',
    username: 'admin',
    password: adminPassword,
    role: 'admin',
    firstName: 'Администратор',
    lastName: 'Системы',
    school: 'Школа №1',
    isTemporaryPassword: false
  });

  users.push({
    _id: '2',
    username: 'teacher1',
    password: teacherPassword,
    role: 'teacher',
    firstName: 'Мария',
    lastName: 'Иванова',
    school: 'Школа №1',
    subjects: ['Математика', 'Физика'],
    isTemporaryPassword: false
  });

  users.push({
    _id: '3',
    username: 'student1',
    password: studentPassword,
    role: 'student',
    firstName: 'Алексей',
    lastName: 'Петров',
    school: 'Школа №1',
    grade: '8',
    gradeSection: 'А',
    isTemporaryPassword: false,
    interestTestResults: {
      categories: {
        math: 85,
        science: 72,
        tech: 90,
        art: 45,
        social: 60,
        language: 55
      },
      results: {},
      completedAt: new Date().toISOString()
    }
  });

  // Add more students for different grades
  users.push({
    _id: '4',
    username: 'student2',
    password: studentPassword,
    role: 'student',
    firstName: 'Мария',
    lastName: 'Сидорова',
    school: 'Школа №1',
    grade: '8',
    gradeSection: 'А',
    isTemporaryPassword: false
  });

  users.push({
    _id: '5',
    username: 'student3',
    password: studentPassword,
    role: 'student',
    firstName: 'Иван',
    lastName: 'Кузнецов',
    school: 'Школа №1',
    grade: '9',
    gradeSection: 'Б',
    isTemporaryPassword: false
  });

  users.push({
    _id: '6',
    username: 'student4',
    password: studentPassword,
    role: 'student',
    firstName: 'Анна',
    lastName: 'Васильева',
    school: 'Школа №1',
    grade: '7',
    gradeSection: 'В',
    isTemporaryPassword: false
  });

  // Initialize classes/grades
  classes.push(
    { _id: '1', grade: '7', sections: ['А', 'Б', 'В'], studentCount: 0 },
    { _id: '2', grade: '8', sections: ['А', 'Б', 'В'], studentCount: 0 },
    { _id: '3', grade: '9', sections: ['А', 'Б', 'В'], studentCount: 0 },
    { _id: '4', grade: '10', sections: ['А', 'Б'], studentCount: 0 },
    { _id: '5', grade: '11', sections: ['А', 'Б'], studentCount: 0 }
  );

  // Count students in each grade
  classes.forEach(cls => {
    cls.studentCount = users.filter(u => u.role === 'student' && u.grade === cls.grade).length;
  });

  initDefaultSubjects();

  // Initialize some demo modules
  modules.push(
    {
      _id: '1',
      subjectId: '1',
      nameRu: 'Алгебра',
      nameUz: 'Algebra',
      descriptionRu: 'Основы алгебры и линейные уравнения',
      descriptionUz: 'Algebra asoslari va chiziqli tenglamalar',
      createdBy: '2',
      createdAt: new Date().toISOString()
    },
    {
      _id: '2',
      subjectId: '1',
      nameRu: 'Геометрия',
      nameUz: 'Geometriya',
      descriptionRu: 'Планиметрия и стереометрия',
      descriptionUz: 'Planimetriya va stereometriya',
      createdBy: '2',
      createdAt: new Date().toISOString()
    },
    {
      _id: '3',
      subjectId: '2',
      nameRu: 'Механика',
      nameUz: 'Mexanika',
      descriptionRu: 'Кинематика и динамика',
      descriptionUz: 'Kinematika va dinamika',
      createdBy: '2',
      createdAt: new Date().toISOString()
    },
    {
      _id: '4',
      subjectId: '2',
      nameRu: 'Электричество',
      nameUz: 'Elektr',
      descriptionRu: 'Электростатика и электродинамика',
      descriptionUz: 'Elektrostatika va elektrodinamika',
      createdBy: '2',
      createdAt: new Date().toISOString()
    }
  );

  // Initialize demo tests with questions
  tests.push(
    {
      _id: '1',
      moduleId: '1',
      nameRu: 'Линейные уравнения',
      nameUz: 'Chiziqli tenglamalar',
      duration: 30,
      timeLimit: 15,
      maxScore: 100,
      status: 'published',
      questions: [
        {
          questionRu: 'Решите уравнение: 2x + 5 = 13',
          questionUz: '2x + 5 = 13 tenglamasini yeching',
          answers: [
            { textRu: 'x = 4', textUz: 'x = 4', isCorrect: true },
            { textRu: 'x = 3', textUz: 'x = 3', isCorrect: false },
            { textRu: 'x = 5', textUz: 'x = 5', isCorrect: false },
            { textRu: 'x = 6', textUz: 'x = 6', isCorrect: false }
          ]
        },
        {
          questionRu: 'Чему равно значение x в уравнении: 3x - 7 = 14?',
          questionUz: '3x - 7 = 14 tenglamasida x ning qiymati nechaga teng?',
          answers: [
            { textRu: 'x = 7', textUz: 'x = 7', isCorrect: true },
            { textRu: 'x = 5', textUz: 'x = 5', isCorrect: false },
            { textRu: 'x = 8', textUz: 'x = 8', isCorrect: false },
            { textRu: 'x = 6', textUz: 'x = 6', isCorrect: false }
          ]
        },
        {
          questionRu: 'Решите уравнение: 5x = 25',
          questionUz: '5x = 25 tenglamasini yeching',
          answers: [
            { textRu: 'x = 5', textUz: 'x = 5', isCorrect: true },
            { textRu: 'x = 20', textUz: 'x = 20', isCorrect: false },
            { textRu: 'x = 30', textUz: 'x = 30', isCorrect: false },
            { textRu: 'x = 10', textUz: 'x = 10', isCorrect: false }
          ]
        }
      ],
      assignedGrades: ['8'], // Тест доступен только для 8 класса
      createdBy: '2',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      _id: '2',
      moduleId: '3',
      nameRu: 'Законы Ньютона',
      nameUz: 'Nyuton qonunlari',
      duration: 25,
      timeLimit: 12,
      maxScore: 100,
      status: 'published',
      assignedGrades: ['9', '10', '11'], // Тест для 9-11 классов
      questions: [
        {
          questionRu: 'Первый закон Ньютона описывает:',
          questionUz: 'Nyutonning birinchi qonuni nimani tasvirlaydi:',
          answers: [
            { textRu: 'Инерцию тел', textUz: 'Jismlarning inertsiyasi', isCorrect: true },
            { textRu: 'Силу тяжести', textUz: 'Og\'irlik kuchi', isCorrect: false },
            { textRu: 'Скорость света', textUz: 'Yorug\'lik tezligi', isCorrect: false },
            { textRu: 'Ускорение', textUz: 'Tezlanish', isCorrect: false }
          ]
        },
        {
          questionRu: 'Формула второго закона Ньютона:',
          questionUz: 'Nyutonning ikkinchi qonuni formulasi:',
          answers: [
            { textRu: 'F = ma', textUz: 'F = ma', isCorrect: true },
            { textRu: 'E = mc²', textUz: 'E = mc²', isCorrect: false },
            { textRu: 'P = mv', textUz: 'P = mv', isCorrect: false },
            { textRu: 'W = Fs', textUz: 'W = Fs', isCorrect: false }
          ]
        }
      ],
      createdBy: '2',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  );

  // Add some demo test results
  const now = new Date();
  const daysAgo = (days) => new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString();

  testResults.push(
    // Student 1 (8A class) results
    {
      _id: 'r1',
      userId: '3',
      testId: '1',
      testName: 'Линейные уравнения',
      moduleId: '1',
      subjectId: '1',
      score: 67,
      correctCount: 2,
      totalCount: 3,
      timeTaken: 600,
      questionResults: [
        { questionIndex: 0, selectedAnswer: 0, isCorrect: true },
        { questionIndex: 1, selectedAnswer: 0, isCorrect: true },
        { questionIndex: 2, selectedAnswer: 1, isCorrect: false }
      ],
      completedAt: daysAgo(5)
    },
    {
      _id: 'r2',
      userId: '3',
      testId: '2',
      testName: 'Test 2',
      moduleId: '2',
      subjectId: '1',
      score: 90,
      correctCount: 2,
      totalCount: 2,
      timeTaken: 450,
      questionResults: [
        { questionIndex: 0, selectedAnswer: 0, isCorrect: true },
        { questionIndex: 1, selectedAnswer: 0, isCorrect: true }
      ],
      completedAt: daysAgo(3)
    },
    // Student 2 (8A class) results
    {
      _id: 'r3',
      userId: '4',
      testId: '1',
      testName: 'Линейные уравнения',
      moduleId: '1',
      subjectId: '1',
      score: 78,
      correctCount: 2,
      totalCount: 3,
      timeTaken: 720,
      questionResults: [
        { questionIndex: 0, selectedAnswer: 0, isCorrect: true },
        { questionIndex: 1, selectedAnswer: 1, isCorrect: false },
        { questionIndex: 2, selectedAnswer: 0, isCorrect: true }
      ],
      completedAt: daysAgo(4)
    },
    {
      _id: 'r4',
      userId: '4',
      testId: '2',
      testName: 'Test 2',
      moduleId: '2',
      subjectId: '1',
      score: 65,
      correctCount: 1,
      totalCount: 2,
      timeTaken: 380,
      questionResults: [
        { questionIndex: 0, selectedAnswer: 1, isCorrect: false },
        { questionIndex: 1, selectedAnswer: 0, isCorrect: true }
      ],
      completedAt: daysAgo(2)
    },
    // Student 3 (9B class) results
    {
      _id: 'r5',
      userId: '5',
      testId: '2',
      testName: 'Test 2',
      moduleId: '2',
      subjectId: '1',
      score: 95,
      correctCount: 2,
      totalCount: 2,
      timeTaken: 500,
      questionResults: [
        { questionIndex: 0, selectedAnswer: 0, isCorrect: true },
        { questionIndex: 1, selectedAnswer: 0, isCorrect: true }
      ],
      completedAt: daysAgo(1)
    },
    {
      _id: 'r6',
      userId: '5',
      testId: '2',
      testName: 'Test 2',
      moduleId: '2',
      subjectId: '1',
      score: 88,
      correctCount: 2,
      totalCount: 2,
      timeTaken: 480,
      questionResults: [
        { questionIndex: 0, selectedAnswer: 0, isCorrect: true },
        { questionIndex: 1, selectedAnswer: 0, isCorrect: true }
      ],
      completedAt: daysAgo(6)
    },
    // Student 4 (7C class) - not assigned to test 1, won't appear
    {
      _id: 'r7',
      userId: '6',
      testId: '2',
      testName: 'Test 2',
      moduleId: '2',
      subjectId: '1',
      score: 72,
      correctCount: 1,
      totalCount: 2,
      timeTaken: 650,
      questionResults: [
        { questionIndex: 0, selectedAnswer: 0, isCorrect: true },
        { questionIndex: 1, selectedAnswer: 2, isCorrect: false }
      ],
      completedAt: daysAgo(7)
    }
  );

  console.log('✅ Mock database initialized');
  console.log('📝 Login credentials:');
  console.log('   Admin: admin / admin123');
  console.log('   Teacher: teacher1 / teacher123');
  console.log('   Student: student1 / student123');
  console.log(`📦 Subjects: ${subjects.length}, Modules: ${modules.length}, Tests: ${tests.length}`);
  console.log(`🎓 Classes: ${classes.length}, Students: ${users.filter(u => u.role === 'student').length}`);
  console.log(`📊 Test results: ${testResults.length}`);
}

async function ensureAdminUser() {
  if (users.length > 0) return;
  const adminUsername = process.env.ADMIN_USERNAME || 'admin';
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
  const hashedPassword = await bcrypt.hash(adminPassword, 10);

  users.push({
    _id: '1',
    username: adminUsername,
    password: hashedPassword,
    role: 'admin',
    firstName: 'Администратор',
    lastName: 'Системы',
    school: '',
    isTemporaryPassword: false
  });

  console.log('✅ Bootstrap admin created');
  console.log(`   Admin: ${adminUsername} / ${adminPassword}`);
}

// Auth middleware
const auth = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  
  console.log('🔐 Auth middleware:', {
    hasToken: !!token,
    token: token ? token.substring(0, 20) + '...' : 'none'
  });
  
  if (!token) {
    console.log('❌ No token provided');
    return res.status(401).json({ message: 'No authentication token' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-super-secret-jwt-key');
    req.userId = decoded.userId;
    req.userRole = decoded.role;
    console.log('✅ Token valid:', { userId: req.userId, role: req.userRole });
    next();
  } catch (error) {
    console.log('❌ Token invalid:', error.message);
    res.status(401).json({ message: 'Invalid token' });
  }
};

// Routes

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password, role } = req.body;

    const user = users.find(u => u.username === username && u.role === role);
    
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check if using OTP
    if (user.isTemporaryPassword && user.requirePasswordChange) {
      const otpRecord = otpCodes.find(o => o.username === username && !o.used);
      
      if (!otpRecord) {
        return res.status(401).json({ message: 'OTP not found or already used' });
      }
      
      // Check OTP expiry
      if (new Date() > new Date(otpRecord.expiresAt)) {
        return res.status(401).json({ message: 'OTP has expired. Please contact administrator.' });
      }
      
      // Validate OTP
      const isOTPValid = await bcrypt.compare(password, user.password);
      if (!isOTPValid) {
        return res.status(401).json({ message: 'Invalid OTP' });
      }
      
      // OTP valid - mark as used and require password change
      otpRecord.used = true;
      otpRecord.usedAt = new Date().toISOString();
      
      const token = jwt.sign(
        { userId: user._id, role: user.role },
        process.env.JWT_SECRET || 'your-super-secret-jwt-key',
        { expiresIn: '1h' } // Short expiry for OTP login
      );
      
      return res.json({
        token,
        requirePasswordChange: true,
        user: {
          id: user._id,
          username: user.username,
          role: user.role,
          firstName: user.firstName,
          lastName: user.lastName,
          school: user.school,
          grade: user.grade,
          subjects: user.subjects || [],
          isTemporaryPassword: true
        }
      });
    }

    // Normal password check
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET || 'your-super-secret-jwt-key',
      { expiresIn: '7d' }
    );

    res.json({
      token,
      requirePasswordChange: user.requirePasswordChange || false,
      user: {
        id: user._id,
        username: user.username,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        school: user.school,
        grade: user.grade,
        subjects: user.subjects || [],
        isTemporaryPassword: user.isTemporaryPassword || false
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Change password
app.post('/api/auth/change-password', auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    const user = users.find(u => u._id === req.userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.isTemporaryPassword = false;
    user.requirePasswordChange = false;

    console.log(`✅ Password changed for user: ${user.username}`);
    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get all subjects
app.get('/api/subjects', auth, (req, res) => {
  res.json(subjects);
});

// Create subject (admin only)
app.post('/api/subjects', auth, (req, res) => {
  if (req.userRole !== 'admin') {
    return res.status(403).json({ message: 'Access denied' });
  }

  const { nameRu, nameUz, questionsCount } = req.body || {};

  if (!nameRu || !nameUz) {
    return res.status(400).json({ message: 'Заполните обязательные поля' });
  }

  const exists = subjects.find(
    s => s.nameRu?.toLowerCase() === nameRu.toLowerCase() || s.nameUz?.toLowerCase() === nameUz.toLowerCase()
  );
  if (exists) {
    return res.status(400).json({ message: 'Предмет уже существует' });
  }

  const newSubject = {
    _id: Date.now().toString(),
    nameRu: nameRu.trim(),
    nameUz: nameUz.trim(),
    questionsCount: Number.isFinite(Number(questionsCount)) ? Number(questionsCount) : 0
  };

  subjects.push(newSubject);
  res.json({ success: true, data: newSubject });
});

// Update subject (admin only)
app.put('/api/subjects/:subjectId', auth, (req, res) => {
  if (req.userRole !== 'admin') {
    return res.status(403).json({ message: 'Access denied' });
  }

  const { subjectId } = req.params;
  const subject = subjects.find(s => s._id === subjectId);
  if (!subject) {
    return res.status(404).json({ message: 'Subject not found' });
  }

  const { nameRu, nameUz, questionsCount } = req.body || {};
  if (!nameRu || !nameUz) {
    return res.status(400).json({ message: 'Заполните обязательные поля' });
  }

  subject.nameRu = nameRu.trim();
  subject.nameUz = nameUz.trim();
  if (Number.isFinite(Number(questionsCount))) {
    subject.questionsCount = Number(questionsCount);
  }

  res.json({ success: true, data: subject });
});

// Delete subject (admin only)
app.delete('/api/subjects/:subjectId', auth, (req, res) => {
  if (req.userRole !== 'admin') {
    return res.status(403).json({ message: 'Access denied' });
  }

  const { subjectId } = req.params;
  const subjectIndex = subjects.findIndex(s => s._id === subjectId);
  if (subjectIndex === -1) {
    return res.status(404).json({ message: 'Subject not found' });
  }

  const removedSubject = subjects.splice(subjectIndex, 1)[0];

  // Remove related modules and tests
  const moduleIdsToRemove = modules.filter(m => m.subjectId === subjectId).map(m => m._id);
  for (let i = modules.length - 1; i >= 0; i--) {
    if (modules[i].subjectId === subjectId) {
      modules.splice(i, 1);
    }
  }

  for (let i = tests.length - 1; i >= 0; i--) {
    if (moduleIdsToRemove.includes(tests[i].moduleId)) {
      tests.splice(i, 1);
    }
  }

  res.json({ success: true, data: removedSubject });
});

// Get all users (admin only)
app.get('/api/users', auth, (req, res) => {
  if (req.userRole !== 'admin') {
    return res.status(403).json({ message: 'Access denied' });
  }

  let usersData = users.map(({ password, ...user }) => user);
  
  // Filter by role if specified
  const { role } = req.query;
  if (role) {
    usersData = usersData.filter(u => u.role === role);
  }
  
  res.json({ success: true, data: usersData });
});

// Get current user profile (any authenticated user)
app.get('/api/users/me', auth, (req, res) => {
  try {
    console.log('📝 GET /api/users/me - User ID:', req.userId);
    const user = users.find(u => u._id === req.userId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'Пользователь не найден' });
    }
    
    // Don't send password
    const { password, ...userProfile } = user;
    res.json({ success: true, data: userProfile });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Ошибка при загрузке профиля' });
  }
});

// Get single user (admin only)
app.get('/api/users/:userId', auth, (req, res) => {
  if (req.userRole !== 'admin') {
    return res.status(403).json({ message: 'Access denied' });
  }

  const user = users.find(u => u._id === req.params.userId);
  if (!user) {
    return res.status(404).json({ success: false, error: 'User not found' });
  }

  const { password, ...userWithoutPassword } = user;
  res.json({ success: true, data: userWithoutPassword });
});

// Get student profile for teacher (own classes only)
app.get('/api/teachers/students/:studentId', auth, (req, res) => {
  try {
    const { studentId } = req.params;

    if (req.userRole !== 'admin' && req.userRole !== 'teacher') {
      return res.status(403).json({ success: false, error: 'Доступ запрещен' });
    }

    const student = users.find(u => u._id === studentId && u.role === 'student');
    if (!student) {
      return res.status(404).json({ success: false, error: 'Ученик не найден' });
    }

    if (req.userRole === 'teacher' && !canTeacherAccessStudent(req.userId, student)) {
      return res.status(403).json({ success: false, error: 'Доступ запрещен' });
    }

    const { password, ...studentProfile } = student;
    res.json({ success: true, data: studentProfile });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Ошибка при загрузке профиля ученика' });
  }
});

// Register new user (admin only)
app.post('/api/users/register', async (req, res) => {
  try {
    const body = req.body || {};
    const { username, role, firstName, lastName, school, grade, gradeSection, subjects, homeroomClassId, classTeacherId } = body;

    if (!username || !role || !firstName || !lastName) {
      return res.status(400).json({ success: false, error: 'Заполните обязательные поля' });
    }
    
    // Check if user exists
    if (users.find(u => u.username === username)) {
      return res.status(400).json({ success: false, error: 'Пользователь уже существует' });
    }
    
    // Generate OTP for new user
    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
    const hashedOTP = await bcrypt.hash(otp, 10);
    
    const newUser = {
      _id: Date.now().toString(),
      username,
      password: hashedOTP, // OTP as initial password
      role,
      firstName,
      lastName,
      school: school || 'School',
      isTemporaryPassword: true,
      requirePasswordChange: true
    };
    
    // Add role-specific fields
    if (role === 'student') {
      const normalizedGrade = (grade || '9').toString().trim();
      const normalizedSection = (gradeSection || 'А').toString().trim();

      newUser.grade = normalizedGrade;
      newUser.gradeSection = normalizedSection || 'А';
      
      // Auto-create or update class
      if (normalizedGrade && normalizedSection) {
        let classObj = classes.find(c => c.grade === normalizedGrade);
        
        if (!classObj) {
          // Create new class
          classObj = {
            _id: Date.now().toString(),
            grade: normalizedGrade,
            sections: [normalizedSection],
            studentCount: 1,
            createdAt: new Date().toISOString()
          };
          if (classTeacherId) {
            classObj.teacherId = classTeacherId;
          }
          classes.push(classObj);
          console.log(`✅ Auto-created class: ${normalizedGrade}-${normalizedSection}`);
        } else {
          if (!Array.isArray(classObj.sections)) {
            classObj.sections = [];
          }
          // Update existing class
          if (!classObj.sections.includes(normalizedSection)) {
            classObj.sections.push(normalizedSection);
          }
          // Recalculate student count
          classObj.studentCount = users.filter(u => u.role === 'student' && u.grade === normalizedGrade).length + 1;
          if (classTeacherId) {
            classObj.teacherId = classTeacherId;
          }
          console.log(`✅ Updated class ${normalizedGrade}: added section ${normalizedSection}`);
        }
      }
    } else if (role === 'teacher') {
      const normalizedSubjects = Array.isArray(subjects)
        ? subjects
            .map(s => s?.id || s?._id || s?.subjectId || s)
            .filter(Boolean)
        : [];
      newUser.subjects = normalizedSubjects;

      if (homeroomClassId) {
        const classItem = findClassById(homeroomClassId);
        if (classItem) {
          classItem.teacherId = newUser._id;
        }
      }
    }
    
    // Store OTP with expiry
    otpCodes.push({
      userId: newUser._id,
      username: newUser.username,
      otp: otp,
      hashedOTP: hashedOTP,
      expiresAt: otpExpiry,
      used: false
    });
    
    users.push(newUser);
    
    console.log(`🔑 OTP generated for ${username}: ${otp} (expires: ${otpExpiry.toISOString()})`);
    
    const { password: _, ...userWithoutPassword } = newUser;
    res.status(201).json({ 
      success: true, 
      data: { 
        ...userWithoutPassword,
        otp: otp, // Return OTP to admin
        otpExpiresAt: otpExpiry 
      } 
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ success: false, error: 'Ошибка при создании пользователя' });
  }
});

// Update user (admin only)
app.put('/api/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { username, firstName, lastName, role, school, grade, subjects } = req.body;
    
    const userIndex = users.findIndex(u => u._id === id);
    
    if (userIndex === -1) {
      return res.status(404).json({ success: false, error: 'Пользователь не найден' });
    }
    
    // Check if new username already exists (if username changed)
    if (users[userIndex].username !== username) {
      const existingUser = users.find(u => u.username === username && u._id !== id);
      if (existingUser) {
        return res.status(400).json({ success: false, error: 'Пользователь с таким логином уже существует' });
      }
    }
    
    users[userIndex].username = username;
    users[userIndex].firstName = firstName;
    users[userIndex].lastName = lastName;
    users[userIndex].role = role;
    
    // Update role-specific fields
    if (school) {
      users[userIndex].school = school;
    }
    if (role === 'student' && grade) {
      users[userIndex].grade = grade;
      // Remove subjects if changing to student
      delete users[userIndex].subjects;
    } else if (role === 'teacher' && subjects) {
      users[userIndex].subjects = subjects;
      // Remove grade if changing to teacher
      delete users[userIndex].grade;
    } else if (role === 'admin') {
      // Remove both grade and subjects for admin
      delete users[userIndex].grade;
      delete users[userIndex].subjects;
    }
    
    const { password: _, ...userWithoutPassword } = users[userIndex];
    res.json({ success: true, data: userWithoutPassword });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Ошибка при обновлении пользователя' });
  }
});

// Delete user (admin only)
app.delete('/api/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const userIndex = users.findIndex(u => u._id === id);
    
    if (userIndex === -1) {
      return res.status(404).json({ success: false, error: 'Пользователь не найден' });
    }
    
    const deletedUser = users.splice(userIndex, 1)[0];
    
    const { password: _, ...userWithoutPassword } = deletedUser;
    res.json({ success: true, data: userWithoutPassword, message: 'Пользователь удален' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Ошибка при удалении пользователя' });
  }
});

// Reset user password (admin only)
app.post('/api/users/:id/reset-password', auth, async (req, res) => {
  try {
    if (req.userRole !== 'admin') {
      return res.status(403).json({ success: false, error: 'Доступ запрещен' });
    }

    const { id } = req.params;
    
    const user = users.find(u => u._id === id);
    
    if (!user) {
      return res.status(404).json({ success: false, error: 'Пользователь не найден' });
    }
    
    // Generate OTP code
    const otpCode = generateOTP();
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
    
    // Hash the OTP code
    const hashedPassword = await bcrypt.hash(otpCode, 10);
    
    // Update user password to OTP
    user.password = hashedPassword;
    user.requirePasswordChange = true;
    user.isTemporaryPassword = true;
    
    // Store OTP code
    otpCodes.push({
      code: otpCode,
      userId: user._id,
      username: user.username,
      expiresAt,
      used: false
    });
    
    console.log(`🔑 Password reset for user: ${user.username}, OTP: ${otpCode}`);
    
    res.json({ 
      success: true, 
      message: 'Пароль успешно сброшен',
      otp: otpCode,
      expiresAt: expiresAt.toISOString()
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ success: false, error: 'Ошибка при сбросе пароля' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Mock server is running (no MongoDB required)' });
});

// ========================================
// MODULES API
// ========================================

// Get all modules for a subject
app.get('/api/subjects/:subjectId/modules', auth, (req, res) => {
  try {
    const { subjectId } = req.params;
    const user = users.find(u => u._id === req.userId);

    if (user?.role === 'teacher' && !teacherHasSubject(user, subjectId)) {
      return res.status(403).json({ success: false, error: 'Доступ запрещен' });
    }
    console.log(`📚 Загрузка модулей для предмета: ${subjectId}`);
    console.log(`📊 Всего модулей в базе: ${modules.length}`);
    const subjectModules = modules.filter(m => m.subjectId === subjectId);
    console.log(`✅ Найдено модулей: ${subjectModules.length}`);
    if (subjectModules.length > 0) {
      console.log('📝 Модули:', subjectModules.map(m => m.nameRu).join(', '));
    }
    res.json({ success: true, data: subjectModules });
  } catch (error) {
    console.error('❌ Ошибка загрузки модулей:', error);
    res.status(500).json({ success: false, error: 'Ошибка при загрузке модулей' });
  }
});

// Create module
app.post('/api/subjects/:subjectId/modules', auth, (req, res) => {
  try {
    if (req.userRole !== 'teacher' && req.userRole !== 'admin') {
      return res.status(403).json({ success: false, error: 'Доступ запрещен' });
    }

    const { subjectId } = req.params;
    const { nameRu, nameUz, descriptionRu, descriptionUz } = req.body;
    const user = users.find(u => u._id === req.userId);

    if (user?.role === 'teacher' && !teacherHasSubject(user, subjectId)) {
      return res.status(403).json({ success: false, error: 'Доступ запрещен' });
    }
    
    console.log(`➕ Создание нового модуля для предмета: ${subjectId}`);
    console.log(`📝 Название: ${nameRu} / ${nameUz}`);
    
    const newModule = {
      _id: (modules.length + 1).toString(),
      subjectId,
      nameRu,
      nameUz,
      descriptionRu,
      descriptionUz,
      createdBy: req.userId,
      createdAt: new Date().toISOString()
    };
    
    modules.push(newModule);
    console.log(`✅ Модуль создан с ID: ${newModule._id}. Всего модулей: ${modules.length}`);
    res.status(201).json({ success: true, data: newModule });
  } catch (error) {
    console.error('❌ Ошибка создания модуля:', error);
    res.status(500).json({ success: false, error: 'Ошибка при создании модуля' });
  }
});

// Update module
app.put('/api/modules/:moduleId', auth, (req, res) => {
  try {
    if (req.userRole !== 'teacher' && req.userRole !== 'admin') {
      return res.status(403).json({ success: false, error: 'Доступ запрещен' });
    }

    const { moduleId } = req.params;
    const { nameRu, nameUz, descriptionRu, descriptionUz } = req.body;
    
    const moduleIndex = modules.findIndex(m => m._id === moduleId);
    
    if (moduleIndex === -1) {
      return res.status(404).json({ success: false, error: 'Модуль не найден' });
    }
    
    console.log(`✏️ Обновление модуля: ${moduleId}`);
    
    modules[moduleIndex] = {
      ...modules[moduleIndex],
      nameRu: nameRu || modules[moduleIndex].nameRu,
      nameUz: nameUz || modules[moduleIndex].nameUz,
      descriptionRu: descriptionRu || modules[moduleIndex].descriptionRu,
      descriptionUz: descriptionUz || modules[moduleIndex].descriptionUz,
      updatedAt: new Date().toISOString()
    };
    
    console.log(`✅ Модуль обновлен`);
    res.json({ success: true, data: modules[moduleIndex] });
  } catch (error) {
    console.error('❌ Ошибка обновления модуля:', error);
    res.status(500).json({ success: false, error: 'Ошибка при обновлении модуля' });
  }
});

// Delete module
app.delete('/api/modules/:moduleId', auth, (req, res) => {
  try {
    if (req.userRole !== 'teacher' && req.userRole !== 'admin') {
      return res.status(403).json({ success: false, error: 'Доступ запрещен' });
    }

    const { moduleId } = req.params;
    const moduleIndex = modules.findIndex(m => m._id === moduleId);
    
    if (moduleIndex === -1) {
      return res.status(404).json({ success: false, error: 'Модуль не найден' });
    }
    
    // Delete all tests in this module
    const moduleTestIds = tests.filter(t => t.moduleId === moduleId).map(t => t._id);
    moduleTestIds.forEach(testId => {
      // Delete test results and progress for these tests
      const resultIndexes = testResults.map((r, i) => r.testId === testId ? i : -1).filter(i => i !== -1).reverse();
      resultIndexes.forEach(i => testResults.splice(i, 1));
      
      const progressIndexes = testProgress.map((p, i) => p.testId === testId ? i : -1).filter(i => i !== -1).reverse();
      progressIndexes.forEach(i => testProgress.splice(i, 1));
    });
    
    // Delete tests
    const testIndexes = tests.map((t, i) => t.moduleId === moduleId ? i : -1).filter(i => i !== -1).reverse();
    testIndexes.forEach(i => tests.splice(i, 1));
    
    // Delete module
    modules.splice(moduleIndex, 1);
    
    res.json({ success: true, message: 'Модуль успешно удален' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Ошибка при удалении модуля' });
  }
});

// ========================================
// TESTS API
// ========================================

// Get module by ID
app.get('/api/modules/:moduleId', auth, (req, res) => {
  try {
    const { moduleId } = req.params;
    const module = modules.find(m => m._id === moduleId);
    
    if (!module) {
      return res.status(404).json({ success: false, error: 'Модуль не найден' });
    }
    
    res.json({ success: true, data: module });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Ошибка при загрузке модуля' });
  }
});

// Get all tests for a module
app.get('/api/modules/:moduleId/tests', auth, (req, res) => {
  try {
    const { moduleId } = req.params;
    const user = users.find(u => u._id === req.userId);
    const moduleItem = modules.find(m => m._id === moduleId);

    if (user?.role === 'teacher' && moduleItem && !teacherHasSubject(user, moduleItem.subjectId)) {
      return res.status(403).json({ success: false, error: 'Доступ запрещен' });
    }
    
    console.log(`🔍 Getting tests for module: ${moduleId}`);
    console.log(`👤 User: ${user?.username} (${user?.role}) - Grade: ${user?.grade}`);
    console.log(`📚 Total tests in database: ${tests.length}`);
    
    let moduleTests = tests.filter(t => t.moduleId === moduleId);
    
    // Filter by grade if student
    if (user?.role === 'student' && user.grade) {
      moduleTests = moduleTests.filter(t => {
        // If no assignedGrades, test is available to all
        if (!t.assignedGrades || t.assignedGrades.length === 0) {
          return true;
        }
        const isAvailable = t.assignedGrades.includes(user.grade);
        console.log(`📝 Test "${t.nameRu}" - Assigned to: [${t.assignedGrades}] - Available: ${isAvailable}`);
        return isAvailable;
      });
    }
    
    console.log(`✅ Found ${moduleTests.length} tests for module ${moduleId}`);
    
    // Don't send questions to students viewing list
    const testsForList = moduleTests.map(t => {
      const { questions, ...testInfo } = t;
      return {
        ...testInfo,
        questionsCount: questions ? questions.length : 0
      };
    });
    
    console.log(`📤 Returning: ${JSON.stringify(testsForList)}`);
    res.json({ success: true, data: testsForList });
  } catch (error) {
    console.error(`❌ Error loading tests: ${error.message}`);
    res.status(500).json({ success: false, error: 'Ошибка при загрузке тестов' });
  }
});

// Get all tests (for admin dashboard)
app.get('/api/tests', auth, (req, res) => {
  try {
    console.log(`🔍 Getting all tests for admin`);
    
    // Return basic test info without questions
    const testsForList = tests.map(t => {
      const { questions, ...testInfo } = t;
      return {
        ...testInfo,
        questionsCount: questions ? questions.length : 0
      };
    });
    
    console.log(`✅ Returning ${testsForList.length} tests`);
    res.json({ success: true, data: testsForList });
  } catch (error) {
    console.error(`❌ Error loading tests: ${error.message}`);
    res.status(500).json({ success: false, error: 'Ошибка при загрузке тестов' });
  }
});

// Get single test with questions (for teacher - original order)
app.get('/api/tests/:testId', auth, (req, res) => {
  try {
    const { testId } = req.params;
    const test = tests.find(t => t._id === testId);
    
    if (!test) {
      return res.status(404).json({ success: false, error: 'Тест не найден' });
    }
    
    res.json({ success: true, data: test });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Ошибка при загрузке теста' });
  }
});

// Get randomized test for student
app.get('/api/tests/:testId/start', auth, (req, res) => {
  try {
    const { testId } = req.params;
    const test = tests.find(t => t._id === testId);
    
    if (!test) {
      return res.status(404).json({ success: false, error: 'Тест не найден' });
    }
    
    if (test.status !== 'published') {
      return res.status(403).json({ success: false, error: 'Тест еще не опубликован' });
    }
    
    // Shuffle questions
    const shuffledQuestions = [...test.questions]
      .map(q => ({
        ...q,
        // Shuffle answers while keeping track of correct ones
        answers: [...q.answers]
          .map((a, idx) => ({ ...a, originalIndex: idx }))
          .sort(() => Math.random() - 0.5)
      }))
      .sort(() => Math.random() - 0.5);
    
    const randomizedTest = {
      ...test,
      questions: shuffledQuestions
    };
    
    res.json({ success: true, data: randomizedTest });
  } catch (error) {
    console.error('Error randomizing test:', error);
    res.status(500).json({ success: false, error: 'Ошибка при загрузке теста' });
  }
});

// Create test
app.post('/api/modules/:moduleId/tests', auth, (req, res) => {
  try {
    if (req.userRole !== 'teacher' && req.userRole !== 'admin') {
      return res.status(403).json({ success: false, error: 'Доступ запрещен' });
    }

    const { moduleId } = req.params;
    const { nameRu, nameUz, duration, timeLimit, maxScore, status, questions, assignedGrades } = req.body;
    const user = users.find(u => u._id === req.userId);
    const moduleItem = modules.find(m => m._id === moduleId);

    if (user?.role === 'teacher' && moduleItem && !teacherHasSubject(user, moduleItem.subjectId)) {
      return res.status(403).json({ success: false, error: 'Доступ запрещен' });
    }

    const existingTest = tests.find(t => t.moduleId === moduleId);
    if (existingTest) {
      return res.status(400).json({ success: false, error: 'В модуле уже есть тест' });
    }
    
    console.log(`➕ Создание теста в модуле ${moduleId}: ${nameRu}`);
    console.log(`📋 Assigned grades: ${assignedGrades}`);
    
    const newTest = {
      _id: (tests.length + 1).toString(),
      moduleId,
      nameRu,
      nameUz,
      duration: duration || null,
      timeLimit: timeLimit || null,
      maxScore: maxScore || 100,
      status: status || 'draft', // draft or published
      questions: questions || [], // Array of { questionRu, questionUz, answers: [{ textRu, textUz, isCorrect }] }
      assignedGrades: assignedGrades || [], // Empty means available to all
      createdBy: req.userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    tests.push(newTest);
    console.log(`✅ Тест создан с ID: ${newTest._id}`);
    res.status(201).json({ success: true, data: newTest });
  } catch (error) {
    console.error('❌ Ошибка создания теста:', error);
    res.status(500).json({ success: false, error: 'Ошибка при создании теста' });
  }
});

// Update test
app.put('/api/tests/:testId', auth, (req, res) => {
  try {
    if (req.userRole !== 'teacher' && req.userRole !== 'admin') {
      return res.status(403).json({ success: false, error: 'Доступ запрещен' });
    }

    const { testId } = req.params;
    const testIndex = tests.findIndex(t => t._id === testId);
    
    if (testIndex === -1) {
      return res.status(404).json({ success: false, error: 'Тест не найден' });
    }
    
    const updates = req.body;
    tests[testIndex] = {
      ...tests[testIndex],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    
    res.json({ success: true, data: tests[testIndex] });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Ошибка при обновлении теста' });
  }
});

// Delete test
app.delete('/api/tests/:testId', auth, (req, res) => {
  try {
    if (req.userRole !== 'teacher' && req.userRole !== 'admin') {
      return res.status(403).json({ success: false, error: 'Доступ запрещен' });
    }

    const { testId } = req.params;
    const testIndex = tests.findIndex(t => t._id === testId);
    
    if (testIndex === -1) {
      return res.status(404).json({ success: false, error: 'Тест не найден' });
    }
    
    const deletedTest = tests.splice(testIndex, 1)[0];
    res.json({ success: true, message: 'Тест удален' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Ошибка при удалении теста' });
  }
});

// ========================================
// TEST RESULTS API
// ========================================

// Get test results for student
app.get('/api/tests/:testId/results', auth, (req, res) => {
  try {
    const { testId } = req.params;
    const studentResults = testResults.filter(r => r.testId === testId && r.userId === req.userId);
    res.json({ success: true, data: studentResults });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Ошибка при загрузке результатов' });
  }
});

// Save test progress
app.post('/api/tests/:testId/progress', auth, (req, res) => {
  try {
    const { testId } = req.params;
    const { currentQuestion, answers } = req.body;
    
    const progressIndex = testProgress.findIndex(p => p.testId === testId && p.userId === req.userId);
    
    const progress = {
      testId,
      userId: req.userId,
      currentQuestion,
      answers,
      savedAt: new Date().toISOString()
    };
    
    if (progressIndex !== -1) {
      testProgress[progressIndex] = progress;
    } else {
      testProgress.push(progress);
    }
    
    res.json({ success: true, data: progress });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Ошибка при сохранении прогресса' });
  }
});

// Get test progress
app.get('/api/tests/:testId/progress', auth, (req, res) => {
  try {
    const { testId } = req.params;
    const progress = testProgress.find(p => p.testId === testId && p.userId === req.userId);
    res.json({ success: true, data: progress || null });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Ошибка при загрузке прогресса' });
  }
});

// Submit test results
app.post('/api/tests/:testId/submit', auth, (req, res) => {
  try {
    const { testId } = req.params;
    const { answers, timeTaken } = req.body;

    console.log(`📝 Submitting test ${testId} by user ${req.userId}`);
    console.log(`📥 Received answers:`, answers);
    console.log(`⏱️ Time taken:`, timeTaken);

    // Find test
    const test = tests.find(t => t._id === testId);
    if (!test) {
      console.error(`❌ Test not found: ${testId}`);
      return res.status(404).json({ success: false, error: 'Тест не найден' });
    }

    console.log(`✅ Test found with ${test.questions.length} questions`);

    // Calculate score
    let correctCount = 0;
    const questionResults = test.questions.map((question, idx) => {
      const userAnswerIdx = answers[idx];
      const isCorrect = userAnswerIdx !== undefined && question.answers[userAnswerIdx]?.isCorrect;
      if (isCorrect) correctCount++;
      
      console.log(`Q${idx}: userAnswer=${userAnswerIdx}, correct=${isCorrect}`);
      
      return {
        questionIndex: idx,
        questionRu: question.questionRu,
        questionUz: question.questionUz,
        userAnswerIndex: userAnswerIdx,
        userAnswerText: userAnswerIdx !== undefined ? question.answers[userAnswerIdx] : null,
        correctAnswerIndex: question.answers.findIndex(a => a.isCorrect),
        correctAnswerText: question.answers.find(a => a.isCorrect),
        isCorrect
      };
    });

    const score = Math.round((correctCount / test.questions.length) * 100);

    // Find module to get subjectId
    const module = modules.find(m => m._id === test.moduleId);
    const subjectId = module ? module.subjectId : null;
    
    console.log('📦 Module found:', module);
    console.log('📚 SubjectId:', subjectId);
    
    // Save result
    const result = {
      _id: String(testResults.length + 1),
      userId: req.userId,
      testId,
      testName: test.nameRu,
      moduleId: test.moduleId,
      subjectId,
      score,
      correctCount,
      totalCount: test.questions.length,
      timeTaken,
      questionResults,
      completedAt: new Date().toISOString()
    };

    testResults.push(result);

    // Remove progress after submission
    const progressIdx = testProgress.findIndex(p => p.testId === testId && p.userId === req.userId);
    if (progressIdx !== -1) {
      testProgress.splice(progressIdx, 1);
    }

    console.log(`✅ Test result saved: ${testId} - Score: ${correctCount}/${test.questions.length}`);
    console.log('📋 Result object:', JSON.stringify({
      testId: result.testId,
      score: result.score,
      correctCount: result.correctCount,
      totalCount: result.totalCount,
      hasQuestionResults: !!result.questionResults,
      questionResultsLength: result.questionResults ? result.questionResults.length : 0
    }));
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('❌ Error submitting test:', error);
    res.status(500).json({ success: false, error: 'Ошибка при сохранении результата' });
  }
});

// Get all test results for student
app.get('/api/test-results', auth, (req, res) => {
  try {
    const studentResults = testResults.filter(r => r.userId === req.userId);
    const sorted = studentResults.sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));
    res.json({ success: true, data: sorted });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Ошибка при загрузке результатов' });
  }
});

// Get specific test result details
app.get('/api/test-results/:resultId', auth, (req, res) => {
  try {
    const { resultId } = req.params;
    const result = testResults.find(r => r._id === resultId && r.userId === req.userId);
    
    if (!result) {
      return res.status(404).json({ success: false, error: 'Результат не найден' });
    }

    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Ошибка при загрузке результата' });
  }
});

// ========================================
// CLASSES/GRADES API
// ========================================

// Get teacher analytics/statistics
app.get('/api/teacher/analytics', auth, (req, res) => {
  try {
    if (req.userRole !== 'teacher') {
      return res.status(403).json({ success: false, error: 'Доступ запрещен' });
    }
    
    const teacher = users.find(u => u._id === req.userId);
    if (!teacher) {
      return res.status(404).json({ success: false, error: 'Учитель не найден' });
    }

    // Get teacher's modules and tests
    const teacherModules = modules.filter(m => m.createdBy === req.userId);
    const teacherTests = tests.filter(t => {
      const module = modules.find(m => m._id === t.moduleId);
      return module && module.createdBy === req.userId;
    });

    // Get all results for teacher's tests
    const teacherTestIds = teacherTests.map(t => t._id);
    const allResults = testResults.filter(r => teacherTestIds.includes(r.testId));

    // Calculate statistics by class
    const statsByClass = {};
    classes.forEach(cls => {
      const gradeStudents = users.filter(u => u.role === 'student' && u.grade === cls.grade);
      const gradeResults = allResults.filter(r => {
        const student = users.find(u => u._id === r.userId);
        return student && student.grade === cls.grade;
      });

      statsByClass[cls.grade] = {
        grade: cls.grade,
        studentCount: gradeStudents.length,
        completedTests: gradeResults.length,
        averageScore: gradeResults.length > 0 
          ? Math.round(gradeResults.reduce((sum, r) => sum + r.score, 0) / gradeResults.length)
          : 0
      };
    });

    // Calculate statistics by subject
    const statsBySubject = {};
    teacherModules.forEach(module => {
      const subject = subjects.find(s => s._id === module.subjectId);
      if (!subject) return;

      const subjectTests = teacherTests.filter(t => t.moduleId === module._id);
      const subjectTestIds = subjectTests.map(t => t._id);
      const subjectResults = allResults.filter(r => subjectTestIds.includes(r.testId));

      const subjectName = subject.nameRu;
      if (!statsBySubject[subjectName]) {
        statsBySubject[subjectName] = {
          subject: subjectName,
          testsCount: 0,
          completedCount: 0,
          averageScore: 0,
          totalScores: []
        };
      }

      statsBySubject[subjectName].testsCount += subjectTests.length;
      statsBySubject[subjectName].completedCount += subjectResults.length;
      statsBySubject[subjectName].totalScores.push(...subjectResults.map(r => r.score));
    });

    // Calculate average score for each subject
    Object.keys(statsBySubject).forEach(subjectName => {
      const scores = statsBySubject[subjectName].totalScores;
      statsBySubject[subjectName].averageScore = scores.length > 0
        ? Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length)
        : 0;
      delete statsBySubject[subjectName].totalScores;
    });

    // Recent test completions (last 10)
    const recentCompletions = allResults
      .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt))
      .slice(0, 10)
      .map(result => {
        const student = users.find(u => u._id === result.userId);
        const test = tests.find(t => t._id === result.testId);
        const module = test ? modules.find(m => m._id === test.moduleId) : null;
        const subject = module ? subjects.find(s => s._id === module.subjectId) : null;

        return {
          studentName: student ? `${student.firstName} ${student.lastName}` : 'Unknown',
          studentGrade: student ? student.grade : 'N/A',
          testName: test ? test.nameRu : 'Unknown',
          subjectName: subject ? subject.nameRu : 'Unknown',
          score: result.score,
          submittedAt: result.submittedAt
        };
      });

    // Top performing students
    const studentScores = {};
    allResults.forEach(result => {
      if (!studentScores[result.userId]) {
        studentScores[result.userId] = { scores: [], count: 0 };
      }
      studentScores[result.userId].scores.push(result.score);
      studentScores[result.userId].count++;
    });

    const topStudents = Object.entries(studentScores)
      .map(([userId, data]) => {
        const student = users.find(u => u._id === userId);
        const avgScore = Math.round(data.scores.reduce((sum, s) => sum + s, 0) / data.count);
        return {
          name: student ? `${student.firstName} ${student.lastName}` : 'Unknown',
          grade: student ? student.grade : 'N/A',
          averageScore: avgScore,
          testsCompleted: data.count
        };
      })
      .sort((a, b) => b.averageScore - a.averageScore)
      .slice(0, 5);

    res.json({
      success: true,
      data: {
        totalModules: teacherModules.length,
        totalTests: teacherTests.length,
        totalCompletions: allResults.length,
        averageScore: allResults.length > 0
          ? Math.round(allResults.reduce((sum, r) => sum + r.score, 0) / allResults.length)
          : 0,
        statsByClass: Object.values(statsByClass),
        statsBySubject: Object.values(statsBySubject),
        recentCompletions,
        topStudents
      }
    });
  } catch (error) {
    console.error('Error loading teacher analytics:', error);
    res.status(500).json({ success: false, error: 'Ошибка при загрузке аналитики' });
  }
});

// ===== CONTROL TESTS ENDPOINTS =====

// Get all control tests
app.get('/api/control-tests', auth, (req, res) => {
  try {
    const { createdBy, assignedTo } = req.query;
    let result = controlTests;
    
    if (createdBy) {
      result = result.filter(t => t.createdBy === createdBy);
    }
    if (assignedTo) {
      result = result.filter(t => t.assignedClasses && t.assignedClasses.includes(assignedTo));
    }
    
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error fetching control tests:', error);
    res.status(500).json({ success: false, error: 'Ошибка при загрузке контрольных работ' });
  }
});

// Get control test by ID
app.get('/api/control-tests/:testId', auth, (req, res) => {
  try {
    const { testId } = req.params;
    const test = controlTests.find(t => t._id === testId);
    
    if (!test) {
      return res.status(404).json({ success: false, error: 'Контрольная работа не найдена' });
    }
    
    res.json({ success: true, data: test });
  } catch (error) {
    console.error('Error fetching control test:', error);
    res.status(500).json({ success: false, error: 'Ошибка при загрузке контрольной работы' });
  }
});

// Create control test (teacher only)
app.post('/api/control-tests', auth, (req, res) => {
  try {
    if (req.userRole !== 'teacher') {
      return res.status(403).json({ success: false, error: 'Доступно только учителям' });
    }

    const { nameRu, nameUz, descriptionRu, descriptionUz, duration, maxScore, questions, assignedClasses } = req.body;

    const newTest = {
      _id: Date.now().toString(),
      nameRu,
      nameUz,
      descriptionRu,
      descriptionUz,
      duration: duration || 30,
      maxScore: maxScore || 100,
      questions: questions || [],
      assignedClasses: assignedClasses || [], // Array of grade/section combinations
      createdBy: req.userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    controlTests.push(newTest);
    console.log(`📋 Teacher created control test: ${newTest._id}`);
    res.status(201).json({ success: true, data: newTest });
  } catch (error) {
    console.error('Error creating control test:', error);
    res.status(500).json({ success: false, error: 'Ошибка при создании контрольной работы' });
  }
});

// Update control test (teacher only - creator)
app.put('/api/control-tests/:testId', auth, (req, res) => {
  try {
    const { testId } = req.params;
    const test = controlTests.find(t => t._id === testId);

    if (!test) {
      return res.status(404).json({ success: false, error: 'Контрольная работа не найдена' });
    }

    if (test.createdBy !== req.userId) {
      return res.status(403).json({ success: false, error: 'Вы не можете редактировать эту контрольную работу' });
    }

    const { nameRu, nameUz, descriptionRu, descriptionUz, duration, maxScore, questions, assignedClasses } = req.body;

    Object.assign(test, {
      nameRu: nameRu || test.nameRu,
      nameUz: nameUz || test.nameUz,
      descriptionRu: descriptionRu || test.descriptionRu,
      descriptionUz: descriptionUz || test.descriptionUz,
      duration: duration || test.duration,
      maxScore: maxScore || test.maxScore,
      questions: questions || test.questions,
      assignedClasses: assignedClasses || test.assignedClasses,
      updatedAt: new Date().toISOString()
    });

    console.log(`✏️ Control test updated: ${testId}`);
    res.json({ success: true, data: test });
  } catch (error) {
    console.error('Error updating control test:', error);
    res.status(500).json({ success: false, error: 'Ошибка при обновлении контрольной работы' });
  }
});

// Delete control test (teacher only - creator)
app.delete('/api/control-tests/:testId', auth, (req, res) => {
  try {
    const { testId } = req.params;
    const index = controlTests.findIndex(t => t._id === testId);

    if (index === -1) {
      return res.status(404).json({ success: false, error: 'Контрольная работа не найдена' });
    }

    if (controlTests[index].createdBy !== req.userId) {
      return res.status(403).json({ success: false, error: 'Вы не можете удалить эту контрольную работу' });
    }

    controlTests.splice(index, 1);
    console.log(`🗑️ Control test deleted: ${testId}`);
    res.json({ success: true, message: 'Контрольная работа удалена' });
  } catch (error) {
    console.error('Error deleting control test:', error);
    res.status(500).json({ success: false, error: 'Ошибка при удалении контрольной работы' });
  }
});

// Get control tests assigned to student's class
app.get('/api/student/control-tests', auth, (req, res) => {
  try {
    if (req.userRole !== 'student') {
      return res.status(403).json({ success: false, error: 'Доступно только студентам' });
    }

    const user = users.find(u => u._id === req.userId);
    if (!user || !user.grade) {
      return res.json({ success: true, data: [] });
    }

    const studentClass = `${user.grade}${user.gradeSection}`;
    const assignedTests = controlTests.filter(t => 
      t.assignedClasses && t.assignedClasses.some(cls => cls === user.grade || cls === studentClass)
    );

    res.json({ success: true, data: assignedTests });
  } catch (error) {
    console.error('Error fetching student control tests:', error);
    res.status(500).json({ success: false, error: 'Ошибка при загрузке контрольных работ' });
  }
});

// Submit control test result
app.post('/api/control-tests/:testId/submit', auth, (req, res) => {
  try {
    const { testId } = req.params;
    const { answers, timeTaken } = req.body;

    const test = controlTests.find(t => t._id === testId);
    if (!test) {
      return res.status(404).json({ success: false, error: 'Контрольная работа не найдена' });
    }

    // Calculate score
    let correctCount = 0;
    const questionResults = [];

    if (test.questions && Array.isArray(answers)) {
      test.questions.forEach((question, index) => {
        const selectedAnswerIndex = answers[index];
        const isCorrect = selectedAnswerIndex !== undefined && 
                         question.answers[selectedAnswerIndex] &&
                         question.answers[selectedAnswerIndex].isCorrect;
        
        if (isCorrect) correctCount++;
        
        questionResults.push({
          questionIndex: index,
          selectedAnswer: selectedAnswerIndex,
          isCorrect: isCorrect
        });
      });
    }

    const score = Math.round((correctCount / (test.questions?.length || 1)) * (test.maxScore || 100));

    const result = {
      _id: Date.now().toString(),
      userId: req.userId,
      testId: testId,
      testName: test.nameRu,
      score: score,
      correctCount: correctCount,
      totalCount: test.questions?.length || 0,
      timeTaken: timeTaken || 0,
      questionResults: questionResults,
      completedAt: new Date().toISOString(),
      teacherId: test.createdBy
    };

    controlTestResults.push(result);
    console.log(`📊 Control test result submitted: ${result._id}`);
    
    res.status(201).json({ 
      success: true, 
      data: result,
      message: 'Контрольная работа отправлена'
    });
  } catch (error) {
    console.error('Error submitting control test:', error);
    res.status(500).json({ success: false, error: 'Ошибка при отправке результатов' });
  }
});

// Get control test results (for teacher - their tests)
app.get('/api/control-tests/:testId/results', auth, (req, res) => {
  try {
    const { testId } = req.params;
    const test = controlTests.find(t => t._id === testId);

    if (!test) {
      return res.status(404).json({ success: false, error: 'Контрольная работа не найдена' });
    }

    if (test.createdBy !== req.userId && req.userRole !== 'admin') {
      return res.status(403).json({ success: false, error: 'Доступно только учителю и администратору' });
    }

    const results = controlTestResults.filter(r => r.testId === testId);
    const enrichedResults = results.map(result => {
      const student = users.find(u => u._id === result.userId);
      return {
        ...result,
        studentName: student ? `${student.firstName} ${student.lastName}` : 'Unknown',
        studentGrade: student ? `${student.grade}${student.gradeSection}` : 'Unknown'
      };
    });

    res.json({ success: true, data: enrichedResults });
  } catch (error) {
    console.error('Error fetching control test results:', error);
    res.status(500).json({ success: false, error: 'Ошибка при загрузке результатов' });
  }
});

// Get all control test results for logged-in teacher
app.get('/api/teacher/control-tests/results', auth, (req, res) => {
  try {
    if (req.userRole !== 'teacher') {
      return res.status(403).json({ success: false, error: 'Доступно только учителям' });
    }

    // Get all control tests created by this teacher
    const teacherTests = controlTests.filter(t => t.createdBy === req.userId);
    const testIds = teacherTests.map(t => t._id);

    // Get all results for those tests
    const results = controlTestResults.filter(r => testIds.includes(r.testId));
    
    const enrichedResults = results.map(result => {
      const student = users.find(u => u._id === result.userId);
      const test = teacherTests.find(t => t._id === result.testId);
      return {
        ...result,
        testName: test?.nameRu || result.testName,
        studentName: student ? `${student.firstName} ${student.lastName}` : 'Unknown',
        studentGrade: student ? `${student.grade}${student.gradeSection}` : 'Unknown'
      };
    }).sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));

    res.json({ success: true, data: enrichedResults });
  } catch (error) {
    console.error('Error fetching teacher control test results:', error);
    res.status(500).json({ success: false, error: 'Ошибка при загрузке результатов' });
  }
});

// Get all classes/grades
app.get('/api/classes', auth, (req, res) => {
  try {
    // Recalculate student count
    classes.forEach(cls => {
      cls.studentCount = users.filter(u => u.role === 'student' && u.grade === cls.grade).length;
    });
    res.json({ success: true, data: classes });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Ошибка при загрузке классов' });
  }
});

function findClassById(classId) {
  const targetId = String(classId);
  return classes.find(c => String(c._id || c.id) === targetId);
}

// Get specific class by ID
app.get('/api/classes/:classId', auth, (req, res) => {
  try {
    const { classId } = req.params;
    const classItem = findClassById(classId);
    
    if (!classItem) {
      return res.status(404).json({ success: false, error: 'Класс не найден' });
    }
    
    const section = req.query.section || classItem.name || null;

    if (!canAccessClassAnalytics(req.userId, req.userRole, classItem, section)) {
      return res.status(403).json({ success: false, error: 'Доступ запрещен' });
    }

    // Get students for this class
    const students = getClassStudents(classItem, section);
    
    // Remove sensitive data from students
    const studentData = students.map(s => ({
      _id: s._id,
      username: s.username,
      firstName: s.firstName,
      lastName: s.lastName,
      grade: s.grade,
      gradeSection: s.gradeSection,
      school: s.school,
      email: s.email,
      averageScore: getStudentAverageScore(s._id)
    }));
    
    res.json({ 
      success: true, 
      data: {
        ...classItem,
        students: studentData
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Ошибка при загрузке класса' });
  }
});

// Get students for specific class by ID
app.get('/api/classes/:classId/students', auth, (req, res) => {
  try {
    const { classId } = req.params;
    const classItem = findClassById(classId);
    
    if (!classItem) {
      return res.status(404).json({ success: false, error: 'Класс не найден' });
    }
    
    const section = req.query.section || classItem.name || null;

    if (!canAccessClassAnalytics(req.userId, req.userRole, classItem, section)) {
      return res.status(403).json({ success: false, error: 'Доступ запрещен' });
    }

    const students = getClassStudents(classItem, section);
    
    // Remove sensitive data
    const studentData = students.map(s => ({
      _id: s._id,
      username: s.username,
      firstName: s.firstName,
      lastName: s.lastName,
      grade: s.grade,
      gradeSection: s.gradeSection,
      school: s.school,
      averageScore: getStudentAverageScore(s._id)
    }));
    
    res.json({ success: true, data: studentData });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Ошибка при загрузке студентов класса' });
  }
});

// Get students by grade
app.get('/api/classes/:grade/students', auth, (req, res) => {
  try {
    const { grade } = req.params;
    const { section } = req.query;
    
    let students = users.filter(u => u.role === 'student' && u.grade === grade);
    
    if (section) {
      students = students.filter(s => s.gradeSection === section);
    }
    
    // Remove sensitive data
    students = students.map(s => ({
      _id: s._id,
      username: s.username,
      firstName: s.firstName,
      lastName: s.lastName,
      grade: s.grade,
      gradeSection: s.gradeSection,
      school: s.school
    }));
    
    res.json({ success: true, data: students });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Ошибка при загрузке учеников' });
  }
});

// Create new class
app.post('/api/classes', auth, (req, res) => {
  try {
    const user = users.find(u => u._id === req.userId);
    
    // Only admin can create classes
    if (user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Только администратор может создавать классы' });
    }
    
    const { grade, name, teacherId } = req.body;
    
    if (!grade || !name) {
      return res.status(400).json({ success: false, error: 'Укажите номер класса и название' });
    }
    
    // Check if class already exists
    const existingClass = classes.find(c => c.grade === grade && c.name === name);
    if (existingClass) {
      return res.status(400).json({ success: false, error: 'Класс с таким названием уже существует' });
    }
    
    const newClass = {
      _id: (Math.max(...classes.map(c => parseInt(c._id) || 0), 0) + 1).toString(),
      grade,
      name,
      teacherId: teacherId || null,
      createdAt: new Date().toISOString()
    };
    
    classes.push(newClass);
    
    res.status(201).json({ success: true, data: newClass });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Ошибка при создании класса' });
  }
});

// Delete class
app.delete('/api/classes/:classId', auth, (req, res) => {
  try {
    const user = users.find(u => u._id === req.userId);
    
    // Only admin can delete classes
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Только администратор может удалять классы' });
    }
    
    const { classId } = req.params;
    
    const classIndex = classes.findIndex(c => String(c._id || c.id) === String(classId));
    if (classIndex === -1) {
      return res.status(404).json({ success: false, error: 'Класс не найден' });
    }
    
    classes.splice(classIndex, 1);
    
    res.json({ success: true, message: 'Класс удален успешно' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Ошибка при удалении класса' });
  }
});

// ========================================
// ANALYTICS API
// ========================================

function getClassLabel(classItem) {
  if (!classItem) return '';
  if (classItem.name) return `${classItem.grade || ''}${classItem.name}`.trim();
  if (classItem.sections?.length) return `${classItem.grade || ''}`.trim();
  return `${classItem.grade || ''}`.trim();
}

function findClassByIdOrGrade(classId, section) {
  const byId = classes.find(c => c._id === classId || c.id === classId);
  if (byId) return byId;
  const byGrade = classes.find(c => c.grade === classId && (!section || c.name === section || c.sections?.includes(section)));
  return byGrade || null;
}

function getClassSection(classItem, section) {
  if (section) return section;
  if (classItem?.name) return classItem.name;
  return null;
}

function getClassStudents(classItem, section) {
  if (!classItem) return [];
  return users.filter(u => u.role === 'student' && u.grade === classItem.grade && (!section || u.gradeSection === section));
}

function canAccessClassAnalytics(userId, role, classItem, section) {
  if (role === 'admin') return true;
  if (!classItem) return false;

  if (role === 'student') {
    const student = users.find(u => u._id === userId && u.role === 'student');
    if (!student) return false;
    if (student.grade !== classItem.grade) return false;
    if (section) {
      return student.gradeSection === section;
    }
    if (classItem.name) {
      return student.gradeSection === classItem.name;
    }
    return true;
  }

  if (role !== 'teacher') return false;
  if (classItem.teacherId !== userId) return false;
  if (section && classItem.name && classItem.name !== section) return false;
  return true;
}

function canTeacherAccessStudent(teacherId, student) {
  return classes.some(c => c.teacherId === teacherId && c.grade === student.grade && (!c.name || c.name === (student.gradeSection || '')));
}

function getStudentAverageScore(studentId) {
  const results = testResults.filter(r => r.userId === studentId);
  if (!results.length) return 0;
  const avg = results.reduce((sum, r) => sum + r.score, 0) / results.length;
  return Math.round(avg * 10) / 10;
}

function teacherHasSubject(user, subjectId) {
  if (!user || user.role !== 'teacher') return true;
  const subjectsList = Array.isArray(user.subjects) ? user.subjects : [];
  return subjectsList.some(s => s === subjectId || s?.id === subjectId || s?._id === subjectId || s?.subjectId === subjectId);
}

// Get class analytics - Line chart data (average scores over time)
app.get('/api/analytics/classes/:grade/timeline', auth, (req, res) => {
  try {
    const { grade } = req.params;
    const { section } = req.query;
    const classItem = findClassByIdOrGrade(grade, section);

    if (!canAccessClassAnalytics(req.userId, req.userRole, classItem, section)) {
      return res.status(403).json({ success: false, error: 'Доступ запрещен' });
    }
    
    // Get students of this class
    const resolvedSection = getClassSection(classItem, section);
    let classStudents = getClassStudents(classItem || { grade }, resolvedSection);
    
    const studentIds = classStudents.map(s => s._id);
    
    // Get all test results for these students
    const classResults = testResults.filter(r => studentIds.includes(r.userId));
    
    // Group by subject and date
    const timelineData = {};
    
    classResults.forEach(result => {
      const date = new Date(result.completedAt).toISOString().split('T')[0]; // YYYY-MM-DD
      const subjectId = result.subjectId;
      
      if (!timelineData[subjectId]) {
        timelineData[subjectId] = {};
      }
      
      if (!timelineData[subjectId][date]) {
        timelineData[subjectId][date] = {
          scores: [],
          count: 0
        };
      }
      
      timelineData[subjectId][date].scores.push(result.score);
      timelineData[subjectId][date].count++;
    });
    
    // Calculate averages
    const labels = [...new Set(classResults.map(r => new Date(r.completedAt).toISOString().split('T')[0]))].sort();
    const series = Object.keys(timelineData).map(subjectId => {
      const subject = subjects.find(s => s._id === subjectId);
      const subjectName = subject ? subject.nameRu : `Subject ${subjectId}`;
      const data = labels.map(date => {
        const bucket = timelineData[subjectId][date];
        return bucket ? Math.round((bucket.scores.reduce((a, b) => a + b, 0) / bucket.count) * 10) / 10 : null;
      });
      return { subjectId, subjectName, data };
    });

    res.json({
      success: true,
      data: {
        labels,
        series,
        meta: {
          classId: classItem?._id || classItem?.id || grade,
          grade: classItem?.grade || grade,
          section: resolvedSection || null,
          classLabel: getClassLabel(classItem)
        }
      }
    });
  } catch (error) {
    console.error('Error fetching class timeline:', error);
    res.status(500).json({ success: false, error: 'Ошибка при загрузке аналитики класса' });
  }
});

// Student analytics - Line chart data (scores over time)
app.get('/api/analytics/students/:studentId/timeline', auth, (req, res) => {
  try {
    const { studentId } = req.params;
    const student = users.find(u => u._id === studentId && u.role === 'student');

    if (!student) {
      return res.status(404).json({ success: false, error: 'Ученик не найден' });
    }

    if (req.userRole !== 'admin' && !(req.userRole === 'teacher' && canTeacherAccessStudent(req.userId, student))) {
      return res.status(403).json({ success: false, error: 'Доступ запрещен' });
    }

    const studentResults = testResults.filter(r => r.userId === studentId);
    const timelineData = {};

    studentResults.forEach(result => {
      const date = new Date(result.completedAt).toISOString().split('T')[0];
      const subjectId = result.subjectId;
      if (!timelineData[subjectId]) timelineData[subjectId] = {};
      if (!timelineData[subjectId][date]) {
        timelineData[subjectId][date] = { scores: [], count: 0 };
      }
      timelineData[subjectId][date].scores.push(result.score);
      timelineData[subjectId][date].count++;
    });

    const labels = [...new Set(studentResults.map(r => new Date(r.completedAt).toISOString().split('T')[0]))].sort();
    const series = Object.keys(timelineData).map(subjectId => {
      const subject = subjects.find(s => s._id === subjectId);
      const subjectName = subject ? subject.nameRu : `Subject ${subjectId}`;
      const data = labels.map(date => {
        const bucket = timelineData[subjectId][date];
        return bucket ? Math.round((bucket.scores.reduce((a, b) => a + b, 0) / bucket.count) * 10) / 10 : null;
      });
      return { subjectId, subjectName, data };
    });

    res.json({
      success: true,
      data: {
        labels,
        series,
        meta: {
          studentId,
          studentName: `${student.firstName} ${student.lastName}`,
          grade: student.grade,
          section: student.gradeSection || null
        }
      }
    });
  } catch (error) {
    console.error('Error fetching student timeline:', error);
    res.status(500).json({ success: false, error: 'Ошибка при загрузке аналитики ученика' });
  }
});

// Teacher subject analytics (admin or self)
app.get('/api/analytics/teachers/:teacherId/subjects', auth, (req, res) => {
  try {
    const { teacherId } = req.params;

    if (req.userRole !== 'admin' && req.userId !== teacherId) {
      return res.status(403).json({ success: false, error: 'Доступ запрещен' });
    }

    const teacherModules = modules.filter(m => m.createdBy === teacherId);
    const teacherTestIds = tests.filter(t => teacherModules.some(m => m._id === t.moduleId)).map(t => t._id);
    const teacherResults = testResults.filter(r => teacherTestIds.includes(r.testId));

    const statsBySubject = {};
    teacherResults.forEach(result => {
      const subjectId = result.subjectId;
      if (!statsBySubject[subjectId]) {
        const subject = subjects.find(s => s._id === subjectId);
        statsBySubject[subjectId] = {
          subjectId,
          subjectName: subject ? subject.nameRu : `Subject ${subjectId}`,
          scores: [],
          count: 0
        };
      }
      statsBySubject[subjectId].scores.push(result.score);
      statsBySubject[subjectId].count++;
    });

    const data = Object.values(statsBySubject).map(stat => ({
      subjectId: stat.subjectId,
      subjectName: stat.subjectName,
      averageScore: stat.scores.length ? Math.round((stat.scores.reduce((a, b) => a + b, 0) / stat.scores.length) * 10) / 10 : 0,
      testsCompleted: stat.count
    }));

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching teacher subject analytics:', error);
    res.status(500).json({ success: false, error: 'Ошибка при загрузке аналитики учителя' });
  }
});

// Get extended class statistics
app.get('/api/analytics/classes/:grade/stats', auth, (req, res) => {
  try {
    const { grade } = req.params;
    const { section } = req.query;
    const classItem = findClassByIdOrGrade(grade, section);

    if (!canAccessClassAnalytics(req.userId, req.userRole, classItem, section)) {
      return res.status(403).json({ success: false, error: 'Доступ запрещен' });
    }
    
    // Get students of this class
    const resolvedSection = getClassSection(classItem, section);
    let classStudents = getClassStudents(classItem || { grade }, resolvedSection);
    
    const studentIds = classStudents.map(s => s._id);
    const classResults = testResults.filter(r => studentIds.includes(r.userId));
    
    if (classResults.length === 0) {
      return res.json({
        success: true,
        data: {
          averageScore: 0,
          totalTests: 0,
          studentsCount: classStudents.length,
          subjectStats: [],
          distribution: { excellent: 0, good: 0, satisfactory: 0, poor: 0 }
        }
      });
    }
    
    // Calculate overall average
    const totalScore = classResults.reduce((sum, r) => sum + r.score, 0);
    const averageScore = totalScore / classResults.length;
    
    // Subject-wise statistics
    const subjectStats = {};
    classResults.forEach(result => {
      const subjectId = result.subjectId;
      if (!subjectStats[subjectId]) {
        const subject = subjects.find(s => s._id === subjectId);
        subjectStats[subjectId] = {
          subjectName: subject ? subject.nameRu : `Subject ${subjectId}`,
          scores: [],
          count: 0
        };
      }
      subjectStats[subjectId].scores.push(result.score);
      subjectStats[subjectId].count++;
    });
    
    const subjectStatsList = Object.values(subjectStats).map(stat => ({
      subject: stat.subjectName,
      average: stat.scores.reduce((a, b) => a + b, 0) / stat.count,
      testsCount: stat.count
    }));
    
    // Score distribution
    const distribution = {
      excellent: classResults.filter(r => r.score >= 85).length,
      good: classResults.filter(r => r.score >= 70 && r.score < 85).length,
      satisfactory: classResults.filter(r => r.score >= 50 && r.score < 70).length,
      poor: classResults.filter(r => r.score < 50).length
    };
    
    res.json({
      success: true,
      data: {
        averageScore: Math.round(averageScore * 10) / 10,
        totalTests: classResults.length,
        studentsCount: classStudents.length,
        subjectStats: subjectStatsList,
        distribution
      }
    });
  } catch (error) {
    console.error('Error fetching class stats:', error);
    res.status(500).json({ success: false, error: 'Ошибка при загрузке статистики класса' });
  }
});

// Compare classes
app.get('/api/analytics/classes/compare', auth, (req, res) => {
  try {
    if (req.userRole !== 'admin') {
      return res.status(403).json({ success: false, error: 'Доступ запрещен' });
    }

    const classesData = [];
    
    // Get all unique grades
    const grades = [...new Set(users.filter(u => u.role === 'student').map(u => u.grade))];
    
    grades.forEach(grade => {
      const classStudents = users.filter(u => u.role === 'student' && u.grade === grade);
      const studentIds = classStudents.map(s => s._id);
      const classResults = testResults.filter(r => studentIds.includes(r.userId));
      
      if (classResults.length > 0) {
        const totalScore = classResults.reduce((sum, r) => sum + r.score, 0);
        const averageScore = totalScore / classResults.length;
        
        classesData.push({
          grade,
          averageScore: Math.round(averageScore * 10) / 10,
          studentsCount: classStudents.length,
          testsCompleted: classResults.length
        });
      } else {
        classesData.push({
          grade,
          averageScore: 0,
          studentsCount: classStudents.length,
          testsCompleted: 0
        });
      }
    });
    
    res.json({ success: true, data: classesData });
  } catch (error) {
    console.error('Error comparing classes:', error);
    res.status(500).json({ success: false, error: 'Ошибка при сравнении классов' });
  }
});

// Update class
app.put('/api/classes/:classId', auth, (req, res) => {
  try {
    const user = users.find(u => u._id === req.userId);
    
    // Only admin can update classes
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Только администратор может редактировать классы' });
    }
    
    const { classId } = req.params;
    const { name, teacherId, grade } = req.body;
    
    const classItem = findClassById(classId);
    if (!classItem) {
      return res.status(404).json({ success: false, error: 'Класс не найден' });
    }
    
    if (name) classItem.name = name;
    if (teacherId !== undefined) classItem.teacherId = teacherId;
    if (grade) classItem.grade = grade;
    
    res.json({ success: true, data: classItem });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Ошибка при обновлении класса' });
  }
});

// Update class students
app.put('/api/classes/:classId/students', auth, (req, res) => {
  try {
    const user = users.find(u => u._id === req.userId);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Только администратор может редактировать классы' });
    }

    const { classId } = req.params;
    const { studentIds, section } = req.body;

    if (!Array.isArray(studentIds)) {
      return res.status(400).json({ success: false, error: 'Некорректный список учеников' });
    }

    const classItem = findClassById(classId);
    if (!classItem) {
      return res.status(404).json({ success: false, error: 'Класс не найден' });
    }

    const classSection = section || classItem.name || null;
    if (classItem.sections?.length && classSection && !classItem.sections.includes(classSection)) {
      return res.status(400).json({ success: false, error: 'Секция не найдена в классе' });
    }

    const selectedSet = new Set(studentIds);
    users.forEach(u => {
      if (u.role !== 'student') return;

      const isInClass = u.grade === classItem.grade && (classSection ? u.gradeSection === classSection : true);

      if (selectedSet.has(u._id)) {
        u.grade = classItem.grade;
        if (classSection) {
          u.gradeSection = classSection;
        } else if (classItem.name) {
          u.gradeSection = classItem.name;
        }
      } else if (isInClass) {
        u.grade = null;
        u.gradeSection = null;
      }
    });

    classItem.studentCount = users.filter(u => u.role === 'student' && u.grade === classItem.grade).length;

    res.json({ success: true, data: { classId, studentIds } });
  } catch (error) {
    console.error('Error updating class students:', error);
    res.status(500).json({ success: false, error: 'Ошибка при обновлении учеников класса' });
  }
});

// Get tests available for student's grade
app.get('/api/modules/:moduleId/tests/available', auth, (req, res) => {
  try {
    const { moduleId } = req.params;
    const user = users.find(u => u._id === req.userId);
    
    if (!user) {
      return res.status(404).json({ success: false, error: 'Пользователь не найден' });
    }
    
    let moduleTests = tests.filter(t => t.moduleId === moduleId);
    
    // Filter by grade if student
    if (user.role === 'student' && user.grade) {
      moduleTests = moduleTests.filter(t => {
        // If no assignedGrades, test is available to all
        if (!t.assignedGrades || t.assignedGrades.length === 0) {
          return true;
        }
        return t.assignedGrades.includes(user.grade);
      });
    }
    
    // Add questionsCount
    const testsWithCount = moduleTests.map(t => ({
      ...t,
      questionsCount: t.questions?.length || 0
    }));
    
    res.json({ success: true, data: testsWithCount });
  } catch (error) {
    console.error('Error getting tests:', error);
    res.status(500).json({ success: false, error: 'Ошибка при загрузке тестов' });
  }
});

// ===========================================
// INTEREST TEST ROUTES
// ===========================================

// Save interest test results
app.post('/api/interest-results', auth, (req, res) => {
  try {
    console.log('📝 POST /api/interest-results - User ID:', req.userId);
    const { results, categories } = req.body;
    
    if (!results || !categories) {
      return res.status(400).json({ 
        success: false, 
        error: 'Отсутствуют результаты или категории' 
      });
    }
    
    const user = users.find(u => u._id === req.userId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'Пользователь не найден' });
    }
    
    // Save interest test results to user profile
    user.interestTestResults = {
      categories,
      results,
      completedAt: new Date().toISOString()
    };
    
    console.log('✅ Interest test results saved for user:', user.username);
    res.json({ 
      success: true, 
      message: 'Результаты теста интересов сохранены',
      data: user.interestTestResults
    });
  } catch (error) {
    console.error('Error saving interest test results:', error);
    res.status(500).json({ success: false, error: 'Ошибка при сохранении результатов' });
  }
});

// Get interest test results
app.get('/api/interest-results', auth, (req, res) => {
  try {
    console.log('📝 GET /api/interest-results - User ID:', req.userId);
    const user = users.find(u => u._id === req.userId);
    
    if (!user) {
      console.log('❌ User not found');
      return res.status(404).json({ success: false, error: 'Пользователь не найден' });
    }
    
    console.log('👤 User found:', user.username);
    console.log('📊 User interest test results:', user.interestTestResults);
    
    if (!user.interestTestResults) {
      console.log('⚠️ No interest test results for user');
      return res.json({ 
        success: true, 
        data: null,
        message: 'Тест интересов еще не пройден'
      });
    }
    
    console.log('✅ Returning interest test results');
    res.json({ 
      success: true, 
      data: user.interestTestResults
    });
  } catch (error) {
    console.error('Error getting interest test results:', error);
    res.status(500).json({ success: false, error: 'Ошибка при загрузке результатов' });
  }
});

// ============================================
// TEACHER TESTS ENDPOINTS (Admin creates tests for teachers)
// ============================================

// Get all teacher tests
app.get('/api/teacher-tests', auth, (req, res) => {
  try {
    console.log('🔍 Getting all tests for admin');
    console.log('📚 Total teacher tests in DB:', teacherTests.length);
    const testsWithCount = teacherTests.map(test => ({
      ...test,
      questionsCount: test.questions?.length || 0
    }));
    console.log('✅ Returning', testsWithCount.length, 'tests');
    res.json({ 
      success: true, 
      data: testsWithCount
    });
  } catch (error) {
    console.error('Error getting teacher tests:', error);
    res.status(500).json({ success: false, error: 'Ошибка при загрузке тестов' });
  }
});

// Get single teacher test
app.get('/api/teacher-tests/:id', auth, (req, res) => {
  console.log('🔍 GET /api/teacher-tests/:id called with id:', req.params.id);
  try {
    const test = teacherTests.find(t => t._id === req.params.id);
    if (!test) {
      return res.status(404).json({ success: false, error: 'Тест не найден' });
    }
    res.json({ success: true, data: test });
  } catch (error) {
    console.error('Error getting teacher test:', error);
    res.status(500).json({ success: false, error: 'Ошибка при загрузке теста' });
  }
});

// Create teacher test
app.post('/api/teacher-tests', auth, (req, res) => {
  try {
    const { title, description, duration, passingScore, questions } = req.body;
    
    console.log('🆕 Creating new teacher test');
    console.log('📝 Title:', title);
    console.log('📝 Questions count:', questions?.length);
    console.log('📝 Full data:', { title, description, duration, passingScore, questionsCount: questions?.length });
    
    if (!title || !questions || questions.length === 0) {
      return res.status(400).json({ success: false, error: 'Заполните все обязательные поля' });
    }
    
    const newTest = {
      _id: Date.now().toString(),
      title,
      description: description || '',
      duration: duration || 30,
      passingScore: passingScore || 70,
      questions,
      questionsCount: questions.length,
      createdAt: new Date().toISOString(),
      assignedTo: [] // Array of teacher IDs
    };
    
    teacherTests.push(newTest);
    
    console.log('✅ Teacher test created successfully');
    console.log('📚 Total tests in DB now:', teacherTests.length);
    console.log('🆔 New test ID:', newTest._id);
    
    res.json({ success: true, data: newTest });
  } catch (error) {
    console.error('Error creating teacher test:', error);
    res.status(500).json({ success: false, error: 'Ошибка при создании теста' });
  }
});

// Update teacher test
app.put('/api/teacher-tests/:id', auth, (req, res) => {
  try {
    const testIndex = teacherTests.findIndex(t => t._id === req.params.id);
    if (testIndex === -1) {
      return res.status(404).json({ success: false, error: 'Тест не найден' });
    }
    
    const { title, description, duration, passingScore, questions } = req.body;
    
    teacherTests[testIndex] = {
      ...teacherTests[testIndex],
      title: title || teacherTests[testIndex].title,
      description: description !== undefined ? description : teacherTests[testIndex].description,
      duration: duration || teacherTests[testIndex].duration,
      passingScore: passingScore || teacherTests[testIndex].passingScore,
      questions: questions || teacherTests[testIndex].questions,
      updatedAt: new Date().toISOString()
    };
    
    res.json({ success: true, data: teacherTests[testIndex] });
  } catch (error) {
    console.error('Error updating teacher test:', error);
    res.status(500).json({ success: false, error: 'Ошибка при обновлении теста' });
  }
});

// Delete teacher test
app.delete('/api/teacher-tests/:id', auth, (req, res) => {
  try {
    const testIndex = teacherTests.findIndex(t => t._id === req.params.id);
    if (testIndex === -1) {
      return res.status(404).json({ success: false, error: 'Тест не найден' });
    }
    
    teacherTests.splice(testIndex, 1);
    
    res.json({ success: true, message: 'Тест удален' });
  } catch (error) {
    console.error('Error deleting teacher test:', error);
    res.status(500).json({ success: false, error: 'Ошибка при удалении теста' });
  }
});

// Assign test to teachers
app.post('/api/teacher-tests/:id/assign', auth, (req, res) => {
  try {
    console.log('📌 ASSIGN endpoint hit!');
    console.log('📌 Test ID:', req.params.id);
    console.log('📌 Request body:', req.body);
    
    const { teacherIds } = req.body;
    const test = teacherTests.find(t => t._id === req.params.id);
    
    console.log('📌 Test found:', test ? 'YES' : 'NO');
    console.log('📌 Teacher IDs received:', teacherIds);
    
    if (!test) {
      console.log('❌ Test not found with ID:', req.params.id);
      return res.status(404).json({ success: false, error: 'Тест не найден' });
    }
    
    if (!teacherIds || !Array.isArray(teacherIds)) {
      console.log('❌ Invalid teacherIds:', teacherIds);
      return res.status(400).json({ success: false, error: 'Укажите учителей' });
    }
    
    // Initialize assignedTo if undefined
    if (!test.assignedTo) {
      test.assignedTo = [];
    }
    
    // Add teachers to assigned list (without duplicates)
    test.assignedTo = [...new Set([...test.assignedTo, ...teacherIds])];
    
    console.log('✅ Test assigned to teachers:', test.assignedTo);
    
    res.json({ success: true, data: test });
  } catch (error) {
    console.error('Error assigning test:', error);
    res.status(500).json({ success: false, error: 'Ошибка при назначении теста' });
  }
});

// Get teacher's assigned tests
app.get('/api/teacher-tests/assigned/:teacherId', auth, (req, res) => {
  try {
    const { teacherId } = req.params;
    console.log('👥 Getting assigned tests for teacher:', teacherId);
    console.log('📚 Total teacher tests:', teacherTests.length);
    
    const assignedTests = teacherTests.filter(t => {
      // Handle missing assignedTo array
      const assigned = t.assignedTo || [];
      return assigned.includes(teacherId);
    });
    
    console.log('✅ Found', assignedTests.length, 'assigned tests');
    
    res.json({ success: true, data: assignedTests });
  } catch (error) {
    console.error('Error getting assigned tests:', error);
    res.status(500).json({ success: false, error: 'Ошибка при загрузке тестов' });
  }
});

// Submit teacher test result
app.post('/api/teacher-test-results', auth, (req, res) => {
  try {
    const { testId, teacherId, answers, score, passed } = req.body;
    
    console.log('📝 Saving teacher test result');
    console.log('📝 Data received:', { testId, teacherId, answersCount: answers?.length, score, passed });
    
    if (!testId || !teacherId || !answers) {
      console.error('❌ Missing required fields:', { hasTestId: !!testId, hasTeacherId: !!teacherId, hasAnswers: !!answers });
      return res.status(400).json({ success: false, error: 'Недостаточно данных' });
    }
    
    const result = {
      _id: Date.now().toString(),
      testId,
      teacherId,
      answers,
      score: score || 0,
      passed: passed || false,
      completedAt: new Date().toISOString()
    };
    
    teacherTestResults.push(result);
    
    console.log('✅ Test result saved successfully');
    console.log('📊 Total teacher test results:', teacherTestResults.length);
    
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error saving test result:', error);
    res.status(500).json({ success: false, error: 'Ошибка при сохранении результата' });
  }
});

// Get test results by test ID
app.get('/api/teacher-test-results/:testId', auth, (req, res) => {
  try {
    const results = teacherTestResults.filter(r => r.testId === req.params.testId);
    
    // Populate with teacher info
    const resultsWithTeachers = results.map(result => {
      const teacher = users.find(u => u._id === result.teacherId);
      return {
        ...result,
        teacher: teacher ? {
          _id: teacher._id,
          firstName: teacher.firstName,
          lastName: teacher.lastName,
          username: teacher.username
        } : null
      };
    });
    
    res.json({ success: true, data: resultsWithTeachers });
  } catch (error) {
    console.error('Error getting test results:', error);
    res.status(500).json({ success: false, error: 'Ошибка при загрузке результатов' });
  }
});

// Get teacher's test results
app.get('/api/teacher-test-results/teacher/:teacherId', auth, (req, res) => {
  try {
    const results = teacherTestResults.filter(r => r.teacherId === req.params.teacherId);
    
    // Populate with test info
    const resultsWithTests = results.map(result => {
      const test = teacherTests.find(t => t._id === result.testId);
      return {
        ...result,
        test: test ? {
          _id: test._id,
          title: test.title,
          description: test.description
        } : null
      };
    });
    
    res.json({ success: true, data: resultsWithTests });
  } catch (error) {
    console.error('Error getting teacher results:', error);
    res.status(500).json({ success: false, error: 'Ошибка при загрузке результатов' });
  }
});

// Start server
const PORT = process.env.PORT || 5001;

// Populate sample/demo data only when explicitly enabled
if (ADD_SAMPLE_DATA) {
  await initUsers();

  // Add sample teacher test
  teacherTests.push({
  _id: 'test1',
  title: 'Тест на знание педагогики',
  description: 'Оценка базовых знаний педагогики и методики преподавания',
  duration: 15,
  passingScore: 70,
  questions: [
    {
      text: 'Какой метод обучения считается наиболее эффективным для развития критического мышления?',
      options: [
        'Лекция',
        'Проблемное обучение',
        'Заучивание наизусть',
        'Тестирование'
      ],
      correctAnswer: 1
    },
    {
      text: 'Что такое дифференцированный подход в обучении?',
      options: [
        'Одинаковые задания для всех учеников',
        'Учет индивидуальных особенностей учащихся',
        'Деление класса на группы по возрасту',
        'Раздельное обучение мальчиков и девочек'
      ],
      correctAnswer: 1
    },
    {
      text: 'Какова основная цель формативного оценивания?',
      options: [
        'Выставление итоговых оценок',
        'Сравнение учеников между собой',
        'Помощь ученику в улучшении результатов',
        'Наказание за плохие результаты'
      ],
      correctAnswer: 2
    },
    {
      text: 'Что означает термин "ЗБР" (зона ближайшего развития)?',
      options: [
        'То, что ребенок может сделать самостоятельно',
        'То, что ребенок не может сделать вообще',
        'То, что ребенок может сделать с помощью взрослого',
        'То, что ребенок уже умеет делать'
      ],
      correctAnswer: 2
    },
    {
      text: 'Какой стиль педагогического общения наиболее эффективен?',
      options: [
        'Авторитарный',
        'Либеральный (попустительский)',
        'Демократический',
        'Непоследовательный'
      ],
      correctAnswer: 2
    }
  ],
  createdAt: new Date().toISOString(),
  assignedTo: ['2'] // Assigned to teacher1
});

} else {
  await ensureAdminUser();
  initDefaultSubjects();
}

// Admin endpoint to reset all data
app.post('/api/admin/reset-data', auth, (req, res) => {
  try {
    // Check if user is admin
    if (req.userRole !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        error: 'Access denied. Only admins can reset data.' 
      });
    }

    // Preserve admin user
    const adminUser = users.find(u => u.role === 'admin');
    
    // Clear all data arrays
    users.length = 0;
    subjects.length = 0;
    modules.length = 0;
    tests.length = 0;
    testResults.length = 0;
    testProgress.length = 0;
    classes.length = 0;
    teacherTests.length = 0;
    teacherTestResults.length = 0;
    controlTests.length = 0;
    controlTestResults.length = 0;

    // Restore admin user
    if (adminUser) {
      users.push(adminUser);
    }

    initDefaultSubjects();

    console.log('🗑️  Admin reset all data');
    res.json({ 
      success: true, 
      message: 'All data cleared successfully' 
    });
  } catch (error) {
    console.error('Error resetting data:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Mock server running on port ${PORT}`);
  console.log('⚠️  Using in-memory database (no MongoDB required)');
  console.log('📋 Sample teacher test created and assigned to teacher1');
});

export default app;
