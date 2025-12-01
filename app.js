// Bihter Cafe - Digital Menu Application
// This file loads menu items from Firebase Firestore

// Promise mekanizması zaten HTML'de kurulmuş olmalı
// Eğer yoksa burada kur (fallback)
if (!window._appFunctionsReady) {
  window._appFunctionsLoaded = false;
  window._appFunctionsReady = new Promise((resolve) => {
    window._resolveAppFunctions = resolve;
  });
}

// Firebase SDK imports
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getFirestore, collection, query, where, getDocs, orderBy, onSnapshot, addDoc, Timestamp, getDoc, doc, updateDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyDPYTqcif1WDa9zcRRLelZpXisO8g2yE_o",
  authDomain: "bihtercafemenu.firebaseapp.com",
  projectId: "bihtercafemenu",
  storageBucket: "bihtercafemenu.firebasestorage.app",
  messagingSenderId: "71250936254",
  appId: "1:71250936254:web:d6a8cd7f7ea50d707f79ef",
  measurementId: "G-QG30KSSFT6"
};

// Initialize Firebase
let app, db;
try {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  console.log('✅ Firebase initialized successfully');
  console.log('✅ Firestore database connected, project:', firebaseConfig.projectId);
} catch (error) {
  console.error('❌ Firebase initialization error:', error);
  console.error('   Error details:', error.message);
}

// Application state
let appState = {
  currentView: 'welcome', // welcome, menu
  menuView: 'categories', // categories, products (kategoriler mi ürünler mi gösteriliyor)
  selectedCategory: null, // Seçili kategori
  tableId: new URLSearchParams(window.location.search).get('table') || 13,
  cart: [],
  menuItems: [],
  categories: {},
  lastWaiterCallTime: null // Son garson çağrısı zamanı (spam koruması için)
};

// Global scope'a ekle (inline script'lerden erişim için) - HEMEN
window.appState = appState;
console.log('✅ window.appState atandı:', typeof window.appState);

// Global fonksiyonlar - inline onclick için
window.navigateToMenu = function() {
  console.log('📖 navigateToMenu çağrıldı (global fonksiyon)!');
  try {
    // Masa numarasını URL'den al
    const urlParams = new URLSearchParams(window.location.search);
    const tableId = urlParams.get('table') || '13';
    
    // Menü sayfasına yönlendir
    console.log(`📖 menu.html sayfasına yönlendiriliyor (Masa: ${tableId})...`);
    window.location.href = `menu.html?table=${tableId}`;
  } catch (error) {
    console.error('❌ Yönlendirme hatası:', error);
    alert('Menü sayfasına yönlendirilemedi: ' + error.message);
  }
};


window.callWaiter = function() {
  console.log('🔔 callWaiter çağrıldı (global fonksiyon)!');
  console.log('📊 window.appFunctions:', window.appFunctions);
  console.log('📊 typeof window.appFunctions.callWaiter:', typeof window.appFunctions?.callWaiter);
  
  if (window.appFunctions && typeof window.appFunctions.callWaiter === 'function') {
    console.log('✅ window.appFunctions.callWaiter çağrılıyor...');
    window.appFunctions.callWaiter();
  } else {
    console.error('❌ window.appFunctions.callWaiter bulunamadı!');
    console.error('   window.appFunctions:', window.appFunctions);
    console.error('   Deneme: 2 saniye bekleyip tekrar denenecek...');
    
    // 2 saniye bekleyip tekrar dene
    setTimeout(() => {
      if (window.appFunctions && typeof window.appFunctions.callWaiter === 'function') {
        console.log('✅ window.appFunctions.callWaiter bulundu (gecikmeli), çağrılıyor...');
        window.appFunctions.callWaiter();
      } else {
        console.error('❌ Hala bulunamadı!');
        alert('Garson çağrılamadı. Lütfen sayfayı yenileyip tekrar deneyin.');
      }
    }, 2000);
  }
};

