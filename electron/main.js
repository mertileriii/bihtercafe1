// Electron Main Process - Bihter Kafe Admin Panel
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const express = require('express');
const cors = require('cors');
const { initializeFirebase, syncMenuItemToFirestore, deleteMenuItemFromFirestore, listenToOrders, saveOrderToSQLite, isFirebaseInitialized, getFirestoreDb } = require('./firestore-sync');
const { startListeningToOrders: startOrderListener, stopListeningToOrders: stopOrderListener } = require('./orders-listener');
const { startListeningToWaiterCalls: startWaiterCallsListener, stopListeningToWaiterCalls: stopWaiterCallsListener } = require('./waiter-calls-listener');

// Veritabanı yolu
const userDataPath = app.getPath('userData');
const dbPath = path.join(userDataPath, 'bihter_admin.db');
let db = null;

// Veritabanını başlat
function initDatabase() {
  try {
    if (!db) {
      console.log('📦 Veritabanı başlatılıyor:', dbPath);
      db = new Database(dbPath);
      console.log('✅ Veritabanı bağlantısı kuruldu');
      
      createTables();
      console.log('✅ Tablolar hazır');
      
      createDefaultAdmin();
      console.log('✅ SQLite veritabanı başlatıldı');
    }
    return db;
  } catch (error) {
    console.error('❌ Veritabanı hatası:', error);
    console.error('   Hata detayı:', error.stack);
    throw error;
  }
}

// Tabloları oluştur
function createTables() {
  if (!db) return;
  
  db.exec(`
    CREATE TABLE IF NOT EXISTS staff (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'staff',
      isActive INTEGER DEFAULT 1,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE TABLE IF NOT EXISTS menu_items (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      price REAL NOT NULL,
      description TEXT,
      image TEXT,
      variants TEXT,
      isActive INTEGER DEFAULT 1,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      orderNumber TEXT UNIQUE NOT NULL,
      staffId TEXT,
      staffName TEXT,
      totalAmount REAL NOT NULL,
      paymentMethod TEXT DEFAULT 'cash',
      status TEXT DEFAULT 'pending',
      tableId INTEGER,
      items TEXT NOT NULL,
      source TEXT,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE INDEX IF NOT EXISTS idx_orders_staffId ON orders(staffId);
    CREATE INDEX IF NOT EXISTS idx_orders_createdAt ON orders(createdAt);
    CREATE INDEX IF NOT EXISTS idx_menu_items_category ON menu_items(category);
  `);
  
  // Migration: Eksik kolonları ekle (eğer tablo zaten varsa)
  try {
    db.exec(`ALTER TABLE orders ADD COLUMN tableId INTEGER`);
    console.log('✅ tableId kolonu orders tablosuna eklendi');
  } catch (e) {
    if (!e.message.includes('duplicate column') && !e.message.includes('already exists')) {
      console.log('ℹ️ tableId kolonu zaten mevcut veya eklenemedi:', e.message);
    }
  }
  
  // Migration: Helvalar için büyük/küçük fiyat kolonları ekle
  try {
    db.exec(`ALTER TABLE menu_items ADD COLUMN priceSmall REAL`);
    console.log('✅ priceSmall kolonu menu_items tablosuna eklendi');
  } catch (e) {
    if (!e.message.includes('duplicate column') && !e.message.includes('already exists')) {
      console.log('ℹ️ priceSmall kolonu zaten mevcut veya eklenemedi:', e.message);
    }
  }
  
  try {
    db.exec(`ALTER TABLE menu_items ADD COLUMN priceLarge REAL`);
    console.log('✅ priceLarge kolonu menu_items tablosuna eklendi');
  } catch (e) {
    if (!e.message.includes('duplicate column') && !e.message.includes('already exists')) {
      console.log('ℹ️ priceLarge kolonu zaten mevcut veya eklenemedi:', e.message);
    }
  }
  
  try {
    db.exec(`ALTER TABLE orders ADD COLUMN source TEXT`);
    console.log('✅ source kolonu orders tablosuna eklendi');
  } catch (e) {
    if (!e.message.includes('duplicate column') && !e.message.includes('already exists')) {
      console.log('ℹ️ source kolonu zaten mevcut veya eklenemedi:', e.message);
    }
  }
  
  // Mevcut tablo yapısını kontrol et ve NOT NULL constraint'lerini kontrol et
  try {
    const tableInfo = db.prepare('PRAGMA table_info(orders)').all();
    console.log('📋 Mevcut orders tablosu yapısı:');
    tableInfo.forEach(col => {
      console.log(`   ${col.name}: type=${col.type}, notnull=${col.notnull === 1 ? 'YES' : 'NO'}, default=${col.dflt_value || 'NULL'}`);
    });
    
    // staffId ve staffName kolonlarının NOT NULL olup olmadığını kontrol et
    const staffIdCol = tableInfo.find(col => col.name === 'staffId');
    const staffNameCol = tableInfo.find(col => col.name === 'staffName');
    
    if (staffIdCol && staffIdCol.notnull === 1) {
      console.warn('⚠️ staffId kolonu NOT NULL olarak tanımlanmış. Domain siparişleri için default değer kullanılacak.');
    }
    
    if (staffNameCol && staffNameCol.notnull === 1) {
      console.warn('⚠️ staffName kolonu NOT NULL olarak tanımlanmış. Domain siparişleri için default değer kullanılacak.');
    }
  } catch (e) {
    console.error('❌ Tablo yapısı kontrol edilemedi:', e.message);
  }
}

