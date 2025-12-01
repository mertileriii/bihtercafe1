// Electron Preload Script - IPC Bridge
const { contextBridge, ipcRenderer } = require('electron');

console.log('📦 Preload script yüklendi');

// IPC API'sini renderer process'e expose et
try {
  contextBridge.exposeInMainWorld('electronAPI', {
  // Staff operations
  dbGetStaff: (email, password) => ipcRenderer.invoke('db:getStaff', email, password),
  dbGetAllStaff: () => ipcRenderer.invoke('db:getAllStaff'),
  dbCreateStaff: (staffData) => ipcRenderer.invoke('db:createStaff', staffData),
  dbUpdateStaff: (id, updates) => ipcRenderer.invoke('db:updateStaff', id, updates),
  dbDeleteStaff: (id) => ipcRenderer.invoke('db:deleteStaff', id),
  
  // Menu items operations
  dbGetMenuItems: (category, includeInactive) => ipcRenderer.invoke('db:getMenuItems', category, includeInactive),
  dbCreateMenuItem: (itemData) => ipcRenderer.invoke('db:createMenuItem', itemData),
  dbUpdateMenuItem: (id, updates) => ipcRenderer.invoke('db:updateMenuItem', id, updates),
  dbDeleteMenuItem: (id) => ipcRenderer.invoke('db:deleteMenuItem', id),
  
  // Orders operations
  dbGetOrders: (filters) => ipcRenderer.invoke('db:getOrders', filters),
  dbCreateOrder: (orderData) => ipcRenderer.invoke('db:createOrder', orderData),
  dbUpdateOrder: (orderId, updates) => ipcRenderer.invoke('db:updateOrder', orderId, updates),
  dbUpdateMultipleOrders: (orderIds, updates) => ipcRenderer.invoke('db:updateMultipleOrders', orderIds, updates),
  dbClearOrders: () => ipcRenderer.invoke('db:clearOrders'),
  
  // Reports
  dbGetRevenue: (period, startDate, endDate) => ipcRenderer.invoke('db:getRevenue', period, startDate, endDate),
  dbGetStaffSales: (startDate, endDate, staffId) => ipcRenderer.invoke('db:getStaffSales', startDate, endDate, staffId),
  dbGetProductSales: (startDate, endDate, category) => ipcRenderer.invoke('db:getProductSales', startDate, endDate, category),
  
  // Firestore orders
  dbSaveFirestoreOrder: (orderData) => ipcRenderer.invoke('db:saveFirestoreOrder', orderData),
  dbGetPendingOrders: () => ipcRenderer.invoke('db:getPendingOrders'),
  
  // Settings operations
  dbGetSettings: () => ipcRenderer.invoke('db:getSettings'),
  dbSaveSettings: (settings) => ipcRenderer.invoke('db:saveSettings', settings),
  
  // Real-time order notifications
  onNewOrders: (callback) => {
    ipcRenderer.on('new-orders', (event, orders) => callback(orders));
    return () => ipcRenderer.removeAllListeners('new-orders');
  },
  
  // Real-time waiter call notifications
  onNewWaiterCalls: (callback) => {
    ipcRenderer.on('new-waiter-calls', (event, waiterCalls) => callback(waiterCalls));
    return () => ipcRenderer.removeAllListeners('new-waiter-calls');
  },
  
  // Update waiter call status in Firestore
  dbUpdateWaiterCall: (callId, updates) => ipcRenderer.invoke('db:updateWaiterCall', callId, updates),
  
    // Platform info
    platform: process.platform,
    isElectron: true
  });
  console.log('✅ Electron API expose edildi');
} catch (error) {
  console.error('❌ API expose hatası:', error);
}

