import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import dotenv from "dotenv";
import { scryptSync, randomBytes, timingSafeEqual } from "crypto";

dotenv.config();

const HASH_SEPARATOR = ".";

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hashedPassword = scryptSync(password, salt, 64).toString("hex");
  return `${hashedPassword}${HASH_SEPARATOR}${salt}`;
}

function verifyPassword(storedHash: string, suppliedPassword: string): boolean {
  try {
    const [hashedPassword, salt] = storedHash.split(HASH_SEPARATOR);
    if (!hashedPassword || !salt) {
      return false;
    }
    const suppliedHash = scryptSync(suppliedPassword, salt, 64);
    return timingSafeEqual(Buffer.from(hashedPassword, "hex"), suppliedHash);
  } catch (error) {
    console.error("Password verification failed:", error);
    return false;
  }
}

const db = new Database("salon.db");

// --- Database Schema Migration ---
const LATEST_SCHEMA_VERSION = 2; // Increment this number with each schema change

const currentVersion = db.pragma('user_version', { simple: true }) as number;

if (currentVersion < LATEST_SCHEMA_VERSION) {
  console.log(`Database schema is outdated (v${currentVersion}). Resetting and migrating to v${LATEST_SCHEMA_VERSION}...`);
  // For development, the simplest migration is to drop tables and recreate them.
  // In production, you would use a more sophisticated migration strategy.
  db.exec(`
    DROP TABLE IF EXISTS notifications;
    DROP TABLE IF EXISTS settings;
    DROP TABLE IF EXISTS products;
    DROP TABLE IF EXISTS appointments;
    DROP TABLE IF EXISTS clients;
    DROP TABLE IF EXISTS services;
    DROP TABLE IF EXISTS users;
    DROP TABLE IF EXISTS stores;
  `);
}

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS stores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL
  );

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT CHECK(role IN ('ADMIN', 'MANAGER', 'COLLABORATOR')) NOT NULL,
    commission_rate REAL DEFAULT 0,
    store_id INTEGER,
    FOREIGN KEY (store_id) REFERENCES stores(id)
  );

  CREATE TABLE IF NOT EXISTS services (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    price REAL NOT NULL,
    duration_minutes INTEGER NOT NULL,
    store_id INTEGER,
    FOREIGN KEY (store_id) REFERENCES stores(id)
  );

  CREATE TABLE IF NOT EXISTS clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT UNIQUE NOT NULL,
    cep TEXT NOT NULL,
    password TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS appointments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER NOT NULL,
    professional_id INTEGER NOT NULL,
    service_id INTEGER NOT NULL,
    start_time DATETIME NOT NULL,
    end_time DATETIME NOT NULL,
    status TEXT DEFAULT 'PENDING',
    store_id INTEGER,
    FOREIGN KEY (client_id) REFERENCES clients(id),
    FOREIGN KEY (professional_id) REFERENCES users(id),
    FOREIGN KEY (service_id) REFERENCES services(id),
    FOREIGN KEY (store_id) REFERENCES stores(id)
  );

  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    stock_quantity INTEGER NOT NULL,
    price REAL NOT NULL,
    store_id INTEGER,
    FOREIGN KEY (store_id) REFERENCES stores(id)
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT,
    value TEXT,
    store_id INTEGER,
    PRIMARY KEY (key, store_id),
    FOREIGN KEY (store_id) REFERENCES stores(id)
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    store_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT CHECK(type IN ('APPOINTMENT_REMINDER', 'SYSTEM', 'INVENTORY')) NOT NULL,
    is_read INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (store_id) REFERENCES stores(id)
  );
