import express from "express";
import Database from "better-sqlite3";
import path from "path";

const db = new Database("invoices.db");

// Initialize database (SQLite version for preview)
db.exec(`
  CREATE TABLE IF NOT EXISTS invoices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_name TEXT NOT NULL,
    item_name TEXT NOT NULL,
    price REAL NOT NULL,
    quantity INTEGER NOT NULL,
    total REAL NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static(path.join(process.cwd(), ".")));

// Mock api.php for the preview environment
app.all("/api.php", (req, res) => {
    const action = req.query.action;
    const method = req.method;

    try {
        if (action === 'read') {
            const invoices = db.prepare("SELECT * FROM invoices ORDER BY created_at DESC").all();
            return res.json(invoices);
        }

        if (method === 'POST') {
            const data = req.body;

            if (action === 'create') {
                const { customer_name, item_name, price, quantity } = data;
                const total = price * quantity;
                const stmt = db.prepare("INSERT INTO invoices (customer_name, item_name, price, quantity, total) VALUES (?, ?, ?, ?, ?)");
                const result = stmt.run(customer_name, item_name, price, quantity, total);
                return res.json({ success: true, id: result.lastInsertRowid });
            }

            if (action === 'update') {
                const { id, customer_name, item_name, price, quantity } = data;
                const total = price * quantity;
                const stmt = db.prepare("UPDATE invoices SET customer_name=?, item_name=?, price=?, quantity=?, total=? WHERE id=?");
                stmt.run(customer_name, item_name, price, quantity, total, id);
                return res.json({ success: true });
            }

            if (action === 'delete') {
                const { id } = data;
                const stmt = db.prepare("DELETE FROM invoices WHERE id=?");
                stmt.run(id);
                return res.json({ success: true });
            }
        }

        res.status(400).json({ error: "Invalid action or method" });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(PORT, "0.0.0.0", () => {
    console.log(`Preview server running on http://localhost:${PORT}`);
});