// App Functions exposed to window
window.appFunctions = {
  navigateToMenu: function() {
    console.log('📖 Menü sayfasına yönlendiriliyor...');
    try {
      // Masa numarasını URL'den al
      const urlParams = new URLSearchParams(window.location.search);
      const tableId = urlParams.get('table') || '13';
      
      // Menü sayfasına yönlendir
      console.log(`📖 menu.html sayfasına yönlendiriliyor (Masa: ${tableId})...`);
      window.location.href = `menu.html?table=${tableId}`;
    } catch (error) {
      console.error('❌ Yönlendirme hatası:', error);
      alert('Menü sayfasına yönlendirilemedi: ' + error.message);
    }
  },
  
  callWaiter: async function() {
    console.log('🔔 callWaiter fonksiyonu çağrıldı!');
    
    // Spam koruması: Son çağrıdan bu yana 30 saniye geçti mi kontrol et
    const WAITER_CALL_COOLDOWN = 30000; // 30 saniye
    const now = Date.now();
    
    if (appState.lastWaiterCallTime && (now - appState.lastWaiterCallTime) < WAITER_CALL_COOLDOWN) {
      const remainingSeconds = Math.ceil((WAITER_CALL_COOLDOWN - (now - appState.lastWaiterCallTime)) / 1000);
      console.log(`⏳ Spam koruması: ${remainingSeconds} saniye daha beklemelisiniz`);
      alert(`Zaten garson çağırdınız! Lütfen ${remainingSeconds} saniye bekleyin.`);
      return;
    }
    
    // Önce onay popup'ını göster
    const tableNumber = parseInt(appState.tableId) || parseInt(new URLSearchParams(window.location.search).get('table')) || 0;
    
    console.log('📊 Masa numarası:', tableNumber);
    console.log('📊 appState.tableId:', appState.tableId);
    console.log('📊 URL params:', new URLSearchParams(window.location.search).get('table'));
    
    if (!tableNumber || tableNumber === 0) {
      console.error('❌ Masa numarası bulunamadı. URL:', window.location.href);
      alert('Masa numarası bulunamadı!');
      return;
    }
    
    // Onay popup'ını göster
    console.log('✅ Onay popup\'ı gösteriliyor...');
    showWaiterConfirmPopup(tableNumber);
  },
  
  // Asıl garson çağırma işlemi (onaylandıktan sonra)
  confirmAndCallWaiter: async function(tableNumber) {
    try {
      if (!db) {
        console.error('❌ Firestore db objesi yok!');
        showMessage('Bağlantı hatası!', 'error');
        return;
      }
      
      console.log(`🔔 Masa ${tableNumber} garson çağırıyor...`);
      
      // Firestore'a garson çağrısı ekle
      const waiterCallData = {
        tableId: tableNumber,
        status: 'pending', // pending, answered
        createdAt: Timestamp.now(),
        answeredAt: null,
        source: 'domain'
      };
      
      console.log('📝 Garson çağrısı verisi:', waiterCallData);
      console.log('🔍 Firestore db kontrolü:', {
        dbExists: !!db,
        dbType: typeof db,
        collection: 'waiter_calls'
      });
      
      const waiterCallsRef = collection(db, 'waiter_calls');
      console.log('📂 waiter_calls collection referansı oluşturuldu');
      
      const docRef = await addDoc(waiterCallsRef, waiterCallData);
      console.log('✅ Garson çağrısı Firestore\'a kaydedildi:', docRef.id);
      
      // Spam koruması: Son çağrı zamanını kaydet
      appState.lastWaiterCallTime = Date.now();
      
      // Onay popup'ını kapat
      closeWaiterConfirmPopup();
      
      // Garson çağır başarı popup'ını göster
      setTimeout(() => {
        showWaiterCallPopup(tableNumber);
      }, 300);
    } catch (error) {
      console.error('❌ Garson çağırma hatası:', error);
      console.error('   Hata detayları:', {
        name: error.name,
        message: error.message,
        code: error.code,
        stack: error.stack?.substring(0, 200)
      });
      
      if (error.code === 'permission-denied' || error.message?.includes('permission')) {
        console.error('🔒 İZİN HATASI: Firestore Security Rules kontrol edin!');
        console.error('   Rules dosyası: firestore.rules');
        console.error('   Collection: waiter_calls');
        showMessage('İzin hatası! Lütfen Firebase Console\'dan Firestore Rules\'ı kontrol edin.', 'error');
      } else {
        showMessage('Garson çağırılamadı. Lütfen tekrar deneyin.', 'error');
      }
      
      // Hata durumunda onay popup'ını kapat
      closeWaiterConfirmPopup();
    }
  },
  
  openCartModal: function() {
    if (appState.cart.length === 0) {
      showMessage('Sepetiniz boş!', 'warning');
      return;
    }
    const modal = document.getElementById('cart-modal');
    modal.classList.remove('hidden');
    modal.classList.add('opacity-100');
    renderCart();
  },
  
  closeCartModal: function() {
    const modal = document.getElementById('cart-modal');
    modal.classList.add('hidden');
    modal.classList.remove('opacity-100');
  },
  
  placeOrder: async function() {
    console.log('🔴 placeOrder fonksiyonu çağrıldı!');
    console.log('   Sepet uzunluğu:', appState.cart.length);
    console.log('   Sepet içeriği:', appState.cart);
    
    if (appState.cart.length === 0) {
      console.warn('⚠️ Sepet boş, sipariş gönderilemiyor!');
      showMessage('Sepetiniz boş!', 'warning');
      return;
    }
    
    console.log('✅ Sepet dolu, sipariş gönderiliyor...');
    
    try {
      const total = appState.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const tableNumber = parseInt(appState.tableId) || 0;
      
      // Device info for debugging
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const deviceInfo = isMobile ? 'Mobile' : 'Desktop';
      
      console.log(`📤 [${deviceInfo}] Sipariş gönderiliyor...`, {
        table: tableNumber,
        items: appState.cart.length,
        total: total,
        userAgent: navigator.userAgent.substring(0, 50)
      });
      
      // Firestore'a sipariş ekle
      if (!db) {
        console.error('❌ Firestore db objesi yok!');
        throw new Error('Firestore bağlantısı yok!');
      }
      
      const orderData = {
        orderNumber: `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`,
        tableId: tableNumber,
        items: appState.cart.map(item => ({
          menuItemId: item.id,
          menuItemName: item.name,
          quantity: item.quantity,
          unitPrice: parseFloat(item.price) || 0,
          totalPrice: (parseFloat(item.price) || 0) * item.quantity
        })),
        totalAmount: parseFloat(total),
        paymentMethod: 'pending', // Müşteri henüz ödeme yapmadı
        status: 'pending', // Beklemede - ÖNEMLİ: Bu değer Electron tarafında filtreleniyor
        createdAt: Timestamp.now(),
        source: 'domain', // Domain'den geldiğini belirt
        deviceType: deviceInfo // Debug için
      };
      
      // Status'ün doğru olduğundan emin ol
      if (orderData.status !== 'pending') {
        console.error(`❌ [${deviceInfo}] HATA: Status 'pending' değil! Status:`, orderData.status);
        orderData.status = 'pending'; // Zorla 'pending' yap
      }
      
      console.log(`📝 [${deviceInfo}] Sipariş verisi hazırlandı:`, {
        orderNumber: orderData.orderNumber,
        tableId: orderData.tableId,
        status: orderData.status,
        statusType: typeof orderData.status,
        totalAmount: orderData.totalAmount,
        itemsCount: orderData.items.length,
        allKeys: Object.keys(orderData).join(', ')
      });
      
      const ordersRef = collection(db, 'orders');
      console.log(`💾 [${deviceInfo}] Firestore'a yazılıyor...`);
      
      const docRef = await addDoc(ordersRef, orderData);
      
      console.log(`✅ [${deviceInfo}] Sipariş Firestore'a kaydedildi!`, {
        documentId: docRef.id,
        orderNumber: orderData.orderNumber,
        status: orderData.status,
        tableId: orderData.tableId
      });
      
      // Yazılan dokümanı tekrar okuyarak doğrula
      setTimeout(async () => {
        try {
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const savedData = docSnap.data();
            console.log(`✅ [${deviceInfo}] Sipariş doğrulandı (Firestore'dan okundu):`, {
              id: docSnap.id,
              status: savedData.status,
              statusType: typeof savedData.status,
              tableId: savedData.tableId,
              totalAmount: savedData.totalAmount,
              source: savedData.source || 'unknown',
              deviceType: savedData.deviceType || 'unknown',
              allKeys: Object.keys(savedData).join(', ')
            });
            
            if (savedData.status !== 'pending') {
              console.warn(`⚠️ [${deviceInfo}] UYARI: Sipariş status'ü 'pending' değil!`, {
                expected: 'pending',
                actual: savedData.status,
                actualType: typeof savedData.status,
                hasStatus: 'status' in savedData
              });
              
              // Status'ü düzelt
              try {
                console.log(`🔧 [${deviceInfo}] Status düzeltiliyor...`);
                const orderRef = doc(docRef);
                await updateDoc(orderRef, { status: 'pending' });
                console.log(`✅ [${deviceInfo}] Status 'pending' olarak güncellendi`);
              } catch (fixError) {
                console.error(`❌ [${deviceInfo}] Status düzeltme hatası:`, fixError);
              }
            } else {
              console.log(`✅ [${deviceInfo}] Status doğru: 'pending'`);
            }
          } else {
            console.error(`❌ [${deviceInfo}] Sipariş Firestore'da bulunamadı!`);
          }
        } catch (verifyError) {
          console.error(`❌ [${deviceInfo}] Sipariş doğrulama hatası:`, verifyError);
        }
      }, 2000);
      
      // Sipariş başarı popup'ını göster
      const tableNumberForPopup = tableNumber || appState.tableId || new URLSearchParams(window.location.search).get('table') || '?';
      showOrderSuccessPopup(tableNumberForPopup);
      
      // Clear cart
      appState.cart = [];
      updateCartUI();
      window.appFunctions.closeCartModal();
    } catch (error) {
      console.error('❌ Sipariş gönderme hatası:', error);
      console.error('   Error code:', error.code);
      console.error('   Error message:', error.message);
      console.error('   Error stack:', error.stack);
      showMessage('Sipariş gönderilemedi. Lütfen tekrar deneyin.', 'error');
    }
  },
  
  addToCart: function(itemId, size = null) {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const deviceInfo = isMobile ? 'Mobile' : 'Desktop';
    console.log(`🛒 [${deviceInfo}] Sepete ekleme başladı:`, itemId, size ? `(Boyut: ${size})` : '');
    console.log(`   Mevcut sepetteki ürün sayısı:`, appState.cart.length);
    
    const item = appState.menuItems.find(i => i.id === itemId);
    if (!item) {
      console.error(`❌ [${deviceInfo}] Ürün bulunamadı! itemId:`, itemId);
      return;
    }
    
    // Helvalar için boyut fiyatını belirle
    let price = parseFloat(item.price) || 0;
    let displayName = item.name || 'İsimsiz';
    
    if (item.category === 'helvalar' && size) {
      if (size === 'small') {
        // Küçük boyut için priceSmall varsa onu kullan, yoksa normal fiyatı kullan
        if (item.priceSmall !== null && item.priceSmall !== undefined && parseFloat(item.priceSmall) > 0) {
          price = parseFloat(item.priceSmall);
        } else {
          price = parseFloat(item.price) || 0;
        }
        displayName = `${item.name} (Küçük)`;
      } else if (size === 'large') {
        // Büyük boyut için priceLarge varsa onu kullan, yoksa normal fiyatı kullan
        if (item.priceLarge !== null && item.priceLarge !== undefined && parseFloat(item.priceLarge) > 0) {
          price = parseFloat(item.priceLarge);
        } else {
          price = parseFloat(item.price) || 0;
        }
        displayName = `${item.name} (Büyük)`;
      }
    }
    
    console.log(`   Ürün bulundu:`, displayName, `Fiyat:`, price, `Boyut:`, size);
    
    // Sepette aynı ürün ve boyut var mı kontrol et
    const cartItemId = size ? `${itemId}-${size}` : itemId;
    const existing = appState.cart.find(i => i.cartItemId === cartItemId || (!i.size && !size && i.id === itemId));
    
    if (existing) {
      existing.quantity += 1;
      console.log(`   Mevcut ürün miktarı artırıldı:`, existing.quantity);
    } else {
      appState.cart.push({
        cartItemId: cartItemId,
        id: item.id,
        name: displayName,
        originalName: item.name,
        price: price,
        quantity: 1,
        size: size || null
      });
      console.log(`   Yeni ürün sepete eklendi. Toplam sepet ürün sayısı:`, appState.cart.length);
    }
    
    updateCartUI();
    console.log(`✅ [${deviceInfo}] Sepet güncellendi, toplam:`, appState.cart.reduce((sum, i) => sum + (i.price * i.quantity), 0));
    // Zarif toast bildirimi göster
    showToast(`${displayName} sepete eklendi!`, 'success');
  },
  
  removeFromCart: function(itemId) {
    appState.cart = appState.cart.filter(i => i.id !== itemId);
    updateCartUI();
    renderCart();
  },
  
  updateCartQuantity: function(itemId, delta) {
    const item = appState.cart.find(i => i.id === itemId);
    if (!item) return;
    
    item.quantity += delta;
    if (item.quantity <= 0) {
      appState.cart = appState.cart.filter(i => i.id !== itemId);
    }
    
    updateCartUI();
    renderCart();
  },
  
  selectCategory: function(categoryKey) {
    console.log(`📁 Kategori seçildi: ${categoryKey}`);
    appState.menuView = 'products';
    appState.selectedCategory = categoryKey;
    renderMenu();
  },
  
  showCategories: function() {
    console.log('📁 Kategorilere dönülüyor...');
    appState.menuView = 'categories';
    appState.selectedCategory = null;
    renderMenu();
  }
};

