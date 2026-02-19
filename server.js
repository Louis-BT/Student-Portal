/**
 * ==============================================================================
 * 🎓 NATIONAL TERTIARY STUDENT PORTAL | SERVER ENGINE
 * ==============================================================================
 * @description Production-grade Node.js/Express server with PostgreSQL integration.
 * @author Lead Engineer
 * @version 2.6.1 (Stable & Patched)
 */

// --- 1. CORE DEPENDENCIES ---
const express = require('express');
const session = require('express-session');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
require('dotenv').config();

// --- 2. SERVER CONFIGURATION ---
const app = express();
const PORT = process.env.PORT || 3000;

app.set('trust proxy', 1); // Proxy trust for Render/Heroku environments

// Middleware Setup
app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('public'));

// Secure Session Configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'national-portal-secure-key-2026-v2',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 24 Hours
    }
}));

// File Upload Configuration
const uploadDir = path.join(__dirname, 'public/uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname.replace(/\s+/g, '_'));
    }
});
const upload = multer({ storage: storage });

// --- 3. DATABASE CONNECTION & INITIALIZATION ---
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    console.warn("⚠️ WARNING: DATABASE_URL not found. System running in limited mode.");
}

const pool = new Pool({
    connectionString: connectionString,
    ssl: { rejectUnauthorized: false }
});

