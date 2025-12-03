// Firestore Sync Module - Electron Main Process
// Bu modül SQLite'dan Firestore'a senkronizasyon yapar

const admin = require('firebase-admin');

let firestoreDb = null;
let isFirebaseInitialized = false;

// Firebase'i başlat (Service Account Key ile)
function initializeFirebase() {
  if (isFirebaseInitialized) {
    console.log('ℹ️ Firebase zaten başlatılmış');
    return;
  }
  
  try {
    console.log('🔥 Firebase başlatılıyor...');
    
    // Firebase Admin SDK'yı initialize et
    // NOT: Service Account Key dosyasını proje root'unda 'firebase-service-account.json' olarak kaydedin
    const path = require('path');
    const fs = require('fs');
    const serviceAccountPath = path.join(__dirname, '..', 'firebase-service-account.json');
    
    console.log('📂 Service Account Key yolu:', serviceAccountPath);
    
    if (!fs.existsSync(serviceAccountPath)) {
      console.warn('⚠️ Firebase Service Account Key bulunamadı:', serviceAccountPath);
      console.warn('   Firebase Console\'dan service account key indirip firebase-service-account.json olarak kaydedin.');
      console.warn('   Dosya yolu: /Users/mert/Desktop/bihter1/firebase-service-account.json');
      return;
    }
    
    console.log('✅ Service Account Key dosyası bulundu');
    
    const serviceAccount = require(serviceAccountPath);
    console.log('✅ Service Account Key yüklendi, project_id:', serviceAccount.project_id);
    
    // Firebase Admin SDK'yı başlat
    try {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: serviceAccount.project_id
      });
      console.log('✅ Firebase Admin SDK initialize edildi');
    } catch (initError) {
      // Eğer zaten initialize edilmişse, hata verme
      if (initError.code === 'app/already-initialized') {
        console.log('ℹ️ Firebase zaten initialize edilmiş, mevcut instance kullanılıyor');
        admin.app(); // Mevcut app'i al
      } else {
        throw initError;
      }
    }
    
    firestoreDb = admin.firestore();
    isFirebaseInitialized = true;
    console.log('✅ Firebase Firestore başlatıldı ve hazır');
  } catch (error) {
    console.error('❌ Firebase başlatma hatası:', error);
    console.error('   Hata detayı:', error.message);
    console.error('   Stack:', error.stack);
    console.warn('⚠️ Firestore senkronizasyonu devre dışı.');
    isFirebaseInitialized = false;
  }
}