// Varsayılan admin kullanıcısı
function createDefaultAdmin() {
  try {
    console.log('👤 Admin kullanıcısı kontrol ediliyor...');
    const admin = db.prepare('SELECT * FROM staff WHERE email = ?').get('admin@bihter.com');
    
    if (!admin) {
      console.log('➕ Admin kullanıcısı oluşturuluyor...');
      let hashedPassword;
      try {
        hashedPassword = bcrypt.hashSync('admin123', 10);
        console.log('   Şifre hash\'lendi');
      } catch (hashError) {
        console.error('   Hash hatası, şifre hash\'lenmeden kaydediliyor:', hashError);
        hashedPassword = 'admin123'; // Fallback
      }
      
      const stmt = db.prepare('INSERT INTO staff (id, name, email, password, role) VALUES (?, ?, ?, ?, ?)');
      stmt.run('admin-1', 'Admin', 'admin@bihter.com', hashedPassword, 'admin');
      console.log('✅ Varsayılan admin kullanıcısı oluşturuldu');
      console.log('   Email: admin@bihter.com');
      console.log('   Şifre: admin123');
      
      // Doğrulama
      const verifyAdmin = db.prepare('SELECT * FROM staff WHERE email = ?').get('admin@bihter.com');
      if (verifyAdmin) {
        console.log('✅ Admin kullanıcısı doğrulandı');
      } else {
        console.error('❌ Admin kullanıcısı oluşturulamadı!');
      }
    } else {
      console.log('✅ Admin kullanıcısı zaten mevcut');
      console.log('   ID:', admin.id);
      console.log('   Email:', admin.email);
      console.log('   Role:', admin.role);
    }
  } catch (error) {
    console.error('❌ Admin oluşturma hatası:', error);
    console.error('   Hata detayı:', error.stack);
  }
}

// Ana pencere
let mainWindow = null;

function createWindow() {
  console.log('🪟 Pencere oluşturuluyor...');
  
  try {
    mainWindow = new BrowserWindow({
      width: 1400,
      height: 900,
      minWidth: 1024,
      minHeight: 768,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'preload.js')
      },
      title: 'Bihter Kafe - Admin Panel',
      show: true, // Hemen göster
      autoHideMenuBar: true
    });
    console.log('✅ Pencere oluşturuldu');
  } catch (error) {
    console.error('❌ Pencere oluşturma hatası:', error);
    const { dialog } = require('electron');
    dialog.showErrorBox('Pencere Hatası', `Pencere oluşturulamadı: ${error.message}`);
    return;
  }

  // Admin paneli sayfasını yükle
  const adminPath = path.join(__dirname, '../admin/index.html');
  console.log('📂 Admin paneli yükleniyor:', adminPath);
  
  mainWindow.loadFile(adminPath).catch((error) => {
    console.error('❌ Dosya yükleme hatası:', error);
    const { dialog } = require('electron');
    dialog.showErrorBox('Dosya Hatası', `Admin paneli dosyası yüklenemedi: ${error.message}`);
  });

  mainWindow.once('ready-to-show', () => {
    console.log('✅ Pencere hazır, gösteriliyor...');
    mainWindow.show();
    mainWindow.focus();
    
    // Firestore'dan sipariş dinlemeye başla (pencere hazır olduktan sonra)
    // Not: Firebase başlatıldıktan sonra da başlatılacak (app.whenReady içinde)
    setTimeout(() => {
      console.log('🚀 Sipariş dinleme başlatılıyor (pencere hazır, Firebase kontrol ediliyor)...');
      // Firebase başlatılmışsa başlat, değilse app.whenReady içinde başlatılacak
      if (isFirebaseInitialized()) {
        console.log('✅ Firebase başlatılmış, sipariş dinleme başlatılıyor...');
        startOrderListener(mainWindow);
        startWaiterCallsListener(mainWindow);
      } else {
        console.log('⏳ Firebase henüz başlatılmamış, app.whenReady içinde başlatılacak');
      }
    }, 3000);
  });

  mainWindow.on('closed', () => {
    stopOrderListener();
    mainWindow = null;
  });
  
  // Hata yakalama
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('❌ Sayfa yükleme hatası:', errorCode, errorDescription);
  });

  // Dev tools - Her zaman açık (debug için)
  mainWindow.webContents.openDevTools();
  
  // Console log'larını görüntüle
  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    if (level >= 2) { // Only warnings and errors
      console.log(`[Renderer ${level === 2 ? 'WARN' : 'ERROR'}] ${message}`);
    }
  });
  
  // IPC connection errors - görmezden gel
  mainWindow.webContents.on('crashed', () => {
    console.error('❌ Renderer process çöktü');
  });
  
  mainWindow.webContents.on('unresponsive', () => {
    console.warn('⚠️ Renderer process yanıt vermiyor');
  });
}

// HTTP API Server for domain menu
let apiServer = null;

