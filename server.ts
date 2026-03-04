import express from "express";
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

const db = new Database("invoices.db");

// Initialize database (SQLite version for preview)
db.exec(`
  CREATE TABLE IF NOT EXISTS invoices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    customer_name TEXT NOT NULL,
    item_name TEXT NOT NULL,
    price REAL NOT NULL,
    quantity INTEGER NOT NULL,
    total REAL NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS password_resets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL,
    code TEXT NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    address TEXT,
    dob TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS profiles (
    user_id INTEGER PRIMARY KEY,
    shop_name TEXT,
    address TEXT,
    phone TEXT,
    gstin TEXT,
    email TEXT,
    shop_logo TEXT,
    signature TEXT
  );
`);

import nodemailer from "nodemailer";

let transporter: any = null;
const getTransporter = () => {
    if (!transporter) {
        const user = process.env.GMAIL_USER;
        const pass = process.env.GMAIL_APP_PASSWORD;
        if (!user || !pass) {
            throw new Error("GMAIL_USER and GMAIL_APP_PASSWORD must be set in environment variables");
        }
        transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: { user, pass },
        });
    }
    return transporter;
};

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Mock session for preview - Persist to file to survive restarts
const SESSION_FILE = './mock_session.json';
let mockSession: any = {};
try {
    if (fs.existsSync(SESSION_FILE)) {
        mockSession = JSON.parse(fs.readFileSync(SESSION_FILE, 'utf8'));
    }
} catch (e) {
    mockSession = {};
}

// Auto-login/Seed default user for preview environment
const ensureDefaultUser = () => {
    try {
        let user = db.prepare("SELECT * FROM users LIMIT 1").get() as any;
        if (!user) {
            console.log("Seeding default user...");
            const stmt = db.prepare("INSERT INTO users (username, email, password) VALUES (?, ?, ?)");
            const result = stmt.run("admin", "admin@example.com", "admin123");
            user = { id: result.lastInsertRowid, username: "admin" };
            
            // Seed a default profile too
            db.prepare("INSERT INTO profiles (user_id, shop_name, email) VALUES (?, ?, ?)")
              .run(user.id, "Micro Invoice POS", "admin@example.com");
        }
        
        if (!mockSession.user_id) {
            console.log("Auto-logging in default user:", user.username);
            mockSession.user_id = user.id;
            mockSession.username = user.username;
            saveSession();
        }
    } catch (err) {
        console.error("Error ensuring default user:", err);
    }
};

const saveSession = () => {
    fs.writeFileSync(SESSION_FILE, JSON.stringify(mockSession));
};

ensureDefaultUser();

