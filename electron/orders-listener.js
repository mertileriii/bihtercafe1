// Firestore'dan sipariş dinleme modülü
const { listenToOrders } = require('./firestore-sync');

let ordersUnsubscribe = null;
let mainWindowRef = null;

function startListeningToOrders(mainWindow) {
  mainWindowRef = mainWindow;
  
  console.log('🚀 startListeningToOrders çağrıldı');
  console.log('   mainWindow:', mainWindow ? 'Mevcut' : 'Yok');
  
  if (ordersUnsubscribe) {
    console.log('⚠️ Sipariş dinleme zaten aktif, önceki dinleyiciyi kapatılıyor...');
    ordersUnsubscribe();
    ordersUnsubscribe = null;
  }
  
  console.log('👂 Firestore\'dan siparişler dinleniyor...');
  
  ordersUnsubscribe = listenToOrders((orders) => {
    console.log(`📦 ${orders.length} bekleyen sipariş alındı (callback çalıştı)`);
    console.log('   Orders:', orders.map(o => ({ id: o.id, tableId: o.tableId, totalAmount: o.totalAmount })));
    
    // Renderer process'e gönder
    if (mainWindowRef && !mainWindowRef.isDestroyed()) {
      console.log('📤 Renderer process\'e gönderiliyor: new-orders event');
      mainWindowRef.webContents.send('new-orders', orders);
      console.log('✅ IPC mesajı gönderildi');
    } else {
      console.warn('⚠️ mainWindow yok veya yok edilmiş, mesaj gönderilemedi');
    }
  });
  
  if (!ordersUnsubscribe) {
    console.warn('⚠️ Sipariş dinleme başlatılamadı (Firebase başlatılmamış olabilir)');
    console.warn('   5 saniye sonra tekrar denenecek...');
    // 5 saniye sonra tekrar dene
    setTimeout(() => {
      console.log('🔄 Sipariş dinleme tekrar deneniyor...');
      startListeningToOrders(mainWindowRef);
    }, 5000);
  } else {
    console.log('✅ Sipariş dinleme başlatıldı, unsubscribe fonksiyonu alındı');
  }
}

function stopListeningToOrders() {
  if (ordersUnsubscribe) {
    ordersUnsubscribe();
    ordersUnsubscribe = null;
    console.log('🛑 Sipariş dinleme durduruldu');
  }
}

module.exports = {
  startListeningToOrders,
  stopListeningToOrders
};