function startAPIServer() {
  if (apiServer) {
    console.log('⚠️ API server zaten çalışıyor');
    return;
  }
  
  const api = express();
  api.use(cors());
  api.use(express.json());
  
  // Menu items endpoint
  api.get('/api/menu-items', (req, res) => {
    try {
      if (!db) {
        return res.status(500).json({ success: false, error: 'Database not initialized' });
      }
      
      const category = req.query.category || null;
      const includeInactive = req.query.includeInactive === 'true';
      
      let query = 'SELECT * FROM menu_items WHERE 1=1';
      const params = [];
      
      if (!includeInactive) {
        query += ' AND isActive = 1';
      }
      
      if (category) {
        query += ' AND category = ?';
        params.push(category);
      }
      
      query += ' ORDER BY category, name';
      const stmt = db.prepare(query);
      const rows = params.length > 0 ? stmt.all(...params) : stmt.all();
      
      const items = rows.map(r => ({
        ...r,
        variants: r.variants ? JSON.parse(r.variants) : []
      }));
      
      res.json({ success: true, items });
    } catch (error) {
      console.error('API Error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
  
  // Health check
  api.get('/api/health', (req, res) => {
    res.json({ success: true, message: 'API is running' });
  });
  
  // Start server on port 3001
  apiServer = api.listen(3001, () => {
    console.log('🌐 API Server started on http://localhost:3001');
  });
}

function stopAPIServer() {
  if (apiServer) {
    apiServer.close();
    apiServer = null;
    console.log('🛑 API Server stopped');
  }
}

// IPC Handlers - Database Operations
function setupIPC() {
  // Staff operations
  ipcMain.handle('db:getStaff', async (event, email, password = null) => {
    try {
      if (!db) {
        console.error('❌ Veritabanı bağlantısı yok!');
        throw new Error('Veritabanı bağlantısı yok. Uygulama yeniden başlatılmalı.');
      }
      
      console.log('🔐 Login denemesi:', email);
      console.log('   Şifre verildi:', password ? 'Evet' : 'Hayır');
      
      const stmt = db.prepare('SELECT * FROM staff WHERE email = ? AND isActive = 1');
      const staff = stmt.get(email);
      
      if (!staff) {
        console.log('❌ Kullanıcı bulunamadı:', email);
        console.log('   Tüm kullanıcıları kontrol ediyor...');
        const allStaff = db.prepare('SELECT email, role FROM staff').all();
        console.log('   Mevcut kullanıcılar:', allStaff);
        return null;
      }
      
      console.log('👤 Kullanıcı bulundu:', staff.name, staff.role);
      
      if (password) {
        // Şifreyi kontrol et
        try {
          const match = bcrypt.compareSync(password, staff.password);
          console.log('🔑 Şifre kontrolü:', match ? '✅ Başarılı' : '❌ Başarısız');
          if (!match) {
            console.log('❌ Şifre eşleşmedi');
            return null;
          }
        } catch (hashError) {
          console.error('❌ Şifre hash karşılaştırma hatası:', hashError);
          // Şifre hash'lenmemiş olabilir, direkt karşılaştır
          if (staff.password === password) {
            console.log('⚠️ Şifre hash\'lenmemiş, direkt karşılaştırma başarılı');
          } else {
            return null;
          }
        }
      }
      
      // Şifreyi response'dan çıkar (güvenlik)
      const staffResponse = { ...staff };
      delete staffResponse.password;
      console.log('✅ Giriş başarılı:', email);
      return staffResponse;
    } catch (error) {
      console.error('❌ dbGetStaff hatası:', error);
      console.error('   Hata detayı:', error.stack);
      
      // EPIPE hatası genellikle kritik değildir
      if (error.code === 'EPIPE' || (error.message && error.message.includes('EPIPE'))) {
        console.warn('⚠️ EPIPE hatası, null döndürülüyor');
        return null;
      }
      
      throw error; // Diğer hataları fırlat
    }
  });

  ipcMain.handle('db:getAllStaff', async () => {
    const stmt = db.prepare('SELECT * FROM staff ORDER BY createdAt DESC');
    return stmt.all();
  });

  ipcMain.handle('db:createStaff', async (event, staffData) => {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const { name, email, password, role = 'staff' } = staffData;
    const hashedPassword = bcrypt.hashSync(password, 10);
    const stmt = db.prepare('INSERT INTO staff (id, name, email, password, role) VALUES (?, ?, ?, ?, ?)');
    stmt.run(id, name, email, hashedPassword, role);
    return db.prepare('SELECT * FROM staff WHERE id = ?').get(id);
  });

  ipcMain.handle('db:updateStaff', async (event, id, updates) => {
    const fields = [];
    const values = [];
    
    if (updates.name) { fields.push('name = ?'); values.push(updates.name); }
    if (updates.email) { fields.push('email = ?'); values.push(updates.email); }
    if (updates.password) {
      const hashedPassword = bcrypt.hashSync(updates.password, 10);
      fields.push('password = ?');
      values.push(hashedPassword);
    }
    if (updates.role !== undefined) { fields.push('role = ?'); values.push(updates.role); }
    
    if (fields.length === 0) return null;
    
    values.push(id);
    const stmt = db.prepare(`UPDATE staff SET ${fields.join(', ')} WHERE id = ?`);
    stmt.run(...values);
    return db.prepare('SELECT * FROM staff WHERE id = ?').get(id);
  });

  ipcMain.handle('db:deleteStaff', async (event, id) => {
    const stmt = db.prepare('DELETE FROM staff WHERE id = ?');
    stmt.run(id);
    return true;
  });

  // Menu items operations
  ipcMain.handle('db:getMenuItems', async (event, category = null, includeInactive = false) => {
    let query = 'SELECT * FROM menu_items';
    const params = [];
    
    if (category) {
      query += ' WHERE category = ?';
      params.push(category);
    }
    
    query += ' ORDER BY category, name';
    const stmt = db.prepare(query);
    const rows = params.length > 0 ? stmt.all(...params) : stmt.all();
    
    return rows.map(r => ({
      ...r,
      variants: r.variants ? JSON.parse(r.variants) : []
    }));
  });

  ipcMain.handle('db:createMenuItem', async (event, itemData) => {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const { name, category, price, description = '', image = '', variants = [], priceSmall = null, priceLarge = null } = itemData;
    const priceNum = parseFloat(price) || 0;
    const priceSmallNum = priceSmall !== null && priceSmall !== undefined ? parseFloat(priceSmall) : null;
    const priceLargeNum = priceLarge !== null && priceLarge !== undefined ? parseFloat(priceLarge) : null;
    const variantsJson = JSON.stringify(variants);
    const createdAt = new Date().toISOString();
    
    const stmt = db.prepare('INSERT INTO menu_items (id, name, category, price, priceSmall, priceLarge, description, image, variants, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    stmt.run(id, name, category, priceNum, priceSmallNum, priceLargeNum, description, image, variantsJson, createdAt);
    const item = db.prepare('SELECT * FROM menu_items WHERE id = ?').get(id);
    item.variants = variants;
    
    // Sync to Firestore
    await syncMenuItemToFirestore({ ...item, variants });
    
    return item;
  });

  ipcMain.handle('db:updateMenuItem', async (event, id, updates) => {
    const fields = [];
    const values = [];
    
    if (updates.name) { fields.push('name = ?'); values.push(updates.name); }
    if (updates.category) { fields.push('category = ?'); values.push(updates.category); }
    if (updates.price !== undefined) {
      fields.push('price = ?');
      values.push(parseFloat(updates.price) || 0);
    }
    if (updates.priceSmall !== undefined) {
      fields.push('priceSmall = ?');
      values.push(updates.priceSmall !== null ? parseFloat(updates.priceSmall) : null);
    }
    if (updates.priceLarge !== undefined) {
      fields.push('priceLarge = ?');
      values.push(updates.priceLarge !== null ? parseFloat(updates.priceLarge) : null);
    }
    if (updates.variants !== undefined) {
      fields.push('variants = ?');
      values.push(JSON.stringify(updates.variants));
    }
    if (updates.description !== undefined) { fields.push('description = ?'); values.push(updates.description); }
    
    fields.push('updatedAt = CURRENT_TIMESTAMP');
    
    if (fields.length === 0) return null;
    
    values.push(id);
    const stmt = db.prepare(`UPDATE menu_items SET ${fields.join(', ')} WHERE id = ?`);
    stmt.run(...values);
    const item = db.prepare('SELECT * FROM menu_items WHERE id = ?').get(id);
    if (item) item.variants = item.variants ? JSON.parse(item.variants) : [];
    return item;
  });

  ipcMain.handle('db:deleteMenuItem', async (event, id) => {
    const stmt = db.prepare('DELETE FROM menu_items WHERE id = ?');
    stmt.run(id);
    
    // Delete from Firestore
    await deleteMenuItemFromFirestore(id);
    
    return true;
  });

  // Orders operations
  ipcMain.handle('db:getOrders', async (event, filters = {}) => {
    let query = 'SELECT * FROM orders WHERE 1=1';
    const params = [];
    
    if (filters.staffId) {
      query += ' AND staffId = ?';
      params.push(filters.staffId);
    }
    if (filters.tableId) {
      query += ' AND tableId = ?';
      params.push(filters.tableId);
    }
    if (filters.startDate) {
      query += ' AND createdAt >= ?';
      params.push(filters.startDate);
    }
    if (filters.endDate) {
      query += ' AND createdAt <= ?';
      params.push(filters.endDate);
    }
    if (filters.status) {
      query += ' AND status = ?';
      params.push(filters.status);
    }
    
    query += ' ORDER BY createdAt DESC';
    
    const stmt = db.prepare(query);
    const orders = params.length > 0 ? stmt.all(...params) : stmt.all();
    
    return orders.map(order => ({
      ...order,
      items: typeof order.items === 'string' ? JSON.parse(order.items) : order.items
    }));
  });

  ipcMain.handle('db:createOrder', async (event, orderData) => {
    try {
      const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
      const { staffId, staffName, items, totalAmount, paymentMethod = 'cash', tableId = null, status = 'pending' } = orderData;
      
      // Ensure items is an array and totalAmount is calculated
      const itemsArray = Array.isArray(items) ? items : [];
      let finalTotalAmount = parseFloat(totalAmount) || 0;
      if (finalTotalAmount === 0 && itemsArray.length > 0) {
        finalTotalAmount = itemsArray.reduce((sum, item) => sum + (parseFloat(item.unitPrice || item.price || 0) * (item.quantity || 1)), 0);
      }
      
      const itemsJson = JSON.stringify(itemsArray);
      const createdAt = new Date().toISOString();
      
      const stmt = db.prepare(`
        INSERT INTO orders (id, orderNumber, staffId, staffName, totalAmount, paymentMethod, status, tableId, items, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      stmt.run(id, orderNumber, staffId, staffName, finalTotalAmount, paymentMethod, status, tableId, itemsJson, createdAt);
      
      // Return created order
      const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
      return {
        ...order,
        items: itemsArray
      };
    } catch (error) {
      console.error('❌ db:createOrder hatası:', error);
      throw error;
    }
  });

  ipcMain.handle('db:clearOrders', async () => {
    try {
      if (!db) {
        console.error('❌ Veritabanı bağlantısı yok!');
        return false;
      }
      const stmt = db.prepare('DELETE FROM orders');
      const result = stmt.run();
      console.log(`✅ Tüm siparişler silindi. Etkilenen satır sayısı: ${result.changes}`);
      return true;
    } catch (error) {
      console.error('❌ db:clearOrders hatası:', error);
      throw error;
    }
  });

  // Update order status and payment method
  ipcMain.handle('db:updateOrder', async (event, orderId, updates) => {
    try {
      const fields = [];
      const values = [];
      
      if (updates.status) {
        fields.push('status = ?');
        values.push(updates.status);
      }
      if (updates.paymentMethod) {
        fields.push('paymentMethod = ?');
        values.push(updates.paymentMethod);
      }
      
      if (fields.length === 0) {
        return { success: false, error: 'No fields to update' };
      }
      
      values.push(orderId);
      const query = `UPDATE orders SET ${fields.join(', ')} WHERE id = ?`;
      const stmt = db.prepare(query);
      stmt.run(...values);
      
      // Return updated order
      const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
      return {
        success: true,
        order: {
          ...order,
          items: typeof order.items === 'string' ? JSON.parse(order.items) : order.items
        }
      };
    } catch (error) {
      console.error('❌ db:updateOrder hatası:', error);
      return { success: false, error: error.message };
    }
  });

  // Update multiple orders at once (for table payment)
  ipcMain.handle('db:updateMultipleOrders', async (event, orderIds, updates) => {
    try {
      if (!Array.isArray(orderIds) || orderIds.length === 0) {
        return { success: false, error: 'Invalid order IDs' };
      }
      
      const fields = [];
      const values = [];
      
      if (updates.status) {
        fields.push('status = ?');
        values.push(updates.status);
      }
      if (updates.paymentMethod) {
        fields.push('paymentMethod = ?');
        values.push(updates.paymentMethod);
      }
      
      if (fields.length === 0) {
        return { success: false, error: 'No fields to update' };
      }
      
      // Update all orders in a transaction
      const placeholders = orderIds.map(() => '?').join(', ');
      const query = `UPDATE orders SET ${fields.join(', ')} WHERE id IN (${placeholders})`;
      const stmt = db.prepare(query);
      stmt.run(...values, ...orderIds);
      
      console.log(`✅ ${orderIds.length} sipariş güncellendi:`, updates);
      
      return { success: true, updatedCount: orderIds.length };
    } catch (error) {
      console.error('❌ db:updateMultipleOrders hatası:', error);
      return { success: false, error: error.message };
    }
  });

  // Update waiter call status in Firestore
  ipcMain.handle('db:updateWaiterCall', async (event, callId, updates) => {
    try {
      if (!isFirebaseInitialized()) {
        return { success: false, error: 'Firebase başlatılmamış' };
      }
      
      const firestoreDb = getFirestoreDb();
      if (!firestoreDb) {
        return { success: false, error: 'Firestore db mevcut değil' };
      }
      
      const admin = require('firebase-admin');
      const callRef = firestoreDb.collection('waiter_calls').doc(callId);
      const updateData = {
        ...updates,
        answeredAt: admin.firestore.FieldValue.serverTimestamp()
      };
      
      await callRef.update(updateData);
      console.log(`✅ Garson çağrısı güncellendi: ${callId}`);
      return { success: true };
    } catch (error) {
      console.error('❌ db:updateWaiterCall hatası:', error);
      return { success: false, error: error.message };
    }
  });

  // Reports
  ipcMain.handle('db:getRevenue', async (event, period, startDate, endDate) => {
    let query = 'SELECT SUM(totalAmount) as totalRevenue, COUNT(*) as totalOrders FROM orders WHERE status = ?';
    const params = ['completed'];
    
    if (startDate) {
      query += ' AND createdAt >= ?';
      params.push(startDate);
    }
    if (endDate) {
      query += ' AND createdAt <= ?';
      params.push(endDate);
    }
    
    const stmt = db.prepare(query);
    const data = stmt.get(...params) || { totalRevenue: 0, totalOrders: 0 };
    
    return {
      totalRevenue: data.totalRevenue || 0,
      totalOrders: data.totalOrders || 0,
      averageOrderValue: data.totalOrders > 0 ? (data.totalRevenue / data.totalOrders) : 0
    };
  });

  ipcMain.handle('db:getStaffSales', async (event, startDate, endDate, staffId) => {
    let query = "SELECT * FROM orders WHERE status = 'completed'";
    const params = [];
    if (startDate) { query += ' AND createdAt >= ?'; params.push(startDate); }
    if (endDate) { query += ' AND createdAt <= ?'; params.push(endDate); }
    if (staffId) { query += ' AND staffId = ?'; params.push(staffId); }
    query += ' ORDER BY createdAt DESC';
    
    const stmt = db.prepare(query);
    const orders = params.length > 0 ? stmt.all(...params) : stmt.all();
    const ordersParsed = orders.map(o => ({ ...o, items: JSON.parse(o.items) }));
    
    const staffMap = {};
    ordersParsed.forEach(order => {
      const key = order.staffId;
      if (!staffMap[key]) {
        staffMap[key] = {
          staffId: order.staffId,
          staffName: order.staffName,
          totalOrders: 0,
          totalRevenue: 0,
          items: {}
        };
      }
      
      staffMap[key].totalOrders += 1;
      staffMap[key].totalRevenue += parseFloat(order.totalAmount || 0);
      
      order.items.forEach(item => {
        const itemKey = item.menuItemId || item.id;
        if (!staffMap[key].items[itemKey]) {
          staffMap[key].items[itemKey] = {
            menuItemId: itemKey,
            menuItemName: item.menuItemName || item.name,
            category: item.category,
            quantity: 0,
            unitPrice: parseFloat(item.unitPrice || 0),
            totalRevenue: 0
          };
        }
        
        staffMap[key].items[itemKey].quantity += item.quantity || 1;
        staffMap[key].items[itemKey].totalRevenue += parseFloat(item.totalPrice || 0);
      });
    });
    
    return Object.values(staffMap).map(staff => ({
      ...staff,
      items: Object.values(staff.items)
    }));
  });

  // Firestore'dan bekleyen siparişleri manuel olarak çek (test için)
  ipcMain.handle('db:getPendingOrders', async () => {
    try {
      if (!isFirebaseInitialized() || !db) {
        return { success: false, error: 'Firebase veya database başlatılmamış' };
      }
      
      const { getFirestoreDb } = require('./firestore-sync');
      const firestoreDb = getFirestoreDb();
      
      if (!firestoreDb) {
        return { success: false, error: 'Firestore DB yok' };
      }
      
      const ordersRef = firestoreDb.collection('orders');
      const snapshot = await ordersRef.get();
      
      const orders = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        
        // Status kontrolü - case-insensitive
        const orderStatus = data.status || data.Status || 'pending';
        const normalizedStatus = String(orderStatus).toLowerCase().trim();
        
        console.log(`   🔍 Manuel çekme - Doküman ${doc.id}:`, {
          status: orderStatus,
          normalizedStatus: normalizedStatus,
          tableId: data.tableId,
          source: data.source || 'unknown',
          deviceType: data.deviceType || 'unknown'
        });
        
        if (normalizedStatus === 'pending') {
          let createdAtISO = new Date().toISOString();
          if (data.createdAt) {
            if (data.createdAt.toDate) {
              createdAtISO = data.createdAt.toDate().toISOString();
            } else if (data.createdAt instanceof Date) {
              createdAtISO = data.createdAt.toISOString();
            } else if (typeof data.createdAt === 'string') {
              createdAtISO = data.createdAt;
            }
          }
          orders.push({
            id: doc.id,
            ...data,
            createdAt: createdAtISO
          });
        }
      });
      
      console.log(`📦 Manuel çekme: ${orders.length} bekleyen sipariş bulundu`);
      return { success: true, orders };
    } catch (error) {
      console.error('❌ Bekleyen siparişleri çekme hatası:', error);
      return { success: false, error: error.message };
    }
  });

  // Firestore'dan gelen siparişi SQLite'a kaydet
  ipcMain.handle('db:saveFirestoreOrder', async (event, orderData) => {
    try {
      // SQLite'a kaydet
      const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const { tableId, items, totalAmount, orderNumber } = orderData;
      
      console.log('💾 Firestore siparişi SQLite\'a kaydediliyor:', {
        id,
        orderNumber,
        tableId,
        totalAmount,
        itemsCount: items ? items.length : 0
      });
      
      // Tablo kolonlarını kontrol et
      const tableInfo = db.prepare('PRAGMA table_info(orders)').all();
      const columnNames = tableInfo.map(col => col.name);
      const columnDetails = {};
      tableInfo.forEach(col => {
        columnDetails[col.name] = {
          notnull: col.notnull === 1,
          dflt_value: col.dflt_value
        };
      });
      console.log('📋 Orders tablosu kolonları:', columnNames);
      console.log('📋 Kolon detayları:', columnDetails);
      
      // Dinamik olarak kolonları oluştur
      const columns = ['id', 'orderNumber'];
      const values = [id, orderNumber || `ORD-${Date.now()}`];
      
      // staffId ve staffName kolonlarını her zaman ekle (NOT NULL constraint hatası önlemek için)
      // Domain'den gelen siparişlerde staff bilgisi yok, bu yüzden default değerler kullan
      if (columnNames.includes('staffId')) {
        columns.push('staffId');
        values.push('system'); // Domain'den gelen siparişler için sistem kullanıcısı
        console.log('✅ staffId kolonu eklendi, değer: "system"');
      } else {
        console.warn('⚠️ staffId kolonu tabloda yok, atlanıyor');
      }
      
      if (columnNames.includes('staffName')) {
        columns.push('staffName');
        values.push('Domain Siparişi'); // Domain'den gelen siparişler için
        console.log('✅ staffName kolonu eklendi, değer: "Domain Siparişi"');
      } else {
        console.warn('⚠️ staffName kolonu tabloda yok, atlanıyor');
      }
      
      if (columnNames.includes('tableId')) {
        columns.push('tableId');
        values.push(tableId || null);
        console.log('✅ tableId kolonu eklendi, değer:', tableId || null);
      } else {
        console.warn('⚠️ tableId kolonu tabloda yok, atlanıyor');
      }
      
      columns.push('items', 'totalAmount', 'paymentMethod', 'status', 'createdAt');
      values.push(
        JSON.stringify(items),
        parseFloat(totalAmount) || 0,
        'cash',
        'unpaid', // Sipariş kabul edildi, ödeme bekliyor
        new Date().toISOString()
      );
      
      if (columnNames.includes('source')) {
        columns.push('source');
        values.push('domain');
      }
      
      const placeholders = columns.map(() => '?').join(', ');
      const query = `INSERT INTO orders (${columns.join(', ')}) VALUES (${placeholders})`;
      
      console.log('📝 SQL Query:', query);
      console.log('📝 Values:', values);
      console.log('📝 Values length:', values.length);
      console.log('📝 Columns length:', columns.length);
      
      // Values ve columns sayısının eşit olduğundan emin ol
      if (values.length !== columns.length) {
        throw new Error(`Values ve columns sayısı eşleşmiyor! Values: ${values.length}, Columns: ${columns.length}`);
      }
      
      const stmt = db.prepare(query);
      stmt.run(...values);
      console.log('✅ SQL sorgusu başarıyla çalıştırıldı');
      
      // Firestore'da durumu güncelle
      await saveOrderToSQLite(orderData);
      
      console.log(`✅ Firestore siparişi SQLite'a kaydedildi: ${id}`);
      return { success: true, id };
    } catch (error) {
      console.error('❌ Firestore sipariş kaydetme hatası:', error);
      console.error('   Error code:', error.code);
      console.error('   Error message:', error.message);
      console.error('   Error stack:', error.stack);
      
      // Eğer NOT NULL constraint hatası varsa, daha detaylı bilgi ver
      if (error.message.includes('NOT NULL constraint')) {
        console.error('⚠️ NOT NULL constraint hatası tespit edildi!');
        console.error('   Muhtemelen staffId veya staffName kolonları NULL olamaz.');
        console.error('   Tablo yapısını kontrol edin ve kolonları NULLABLE yapın.');
      }
      
      return { success: false, error: error.message };
    }
  });

  // Settings operations
  ipcMain.handle('db:getSettings', async () => {
    try {
      const stmt = db.prepare('SELECT key, value FROM settings');
      const rows = stmt.all();
      
      const settings = {};
      rows.forEach(row => {
        try {
          settings[row.key] = JSON.parse(row.value);
        } catch (e) {
          settings[row.key] = row.value;
        }
      });
      
      return settings;
    } catch (error) {
      console.error('❌ db:getSettings hatası:', error);
      return null;
    }
  });

  ipcMain.handle('db:saveSettings', async (event, settings) => {
    try {
      const updateStmt = db.prepare('INSERT OR REPLACE INTO settings (key, value, updatedAt) VALUES (?, ?, ?)');
      const now = new Date().toISOString();
      
      Object.keys(settings).forEach(key => {
        const value = typeof settings[key] === 'object' ? JSON.stringify(settings[key]) : String(settings[key]);
        updateStmt.run(key, value, now);
      });
      
      console.log('✅ Ayarlar kaydedildi:', Object.keys(settings));
      return { success: true };
    } catch (error) {
      console.error('❌ db:saveSettings hatası:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('db:getProductSales', async (event, startDate, endDate, category) => {
    let query = "SELECT * FROM orders WHERE status = 'completed'";
    const params = [];
    if (startDate) { query += ' AND createdAt >= ?'; params.push(startDate); }
    if (endDate) { query += ' AND createdAt <= ?'; params.push(endDate); }
    query += ' ORDER BY createdAt DESC';
    
    const stmt = db.prepare(query);
    const orders = params.length > 0 ? stmt.all(...params) : stmt.all();
    const ordersParsed = orders.map(o => ({ ...o, items: JSON.parse(o.items) }));
    
    const salesList = [];
    ordersParsed.forEach(order => {
      const orderDate = new Date(order.createdAt);
      const timeStr = orderDate.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
      const dateStr = orderDate.toLocaleDateString('tr-TR');
      
      order.items.forEach(item => {
        if (category && item.category !== category) return;
        
        const itemTotal = parseFloat(item.unitPrice || 0) * (item.quantity || 1);
        
        salesList.push({
          id: `${order.id}-${item.menuItemId || item.id}`,
          orderId: order.id,
          orderNumber: order.orderNumber,
          staffId: order.staffId,
          staffName: order.staffName,
          menuItemId: item.menuItemId || item.id,
          menuItemName: item.menuItemName || item.name,
          category: item.category,
          quantity: item.quantity || 1,
          unitPrice: parseFloat(item.unitPrice || 0),
          totalPrice: itemTotal,
          paymentMethod: order.paymentMethod || 'cash',
          createdAt: order.createdAt,
          date: dateStr,
          time: timeStr
        });
      });
    });
    
    salesList.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return salesList;
  });
}

// App lifecycle
app.whenReady().then(() => {
  console.log('🚀 Electron başlatılıyor...');
  
  // Önce veritabanını başlat
  try {
    initDatabase();
    console.log('✅ Veritabanı başlatıldı');
  } catch (error) {
    console.error('❌ Veritabanı başlatma hatası:', error);
    const { dialog } = require('electron');
    dialog.showErrorBox('Veritabanı Hatası', `Veritabanı başlatılamadı: ${error.message}\n\nLütfen konsolu kontrol edin.`);
  }
  
  // Firebase'i başlat
  try {
    initializeFirebase();
    console.log('✅ Firebase başlatma tamamlandı');
    
    // Firebase başlatıldıktan sonra sipariş dinlemeyi başlat (eğer pencere hazırsa)
    setTimeout(() => {
      if (mainWindow && !mainWindow.isDestroyed() && isFirebaseInitialized()) {
        console.log('🚀 Firebase başlatıldı, sipariş dinleme başlatılıyor...');
        startOrderListener(mainWindow);
        startWaiterCallsListener(mainWindow);
      } else {
        console.log('⏳ Pencere hazır değil veya Firebase başlatılmamış, bekleniyor...');
      }
    }, 2000);
  } catch (error) {
    console.error('❌ Firebase başlatma hatası:', error);
  }
  
  // IPC'yi kur
  try {
    setupIPC();
    console.log('✅ IPC handlers kuruldu');
  } catch (error) {
    console.error('❌ IPC kurulum hatası:', error);
  }
  
  // Pencereyi oluştur
  try {
    createWindow();
    console.log('✅ Pencere oluşturuldu');
  } catch (error) {
    console.error('❌ Pencere oluşturma hatası:', error);
    const { dialog } = require('electron');
    dialog.showErrorBox('Pencere Hatası', `Pencere oluşturulamadı: ${error.message}`);
    app.quit();
    return;
  }
  
  // API Server'ı başlat
  try {
    startAPIServer();
  } catch (error) {
    console.error('❌ API Server başlatma hatası:', error);
  }

  console.log('✅ Electron başarıyla başlatıldı!');

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Unhandled errors
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  console.error('   Stack:', error.stack);
  
  // EPIPE hatası genellikle IPC bağlantısı kesildiğinde oluşur, kritik değil
  if (error.code === 'EPIPE' || error.message.includes('EPIPE')) {
    console.warn('⚠️ EPIPE hatası - IPC bağlantı hatası, normal olabilir');
    return;
  }
  
  // Sadece kritik hataları göster
  if (error.message && !error.message.includes('EPIPE')) {
    try {
      const { dialog } = require('electron');
      dialog.showErrorBox('Hata', `Beklenmeyen hata: ${error.message}`);
    } catch (e) {
      // Dialog gösterilemezse sadece log
      console.error('Dialog gösterilemedi:', e);
    }
  }
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection:', reason);
  if (reason && typeof reason === 'object' && reason.code !== 'EPIPE') {
    console.error('   Reason:', reason.message || reason);
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    if (db) {
      db.close();
      db = null;
    }
    app.quit();
  }
});

app.on('before-quit', () => {
  stopAPIServer();
  if (db) {
    db.close();
    db = null;
  }
});

// HTTP API Server for domain menu (apiServer already declared at line 201)

function startAPIServer() {
  if (apiServer) {
    console.log('⚠️ API server zaten çalışıyor');
    return;
  }
  
  const api = express();
  api.use(cors());
  api.use(express.json());
  
  // Menu items endpoint
  api.get('/api/menu-items', (req, res) => {
    try {
      if (!db) {
        return res.status(500).json({ success: false, error: 'Database not initialized' });
      }
      
      const category = req.query.category || null;
      const includeInactive = req.query.includeInactive === 'true';
      
      let query = 'SELECT * FROM menu_items WHERE 1=1';
      const params = [];
      
      if (!includeInactive) {
        query += ' AND isActive = 1';
      }
      
      if (category) {
        query += ' AND category = ?';
        params.push(category);
      }
      
      query += ' ORDER BY category, name';
      const stmt = db.prepare(query);
      const rows = params.length > 0 ? stmt.all(...params) : stmt.all();
      
      const items = rows.map(r => ({
        ...r,
        variants: r.variants ? JSON.parse(r.variants) : []
      }));
      
      res.json({ success: true, items });
    } catch (error) {
      console.error('API Error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
  
  // Health check
  api.get('/api/health', (req, res) => {
    res.json({ success: true, message: 'API is running' });
  });
  
  // Start server on port 3001
  apiServer = api.listen(3001, () => {
    console.log('🌐 API Server started on http://localhost:3001');
  });
}

function stopAPIServer() {
  if (apiServer) {
    apiServer.close();
    apiServer = null;
    console.log('🛑 API Server stopped');
  }
}