// Mock auth_api.php
app.all("/auth_api.php", async (req, res) => {
    const action = req.query.action;
    const method = req.method;

    try {
        console.log(`Auth API call: action=${action}, method=${method}, body=${JSON.stringify(req.body)}`);
        if (action === 'register') {
            const { username, email, password } = req.body;
            const stmt = db.prepare("INSERT INTO users (username, email, password) VALUES (?, ?, ?)");
            stmt.run(username, email, password); // In mock, we don't hash for simplicity
            return res.json({ success: true });
        }

        if (action === 'login') {
            const { username, password } = req.body;
            const user = db.prepare("SELECT * FROM users WHERE username = ? OR email = ?").get(username, username) as any;
            if (user && user.password === password) {
                mockSession.user_id = user.id;
                mockSession.username = user.username;
                saveSession();
                return res.json({ success: true });
            }
            return res.json({ error: "Invalid credentials" });
        }

        if (action === 'check') {
            if (mockSession.user_id) {
                const user = db.prepare("SELECT email FROM users WHERE id = ?").get(mockSession.user_id) as any;
                const profile = db.prepare("SELECT * FROM profiles WHERE user_id = ?").get(mockSession.user_id);
                return res.json({ 
                    authenticated: true, 
                    username: mockSession.username, 
                    email: user?.email,
                    profile: profile || {} 
                });
            }
            return res.json({ authenticated: false });
        }

        if (action === 'update_profile') {
            const { shop_name, address, phone, gstin, email, shop_logo, signature } = req.body;
            const exists = db.prepare("SELECT user_id FROM profiles WHERE user_id = ?").get(mockSession.user_id);
            if (exists) {
                db.prepare("UPDATE profiles SET shop_name=?, address=?, phone=?, gstin=?, email=?, shop_logo=?, signature=? WHERE user_id=?")
                  .run(shop_name, address, phone, gstin, email, shop_logo, signature, mockSession.user_id);
            } else {
                db.prepare("INSERT INTO profiles (user_id, shop_name, address, phone, gstin, email, shop_logo, signature) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
                  .run(mockSession.user_id, shop_name, address, phone, gstin, email, shop_logo, signature);
            }
            return res.json({ success: true });
        }

        if (action === 'logout') {
            mockSession = {};
            saveSession();
            return res.json({ success: true });
        }

        if (action === 'forgot-password' || action === 'forgot_password') {
            const { email } = req.body;
            const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email) as any;
            if (!user) {
                return res.json({ error: "Email not found" });
            }

            const code = Math.floor(100000 + Math.random() * 900000).toString();
            const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 mins

            db.prepare("DELETE FROM password_resets WHERE email = ?").run(email);
            db.prepare("INSERT INTO password_resets (email, code, expires_at) VALUES (?, ?, ?)").run(email, code, expiresAt);

            try {
                const mailTransporter = getTransporter();
                await mailTransporter.sendMail({
                    from: process.env.GMAIL_USER,
                    to: email,
                    subject: "Password Reset Code",
                    text: `Your password reset code is: ${code}. It expires in 15 minutes.`,
                    html: `<p>Your password reset code is: <strong>${code}</strong>.</p><p>It expires in 15 minutes.</p>`
                });
                return res.json({ success: true });
            } catch (err: any) {
                console.error("Email error:", err);
                return res.status(500).json({ error: "Failed to send email. Please check server logs." });
            }
        }

        if (action === 'verify-code' || action === 'verify_code') {
            const { email, code } = req.body;
            const reset = db.prepare("SELECT * FROM password_resets WHERE email = ? AND code = ? AND expires_at > ?").get(email, code, new Date().toISOString()) as any;
            if (reset) {
                return res.json({ success: true });
            }
            return res.json({ error: "Invalid or expired code" });
        }

        if (action === 'reset-password' || action === 'reset_password') {
            const { email, code, newPassword } = req.body;
            const reset = db.prepare("SELECT * FROM password_resets WHERE email = ? AND code = ? AND expires_at > ?").get(email, code, new Date().toISOString()) as any;
            if (reset) {
                db.prepare("UPDATE users SET password = ? WHERE email = ?").run(newPassword, email);
                db.prepare("DELETE FROM password_resets WHERE email = ?").run(email);
                return res.json({ success: true });
            }
            return res.json({ error: "Invalid or expired code" });
        }

        res.status(400).json({ error: `Invalid action: ${action}` });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// Mock api.php for the preview environment
app.all("/api.php", (req, res) => {
    const action = req.query.action;
    const method = req.method;

    // Auth check for mock API
    if (!mockSession.user_id) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    try {
        console.log(`API call: action=${action}, method=${method}, user_id=${mockSession.user_id}`);
        console.log("Request Query:", JSON.stringify(req.query));
        console.log("Request Body:", JSON.stringify(req.body));

        if (action === 'read') {
            const invoices = db.prepare("SELECT * FROM invoices WHERE user_id = ? ORDER BY created_at DESC").all(mockSession.user_id);
            return res.json(invoices);
        }

        if (action === 'customers_read') {
            const customers = db.prepare("SELECT * FROM customers WHERE user_id = ? ORDER BY name ASC").all(mockSession.user_id);
            return res.json(customers);
        }

        if (method === 'POST') {
            const data = req.body;
            console.log("API POST data:", JSON.stringify(data));

            if (action === 'customers_create') {
                const { name, phone, email, address, dob } = data;
                console.log(`Creating customer for user ${mockSession.user_id}: ${name}`);
                
                if (!name || name.trim() === '') {
                    console.error("Customer creation failed: Name is missing");
                    return res.status(400).json({ error: "Customer name is required" });
                }

                const stmt = db.prepare("INSERT INTO customers (user_id, name, phone, email, address, dob) VALUES (?, ?, ?, ?, ?, ?)");
                const result = stmt.run(mockSession.user_id, name, phone, email, address, dob);
                console.log("Customer create result:", JSON.stringify(result));
                return res.json({ success: true, id: result.lastInsertRowid });
            }

            if (action === 'customers_update') {
                const { id, name, phone, email, address, dob } = data;
                console.log(`Updating customer ${id} for user ${mockSession.user_id}: ${name}`);

                if (!id) {
                    return res.status(400).json({ error: "Customer ID is required" });
                }
                if (!name || name.trim() === '') {
                    return res.status(400).json({ error: "Customer name is required" });
                }

                const stmt = db.prepare("UPDATE customers SET name=?, phone=?, email=?, address=?, dob=? WHERE id=? AND user_id=?");
                const result = stmt.run(name, phone, email, address, dob, id, mockSession.user_id);
                console.log("Customer update result:", JSON.stringify(result));
                return res.json({ success: true });
            }

            if (action === 'customers_delete') {
                const { id } = data;
                const stmt = db.prepare("DELETE FROM customers WHERE id=? AND user_id=?");
                stmt.run(id, mockSession.user_id);
                return res.json({ success: true });
            }

            if (action === 'create') {
                const { customer_name, item_name, price, quantity } = data;
                const total = price * quantity;
                const stmt = db.prepare("INSERT INTO invoices (user_id, customer_name, item_name, price, quantity, total) VALUES (?, ?, ?, ?, ?, ?)");
                const result = stmt.run(mockSession.user_id, customer_name, item_name, price, quantity, total);
                return res.json({ success: true, id: result.lastInsertRowid });
            }

            if (action === 'update') {
                const { id, customer_name, item_name, price, quantity } = data;
                const total = price * quantity;
                const stmt = db.prepare("UPDATE invoices SET customer_name=?, item_name=?, price=?, quantity=?, total=? WHERE id=? AND user_id=?");
                stmt.run(customer_name, item_name, price, quantity, total, id, mockSession.user_id);
                return res.json({ success: true });
            }

            if (action === 'delete') {
                const { id } = data;
                const stmt = db.prepare("DELETE FROM invoices WHERE id=? AND user_id=?");
                stmt.run(id, mockSession.user_id);
                return res.json({ success: true });
            }
        }

        res.status(400).json({ error: "Invalid action or method" });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

app.use(express.static(path.join(process.cwd(), ".")));

// Debug route to check database state
app.get("/test_db.php", (req, res) => {
    try {
        const users = db.prepare("SELECT id, username, email FROM users").all();
        const customers = db.prepare("SELECT * FROM customers").all();
        const invoices = db.prepare("SELECT * FROM invoices").all();
        const profiles = db.prepare("SELECT * FROM profiles").all();
        
        let html = `
            <html>
            <head>
                <title>Database Debugger</title>
                <style>
                    body { font-family: sans-serif; padding: 20px; line-height: 1.5; }
                    table { border-collapse: collapse; width: 100%; margin-bottom: 30px; }
                    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                    th { background-color: #f2f2f2; }
                    h2 { color: #333; border-bottom: 2px solid #333; padding-bottom: 10px; }
                    .session-info { background: #f9f9f9; padding: 15px; border-radius: 8px; border: 1px solid #ddd; margin-bottom: 20px; }
                </style>
            </head>
            <body>
                <h1>Database Debugger</h1>
                
                <div class="session-info">
                    <h2>Current Mock Session</h2>
                    <pre>${JSON.stringify(mockSession, null, 2)}</pre>
                </div>

                <h2>Users (${users.length})</h2>
                <table>
                    <tr><th>ID</th><th>Username</th><th>Email</th></tr>
                    ${users.map((u: any) => `<tr><td>${u.id}</td><td>${u.username}</td><td>${u.email}</td></tr>`).join('')}
                </table>

                <h2>Customers (${customers.length})</h2>
                <table>
                    <tr><th>ID</th><th>User ID</th><th>Name</th><th>Phone</th><th>Email</th><th>Address</th><th>DOB</th><th>Created At</th></tr>
                    ${customers.map((c: any) => `<tr><td>${c.id}</td><td>${c.user_id}</td><td>${c.name}</td><td>${c.phone}</td><td>${c.email}</td><td>${c.address}</td><td>${c.dob}</td><td>${c.created_at}</td></tr>`).join('')}
                </table>

                <h2>Invoices (${invoices.length})</h2>
                <table>
                    <tr><th>ID</th><th>User ID</th><th>Customer</th><th>Total</th><th>Date</th></tr>
                    ${invoices.map((i: any) => `<tr><td>${i.id}</td><td>${i.user_id}</td><td>${i.customer_name}</td><td>${i.total}</td><td>${i.created_at}</td></tr>`).join('')}
                </table>

                <h2>Profiles (${profiles.length})</h2>
                <table>
                    <tr><th>User ID</th><th>Shop Name</th><th>Email</th></tr>
                    ${profiles.map((p: any) => `<tr><td>${p.user_id}</td><td>${p.shop_name}</td><td>${p.email}</td></tr>`).join('')}
                </table>
            </body>
            </html>
        `;
        res.send(html);
    } catch (err: any) {
        res.status(500).send(`<h1>Error Debugging Database</h1><pre>${err.message}</pre>`);
    }
});

app.listen(PORT, "0.0.0.0", () => {
    console.log(`Preview server running on http://localhost:${PORT}`);
});
