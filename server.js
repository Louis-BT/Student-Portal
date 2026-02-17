/**
 * 🎓 NATIONAL TERTIARY PORTAL - POSTGRESQL EDITION
 * Status: Production Ready (Persistent Data)
 */

const express = require('express');
const session = require('express-session');
const { Pool } = require('pg'); // PostgreSQL Driver
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================
// 1️⃣ CONFIGURATION & MIDDLEWARE
// ============================================

// Uploads (Note: On Render Free Tier, files deleted on restart)
const uploadDir = path.join(__dirname, 'public/uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => { cb(null, uploadDir); },
    filename: (req, file, cb) => {
        const cleanName = file.originalname.replace(/\s+/g, '_');
        cb(null, Date.now() + '-' + cleanName);
    }
});
const upload = multer({ storage: storage });

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('public'));

app.use(session({
    secret: 'national-tertiary-secret-key-2026',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));

// ============================================
// 2️⃣ POSTGRESQL DATABASE CONNECTION
// ============================================
// Render provides DATABASE_URL in the environment
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    console.error("❌ CRITICAL ERROR: DATABASE_URL is missing.");
    console.error("Did you add the Environment Variable in Render?");
    // We don't exit here so the app can at least start and log the error
}

const pool = new Pool({
    connectionString: connectionString,
    ssl: { rejectUnauthorized: false } // Required for Render
});

// Helper to initialize tables
const initDB = async () => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                name TEXT,
                email TEXT UNIQUE,
                password TEXT,
                institution TEXT,
                role TEXT DEFAULT 'STUDENT',
                gpa DECIMAL(4,2) DEFAULT 0.00,
                courses TEXT,
                profile_pic TEXT,
                faculty TEXT,
                department TEXT,
                program TEXT,
                level TEXT,
                financial_status TEXT,
                academic_status TEXT,
                year_entry TEXT,
                year_completion TEXT
            );
        `);
        
        await pool.query(`
            CREATE TABLE IF NOT EXISTS leadership_apps (
                id SERIAL PRIMARY KEY,
                user_id INTEGER,
                name TEXT,
                institution TEXT,
                position TEXT,
                vision TEXT,
                status TEXT DEFAULT 'PENDING',
                date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        await pool.query(`CREATE TABLE IF NOT EXISTS news (id SERIAL PRIMARY KEY, title TEXT, message TEXT, category TEXT, date TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
        await pool.query(`CREATE TABLE IF NOT EXISTS resources (id SERIAL PRIMARY KEY, title TEXT, university TEXT, course_code TEXT, file_path TEXT, file_type TEXT, uploaded_by TEXT, date TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
        await pool.query(`CREATE TABLE IF NOT EXISTS global_chat (id SERIAL PRIMARY KEY, user_id INTEGER, user_name TEXT, institution TEXT, message TEXT, date TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
        await pool.query(`CREATE TABLE IF NOT EXISTS support_tickets (id SERIAL PRIMARY KEY, user_id INTEGER, user_name TEXT, message TEXT, date TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);

        console.log("✅ PostgreSQL Database Initialized Successfully.");

        // Create Default Admin
        const adminCheck = await pool.query("SELECT * FROM users WHERE email = $1", ['admin@portal.com']);
        if (adminCheck.rows.length === 0) {
            const hashedAdminPass = await bcrypt.hash('admin123', 10);
            await pool.query(`INSERT INTO users (name, email, password, institution, role) VALUES ($1, $2, $3, $4, $5)`, 
            ['System Admin', 'admin@portal.com', hashedAdminPass, 'NTP HQ', 'ADMIN']);
            console.log("👑 Admin Account Created.");
        }

    } catch (err) {
        console.error("❌ DB Init Error:", err);
    }
};

// Run Init
initDB();

// ============================================
// 3️⃣ MIDDLEWARE
// ============================================
function isAuthenticated(req, res, next) {
    if (req.session.userId) return next();
    res.status(401).json({ error: "Unauthorized" });
}

function checkAdmin(req, res, next) {
    if (req.session.userId && req.session.role === 'ADMIN') return next();
    res.status(403).send("Access Denied");
}

// ============================================
// 4️⃣ ROUTES
// ============================================

// AUTH
app.post('/signup', async (req, res) => {
    const { name, email, password, institution } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        await pool.query(
            `INSERT INTO users (name, email, password, institution) VALUES ($1, $2, $3, $4)`,
            [name, email, hashedPassword, institution]
        );
        res.redirect('/login.html');
    } catch (err) {
        console.error(err);
        res.send("Error: Email likely already exists.");
    }
});

app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        const user = result.rows[0];

        if (user && await bcrypt.compare(password, user.password)) {
            req.session.userId = user.id;
            req.session.role = user.role;
            res.redirect(user.role === 'ADMIN' ? '/admin.html' : '/dashboard.html');
        } else {
            res.send("Invalid credentials.");
        }
    } catch (err) { res.status(500).send("Login Error"); }
});

app.get('/logout', (req, res) => { req.session.destroy(); res.redirect('/'); });