// Load menu items from Firestore
async function loadMenu() {
  // HEMEN window'a ekle (modül yüklenir yüklenmez)
  if (!window.loadMenu) {
    window.loadMenu = loadMenu;
    console.log('✅ window.loadMenu atandı (fonksiyon içinde)');
  }
  // appState kontrolü - eğer menu değilse menu yap
  if (!appState || appState.currentView !== 'menu') {
    if (appState) {
      console.log(`⏸️ Menü görünümü aktif değil (${appState.currentView}), 'menu' olarak ayarlanıyor...`);
      appState.currentView = 'menu';
    } else {
      console.log('⚠️ appState yok, varsayılan olarak menü görünümüne geçiliyor...');
      if (window.appState) {
        window.appState.currentView = 'menu';
      }
    }
  }
  
  console.log('📥 Menü yükleniyor, appState.currentView:', appState ? appState.currentView : 'N/A');
  
  // Firebase db kontrolü
  if (!db) {
    const errorMsg = `Firebase DB Hatası:\n\nFirestore bağlantısı kurulamadı!\n\nApp: ${app ? 'Var' : 'Yok'}\nDB: Yok\n\nLütfen sayfayı yenileyin.`;
    console.error('❌ Firestore db objesi yok! Firebase başlatılmamış olabilir.');
    console.error('   Firebase init durumu:', { app, db });
    alert(errorMsg); // Mobil debug için
    showMessage('Firebase bağlantı hatası! Lütfen sayfayı yenileyin.', 'error');
    return;
  }
  
  try {
    let loadingIndicator = document.getElementById('loading-indicator');
    if (loadingIndicator) {
      loadingIndicator.classList.remove('hidden');
    }
    console.log('📥 Firestore\'dan menü yükleniyor...');
    console.log('   db objesi:', db ? 'Mevcut' : 'Yok');
    
    // Get menu items from Firestore - Tüm verileri çek, index sorununu önlemek için
    const menuItemsRef = collection(db, 'menu_items');
    
    // Index gerektirmemek için tüm verileri çek, sonra client-side filtrele
    console.log('🔍 Firestore query başlatılıyor...');
    const q = query(menuItemsRef);
    
    const snapshot = await getDocs(q);
    console.log(`📦 Firestore'dan ${snapshot.docs.length} doküman alındı`);
    
    if (snapshot.docs.length === 0) {
      console.warn('⚠️ Firestore\'da hiç ürün bulunamadı!');
      console.warn('   Firebase Console → Firestore Database → menu_items koleksiyonunu kontrol edin');
    }
    
    let items = snapshot.docs.map(doc => {
      const data = doc.data();
      console.log(`  📋 ${data.name || 'İsimsiz'} - isActive: ${data.isActive} (type: ${typeof data.isActive}), category: ${data.category || 'N/A'}, price: ${data.price || 0}, priceSmall: ${data.priceSmall || 'yok'}, priceLarge: ${data.priceLarge || 'yok'}`);
      return {
        id: doc.id,
        ...data,
        // Firestore'dan gelen priceSmall ve priceLarge değerlerini koru
        priceSmall: data.priceSmall !== undefined ? data.priceSmall : null,
        priceLarge: data.priceLarge !== undefined ? data.priceLarge : null
      };
    });
    
    // Filter active items (support both boolean and number)
    const beforeFilter = items.length;
    console.log(`🔍 Filtreleme öncesi: ${beforeFilter} ürün`);
    
    // GEÇICI: Tüm ürünleri göster (isActive kontrolünü kaldırdık - test için)
    // items = items.filter(item => {
    //   const isActive = item.isActive;
    //   const isItemActive = isActive === true || isActive === 1 || isActive === undefined;
    //   if (!isItemActive) {
    //     console.log(`  ❌ Filtrelendi (pasif): ${item.name} (isActive: ${isActive})`);
    //   }
    //   return isItemActive;
    // });
    
    // Tüm ürünleri göster (test için)
    console.log(`✅ ${items.length} ürün gösteriliyor (tümü)`);
    
    // Sort by category, then by name
    items.sort((a, b) => {
      if (a.category !== b.category) {
        return (a.category || '').localeCompare(b.category || '');
      }
      return (a.name || '').localeCompare(b.name || '');
    });
    
    appState.menuItems = items;
    console.log(`📦 ${items.length} ürün appState.menuItems'e atandı`);
    
    organizeCategories();
    console.log(`📁 Kategoriler organize edildi: ${Object.keys(appState.categories).length} kategori`);
    
    // MenuView'i ayarla - ilk açılışta kategorileri göster
    if (!appState.menuView || appState.menuView === '') {
      appState.menuView = 'categories';
      appState.selectedCategory = null;
      console.log('✅ menuView ayarlandı: categories (loadMenu içinde)');
    }
    
    // Menü container'ını görünür yap
    const menuContainer = document.getElementById('menu-view-container');
    if (menuContainer) {
      menuContainer.style.setProperty('display', 'block', 'important');
      menuContainer.style.setProperty('visibility', 'visible', 'important');
      menuContainer.classList.remove('hidden');
      console.log('✅ menu-view-container görünür hale getirildi');
    }
    
    console.log('🔍 renderMenu() çağrılmadan önce durum:', {
      menuView: appState.menuView,
      selectedCategory: appState.selectedCategory,
      categoriesCount: Object.keys(appState.categories).length,
      menuItemsCount: appState.menuItems.length
    });
    
    renderMenu();
    console.log(`✅ renderMenu() çağrıldı`);
    
    // loadingIndicator'ı tekrar kullan (yukarıda tanımlanmış)
    loadingIndicator = document.getElementById('loading-indicator');
    if (loadingIndicator) {
      loadingIndicator.classList.add('hidden');
    }
    
    console.log(`✅ Menü render edildi: ${items.length} ürün`);
    
    // Listen for real-time updates
    onSnapshot(q, (snapshot) => {
      console.log('🔄 Firestore güncellemesi alındı');
      let updatedItems = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Filter active items
      updatedItems = updatedItems.filter(item => {
        const isActive = item.isActive;
        return isActive === true || isActive === 1 || isActive === undefined;
      });
      
      // Sort by category, then by name
      updatedItems.sort((a, b) => {
        if (a.category !== b.category) {
          return (a.category || '').localeCompare(b.category || '');
        }
        return (a.name || '').localeCompare(b.name || '');
      });
      
      appState.menuItems = updatedItems;
      organizeCategories();
      renderMenu();
      console.log(`✅ Menü güncellendi: ${updatedItems.length} ürün`);
    });
    
  } catch (error) {
    console.error('❌ Menu load error:', error);
    console.error('   Error details:', error.message);
    console.error('   Error code:', error.code);
    console.error('   Stack:', error.stack);
    console.error('   Firebase db durumu:', { db: db ? 'Var' : 'Yok', app: app ? 'Var' : 'Yok' });
    
    // Mobil debug için alert göster
    const errorMsg = `Menü Yükleme Hatası:\n\n${error.message}\n\nKod: ${error.code || 'N/A'}\n\nDB: ${db ? 'Var' : 'Yok'}\nApp: ${app ? 'Var' : 'Yok'}`;
    alert(errorMsg);
    
    const loadingIndicator = document.getElementById('loading-indicator');
    if (loadingIndicator) {
      loadingIndicator.textContent = 'Menü yüklenemedi. Lütfen daha sonra tekrar deneyin.';
      loadingIndicator.classList.remove('hidden');
    }
    
    // Menü container'ı yine de görünür yap (hata mesajı göstermek için)
    const menuContainer = document.getElementById('menu-view-container');
    if (menuContainer) {
      menuContainer.style.setProperty('display', 'block', 'important');
      menuContainer.style.setProperty('visibility', 'visible', 'important');
      menuContainer.classList.remove('hidden');
    }
    
    // Boş menü göster
    const menuContainerElement = document.getElementById('menu-container');
    if (menuContainerElement) {
      menuContainerElement.innerHTML = `
        <div class="text-center text-gray-500 py-10">
          <p class="text-xl font-semibold mb-2">Menü yüklenemedi</p>
          <p class="text-sm">Lütfen sayfayı yenileyip tekrar deneyin.</p>
          <p class="text-xs mt-2 text-gray-400">Hata: ${error.message}</p>
          <p class="text-xs mt-1 text-gray-400">Kod: ${error.code || 'N/A'}</p>
        </div>
      `;
    }
    
    setTimeout(() => {
      showMessage('Menü yüklenemedi. Lütfen sayfayı yenileyip tekrar deneyin.', 'error');
    }, 1000);
  }
}

// Global scope'a loadMenu'yu hemen ekle (modül yüklenir yüklenmez)
window.loadMenu = loadMenu;

// Kategori key'ini okunabilir isme çevir (global fonksiyon)
function formatCategoryName(categoryKey) {
  // Önce statik mapping'e bak
  const staticNames = {
    'sicak-kahveler': 'Sıcak Kahveler',
    'soguk-kahveler': 'Soğuk Kahveler',
    'sicak-icecekler': 'Sıcak İçecekler',
    'soguk-icecekler': 'Soğuk İçecekler',
    'helvalar': 'Helvalar',
    'kahveler': 'Kahveler',
    'pastalar': 'Pastalar',
    'memleket-gazozlari': 'Memleket Gazozları',
    'memleket-gazozlar': 'Memleket Gazozlar',
    'bitki-caylari': 'Bitki Çayları',
    'bitki-caylar': 'Bitki Çaylar',
    'lezzet-kosesi': 'Lezzet Köşesi'
  };
  
  if (staticNames[categoryKey]) {
    return staticNames[categoryKey];
  }
  
  // Eğer statik mapping'de yoksa, key'i formatla
  // Önce key'i küçük harfe çevir, sonra Türkçe karakter dönüşümleri yap
  let lowerKey = categoryKey.toLowerCase();
  
  // Türkçe karakter dönüşümleri (küçük harfte, kelime bazlı)
  lowerKey = lowerKey
    // Çoğul kelimeler (uzun kelimeler önce)
    .replace(/gazozlari/g, 'gazozları')
    .replace(/gazozlar/g, 'gazozlar')
    .replace(/caylari/g, 'çayları')
    .replace(/caylar/g, 'çaylar')
    .replace(/icecekler/g, 'içecekler')
    .replace(/kahveler/g, 'kahveler')
    .replace(/helvalar/g, 'helvalar')
    .replace(/kosesi/g, 'köşesi')
    // Tekil kelimeler
    .replace(/memleket/g, 'memleket')
    .replace(/bitki/g, 'bitki')
    .replace(/lezzet/g, 'lezzet')
    .replace(/cay/g, 'çay')
    .replace(/soguk/g, 'soğuk')
    .replace(/sicak/g, 'sıcak');
  
  // Kelimeleri ayır ve her kelimenin ilk harfini büyük yap
  let formatted = lowerKey
    .split('-')
    .map(word => {
      // Kelimenin ilk harfini büyük yap
      if (word.length === 0) return word;
      // Türkçe karakterleri dikkate alarak ilk harfi büyüt
      const firstChar = word.charAt(0);
      const rest = word.slice(1);
      
      // Türkçe karakterler için özel büyütme
      const upperMap = {
        'ç': 'Ç', 'ğ': 'Ğ', 'ı': 'I', 'ö': 'Ö', 'ş': 'Ş', 'ü': 'Ü',
        'i': 'İ'
      };
      
      const upperFirst = upperMap[firstChar] || firstChar.toUpperCase();
      return upperFirst + rest;
    })
    .join(' ');
  
  return formatted;
}

// Organize menu items by category
function organizeCategories() {
  appState.categories = {};
  
  console.log(`📂 Kategorilere organize ediliyor: ${appState.menuItems.length} ürün`);
  
  appState.menuItems.forEach(item => {
    if (!appState.categories[item.category]) {
      appState.categories[item.category] = [];
      console.log(`  📁 Yeni kategori: ${item.category}`);
    }
    appState.categories[item.category].push(item);
  });
  
  console.log(`✅ ${Object.keys(appState.categories).length} kategori oluşturuldu:`, Object.keys(appState.categories));
}

