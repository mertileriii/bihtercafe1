// Firestore'dan garson çağrılarını dinleme modülü
const { listenToWaiterCalls } = require('./firestore-sync');

let waiterCallsUnsubscribe = null;
let mainWindowRef = null;

function startListeningToWaiterCalls(mainWindow) {
  mainWindowRef = mainWindow;
  
  console.log('🚀 startListeningToWaiterCalls çağrıldı');
  console.log('   mainWindow:', mainWindow ? 'Mevcut' : 'Yok');
  
  if (waiterCallsUnsubscribe) {
    console.log('⚠️ Garson çağrısı dinleme zaten aktif, önceki dinleyiciyi kapatılıyor...');
    waiterCallsUnsubscribe();
    waiterCallsUnsubscribe = null;
  }
  
  console.log('👂 Firestore\'dan garson çağrıları dinleniyor...');
  
  waiterCallsUnsubscribe = listenToWaiterCalls((waiterCalls) => {
    console.log(`🔔 ${waiterCalls.length} bekleyen garson çağrısı alındı (callback çalıştı)`);
    console.log('   Waiter Calls:', waiterCalls.map(w => ({ id: w.id, tableId: w.tableId, status: w.status })));
    
    // Renderer process'e gönder
    if (mainWindowRef && !mainWindowRef.isDestroyed()) {
      console.log('📤 Renderer process\'e gönderiliyor: new-waiter-calls event');
      mainWindowRef.webContents.send('new-waiter-calls', waiterCalls);
      console.log('✅ IPC mesajı gönderildi');
    } else {
      console.warn('⚠️ mainWindow yok veya yok edilmiş, mesaj gönderilemedi');
    }
  });
  
  if (!waiterCallsUnsubscribe) {
    console.warn('⚠️ Garson çağrısı dinleme başlatılamadı (Firebase başlatılmamış olabilir)');
    console.warn('   5 saniye sonra tekrar denenecek...');
    // 5 saniye sonra tekrar dene
    setTimeout(() => {
      console.log('🔄 Garson çağrısı dinleme tekrar deneniyor...');
      startListeningToWaiterCalls(mainWindowRef);
    }, 5000);
  } else {
    console.log('✅ Garson çağrısı dinleme başlatıldı, unsubscribe fonksiyonu alındı');
  }
}

function stopListeningToWaiterCalls() {
  if (waiterCallsUnsubscribe) {
    waiterCallsUnsubscribe();
    waiterCallsUnsubscribe = null;
    console.log('🛑 Garson çağrısı dinleme durduruldu');
  }
}

module.exports = {
  startListeningToWaiterCalls,
  stopListeningToWaiterCalls
};

