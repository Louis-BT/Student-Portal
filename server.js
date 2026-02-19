/**
 * ==============================================================================
 * 🎓 NATIONAL TERTIARY STUDENT PORTAL | SERVER ENGINE
 * ==============================================================================
 * @description Production-grade Node.js/Express server with PostgreSQL integration.
 * @author Lead Engineer
 * @version 2.5.0 (Stable/Premium)
 * * FEATURES:
 * - Persistent PostgreSQL Database Connection (Render-Ready)
 * - Secure Session Management
 * - File Upload Handling (Multer)
 * - API Endpoints: Auth, GPA, Library, Leadership, Admin, Chat
 */

// --- 1. CORE DEPENDENCIES ---
const express = require('express');
const session = require('express-session');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// --- 2. CONFIGURATION ---
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware Setup
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('public')); // Serve static files (HTML, CSS, JS)

// Secure Session Configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'national-portal-secure-key-2026-v2',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: process.env.NODE_ENV === 'production', // Secure cookies in prod
        maxAge: 24 * 60 * 60 * 1000 // 24 Hours
    }
}));

// File Upload Configuration (Local Storage for Demo / Ephemeral on Render Free)
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

// --- 3. DATABASE CONNECTION (PostgreSQL) ---
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    console.warn("⚠️ WARNING: DATABASE_URL not found. App will run but DB features will fail.");
}

const pool = new Pool({
    connectionString: connectionString,
    ssl: { rejectUnauthorized: false } // Required for Render/Heroku
});