// Render menu
function renderMenu() {
  // appState kontrolü - eğer menu değilse menu yap (render için)
  if (!appState) {
    console.error('❌ appState yok, render edilemiyor!');
    return;
  }
  
  if (appState.currentView !== 'menu') {
    console.log(`⏸️ Menü görünümü aktif değil (${appState.currentView}), 'menu' olarak ayarlanıyor...`);
    appState.currentView = 'menu';
  }
  
  // İlk açılışta kategorileri göster
  if (!appState.menuView || appState.menuView === '') {
    appState.menuView = 'categories';
    console.log('📁 menuView ayarlandı: categories');
  }
  
  console.log('🎨 Menü render ediliyor...', {
    menuView: appState.menuView,
    selectedCategory: appState.selectedCategory,
    categoriesCount: Object.keys(appState.categories).length
  });
  const container = document.getElementById('menu-container');
  const header = document.getElementById('menu-header');
  
  // Masa numarası kullanıcıya gösterilmiyor (sadece backend için kullanılıyor)
  const urlParams = new URLSearchParams(window.location.search);
  const tableId = urlParams.get('table') || appState.tableId;
  appState.tableId = tableId; // appState'i güncelle (backend için)
  console.log('✅ Masa numarası alındı (gösterilmiyor):', tableId);
  
  if (!container) {
    console.error('❌ menu-container elementi bulunamadı!');
    console.error('   Sayfadaki tüm ID\'ler:', Array.from(document.querySelectorAll('[id]')).map(el => el.id));
    return;
  }
  
  // Container'ın görünür olduğundan emin ol (index.html için)
  const menuViewContainer = container.closest('#menu-view-container');
  if (menuViewContainer) {
    menuViewContainer.style.setProperty('display', 'block', 'important');
    menuViewContainer.style.setProperty('visibility', 'visible', 'important');
    menuViewContainer.classList.remove('hidden');
    console.log('✅ menu-view-container görünür hale getirildi');
  }
  
  console.log('✅ menu-container bulundu:', container);
  
  console.log(`📊 Render: ${appState.menuItems.length} ürün, ${Object.keys(appState.categories).length} kategori`);
  
  if (appState.menuItems.length === 0) {
    container.innerHTML = '<div class="text-center text-gray-400 py-10"><p>Henüz ürün eklenmemiş.</p></div>';
    console.warn('⚠️ Ürün bulunamadı, boş mesaj gösteriliyor');
    return;
  }
  
  // Category icons - varsayılan ikonlar
  const categoryIcons = {
    'sicak-kahveler': '☕',
    'soguk-kahveler': '🧊',
    'sicak-icecekler': '🔥',
    'soguk-icecekler': '🧊',
    'helvalar': '🍯',
    'kahveler': '☕',
    'pastalar': '🍰'
  };
  
  const categoriesKeys = Object.keys(appState.categories);
  console.log(`📋 ${categoriesKeys.length} kategori bulundu`);
  
  // Dinamik kategori adları oluştur
  const categoryNames = {};
  categoriesKeys.forEach(key => {
    categoryNames[key] = formatCategoryName(key);
  });
  
  if (categoriesKeys.length === 0) {
    container.innerHTML = '<div class="text-center text-gray-400 py-10"><p>Henüz ürün eklenmemiş.</p></div>';
    console.warn('⚠️ Kategori bulunamadı');
    return;
  }
  
  // Kategoriler görünümü (varsayılan veya açıkça seçilmişse)
  console.log('🔍 Render kontrolü:', {
    menuView: appState.menuView,
    selectedCategory: appState.selectedCategory,
    categoriesKeysLength: categoriesKeys.length
  });
  
  // Her zaman ilk önce kategorileri göster - selectedCategory yoksa veya menuView categories ise
  const shouldShowCategories = !appState.selectedCategory || appState.menuView === 'categories';
  const shouldShowProducts = appState.selectedCategory && appState.menuView === 'products';
  
  console.log('🔍 Render kararı:', {
    shouldShowCategories,
    shouldShowProducts,
    selectedCategory: appState.selectedCategory,
    menuView: appState.menuView
  });
  
  // ÇOK BASİT YAKLAŞIM: Sadece selectedCategory varsa VE menuView products ise ürünleri göster
  // Aksi halde HER ZAMAN kategorileri göster
  const hasSelectedCategory = appState.selectedCategory && appState.selectedCategory !== null && appState.selectedCategory !== '';
  const isProductsView = appState.menuView === 'products';
  
  console.log('🎯 Render kararı:', {
    hasSelectedCategory,
    isProductsView,
    selectedCategory: appState.selectedCategory,
    menuView: appState.menuView,
    willShowProducts: hasSelectedCategory && isProductsView
  });
  
  if (hasSelectedCategory && isProductsView) {
    console.log('📦 Ürünler görünümüne geçiliyor, kategori:', appState.selectedCategory);
    renderProductsView(container, appState.selectedCategory, categoryIcons, categoryNames);
  } 
  else {
    // DEFAULT: Her zaman kategorileri göster
    console.log('📁 Kategoriler görünümüne geçiliyor (DEFAULT)...', {
      reason: !hasSelectedCategory ? 'selectedCategory yok' : 'menuView products değil',
      selectedCategory: appState.selectedCategory,
      menuView: appState.menuView
    });
    // State'i sıfırla
    appState.menuView = 'categories';
    appState.selectedCategory = null;
    // Kategorileri render et
    renderCategoriesView(container, categoriesKeys, categoryIcons, categoryNames);
  }
}

// Kategoriler görünümünü render et
function renderCategoriesView(container, categoriesKeys, categoryIcons, categoryNames) {
  console.log('📁 Kategoriler görünümü render ediliyor...', {
    categoriesKeysCount: categoriesKeys.length,
    categoriesKeys: categoriesKeys,
    containerExists: !!container,
    containerId: container?.id
  });
  
  if (!container) {
    console.error('❌ Container bulunamadı renderCategoriesView içinde!');
    return;
  }
  
  if (!categoriesKeys || categoriesKeys.length === 0) {
    console.error('❌ Kategori bulunamadı!', {
      appStateCategories: appState.categories,
      categoriesKeys: categoriesKeys
    });
    container.innerHTML = '<div class="text-center text-gray-400 py-10"><p>Henüz kategori eklenmemiş.</p></div>';
    return;
  }
  
  // Container'ı temizle ve görünür yap
  container.innerHTML = '';
  container.style.display = 'block';
  container.style.visibility = 'visible';
  
  // Kategori resim eşleştirmesi
  const categoryImages = {
    'helvalar': 'images/categories/helvalar.png',
    'bitki-caylari': 'images/categories/bitkicayi.png',
    'memleket-gazozlari': 'images/categories/memleketgazozlari2.png',
    'lezzet-kosesi': 'images/categories/lezzetkosesi.png',
    'soguk-kahveler': 'images/categories/sogukkahveler.png',
    'sicak-icecekler': 'images/categories/sıcakicecekler.png',
    'soguk-icecekler': 'images/categories/sogukicecekler.png',
    'kahveler': 'images/categories/kahveler.png',
    'kokteyller': 'images/categories/kokteyller.png',
    'milkshakeler': 'images/categories/milkshakeler.png',
    'pastalar': 'images/categories/pastalar.png',
    'frozen': 'images/categories/frozen.png'
  };
  
  let html = `
    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-6 gap-3">
      <h2 class="text-2xl sm:text-3xl font-extrabold text-dark-brown">Kategoriler</h2>
      <button onclick="window.appFunctions.callWaiter()" 
              class="flex items-center gap-2 bg-accent-gold text-primary-cafe px-3 sm:px-4 py-2 rounded-lg font-semibold hover:bg-yellow-400 transition shadow-md min-h-[44px] text-sm sm:text-base w-full sm:w-auto justify-center">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <span>Garson Çağır</span>
      </button>
    </div>
  `;
  html += '<div class="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5 md:gap-6">';
  
  categoriesKeys.forEach(category => {
    const items = appState.categories[category] || [];
    const icon = categoryIcons[category] || '📋';
    const name = (categoryNames && categoryNames[category]) ? categoryNames[category] : formatCategoryName(category);
    
    console.log(`  📂 Kategori kartı oluşturuluyor: ${name} (${items.length} ürün)`);
    
    // XSS koruması için escape
    const escapedCategory = category.replace(/'/g, "\\'").replace(/"/g, '&quot;');
    
    // Kategori için arka plan resmi
    const backgroundImage = categoryImages[category] || null;
    
    if (backgroundImage) {
      // Arka plan resmi varsa, overlay ile göster (ikon yok, opacity artırıldı, yazı beyaz)
      html += `
        <div class="category-card-with-image rounded-lg shadow-md p-4 sm:p-5 md:p-6 hover:shadow-lg transition cursor-pointer border border-transparent hover:border-accent-gold text-center aspect-square flex flex-col justify-center items-center touch-manipulation overflow-hidden relative"
             style="background-image: url('${backgroundImage}') !important; background-size: cover !important; background-position: center center !important; background-repeat: no-repeat !important;"
             onclick="if(window.appFunctions && window.appFunctions.selectCategory) { window.appFunctions.selectCategory('${escapedCategory}'); } else { alert('Fonksiyon bulunamadı'); }">
          <div class="category-card-overlay absolute inset-0 z-0" style="background-color: rgba(0, 0, 0, 0.15) !important;"></div>
          <div class="relative z-10 flex flex-col justify-center items-center w-full h-full">
            <h3 class="category-card-title text-base sm:text-lg md:text-xl font-bold line-clamp-2 px-3" style="color: #ffffff !important; text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.9), 0 0 10px rgba(0, 0, 0, 0.7) !important; -webkit-text-fill-color: #ffffff !important;">${name}</h3>
          </div>
        </div>
      `;
    } else {
      // Arka plan resmi yoksa, normal göster (ikon yok)
      html += `
        <div class="bg-white rounded-lg shadow-md p-4 sm:p-5 md:p-6 hover:shadow-lg transition cursor-pointer border border-transparent hover:border-accent-gold text-center aspect-square flex flex-col justify-center items-center touch-manipulation"
             onclick="if(window.appFunctions && window.appFunctions.selectCategory) { window.appFunctions.selectCategory('${escapedCategory}'); } else { alert('Fonksiyon bulunamadı'); }">
          <h3 class="text-base sm:text-lg md:text-xl font-bold text-primary-cafe line-clamp-2 px-3">${name}</h3>
        </div>
      `;
    }
  });
  
  html += '</div>';
  
  console.log('📝 HTML oluşturuldu, container\'a yazılıyor...', {
    htmlLength: html.length,
    containerId: container.id,
    categoriesCount: categoriesKeys.length
  });
  
  // Container'a yaz
  try {
    container.innerHTML = html;
    console.log(`✅ Kategoriler HTML render edildi (${categoriesKeys.length} kategori)`);
    console.log('✅ Container innerHTML uzunluğu:', container.innerHTML.length);
    
    // Kategori kartlarına dinamik style ekle (beyaz yazı ve düşük opacity için) - ÇOK GÜÇLÜ
    const applyCategoryStyles = () => {
      const categoryCards = container.querySelectorAll('.category-card-with-image');
      console.log(`🔍 [STYLE APPLY] ${categoryCards.length} kategori kartı bulundu`);
      
      if (categoryCards.length === 0) {
        console.warn('⚠️ [STYLE APPLY] Kategori kartı bulunamadı! Tüm kartları kontrol ediyorum...');
        const allCards = container.querySelectorAll('[style*="background-image"]');
        console.log(`🔍 [STYLE APPLY] Arka plan resmi olan ${allCards.length} kart bulundu`);
        return;
      }
      
      categoryCards.forEach((card, index) => {
        const h3 = card.querySelector('h3');
        const overlay = card.querySelector('.category-card-overlay');
        
        if (h3) {
          // Tüm olası text color class'larını kaldır
          h3.classList.remove('text-primary-cafe', 'text-dark-brown', 'text-gray-800', 'text-gray-900', 'text-gray-700');
          h3.classList.add('category-card-title');
          
          // Önce mevcut style'ı kontrol et
          const beforeColor = window.getComputedStyle(h3).color;
          console.log(`📋 [STYLE APPLY] Kategori ${index + 1} (${h3.textContent.trim()}): Önceki renk:`, beforeColor);
          
          // Inline style ile zorla - cssText kullan (mevcut style'ı koru)
          const existingStyle = h3.getAttribute('style') || '';
          h3.setAttribute('style', existingStyle + ' color: #ffffff !important; text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.9), 0 0 10px rgba(0, 0, 0, 0.7) !important; font-weight: 700 !important; -webkit-text-fill-color: #ffffff !important;');
          
          // setProperty ile de dene
          h3.style.setProperty('color', '#ffffff', 'important');
          h3.style.setProperty('-webkit-text-fill-color', '#ffffff', 'important');
          h3.style.setProperty('text-shadow', '2px 2px 4px rgba(0, 0, 0, 0.9), 0 0 10px rgba(0, 0, 0, 0.7)', 'important');
          
          // Sonraki rengi kontrol et
          setTimeout(() => {
            const afterColor = window.getComputedStyle(h3).color;
            const isWhite = afterColor === 'rgb(255, 255, 255)' || afterColor === '#ffffff' || afterColor.includes('255, 255, 255');
            console.log(`✅ [STYLE APPLY] Kategori ${index + 1} (${h3.textContent.trim()}): Sonraki renk:`, afterColor, isWhite ? '✅ BEYAZ!' : '❌ HALA BEYAZ DEĞİL!');
            if (!isWhite) {
              console.error(`❌ [STYLE APPLY] Kategori ${index + 1} hala beyaz değil! Computed style:`, window.getComputedStyle(h3).getPropertyValue('color'));
            }
          }, 50);
        }
        
        if (overlay) {
          const existingOverlayStyle = overlay.getAttribute('style') || '';
          overlay.setAttribute('style', existingOverlayStyle + ' background-color: rgba(0, 0, 0, 0.15) !important;');
          overlay.style.setProperty('background-color', 'rgba(0, 0, 0, 0.15)', 'important');
        }
      });
      console.log(`✅ [STYLE APPLY] ${categoryCards.length} kategori kartına dinamik style uygulandı`);
    };
    
    // Hemen uygula
    setTimeout(applyCategoryStyles, 50);
    // Tekrar uygula (güvenlik için)
    setTimeout(applyCategoryStyles, 200);
    setTimeout(applyCategoryStyles, 500);
    
    // Test için container'ın görünür olduğunu kontrol et
    setTimeout(() => {
      const computedStyle = window.getComputedStyle(container);
      console.log('🔍 Container style kontrolü:', {
        display: computedStyle.display,
        visibility: computedStyle.visibility,
        height: computedStyle.height,
        width: computedStyle.width,
        innerHTMLLength: container.innerHTML.length
      });
    }, 200);
  } catch (error) {
    console.error('❌ Container\'a yazma hatası:', error);
  }
}