// Menu item'ı Firestore'a ekle/güncelle
async function syncMenuItemToFirestore(item) {
  if (!isFirebaseInitialized || !firestoreDb) {
    console.warn('⚠️ Firebase başlatılmamış, Firestore\'a yazılmıyor');
    return;
  }
  
  try {
    const menuItemRef = firestoreDb.collection('menu_items').doc(item.id);
    
    // isActive değerini boolean olarak kaydet (Firestore'da tutarlılık için)
    const isActiveValue = item.isActive !== undefined ? (item.isActive === 1 || item.isActive === true) : true;
    
    // priceSmall ve priceLarge değerlerini de kaydet (Helvalar için)
    const firestoreData = {
      name: item.name,
      category: item.category,
      price: parseFloat(item.price) || 0,
      description: item.description || '',
      image: item.image || '',
      variants: item.variants || [],
      isActive: isActiveValue, // Boolean olarak kaydet
      createdAt: item.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // Helvalar için büyük/küçük fiyatları ekle
    if (item.priceSmall !== null && item.priceSmall !== undefined) {
      firestoreData.priceSmall = parseFloat(item.priceSmall);
    }
    if (item.priceLarge !== null && item.priceLarge !== undefined) {
      firestoreData.priceLarge = parseFloat(item.priceLarge);
    }
    
    await menuItemRef.set(firestoreData, { merge: true });
    
    const priceInfo = item.category === 'helvalar' 
      ? `priceSmall: ${firestoreData.priceSmall || 'N/A'}, priceLarge: ${firestoreData.priceLarge || 'N/A'}` 
      : `price: ${firestoreData.price}`;
    console.log(`✅ Menu item Firestore'a senkronize edildi: ${item.name} (isActive: ${isActiveValue}, category: ${item.category}, ${priceInfo})`);
  } catch (error) {
    console.error('❌ Firestore senkronizasyon hatası:', error);
  }
}

// Menu item'ı Firestore'dan sil
async function deleteMenuItemFromFirestore(itemId) {
  if (!isFirebaseInitialized || !firestoreDb) {
    console.warn('⚠️ Firebase başlatılmamış, Firestore\'dan silinmiyor');
    return;
  }
  
  try {
    await firestoreDb.collection('menu_items').doc(itemId).delete();
    console.log(`✅ Menu item Firestore'dan silindi: ${itemId}`);
  } catch (error) {
    console.error('❌ Firestore silme hatası:', error);
  }
}

// Firestore'dan siparişleri dinle ve callback ile renderer process'e gönder
function listenToOrders(callback) {
  console.log('🔍 listenToOrders çağrıldı');
  console.log('   isFirebaseInitialized:', isFirebaseInitialized);
  console.log('   firestoreDb:', firestoreDb ? 'Mevcut' : 'Yok');
  
  if (!isFirebaseInitialized || !firestoreDb) {
    console.warn('⚠️ Firebase başlatılmamış, sipariş dinlenemiyor');
    console.warn('   Firebase\'i başlatmayı deneyin...');
    return null;
  }
  
  try {
    console.log('👂 Firestore\'dan siparişler dinleniyor...');
    console.log('   Collection: orders');
    console.log('   Not: Tüm siparişler çekilip client-side\'da filtrelenecek (composite index gerektirmemek için)');
    
    // Composite index gerektirmemek için tüm siparişleri çek, client-side'da filtrele
    const ordersRef = firestoreDb.collection('orders');
    
    console.log('✅ Firestore query oluşturuldu, onSnapshot dinleniyor...');
    
    const unsubscribe = ordersRef.onSnapshot(
      (snapshot) => {
        console.log('🔄 Firestore snapshot güncellendi');
        console.log('   Document sayısı:', snapshot.size);
        if (snapshot.metadata) {
          console.log('   Has pending writes:', snapshot.metadata.hasPendingWrites);
        }
        
        // ÖNCE: Tüm siparişleri logla (debug için)
        console.log(`   📊 TOPLAM ${snapshot.size} doküman bulundu (tüm status'ler)`);
        snapshot.forEach((doc) => {
          const data = doc.data();
          const orderStatus = data.status || data.Status || 'undefined';
          console.log(`   📋 Doküman ${doc.id}: status="${orderStatus}", tableId=${data.tableId}, source=${data.source || 'unknown'}, deviceType=${data.deviceType || 'unknown'}`);
        });
        
        const orders = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          
          // Status kontrolü - hem string hem de undefined kontrolü yap
          const orderStatus = data.status || data.Status || null; // null yap, default 'pending' yapma
          const normalizedStatus = orderStatus ? String(orderStatus).toLowerCase().trim() : null;
          
          console.log(`   🔍 Doküman ${doc.id} kontrol ediliyor:`, {
            tableId: data.tableId,
            status: orderStatus,
            normalizedStatus: normalizedStatus,
            totalAmount: data.totalAmount,
            itemsCount: data.items ? data.items.length : 0,
            source: data.source || 'unknown',
            deviceType: data.deviceType || 'unknown',
            hasStatus: 'status' in data,
            allKeys: Object.keys(data).join(', ')
          });
          
          // Status null veya undefined ise uyar
          if (!orderStatus || normalizedStatus === null) {
            console.warn(`   ⚠️ Doküman ${doc.id} status'ü YOK veya NULL!`, {
              dataStatus: data.status,
              dataStatusType: typeof data.status,
              allDataKeys: Object.keys(data)
            });
          }
          
          // Sadece pending status'lu siparişleri al (case-insensitive)
          if (!normalizedStatus || normalizedStatus !== 'pending') {
            console.log(`   ⏭️ Doküman ${doc.id} atlandı (status: "${orderStatus}" -> "${normalizedStatus}" != "pending")`);
            return;
          }
          
          console.log(`   ✅ Doküman ${doc.id} kabul edildi (status: "pending"):`, {
            tableId: data.tableId,
            status: orderStatus,
            totalAmount: data.totalAmount,
            itemsCount: data.items ? data.items.length : 0,
            source: data.source || 'unknown',
            deviceType: data.deviceType || 'unknown'
          });
          
          // Firestore Timestamp'i JavaScript Date'e çevir
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
        });
        
        // Client-side'da tarihe göre sırala (en yeniler önce)
        orders.sort((a, b) => {
          const dateA = new Date(a.createdAt).getTime();
          const dateB = new Date(b.createdAt).getTime();
          return dateB - dateA;
        });
        
        console.log(`📦 ${orders.length} bekleyen sipariş bulundu ve callback çağrılıyor`);
        if (callback) {
          callback(orders);
        } else {
          console.warn('⚠️ Callback fonksiyonu tanımlı değil!');
        }
      },
      (error) => {
        console.error('❌ Sipariş dinleme hatası:', error);
        console.error('   Error code:', error.code);
        console.error('   Error message:', error.message);
        console.error('   Error stack:', error.stack);
        
        // Eğer composite index hatası varsa, tüm siparişleri çekip client-side'da filtrele
        if (error.code === 9 || error.message.includes('index')) {
          console.warn('⚠️ Composite index hatası, alternatif yöntem deneniyor...');
          const allOrdersRef = firestoreDb.collection('orders');
          allOrdersRef.onSnapshot((snapshot) => {
            const orders = [];
            snapshot.forEach((doc) => {
              const data = doc.data();
              
              // Status kontrolü - case-insensitive
              const orderStatus = data.status || data.Status || 'pending';
              const normalizedStatus = String(orderStatus).toLowerCase().trim();
              
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
            orders.sort((a, b) => {
              const dateA = new Date(a.createdAt).getTime();
              const dateB = new Date(b.createdAt).getTime();
              return dateB - dateA;
            });
            console.log(`📦 ${orders.length} bekleyen sipariş bulundu (alternatif yöntem)`);
            if (callback) callback(orders);
          });
        }
      }
    );
    
    console.log('✅ onSnapshot listener kuruldu');
    return unsubscribe;
  } catch (error) {
    console.error('❌ Sipariş dinleme başlatma hatası:', error);
    console.error('   Error details:', error.message);
    console.error('   Error stack:', error.stack);
    return null;
  }
}

// Siparişi SQLite'a kaydet ve Firestore'da durumu güncelle
async function saveOrderToSQLite(orderData) {
  if (!isFirebaseInitialized || !firestoreDb) {
    console.warn('⚠️ Firebase başlatılmamış, sipariş kaydedilemiyor');
    return null;
  }
  
  try {
    // Firestore'daki siparişi güncelle (status: 'received' yap)
    const orderRef = firestoreDb.collection('orders').doc(orderData.id);
    await orderRef.update({
      status: 'received',
      receivedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    console.log(`✅ Sipariş durumu güncellendi: ${orderData.id}`);
    return true;
  } catch (error) {
    console.error('❌ Sipariş kaydetme hatası:', error);
    return false;
  }
}

// Firestore'dan garson çağrılarını dinle
function listenToWaiterCalls(callback) {
  console.log('🔍 listenToWaiterCalls çağrıldı');
  console.log('   isFirebaseInitialized:', isFirebaseInitialized);
  console.log('   firestoreDb:', firestoreDb ? 'Mevcut' : 'Yok');
  
  if (!isFirebaseInitialized || !firestoreDb) {
    console.warn('⚠️ Firebase başlatılmamış, garson çağrıları dinlenemiyor');
    return null;
  }
  
  try {
    console.log('👂 Firestore\'dan garson çağrıları dinleniyor...');
    console.log('   Collection: waiter_calls');
    
    const waiterCallsRef = firestoreDb.collection('waiter_calls');
    
    const unsubscribe = waiterCallsRef.onSnapshot(
      (snapshot) => {
        console.log('🔄 Garson çağrısı snapshot güncellendi');
        console.log('   Document sayısı:', snapshot.size);
        console.log('   Has pending writes:', snapshot.metadata?.hasPendingWrites);
        
        const waiterCalls = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          console.log(`   📄 Doküman ${doc.id}:`, { tableId: data.tableId, status: data.status, createdAt: data.createdAt });
          
          // Sadece pending status'lu çağrıları al
          const callStatus = data.status || 'pending';
          console.log(`   🔍 Doküman ${doc.id} status kontrolü: "${callStatus}" === "pending"? ${callStatus === 'pending'}`);
          if (callStatus !== 'pending') {
            console.log(`   ⏭️ Doküman ${doc.id} atlandı (status: "${callStatus}")`);
            return;
          }
          
          // Firestore Timestamp'i JavaScript Date'e çevir
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
          
          waiterCalls.push({
            id: doc.id,
            ...data,
            createdAt: createdAtISO
          });
        });
        
        // Tarihe göre sırala (en yeniler önce)
        waiterCalls.sort((a, b) => {
          const dateA = new Date(a.createdAt).getTime();
          const dateB = new Date(b.createdAt).getTime();
          return dateB - dateA;
        });
        
        console.log(`🔔 ${waiterCalls.length} bekleyen garson çağrısı bulundu`);
        if (callback) {
          callback(waiterCalls);
        }
      },
      (error) => {
        console.error('❌ Garson çağrısı dinleme hatası:', error);
      }
    );
    
    console.log('✅ Garson çağrısı onSnapshot listener kuruldu');
    return unsubscribe;
  } catch (error) {
    console.error('❌ Garson çağrısı dinleme başlatma hatası:', error);
    return null;
  }
}

module.exports = {
  initializeFirebase,
  syncMenuItemToFirestore,
  deleteMenuItemFromFirestore,
  listenToOrders,
  listenToWaiterCalls,
  saveOrderToSQLite,
  getFirestoreDb: () => firestoreDb,
  isFirebaseInitialized: () => isFirebaseInitialized
};