// DATA & GPA
app.post('/api/save-gpa', isAuthenticated, async (req, res) => {
    let { gpa, courses } = req.body;
    const numericGPA = parseFloat(gpa);
    
    if (isNaN(numericGPA) || numericGPA < 0 || numericGPA > 5.0) return res.status(400).json({ error: "Invalid GPA" });

    await pool.query(`UPDATE users SET gpa = $1, courses = $2 WHERE id = $3`, 
        [numericGPA, JSON.stringify(courses), req.session.userId]);
    res.json({ success: true });
});

app.post('/api/update-profile-details', isAuthenticated, async (req, res) => {
    const { faculty, department, program, level, financial, academic, entry, completion } = req.body;
    
    // Validation
    if (parseInt(completion) <= parseInt(entry)) return res.status(400).json({ error: "Invalid Years" });

    const sql = `UPDATE users SET faculty=$1, department=$2, program=$3, level=$4, financial_status=$5, academic_status=$6, year_entry=$7, year_completion=$8 WHERE id=$9`;
    await pool.query(sql, [faculty, department, program, level, financial, academic, entry, completion, req.session.userId]);
    res.json({ success: true });
});

app.get('/user-data', isAuthenticated, async (req, res) => {
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [req.session.userId]);
    if (result.rows[0]) delete result.rows[0].password;
    res.json(result.rows[0] || {});
});

// LEADERSHIP
app.post('/api/leadership/apply', isAuthenticated, async (req, res) => {
    const { position, vision } = req.body;
    const userRes = await pool.query('SELECT name, institution FROM users WHERE id = $1', [req.session.userId]);
    const user = userRes.rows[0];

    await pool.query(`INSERT INTO leadership_apps (user_id, name, institution, position, vision) VALUES ($1, $2, $3, $4, $5)`,
        [req.session.userId, user.name, user.institution, position, vision]);
    res.redirect('/leadership.html?msg=applied');
});

app.get('/api/leadership/my-status', isAuthenticated, async (req, res) => {
    const result = await pool.query('SELECT status FROM leadership_apps WHERE user_id = $1', [req.session.userId]);
    const row = result.rows[0];
    if (row && row.status === 'APPROVED') {
        res.json({ status: 'APPROVED', link: 'https://chat.whatsapp.com/YOUR_LINK_HERE' });
    } else res.json({ status: row ? row.status : 'NONE' });
});

// ADMIN ROUTES
app.get('/api/admin/leadership-apps', checkAdmin, async (req, res) => {
    const result = await pool.query("SELECT * FROM leadership_apps ORDER BY date DESC");
    res.json(result.rows);
});

app.post('/api/admin/leadership-review', checkAdmin, async (req, res) => {
    const { id, status, user_id } = req.body;
    await pool.query("UPDATE leadership_apps SET status = $1 WHERE id = $2", [status, id]);
    if(status === 'APPROVED') await pool.query("UPDATE users SET role = 'LEADER' WHERE id = $1", [user_id]);
    res.json({ success: true });
});

// NEWS
app.get('/api/news', async (req, res) => {
    const result = await pool.query('SELECT * FROM news ORDER BY date DESC LIMIT 10');
    res.json(result.rows);
});
app.post('/api/news', checkAdmin, async (req, res) => {
    const { title, message, category } = req.body;
    await pool.query(`INSERT INTO news (title, message, category) VALUES ($1, $2, $3)`, [title, message, category]);
    res.json({ success: true });
});

// LIBRARY
app.get('/api/resources', async (req, res) => {
    const result = await pool.query('SELECT * FROM resources ORDER BY date DESC');
    res.json(result.rows);
});
app.post('/api/upload-resource', isAuthenticated, upload.single('document'), async (req, res) => {
    const { title, university, course_code } = req.body;
    const userRes = await pool.query('SELECT name FROM users WHERE id = $1', [req.session.userId]);
    await pool.query(`INSERT INTO resources (title, university, course_code, file_path, file_type, uploaded_by) VALUES ($1, $2, $3, $4, $5, $6)`,
        [title, university, course_code, req.file.filename, path.extname(req.file.originalname), userRes.rows[0].name]);
    res.json({ success: true });
});

// CHAT
app.get('/api/chat', async (req, res) => {
    const result = await pool.query('SELECT * FROM global_chat ORDER BY date DESC LIMIT 50');
    res.json(result.rows.reverse());
});
app.post('/api/chat', isAuthenticated, async (req, res) => {
    const userRes = await pool.query('SELECT name, institution FROM users WHERE id = $1', [req.session.userId]);
    const user = userRes.rows[0];
    await pool.query(`INSERT INTO global_chat (user_id, user_name, institution, message) VALUES ($1, $2, $3, $4)`,
        [req.session.userId, user.name, user.institution, req.body.message]);
    res.json({ success: true });
});

// SUPPORT
app.post('/api/support', isAuthenticated, async (req, res) => {
    const userRes = await pool.query('SELECT name FROM users WHERE id = $1', [req.session.userId]);
    await pool.query(`INSERT INTO support_tickets (user_id, user_name, message) VALUES ($1, $2, $3)`,
        [req.session.userId, userRes.rows[0].name, req.body.message]);
    res.redirect('/dashboard.html?msg=sent');
});

// START
app.listen(PORT, () => console.log(`🚀 Portal (PostgreSQL) running on Port ${PORT}`));