// Ürünler görünümünü render et (seçili kategori)
function renderProductsView(container, categoryKey, categoryIcons, categoryNames) {
  console.log(`📦 ${categoryKey} kategorisinin ürünleri render ediliyor...`);
  
  const items = appState.categories[categoryKey] || [];
  const icon = categoryIcons[categoryKey] || '📋';
  // Kategori adını formatla - eğer categoryNames yoksa formatCategoryName kullan
  const name = (categoryNames && categoryNames[categoryKey]) ? categoryNames[categoryKey] : formatCategoryName(categoryKey);
  
  let html = `
    <div class="mb-4">
      <button onclick="window.appFunctions.showCategories()" 
              class="flex items-center gap-2 text-primary-cafe hover:text-accent-gold font-bold mb-4 transition">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Kategorilere Dön
      </button>
    </div>
    <h2 class="text-3xl font-extrabold text-dark-brown mb-6 flex items-center gap-3">
      <span class="text-4xl">${icon}</span>
      ${name}
    </h2>
  `;
  
  if (items.length === 0) {
    html += '<div class="text-center text-gray-400 py-10"><p>Bu kategoride henüz ürün bulunmamaktadır.</p></div>';
    container.innerHTML = html;
    return;
  }
  
  html += '<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">';
  
  items.forEach(item => {
    // Helvalar kategorisindeki tüm ürünler için boyut seçenekleri göster
    // Hem categoryKey hem de item.category kontrolü yap - case-insensitive kontrol
    const categoryKeyLower = (categoryKey || '').toLowerCase().trim();
    const itemCategoryLower = (item.category || '').toLowerCase().trim();
    const isHelva = categoryKeyLower === 'helvalar' || itemCategoryLower === 'helvalar';
    
    console.log(`🔍 Ürün kontrolü: ${item.name}`, {
      categoryKey,
      categoryKeyLower,
      itemCategory: item.category,
      itemCategoryLower,
      isHelva
    });
    
    if (isHelva) {
      // Helvalar için büyük/küçük seçenekleri - HER ZAMAN göster
      // priceSmall ve priceLarge değerlerini kontrol et, yoksa normal fiyatı kullan
      
      // Önce raw değerleri al
      const rawPriceSmall = item.priceSmall;
      const rawPriceLarge = item.priceLarge;
      const rawPrice = item.price;
      
      // Değerleri parse et ve kontrol et
      const parsedPriceSmall = rawPriceSmall !== null && rawPriceSmall !== undefined ? parseFloat(rawPriceSmall) : null;
      const parsedPriceLarge = rawPriceLarge !== null && rawPriceLarge !== undefined ? parseFloat(rawPriceLarge) : null;
      const parsedPrice = rawPrice !== null && rawPrice !== undefined ? parseFloat(rawPrice) : 0;
      
      // Geçerli fiyatları belirle
      const hasPriceSmall = parsedPriceSmall !== null && !isNaN(parsedPriceSmall) && parsedPriceSmall > 0;
      const hasPriceLarge = parsedPriceLarge !== null && !isNaN(parsedPriceLarge) && parsedPriceLarge > 0;
      
      // Final fiyatları hesapla
      const finalPriceSmall = hasPriceSmall ? parsedPriceSmall : (parsedPrice > 0 ? parsedPrice : 0);
      // priceLarge için SADECE priceLarge değerini kullan - fallback olarak priceSmall veya price kullanma
      // Eğer priceLarge yoksa, kullanıcıya hata göster veya priceLarge değerini zorunlu yap
      let finalPriceLarge;
      if (hasPriceLarge) {
        finalPriceLarge = parsedPriceLarge;
      } else {
        // priceLarge yoksa, priceSmall'dan farklı bir değer göster (örneğin priceSmall * 1.5)
        // Ama bu geçici bir çözüm - asıl çözüm Firestore'da priceLarge değerinin olması
        console.error(`❌ ${item.name} için priceLarge değeri Firestore'da bulunamadı!`);
        console.error(`   priceSmall: ${parsedPriceSmall}, price: ${parsedPrice}`);
        // Geçici olarak priceSmall'dan %50 fazla göster (kullanıcı düzeltmeli)
        finalPriceLarge = hasPriceSmall ? (parsedPriceSmall * 1.5) : (parsedPrice > 0 ? parsedPrice * 1.5 : 0);
        console.warn(`   ⚠️ Geçici olarak priceLarge = priceSmall * 1.5 = ${finalPriceLarge} gösteriliyor`);
      }
      
      console.log(`🍯 Helva ürünü: ${item.name}`, {
        categoryKey,
        itemCategory: item.category,
        rawPriceSmall,
        rawPriceLarge,
        rawPrice,
        parsedPriceSmall,
        parsedPriceLarge,
        parsedPrice,
        hasPriceSmall,
        hasPriceLarge,
        finalPriceSmall,
        finalPriceLarge,
        '⚠️ UYARI': !hasPriceLarge ? 'priceLarge değeri bulunamadı veya geçersiz!' : 'OK'
      });
      
      // priceLarge yoksa uyarı ver ama yine de göster
      if (!hasPriceLarge) {
        console.warn(`⚠️ ${item.name} için priceLarge değeri bulunamadı! Firestore'da kontrol edin.`);
      }
      
      html += `
        <div class="bg-white rounded-lg sm:rounded-xl shadow-lg p-3 sm:p-4 hover:shadow-xl transition border-2 border-transparent hover:border-accent-gold touch-manipulation">
          <h4 class="text-lg sm:text-xl font-bold text-dark-brown mb-1 sm:mb-2">${item.name || 'İsimsiz'}</h4>
          ${item.description ? `<p class="text-xs sm:text-sm text-gray-600 mb-2 line-clamp-2">${item.description}</p>` : ''}
          
          <!-- Boyut Seçenekleri - Her zaman göster -->
          <div class="space-y-2 mt-3 sm:mt-4">
            <div class="flex justify-between items-center p-2.5 sm:p-3 bg-gray-50 rounded-lg sm:rounded-xl hover:bg-gray-100 cursor-pointer border border-transparent hover:border-accent-gold transition-all min-h-[50px]"
                 onclick="window.appFunctions.addToCart('${item.id}', 'small')">
              <div>
                <span class="font-semibold text-dark-brown text-xs sm:text-sm">Küçük</span>
              </div>
              <div class="flex items-center gap-2 sm:gap-3">
                <span class="text-base sm:text-lg font-extrabold text-accent-gold">${finalPriceSmall.toFixed(2)}₺</span>
                <button class="bg-gradient-to-r from-primary-cafe to-dark-brown text-white px-3 sm:px-4 py-1.5 rounded-full font-semibold hover:shadow-lg transition-all transform hover:scale-105 text-xs min-h-[36px] min-w-[60px]">
                  + Ekle
                </button>
              </div>
            </div>
            
            <div class="flex justify-between items-center p-2.5 sm:p-3 bg-gray-50 rounded-lg sm:rounded-xl hover:bg-gray-100 cursor-pointer border border-transparent hover:border-accent-gold transition-all min-h-[50px]"
                 onclick="window.appFunctions.addToCart('${item.id}', 'large')">
              <div>
                <span class="font-semibold text-dark-brown text-xs sm:text-sm">Büyük</span>
              </div>
              <div class="flex items-center gap-2 sm:gap-3">
                <span class="text-base sm:text-lg font-extrabold text-accent-gold">${finalPriceLarge.toFixed(2)}₺</span>
                <button class="bg-gradient-to-r from-primary-cafe to-dark-brown text-white px-3 sm:px-4 py-1.5 rounded-full font-semibold hover:shadow-lg transition-all transform hover:scale-105 text-xs min-h-[36px] min-w-[60px]">
                  + Ekle
                </button>
              </div>
            </div>
          </div>
        </div>
      `;
    } else {
      // Diğer ürünler için normal görünüm
      html += `
        <div class="bg-white rounded-xl shadow-lg p-4 hover:shadow-xl transition cursor-pointer border-2 border-transparent hover:border-accent-gold"
             onclick="window.appFunctions.addToCart('${item.id}')">
          <h4 class="text-xl font-bold text-dark-brown mb-2">${item.name || 'İsimsiz'}</h4>
          ${item.description ? `<p class="text-sm text-gray-600 mb-2">${item.description}</p>` : ''}
          <div class="flex justify-between items-center mt-4">
            <span class="text-2xl font-extrabold text-accent-gold">${(parseFloat(item.price) || 0).toFixed(2)}₺</span>
            <button class="bg-gradient-to-r from-primary-cafe to-dark-brown text-white px-5 py-2 rounded-full font-semibold hover:shadow-lg transition-all transform hover:scale-105">
              <span class="flex items-center gap-1">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
                </svg>
                Ekle
              </span>
            </button>
          </div>
        </div>
      `;
    }
  });
  
  html += '</div>';
  container.innerHTML = html;
  console.log(`✅ ${items.length} ürün render edildi`);
}