`);

// Set the new schema version if it was updated
if (currentVersion < LATEST_SCHEMA_VERSION) {
  db.pragma(`user_version = ${LATEST_SCHEMA_VERSION}`);
  console.log("Database reset and migration complete.");
}

// Seed initial data if empty
const storeCount = db.prepare("SELECT COUNT(*) as count FROM stores").get() as { count: number };
if (storeCount.count === 0) {
  const storeResult = db.prepare("INSERT INTO stores (name, code) VALUES (?, ?)").run("tBeauty", "TBTY123");
  const storeId = storeResult.lastInsertRowid;

  db.prepare("INSERT INTO users (name, email, password, role, commission_rate, store_id) VALUES (?, ?, ?, ?, ?, ?)").run("Usuário Admin", "admin@glow.com", hashPassword("admin123"), "ADMIN", 0, storeId);
  db.prepare("INSERT INTO users (name, email, password, role, commission_rate, store_id) VALUES (?, ?, ?, ?, ?, ?)").run("Gerente Sarah", "sarah@glow.com", hashPassword("sarah123"), "MANAGER", 10, storeId);
  db.prepare("INSERT INTO users (name, email, password, role, commission_rate, store_id) VALUES (?, ?, ?, ?, ?, ?)").run("Cabeleireiro João", "john@glow.com", hashPassword("john123"), "COLLABORATOR", 30, storeId);
  db.prepare("INSERT INTO users (name, email, password, role, commission_rate, store_id) VALUES (?, ?, ?, ?, ?, ?)").run("Manicure Maria", "maria@glow.com", hashPassword("maria123"), "COLLABORATOR", 35, storeId);

  db.prepare("INSERT INTO services (name, price, duration_minutes, store_id) VALUES (?, ?, ?, ?)").run("Corte de Cabelo", 50, 45, storeId);
  db.prepare("INSERT INTO services (name, price, duration_minutes, store_id) VALUES (?, ?, ?, ?)").run("Coloração", 120, 120, storeId);
  db.prepare("INSERT INTO services (name, price, duration_minutes, store_id) VALUES (?, ?, ?, ?)").run("Manicure", 30, 30, storeId);

  db.prepare("INSERT INTO clients (name, phone, cep, password) VALUES (?, ?, ?, ?)").run("Ana Souza", "11999999999", "01001000", hashPassword("ana123"));
  db.prepare("INSERT INTO clients (name, phone, cep, password) VALUES (?, ?, ?, ?)").run("Carlos Lima", "11888888888", "04538133", hashPassword("carlos123"));

  db.prepare("INSERT INTO products (name, stock_quantity, price, store_id) VALUES (?, ?, ?, ?)").run("Shampoo Pro", 15, 25, storeId);
  db.prepare("INSERT INTO products (name, stock_quantity, price, store_id) VALUES (?, ?, ?, ?)").run("Tinta Vermelha", 5, 15, storeId);

  db.prepare("INSERT INTO settings (key, value, store_id) VALUES (?, ?, ?)").run("salon_name", "tBeauty", storeId);
}

async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || "3002", 10);
  
  app.use(express.json());

  // Auth Routes
  app.post("/api/auth/register-store", (req, res) => {
    const { storeName, userName, email, password, storeCode: clientStoreCode } = req.body;
    
    // Função para gerar código aleatório de 6 caracteres
    const generateCode = () => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let code = '';
      for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return code;
    };

    const storeCode = clientStoreCode || generateCode();
    
    try {
      const transaction = db.transaction(() => {
        const hashedPassword = hashPassword(password);

        const storeResult = db.prepare("INSERT INTO stores (name, code) VALUES (?, ?)").run(storeName, storeCode);
        const storeId = storeResult.lastInsertRowid;
        
        const userResult = db.prepare("INSERT INTO users (name, email, password, role, store_id) VALUES (?, ?, ?, ?, ?)")
          .run(userName, email, hashedPassword, 'MANAGER', storeId);
        
        // Initial settings
        db.prepare("INSERT INTO settings (key, value, store_id) VALUES (?, ?, ?)").run("salon_name", storeName, storeId);
        
        return { storeId, userId: userResult.lastInsertRowid, storeCode };
      });
      
      const result = transaction();
      res.json(result);
    } catch (error: any) {
      console.error("Store registration error:", error);
      const errorMessage = process.env.NODE_ENV !== 'production' ? 'Erro ao registrar loja.' : error.message;
      if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        return res.status(400).json({ error: "O código da loja ou o e-mail do gestor já está em uso." });
      }
      res.status(500).json({ error: errorMessage });
    }
  });

  app.post("/api/auth/register-collaborator", (req, res) => {
    const { storeCode, userName, email, password } = req.body;
    
    try {
      const store = db.prepare("SELECT id FROM stores WHERE code = ?").get(storeCode) as { id: number };
      if (!store) return res.status(404).json({ error: "Código da loja inválido" });
      
      const hashedPassword = hashPassword(password);

      const result = db.prepare("INSERT INTO users (name, email, password, role, store_id, commission_rate) VALUES (?, ?, ?, ?, ?, ?)")
        .run(userName, email, hashedPassword, 'COLLABORATOR', store.id, 30);
      
      res.json({ userId: result.lastInsertRowid, storeId: store.id });
    } catch (error: any) {
      console.error("Collaborator registration error:", error);
      const errorMessage = process.env.NODE_ENV !== 'production' ? 'Erro ao registrar colaborador.' : error.message;
      if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        return res.status(400).json({ error: "Este e-mail já está cadastrado nesta loja." });
      }
      res.status(500).json({ error: errorMessage });
    }
  });

  app.post("/api/auth/login", (req, res) => {
    const { email, password } = req.body;
    const user = db.prepare("SELECT u.*, s.code as store_code FROM users u JOIN stores s ON u.store_id = s.id WHERE u.email = ?")
      .get(email) as any;
    
    if (!user || !verifyPassword(user.password, password)) {
      return res.status(401).json({ error: "Credenciais inválidas" });
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  });

  app.post("/api/auth/register-client", (req, res) => {
    const { name, phone, cep, password } = req.body;
    if (!name || !phone || !cep || !password) {
      return res.status(400).json({ error: "Todos os campos são obrigatórios" });
    }
    try {
      const hashedPassword = hashPassword(password);
      const result = db.prepare("INSERT INTO clients (name, phone, cep, password) VALUES (?, ?, ?, ?)")
        .run(name, phone, cep, hashedPassword);
      res.status(201).json({ id: result.lastInsertRowid, name, phone, cep });
    } catch (error: any) {
      if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        return res.status(400).json({ error: "Este número de telefone já está cadastrado." });
      }
      console.error("Client registration error:", error);
      const errorMessage = process.env.NODE_ENV !== 'production' ? error.message : 'Erro ao registrar cliente.';
      res.status(500).json({ error: errorMessage });
    }
  });

  app.post("/api/auth/client-login", (req, res) => {
    const { phone, password } = req.body;
    const client = db.prepare("SELECT * FROM clients WHERE phone = ?")
      .get(phone);

    if (!client || !verifyPassword(client.password, password)) {
      return res.status(401).json({ error: "Telefone ou senha inválidos." });
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _, ...clientWithoutPassword } = client;
    res.json(clientWithoutPassword);
  });

  app.get("/api/stores", (req, res) => {
    const stores = db.prepare("SELECT id, name, code FROM stores").all();
    res.json(stores);
  });

  // API Routes
  app.get("/api/services", (req, res) => {
    const storeId = req.query.storeId;
    const services = db.prepare("SELECT * FROM services WHERE store_id = ?").all(storeId);
    res.json(services);
  });

  app.post("/api/services", (req, res) => {
    const { name, price, duration_minutes, storeId } = req.body;
    const result = db.prepare("INSERT INTO services (name, price, duration_minutes, store_id) VALUES (?, ?, ?, ?)").run(name, price, duration_minutes, storeId);
    res.json({ id: result.lastInsertRowid });
  });

  app.get("/api/staff", (req, res) => {
    const storeId = req.query.storeId;
    const staff = db.prepare("SELECT * FROM users WHERE role = 'COLLABORATOR' AND store_id = ?").all(storeId);
    res.json(staff);
  });

  app.get("/api/appointments", (req, res) => {
    const storeId = req.query.storeId;
    const appointments = db.prepare(`
      SELECT a.*, u.name as professional_name, s.name as service_name, s.price as service_price, c.name as client_name
      FROM appointments a
      JOIN users u ON a.professional_id = u.id
      JOIN services s ON a.service_id = s.id
      JOIN clients c ON a.client_id = c.id
      WHERE a.store_id = ?
    `).all(storeId);
    res.json(appointments);
  });

  app.post("/api/appointments", (req, res) => {
    const { client_id, professional_id, service_id, start_time, storeId } = req.body;
    
    // Get service duration
    const service = db.prepare("SELECT duration_minutes FROM services WHERE id = ?").get(service_id) as { duration_minutes: number };
    const start = new Date(start_time);
    const end = new Date(start.getTime() + service.duration_minutes * 60000);
    const end_time = end.toISOString();

    // Overlap check
    const overlap = db.prepare(`
      SELECT COUNT(*) as count FROM appointments 
      WHERE professional_id = ? 
      AND status != 'CANCELLED'
      AND store_id = ?
      AND (
        (start_time < ? AND end_time > ?) OR
        (start_time < ? AND end_time > ?) OR
        (start_time >= ? AND end_time <= ?)
      )
    `).get(professional_id, storeId, end_time, start_time, end_time, start_time, start_time, end_time) as { count: number };

    if (overlap.count > 0) {
      return res.status(400).json({ error: "O profissional já possui um agendamento neste horário." });
    }

    const result = db.prepare(`
      INSERT INTO appointments (client_id, professional_id, service_id, start_time, end_time, store_id) 
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(client_id, professional_id, service_id, start_time, end_time, storeId);
    
    res.json({ id: result.lastInsertRowid });
  });

  app.patch("/api/appointments/:id/status", (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    db.prepare("UPDATE appointments SET status = ? WHERE id = ?").run(status, id);
    res.json({ success: true });
  });

  app.get("/api/dashboard/stats", (req, res) => {
    const storeId = req.query.storeId;
    const revenue = db.prepare("SELECT SUM(s.price) as total FROM appointments a JOIN services s ON a.service_id = s.id WHERE a.status = 'COMPLETED' AND a.store_id = ?").get(storeId) as { total: number };
    const appointmentCount = db.prepare("SELECT COUNT(*) as count FROM appointments WHERE store_id = ?").get(storeId) as { count: number };
    const lowStock = db.prepare("SELECT COUNT(*) as count FROM products WHERE stock_quantity < 10 AND store_id = ?").get(storeId) as { count: number };
    
    res.json({
      revenue: revenue.total || 0,
      appointments: appointmentCount.count,
      lowStock: lowStock.count
    });
  });

  app.get("/api/products", (req, res) => {
    const storeId = req.query.storeId;
    const products = db.prepare("SELECT * FROM products WHERE store_id = ?").all(storeId);
    res.json(products);
  });

  app.post("/api/products", (req, res) => {
    const { name, stock_quantity, price, storeId } = req.body;
    const result = db.prepare("INSERT INTO products (name, stock_quantity, price, store_id) VALUES (?, ?, ?, ?)").run(name, stock_quantity, price, storeId);
    res.json({ id: result.lastInsertRowid });
  });

  app.patch("/api/products/:id", (req, res) => {
    const { id } = req.params;
    const { stock_quantity, price } = req.body;
    db.prepare("UPDATE products SET stock_quantity = ?, price = ? WHERE id = ?").run(stock_quantity, price, id);
    res.json({ success: true });
  });

  app.delete("/api/products/:id", (req, res) => {
    const { id } = req.params;
    db.prepare("DELETE FROM products WHERE id = ?").run(id);
    res.json({ success: true });
  });

  app.get("/api/clients", (req, res) => {
    // Clients are global now, not tied to a store. Return all clients.
    const clients = db.prepare("SELECT id, name, phone, cep FROM clients").all();
    res.json(clients);
  });

  app.get("/api/clients/:id/history", (req, res) => {
    const { id } = req.params;
    const history = db.prepare(`
      SELECT a.*, s.name as service_name, s.price as service_price, u.name as professional_name
      FROM appointments a
      JOIN services s ON a.service_id = s.id
      JOIN users u ON a.professional_id = u.id
      WHERE a.client_id = ?
      ORDER BY a.start_time DESC
    `).all(id);
    res.json(history);
  });

  app.get("/api/commissions/:userId", (req, res) => {
    const { userId } = req.params;
    const user = db.prepare("SELECT commission_rate, store_id FROM users WHERE id = ?").get(userId) as { commission_rate: number, store_id: number };
    
    if (!user) return res.status(404).json({ error: "User not found" });

    const now = new Date();
    const startOfDay = new Date(now.setHours(0, 0, 0, 0)).toISOString();
    
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const startOfWeekStr = startOfWeek.toISOString();

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const calculateCommission = (startDate: string) => {
      const result = db.prepare(`
        SELECT SUM(s.price * ? / 100) as total
        FROM appointments a
        JOIN services s ON a.service_id = s.id
        WHERE a.professional_id = ? AND a.status = 'COMPLETED' AND a.start_time >= ? AND a.store_id = ?
      `).get(user.commission_rate, userId, startDate, user.store_id) as { total: number };
      return result.total || 0;
    };

    res.json({
      daily: calculateCommission(startOfDay),
      weekly: calculateCommission(startOfWeekStr),
      monthly: calculateCommission(startOfMonth),
      rate: user.commission_rate
    });
  });

  app.get("/api/settings", (req, res) => {
    const storeId = req.query.storeId;
    const settings = db.prepare("SELECT * FROM settings WHERE store_id = ?").all(storeId);
    const settingsMap = settings.reduce((acc: any, curr: any) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {});
    res.json(settingsMap);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.get("/api/notifications", (req, res) => {
    const { userId, storeId } = req.query;
    const notifications = db.prepare(`
      SELECT * FROM notifications 
      WHERE (user_id = ? OR user_id IS NULL) AND store_id = ? 
      ORDER BY created_at DESC 
      LIMIT 20
    `).all(userId, storeId);
    res.json(notifications);
  });

  app.patch("/api/notifications/:id/read", (req, res) => {
    const { id } = req.params;
    db.prepare("UPDATE notifications SET is_read = 1 WHERE id = ?").run(id);
    res.json({ success: true });
  });

  app.delete("/api/notifications/clear", (req, res) => {
    const { userId, storeId } = req.query;
    db.prepare("DELETE FROM notifications WHERE user_id = ? AND store_id = ?").run(userId, storeId);
    res.json({ success: true });
  });

  // Background Job: Check for upcoming appointments every 5 minutes
  setInterval(() => {
    const now = new Date();
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
    
    // Find appointments starting in the next hour that haven't been notified yet
    // We'll use a simple check: if a notification for this appointment exists, skip it.
    // To make this robust, we'd need an 'appointment_id' in notifications, but we can use the message content for now.
    
    const upcoming = db.prepare(`
      SELECT a.*, c.name as client_name, u.name as pro_name, s.name as service_name
      FROM appointments a
      JOIN clients c ON a.client_id = c.id
      JOIN users u ON a.professional_id = u.id
      JOIN services s ON a.service_id = s.id
      WHERE a.status = 'SCHEDULED' 
      AND a.start_time BETWEEN ? AND ?
    `).all(now.toISOString(), oneHourFromNow.toISOString());

    upcoming.forEach((appt: any) => {
      const title = "Lembrete de Agendamento";
      const message = `Agendamento com ${appt.client_name} (${appt.service_name}) às ${new Date(appt.start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
      
      // Check if already notified
      const exists = db.prepare("SELECT id FROM notifications WHERE user_id = ? AND message = ?").get(appt.professional_id, message);
      
      if (!exists) {
        db.prepare(`
          INSERT INTO notifications (user_id, store_id, title, message, type)
          VALUES (?, ?, ?, ?, 'APPOINTMENT_REMINDER')
        `).run(appt.professional_id, appt.store_id, title, message);
        
        console.log(`Notification generated for ${appt.pro_name}: ${message}`);
      }
    });
  }, 5 * 60 * 1000);

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
