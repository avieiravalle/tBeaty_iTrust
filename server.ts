import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { scryptSync, randomBytes, timingSafeEqual } from "crypto";
import multer from "multer";
import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import QRCode from 'qrcode';
import { fileURLToPath } from 'url';

dotenv.config();
// Polyfill for __dirname in ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Configuração do WhatsApp Local (whatsapp-web.js) ---
const whatsappClient = new Client({
  authStrategy: new LocalAuth(), // Salva a sessão para não precisar escanear sempre
  puppeteer: {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  }
});

let isWhatsappReady = false;
let whatsappQrCode: string | null = null;
let whatsappStatus = 'DISCONNECTED'; // DISCONNECTED, QR_RECEIVED, READY

whatsappClient.on('qr', async (qr) => {
  console.log('QR Code recebido no servidor');
  try {
    whatsappQrCode = await QRCode.toDataURL(qr);
    whatsappStatus = 'QR_RECEIVED';
  } catch (err) {
    console.error('Erro ao gerar imagem do QR Code:', err);
  }
});

whatsappClient.on('ready', () => {
  console.log('WhatsApp conectado e pronto para enviar mensagens!');
  isWhatsappReady = true;
  whatsappStatus = 'READY';
  whatsappQrCode = null;
});

whatsappClient.on('auth_failure', () => {
  console.error('Falha na autenticação do WhatsApp. Apague a pasta .wwebjs_auth e reinicie se persistir.');
  isWhatsappReady = false;
  whatsappStatus = 'DISCONNECTED';
});

whatsappClient.on('disconnected', (reason) => {
  console.log('WhatsApp desconectado:', reason);
  isWhatsappReady = false;
  whatsappStatus = 'DISCONNECTED';
  whatsappQrCode = null;
  // Reinicia o cliente para permitir nova conexão
  whatsappClient.initialize();
});

whatsappClient.initialize().catch((err: any) => {
  console.error("Erro ao inicializar o cliente do WhatsApp:", err);
});

// --- Configuração de Upload de Arquivos ---
const UPLOADS_DIR = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOADS_DIR);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/svg+xml'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de arquivo inválido. Apenas PNG, JPG e SVG são permitidos.'));
    }
  },
});

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
const LATEST_SCHEMA_VERSION = 14; // Increment this number with each schema change

const currentVersion = db.pragma('user_version', { simple: true }) as number;