// Update cart UI
function updateCartUI() {
  const cartCount = appState.cart.reduce((sum, item) => sum + item.quantity, 0);
  const cartTotal = appState.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  
  const badge = document.getElementById('cart-badge');
  const cartButton = document.getElementById('cart-count-button');
  const modalPlaceOrderButton = document.getElementById('modal-place-order-button');
  const orderSummary = document.getElementById('order-summary');
  
  if (cartCount > 0) {
    if (badge) {
      badge.textContent = cartCount;
      badge.classList.remove('hidden');
    }
    if (cartButton) cartButton.disabled = false;
    if (modalPlaceOrderButton) modalPlaceOrderButton.disabled = false;
    if (orderSummary) {
      orderSummary.innerHTML = `
        <span class="text-base sm:text-lg font-bold">${cartCount} ürün</span>
        <span class="text-xs sm:text-sm opacity-75">Toplam: ${cartTotal.toFixed(2)}₺</span>
      `;
    }
  } else {
    if (badge) badge.classList.add('hidden');
    if (cartButton) cartButton.disabled = true;
    if (modalPlaceOrderButton) modalPlaceOrderButton.disabled = true;
    if (orderSummary) {
      orderSummary.innerHTML = '<span class="text-sm font-normal opacity-75">Sepetiniz boş. Menüden ekleyin!</span>';
    }
  }
}

// Render cart modal
function renderCart() {
  const container = document.getElementById('cart-items-container');
  const totalEl = document.getElementById('cart-total');
  
  if (appState.cart.length === 0) {
    container.innerHTML = '<div class="text-center text-gray-400 py-10">Sepetiniz boş</div>';
    if (totalEl) totalEl.textContent = '0.00 ₺';
    return;
  }
  
  let html = '';
  let total = 0;
  
  appState.cart.forEach(item => {
    const itemTotal = item.price * item.quantity;
    total += itemTotal;
    
    html += `
      <div class="flex justify-between items-center p-3 sm:p-4 bg-gray-50 rounded-lg mb-2 sm:mb-3 gap-2">
        <div class="flex-1 min-w-0">
          <h4 class="font-bold text-dark-brown text-sm sm:text-base truncate">${item.name}</h4>
          <p class="text-xs sm:text-sm text-gray-600">${item.price.toFixed(2)}₺ × ${item.quantity}</p>
        </div>
        <div class="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          <button onclick="window.appFunctions.updateCartQuantity('${item.id}', -1)" 
                  class="bg-red-500 text-white w-9 h-9 sm:w-10 sm:h-10 rounded-lg font-bold hover:bg-red-600 min-h-[44px] min-w-[44px] flex items-center justify-center">-</button>
          <span class="font-bold text-primary-cafe text-sm sm:text-base min-w-[50px] text-right">${itemTotal.toFixed(2)}₺</span>
          <button onclick="window.appFunctions.updateCartQuantity('${item.id}', 1)" 
                  class="bg-green-500 text-white w-9 h-9 sm:w-10 sm:h-10 rounded-lg font-bold hover:bg-green-600 min-h-[44px] min-w-[44px] flex items-center justify-center">+</button>
        </div>
      </div>
    `;
  });
  
  container.innerHTML = html;
  if (totalEl) totalEl.textContent = `${total.toFixed(2)} ₺`;
}

// Show message
// Zarif toast bildirimi göster
function showToast(message, type = 'info') {
  const toast = document.getElementById('toast-notification');
  const toastIcon = document.getElementById('toast-icon');
  const toastMessage = document.getElementById('toast-message');
  
  if (!toast || !toastIcon || !toastMessage) {
    // Fallback: Eski bildirim sistemi
    showMessage(message, type);
    return;
  }
  
  const icons = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️'
  };
  
  const borderColors = {
    success: 'border-green-500',
    error: 'border-red-500',
    warning: 'border-yellow-500',
    info: 'border-blue-500'
  };
  
  toastIcon.textContent = icons[type] || icons.info;
  toastMessage.textContent = message;
  
  // Border rengini ayarla
  const toastContent = toast.querySelector('div');
  if (toastContent) {
    toastContent.className = `bg-white rounded-lg shadow-2xl border-l-4 ${borderColors[type] || borderColors.info} flex items-center gap-3 px-4 py-3 min-w-[280px] max-w-[400px]`;
  }
  
  // Toast'u göster
  toast.classList.remove('translate-x-full', 'opacity-0');
  toast.classList.add('translate-x-0', 'opacity-100');
  
  // 3 saniye sonra otomatik kapat
  setTimeout(() => {
    closeToast();
  }, 3000);
}

// Toast'u kapat
function closeToast() {
  const toast = document.getElementById('toast-notification');
  if (toast) {
    toast.classList.remove('translate-x-0', 'opacity-100');
    toast.classList.add('translate-x-full', 'opacity-0');
  }
}

// Sipariş başarı popup'ını göster
function showOrderSuccessPopup(tableNumber) {
  const popup = document.getElementById('order-success-popup');
  const tableNumberEl = document.getElementById('order-success-table-number');
  
  if (popup && tableNumberEl) {
    // Masa numarasını ayarla
    tableNumberEl.textContent = tableNumber || appState?.tableId || new URLSearchParams(window.location.search).get('table') || '?';
    
    // Popup'ı göster
    popup.classList.remove('hidden');
    popup.classList.add('flex');
    
    // Animasyon için kısa bir gecikme
    setTimeout(() => {
      popup.classList.remove('opacity-0');
      popup.classList.add('opacity-100');
      
      const popupContent = popup.querySelector('.bg-white');
      if (popupContent) {
        popupContent.classList.remove('scale-95', 'opacity-0');
        popupContent.classList.add('scale-100', 'opacity-100');
      }
    }, 10);
  } else {
    console.error('❌ Popup veya table number elementi bulunamadı!');
    // Fallback: Eski bildirim sistemi
    const total = appState?.cart?.reduce((sum, item) => sum + (item.price * item.quantity), 0) || 0;
    showMessage(`Siparişiniz alındı! Toplam: ${total.toFixed(2)}₺`, 'success');
  }
}

// Sipariş başarı popup'ını kapat
function closeOrderSuccessPopup() {
  const popup = document.getElementById('order-success-popup');
  if (popup) {
    const popupContent = popup.querySelector('.bg-white');
    
    // Kapanış animasyonu
    if (popupContent) {
      popupContent.classList.remove('scale-100', 'opacity-100');
      popupContent.classList.add('scale-95', 'opacity-0');
    }
    
    popup.classList.remove('opacity-100');
    popup.classList.add('opacity-0');
    
    // Popup'ı gizle
    setTimeout(() => {
      popup.classList.add('hidden');
      popup.classList.remove('flex');
    }, 300);
  }
}

// Global scope'a ekle
window.closeOrderSuccessPopup = closeOrderSuccessPopup;