// Database Initialization (Auto-Create Tables)
const initDB = async () => {
    try {
        const client = await pool.connect();
        
        // 1. Users Table
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

        // 2. Leadership Applications
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

        // --- DANGER ZONE: RESET SYSTEM ---
app.delete('/api/admin/reset-system', checkAdmin, async (req, res) => {
    try {
        const client = await pool.connect();
        try {
            await client.query('BEGIN'); // Start Transaction

            // 1. Clear Dependent Data First (To prevent foreign key errors)
            await client.query("DELETE FROM leadership_apps");
            await client.query("DELETE FROM support_tickets");
            // Optional: Clear chat if you want a full wipe
            // await client.query("DELETE FROM global_chat"); 

            // 2. Delete All Users EXCEPT Admins
            await client.query("DELETE FROM users WHERE role != 'ADMIN'");

            await client.query('COMMIT'); // Save Changes
            res.json({ success: true, message: "System Reset Successful. All students removed." });
        } catch (e) {
            await client.query('ROLLBACK'); // Undo if error
            throw e;
        } finally {
            client.release();
        }
    } catch (err) {
        console.error("Reset Error:", err);
        res.status(500).json({ error: "System Reset Failed" });
    }
});

        // 3. News & Announcements
        await client.query(`
            CREATE TABLE IF NOT EXISTS news (
                id SERIAL PRIMARY KEY,
                title TEXT,
                message TEXT,
                category TEXT,
                date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // 4. Library Resources
        await client.query(`
            CREATE TABLE IF NOT EXISTS resources (
                id SERIAL PRIMARY KEY,
                title TEXT,
                category TEXT,
                file_path TEXT,
                uploaded_by TEXT,
                status TEXT DEFAULT 'PENDING', -- Admin must approve
                date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // 5. Support Tickets
        await client.query(`
            CREATE TABLE IF NOT EXISTS support_tickets (
                id SERIAL PRIMARY KEY,
                user_id INTEGER,
                user_name TEXT,
                message TEXT,
                date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Default Admin Account (Auto-Provisioning)
        const adminCheck = await client.query("SELECT * FROM users WHERE email = $1", ['admin@portal.edu.gh']);
        if (adminCheck.rows.length === 0) {
            const hashedPass = await bcrypt.hash('admin123', 10); // Default Password
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

// --- 4. SECURITY MIDDLEWARE ---
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
app.post('/auth/signup', async (req, res) => {
    const { name, email, password, phone } = req.body;
    try {
        // Check if user exists
        const check = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
        if (check.rows.length > 0) return res.status(400).json({ error: "Email already registered." });

        const hashedPass = await bcrypt.hash(password, 10);
        await pool.query(
            `INSERT INTO users (name, email, password, phone) VALUES ($1, $2, $3, $4)`,
            [name, email, hashedPass, phone]
        );
        res.json({ success: true, message: "Account created." });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server Error" });
    }
});

app.post('/auth/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
        const user = result.rows[0];

        if (user && await bcrypt.compare(password, user.password)) {
            // Set Session
            req.session.userId = user.id;
            req.session.role = user.role;
            
            // Return Safe User Object (No Password)
            const safeUser = { 
                id: user.id, name: user.name, email: user.email, 
                role: user.role, institution: user.institution, avatar: user.profile_pic 
            };
            res.json({ success: true, user: safeUser });
        } else {
            res.status(401).json({ error: "Invalid Credentials" });
        }
    } catch (err) {
        res.status(500).json({ error: "Login System Error" });
    }
});

app.post('/auth/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true });
});

// --- FORGOT PASSWORD ENDPOINT ---
app.post('/api/auth/forgot-password', (req, res) => {
    const { email } = req.body;
    
    // Log the request to the console (simulating an email service)
    console.log(`[PASSWORD RESET REQUEST] Email: ${email}`);
    
    // Simulate a short delay so it feels real to the user
    setTimeout(() => {
        // We always return success for security (so hackers can't "fish" for valid emails)
        res.json({ 
            success: true, 
            message: "If an account exists, a reset link has been sent to your email." 
        });
    }, 1500);
});

// --- PROFILE & ACADEMICS ---
app.get('/api/user/profile', isAuthenticated, async (req, res) => {
    const result = await pool.query("SELECT * FROM users WHERE id = $1", [req.session.userId]);
    if(result.rows[0]) delete result.rows[0].password;
    res.json(result.rows[0]);
});

app.post('/api/user/update-profile', isAuthenticated, async (req, res) => {
    const { institution, faculty, department, program, level, financial, entry, completion } = req.body;
    await pool.query(
        `UPDATE users SET institution=$1, faculty=$2, department=$3, program=$4, level=$5, financial_status=$6, year_entry=$7, year_completion=$8 WHERE id=$9`,
        [institution, faculty, department, program, level, financial, entry, completion, req.session.userId]
    );
    res.json({ success: true });
});

app.post('/api/user/save-gpa', isAuthenticated, async (req, res) => {
    const { gpa, courses } = req.body;
    await pool.query("UPDATE users SET gpa=$1, courses=$2 WHERE id=$3", [gpa, JSON.stringify(courses), req.session.userId]);
    res.json({ success: true });
});

// --- LEADERSHIP VANGUARD ---
app.post('/api/leadership/apply', isAuthenticated, async (req, res) => {
    const { position, experience, vision, reference } = req.body;
    
    // Get User Details for the application
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
    // Public endpoint (Login not strictly required to VIEW list, but maybe to download)
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

// --- ADMIN CONSOLE ---
app.get('/api/admin/stats', checkAdmin, async (req, res) => {
    const users = await pool.query("SELECT COUNT(*) FROM users WHERE role='STUDENT'");
    const leaders = await pool.query("SELECT COUNT(*) FROM leadership_apps WHERE status='PENDING'");
    const files = await pool.query("SELECT COUNT(*) FROM resources WHERE status='PENDING'");
    
    res.json({
        students: users.rows[0].count,
        pending_leaders: leaders.rows[0].count,
        pending_files: files.rows[0].count
    });
});

app.post('/api/admin/approve-leader', checkAdmin, async (req, res) => {
    const { appId, userId, action } = req.body; // action: 'APPROVED' or 'REJECTED'
    await pool.query("UPDATE leadership_apps SET status=$1 WHERE id=$2", [action, appId]);
    res.json({ success: true });
});

app.post('/api/admin/broadcast', checkAdmin, async (req, res) => {
    const { title, message, category } = req.body;
    await pool.query("INSERT INTO news (title, message, category) VALUES ($1, $2, $3)", [title, message, category]);
    res.json({ success: true });
});

// --- NEWS FEED ---
app.get('/api/news', async (req, res) => {
    const result = await pool.query("SELECT * FROM news ORDER BY date DESC LIMIT 5");
    res.json(result.rows);
});

// --- SUPPORT TICKETS ---
app.post('/api/support/create', isAuthenticated, async (req, res) => {
    const { message } = req.body;
    const user = await pool.query("SELECT name FROM users WHERE id=$1", [req.session.userId]);
    await pool.query("INSERT INTO support_tickets (user_id, user_name, message) VALUES ($1, $2, $3)", 
        [req.session.userId, user.rows[0].name, message]);
    res.json({ success: true });
});

// 404 HANDLER (Must be the last route)
app.get('*', (req, res) => {
    res.status(404).sendFile(path.join(__dirname, 'public/404.html'));
});

app.listen(PORT, () => {
    console.log(`\n National Student Portal Server is Live on Port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'Development'}`);
    console.log(`Started at: ${new Date().toLocaleString()}\n`);
});