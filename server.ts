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
const LATEST_SCHEMA_VERSION = 5; // Increment this number with each schema change

const currentVersion = db.pragma('user_version', { simple: true }) as number;

if (currentVersion < LATEST_SCHEMA_VERSION) {
  console.log(`Database schema is outdated (v${currentVersion}). Resetting and migrating to v${LATEST_SCHEMA_VERSION}...`);
  // For development, the simplest migration is to drop tables and recreate them.
  // In production, you would use a more sophisticated migration strategy.
  db.exec(`
    DROP TABLE IF EXISTS expenses;
    DROP TABLE IF EXISTS service_commissions;
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
    category TEXT,
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

  CREATE TABLE IF NOT EXISTS expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    description TEXT NOT NULL,
    amount REAL NOT NULL,
    date DATETIME DEFAULT CURRENT_TIMESTAMP,
    store_id INTEGER,
    FOREIGN KEY (store_id) REFERENCES stores(id)
  );

  CREATE TABLE IF NOT EXISTS service_commissions (
    user_id INTEGER NOT NULL,
    service_id INTEGER NOT NULL,
    commission_rate REAL NOT NULL,
    PRIMARY KEY (user_id, service_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE
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

  db.prepare("INSERT INTO services (name, price, duration_minutes, category, store_id) VALUES (?, ?, ?, ?, ?)").run("Corte de Cabelo", 50, 45, "Cabelo", storeId);
  db.prepare("INSERT INTO services (name, price, duration_minutes, category, store_id) VALUES (?, ?, ?, ?, ?)").run("Coloração", 120, 120, "Cabelo", storeId);
  db.prepare("INSERT INTO services (name, price, duration_minutes, category, store_id) VALUES (?, ?, ?, ?, ?)").run("Manicure", 30, 30, "Unha", storeId);
  db.prepare("INSERT INTO services (name, price, duration_minutes, category, store_id) VALUES (?, ?, ?, ?, ?)").run("Limpeza de Pele", 80, 60, "Estética", storeId);

  db.prepare("INSERT INTO clients (name, phone, cep, password) VALUES (?, ?, ?, ?)").run("Ana Souza", "11999999999", "01001000", hashPassword("ana123"));
  db.prepare("INSERT INTO clients (name, phone, cep, password) VALUES (?, ?, ?, ?)").run("Carlos Lima", "11888888888", "04538133", hashPassword("carlos123"));

  db.prepare("INSERT INTO products (name, stock_quantity, price, store_id) VALUES (?, ?, ?, ?)").run("Shampoo Pro", 15, 25, storeId);
  db.prepare("INSERT INTO products (name, stock_quantity, price, store_id) VALUES (?, ?, ?, ?)").run("Tinta Vermelha", 5, 15, storeId);

  db.prepare("INSERT INTO settings (key, value, store_id) VALUES (?, ?, ?)").run("salon_name", "tBeauty", storeId);
  db.prepare("INSERT INTO settings (key, value, store_id) VALUES (?, ?, ?)").run("monthly_goal", "10000", storeId);
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
    const storeId = req.query.storeId as string;
    const services = db.prepare("SELECT * FROM services WHERE store_id = ?").all(storeId);
    res.json(services);
  });

  app.post("/api/services", (req, res) => {
    const { name, price, duration_minutes, category, storeId } = req.body;
    const result = db.prepare("INSERT INTO services (name, price, duration_minutes, category, store_id) VALUES (?, ?, ?, ?, ?)").run(name, price, duration_minutes, category, storeId);
    res.json({ id: result.lastInsertRowid });
  });

  app.patch("/api/services/:id", (req, res) => {
    const { id } = req.params;
    const { name, price, duration_minutes, category } = req.body;

    if (!name || price === undefined || duration_minutes === undefined) {
      return res.status(400).json({ error: "Todos os campos são obrigatórios." });
    }

    try {
      const result = db.prepare(`
        UPDATE services 
        SET name = ?, price = ?, duration_minutes = ?, category = ?
        WHERE id = ?
      `).run(name, price, duration_minutes, category, id);

      if (result.changes === 0) {
        return res.status(404).json({ error: "Serviço não encontrado." });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Erro ao atualizar o serviço." });
    }
  });

  app.delete("/api/services/:id", (req, res) => {
    const { id } = req.params;

    try {
      // Check if the service is part of any non-cancelled appointments
      const appointmentCount = db.prepare(`
        SELECT COUNT(*) as count 
        FROM appointments 
        WHERE service_id = ? AND status != 'CANCELLED'
      `).get(id) as { count: number };

      if (appointmentCount.count > 0) {
        return res.status(400).json({ error: "Não é possível excluir o serviço, pois ele está associado a agendamentos existentes." });
      }

      const result = db.prepare("DELETE FROM services WHERE id = ?").run(id);

      if (result.changes === 0) {
        return res.status(404).json({ error: "Serviço não encontrado." });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Erro ao excluir o serviço." });
    }
  });

  app.get("/api/staff", (req, res) => {
    const storeId = req.query.storeId as string;
    const staff = db.prepare("SELECT * FROM users WHERE role = 'COLLABORATOR' AND store_id = ?").all(storeId);
    res.json(staff);
  });

  app.get("/api/staff/:userId/service-commissions", (req, res) => {
    const { userId } = req.params;
    const commissions = db.prepare("SELECT service_id, commission_rate FROM service_commissions WHERE user_id = ?").all(userId);
    const commissionMap = commissions.reduce((acc: any, curr: any) => {
        acc[curr.service_id] = curr.commission_rate;
        return acc;
    }, {});
    res.json(commissionMap);
  });

  app.post("/api/staff/:userId/service-commissions", (req, res) => {
      const { userId } = req.params;
      const { commissions } = req.body; // commissions is an object: { serviceId: rate, ... }

      if (!commissions) {
          return res.status(400).json({ error: "Commissions data is required." });
      }

      const insertStmt = db.prepare(`
          INSERT INTO service_commissions (user_id, service_id, commission_rate) 
          VALUES (?, ?, ?)
          ON CONFLICT(user_id, service_id) DO UPDATE SET commission_rate = excluded.commission_rate
      `);
      const deleteStmt = db.prepare("DELETE FROM service_commissions WHERE user_id = ? AND service_id = ?");

      const transaction = db.transaction(() => {
          for (const serviceId in commissions) {
              const rate = commissions[serviceId];
              // If rate is a valid number, insert/update it.
              // If rate is null/undefined/empty string, it means we should remove the specific commission.
              if (rate !== null && rate !== '' && !isNaN(parseFloat(rate))) {
                  insertStmt.run(userId, serviceId, parseFloat(rate));
              } else {
                  deleteStmt.run(userId, serviceId);
              }
          }
      });

      try {
          transaction();
          res.json({ success: true });
      } catch (error) {
          console.error("Error updating service commissions:", error);
          res.status(500).json({ error: "Failed to update service commissions." });
      }
  });

  app.post("/api/staff", (req, res) => {
    const { name, email, password, commission_rate, store_id } = req.body;
    if (!name || !email || !password || commission_rate === undefined || !store_id) {
      return res.status(400).json({ error: "Todos os campos são obrigatórios." });
    }
    try {
      const hashedPassword = hashPassword(password);
      const result = db.prepare(
        "INSERT INTO users (name, email, password, role, commission_rate, store_id) VALUES (?, ?, ?, 'COLLABORATOR', ?, ?)"
      ).run(name, email, hashedPassword, commission_rate, store_id);
      res.status(201).json({ id: result.lastInsertRowid });
    } catch (error: any) {
      if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        return res.status(400).json({ error: "Este e-mail já está em uso." });
      }
      res.status(500).json({ error: "Erro ao adicionar profissional." });
    }
  });

  app.patch("/api/staff/:id", (req, res) => {
    const { id } = req.params;
    const { name, email, commission_rate } = req.body;
    // Password change is not handled here for simplicity.
    if (!name || !email || commission_rate === undefined) {
      return res.status(400).json({ error: "Nome, email e taxa de comissão são obrigatórios." });
    }
    try {
      const result = db.prepare(
        "UPDATE users SET name = ?, email = ?, commission_rate = ? WHERE id = ? AND role = 'COLLABORATOR'"
      ).run(name, email, commission_rate, id);

      if (result.changes === 0) {
        return res.status(404).json({ error: "Profissional não encontrado ou não é um colaborador." });
      }
      res.json({ success: true });
    } catch (error: any) {
      if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        return res.status(400).json({ error: "Este e-mail já está em uso por outro usuário." });
      }
      res.status(500).json({ error: "Erro ao atualizar profissional." });
    }
  });

  app.delete("/api/staff/:id", (req, res) => {
    const { id } = req.params;
    try {
      // Optional: Check if collaborator has future appointments before deleting
      const appointmentCount = db.prepare(
        "SELECT COUNT(*) as count FROM appointments WHERE professional_id = ? AND status = 'PENDING' AND start_time > CURRENT_TIMESTAMP"
      ).get(id) as { count: number };

      if (appointmentCount.count > 0) {
        return res.status(400).json({ error: "Não é possível excluir. O profissional tem agendamentos futuros." });
      }

      const result = db.prepare("DELETE FROM users WHERE id = ? AND role = 'COLLABORATOR'").run(id);
      if (result.changes === 0) {
        return res.status(404).json({ error: "Profissional não encontrado." });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Erro ao excluir profissional." });
    }
  });

  app.get("/api/appointments", (req, res) => {
    const storeId = req.query.storeId as string;
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
    const { client_id, professional_id, service_ids, start_time, storeId } = req.body;

    if (!service_ids || !Array.isArray(service_ids) || service_ids.length === 0) {
      return res.status(400).json({ error: "Pelo menos um serviço deve ser selecionado." });
    }

    const transaction = db.transaction(() => {
      let currentStartTime = new Date(start_time);
      const createdAppointmentIds: number[] = [];

      const placeholders = service_ids.map(() => '?').join(',');
      const services = db.prepare(`SELECT id, duration_minutes FROM services WHERE id IN (${placeholders})`).all(...service_ids) as { id: number, duration_minutes: number }[];
      const serviceMap = new Map(services.map(s => [s.id, s]));

      const totalDuration = service_ids.reduce((total, id) => {
        const service = serviceMap.get(id);
        return total + (service ? service.duration_minutes : 0);
      }, 0);

      const finalEndTime = new Date(currentStartTime.getTime() + totalDuration * 60000);

      // Correct overlap check for a time range
      const overlap = db.prepare(`
        SELECT COUNT(*) as count FROM appointments 
        WHERE professional_id = ? 
        AND status != 'CANCELLED'
        AND store_id = ?
        AND (start_time < ? AND end_time > ?)
      `).get(professional_id, storeId, finalEndTime.toISOString(), currentStartTime.toISOString()) as { count: number };

      if (overlap.count > 0) {
        throw new Error("O profissional já possui um agendamento neste horário.");
      }

      for (const service_id of service_ids) {
        const service = serviceMap.get(service_id);
        if (!service) continue;

        const end_time = new Date(currentStartTime.getTime() + service.duration_minutes * 60000);

        const result = db.prepare(`
          INSERT INTO appointments (client_id, professional_id, service_id, start_time, end_time, store_id) 
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(client_id, professional_id, service_id, currentStartTime.toISOString(), end_time.toISOString(), storeId);
        
        createdAppointmentIds.push(result.lastInsertRowid as number);
        currentStartTime = end_time;
      }

      return createdAppointmentIds;
    });

    try {
      const ids = transaction();
      res.json({ ids });
    } catch (error: any) {
      if (error.message.includes("O profissional já possui")) return res.status(400).json({ error: error.message });
      console.error("Appointment creation error:", error);
      res.status(500).json({ error: "Erro ao criar agendamentos." });
    }
  });

  app.patch("/api/appointments/:id/status", (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    db.prepare("UPDATE appointments SET status = ? WHERE id = ?").run(status, id);
    res.json({ success: true });
  });

  app.get("/api/dashboard/stats", (req, res) => {
    const storeId = req.query.storeId as string | undefined;
    const period = (req.query.period as string) || 'monthly';
    const category = req.query.category as string | undefined;

    const now = new Date();
    let startDate = new Date(now.getFullYear(), 0, 1).toISOString(); // Default to start of year

    if (period === 'daily') {
      startDate = new Date(new Date().setHours(0, 0, 0, 0)).toISOString();
    } else if (period === 'weekly') {
      const startOfWeek = new Date();
      const day = startOfWeek.getDay();
      const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
      startOfWeek.setDate(diff);
      startOfWeek.setHours(0, 0, 0, 0);
      startDate = startOfWeek.toISOString();
    } else if (period === 'monthly') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    }

    const params: (string | number | undefined)[] = [storeId, startDate];
    let whereClauses = ["a.store_id = ?", "a.start_time >= ?"];

    if (category && category !== 'all') {
      whereClauses.push("s.category = ?");
      params.push(category);
    }

    const completedWhere = [...whereClauses, "a.status = 'COMPLETED'"].join(" AND ");
    const allStatusWhere = whereClauses.join(" AND ");

    const revenue = db.prepare(`SELECT SUM(s.price) as total FROM appointments a JOIN services s ON a.service_id = s.id WHERE ${completedWhere}`).get(...params) as { total: number };
    const appointmentCount = db.prepare(`SELECT COUNT(a.id) as count FROM appointments a JOIN services s ON a.service_id = s.id WHERE ${allStatusWhere}`).get(...params) as { count: number };
    const totalCommissions = db.prepare(`
      SELECT SUM(s.price * COALESCE(sc.commission_rate, u.commission_rate) / 100) as total
      FROM appointments a JOIN services s ON a.service_id = s.id JOIN users u ON a.professional_id = u.id
      LEFT JOIN service_commissions sc ON sc.user_id = a.professional_id AND sc.service_id = a.service_id
      WHERE ${completedWhere}
    `).get(...params) as { total: number };

    const lowStock = db.prepare("SELECT COUNT(*) as count FROM products WHERE stock_quantity < 10 AND store_id = ?").get(storeId) as { count: number };
    const stockCost = db.prepare("SELECT SUM(price * stock_quantity) as total FROM products WHERE store_id = ?").get(storeId) as { total: number };
    const extraCosts = db.prepare("SELECT SUM(amount) as total FROM expenses WHERE store_id = ? AND date >= ?").get(storeId, startDate) as { total: number };
    const monthlyGoalSetting = db.prepare("SELECT value FROM settings WHERE key = 'monthly_goal' AND store_id = ?").get(storeId) as { value: string };

    res.json({
      revenue: revenue.total || 0,
      netProfit: (revenue.total || 0) - ((totalCommissions.total || 0) + (extraCosts.total || 0)),
      totalCommissions: totalCommissions.total || 0,
      appointments: appointmentCount.count || 0,
      lowStock: lowStock?.count || 0,
      stockCost: stockCost.total || 0,
      extraCosts: extraCosts.total || 0,
      monthlyGoal: parseFloat(monthlyGoalSetting?.value) || 0,
    });
  });

  app.get("/api/expenses", (req, res) => {
    const storeId = req.query.storeId as string;
    const expenses = db.prepare("SELECT * FROM expenses WHERE store_id = ? ORDER BY date DESC").all(storeId);
    res.json(expenses);
  });

  app.post("/api/expenses", (req, res) => {
      const { description, amount, storeId } = req.body;
      if (!description || amount === undefined || !storeId) {
          return res.status(400).json({ error: "Descrição, valor (que pode ser zero) e ID da loja são obrigatórios." });
      }
      try {
        // Explicitly check if the store_id exists to provide a better error message
        const storeExists = db.prepare("SELECT id FROM stores WHERE id = ?").get(storeId);
        if (!storeExists) {
          // This error is likely due to a stale session after a database reset.
          // Instructing the user to re-login is the correct course of action.
          return res.status(400).json({ error: "A loja associada não foi encontrada. Por favor, saia e entre novamente no sistema." });
        }
        const result = db.prepare("INSERT INTO expenses (description, amount, store_id) VALUES (?, ?, ?)").run(description, amount, storeId);
        res.status(201).json({ id: result.lastInsertRowid });
      } catch (error) {
        console.error("Error adding expense:", error);
        res.status(500).json({ error: "Erro interno ao adicionar despesa." });
      }
  });

  app.get("/api/products", (req, res) => {
    const storeId = req.query.storeId as string;
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

  app.get("/api/clients/:clientId/appointments", (req, res) => {
    const { clientId } = req.params;
    const appointments = db.prepare(`
      SELECT 
        a.*, 
        u.name as professional_name, 
        s.name as service_name, 
        st.name as store_name,
        s.price as service_price
      FROM appointments a
      JOIN users u ON a.professional_id = u.id
      JOIN services s ON a.service_id = s.id
      JOIN stores st ON a.store_id = st.id
      WHERE a.client_id = ?
      ORDER BY a.start_time DESC
    `).all(clientId);
    res.json(appointments);
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
        SELECT SUM(s.price * COALESCE(sc.commission_rate, u.commission_rate) / 100) as total
        FROM appointments a
        JOIN services s ON a.service_id = s.id
        JOIN users u ON a.professional_id = u.id
        LEFT JOIN service_commissions sc ON sc.user_id = a.professional_id AND sc.service_id = a.service_id
        WHERE a.professional_id = ? AND a.status = 'COMPLETED' AND a.start_time >= ? AND a.store_id = ?
      `).get(userId, startDate, user.store_id) as { total: number };
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
    const storeId = req.query.storeId as string;
    const settings = db.prepare("SELECT * FROM settings WHERE store_id = ?").all(storeId);
    const settingsMap = settings.reduce((acc: any, curr: any) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {});
    res.json(settingsMap);
  });

  app.post("/api/settings", (req, res) => {
    const { storeId, settings } = req.body;
    if (!storeId || !settings) {
        return res.status(400).json({ error: "storeId and settings are required." });
    }

    try {
        const storeExists = db.prepare("SELECT id FROM stores WHERE id = ?").get(storeId);
        if (!storeExists) {
          // This error is likely due to a stale session after a database reset.
          // Instructing the user to re-login is the correct course of action.
          return res.status(400).json({ error: "A loja associada não foi encontrada. Por favor, saia e entre novamente no sistema." });
        }

        const stmt = db.prepare(`
            INSERT INTO settings (key, value, store_id) 
            VALUES (?, ?, ?)
            ON CONFLICT(key, store_id) DO UPDATE SET value = excluded.value
        `);

        const transaction = db.transaction(() => {
            for (const key in settings) {
                if (Object.prototype.hasOwnProperty.call(settings, key)) {
                    stmt.run(key, settings[key], storeId);
                }
            }
        });

        transaction();
        res.json({ success: true });
    } catch (error) {
        console.error("Error updating settings:", error);
        res.status(500).json({ error: "Erro ao atualizar as configurações." });
    }
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
    const userId = req.query.userId as string;
    const storeId = req.query.storeId as string;
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
    const userId = req.query.userId as string;
    const storeId = req.query.storeId as string;
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
      WHERE a.status = 'PENDING' 
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