// Garson çağır popup'ını göster
function showWaiterCallPopup(tableNumber) {
  console.log('🔔 showWaiterCallPopup çağrıldı, masa:', tableNumber);
  const popup = document.getElementById('waiter-call-popup');
  // Hem menu.html hem index.html için ID'leri kontrol et
  const tableNumberEl = document.getElementById('waiter-popup-table-number') || document.getElementById('waiter-call-table-number');
  
  if (popup) {
    // Popup'ı göster - z-index'i de ayarla
    popup.style.setProperty('z-index', '999999', 'important');
    
    // Masa numarasını ayarla (eğer element varsa)
    if (tableNumberEl) {
      tableNumberEl.textContent = tableNumber || appState?.tableId || new URLSearchParams(window.location.search).get('table') || '?';
    }
    
    // Popup'ı göster
    popup.classList.remove('hidden');
    popup.classList.add('flex');
    console.log('✅ Başarı popup gösterildi');
    
    // Animasyon için kısa bir gecikme
    setTimeout(() => {
      popup.classList.remove('opacity-0');
      popup.classList.add('opacity-100');
      
      const popupContent = popup.querySelector('.bg-white');
      if (popupContent) {
        popupContent.classList.remove('scale-95', 'opacity-0');
        popupContent.classList.add('scale-100', 'opacity-100');
        console.log('✅ Başarı popup animasyonu başlatıldı');
      }
    }, 10);
  } else {
    console.error('❌ Garson çağır popup bulunamadı!');
    // Fallback: Eski bildirim sistemi
    showMessage(`Masa ${tableNumber} - Garson çağırıldı! En kısa sürede geleceğiz.`, 'success');
  }
}

// Garson çağır popup'ını kapat
function closeWaiterCallPopup() {
  const popup = document.getElementById('waiter-call-popup');
  if (popup) {
    const popupContent = popup.querySelector('.bg-white');
    
    // Kapanış animasyonu
    if (popupContent) {
      popupContent.classList.remove('scale-100', 'opacity-100');
      popupContent.classList.add('scale-95', 'opacity-0');
    }
    
    popup.classList.remove('opacity-100');
    popup.classList.add('opacity-0');
    
    // Popup'ı gizle
    setTimeout(() => {
      popup.classList.add('hidden');
      popup.classList.remove('flex');
    }, 300);
  }
}

// Global scope'a ekle
window.closeWaiterCallPopup = closeWaiterCallPopup;

// Garson çağır onay popup'ını göster
function showWaiterConfirmPopup(tableNumber) {
  console.log('🔔 showWaiterConfirmPopup çağrıldı, masa:', tableNumber);
  const popup = document.getElementById('waiter-call-confirm-popup');
  const tableNumberEl = document.getElementById('waiter-confirm-table-number');
  
  console.log('📊 Popup elementi:', popup ? 'Bulundu' : 'Bulunamadı');
  console.log('📊 Table number elementi:', tableNumberEl ? 'Bulundu' : 'Bulunamadı');
  
  if (popup && tableNumberEl) {
    // Masa numarasını ayarla
    const finalTableNumber = tableNumber || appState?.tableId || new URLSearchParams(window.location.search).get('table') || '?';
    tableNumberEl.textContent = finalTableNumber;
    console.log('✅ Masa numarası ayarlandı:', finalTableNumber);
    
    // Popup'ı göster - z-index'i de ayarla
    popup.style.setProperty('z-index', '999999', 'important');
    popup.classList.remove('hidden');
    popup.classList.add('flex');
    console.log('✅ Popup gösterildi');
    
    // Animasyon için kısa bir gecikme
    setTimeout(() => {
      popup.classList.remove('opacity-0');
      popup.classList.add('opacity-100');
      
      const popupContent = popup.querySelector('.bg-white');
      if (popupContent) {
        popupContent.classList.remove('scale-95', 'opacity-0');
        popupContent.classList.add('scale-100', 'opacity-100');
        console.log('✅ Popup animasyonu başlatıldı');
      }
    }, 10);
  } else {
    console.error('❌ Garson çağır onay popup veya table number elementi bulunamadı!');
    console.error('   Popup:', popup);
    console.error('   Table number el:', tableNumberEl);
    // Fallback: Direkt garson çağır
    if (window.appFunctions && window.appFunctions.confirmAndCallWaiter) {
      console.log('⚠️ Fallback: Direkt garson çağırılıyor...');
      window.appFunctions.confirmAndCallWaiter(tableNumber);
    } else {
      console.error('❌ confirmAndCallWaiter fonksiyonu da bulunamadı!');
      alert('Garson çağrılamadı. Lütfen sayfayı yenileyin.');
    }
  }
}

// Garson çağır onay popup'ını kapat
function closeWaiterConfirmPopup() {
  const popup = document.getElementById('waiter-call-confirm-popup');
  if (popup) {
    const popupContent = popup.querySelector('.bg-white');
    
    // Kapanış animasyonu
    if (popupContent) {
      popupContent.classList.remove('scale-100', 'opacity-100');
      popupContent.classList.add('scale-95', 'opacity-0');
    }
    
    popup.classList.remove('opacity-100');
    popup.classList.add('opacity-0');
    
    // Popup'ı gizle
    setTimeout(() => {
      popup.classList.add('hidden');
      popup.classList.remove('flex');
    }, 300);
  }
}

// Onay butonuna basıldığında çağrılacak fonksiyon
function confirmWaiterCall() {
  const tableNumberEl = document.getElementById('waiter-confirm-table-number');
  const tableNumber = tableNumberEl ? parseInt(tableNumberEl.textContent) : (appState?.tableId || parseInt(new URLSearchParams(window.location.search).get('table')) || 0);
  
  if (window.appFunctions && window.appFunctions.confirmAndCallWaiter) {
    window.appFunctions.confirmAndCallWaiter(tableNumber);
  } else {
    console.error('❌ confirmAndCallWaiter fonksiyonu bulunamadı!');
    closeWaiterConfirmPopup();
  }
}

// Global scope'a ekle
window.closeWaiterConfirmPopup = closeWaiterConfirmPopup;
window.confirmWaiterCall = confirmWaiterCall;

// Eski bildirim fonksiyonu (geriye uyumluluk için)
function showMessage(message, type = 'info') {
  const messageBox = document.getElementById('message-box');
  if (!messageBox) return;
  
  const colors = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    warning: 'bg-yellow-500',
    info: 'bg-blue-500'
  };
  
  if (messageBox) {
    messageBox.textContent = message;
    messageBox.className = `fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-white px-8 py-5 rounded-2xl shadow-2xl z-50 transition-all duration-500 ${colors[type] || colors.info} text-center font-semibold text-lg`;
    messageBox.classList.remove('hidden');
    
    setTimeout(() => {
      if (messageBox) {
        messageBox.classList.add('opacity-0');
        setTimeout(() => {
          if (messageBox) {
            messageBox.classList.add('hidden');
          }
        }, 500);
      }
    }, 3000);
  }
}

