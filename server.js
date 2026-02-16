const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const multer = require('multer');
const fs = require('fs');

const app = express();
const PORT = 3000;

// ============================================
// 1️⃣ DATABASE SETUP (Now with News!)
// ============================================
const db = new sqlite3.Database('./student_portal.db', (err) => {
    if (err) console.error("❌ DB Error:", err.message);
    else console.log("✅ Connected to SQLite DB.");
});

db.serialize(() => {
    // Users Table
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT,
        email TEXT UNIQUE,
        password TEXT,
        date TEXT,
        gpa REAL DEFAULT 0.00,
        gpa_history TEXT DEFAULT '[]',
        courses TEXT DEFAULT '[]',
        role TEXT DEFAULT 'student',
        profile_pic TEXT DEFAULT 'default.png'
    )`);

    // 👇 NEW: News Table
    db.run(`CREATE TABLE IF NOT EXISTS news (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT,
        message TEXT,
        date TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS announcements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    message TEXT,
    date DATETIME DEFAULT CURRENT_TIMESTAMP
)`);
});

// ============================================
// 2️⃣ CONFIGURATION
// ============================================
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('public'));

app.use(session({
    secret: "my_secret_key_123",
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }
}));

const storage = multer.diskStorage({
    destination: './public/uploads/', 
    filename: function(req, file, cb) {
        cb(null, 'user-' + Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

if (!fs.existsSync('./public/uploads')) fs.mkdirSync('./public/uploads');

function isAdmin(req, res, next) {
    if (req.session.user && req.session.user.role === 'admin') return next();
    res.status(403).send("<h1>Access Denied</h1>");
}

// ============================================
// 3️⃣ ROUTES
// ============================================
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/signup', (req, res) => res.sendFile(path.join(__dirname, 'public', 'signup.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'public', 'login.html')));

app.get('/dashboard', (req, res) => {
    if (!req.session.user) return res.redirect('/login');
    if (req.session.user.role === 'admin') return res.redirect('/admin');
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

app.get('/admin', isAdmin, (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));
app.get('/profile', (req, res) => {
    if (!req.session.user) return res.redirect('/login');
    res.sendFile(path.join(__dirname, 'public', 'profile.html'));
});
app.get('/gpa', (req, res) => {
    if (!req.session.user) return res.redirect('/login');
    res.sendFile(path.join(__dirname, 'public', 'gpa.html'));
});
app.get('/courses', (req, res) => {
    if (!req.session.user) return res.redirect('/login');
    res.sendFile(path.join(__dirname, 'public', 'courses.html'));
});

app.get('/add-school-column', (req, res) => {
    db.run("ALTER TABLE users ADD COLUMN institution TEXT", (err) => {
        if (err) return res.send("Error or column exists: " + err.message);
        res.send("Database updated! Now tracking institutions.");
    });
});

// ============================================
// 4️⃣ API
// ============================================
app.get('/api/user', (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: "Not logged in" });
    db.get(`SELECT * FROM users WHERE id = ?`, [req.session.user.id], (err, row) => res.json(row));
});

// 👇 NEW: Get News (For Everyone)
app.get('/api/news', (req, res) => {
    // Get latest 5 news items, newest first
    db.all(`SELECT * FROM news ORDER BY id DESC LIMIT 5`, [], (err, rows) => {
        res.json(rows);
    });
});

// 👇 NEW: Post News (Admin Only)
app.post('/api/admin/news', isAdmin, (req, res) => {
    const { title, message } = req.body;
    const date = new Date().toLocaleDateString();
    db.run(`INSERT INTO news (title, message, date) VALUES (?, ?, ?)`, [title, message, date], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "News Posted!" });
    });
});

// 👇 NEW: Delete News (Admin Only)
app.delete('/api/admin/news/:id', isAdmin, (req, res) => {
    db.run(`DELETE FROM news WHERE id = ?`, [req.params.id], (err) => {
        res.json({ message: "News Deleted" });
    });
});

app.post('/api/save-gpa', (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: "Not logged in" });
    const newGPA = req.body.gpa;
    const userId = req.session.user.id;
    db.get(`SELECT gpa_history FROM users WHERE id = ?`, [userId], (err, row) => {
        let history = [];
        if (row && row.gpa_history) try { history = JSON.parse(row.gpa_history); } catch(e) {}
        history.push(newGPA);
        db.run(`UPDATE users SET gpa = ?, gpa_history = ? WHERE id = ?`, [newGPA, JSON.stringify(history), userId], (err) => res.json({ message: "Saved" }));
    });
});

app.post('/api/save-courses', (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: "Not logged in" });
    db.run(`UPDATE users SET courses = ? WHERE id = ?`, [JSON.stringify(req.body.courses), req.session.user.id], (err) => res.json({ message: "Saved" }));
});

app.post('/api/upload', upload.single('avatar'), (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: "Not logged in" });
    db.run(`UPDATE users SET profile_pic = ? WHERE id = ?`, [req.file.filename, req.session.user.id], (err) => res.redirect('/profile'));
});

// Admin API
app.get('/api/admin/users', isAdmin, (req, res) => {
    db.all(`SELECT * FROM users`, [], (err, rows) => res.json(rows));
});
app.delete('/api/admin/users/:id', isAdmin, (req, res) => {
    if (req.params.id == req.session.user.id) return res.status(400).json({ error: "Cannot delete self" });
    db.run(`DELETE FROM users WHERE id = ?`, [req.params.id], (err) => res.json({ message: "Deleted" }));
});

// ============================================
// 5️⃣ AUTH
// ============================================
app.post('/signup', async (req, res) => {
    const { name, email, password, institution } = req.body; // <--- Added institution here
    const hashedPassword = await bcrypt.hash(password, 10);

    // Save to database
    db.run(`INSERT INTO users (name, email, password, institution) VALUES (?, ?, ?, ?)`, 
    [name, email, hashedPassword, institution], 
    (err) => {
        if (err) return res.send("Email already used.");
        res.redirect('/login');
    });
});

app.post('/login', (req, res) => {
    const { email, password } = req.body;
    db.get(`SELECT * FROM users WHERE email = ?`, [email], async (err, user) => {
        if (err || !user) return res.send('<script>alert("User not found!"); window.location.href="/login";</script>');
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.send('<script>alert("Wrong password!"); window.location.href="/login";</script>');
        
        req.session.user = { id: user.id, username: user.username, email: user.email, role: user.role };
        res.redirect(user.role === 'admin' ? '/admin' : '/dashboard');
    });
});

app.get('/logout', (req, res) => { req.session.destroy(() => res.redirect('/login')); });

// --- NEW: Edit User Route ---
app.post('/admin/edit-user', checkAdmin, (req, res) => {
    const { id, name, email, gpa, cgpa } = req.body;
    
    // Admin posts a new message
app.post('/admin/announce', checkAdmin, (req, res) => {
    const { message } = req.body;
    db.run(`INSERT INTO announcements (message) VALUES (?)`, [message], (err) => {
        if (err) return res.status(500).send("Error saving announcement.");
        res.redirect('/admin');
    });
});

// Anyone can view the latest message
app.get('/api/announcements', (req, res) => {
    db.get(`SELECT message FROM announcements ORDER BY date DESC LIMIT 1`, (err, row) => {
        if (err || !row) return res.json({ message: "Welcome to the Student Portal!" });
        res.json(row);
    });
});
    // Update the database
    db.run(`UPDATE users SET name = ?, email = ?, gpa = ?, cgpa = ? WHERE id = ?`, 
    [name, email, gpa, cgpa, id], 
    (err) => {
        if (err) {
            console.error(err);
            return res.status(500).send("Error updating user.");
        }
        res.redirect('/admin'); // Go back to dashboard
    });
});

// --- ANNOUNCEMENT MANAGEMENT ROUTES ---

// 1. Admin deletes a specific announcement
app.get('/admin/delete-announcement/:id', checkAdmin, (req, res) => {
    const announcementId = req.params.id;
    db.run(`DELETE FROM announcements WHERE id = ?`, [announcementId], (err) => {
        if (err) return res.status(500).send("Error deleting news.");
        res.redirect('/admin'); // Refreshes the page after deleting
    });
});

// 2. Fetch ALL announcements so the Admin can see them to delete them
app.get('/api/all-announcements', checkAdmin, (req, res) => {
    db.all(`SELECT * FROM announcements ORDER BY date DESC`, (err, rows) => {
        if (err) return res.status(500).json([]);
        res.json(rows);
    });
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));