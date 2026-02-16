// ============================================
// 1️⃣ IMPORTS & SETUP
// ============================================
const express = require('express');
const db = require('better-sqlite3')('database.sqlite'); // Using better-sqlite3 for speed
const bcrypt = require('bcryptjs');
const session = require('express-session');
const multer = require('multer');
const path = require('path');
const fs = require('fs'); 

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('public')); // Serves HTML/CSS/Images
app.use(session({
    secret: 'secret-key-gnaas-portal',
    resave: false,
    saveUninitialized: false
}));

// ============================================
// 2️⃣ FILE UPLOAD CONFIGURATION (Multer)
// ============================================
// Ensure uploads folder exists to prevent Render crash
const uploadDir = path.join(__dirname, 'public/uploads');
if (!fs.existsSync(uploadDir)){
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir); 
    },
    filename: function(req, file, cb) {
        // Naming: timestamp-filename (e.g. 174000-nss-guide.pdf)
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage: storage });

// ============================================
// 3️⃣ DATABASE TABLES
// ============================================
// Users Table (Includes Institution & Profile Pic)
db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    email TEXT UNIQUE,
    password TEXT,
    role TEXT DEFAULT 'STUDENT',
    gpa REAL DEFAULT 0.00,
    cgpa REAL DEFAULT 0.00,
    institution TEXT,
    profile_pic TEXT
)`);

// Announcements Table (News)
db.run(`CREATE TABLE IF NOT EXISTS announcements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    message TEXT,
    date DATETIME DEFAULT CURRENT_TIMESTAMP
)`);

// Resources Table (Downloads)
db.run(`CREATE TABLE IF NOT EXISTS resources (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    category TEXT,
    filename TEXT,
    date DATETIME DEFAULT CURRENT_TIMESTAMP
)`);

// ============================================
// 4️⃣ HELPER FUNCTIONS
// ============================================
function checkAdmin(req, res, next) {
    if (req.session.role === 'ADMIN') {
        next();
    } else {
        res.status(403).send("<h1>Access Denied: Admins Only</h1><a href='/login.html'>Go Back</a>");
    }
}

// ============================================
// 5️⃣ ROUTES: AUTHENTICATION
// ============================================
app.post('/signup', async (req, res) => {
    const { name, email, password, institution } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    
    try {
        db.run(`INSERT INTO users (name, email, password, institution) VALUES (?, ?, ?, ?)`, 
        [name, email, hashedPassword, institution]);
        res.redirect('/login.html');
    } catch (err) {
        res.send("Error: Email already used. <a href='/signup.html'>Try again</a>");
    }
});

app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);

    if (user && await bcrypt.compare(password, user.password)) {
        req.session.userId = user.id;
        req.session.role = user.role;
        req.session.institution = user.institution;
        
        if (user.role === 'ADMIN') {
            res.redirect('/admin.html');
        } else {
            res.redirect('/dashboard.html');
        }
    } else {
        res.send("Invalid email or password. <a href='/login.html'>Try again</a>");
    }
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

// ============================================
// 6️⃣ ROUTES: DASHBOARD & USER DATA
// ============================================
app.get('/user-data', (req, res) => {
    if (!req.session.userId) return res.status(401).json({});
    const user = db.prepare('SELECT name, email, gpa, cgpa, role, institution, profile_pic FROM users WHERE id = ?').get(req.session.userId);
    res.json(user);
});

// Profile Picture Upload
app.post('/upload-profile', upload.single('avatar'), (req, res) => {
    if (!req.session.userId) return res.redirect('/login.html');
    
    const filename = req.file.filename;
    db.run(`UPDATE users SET profile_pic = ? WHERE id = ?`, [filename, req.session.userId]);
    res.redirect('/dashboard.html');
});

// ============================================
// 7️⃣ ROUTES: ADMIN FEATURES
// ============================================

// Get all users
app.get('/api/users', checkAdmin, (req, res) => {
    const users = db.prepare('SELECT * FROM users').all();
    res.json(users);
});

// Edit User Grades/Info
app.post('/admin/edit-user', checkAdmin, (req, res) => {
    const { id, name, email, gpa, cgpa } = req.body;
    db.run(`UPDATE users SET name = ?, email = ?, gpa = ?, cgpa = ? WHERE id = ?`, 
    [name, email, gpa, cgpa, id]);
    res.redirect('/admin.html');
});

// Delete User
app.get('/admin/delete/:id', checkAdmin, (req, res) => {
    db.run('DELETE FROM users WHERE id = ?', [req.params.id]);
    res.redirect('/admin.html');
});

// ============================================
// 8️⃣ ROUTES: ANNOUNCEMENTS (NEWS)
// ============================================

// Post News
app.post('/admin/announce', checkAdmin, (req, res) => {
    const { message } = req.body;
    db.run(`INSERT INTO announcements (message) VALUES (?)`, [message]);
    res.redirect('/admin.html');
});

// Get Latest News (For Dashboard)
app.get('/api/announcements', (req, res) => {
    const news = db.prepare(`SELECT message FROM announcements ORDER BY date DESC LIMIT 1`).get();
    res.json(news || { message: "Welcome to the National Tertiary Portal!" });
});

// Get All News (For Admin List)
app.get('/api/all-announcements', checkAdmin, (req, res) => {
    const news = db.prepare(`SELECT * FROM announcements ORDER BY date DESC`).all();
    res.json(news);
});

// Delete News
app.get('/admin/delete-announcement/:id', checkAdmin, (req, res) => {
    db.run(`DELETE FROM announcements WHERE id = ?`, [req.params.id]);
    res.redirect('/admin.html');
});

// ============================================
// 9️⃣ ROUTES: NATIONAL RESOURCES (DOWNLOADS)
// ============================================

// Upload Resource
app.post('/admin/upload-resource', upload.single('document'), (req, res) => {
    const { title, category } = req.body;
    const filename = req.file.filename;

    db.run(`INSERT INTO resources (title, category, filename) VALUES (?, ?, ?)`, 
    [title, category, filename]);
    res.redirect('/admin.html');
});

// Get List of Resources
app.get('/api/resources', (req, res) => {
    const files = db.prepare("SELECT * FROM resources ORDER BY date DESC").all();
    res.json(files);
});

// Download File
app.get('/download/:filename', (req, res) => {
    const file = path.join(uploadDir, req.params.filename);
    res.download(file); 
});

// ============================================
// 🔟 DATABASE FIXER (Run once if needed)
// ============================================
app.get('/fix-db', (req, res) => {
    try {
        db.run("ALTER TABLE users ADD COLUMN institution TEXT");
        db.run("ALTER TABLE users ADD COLUMN profile_pic TEXT");
        res.send("Database Updated! Columns added.");
    } catch (e) {
        res.send("Database is already up to date.");
    }
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});