// Global scope'a ekle
window.closeToast = closeToast;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  // Hata yakalama - Tüm işlemleri try-catch içine al
  try {
    // Masa numarasını URL'den al ve appState'e set et
    const urlParams = new URLSearchParams(window.location.search);
    const tableIdFromUrl = urlParams.get('table');
    if (tableIdFromUrl) {
      appState.tableId = tableIdFromUrl;
      console.log('✅ Masa numarası URL\'den alındı:', appState.tableId);
    }
    
    // Masa numarası kullanıcıya gösterilmiyor (sadece backend için kullanılıyor)
    if (window.location.pathname.includes('menu.html') || window.location.pathname.endsWith('menu.html')) {
      console.log('✅ Masa numarası alındı (gösterilmiyor):', appState.tableId);
    }
    
    // Welcome table ID elementini kontrol et (varsa güncelle)
    const welcomeTableId = document.getElementById('welcome-table-id');
    if (welcomeTableId) {
      welcomeTableId.textContent = appState.tableId;
    }
  } catch (error) {
    console.error('⚠️ Table ID güncellenirken hata:', error);
  }
  
  console.log('✅ Firebase connected');
  console.log('🚀 Bihter Kafe uygulaması başlatıldı');
  
  // Menu.html sayfasındaysa direkt menüyü yükle
  if (window.location.pathname.includes('menu.html') || window.location.pathname.endsWith('menu.html')) {
    console.log('📋 Menu.html sayfası tespit edildi, menü yükleniyor...');
    appState.currentView = 'menu';
    setTimeout(() => {
      if (typeof loadMenu === 'function') {
        loadMenu();
      }
    }, 500);
    return; // Welcome container'ı gösterme, direkt menüye geç
  }
  
  // HEMEN WELCOME CONTAINER'I GÖSTER - En öncelikli
  try {
    const welcomeContainer = document.getElementById('welcome-container');
    if (welcomeContainer) {
      welcomeContainer.style.cssText = 'position: fixed !important; top: 0 !important; left: 0 !important; right: 0 !important; bottom: 0 !important; width: 100vw !important; height: 100vh !important; background-color: #E8D5B7 !important; display: flex !important; flex-direction: column !important; align-items: center !important; justify-content: center !important; padding: 1.5rem !important; z-index: 99999 !important; visibility: visible !important; opacity: 1 !important;';
      console.log('✅ Welcome container zorla gösterildi');
    }
  } catch (error) {
    console.error('❌ Welcome container gösterilirken hata:', error);
  }
  
  // window.appFunctions'ın tanımlı olduğunu kontrol et
  console.log('🔍 window.appFunctions kontrol ediliyor...', window.appFunctions ? '✅ Tanımlı' : '❌ Tanımlı değil!');
  console.log('   window.appFunctions.placeOrder:', typeof window.appFunctions?.placeOrder);
  console.log('   window.appFunctions.addToCart:', typeof window.appFunctions?.addToCart);
  
  // Garson Çağır butonuna direkt listener ekle
  const callWaiterButton = document.getElementById('call-waiter-button');
  if (callWaiterButton) {
    console.log('✅ Garson Çağır butonu bulundu, direkt listener ekleniyor...');
    callWaiterButton.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      console.log('🔔 Garson Çağır butonu tıklandı (direkt listener)!');
      console.log('   window.appFunctions:', window.appFunctions);
      console.log('   callWaiter:', typeof window.appFunctions?.callWaiter);
      
      if (window.appFunctions && typeof window.appFunctions.callWaiter === 'function') {
        console.log('✅ window.appFunctions.callWaiter çağrılıyor...');
        window.appFunctions.callWaiter();
      } else {
        console.error('❌ window.appFunctions.callWaiter fonksiyonu bulunamadı!');
        console.error('   window.appFunctions:', window.appFunctions);
        alert('Garson çağrılamadı. Lütfen sayfayı yenileyip tekrar deneyin.');
      }
    }, true); // capture phase'de çalış
    console.log('✅ Garson Çağır butonu listener eklendi');
  } else {
    console.warn('⚠️ Garson Çağır butonu bulunamadı');
  }
  
  // EVENT DELEGATION - Body seviyesinde listener ekle, buton tıklamalarını yakala
  console.log('🔧 Event delegation kuruluyor...');
  
  // Body seviyesinde event delegation ekle (en güvenilir yöntem)
  document.body.addEventListener('click', function(e) {
    const target = e.target;
    const button = target.closest('button');
    
    if (!button) return;
    
    const buttonId = button.id;
    const buttonText = button.textContent?.trim() || '';
    const isInWelcomeContainer = button.closest('#welcome-container');
    
    // Sadece welcome container içindeki butonları işle
    if (!isInWelcomeContainer) return;
    
    console.log('🔴 Welcome container içinde buton tıklandı!', {
      buttonId,
      buttonText,
      target: target.tagName,
      isButton: button.tagName === 'BUTTON'
    });
    
    // Menüye Git butonu
    if (buttonId === 'navigate-to-menu-button' || buttonText.includes('Menüye Git')) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      console.log('📖 Menüye Git butonu tıklandı (event delegation)!');
      console.log('   window.appFunctions:', window.appFunctions);
      const tableId = new URLSearchParams(window.location.search).get('table') || '13';
      console.log(`📖 menu.html sayfasına yönlendiriliyor (Masa: ${tableId})...`);
      window.location.href = `menu.html?table=${tableId}`;
      return false;
    }
    
    // Garson Çağır butonu
    if (buttonId === 'call-waiter-button' || buttonText.includes('Garson Çağır')) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      console.log('🔔 Garson Çağır butonu tıklandı (event delegation)!');
      console.log('   window.appFunctions:', window.appFunctions);
      console.log('   callWaiter:', typeof window.appFunctions?.callWaiter);
      if (window.appFunctions && typeof window.appFunctions.callWaiter === 'function') {
        window.appFunctions.callWaiter();
      } else {
        console.error('❌ window.appFunctions.callWaiter fonksiyonu bulunamadı!');
        alert('Garson çağrılamadı. Lütfen sayfayı yenileyin.');
      }
      return false;
    }
  }, true); // capture phase'de çalış - öncelikli
    
  console.log('✅ Event delegation eklendi - Body seviyesinde');
  
  // Buton event listener'larını programatik olarak ekle (onclick yerine - telefon uyumluluğu için)
  setTimeout(() => {
    console.log('🔧 Buton event listener\'ları ekleniyor...');
    
    const placeOrderButton = document.getElementById('place-order-button');
    const modalPlaceOrderButton = document.getElementById('modal-place-order-button');
    
    if (modalPlaceOrderButton) {
      console.log('✅ Modal sipariş butonu bulundu, event listener ekleniyor...');
      modalPlaceOrderButton.removeAttribute('onclick');
      modalPlaceOrderButton.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        console.log('🔴 Modal buton tıklandı (programmatic event listener)!');
        if (window.appFunctions && typeof window.appFunctions.placeOrder === 'function') {
          window.appFunctions.placeOrder();
        } else {
          console.error('❌ window.appFunctions.placeOrder fonksiyonu bulunamadı!');
          alert('Sipariş verme fonksiyonu bulunamadı. Lütfen sayfayı yenileyin.');
        }
      });
    }
    
    // Landing page butonlarına direkt listener da ekle (hem event delegation hem direkt)
    const navigateToMenuButton = document.getElementById('navigate-to-menu-button');
    const callWaiterButton = document.getElementById('call-waiter-button');
    
    if (navigateToMenuButton) {
      console.log('✅ Menüye Git butonu bulundu, direkt listener ekleniyor...');
      navigateToMenuButton.style.cursor = 'pointer';
      navigateToMenuButton.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        console.log('🔴 Menüye Git butonu tıklandı (direkt listener)!');
        const tableId = new URLSearchParams(window.location.search).get('table') || '13';
        console.log(`📖 menu.html sayfasına yönlendiriliyor (Masa: ${tableId})...`);
        window.location.href = `menu.html?table=${tableId}`;
      }, true);
    } else {
      console.warn('⚠️ Menüye Git butonu bulunamadı');
    }
    
    if (callWaiterButton) {
      console.log('✅ Garson Çağır butonu bulundu, direkt listener ekleniyor...');
      callWaiterButton.style.cursor = 'pointer';
      callWaiterButton.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        console.log('🔴 Garson Çağır butonu tıklandı (direkt listener)!');
        if (window.appFunctions && typeof window.appFunctions.callWaiter === 'function') {
          window.appFunctions.callWaiter();
        }
      }, true);
    } else {
      console.warn('⚠️ Garson Çağır butonu bulunamadı');
    }
    
    console.log('✅ Event listener\'lar eklendi');
  }, 500);
  
  // Ekstra güvenlik - butonlar yüklendikten sonra tekrar dene
  setTimeout(() => {
    const navigateToMenuButton = document.getElementById('navigate-to-menu-button');
    const callWaiterButton = document.getElementById('call-waiter-button');
    
    console.log('🔄 Butonlar tekrar kontrol ediliyor...', {
      navigateButton: navigateToMenuButton ? 'Mevcut' : 'Yok',
      callWaiterButton: callWaiterButton ? 'Mevcut' : 'Yok'
    });
  }, 2000);
  
  // Landing page'i göster (Welcome ekranı) - Sayfa yüklendiğinde hemen göster
  function showLandingPage() {
    console.log('🏠 Landing page gösteriliyor...');
    
    const welcomeContainer = document.getElementById('welcome-container');
    const menuContainer = document.getElementById('menu-view-container');
    const orderFooter = document.getElementById('order-footer');
    const loadingIndicator = document.getElementById('loading-indicator');
    const headerElement = document.querySelector('header');
    const mainContainer = document.querySelector('.flex.flex-col.items-center.p-4');
    
    // Loading'i gizle
    if (loadingIndicator) {
      loadingIndicator.style.display = 'none';
      loadingIndicator.classList.add('hidden');
    }
    
    // Header'ı gizle (landing page'de)
    if (headerElement) {
      headerElement.style.display = 'none';
      headerElement.classList.add('hidden');
    }
    
    // Ana container'ın padding'ini kaldır (fullscreen için)
    if (mainContainer) {
      mainContainer.style.padding = '0';
    }
    
    // MENÜ GÖRÜNÜMÜNÜ KESİNLİKLE GİZLE
    if (menuContainer) {
      menuContainer.style.display = 'none';
      menuContainer.classList.add('hidden');
      console.log('✅ Menu container gizlendi');
    }
    
    // Footer'ı gizle
    if (orderFooter) {
      orderFooter.style.display = 'none';
      orderFooter.classList.add('hidden');
    }
    
    // WELCOME EKRANINI KESİNLİKLE GÖSTER
    if (welcomeContainer) {
      welcomeContainer.style.display = 'flex';
      welcomeContainer.style.visibility = 'visible';
      welcomeContainer.style.opacity = '1';
      welcomeContainer.classList.remove('hidden');
      console.log('✅ Welcome container gösterildi');
    } else {
      console.error('❌ Welcome container bulunamadı!');
    }
    
    appState.currentView = 'welcome';
    console.log('✅ Landing page gösterildi - currentView:', appState.currentView);
  }
  
  // Hemen göster
  showLandingPage();
  
  // Ekstra güvenlik için kısa gecikmelerle tekrar göster
  setTimeout(showLandingPage, 50);
  setTimeout(showLandingPage, 200);
  setTimeout(showLandingPage, 500);
  
  // Landing page'in gizlenmesini engelle - sürekli kontrol et
  setInterval(() => {
    if (appState.currentView === 'welcome') {
      const welcomeContainer = document.getElementById('welcome-container');
      const menuContainer = document.getElementById('menu-view-container');
      
      if (welcomeContainer && welcomeContainer.style.display === 'none') {
        console.log('⚠️ Welcome container gizlenmiş, tekrar gösteriliyor...');
        showLandingPage();
      }
      
      if (menuContainer && menuContainer.style.display !== 'none') {
        console.log('⚠️ Menu container görünür, gizleniyor...');
        menuContainer.style.display = 'none';
        menuContainer.classList.add('hidden');
      }
    }
  }, 1000);
});

// Global scope'a fonksiyonları ekle (inline script'lerden erişim için) - HEMEN
console.log('🔧 Global fonksiyonlar window\'a ekleniyor...');
console.log('   loadMenu fonksiyonu:', typeof loadMenu);
console.log('   renderMenu fonksiyonu:', typeof renderMenu);
console.log('   appState:', typeof appState);

window.loadMenu = loadMenu;
window.renderMenu = renderMenu;
window.organizeCategories = organizeCategories;
window._appFunctionsLoaded = true;

// Inline script'i bilgilendir
if (window._resolveAppFunctions && typeof window._resolveAppFunctions === 'function') {
  window._resolveAppFunctions();
  console.log('✅ Promise resolve edildi');
} else {
  console.warn('⚠️ window._resolveAppFunctions bulunamadı');
}

console.log('✅ Global fonksiyonlar eklendi:', {
  loadMenu: typeof window.loadMenu,
  renderMenu: typeof window.renderMenu,
  appState: typeof window.appState,
  _appFunctionsLoaded: window._appFunctionsLoaded
});

// Test: window.loadMenu'nun gerçekten atandığını kontrol et
if (typeof window.loadMenu !== 'function') {
  console.error('❌ KRITIK HATA: window.loadMenu atanamadı!');
} else {
  console.log('✅ window.loadMenu başarıyla atandı ve test edildi');
}