const initDB = async () => {
    try {
        const client = await pool.connect();
        
        // 1. Users Table Schema
        await client.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                name TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                phone TEXT,
                institution TEXT,
                role TEXT DEFAULT 'STUDENT',
                gpa DECIMAL(4,2) DEFAULT 0.00,
                courses JSONB DEFAULT '[]',
                profile_pic TEXT,
                faculty TEXT, department TEXT, program TEXT,
                level TEXT, financial_status TEXT, year_entry TEXT, year_completion TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Database Schema Patch (Ensures legacy databases adopt the phone column)
        try {
            await client.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT;");
        } catch (e) { 
            console.log("Database schema patch notice:", e.message); 
        }

        // 2. Leadership Applications Schema
        await client.query(`
            CREATE TABLE IF NOT EXISTS leadership_apps (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id),
                name TEXT,
                institution TEXT,
                position TEXT,
                experience TEXT,
                vision TEXT,
                reference TEXT,
                status TEXT DEFAULT 'PENDING',
                date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // 3. News & Announcements Schema
        await client.query(`
            CREATE TABLE IF NOT EXISTS news (
                id SERIAL PRIMARY KEY,
                title TEXT,
                message TEXT,
                category TEXT,
                date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // 4. Library Resources Schema
        await client.query(`
            CREATE TABLE IF NOT EXISTS resources (
                id SERIAL PRIMARY KEY,
                title TEXT,
                category TEXT,
                file_path TEXT,
                uploaded_by TEXT,
                status TEXT DEFAULT 'PENDING',
                date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // 5. Support Tickets Schema
        await client.query(`
            CREATE TABLE IF NOT EXISTS support_tickets (
                id SERIAL PRIMARY KEY,
                user_id INTEGER,
                user_name TEXT,
                message TEXT,
                date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // 6. Connect / Messages Schema
        await client.query(`
            CREATE TABLE IF NOT EXISTS messages (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id),
                user_name TEXT,
                user_role TEXT,
                message TEXT NOT NULL,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // 7. Default Admin Account Provisioning
        const adminCheck = await client.query("SELECT id FROM users WHERE email = $1", ['admin@portal.edu.gh']);
        if (adminCheck.rows.length === 0) {
            const hashedPass = await bcrypt.hash('admin123', 10);
            await client.query(
                `INSERT INTO users (name, email, password, role, institution) VALUES ($1, $2, $3, $4, $5)`,
                ['System Administrator', 'admin@portal.edu.gh', hashedPass, 'ADMIN', 'National Directorate']
            );
            console.log("👑 Default Admin Account Provisioned.");
        }

        client.release();
        console.log("✅ Database Synced & Ready.");
    } catch (err) {
        console.error("❌ Database Initialization Failed:", err.message);
    }
};

initDB();

// --- 4. SECURITY & AUTH MIDDLEWARE ---
function isAuthenticated(req, res, next) {
    if (req.session.userId) return next();
    res.status(401).json({ error: "Access Denied. Please Login." });
}

function checkAdmin(req, res, next) {
    if (req.session.userId && req.session.role === 'ADMIN') return next();
    res.status(403).json({ error: "Forbidden: Administrators Only." });
}

// ==============================================================================
// 5. API ROUTES
// ==============================================================================

// --- AUTHENTICATION ---
app.post('/api/auth/signup', async (req, res) => {
    const { name, email, password, phone } = req.body;
    try {
        await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT;");
        const check = await pool.query("SELECT id FROM users WHERE email = $1", [email]);
        if (check.rows.length > 0) return res.status(400).json({ error: "Email already registered." });

        const hashedPass = await bcrypt.hash(password, 10);
        await pool.query(
            `INSERT INTO users (name, email, password, phone) VALUES ($1, $2, $3, $4)`,
            [name, email, hashedPass, phone]
        );
        res.json({ success: true, message: "Account created." });
    } catch (err) {
        console.error("Signup Error:", err);
        res.status(500).json({ error: "Server Error" });
    }
});

app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
        const user = result.rows[0];

        if (user && await bcrypt.compare(password, user.password)) {
            req.session.userId = user.id;
            req.session.role = user.role;
            
            res.json({ 
                success: true, 
                user: { 
                    id: user.id, 
                    name: user.name, 
                    email: user.email, 
                    role: user.role, 
                    institution: user.institution, 
                    avatar: user.profile_pic 
                } 
            });
        } else {
            res.status(401).json({ error: "Invalid Email or Password" });
        }
    } catch (err) {
        console.error("Login Error:", err);
        res.status(500).json({ error: "Database Connection Error" });
    }
});

app.post('/api/auth/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true });
});

app.post('/api/auth/forgot-password', (req, res) => {
    const { email } = req.body;
    console.log(`[PASSWORD RESET REQUEST] Email: ${email}`);
    setTimeout(() => {
        res.json({ 
            success: true, 
            message: "If an account exists, a reset link has been sent to your email." 
        });
    }, 1500);
});

// --- USER PROFILE & ACADEMICS ---
app.get('/api/user/profile', isAuthenticated, async (req, res) => {
    const result = await pool.query("SELECT * FROM users WHERE id = $1", [req.session.userId]);
    if(result.rows[0]) delete result.rows[0].password;
    res.json(result.rows[0]);
});

app.post('/api/user/update-profile', isAuthenticated, async (req, res) => {
    const { name, institution, faculty, department, program, level, financial, entry, completion } = req.body;
    try {
        await pool.query(
            `UPDATE users SET name=$1, institution=$2, faculty=$3, department=$4, program=$5, level=$6, financial_status=$7, year_entry=$8, year_completion=$9 WHERE id=$10`,
            [name, institution, faculty, department, program, level, financial, entry, completion, req.session.userId]
        );
        res.json({ success: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Profile Update Failed" });
    }
});

app.post('/api/user/save-gpa', isAuthenticated, async (req, res) => {
    const { gpa, courses } = req.body;
    await pool.query("UPDATE users SET gpa=$1, courses=$2 WHERE id=$3", [gpa, JSON.stringify(courses), req.session.userId]);
    res.json({ success: true });
});

// --- LEADERSHIP VANGUARD ---
app.post('/api/leadership/apply', isAuthenticated, async (req, res) => {
    const { position, experience, vision, reference } = req.body;
    const userRes = await pool.query("SELECT name, institution FROM users WHERE id=$1", [req.session.userId]);
    const user = userRes.rows[0];

    await pool.query(
        `INSERT INTO leadership_apps (user_id, name, institution, position, experience, vision, reference) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [req.session.userId, user.name, user.institution, position, experience, vision, reference]
    );
    res.json({ success: true });
});

app.get('/api/leadership/status', isAuthenticated, async (req, res) => {
    const result = await pool.query("SELECT status FROM leadership_apps WHERE user_id=$1 ORDER BY date DESC LIMIT 1", [req.session.userId]);
    res.json(result.rows[0] || { status: 'NONE' });
});

// --- LIBRARY & RESOURCES ---
app.get('/api/library/resources', async (req, res) => {
    const result = await pool.query("SELECT * FROM resources WHERE status='APPROVED' ORDER BY date DESC");
    res.json(result.rows);
});

app.post('/api/library/upload', isAuthenticated, upload.single('file'), async (req, res) => {
    const { title, category } = req.body;
    const userRes = await pool.query("SELECT name FROM users WHERE id=$1", [req.session.userId]);
    
    await pool.query(
        `INSERT INTO resources (title, category, file_path, uploaded_by) VALUES ($1, $2, $3, $4)`,
        [title, category, req.file.filename, userRes.rows[0].name]
    );
    res.json({ success: true, message: "Uploaded for Review" });
});

// --- COMMUNITY CONNECT (CHAT) ---
app.get('/api/chat', async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM messages ORDER BY timestamp ASC LIMIT 50");
        res.json(result.rows);
    } catch (e) { 
        res.status(500).json({ error: "Chat load failed" }); 
    }
});

app.post('/api/chat', isAuthenticated, async (req, res) => {
    const { message } = req.body;
    const userRes = await pool.query("SELECT name, role FROM users WHERE id=$1", [req.session.userId]);
    const user = userRes.rows[0];

    try {
        await pool.query(
            "INSERT INTO messages (user_id, user_name, user_role, message) VALUES ($1, $2, $3, $4)",
            [req.session.userId, user.name, user.role, message]
        );
        res.json({ success: true });
    } catch (e) { 
        res.status(500).json({ error: "Message failed" }); 
    }
});

// --- SYSTEM ADMINISTRATION CONSOLE ---
app.get('/api/admin/users', checkAdmin, async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM users ORDER BY id DESC");
        res.json(result.rows);
    } catch (e) { 
        res.status(500).json({ error: "Fetch Error" }); 
    }
});