if (currentVersion < LATEST_SCHEMA_VERSION) {
  console.log(`Database schema is outdated (v${currentVersion}). Resetting and migrating to v${LATEST_SCHEMA_VERSION}...`);
  // For development, the simplest migration is to drop tables and recreate them.
  // In production, you would use a more sophisticated migration strategy.
  db.exec(`
    DROP TABLE IF EXISTS reviews;
    DROP TABLE IF EXISTS appointments;
    DROP TABLE IF EXISTS client_stores;
    DROP TABLE IF EXISTS client_favorite_stores;
    DROP TABLE IF EXISTS service_commissions;
    DROP TABLE IF EXISTS expenses;
    DROP TABLE IF EXISTS notifications;
    DROP TABLE IF EXISTS products;
    DROP TABLE IF EXISTS settings;
    DROP TABLE IF EXISTS system_settings;
    DROP TABLE IF EXISTS users;
    DROP TABLE IF EXISTS services;
    DROP TABLE IF EXISTS clients;
    DROP TABLE IF EXISTS stores;
  `);
}

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS stores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL,
    plan TEXT, -- 'BASIC', 'INTERMEDIATE', 'ADVANCED'
    status TEXT DEFAULT 'PENDING_PAYMENT' -- PENDING_PAYMENT, ACTIVE, INACTIVE
  );

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT CHECK(role IN ('ADMIN', 'MANAGER', 'COLLABORATOR')) NOT NULL,
    commission_rate REAL DEFAULT 0,
    store_id INTEGER,
    break_start_time TEXT,
    break_end_time TEXT,
    status TEXT NOT NULL DEFAULT 'ACTIVE',
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
    password TEXT NOT NULL,
    email TEXT UNIQUE,
    birth_date DATE
  );

  CREATE TABLE IF NOT EXISTS client_stores (
    client_id INTEGER NOT NULL,
    store_id INTEGER NOT NULL,
    PRIMARY KEY (client_id, store_id),
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
    FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS client_favorite_stores (
    client_id INTEGER NOT NULL,
    store_id INTEGER NOT NULL,
    PRIMARY KEY (client_id, store_id),
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
    FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    appointment_id INTEGER NOT NULL UNIQUE,
    client_id INTEGER NOT NULL,
    professional_id INTEGER NOT NULL,
    store_id INTEGER NOT NULL,
    rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
    FOREIGN KEY (professional_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE
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
    store_id INTEGER NOT NULL,
    user_id INTEGER, -- Can be NULL for store-wide expenses
    FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
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

  CREATE TABLE IF NOT EXISTS system_settings (
    key TEXT PRIMARY KEY,
    value TEXT
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
  console.log("Seeding database with initial admin data...");

  // --- STORES ---
  // Create a dedicated store for the admin to satisfy the foreign key and login query requirements
  const store1Result = db.prepare("INSERT INTO stores (name, code, plan, status) VALUES (?, ?, ?, ?)").run("Administração", "ADMIN00", 'ADVANCED', 'ACTIVE');
  const store1Id = store1Result.lastInsertRowid;

  // --- USERS ---
  // Create the Admin user
  db.prepare("INSERT INTO users (name, email, password, role, store_id, commission_rate) VALUES (?, ?, ?, ?, ?, ?)").run(
    "Super Admin", 
    "avieiravale@gmail.com", 
    hashPassword("Anderson@46"), 
    "ADMIN", 
    store1Id, 
    0
  );

  // --- SYSTEM SETTINGS ---
  db.prepare("INSERT INTO system_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO NOTHING").run('admin_pix_key', '29556537805');

  console.log("Initial admin data seeded successfully.");
}

async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || "3002", 10);
  
  app.use(express.json());
  // Servir arquivos enviados estaticamente
  app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));

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

        const storeResult = db.prepare("INSERT INTO stores (name, code, status) VALUES (?, ?, 'PENDING_PAYMENT')").run(storeName, storeCode);
        const storeId = Number(storeResult.lastInsertRowid);
        
        const userResult = db.prepare("INSERT INTO users (name, email, password, role, store_id) VALUES (?, ?, ?, ?, ?)")
          .run(userName, email, hashedPassword, 'MANAGER', storeId);
        
        // Initial settings
        db.prepare("INSERT INTO settings (key, value, store_id) VALUES (?, ?, ?)").run("salon_name", storeName, storeId);
        
        return { storeId, userId: Number(userResult.lastInsertRowid), storeCode };
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
      const store = db.prepare("SELECT id, plan FROM stores WHERE code = ?").get(storeCode) as { id: number, plan: string };
      if (!store) return res.status(404).json({ error: "Código da loja inválido" });
      
      // --- START: Plan Limit Check ---
      const planLimits: Record<string, number> = {
        'BASIC': 4,
        'INTERMEDIATE': 9,
        'ADVANCED': Infinity
      };

      const limit = store.plan ? planLimits[store.plan] : 0;

      if (limit === undefined) { // Plan exists but is not in our config
        return res.status(403).json({ error: "Plano da loja inválido. Não é possível registrar." });
      }

      if (limit !== Infinity) {
        const collaboratorCount = db.prepare("SELECT COUNT(*) as count FROM users WHERE store_id = ? AND role = 'COLLABORATOR' AND status = 'ACTIVE'").get(store.id) as { count: number };
        if (collaboratorCount.count >= limit) {
          return res.status(403).json({ error: `A loja atingiu o limite de ${limit} colaboradores para o plano atual.` });
        }
      }
      // --- END: Plan Limit Check ---

      const hashedPassword = hashPassword(password);

      const result = db.prepare("INSERT INTO users (name, email, password, role, store_id, commission_rate) VALUES (?, ?, ?, ?, ?, ?)")
        .run(userName, email, hashedPassword, 'COLLABORATOR', store.id, 30);
      
      res.json({ userId: Number(result.lastInsertRowid), storeId: store.id });
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
    const user = db.prepare("SELECT u.*, s.code as store_code, s.status as store_status, s.plan as store_plan FROM users u JOIN stores s ON u.store_id = s.id WHERE u.email = ?")
      .get(email) as any;
    
    if (!user || !verifyPassword(user.password, password)) {
      return res.status(401).json({ error: "Credenciais inválidas" });
    }

    if (user.role !== 'ADMIN' && user.store_status === 'PENDING_PAYMENT') {
      return res.status(403).json({ error: "Pagamento pendente. Sua conta aguarda aprovação para ser ativada." });
    }

    if (user.role !== 'ADMIN' && user.store_status === 'INACTIVE') {
      return res.status(403).json({ error: "Sua loja está inativa. Entre em contato com o suporte." });
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  });

  app.post("/api/auth/register-client", (req, res) => {
    const { name, email, phone, cep, password, birth_date, storeId } = req.body;
    // When a manager registers a client, password is not sent, email is optional, and storeId is provided.
    // When a client self-registers, password and email are sent, but storeId is not.
    if (!name || !phone || !cep) {
      return res.status(400).json({ error: "Nome, telefone e CEP são obrigatórios." });
    }
    // If a password is provided (client self-registration), then email is also required.
    if (password && !email) {
      return res.status(400).json({ error: "E-mail é obrigatório para o auto-cadastro." });
    }
 
    try {
      // If password is not provided (e.g., manager registering a client), generate a random one.
      const finalPassword = password || randomBytes(16).toString('hex');
      const hashedPassword = hashPassword(finalPassword);
      const result = db.prepare("INSERT INTO clients (name, email, phone, cep, password, birth_date) VALUES (?, ?, ?, ?, ?, ?)") // email can be null
        .run(name, email, phone, cep, hashedPassword, birth_date || null);
      const clientId = Number(result.lastInsertRowid);
      
      const clientData = { id: clientId, name, email, phone, cep, birth_date };
      res.status(201).json(clientData);
    } catch (error: any) {
      if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        // Client already exists, we can try to find them and associate. For now, just error.
        return res.status(400).json({ error: "Este e-mail ou telefone já está cadastrado." });
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

  app.post("/api/plans/select", (req, res) => {
    const { storeId, planId } = req.body;
    if (!storeId || !planId) {
      return res.status(400).json({ error: "ID da loja e do plano são obrigatórios." });
    }

    const plans: Record<string, { price: number }> = {
      'BASIC': { price: 49.90 },
      'INTERMEDIATE': { price: 99.90 },
      'ADVANCED': { price: 159.90 }
    };

    const selectedPlan = plans[planId];
    if (!selectedPlan) {
      return res.status(404).json({ error: "Plano não encontrado." });
    }

    try {
      const store = db.prepare("SELECT name FROM stores WHERE id = ?").get(storeId) as { name: string };
      if (!store) {
        return res.status(404).json({ error: "Loja não encontrada." });
      }
      db.prepare("UPDATE stores SET plan = ? WHERE id = ?").run(planId, storeId);

      const adminPixKeySetting = db.prepare("SELECT value FROM system_settings WHERE key = 'admin_pix_key'").get() as { value: string | null };
      const pixKey = adminPixKeySetting?.value || 'pix@itrust.com'; // Fallback
      res.json({ price: selectedPlan.price, pixKey: pixKey, storeName: store.name });
    } catch (error) {
      console.error("Error selecting plan:", error);
      res.status(500).json({ error: "Erro ao selecionar o plano." });
    }
  });

  app.post("/api/auth/request-password-reset", (req, res) => {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: "E-mail é obrigatório." });
    }
    // In a real app, you would find the user, generate a token, save it, and send an email.
    // Here, we just log it and return success to prevent email enumeration.
    console.log(`[INFO] Password reset requested for user with email: ${email}. A real implementation would send an email.`);
    res.json({ success: true, message: "Se uma conta com este e-mail existir, um link para redefinição de senha foi enviado." });
  });

  app.post("/api/auth/request-client-password-reset", (req, res) => {
    const { phone } = req.body;
    if (!phone) {
      return res.status(400).json({ error: "Telefone é obrigatório." });
    }
    // In a real app, you would find the client, generate a token, and send an SMS/WhatsApp.
    // We use the raw phone number from the form.
    const cleanPhone = phone.replace(/\D/g, '');
    console.log(`[INFO] Password reset requested for client with phone: ${cleanPhone}. A real implementation would send a message.`);
    res.json({ success: true, message: "Se uma conta com este telefone existir, instruções para redefinir a senha foram enviadas." });
  });

  app.get("/api/stores", (req, res) => {
    const clientId = req.query.clientId as string | undefined;

    if (clientId) {
        const stores = db.prepare(`
            SELECT 
                s.id, 
                s.name, 
                s.code, 
                CASE WHEN f.store_id IS NOT NULL THEN 1 ELSE 0 END as is_favorite
            FROM stores s
            LEFT JOIN client_favorite_stores f ON s.id = f.store_id AND f.client_id = ?
            ORDER BY is_favorite DESC, s.name ASC
        `).all(clientId);
        res.json(stores);
    } else {
        const stores = db.prepare("SELECT id, name, code FROM stores").all();
        res.json(stores);
    }
  });

  // API Routes
  app.get("/api/services", (req, res) => {
    const storeId = req.query.storeId as string;
    const services = db.prepare("SELECT * FROM services WHERE store_id = ?").all(storeId);
    res.json(services);
  });

  app.post("/api/services", (req, res) => {
    const { name, price, duration_minutes, category, storeId } = req.body;
    if (!name || price === undefined || duration_minutes === undefined || !storeId) {
      return res.status(400).json({ error: "Nome, preço, duração e ID da loja são obrigatórios." });
    }
    try {
      const result = db.prepare("INSERT INTO services (name, price, duration_minutes, category, store_id) VALUES (?, ?, ?, ?, ?)").run(name, price, duration_minutes, category, storeId);
      res.status(201).json({ id: Number(result.lastInsertRowid) });
    } catch (error) {
      console.error("Error adding service:", error);
      res.status(500).json({ error: "Erro interno ao adicionar serviço." });
    }
  });

  app.patch("/api/services/:id", (req, res) => {
    const { id } = req.params;
    const { name, price, duration_minutes, category } = req.body;

    const fields: string[] = [];
    const params: (string | number | null)[] = [];

    if (name !== undefined) {
      fields.push("name = ?");
      params.push(name);
    }
    if (price !== undefined) {
      fields.push("price = ?");
      params.push(price);
    }
    if (duration_minutes !== undefined) {
      fields.push("duration_minutes = ?");
      params.push(duration_minutes);
    }
    if (category !== undefined) {
      fields.push("category = ?");
      params.push(category);
    }

    if (fields.length === 0) {
      return res.status(400).json({ error: "Nenhum campo para atualizar foi fornecido." });
    }

    params.push(id); // for the WHERE clause

    try {
      const stmt = `UPDATE services SET ${fields.join(", ")} WHERE id = ?`;
      const result = db.prepare(stmt).run(...params);

      if (result.changes === 0) {
        return res.status(404).json({ error: "Serviço não encontrado." });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Service update error:", error);
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
    const statusFilter = req.query.status as string;

    let query = "SELECT id, name, email, role, commission_rate, store_id, break_start_time, break_end_time, status FROM users WHERE role = 'COLLABORATOR' AND store_id = ?";
    const params: (string | number)[] = [storeId];

    if (statusFilter !== 'all') {
        query += " AND status = 'ACTIVE'";
    }
    query += " ORDER BY name";
    
    const staff = db.prepare(query).all(...params);
    res.json(staff);    
  });

  app.post("/api/staff", (req, res) => {
    const { name, email, commission_rate, store_id, break_start_time, break_end_time } = req.body;
    if (!name || !email || commission_rate === undefined || !store_id) {
      return res.status(400).json({ error: "Nome, email, comissão e ID da loja são obrigatórios." });
    }
    try {
      // --- START: Plan Limit Check ---
      const store = db.prepare("SELECT plan FROM stores WHERE id = ?").get(store_id) as { plan: string };
      if (!store) {
        return res.status(404).json({ error: "Loja não encontrada." });
      }

      const planLimits: Record<string, number> = {
        'BASIC': 4,
        'INTERMEDIATE': 9,
        'ADVANCED': Infinity
      };

      const limit = store.plan ? planLimits[store.plan] : 0;

      if (limit !== Infinity) {
        const collaboratorCount = db.prepare("SELECT COUNT(*) as count FROM users WHERE store_id = ? AND role = 'COLLABORATOR' AND status = 'ACTIVE'").get(store_id) as { count: number };

        if (collaboratorCount.count >= limit) {
          return res.status(403).json({ error: `Limite de ${limit} colaboradores para o plano ${store.plan} atingido. Faça um upgrade para adicionar mais.` });
        }
      }
      // --- END: Plan Limit Check ---

      // Generate a random password since it's not provided from the frontend
      const randomPassword = randomBytes(16).toString('hex');
      const hashedPassword = hashPassword(randomPassword);
      const result = db.prepare(
        "INSERT INTO users (name, email, password, role, commission_rate, store_id, break_start_time, break_end_time) VALUES (?, ?, ?, 'COLLABORATOR', ?, ?, ?, ?)"
      ).run(name, email, hashedPassword, commission_rate, store_id, break_start_time || null, break_end_time || null);
      res.status(201).json({ id: Number(result.lastInsertRowid) });
    } catch (error: any) {
      if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        return res.status(400).json({ error: "Este e-mail já está em uso." });
      }
      console.error("Error adding staff:", error);
      res.status(500).json({ error: "Erro ao adicionar profissional." });
    }
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

  app.patch("/api/staff/:id/status", (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !['ACTIVE', 'INACTIVE'].includes(status)) {
        return res.status(400).json({ error: "Status inválido. Use 'ACTIVE' ou 'INACTIVE'." });
    }

    // If deactivating, check for future appointments
    if (status === 'INACTIVE') {
        const appointmentCount = db.prepare(
            "SELECT COUNT(*) as count FROM appointments WHERE professional_id = ? AND status = 'PENDING' AND start_time > CURRENT_TIMESTAMP"
        ).get(id) as { count: number };

        if (appointmentCount.count > 0) {
            return res.status(400).json({ error: "Não é possível desativar. O profissional tem agendamentos futuros." });
        }
    }

    try {
        const result = db.prepare("UPDATE users SET status = ? WHERE id = ?").run(status, id);
        if (result.changes === 0) {
            return res.status(404).json({ error: "Profissional não encontrado." });
        }
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: "Erro ao atualizar status do profissional." });
    }
  });

  app.patch("/api/staff/:id", (req, res) => {
    const { id } = req.params;
    const { name, email, commission_rate, break_start_time, break_end_time } = req.body;

    const fields: string[] = [];
    const params: (string | number | null)[] = [];

    if (name !== undefined) { fields.push("name = ?"); params.push(name); }
    if (email !== undefined) { fields.push("email = ?"); params.push(email); }
    if (commission_rate !== undefined) { fields.push("commission_rate = ?"); params.push(commission_rate); }
    // Allow setting breaks to null/empty
    if (break_start_time !== undefined) { fields.push("break_start_time = ?"); params.push(break_start_time || null); }
    if (break_end_time !== undefined) { fields.push("break_end_time = ?"); params.push(break_end_time || null); }

    if (fields.length === 0) {
      return res.status(400).json({ error: "Nenhum campo para atualizar foi fornecido." });
    }

    params.push(id);

    try {
      const result = db.prepare(
        `UPDATE users SET ${fields.join(", ")} WHERE id = ? AND role = 'COLLABORATOR'`
      ).run(...params);

      if (result.changes === 0) {
        return res.status(404).json({ error: "Profissional não encontrado ou não é um colaborador." });
      }
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error updating staff:", error);
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

  app.get("/api/availability", (req, res) => {
    const { professionalId, date, duration, storeId } = req.query;

    if (!professionalId || !date || !duration || !storeId) {
        return res.status(400).json({ error: "Profissional, data, duração e ID da loja são obrigatórios." });
    }

    try {
        // Fetch store settings for working hours
        const settings = db.prepare("SELECT key, value FROM settings WHERE store_id = ? AND key IN ('opening_time', 'closing_time')").all(storeId);
        const settingsMap = settings.reduce((acc: any, curr: any) => {
            acc[curr.key] = curr.value;
            return acc;
        }, {});

        // 1. Define working hours, with fallbacks
        const openingTimeStr = settingsMap.opening_time || '09:00';
        const closingTimeStr = settingsMap.closing_time || '18:00';
        
        const [openingHour, openingMinute] = openingTimeStr.split(':').map(Number);
        const [closingHour, closingMinute] = closingTimeStr.split(':').map(Number);

        const professional = db.prepare("SELECT break_start_time, break_end_time FROM users WHERE id = ?").get(professionalId) as { break_start_time: string | null, break_end_time: string | null };

        const slotInterval = 15; // minutes

        // 2. Get existing appointments for the professional on that day
        const appointments = db.prepare(`
            SELECT start_time, end_time 
            FROM appointments 
            WHERE professional_id = ? 
            AND store_id = ?
            AND date(start_time) = date(?)
            AND status != 'CANCELLED'
        `).all(professionalId, storeId, date) as { start_time: string, end_time: string }[];

        const bookedSlots = appointments.map(a => ({
            start: new Date(a.start_time),
            end: new Date(a.end_time)
        }));

        // Add professional's break to booked slots
        if (professional && professional.break_start_time && professional.break_end_time) {
            const dayStr = (date as string).split('T')[0];
            const breakStart = new Date(`${dayStr}T${professional.break_start_time}`);
            const breakEnd = new Date(`${dayStr}T${professional.break_end_time}`);
            if (!isNaN(breakStart.getTime()) && !isNaN(breakEnd.getTime())) {
                bookedSlots.push({ start: breakStart, end: breakEnd });
            }
        }

        const availableSlots: string[] = [];
        const day = new Date(`${date}T00:00:00`);
        let currentSlot = new Date(new Date(day).setHours(openingHour, openingMinute, 0, 0));
        const endOfDay = new Date(new Date(day).setHours(closingHour, closingMinute, 0, 0));

        while (currentSlot < endOfDay) {
            const potentialStartTime = new Date(currentSlot);
            const potentialEndTime = new Date(potentialStartTime.getTime() + Number(duration) * 60000);

            if (potentialEndTime > endOfDay) break;

            const isOverlapping = bookedSlots.some(booked => (potentialStartTime < booked.end && potentialEndTime > booked.start));

            if (!isOverlapping) availableSlots.push(potentialStartTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));

            currentSlot = new Date(currentSlot.getTime() + slotInterval * 60000);
        }
        res.json(availableSlots);
    } catch (error) {
        console.error("Error fetching availability:", error);
        res.status(500).json({ error: "Falha ao buscar horários." });
    }
  });

  app.post("/api/appointments", (req, res) => {
    const { client_id, professional_id, service_ids, start_time, storeId } = req.body;

    if (!service_ids || !Array.isArray(service_ids) || service_ids.length === 0) {
      return res.status(400).json({ error: "Pelo menos um serviço deve ser selecionado." });
    }

    if (!start_time) {
      return res.status(400).json({ error: "Data e hora do agendamento são obrigatórias." });
    }

    const appointmentDate = new Date(start_time);
    if (isNaN(appointmentDate.getTime())) {
      return res.status(400).json({ error: "Data de agendamento inválida." });
    }

    if (appointmentDate < new Date()) {
      return res.status(400).json({ error: "Não é possível realizar agendamentos para datas ou horários passados." });
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
        
        createdAppointmentIds.push(Number(result.lastInsertRowid));
        currentStartTime = end_time;
      }

      // Associate client with the store if not already associated
      db.prepare(`
        INSERT INTO client_stores (client_id, store_id) 
        VALUES (?, ?)
        ON CONFLICT(client_id, store_id) DO NOTHING
      `).run(client_id, storeId);

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

  app.get("/api/dashboard/staff-stats", (req, res) => {
    const storeId = req.query.storeId as string | undefined;
    const period = (req.query.period as string) || 'monthly';

    if (!storeId) {
      return res.status(400).json({ error: "Store ID is required." });
    }

    const now = new Date();
    let startDate = new Date(now.getFullYear(), 0, 1).toISOString();

    if (period === 'daily') {
      startDate = new Date(new Date().setHours(0, 0, 0, 0)).toISOString();
    } else if (period === 'weekly') {
      const startOfWeek = new Date();
      const day = startOfWeek.getDay();
      const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
      startOfWeek.setDate(diff);
      startOfWeek.setHours(0, 0, 0, 0);
      startDate = startOfWeek.toISOString();
    } else if (period === 'monthly') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    }

    try {
      const staffStats = db.prepare(`
        SELECT
          u.id,
          u.name,
          SUM(s.price) as totalRevenue,
          SUM(s.price * COALESCE(sc.commission_rate, u.commission_rate) / 100) as totalCommission
        FROM appointments a
        JOIN users u ON a.professional_id = u.id
        JOIN services s ON a.service_id = s.id
        LEFT JOIN service_commissions sc ON sc.user_id = u.id AND sc.service_id = s.id
        WHERE a.store_id = ? AND a.start_time >= ? AND a.status = 'COMPLETED' AND u.role = 'COLLABORATOR'
        GROUP BY u.id, u.name
        ORDER BY totalRevenue DESC
      `).all(storeId, startDate);
      res.json(staffStats);
    } catch (error) {
      console.error("Error fetching staff stats:", error);
      res.status(500).json({ error: "Failed to fetch staff financial stats." });
    }
  });

  app.get("/api/expenses", (req, res) => {
    const storeId = req.query.storeId as string;
    const expenses = db.prepare("SELECT * FROM expenses WHERE store_id = ? AND user_id IS NULL ORDER BY date DESC").all(storeId);
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
        const result = db.prepare("INSERT INTO expenses (description, amount, store_id, user_id) VALUES (?, ?, ?, NULL)").run(description, amount, storeId);
        res.status(201).json({ id: Number(result.lastInsertRowid) });
      } catch (error) {
        console.error("Error adding expense:", error);
        res.status(500).json({ error: "Erro interno ao adicionar despesa." });
      }
  });

  app.delete("/api/expenses/:id", (req, res) => {
    const { id } = req.params;
    // Optional: could add a check to ensure the user deleting is from the correct store.
    // This endpoint is for managers deleting store-level expenses.
    try {
      const result = db.prepare("DELETE FROM expenses WHERE id = ? AND user_id IS NULL").run(id);
      if (result.changes === 0) {
        return res.status(404).json({ error: "Despesa da loja não encontrada." });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting expense:", error);
      res.status(500).json({ error: "Erro ao excluir despesa." });
    }
  });

  app.post("/api/collaborator/expenses", (req, res) => {
    const { description, amount, userId, storeId } = req.body;
    if (!description || amount === undefined || !userId || !storeId) {
        return res.status(400).json({ error: "Descrição, valor, ID do usuário e ID da loja são obrigatórios." });
    }
    try {
        const result = db.prepare("INSERT INTO expenses (description, amount, user_id, store_id) VALUES (?, ?, ?, ?)")
                         .run(description, parseFloat(amount) || 0, userId, storeId);
        res.status(201).json({ id: Number(result.lastInsertRowid) });
    } catch (error) {
        console.error("Error adding collaborator expense:", error);
        res.status(500).json({ error: "Erro interno ao adicionar despesa do colaborador." });
    }
  });

  app.delete("/api/collaborator/expenses/:id", (req, res) => {
      const { id } = req.params;
      const { userId } = req.body; // Sent from frontend to confirm ownership
      if (!userId) {
          return res.status(400).json({ error: "ID do usuário é obrigatório para exclusão." });
      }
      try {
          const result = db.prepare("DELETE FROM expenses WHERE id = ? AND user_id = ?").run(id, userId);
          if (result.changes === 0) { return res.status(404).json({ error: "Despesa não encontrada ou você não tem permissão para excluí-la." }); }
          res.json({ success: true });
      } catch (error) {
          res.status(500).json({ error: "Erro ao excluir despesa do colaborador." });
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
    res.json({ id: Number(result.lastInsertRowid) });
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
    const storeId = req.query.storeId as string;
    if (!storeId) {
      return res.status(400).json({ error: "O ID da loja é obrigatório." });
    }
    // Retorna clientes que têm agendamento na loja OU foram associados a ela.
    const clients = db.prepare(`
      SELECT 
        c.id, 
        c.name, 
        c.phone, 
        c.cep, 
        (SELECT COUNT(*) FROM appointments a2 WHERE a2.client_id = c.id AND a2.store_id = ?) as appointment_count
      FROM clients c
      WHERE 
        c.id IN (SELECT DISTINCT client_id FROM appointments WHERE store_id = ?)
        OR
        c.id IN (SELECT client_id FROM client_stores WHERE store_id = ?)
      ORDER BY c.name
    `).all(storeId, storeId, storeId);
    res.json(clients);
  });

  app.get("/api/clients/search", (req, res) => {
    const query = req.query.q as string;
    // We don't scope by storeId here, allowing managers to find any client
    // in the system (e.g., one who self-registered) and add them to their store via an appointment.
    if (!query || query.length < 2) {
      return res.json([]); // Don't search for very short strings
    }
    const cleanQuery = query.replace(/\D/g, ''); // For searching phone numbers
    const clients = db.prepare(`
      SELECT id, name, phone, cep FROM clients 
      WHERE name LIKE ? OR phone LIKE ?
      LIMIT 10
    `).all(`%${query}%`, `%${cleanQuery}%`);
    res.json(clients);
  });

  app.patch("/api/clients/:id", (req, res) => {
    const { id } = req.params;
    const { name, phone, cep, birth_date } = req.body;

    const fields: string[] = [];
    const params: (string | number | null)[] = [];

    if (name !== undefined) { fields.push("name = ?"); params.push(name); }
    if (phone !== undefined) { fields.push("phone = ?"); params.push(phone); }
    if (cep !== undefined) { fields.push("cep = ?"); params.push(cep); }
    if (birth_date !== undefined) { fields.push("birth_date = ?"); params.push(birth_date || null); }

    if (fields.length === 0) {
      return res.status(400).json({ error: "Nenhum campo para atualizar foi fornecido." });
    }
    params.push(id);

    try {
      db.prepare(`UPDATE clients SET ${fields.join(", ")} WHERE id = ?`).run(...params);
      res.json({ success: true });
    } catch (error: any) {
      if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') { return res.status(400).json({ error: "Este número de telefone já está em uso." }); }
      res.status(500).json({ error: "Falha ao atualizar o cliente." });
    }
  });

  app.get("/api/opportunities/inactive-clients", (req, res) => {
    const storeId = req.query.storeId as string;
    if (!storeId) {
      return res.status(400).json({ error: "O ID da loja é obrigatório." });
    }
    // Clients who haven't had an appointment in the last 90 days
    const clients = db.prepare(`
      SELECT c.id, c.name, c.phone, c.cep, MAX(a.start_time) as last_appointment
      FROM clients c
      JOIN appointments a ON c.id = a.client_id
      WHERE a.store_id = ?
      GROUP BY c.id
      HAVING last_appointment < date('now', '-90 days')
      ORDER BY last_appointment ASC
    `).all(storeId);
    res.json(clients);
  });

  app.get("/api/opportunities/birthday-clients", (req, res) => {
    const storeId = req.query.storeId as string;
    if (!storeId) {
      return res.status(400).json({ error: "O ID da loja é obrigatório." });
    }
    // Find clients whose birthday is in the current month
    const clients = db.prepare(`
      SELECT c.id, c.name, c.phone, c.cep, c.birth_date
      FROM clients c
      WHERE c.id IN (SELECT client_id FROM client_stores WHERE store_id = ?)
      AND strftime('%m', c.birth_date) = strftime('%m', 'now')
      ORDER BY strftime('%d', c.birth_date)
    `).all(storeId);
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
        s.price as service_price,
        r.id as review_id,
        r.rating as review_rating
      FROM appointments a
      JOIN users u ON a.professional_id = u.id
      JOIN services s ON a.service_id = s.id
      JOIN stores st ON a.store_id = st.id
      LEFT JOIN reviews r ON r.appointment_id = a.id
      WHERE a.client_id = ?
      ORDER BY a.start_time DESC
    `).all(clientId);
    res.json(appointments);
  });

  app.get("/api/clients/:clientId/spending", (req, res) => {
    const { clientId } = req.params;

    try {
      const historicalTotal = db.prepare(`
        SELECT SUM(s.price) as total
        FROM appointments a
        JOIN services s ON a.service_id = s.id
        WHERE a.client_id = ? AND a.status = 'COMPLETED'
      `).get(clientId) as { total: number };

      const upcomingTotal = db.prepare(`
        SELECT SUM(s.price) as total
        FROM appointments a
        JOIN services s ON a.service_id = s.id
        WHERE a.client_id = ? AND a.status = 'PENDING' AND a.start_time > CURRENT_TIMESTAMP
      `).get(clientId) as { total: number };

      const history = db.prepare(`
        SELECT s.name as service_name, s.price as service_price, a.start_time
        FROM appointments a
        JOIN services s ON a.service_id = s.id
        WHERE a.client_id = ? AND a.status = 'COMPLETED'
        ORDER BY a.start_time DESC
        LIMIT 10
      `).all(clientId);

      res.json({
        historicalTotal: historicalTotal.total || 0,
        upcomingTotal: upcomingTotal.total || 0,
        history: history,
      });
    } catch (error) {
      console.error("Error fetching client spending:", error);
      res.status(500).json({ error: "Failed to fetch spending data." });
    }
  });

  app.post("/api/clients/:clientId/favorites", (req, res) => {
    const { clientId } = req.params;
    const { storeId } = req.body;

    if (!storeId) {
        return res.status(400).json({ error: "storeId is required." });
    }

    try {
        // Usando ON CONFLICT DO NOTHING para evitar erros se já for um favorito
        db.prepare("INSERT INTO client_favorite_stores (client_id, store_id) VALUES (?, ?) ON CONFLICT(client_id, store_id) DO NOTHING")
          .run(clientId, storeId);
        res.status(201).json({ success: true });
    } catch (error: any) {
        console.error("Error adding favorite:", error);
        res.status(500).json({ error: "Failed to add favorite." });
    }
  });

  app.delete("/api/clients/:clientId/favorites/:storeId", (req, res) => {
      const { clientId, storeId } = req.params;

      try {
          db.prepare("DELETE FROM client_favorite_stores WHERE client_id = ? AND store_id = ?")
            .run(clientId, storeId);
          res.json({ success: true });
      } catch (error) {
          console.error("Error removing favorite:", error);
          res.status(500).json({ error: "Failed to remove favorite." });
      }
  });

  app.get("/api/commissions/:userId", (req, res) => {
    const { userId } = req.params;
    const user = db.prepare("SELECT commission_rate, store_id FROM users WHERE id = ?").get(userId) as { commission_rate: number, store_id: number };
    
    if (!user) return res.status(404).json({ error: "User not found" });

    const now = new Date();
    const startOfDay = new Date(now.setHours(0, 0, 0, 0)).toISOString();
    
    const startOfWeek = new Date(now);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
    startOfWeek.setDate(diff);
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

    const calculateRevenue = (startDate: string) => {
        const result = db.prepare(`
            SELECT SUM(s.price) as total
            FROM appointments a
            JOIN services s ON a.service_id = s.id
            WHERE a.professional_id = ? AND a.status = 'COMPLETED' AND a.start_time >= ? AND a.store_id = ?
        `).get(userId, startDate, user.store_id) as { total: number };
        return result.total || 0;
    };

    const monthlyGoalSetting = db.prepare("SELECT value FROM settings WHERE key = 'monthly_goal' AND store_id = ?").get(user.store_id) as { value: string };
    const recentExpenses = db.prepare("SELECT * FROM expenses WHERE user_id = ? AND date >= ? ORDER BY date DESC").all(userId, startOfMonth);

    res.json({
      daily: calculateCommission(startOfDay),
      weekly: calculateCommission(startOfWeekStr),
      monthly: calculateCommission(startOfMonth),
      monthly_revenue: calculateRevenue(startOfMonth),
      monthly_goal: parseFloat(monthlyGoalSetting?.value) || 0,
      recent_expenses: recentExpenses,
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

  app.post("/api/whatsapp/send", async (req, res) => {
    const { to, message } = req.body;
    if (!to || !message) {
      return res.status(400).json({ error: "Número de destino e mensagem são obrigatórios." });
    }

    if (!isWhatsappReady) {
      return res.status(503).json({ error: "O WhatsApp ainda não está conectado. Verifique o terminal do servidor e escaneie o QR Code." });
    }

    try {
      // Formata o número para o padrão do whatsapp-web.js (ex: 5511999999999@c.us)
      // Remove o '+' se existir e garante que tenha apenas números
      const cleanNumber = to.replace(/\D/g, '');
      const chatId = `${cleanNumber}@c.us`;

      await whatsappClient.sendMessage(chatId, message);
      
      res.json({ success: true, message: "Mensagem enviada com sucesso." });
    } catch (error: any) {
      console.error("Erro ao enviar via WhatsApp Local:", error);
      res.status(500).json({ error: `Falha ao enviar mensagem: ${error.message}` });
    }
  });

  app.get("/api/whatsapp/status", (req, res) => {
    res.json({ status: whatsappStatus, qrCode: whatsappQrCode });
  });

  app.post("/api/whatsapp/logout", async (req, res) => {
    try {
      await whatsappClient.logout();
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: "Falha ao desconectar WhatsApp." });
    }
  });

  app.post("/api/reviews", (req, res) => {
    const { appointment_id, rating, comment, client_id } = req.body; // client_id for auth check

    if (!appointment_id || !rating) {
      return res.status(400).json({ error: "ID do agendamento e avaliação são obrigatórios." });
    }
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ error: "A avaliação deve ser entre 1 e 5." });
    }

    try {
      const appointment = db.prepare("SELECT * FROM appointments WHERE id = ?").get(appointment_id) as Appointment;
      if (!appointment) {
        return res.status(404).json({ error: "Agendamento não encontrado." });
      }
      // Basic authorization: check if the appointment belongs to the client submitting the review
      if (appointment.client_id !== client_id) {
        return res.status(403).json({ error: "Você não tem permissão para avaliar este agendamento." });
      }
      if (appointment.status !== 'COMPLETED') {
        return res.status(400).json({ error: "Só é possível avaliar agendamentos concluídos." });
      }

      const result = db.prepare(
        `INSERT INTO reviews (appointment_id, client_id, professional_id, store_id, rating, comment)
         VALUES (?, ?, ?, ?, ?, ?)`
      ).run(
        appointment_id,
        appointment.client_id,
        appointment.professional_id,
        appointment.store_id,
        rating,
        comment || null
      );

      res.status(201).json({ id: Number(result.lastInsertRowid) });
    } catch (error: any) {
      if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        return res.status(400).json({ error: "Este agendamento já foi avaliado." });
      }
      console.error("Error adding review:", error);
      res.status(500).json({ error: "Erro ao salvar avaliação." });
    }
  });

  // --- ADMIN ROUTES ---

  app.get("/api/admin/dashboard", (req, res) => {
    // TODO: Add auth check for ADMIN role
    const plans: Record<string, number> = {
      'BASIC': 49.90,
      'INTERMEDIATE': 99.90,
      'ADVANCED': 159.90
    };

    const planCounts = db.prepare(`
        SELECT plan, COUNT(id) as count 
        FROM stores 
        WHERE status = 'ACTIVE' AND plan IS NOT NULL
        GROUP BY plan
    `).all() as { plan: keyof typeof plans, count: number }[];

    const mrr = planCounts.reduce((total, item) => {
        return total + (plans[item.plan] || 0) * item.count;
    }, 0);

    const activeStores = db.prepare("SELECT COUNT(id) as count FROM stores WHERE status = 'ACTIVE'").get() as { count: number };
    const pendingStores = db.prepare("SELECT COUNT(id) as count FROM stores WHERE status = 'PENDING_PAYMENT'").get() as { count: number };

    res.json({
        mrr: mrr,
        activeStores: activeStores.count || 0,
        pendingStores: pendingStores.count || 0,
    });
  });

  app.get("/api/admin/stores", (req, res) => {
      // TODO: Add auth check for ADMIN role
      const stores = db.prepare(`
          SELECT 
              s.*, 
              u.name as manager_name, 
              u.email as manager_email 
          FROM stores s 
          LEFT JOIN users u ON s.id = u.store_id AND u.role = 'MANAGER'
          ORDER BY 
              CASE s.status
                  WHEN 'PENDING_PAYMENT' THEN 1
                  WHEN 'ACTIVE' THEN 2
                  WHEN 'INACTIVE' THEN 3
                  ELSE 4
              END,
              s.name
      `).all();
      res.json(stores);
  });

  app.patch("/api/admin/stores/:id/status", (req, res) => {
      const { id } = req.params;
      const { status } = req.body;
      if (!status || !['ACTIVE', 'INACTIVE', 'PENDING_PAYMENT'].includes(status)) {
          return res.status(400).json({ error: "Status inválido." });
      }
      const result = db.prepare("UPDATE stores SET status = ? WHERE id = ?").run(status, id);
      if (result.changes === 0) return res.status(404).json({ error: "Loja não encontrada." });
      res.json({ success: true });
  });

  app.get("/api/admin/settings", (req, res) => {
    // TODO: Add auth check for ADMIN role
    try {
      const settings = db.prepare("SELECT * FROM system_settings").all();
      const settingsMap = settings.reduce((acc: any, curr: any) => {
        acc[curr.key] = curr.value;
        return acc;
      }, {});
      res.json(settingsMap);
    } catch (error) {
      console.error("Error fetching system settings:", error);
      res.status(500).json({ error: "Erro ao buscar configurações do sistema." });
    }
  });

  app.post("/api/admin/settings", (req, res) => {
    // TODO: Add auth check for ADMIN role
    const { settings } = req.body;
    if (!settings) {
      return res.status(400).json({ error: "Nenhuma configuração fornecida." });
    }
    const stmt = db.prepare(`
      INSERT INTO system_settings (key, value) VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `);
    const transaction = db.transaction(() => {
      for (const key in settings) {
        stmt.run(key, settings[key]);
      }
    });
    transaction();
    res.json({ success: true });
  });

  // Rota para upload de imagem
  app.post("/api/upload/image", (req, res) => {
    const handleUpload = upload.single('image');
    handleUpload(req, res, (err) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ error: 'Arquivo muito grande. O limite é de 5MB.' });
          }
        }
        return res.status(400).json({ error: err.message });
      }
      if (!req.file) {
        return res.status(400).json({ error: "Nenhum arquivo foi enviado." });
      }
      const fileUrl = `/uploads/${req.file.filename}`;
      res.json({ url: fileUrl });
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        watch: {
          ignored: ['**/.wwebjs_auth/**', '**/.wwebjs_cache/**', '**/salon.db', '**/salon.db-journal']
        }
      },
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