app.delete('/api/admin/delete-user/:id', checkAdmin, async (req, res) => {
    try {
        await pool.query('DELETE FROM users WHERE id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (e) { 
        res.status(500).json({ error: "Delete Error" }); 
    }
});

app.delete('/api/admin/reset-system', checkAdmin, async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        await client.query("DELETE FROM leadership_apps");
        await client.query("DELETE FROM support_tickets");
        await client.query("DELETE FROM users WHERE role != 'ADMIN'");
        await client.query('COMMIT');
        res.json({ success: true, message: "System Wiped" });
    } catch (e) {
        await client.query('ROLLBACK');
        console.error("Reset Error:", e);
        res.status(500).json({ error: "System Reset Failed" });
    } finally {
        client.release();
    }
});

app.get('/api/admin/stats', checkAdmin, async (req, res) => {
    try {
        const users = await pool.query("SELECT COUNT(*) FROM users WHERE role='STUDENT'");
        const leaders = await pool.query("SELECT COUNT(*) FROM leadership_apps WHERE status='PENDING'");
        const files = await pool.query("SELECT COUNT(*) FROM resources WHERE status='PENDING'");
        
        res.json({
            students: parseInt(users.rows[0].count),
            pending_leaders: parseInt(leaders.rows[0].count),
            pending_files: parseInt(files.rows[0].count)
        });
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch stats" });
    }
});

app.post('/api/admin/broadcast', checkAdmin, async (req, res) => {
    const { title, message, category } = req.body;
    await pool.query("INSERT INTO news (title, message, category) VALUES ($1, $2, $3)", [title, message, category]);
    res.json({ success: true });
});

app.post('/api/admin/leadership-review', checkAdmin, async (req, res) => {
    const { id, status } = req.body;
    await pool.query("UPDATE leadership_apps SET status=$1 WHERE id=$2", [status, id]);
    res.json({ success: true });
});

app.post('/api/admin/resource-review', checkAdmin, async (req, res) => {
    const { id, status } = req.body;
    try {
        await pool.query("UPDATE resources SET status = $1 WHERE id = $2", [status, id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: "Failed to update resource" });
    }
});

app.get('/api/admin/seed-library', checkAdmin, async (req, res) => {
    try {
        const samples = [
            ['Calculus Study Guide', 'BOOK', 'calculus_guide.pdf', 'Academic Dept'],
            ['Intro to CS Past Questions (2025)', 'PAST_QUESTION', 'cs_pq_2025.pdf', 'Student Union'],
            ['Web Development Lecture Notes', 'NOTES', 'web_dev_notes.pdf', 'Dr. Arhin'],
            ['Academic Writing Handbook', 'BOOK', 'writing_handbook.pdf', 'English Dept']
        ];

        for (const [title, category, path, user] of samples) {
            await pool.query(
                "INSERT INTO resources (title, category, file_path, uploaded_by, status) VALUES ($1, $2, $3, $4, 'APPROVED')",
                [title, category, path, user]
            );
        }
        res.json({ success: true, message: "Library seeded with professional samples!" });
    } catch (e) {
        res.status(500).json({ error: "Seeding failed" });
    }
});

// --- SUPPORT TICKETS & NOTIFICATIONS ---
app.get('/api/news', async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM news ORDER BY date DESC LIMIT 5");
        res.json(result.rows);
    } catch (e) {
        res.status(500).json({ error: "Failed to load news" });
    }
});

app.post('/api/support/create', isAuthenticated, async (req, res) => {
    const { message } = req.body;
    const user = await pool.query("SELECT name FROM users WHERE id=$1", [req.session.userId]);
    await pool.query("INSERT INTO support_tickets (user_id, user_name, message) VALUES ($1, $2, $3)", 
        [req.session.userId, user.rows[0].name, message]);
    res.json({ success: true });
});

// ==============================================================================
// 6. GLOBAL ERROR & FALLBACK HANDLING
// ==============================================================================

// 404 HANDLER (MUST BE AT THE VERY BOTTOM OF ALL ROUTES)
app.get('*', (req, res) => {
    res.status(404).sendFile(path.join(__dirname, 'public/index.html'));
});

// SERVER INITIALIZATION
app.listen(PORT, () => {
    console.log(`\n=================================================`);
    console.log(`🚀 National Student Portal Server Live`);
    console.log(`📡 Port: ${PORT}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'Development'}`);
    console.log(`⏱️  Started at: ${new Date().toLocaleString()}`);
    console.log(`=================================================\n`);
});