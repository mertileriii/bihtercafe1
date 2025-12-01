// Bihter Kafe Admin Panel - 4CodePin Style
let currentMainTab = 'dashboard';
let currentUser = null;
let menuItems = [];
let staffList = [];
let tables = [];
let currentOrder = { items: [], tableId: null };
let pendingOrders = []; // Firestore'dan gelen bekleyen siparişler
let ordersUnsubscribe = null; // Sipariş dinleme unsubscribe fonksiyonu
let waiterCallsUnsubscribe = null; // Garson çağrısı dinleme unsubscribe fonksiyonu
let pendingWaiterCalls = []; // Bekleyen garson çağrıları
let currentTableFilter = { status: 'all', category: 'all' }; // Masa filtreleme
window.currentTableFilter = currentTableFilter; // Window'a da ekle (güvenlik için)

// Categories - Ayarlardan yüklenecek veya varsayılan kategoriler
let categories = {
  'hepsi': { name: 'Hepsi', icon: '📋' },
  'sicak-kahveler': { name: 'Sıcak Kahveler', icon: '☕' },
  'soguk-kahveler': { name: 'Soğuk Kahveler', icon: '🧊' },
  'sicak-icecekler': { name: 'Sıcak İçecekler', icon: '🔥' },
  'soguk-icecekler': { name: 'Soğuk İçecekler', icon: '🧊' },
  'helvalar': { name: 'Helvalar', icon: '🍯' },
  'tatlilar': { name: 'Tatlılar', icon: '🍰' },
  'kahveler': { name: 'Kahveler', icon: '☕' },
};

// Kategorileri yükle (localStorage veya ayarlardan)
function loadCategories() {
  try {
    const savedCategories = localStorage.getItem('bihter_categories');
    if (savedCategories) {
      const parsed = JSON.parse(savedCategories);
      // 'hepsi' kategori her zaman olmalı
      categories = { 'hepsi': { name: 'Hepsi', icon: '📋' }, ...parsed };
    }
  } catch (error) {
    console.error('Kategori yükleme hatası:', error);
  }
}

// Kategorileri kaydet
function saveCategories() {
  try {
    // 'hepsi' kategorisini hariç tut
    const toSave = { ...categories };
    delete toSave.hepsi;
    localStorage.setItem('bihter_categories', JSON.stringify(toSave));
  } catch (error) {
    console.error('Kategori kaydetme hatası:', error);
  }
}

// Sayfa yüklendiğinde kategorileri yükle
loadCategories();

const isElectron = typeof window !== 'undefined' && window.electronAPI;

// Initialize tables (will be updated from settings)
function initializeTables(okeyCount = 10, normalCount = 10) {
  tables = [];
  let tableNumber = 1;
  
  // Okey masaları
  for (let i = 0; i < okeyCount; i++) {
    tables.push({
      id: tableNumber,
      number: tableNumber,
      category: 'okey',
      status: 'available', // available, occupied, unpaid
      order: null,
      orders: [],
      totalAmount: 0,
      time: null
    });
    tableNumber++;
  }
  
  // Normal masalar
  for (let i = 0; i < normalCount; i++) {
    tables.push({
      id: tableNumber,
      number: tableNumber,
      category: 'normal',
      status: 'available', // available, occupied, unpaid
      order: null,
      orders: [],
      totalAmount: 0,
      time: null
    });
    tableNumber++;
  }
}

// Başlangıçta varsayılan masa sayılarıyla başlat
initializeTables(10, 10);

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 Admin panel başlatılıyor...');
  console.log('   Electron API:', typeof window !== 'undefined' && window.electronAPI ? '✅ Mevcut' : '❌ Yok');
  
  // Chart.js kontrolü
  setTimeout(() => {
    if (typeof window.Chart === 'undefined') {
      console.warn('⚠️ Chart.js yüklenmedi, grafikler gösterilmeyecek');
    } else {
      console.log('✅ Chart.js yüklendi');
    }
  }, 1000);
  
  // Debug info
  const debugInfo = document.getElementById('debug-info');
  const debugElectron = document.getElementById('debug-electron');
  const debugAPI = document.getElementById('debug-api');
  
  if (debugInfo) {
    debugInfo.classList.remove('hidden');
    if (debugElectron) debugElectron.textContent = typeof window !== 'undefined' && window.electronAPI ? '✅' : '❌';
    if (debugAPI) debugAPI.textContent = window.electronAPI ? '✅' : '❌';
  }
  
  // Wait a bit for Electron to initialize
  setTimeout(() => {
    checkAuth();
    // Sipariş dinlemeyi başlat (checkAuth içinde yapılacak)
  }, 500);
});

// Authentication
async function checkAuth() {
  const savedUser = localStorage.getItem('bihter_admin_user');
  if (savedUser) {
    currentUser = JSON.parse(savedUser);
    document.getElementById('admin-name').textContent = currentUser.name;
    document.getElementById('login-modal').classList.add('hidden');
    document.getElementById('main-panel').classList.remove('hidden');
    loadMainTab('dashboard');
  } else {
    document.getElementById('login-modal').classList.remove('hidden');
    document.getElementById('main-panel').classList.add('hidden');
  }
  
  // Login olsun veya olmasın, sipariş dinlemeyi başlat
  setTimeout(() => {
    console.log('⏰ checkAuth: Sipariş dinleme başlatılıyor...');
    startListeningToOrders();
  }, 1500); // 1.5 saniye bekle ki Electron tam yüklensin
}

async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  
  try {
    console.log('🔐 Login başlatılıyor...');
    console.log('   Email:', email);
    console.log('   Electron API mevcut:', typeof window !== 'undefined' && window.electronAPI);
    
    if (!window.electronAPI) {
      alert('Electron uygulaması gerekli!\n\nLütfen terminal\'den şu komutu çalıştırın:\nnpm start\n\nveya\n\nnpx electron .');
      console.error('❌ Electron API bulunamadı!');
      return;
    }
    
    console.log('📡 API çağrısı yapılıyor...');
    
    // API çağrısını try-catch ile sarmala
    let staff = null;
    try {
      staff = await window.electronAPI.dbGetStaff(email, password);
    } catch (apiError) {
      // EPIPE hatası genellikle kritik değildir, tekrar dene
      if (apiError.message && apiError.message.includes('EPIPE')) {
        console.warn('⚠️ EPIPE hatası, tekrar deneniyor...');
        await new Promise(resolve => setTimeout(resolve, 500));
        staff = await window.electronAPI.dbGetStaff(email, password);
      } else {
        throw apiError;
      }
    }
    
    console.log('📥 API yanıtı:', staff ? 'Kullanıcı bulundu' : 'Kullanıcı bulunamadı');
    
    if (staff && staff.id) {
      console.log('✅ Giriş başarılı!');
      currentUser = staff;
      localStorage.setItem('bihter_admin_user', JSON.stringify(staff));
      document.getElementById('admin-name').textContent = staff.name;
      document.getElementById('login-modal').classList.add('hidden');
      document.getElementById('main-panel').classList.remove('hidden');
      loadMainTab('dashboard');
    } else {
      console.error('❌ Giriş başarısız - Kullanıcı bulunamadı veya şifre yanlış');
      alert('Geçersiz email veya şifre!\n\nVarsayılan bilgiler:\nEmail: admin@bihter.com\nŞifre: admin123\n\nEğer ilk kez başlatıyorsanız, Electron\'un tamamen açılmasını bekleyin.');
    }
  } catch (error) {
    console.error('❌ Login hatası:', error);
    console.error('   Hata detayı:', error.stack);
    
    // EPIPE hatasını görmezden gel
    if (error.message && error.message.includes('EPIPE')) {
      console.warn('⚠️ EPIPE hatası görmezden geliniyor');
      return;
    }
    
    alert('Giriş hatası!\n\nHata: ' + (error.message || 'Bilinmeyen hata') + '\n\nLütfen konsolu (F12 veya Cmd+Option+I) kontrol edin.');
  }
}

function handleLogout() {
  currentUser = null;
  localStorage.removeItem('bihter_admin_user');
  document.getElementById('login-modal').classList.remove('hidden');
  document.getElementById('main-panel').classList.add('hidden');
}

// Main Tab Management
function switchMainTab(tab) {
  currentMainTab = tab;
  
  // Update nav styles
  document.querySelectorAll('.nav-tab').forEach(btn => {
    if (btn.dataset.tab === tab) {
      btn.classList.add('bg-blue-700');
      btn.classList.remove('hover:bg-blue-700');
    } else {
      btn.classList.remove('bg-blue-700');
      btn.classList.add('hover:bg-blue-700');
    }
  });
  
  // Clear table polling when leaving tables tab
  if (tab !== 'tables' && tablePollInterval) {
    clearInterval(tablePollInterval);
    tablePollInterval = null;
  }
  
  loadMainTab(tab);
}

async function loadMainTab(tab) {
  const content = document.getElementById('main-content');
  content.innerHTML = '<div class="text-center p-10 text-gray-500">Yükleniyor...</div>';
  
  switch(tab) {
    case 'dashboard':
      loadDashboard();
      break;
    case 'tables':
      await loadTablesView();
      break;
    case 'menu':
      await loadMenuView();
      break;
    case 'orders':
      await loadOrdersView();
      break;
    case 'order-history':
      await loadOrderHistory();
      break;
    case 'notifications':
      loadNotificationsView();
      break;
    case 'reports':
      await loadReports();
      break;
    case 'staff':
      await loadStaffManagement();
      break;
    case 'settings':
      await loadSettingsView();
      break;
  }
}

// Dashboard View (Ana Sayfa)
function loadDashboard() {
  const content = document.getElementById('main-content');
  
  let html = `
    <div class="max-w-7xl mx-auto">
      <!-- Header -->
      <div class="mb-8">
        <h1 class="text-4xl font-bold text-gray-800 mb-2">Bihter Cafe - Lounge</h1>
        <p class="text-gray-500">Admin Panel Dashboard</p>
      </div>
      
      <!-- Günlük Operasyon -->
      <div class="mb-10">
        <h2 class="text-2xl font-bold text-gray-800 mb-6">Günlük Operasyon</h2>
        <div class="grid grid-cols-4 gap-6">
          <div onclick="switchMainTab('orders')" class="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl shadow-lg p-8 cursor-pointer hover:shadow-2xl transition-all hover:scale-105 border-2 border-blue-200 hover:border-blue-400">
            <div class="text-6xl mb-4 text-center">📋</div>
            <h3 class="text-xl font-bold text-gray-800 text-center mb-2">Sipariş</h3>
            <p class="text-sm text-gray-600 text-center">Yeni sipariş alın</p>
          </div>
          
          <div onclick="switchMainTab('tables')" class="bg-gradient-to-br from-green-50 to-green-100 rounded-xl shadow-lg p-8 cursor-pointer hover:shadow-2xl transition-all hover:scale-105 border-2 border-green-200 hover:border-green-400">
            <div class="text-6xl mb-4 text-center">🪑</div>
            <h3 class="text-xl font-bold text-gray-800 text-center mb-2">Masa</h3>
            <p class="text-sm text-gray-600 text-center">Masa yönetimi</p>
          </div>
          
          <div onclick="switchMainTab('reports')" class="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl shadow-lg p-8 cursor-pointer hover:shadow-2xl transition-all hover:scale-105 border-2 border-purple-200 hover:border-purple-400">
            <div class="text-6xl mb-4 text-center">📊</div>
            <h3 class="text-xl font-bold text-gray-800 text-center mb-2">Raporlar</h3>
            <p class="text-sm text-gray-600 text-center">Satış raporları</p>
          </div>
          
          <div onclick="switchMainTab('staff')" class="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl shadow-lg p-8 cursor-pointer hover:shadow-2xl transition-all hover:scale-105 border-2 border-orange-200 hover:border-orange-400">
            <div class="text-6xl mb-4 text-center">👥</div>
            <h3 class="text-xl font-bold text-gray-800 text-center mb-2">Çalışan/Vardiya</h3>
            <p class="text-sm text-gray-600 text-center">Personel yönetimi</p>
          </div>
        </div>
      </div>
      
      <!-- Yönetim -->
      <div class="mb-10">
        <h2 class="text-2xl font-bold text-gray-800 mb-6">Yönetim</h2>
        <div class="grid grid-cols-4 gap-6">
          <div onclick="switchMainTab('settings')" class="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl shadow-lg p-8 cursor-pointer hover:shadow-2xl transition-all hover:scale-105 border-2 border-gray-200 hover:border-gray-400">
            <div class="text-6xl mb-4 text-center">⚙️</div>
            <h3 class="text-xl font-bold text-gray-800 text-center mb-2">Ayarlar</h3>
            <p class="text-sm text-gray-600 text-center">Sistem ayarları</p>
          </div>
          
          <div onclick="switchMainTab('menu')" class="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-xl shadow-lg p-8 cursor-pointer hover:shadow-2xl transition-all hover:scale-105 border-2 border-indigo-200 hover:border-indigo-400">
            <div class="text-6xl mb-4 text-center">📦</div>
            <h3 class="text-xl font-bold text-gray-800 text-center mb-2">Envanter</h3>
            <p class="text-sm text-gray-600 text-center">Ürün yönetimi</p>
          </div>
          
          <div onclick="alert('Üyelik sistemi yakında eklenecek')" class="bg-gradient-to-br from-pink-50 to-pink-100 rounded-xl shadow-lg p-8 cursor-pointer hover:shadow-2xl transition-all hover:scale-105 border-2 border-pink-200 hover:border-pink-400">
            <div class="text-6xl mb-4 text-center">👤</div>
            <h3 class="text-xl font-bold text-gray-800 text-center mb-2">Üyelik</h3>
            <p class="text-sm text-gray-600 text-center">Müşteri üyelikleri</p>
          </div>
        </div>
      </div>
      
      <!-- Entegrasyon -->
      <div class="mb-10">
        <h2 class="text-2xl font-bold text-gray-800 mb-6">Entegrasyon</h2>
        <div class="grid grid-cols-4 gap-6">
          <div onclick="alert('Masa QR kodu yakında eklenecek')" class="bg-gradient-to-br from-teal-50 to-teal-100 rounded-xl shadow-lg p-8 cursor-pointer hover:shadow-2xl transition-all hover:scale-105 border-2 border-teal-200 hover:border-teal-400">
            <div class="text-6xl mb-4 text-center">📱</div>
            <h3 class="text-xl font-bold text-gray-800 text-center mb-2">Masa QR Kodu</h3>
            <p class="text-sm text-gray-600 text-center">QR kod yönetimi</p>
          </div>
          
          <div onclick="alert('Teslimat entegrasyonu yakında eklenecek')" class="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl shadow-lg p-8 cursor-pointer hover:shadow-2xl transition-all hover:scale-105 border-2 border-yellow-200 hover:border-yellow-400">
            <div class="text-6xl mb-4 text-center">🚚</div>
            <h3 class="text-xl font-bold text-gray-800 text-center mb-2">Teslimat Entegrasyonu</h3>
            <p class="text-sm text-gray-600 text-center">Teslimat servisleri</p>
          </div>
        </div>
      </div>
    </div>
  `;
  
  content.innerHTML = html;
}

// Tables View (4CodePin style)
let tablePollInterval = null;

async function loadTablesView() {
  if (!isElectron) return;
  
  try {
    // Load all orders (pending and completed) to update table status
    const orders = await window.electronAPI.dbGetOrders();
    
    // Firestore'dan gelen bekleyen siparişleri de ekle (henüz SQLite'a kaydedilmemiş olanlar)
    const allOrders = [...orders];
    if (pendingOrders && pendingOrders.length > 0) {
      pendingOrders.forEach(pendingOrder => {
        // Eğer bu sipariş SQLite'da yoksa, ekle
        const existsInSQLite = orders.find(o => o.id === pendingOrder.id);
        if (!existsInSQLite && pendingOrder.status === 'pending') {
          allOrders.push(pendingOrder);
        }
      });
    }
    
    updateTableStatus(allOrders);
    
    // Gerçek zamanlı güncelleme (her 3 saniyede bir)
    if (tablePollInterval) {
      clearInterval(tablePollInterval);
    }
    tablePollInterval = setInterval(async () => {
      if (currentMainTab === 'tables') {
        try {
          // Filtre değişkeni kontrolü
          if (typeof currentTableFilter === 'undefined' || !currentTableFilter) {
            currentTableFilter = window.currentTableFilter || { status: 'all', category: 'all' };
            window.currentTableFilter = currentTableFilter;
          }
          const orders = await window.electronAPI.dbGetOrders();
          
          // Firestore'dan gelen bekleyen siparişleri de ekle
          const allOrders = [...orders];
          if (pendingOrders && pendingOrders.length > 0) {
            pendingOrders.forEach(pendingOrder => {
              const existsInSQLite = orders.find(o => o.id === pendingOrder.id);
              if (!existsInSQLite && pendingOrder.status === 'pending') {
                allOrders.push(pendingOrder);
              }
            });
          }
          
          updateTableStatus(allOrders);
          renderTablesView();
        } catch (error) {
          console.error('Tables refresh error:', error);
          console.error('Error stack:', error.stack);
          // Hata durumunda filtreyi sıfırla
          currentTableFilter = { status: 'all', category: 'all' };
          window.currentTableFilter = currentTableFilter;
        }
      }
    }, 3000);
    
    renderTablesView();
  } catch (error) {
    console.error('Tables load error:', error);
  }
}

function updateTableStatus(orders) {
  // Reset all tables
  tables.forEach(table => {
    table.status = 'available';
    table.order = null;
    table.orders = []; // Tüm aktif siparişler bu masada
    table.pendingOrders = []; // Bekleyen siparişler (henüz kabul edilmemiş)
    table.totalAmount = 0;
    table.time = null;
  });
  
  // Update from orders (show received, unpaid, pending orders)
  orders.forEach(order => {
    // Show orders that are not completed or paid
    const status = order.status ? order.status.toLowerCase() : 'pending';
    if (status === 'completed' || status === 'paid') {
      return; // Sadece tamamlanmamış siparişleri göster
    }
    
    const tableId = parseInt(order.tableId || order.table_id || 0);
    if (!tableId || tableId === 0) return;
    
    const table = tables.find(t => t.number === tableId);
    if (table) {
      // Masa durumunu "dolu" yap
      if (table.status === 'available') {
        table.status = 'occupied'; // Dolu
      }
      
      // Bu masanın siparişlerini topla
      if (!table.orders) {
        table.orders = [];
      }
      table.orders.push(order);
      
      // Bekleyen siparişleri ayrı tut (henüz kabul edilmemiş)
      if (!table.pendingOrders) {
        table.pendingOrders = [];
      }
      // Status kontrolü: 'pending', null, undefined, veya boş string ise bekleyen sipariş
      const isPending = status === 'pending' || !status || status === '' || status === null || status === undefined;
      if (isPending) {
        // Aynı sipariş zaten eklenmemişse ekle
        const alreadyExists = table.pendingOrders.find(po => po.id === order.id);
        if (!alreadyExists) {
          table.pendingOrders.push(order);
          console.log(`⏳ Bekleyen sipariş eklendi: Masa ${tableId}, Sipariş ID: ${order.id}, Status: ${status || 'null/undefined'}`);
        }
      }
      
      // İlk siparişi ana sipariş olarak göster (en eski)
      if (!table.order || new Date(order.createdAt) < new Date(table.time)) {
        table.order = order;
        table.time = order.createdAt;
      }
      
      // Toplam tutarı güncelle (tüm aktif siparişlerin toplamı)
      table.totalAmount = (table.totalAmount || 0) + (parseFloat(order.totalAmount) || 0);
    }
  });
  
  // Debug: Bekleyen siparişleri kontrol et
  const tablesWithPending = tables.filter(t => t.pendingOrders && t.pendingOrders.length > 0);
  if (tablesWithPending.length > 0) {
    console.log(`📊 ${tablesWithPending.length} masada bekleyen sipariş var:`);
    tablesWithPending.forEach(table => {
      console.log(`   Masa ${table.number}: ${table.pendingOrders.length} bekleyen sipariş`);
    });
  } else {
    console.log('📊 Bekleyen sipariş yok');
  }
}

function renderTablesView() {
  const content = document.getElementById('main-content');
  
  // Filtre değişkeni kontrolü - eğer tanımlı değilse başlat
  if (typeof currentTableFilter === 'undefined') {
    currentTableFilter = { status: 'all', category: 'all' };
    window.currentTableFilter = currentTableFilter;
  }
  
  // Window'dan al (eğer local scope'ta yoksa)
  if (!currentTableFilter && window.currentTableFilter) {
    currentTableFilter = window.currentTableFilter;
  }
  
  const availableCount = tables.filter(t => t.status === 'available').length;
  const occupiedCount = tables.filter(t => t.status === 'occupied').length;
  
  // Filtre değişkeni kontrolü ve güvenli kullanım (butonlar için önce tanımla)
  let filter;
  try {
    filter = currentTableFilter || window.currentTableFilter || { status: 'all', category: 'all' };
  } catch (e) {
    filter = { status: 'all', category: 'all' };
  }
  
  if (!filter) {
    filter = { status: 'all', category: 'all' };
  }
  
  // Filtre değerlerini normalize et
  if (!filter.status) filter.status = 'all';
  if (!filter.category) filter.category = 'all';
  
  let html = `
    <div class="mb-6">
      <div class="flex items-center justify-between mb-4">
        <div class="flex items-center gap-4">
          <input type="text" placeholder="🔍 Masa numarası ara" 
                 class="px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
                 onkeyup="filterTables(this.value)">
        </div>
        <div class="flex gap-2 flex-wrap">
          <button onclick="resetTableFilters()" class="px-4 py-2 ${filter.status === 'all' && filter.category === 'all' ? 'bg-blue-500 text-white' : 'bg-gray-200 hover:bg-gray-300'} rounded-lg font-semibold transition-colors">
            Hepsi
          </button>
          <button onclick="filterTablesByCategory('okey')" class="px-4 py-2 ${filter.category === 'okey' ? 'bg-green-500 text-white' : 'bg-green-100 hover:bg-green-200'} rounded-lg font-semibold transition-colors">
            🎴 Okey (${tables.filter(t => t.category === 'okey').length})
          </button>
          <button onclick="filterTablesByCategory('normal')" class="px-4 py-2 ${filter.category === 'normal' ? 'bg-blue-500 text-white' : 'bg-blue-100 hover:bg-blue-200'} rounded-lg font-semibold transition-colors">
            🪑 Normal (${tables.filter(t => t.category === 'normal').length})
          </button>
          <button onclick="filterTablesByStatus('available')" class="px-4 py-2 ${filter.status === 'available' ? 'bg-green-500 text-white' : 'bg-green-100 hover:bg-green-200'} rounded-lg font-semibold transition-colors">
            Müsait (${availableCount})
          </button>
          <button onclick="filterTablesByStatus('occupied')" class="px-4 py-2 ${filter.status === 'occupied' ? 'bg-orange-500 text-white' : 'bg-orange-100 hover:bg-orange-200'} rounded-lg font-semibold relative transition-colors">
            Dolu (${occupiedCount})
            ${occupiedCount > 0 ? '<span class="absolute -top-1 -right-1 w-3 h-3 bg-orange-500 rounded-full"></span>' : ''}
          </button>
        </div>
      </div>
      
      <div id="tables-grid" class="grid grid-cols-5 gap-4">
  `;
  
  // Masaları filtrele
  let filteredTables = tables;
  
  if (filter.status && filter.status !== 'all') {
    filteredTables = filteredTables.filter(t => t.status === filter.status);
  }
  
  if (filter.category && filter.category !== 'all') {
    filteredTables = filteredTables.filter(t => (t.category || 'normal') === filter.category);
  }
  
  filteredTables.forEach(table => {
    const isOccupied = table.status === 'occupied';
    const ordersCount = table.orders ? table.orders.length : 0;
    const pendingOrdersCount = table.pendingOrders ? table.pendingOrders.length : 0;
    const hasPendingOrders = pendingOrdersCount > 0;
    const minutes = table.time ? Math.floor((new Date() - new Date(table.time)) / 60000) : null;
    const category = table.category || 'normal';
    const categoryBadge = category === 'okey' ? '🎴 Okey' : '🪑 Normal';
    const categoryColor = category === 'okey' ? 'green' : 'blue';
    
    // Debug log
    if (hasPendingOrders) {
      console.log(`⚠️ Masa ${table.number}: ${pendingOrdersCount} bekleyen sipariş var`, table.pendingOrders.map(po => ({ id: po.id, status: po.status })));
    }
    
    html += `
      <div class="table-card bg-white rounded-xl shadow-lg p-4 cursor-pointer text-center transition-all hover:shadow-xl ${isOccupied ? 'active border-2 border-orange-500 bg-orange-50' : ''} ${hasPendingOrders ? 'border-2 border-yellow-500 bg-yellow-50' : ''}"
           onclick="selectTable(${table.number})">
        ${hasPendingOrders ? `
          <div class="bg-yellow-500 text-white text-xs font-bold px-3 py-2 rounded-lg mb-2 animate-pulse shadow-lg">
            ⏳ Siparişin kabul edilmesi bekleniyor
          </div>
        ` : ''}
        <div class="text-xs mb-1 px-2 py-1 rounded-full inline-block ${category === 'okey' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}">
          ${categoryBadge}
        </div>
        ${isOccupied && minutes ? `<div class="text-xs ${isOccupied ? 'text-orange-600' : 'text-gray-600'} mb-1">${minutes} dk</div>` : ''}
        <div class="text-3xl font-bold mb-2 ${isOccupied ? 'text-orange-600' : 'text-gray-700'}">${table.number}</div>
        ${isOccupied ? `
          <div class="text-xs text-orange-600 mb-1">${ordersCount} sipariş${hasPendingOrders ? ` (${pendingOrdersCount} bekliyor)` : ''}</div>
          <div class="text-lg font-bold text-orange-600">${(table.totalAmount || 0).toFixed(2)}₺</div>
        ` : hasPendingOrders ? `
          <div class="text-xs text-yellow-700 mb-1 font-semibold">${pendingOrdersCount} sipariş bekliyor</div>
          <div class="text-sm text-yellow-700">Kabul edilmeyi bekliyor</div>
        ` : '<div class="text-xs text-gray-400">Müsait</div>'}
      </div>
    `;
  });
  
  html += `</div></div>`;
  content.innerHTML = html;
}


function filterTablesByStatus(status) {
  try {
    if (typeof currentTableFilter === 'undefined') {
      currentTableFilter = { status: 'all', category: 'all' };
      window.currentTableFilter = currentTableFilter;
    }
    // Status filtresine basıldığında category'yi sıfırla (tüm kategorileri göster)
    currentTableFilter.status = status;
    currentTableFilter.category = 'all'; // Status filtrelendiğinde kategori filtresini kaldır
    window.currentTableFilter = currentTableFilter;
    console.log('📊 Status filtresi uygulandı:', status, 'Category sıfırlandı');
    renderTablesView();
  } catch (error) {
    console.error('filterTablesByStatus error:', error);
    currentTableFilter = { status: 'all', category: 'all' };
    window.currentTableFilter = currentTableFilter;
    renderTablesView();
  }
}

function filterTablesByCategory(category) {
  try {
    if (typeof currentTableFilter === 'undefined') {
      currentTableFilter = { status: 'all', category: 'all' };
      window.currentTableFilter = currentTableFilter;
    }
    // Kategori filtresine basıldığında status'u sıfırla (tüm durumları göster)
    if (category === 'all') {
      currentTableFilter.category = 'all';
    } else {
      currentTableFilter.category = category;
    }
    currentTableFilter.status = 'all'; // Kategori filtrelendiğinde status filtresini kaldır
    window.currentTableFilter = currentTableFilter;
    console.log('📊 Kategori filtresi uygulandı:', category, 'Status sıfırlandı');
    renderTablesView();
  } catch (error) {
    console.error('filterTablesByCategory error:', error);
    currentTableFilter = { status: 'all', category: 'all' };
    window.currentTableFilter = currentTableFilter;
    renderTablesView();
  }
}

function filterTables(value) {
  // Arama filtreleme (ileride eklenebilir)
  renderTablesView();
}

// Tüm filtreleri sıfırla
function resetTableFilters() {
  try {
    currentTableFilter = { status: 'all', category: 'all' };
    window.currentTableFilter = currentTableFilter;
    console.log('📊 Tüm filtreler sıfırlandı');
    renderTablesView();
  } catch (error) {
    console.error('resetTableFilters error:', error);
    currentTableFilter = { status: 'all', category: 'all' };
    window.currentTableFilter = currentTableFilter;
    renderTablesView();
  }
}

// Global scope'a ekle
window.filterTablesByStatus = filterTablesByStatus;
window.filterTablesByCategory = filterTablesByCategory;
window.filterTables = filterTables;
window.resetTableFilters = resetTableFilters;

async function selectTable(tableNumber) {
  const table = tables.find(t => t.number === tableNumber);
  
  if (!table) return;
  
  if (table.status === 'occupied' && table.orders && table.orders.length > 0) {
    // Show all orders for this table
    await showTableOrders(tableNumber, table.orders);
  } else {
    // Create new order for this table - switch to menu tab to add products
    currentOrder = { items: [], tableId: tableNumber };
    switchMainTab('menu');
    // Show table number in menu view
    setTimeout(() => {
      updateOrderSummary();
    }, 100);
  }
}

// Masa siparişlerini göster (tüm aktif siparişler)
async function showTableOrders(tableNumber, orders) {
  const modal = document.getElementById('order-modal');
  const title = document.getElementById('order-modal-title');
  const content = document.getElementById('order-modal-content');
  
  title.textContent = `Masa ${tableNumber} - Tüm Siparişler (${orders.length})`;
  
  let html = '';
  let totalAmount = 0;
  
  orders.forEach((order, index) => {
    const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
    const date = new Date(order.createdAt).toLocaleString('tr-TR');
    const orderTotal = parseFloat(order.totalAmount) || 0;
    totalAmount += orderTotal;
    
    html += `
      <div class="mb-6 pb-6 border-b ${index < orders.length - 1 ? 'border-gray-200' : 'border-transparent'}">
        <div class="flex justify-between items-center mb-3">
          <div>
            <h4 class="font-bold text-lg">Sipariş ${index + 1}</h4>
            <p class="text-sm text-gray-600">${order.orderNumber || order.id}</p>
            <p class="text-xs text-gray-500">${date}</p>
          </div>
          <div class="text-right">
            <span class="px-3 py-1 rounded-full text-sm font-semibold ${
              order.status === 'received' ? 'bg-blue-100 text-blue-800' : 
              order.status === 'unpaid' ? 'bg-orange-100 text-orange-800' : 
              'bg-yellow-100 text-yellow-800'
            }">
              ${order.status === 'received' ? '✅ Kabul Edildi' : 
                order.status === 'unpaid' ? '💰 Ödeme Bekliyor' : 
                '⏳ Bekliyor'}
            </span>
          </div>
        </div>
        
        <div class="space-y-2 mb-3">
    `;
    
    items.forEach(item => {
      html += `
        <div class="flex justify-between items-center p-2 bg-gray-50 rounded-lg">
          <div>
            <div class="font-semibold text-sm">${item.menuItemName || item.name}</div>
            <div class="text-xs text-gray-600">${(item.unitPrice || 0).toFixed(2)}₺ × ${item.quantity || 1}</div>
          </div>
          <div class="font-bold text-blue-600 text-sm">
            ${((item.unitPrice || 0) * (item.quantity || 1)).toFixed(2)}₺
          </div>
        </div>
      `;
    });
    
    html += `
        </div>
        <div class="flex justify-end">
          <span class="font-bold text-orange-600">Toplam: ${orderTotal.toFixed(2)}₺</span>
        </div>
      </div>
    `;
  });
  
  html += `
    <div class="mt-6 pt-4 border-t-2 border-orange-500">
      <div class="flex justify-between items-center mb-4">
        <span class="text-xl font-bold">Genel Toplam:</span>
        <span class="text-2xl font-extrabold text-orange-600">${totalAmount.toFixed(2)}₺</span>
      </div>
      
      <div class="flex gap-3">
        <button onclick="markAllOrdersAsPaid(${tableNumber})" 
                class="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-4 rounded-lg">
          ✅ Tümünü Ödendi İşaretle
        </button>
        <button onclick="closeOrderModal()" 
                class="px-4 py-3 bg-gray-200 text-gray-800 font-semibold rounded-lg hover:bg-gray-300">
          Kapat
        </button>
      </div>
    </div>
  `;
  
  content.innerHTML = html;
  modal.classList.remove('hidden');
}

async function showOrderDetails(order, tableNumber) {
  const modal = document.getElementById('order-modal');
  const title = document.getElementById('order-modal-title');
  const content = document.getElementById('order-modal-content');
  
  title.textContent = `Masa ${tableNumber} - Sipariş Detayı`;
  
  const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
  const date = new Date(order.createdAt).toLocaleString('tr-TR');
  
  let html = `
    <div class="mb-4 pb-4 border-b">
      <div class="flex justify-between items-center mb-2">
        <span class="text-sm text-gray-600">Sipariş No:</span>
        <span class="font-semibold">${order.orderNumber || order.id}</span>
      </div>
      <div class="flex justify-between items-center mb-2">
        <span class="text-sm text-gray-600">Tarih:</span>
        <span class="font-semibold">${date}</span>
      </div>
      <div class="flex justify-between items-center">
        <span class="text-sm text-gray-600">Ödeme:</span>
        <span class="px-3 py-1 rounded-full text-sm ${order.paymentMethod === 'card' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}">
          ${order.paymentMethod === 'card' ? '💳 Kart' : '💵 Nakit'}
        </span>
      </div>
    </div>
    
    <div class="mb-4">
      <h3 class="font-bold text-lg mb-3">Sipariş İçeriği</h3>
      <div class="space-y-2">
  `;
  
  items.forEach(item => {
    html += `
      <div class="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
        <div>
          <div class="font-semibold">${item.menuItemName || item.name}</div>
          <div class="text-sm text-gray-600">${(item.unitPrice || 0).toFixed(2)}₺ × ${item.quantity || 1}</div>
        </div>
        <div class="font-bold text-blue-600">
          ${((item.unitPrice || 0) * (item.quantity || 1)).toFixed(2)}₺
        </div>
      </div>
    `;
  });
  
  html += `
      </div>
    </div>
    
    <div class="flex justify-between items-center pt-4 border-t">
      <span class="text-xl font-bold">Toplam:</span>
      <span class="text-2xl font-extrabold text-blue-600">${(order.totalAmount || 0).toFixed(2)}₺</span>
    </div>
    
    <div class="mt-6 flex gap-3">
      <button onclick="markOrderAsPaid('${order.id}', ${tableNumber})" 
              class="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-4 rounded-lg">
        ✅ Ödendi Olarak İşaretle
      </button>
      <button onclick="closeOrderModal()" 
              class="px-4 py-3 bg-gray-200 text-gray-800 font-semibold rounded-lg hover:bg-gray-300">
        Kapat
      </button>
    </div>
  `;
  
  content.innerHTML = html;
  modal.classList.remove('hidden');
}

function closeOrderModal() {
  const modal = document.getElementById('order-modal');
  modal.classList.add('hidden');
}

async function markOrderAsPaid(orderId, tableNumber) {
  if (!confirm('Bu sipariş ödendi olarak işaretlenecek. Emin misiniz?')) return;
  
  try {
    // Orders tablosunu güncelle (status: completed)
    // Şimdilik order'ı silerek masayı boşalt (veya status güncellemesi için bir fonksiyon eklenebilir)
    alert('Sipariş ödendi olarak işaretlendi!\n\nNot: Şimdilik sipariş silinmiyor, sadece masa boşaltılıyor.');
    closeOrderModal();
    await loadTablesView();
  } catch (error) {
    console.error('Mark as paid error:', error);
    alert('Hata oluştu!');
  }
}

// Ödeme yöntemi seçimi için değişken
let pendingTablePayment = null;

async function markAllOrdersAsPaid(tableNumber) {
  const table = tables.find(t => t.number === tableNumber);
  if (!table || !table.orders || table.orders.length === 0) {
    alert('Bu masada sipariş bulunamadı!');
    return;
  }
  
  // Ödeme yöntemi seçim modalını aç
  pendingTablePayment = {
    tableNumber: tableNumber,
    orders: table.orders
  };
  
  // Masa numarasını modal'a yaz
  document.getElementById('payment-table-number').textContent = tableNumber;
  
  // Ödeme modalını göster
  const paymentModal = document.getElementById('payment-modal');
  paymentModal.classList.remove('hidden');
}

function closePaymentModal() {
  const paymentModal = document.getElementById('payment-modal');
  paymentModal.classList.add('hidden');
  pendingTablePayment = null;
}

async function selectPaymentMethod(paymentMethod) {
  if (!pendingTablePayment || !pendingTablePayment.orders) {
    alert('Sipariş bilgisi bulunamadı!');
    closePaymentModal();
    return;
  }
  
  const { tableNumber, orders } = pendingTablePayment;
  const paymentMethodText = paymentMethod === 'card' ? 'Kart' : 'Nakit';
  
  if (!confirm(`Masa ${tableNumber}'daki ${orders.length} sipariş ${paymentMethodText} ile ödendi olarak işaretlenecek. Emin misiniz?`)) {
    return;
  }
  
  try {
    if (!isElectron || !window.electronAPI || !window.electronAPI.dbUpdateMultipleOrders) {
      alert('Electron API mevcut değil!');
      closePaymentModal();
      return;
    }
    
    // Tüm sipariş ID'lerini topla
    const orderIds = orders.map(order => order.id);
    
    console.log(`💳 ${orderIds.length} sipariş güncelleniyor:`, {
      tableNumber,
      paymentMethod,
      orderIds
    });
    
    // Siparişleri toplu olarak güncelle
    const result = await window.electronAPI.dbUpdateMultipleOrders(orderIds, {
      status: 'completed',
      paymentMethod: paymentMethod
    });
    
    if (result && result.success) {
      console.log(`✅ ${result.updatedCount} sipariş başarıyla güncellendi`);
      
      // Modal'ları kapat
      closePaymentModal();
      closeOrderModal();
      
      // Masa görünümünü yenile
      await loadTablesView();
      
      alert(`✅ Masa ${tableNumber}'daki ${result.updatedCount} sipariş ${paymentMethodText} ile ödendi olarak işaretlendi ve raporlara kaydedildi!`);
    } else {
      throw new Error(result?.error || 'Siparişler güncellenemedi');
    }
  } catch (error) {
    console.error('❌ Sipariş güncelleme hatası:', error);
    alert('Siparişler güncellenirken hata oluştu: ' + error.message);
  } finally {
    pendingTablePayment = null;
  }
}

// Global scope'a ekle
window.markAllOrdersAsPaid = markAllOrdersAsPaid;
window.selectPaymentMethod = selectPaymentMethod;
window.closePaymentModal = closePaymentModal;

// Menu View (4CodePin style)
async function loadMenuView() {
  if (!isElectron) return;
  
  try {
    // Kategorileri yükle
    loadCategories();
    
    menuItems = await window.electronAPI.dbGetMenuItems(null, true);
    renderMenuView();
    
    // Ürün modal'ındaki kategori select'ini güncelle
    setTimeout(() => {
      updateProductCategorySelect();
    }, 100);
  } catch (error) {
    console.error('Menu load error:', error);
  }
}

let currentMenuCategory = 'hepsi';

function renderMenuView() {
  const content = document.getElementById('main-content');
  
  let html = `
    <div class="flex gap-4 h-[calc(100vh-120px)]">
      <!-- Left: Categories -->
      <div class="w-64 bg-white rounded-lg shadow-lg p-4 overflow-y-auto">
        <div class="flex justify-between items-center mb-4">
          <h3 class="font-bold text-lg text-gray-800">Kategoriler</h3>
          <button onclick="openCategoryModal()" 
                  class="bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold px-3 py-1 rounded-lg">
            + Ekle
          </button>
        </div>
        <div id="categories-list" class="space-y-2">
  `;
  
  Object.keys(categories).forEach(catKey => {
    if (catKey === 'hepsi') {
      html += `
        <div onclick="filterByCategory('${catKey}')" 
             class="category-item p-3 rounded-lg cursor-pointer ${catKey === currentMenuCategory ? 'active bg-blue-600 text-white' : 'hover:bg-gray-100'}">
          <span class="mr-2">${categories[catKey].icon}</span>
          ${categories[catKey].name}
        </div>
      `;
    } else {
      html += `
        <div onclick="filterByCategory('${catKey}')" 
             class="category-item p-3 rounded-lg cursor-pointer group ${catKey === currentMenuCategory ? 'active bg-blue-600 text-white' : 'hover:bg-gray-100'}">
          <div class="flex justify-between items-center">
            <div class="flex items-center">
              <span class="mr-2">${categories[catKey].icon}</span>
              <span>${categories[catKey].name}</span>
            </div>
            <button onclick="event.stopPropagation(); deleteCategory('${catKey}')" 
                    class="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 text-sm">
              🗑️
            </button>
          </div>
        </div>
      `;
    }
  });
  
  html += `
        </div>
      </div>
      
      <!-- Center: Products Grid -->
      <div class="flex-1 bg-white rounded-lg shadow-lg p-4 overflow-y-auto">
        <div class="mb-4 flex justify-between items-center">
          <input type="text" id="menu-search" placeholder="🔍 Ürün adı veya ürün kodu ara" 
                 onkeyup="searchMenuItems(this.value)"
                 class="flex-1 px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 mr-4">
          <button onclick="openProductModal()" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg">
            + Ürün Ekle
          </button>
        </div>
        <div id="products-grid" class="grid grid-cols-4 gap-4">
  `;
  
  menuItems.forEach(item => {
    html += `
      <div onclick="addProductToOrder('${item.id}')" 
           class="bg-gray-50 rounded-lg p-4 hover:bg-blue-50 hover:border-2 hover:border-blue-500 transition relative group cursor-pointer">
        <h4 class="font-bold text-gray-800 mb-1">${item.name}</h4>
        <p class="text-2xl font-bold text-blue-600">${(item.price || 0).toFixed(2)}₺</p>
        ${item.description ? `<p class="text-xs text-gray-500 mt-1">${item.description}</p>` : ''}
        <div class="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition">
          <button onclick="event.stopPropagation(); editMenuItem('${item.id}')" 
                  class="bg-blue-500 hover:bg-blue-600 text-white text-xs px-2 py-1 rounded mr-1">✏️</button>
          <button onclick="event.stopPropagation(); deleteMenuItem('${item.id}')" 
                  class="bg-red-500 hover:bg-red-600 text-white text-xs px-2 py-1 rounded">🗑️</button>
        </div>
      </div>
    `;
  });
  
  html += `
        </div>
      </div>
      
      <!-- Right: Order Summary -->
      <div class="w-80 bg-white rounded-lg shadow-lg p-4 flex flex-col">
        <h3 class="font-bold text-lg mb-2 text-gray-800">Sipariş Özeti</h3>
        ${currentOrder.tableId ? `<div class="mb-2 text-sm text-gray-600">Masa: <span class="font-bold text-blue-600">${currentOrder.tableId}</span></div>` : ''}
        <div id="order-items" class="flex-1 overflow-y-auto mb-4">
          <div class="text-center text-gray-400 py-10">
            <div class="text-4xl mb-2">📝</div>
            <p>Lütfen ürün seçin</p>
          </div>
        </div>
        <div class="border-t pt-4">
          <div class="flex justify-between items-center mb-4">
            <span class="font-bold text-lg">Toplam:</span>
            <span class="text-2xl font-bold text-blue-600" id="order-total">0,00₺</span>
          </div>
          <button onclick="completeOrder()" 
                  class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg">
            ${currentOrder.tableId ? `Masa ${currentOrder.tableId} - Siparişi Tamamla` : 'Siparişi Tamamla'}
          </button>
        </div>
      </div>
    </div>
  `;
  
  content.innerHTML = html;
}

function filterByCategory(category) {
  currentMenuCategory = category;
  
  // Update category styles
  document.querySelectorAll('.category-item').forEach(item => {
    item.classList.remove('active', 'bg-blue-600', 'text-white');
    item.classList.add('hover:bg-gray-100');
  });
  
  event.target.closest('.category-item').classList.add('active', 'bg-blue-600', 'text-white');
  event.target.closest('.category-item').classList.remove('hover:bg-gray-100');
  
  // Filter products
  searchMenuItems(document.getElementById('menu-search')?.value || '');
}

function searchMenuItems(searchTerm = '') {
  const productsGrid = document.getElementById('products-grid');
  if (!productsGrid) return;
  
  let filtered = menuItems;
  
  // Category filter
  if (currentMenuCategory && currentMenuCategory !== 'hepsi') {
    filtered = filtered.filter(item => item.category === currentMenuCategory);
  }
  
  // Search filter
  if (searchTerm.trim()) {
    const term = searchTerm.toLowerCase();
    filtered = filtered.filter(item => 
      (item.name || '').toLowerCase().includes(term) ||
      (item.description || '').toLowerCase().includes(term)
    );
  }
  
  renderProducts(filtered);
}

function addProductToOrder(productId) {
  const product = menuItems.find(p => p.id === productId);
  if (!product) return;
  
  // Initialize currentOrder if not exists
  if (!currentOrder) {
    currentOrder = { items: [], tableId: null };
  }
  
  // Check if product already in cart
  const existingItem = currentOrder.items.find(item => item.id === productId);
  
  if (existingItem) {
    existingItem.quantity += 1;
  } else {
    currentOrder.items.push({
      id: productId,
      name: product.name,
      price: parseFloat(product.price) || 0,
      quantity: 1
    });
  }
  
  updateOrderSummary();
}

// Alias for compatibility
function addToOrder(productId) {
  addProductToOrder(productId);
}

function renderProducts(filteredItems) {
  const productsGrid = document.getElementById('products-grid');
  if (!productsGrid) return;
  
  if (filteredItems.length === 0) {
    productsGrid.innerHTML = '<div class="col-span-4 text-center text-gray-400 py-10">Ürün bulunamadı</div>';
    return;
  }
  
  let html = '';
  filteredItems.forEach(item => {
    html += `
      <div onclick="addProductToOrder('${item.id}')" 
           class="bg-gray-50 rounded-lg p-4 hover:bg-blue-50 hover:border-2 hover:border-blue-500 transition relative group cursor-pointer">
        <h4 class="font-bold text-gray-800 mb-1">${item.name}</h4>
        <p class="text-2xl font-bold text-blue-600">${(item.price || 0).toFixed(2)}₺</p>
        ${item.description ? `<p class="text-xs text-gray-500 mt-1">${item.description}</p>` : ''}
        <div class="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition">
          <button onclick="event.stopPropagation(); editMenuItem('${item.id}')" 
                  class="bg-blue-500 hover:bg-blue-600 text-white text-xs px-2 py-1 rounded mr-1">✏️</button>
          <button onclick="event.stopPropagation(); deleteMenuItem('${item.id}')" 
                  class="bg-red-500 hover:bg-red-600 text-white text-xs px-2 py-1 rounded">🗑️</button>
        </div>
      </div>
    `;
  });
  
  productsGrid.innerHTML = html;
}

function renderAllProducts() {
  renderProducts(menuItems);
}

function renderProducts(items) {
  const productsGrid = document.getElementById('products-grid');
  if (!productsGrid) return;
  
  if (items.length === 0) {
    productsGrid.innerHTML = '<div class="col-span-4 text-center text-gray-400 py-10">Ürün bulunamadı</div>';
    return;
  }
  
  productsGrid.innerHTML = items.map(item => `
    <div onclick="addProductToOrder('${item.id}')" 
         class="bg-gray-50 rounded-lg p-4 cursor-pointer hover:bg-blue-50 hover:border-2 hover:border-blue-500 transition relative group">
      <h4 class="font-bold text-gray-800 mb-1">${item.name}</h4>
      <p class="text-2xl font-bold text-blue-600">${(item.price || 0).toFixed(2)}₺</p>
      ${item.description ? `<p class="text-xs text-gray-500 mt-1">${item.description}</p>` : ''}
      <div class="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition">
        <button onclick="event.stopPropagation(); editMenuItem('${item.id}')" 
                class="bg-blue-500 hover:bg-blue-600 text-white text-xs px-2 py-1 rounded mr-1">✏️</button>
        <button onclick="event.stopPropagation(); deleteMenuItem('${item.id}')" 
                class="bg-red-500 hover:bg-red-600 text-white text-xs px-2 py-1 rounded">🗑️</button>
      </div>
    </div>
  `).join('');
}

// This function is now an alias - the main one is addProductToOrder

function updateOrderSummary() {
  const orderItems = document.getElementById('order-items');
  const orderTotal = document.getElementById('order-total');
  
  if (!orderItems || !orderTotal) return;
  
  // Initialize currentOrder if not exists
  if (!currentOrder) {
    currentOrder = { items: [], tableId: null };
  }
  
  if (currentOrder.items.length === 0) {
    orderItems.innerHTML = `
      <div class="text-center text-gray-400 py-10">
        <div class="text-4xl mb-2">📝</div>
        <p>Lütfen ürün seçin</p>
      </div>
    `;
    orderTotal.textContent = '0,00₺';
    return;
  }
  
  // Render order items
  let itemsHtml = '';
  currentOrder.items.forEach((item, index) => {
    const itemTotal = (parseFloat(item.price) || 0) * (item.quantity || 1);
    itemsHtml += `
      <div class="flex justify-between items-center p-3 bg-gray-50 rounded-lg mb-2">
        <div class="flex-1">
          <div class="font-semibold text-gray-800">${item.name}</div>
          <div class="text-sm text-gray-600">${(item.price || 0).toFixed(2)}₺ × ${item.quantity || 1}</div>
        </div>
        <div class="flex items-center gap-2">
          <button onclick="removeOrderItem(${index})" class="text-red-500 hover:text-red-700 font-bold px-2">−</button>
          <span class="font-bold text-blue-600">${itemTotal.toFixed(2)}₺</span>
          <button onclick="incrementOrderItem(${index})" class="text-green-500 hover:text-green-700 font-bold px-2">+</button>
        </div>
      </div>
    `;
  });
  
  orderItems.innerHTML = itemsHtml;
  
  const total = currentOrder.items.reduce((sum, item) => sum + ((parseFloat(item.price) || 0) * (item.quantity || 1)), 0);
  orderTotal.textContent = total.toFixed(2) + '₺';
}

function incrementOrderItem(index) {
  if (currentOrder && currentOrder.items[index]) {
    currentOrder.items[index].quantity = (currentOrder.items[index].quantity || 1) + 1;
    updateOrderSummary();
  }
}

function removeOrderItem(index) {
  if (currentOrder && currentOrder.items[index]) {
    if (currentOrder.items[index].quantity > 1) {
      currentOrder.items[index].quantity -= 1;
    } else {
      currentOrder.items.splice(index, 1);
    }
    updateOrderSummary();
  }
}

function removeFromOrder(itemId) {
  currentOrder.items = currentOrder.items.filter(i => i.id !== itemId);
  updateOrderSummary();
}

async function completeOrder() {
  if (currentOrder.items.length === 0) {
    alert('Sepetiniz boş!');
    return;
  }
  
  if (!currentOrder.tableId) {
    const tableNum = prompt('Masa numarası girin:');
    if (!tableNum) return;
    currentOrder.tableId = parseInt(tableNum);
  }
  
  // Create order via Electron API
  try {
    if (!window.electronAPI || !window.electronAPI.dbCreateOrder) {
      alert('Electron API mevcut değil!');
      return;
    }
    
    const orderData = {
      staffId: currentUser.id,
      staffName: currentUser.name,
      items: currentOrder.items.map(item => ({
        menuItemId: item.id,
        menuItemName: item.name,
        quantity: item.quantity,
        unitPrice: item.price
      })),
      totalAmount: currentOrder.items.reduce((sum, item) => sum + (item.price * item.quantity), 0),
      paymentMethod: 'cash',
      tableId: currentOrder.tableId || null,
      status: 'pending' // Masa siparişleri önce pending olacak
    };
    
    await window.electronAPI.dbCreateOrder(orderData);
    
    alert(`Sipariş başarıyla oluşturuldu!${currentOrder.tableId ? ` Masa: ${currentOrder.tableId}` : ''}`);
    currentOrder = { items: [], tableId: null };
    updateOrderSummary();
    
    // Masa görünümünü yenile
    if (currentMainTab === 'tables') {
      await loadTablesView();
    }
  } catch (error) {
    console.error('Order creation error:', error);
    alert('Sipariş oluşturulamadı: ' + (error.message || 'Bilinmeyen hata'));
  }
}

// Orders View
async function loadOrdersView() {
  renderOrdersView();
}

function renderOrdersView() {
  const content = document.getElementById('main-content');
  
  if (pendingOrders.length === 0) {
    content.innerHTML = '<div class="text-center p-10 text-gray-500">Bekleyen sipariş yok</div>';
    return;
  }
  
  let html = `
    <div class="mb-6">
      <h2 class="text-2xl font-bold text-gray-800">Bekleyen Siparişler (${pendingOrders.length})</h2>
    </div>
    <div class="space-y-4">
  `;
  
  pendingOrders.forEach(order => {
    const items = order.items || [];
    const tableNumber = order.tableId || 'Bilinmiyor';
    const createdAt = order.createdAt ? new Date(order.createdAt).toLocaleString('tr-TR') : 'Bilinmiyor';
    
    html += `
      <div class="bg-white rounded-lg shadow-lg p-6 border-l-4 border-yellow-500">
        <div class="flex justify-between items-start mb-4">
          <div>
            <h3 class="text-xl font-bold text-gray-800">Masa ${tableNumber}</h3>
            <p class="text-sm text-gray-600">Sipariş No: ${order.orderNumber || order.id}</p>
            <p class="text-sm text-gray-600">Tarih: ${createdAt}</p>
          </div>
          <div class="text-right">
            <p class="text-2xl font-bold text-blue-600">${(order.totalAmount || 0).toFixed(2)}₺</p>
            <span class="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-semibold">Beklemede</span>
          </div>
        </div>
        
        <div class="mb-4">
          <h4 class="font-semibold text-gray-700 mb-2">Sipariş İçeriği:</h4>
          <div class="space-y-2">
    `;
    
    items.forEach(item => {
      html += `
        <div class="flex justify-between items-center p-2 bg-gray-50 rounded">
          <span class="font-medium">${item.menuItemName || item.name || 'İsimsiz'} × ${item.quantity || 1}</span>
          <span class="text-blue-600 font-semibold">${((item.unitPrice || 0) * (item.quantity || 1)).toFixed(2)}₺</span>
        </div>
      `;
    });
    
    html += `
          </div>
        </div>
        
        <div class="flex gap-3">
          <button onclick="acceptOrder('${order.id}', ${tableNumber})" 
                  class="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-4 rounded-lg">
            ✅ Siparişi Kabul Et
          </button>
          <button onclick="rejectOrder('${order.id}')" 
                  class="px-4 py-3 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-lg">
            ❌ Reddet
          </button>
        </div>
      </div>
    `;
  });
  
  html += `
    </div>
  `;
  
  content.innerHTML = html;
}

// Siparişleri dinle
function startListeningToOrders() {
  console.log('🚀 Admin panel: startListeningToOrders çağrıldı');
  console.log('   isElectron:', isElectron);
  console.log('   window.electronAPI:', window.electronAPI ? 'Mevcut' : 'Yok');
  console.log('   window.electronAPI.onNewOrders:', window.electronAPI?.onNewOrders ? 'Mevcut' : 'Yok');
  
  if (!isElectron || !window.electronAPI || !window.electronAPI.onNewOrders) {
    console.error('❌ Electron API mevcut değil, sipariş dinleme başlatılamıyor');
    console.error('   Lütfen Electron uygulamasını yeniden başlatın');
    return;
  }
  
  // İlk yüklemede mevcut siparişleri çek
  if (window.electronAPI.dbGetPendingOrders) {
    console.log('🔍 İlk yüklemede mevcut siparişler çekiliyor...');
    window.electronAPI.dbGetPendingOrders().then(result => {
      if (result && result.success && result.orders) {
        console.log(`📦 İlk yüklemede ${result.orders.length} bekleyen sipariş bulundu`);
        pendingOrders = result.orders;
        if (result.orders.length > 0) {
          showOrderNotification(result.orders);
        }
        if (currentMainTab === 'orders') {
          renderOrdersView();
        }
      } else {
        console.log('⚠️ İlk yüklemede sipariş bulunamadı:', result?.error || 'Bilinmeyen hata');
      }
    }).catch(error => {
      console.error('❌ İlk yüklemede sipariş çekme hatası:', error);
    });
  }
  
  console.log('👂 IPC listener kuruluyor: new-orders event');
  
  ordersUnsubscribe = window.electronAPI.onNewOrders((orders) => {
    console.log(`📦 ${orders.length} yeni sipariş alındı (IPC event tetiklendi)`);
    console.log('   Siparişler:', orders.map(o => ({ id: o.id, tableId: o.tableId, status: o.status, totalAmount: o.totalAmount })));
    
    pendingOrders = orders;
    
    // Bildirim göster
    if (orders.length > 0) {
      console.log('🔔 Bildirim gösteriliyor...');
      showOrderNotification(orders);
    }
    
    // Eğer siparişler sekmesindeyse, görünümü güncelle
    if (currentMainTab === 'orders') {
      console.log('📋 Sipariş görünümü güncelleniyor...');
      renderOrdersView();
    }
    
    // Masa görünümünü güncelle (bekleyen siparişleri de dahil et)
    if (currentMainTab === 'tables') {
      console.log('🪑 Masa görünümü güncelleniyor...');
      // SQLite'dan siparişleri al
      window.electronAPI.dbGetOrders().then(sqliteOrders => {
        // Firestore'dan gelen bekleyen siparişleri de ekle
        const allOrders = [...sqliteOrders];
        if (pendingOrders && pendingOrders.length > 0) {
          console.log(`📦 ${pendingOrders.length} bekleyen sipariş kontrol ediliyor...`);
          pendingOrders.forEach(pendingOrder => {
            const existsInSQLite = sqliteOrders.find(o => o.id === pendingOrder.id);
            const orderStatus = pendingOrder.status ? pendingOrder.status.toLowerCase() : 'pending';
            const isPending = orderStatus === 'pending' || !pendingOrder.status || pendingOrder.status === '' || pendingOrder.status === null;
            if (!existsInSQLite && isPending) {
              allOrders.push(pendingOrder);
              console.log('✅ Bekleyen sipariş eklendi:', pendingOrder.id, 'Masa:', pendingOrder.tableId, 'Status:', pendingOrder.status);
            }
          });
        }
        updateTableStatus(allOrders);
        renderTablesView();
      }).catch(error => {
        console.error('❌ Masa görünümü güncellenirken hata:', error);
        // Hata durumunda sadece pendingOrders'ı kullan
        updateTableStatus(pendingOrders || []);
        renderTablesView();
      });
    }
  });
  
  console.log('✅ IPC listener kuruldu, sipariş dinleme başlatıldı');
  console.log('   Main process\'ten mesaj bekleniyor...');
  
  // Garson çağrılarını dinle
  if (window.electronAPI && window.electronAPI.onNewWaiterCalls) {
    console.log('👂 Garson çağrısı dinleme başlatılıyor...');
    waiterCallsUnsubscribe = window.electronAPI.onNewWaiterCalls((waiterCalls) => {
      console.log(`🔔 ${waiterCalls.length} yeni garson çağrısı alındı`);
      
      const previousPendingCount = pendingWaiterCalls.filter(call => call.status === 'pending' || !call.status).length;
      pendingWaiterCalls = waiterCalls;
      const currentPendingCount = pendingWaiterCalls.filter(call => call.status === 'pending' || !call.status).length;
      
      // Yeni bildirim geldiyse ses çal
      if (currentPendingCount > previousPendingCount) {
        checkAndPlayNotificationSound(currentPendingCount);
      }
      
      // Badge güncelle
      updateNotificationBadge();
      
      // Bildirim göster
      const newCalls = waiterCalls.filter(call => call.status === 'pending' || !call.status);
      if (newCalls.length > 0) {
        showWaiterCallNotification(newCalls);
      }
      
      // Eğer bildirimler sayfası açıksa, sayfayı yenile
      const content = document.getElementById('main-content');
      if (content && content.innerHTML.includes('Bildirimler')) {
        loadNotificationsView();
      }
    });
    console.log('✅ Garson çağrısı dinleme başlatıldı');
  } else {
    console.warn('⚠️ onNewWaiterCalls API mevcut değil');
  }
}

// Sipariş bildirimi göster
function showOrderNotification(orders) {
  // Bildirim HTML'i oluştur
  let notificationHtml = document.getElementById('order-notification');
  
  if (!notificationHtml) {
    notificationHtml = document.createElement('div');
    notificationHtml.id = 'order-notification';
    notificationHtml.className = 'fixed top-4 right-4 bg-yellow-500 text-white p-4 rounded-lg shadow-lg z-50 cursor-pointer';
    notificationHtml.onclick = () => {
      switchMainTab('orders');
      notificationHtml.classList.add('hidden');
    };
    document.body.appendChild(notificationHtml);
  }
  
  const count = orders.length;
  notificationHtml.innerHTML = `
    <div class="flex items-center gap-3">
      <span class="text-2xl">🔔</span>
      <div>
        <p class="font-bold">${count} Yeni Sipariş!</p>
        <p class="text-sm">Tıklayarak görüntüleyin</p>
      </div>
    </div>
  `;
  notificationHtml.classList.remove('hidden');
  
  // 10 saniye sonra otomatik kapat
  setTimeout(() => {
    if (notificationHtml) {
      notificationHtml.classList.add('hidden');
    }
  }, 10000);
  
  // Bildirim sesi çal (opsiyonel)
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(`${count} Yeni Sipariş!`, {
      body: 'Tıklayarak görüntüleyin',
      icon: '/favicon.ico'
    });
  }
}

// Garson çağrısı bildirimi göster
function showWaiterCallNotification(waiterCalls) {
  let notificationHtml = document.getElementById('waiter-call-notification');
  
  if (!notificationHtml) {
    notificationHtml = document.createElement('div');
    notificationHtml.id = 'waiter-call-notification';
    notificationHtml.className = 'fixed top-20 right-4 bg-red-500 text-white p-4 rounded-lg shadow-lg z-50 min-w-[300px]';
    document.body.appendChild(notificationHtml);
  }
  
  const callsList = waiterCalls.map(call => {
    const tableId = call.tableId || 'Bilinmiyor';
    const callTime = call.createdAt ? new Date(call.createdAt).toLocaleTimeString('tr-TR') : 'Şimdi';
    return `
      <div class="mb-3 p-3 bg-white bg-opacity-20 rounded-lg flex items-center justify-between">
        <div>
          <p class="font-bold">Masa ${tableId} - Garson Çağrısı</p>
          <p class="text-sm opacity-90">${callTime}</p>
        </div>
        <button onclick="answerWaiterCall('${call.id}', ${tableId})" 
                class="bg-white text-red-500 px-4 py-2 rounded-lg font-semibold hover:bg-gray-100 transition">
          Cevap Ver
        </button>
      </div>
    `;
  }).join('');
  
  notificationHtml.innerHTML = `
    <div class="flex items-center gap-3 mb-3">
      <span class="text-2xl">🔔</span>
      <div>
        <p class="font-bold text-lg">${waiterCalls.length} Garson Çağrısı</p>
      </div>
    </div>
    ${callsList}
    <button onclick="document.getElementById('waiter-call-notification').classList.add('hidden')" 
            class="w-full mt-2 bg-white bg-opacity-20 hover:bg-opacity-30 py-2 rounded-lg font-semibold transition">
      Kapat
    </button>
  `;
  notificationHtml.classList.remove('hidden');
  
  // 30 saniye sonra otomatik kapat
  setTimeout(() => {
    if (notificationHtml) {
      notificationHtml.classList.add('hidden');
    }
  }, 30000);
  
  // Sistem bildirimi
  if ('Notification' in window && Notification.permission === 'granted') {
    waiterCalls.forEach(call => {
      new Notification(`Masa ${call.tableId} - Garson Çağrısı`, {
        body: 'Müşteri garson çağırıyor',
        icon: '/favicon.ico'
      });
    });
  }
}

// Garson çağrısına cevap ver
async function answerWaiterCall(callId, tableId) {
  if (!isElectron || !window.electronAPI) return;
  
  try {
    console.log(`✅ Garson çağrısına cevap veriliyor: ${callId}, Masa: ${tableId}`);
    
    // Firestore'da durumu güncelle
    if (window.electronAPI.dbUpdateWaiterCall) {
      await window.electronAPI.dbUpdateWaiterCall(callId, { status: 'answered' });
      console.log(`✅ Garson çağrısı güncellendi: ${callId}`);
    } else {
      console.warn('⚠️ dbUpdateWaiterCall API mevcut değil');
    }
    
    // Bildirimi kapat
    const notification = document.getElementById('waiter-call-notification');
    if (notification) {
      notification.classList.add('hidden');
    }
    
    // Bekleyen çağrıları güncelle
    pendingWaiterCalls = pendingWaiterCalls.filter(call => call.id !== callId);
    
    alert(`Masa ${tableId} garson çağrısına cevap verildi.`);
  } catch (error) {
    console.error('❌ Garson çağrısı cevaplama hatası:', error);
    alert('Garson çağrısına cevap verilemedi. Lütfen tekrar deneyin.');
  }
}

// Window'a ekle
window.answerWaiterCall = answerWaiterCall;

// Siparişi kabul et
async function acceptOrder(orderId, tableNumber) {
  if (!isElectron) return;
  
  try {
    const order = pendingOrders.find(o => o.id === orderId);
    if (!order) {
      alert('Sipariş bulunamadı');
      return;
    }
    
    // SQLite'a kaydet
    const result = await window.electronAPI.dbSaveFirestoreOrder(order);
    
    if (result && result.success) {
      // Siparişi listeden kaldır
      pendingOrders = pendingOrders.filter(o => o.id !== orderId);
      renderOrdersView();
      
      // Masa görünümünü güncelle
      if (currentMainTab === 'tables') {
        await loadTablesView();
      }
      
      alert('Sipariş kabul edildi ve kaydedildi!');
    } else {
      alert('Sipariş kaydedilemedi: ' + (result?.error || 'Bilinmeyen hata'));
    }
  } catch (error) {
    console.error('Sipariş kabul hatası:', error);
    alert('Sipariş kabul edilemedi: ' + error.message);
  }
}

// Siparişi reddet
function rejectOrder(orderId) {
  if (confirm('Bu siparişi reddetmek istediğinize emin misiniz?')) {
    pendingOrders = pendingOrders.filter(o => o.id !== orderId);
    renderOrdersView();
  }
}

// Global scope'a ekle (HTML'den çağrılabilmesi için)
window.acceptOrder = acceptOrder;
window.rejectOrder = rejectOrder;

// Order History
async function loadOrderHistory() {
  if (!isElectron) return;
  
  try {
    const orders = await window.electronAPI.dbGetOrders({ limit: 50 });
    renderOrderHistory(orders);
  } catch (error) {
    console.error('Order history error:', error);
  }
}

function renderOrderHistory(orders) {
  const content = document.getElementById('main-content');
  
  if (orders.length === 0) {
    content.innerHTML = '<div class="text-center p-10 text-gray-500">Henüz sipariş yok</div>';
    return;
  }
  
  let html = `
    <div class="mb-6">
      <h2 class="text-2xl font-bold text-gray-800">Sipariş Kayıtları</h2>
    </div>
    <div class="bg-white rounded-lg shadow-lg overflow-x-auto">
      <table class="w-full text-left">
        <thead class="bg-gray-100">
          <tr>
            <th class="p-3">Sipariş No</th>
            <th class="p-3">Masa</th>
            <th class="p-3">Çalışan</th>
            <th class="p-3">Tarih</th>
            <th class="p-3 text-right">Toplam</th>
            <th class="p-3">Ödeme</th>
          </tr>
        </thead>
        <tbody>
  `;
  
  orders.forEach(order => {
    const date = new Date(order.createdAt).toLocaleString('tr-TR');
    html += `
      <tr class="border-b hover:bg-gray-50">
        <td class="p-3 font-medium">${order.orderNumber || order.id}</td>
        <td class="p-3">${order.tableId || '-'}</td>
        <td class="p-3">${order.staffName}</td>
        <td class="p-3 text-sm text-gray-600">${date}</td>
        <td class="p-3 text-right font-bold text-blue-600">${(order.totalAmount || 0).toFixed(2)}₺</td>
        <td class="p-3">
          <span class="px-2 py-1 rounded-full text-xs ${order.paymentMethod === 'card' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}">
            ${order.paymentMethod === 'card' ? '💳 Kart' : '💵 Nakit'}
          </span>
        </td>
      </tr>
    `;
  });
  
  html += `</tbody></table></div>`;
  content.innerHTML = html;
}

// Reports
let currentReportCategory = 'overview';

async function loadReports() {
  if (!isElectron) return;
  
  // Önce ana yapıyı render et
  renderReports();
}

// Global scope'a ekle
window.loadReportCategory = loadReportCategory;

async function loadReportCategory(category) {
  if (!isElectron) return;
  
  // Önceki chart'ları temizle (performans için)
  if (typeof destroyAllCharts === 'function') {
    destroyAllCharts();
  }
  
  // Önceki aktif kategoriyi kaldır
  const prevActive = document.querySelector('.report-category-item.bg-blue-600');
  if (prevActive) {
    prevActive.classList.remove('bg-blue-600', 'text-white');
    prevActive.classList.add('hover:bg-gray-100');
  }
  
  // Yeni aktif kategoriyi ayarla
  currentReportCategory = category;
  
  // Yeni aktif kategoriyi vurgula
  const newActive = document.getElementById(`report-cat-${category}`);
  if (newActive) {
    newActive.classList.add('bg-blue-600', 'text-white');
    newActive.classList.remove('hover:bg-gray-100');
  }
  
  try {
    const now = new Date();
    let startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    let endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).toISOString();
    
    // Overview için tarih filtresi varsa kullan
    if (category === 'overview' && overviewDateRange.startDate && overviewDateRange.endDate) {
      startDate = overviewDateRange.startDate;
      endDate = overviewDateRange.endDate;
    }
    
    // Tüm siparişleri çek (tarih filtresi renderOverviewReport içinde uygulanacak)
    const allOrders = await window.electronAPI.dbGetOrders({ status: 'completed' });
    
    // Rapor kategorisine göre veri yükle
    switch(category) {
      case 'overview':
        const revenue = await window.electronAPI.dbGetRevenue('monthly', startDate, endDate);
        renderOverviewReport(revenue, allOrders);
        break;
      case 'orders':
        renderOrderReport(allOrders);
        break;
      case 'payments':
        renderPaymentReport(allOrders);
        break;
      case 'products':
        const productSales = await window.electronAPI.dbGetProductSales(null, null, null);
        renderProductSalesReport(productSales);
        break;
      default:
        const defaultRevenue = await window.electronAPI.dbGetRevenue('monthly', startDate, endDate);
        renderOverviewReport(defaultRevenue, allOrders);
    }
  } catch (error) {
    console.error('Report category error:', error);
  }
}

function renderReports() {
  const content = document.getElementById('main-content');
  
  const categories = [
    { id: 'overview', name: 'Genel Bakış', icon: '📊' },
    { id: 'orders', name: 'Sipariş Raporu', icon: '📋' },
    { id: 'payments', name: 'Ödeme Raporu', icon: '💳' },
    { id: 'products', name: 'Ürün Satış Raporu', icon: '📦' }
  ];
  
  let html = `
    <div class="flex gap-6 h-[calc(100vh-120px)]">
      <!-- Left: Kategori Menüsü -->
      <div class="w-64 bg-white rounded-lg shadow-lg p-4">
        <h3 class="font-bold text-lg mb-4 text-gray-800">Rapor Kategorileri</h3>
        <div class="space-y-2">
  `;
  
  categories.forEach(cat => {
    const isActive = currentReportCategory === cat.id;
    html += `
      <div onclick="loadReportCategory('${cat.id}')" 
           class="report-category-item p-3 rounded-lg cursor-pointer transition ${isActive ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'}"
           id="report-cat-${cat.id}">
        <span class="mr-2">${cat.icon}</span>
        <span class="font-medium">${cat.name}</span>
      </div>
    `;
  });
  
  html += `
        </div>
      </div>
      
      <!-- Right: Rapor İçeriği -->
      <div class="flex-1 bg-white rounded-lg shadow-lg p-6 overflow-y-auto">
        <div id="report-content">
          <!-- Rapor içeriği buraya yüklenecek -->
          <div class="text-center text-gray-500 py-10">Yükleniyor...</div>
        </div>
      </div>
    </div>
  `;
  
  content.innerHTML = html;
  
  // İlk kategoriyi yükle
  loadReportCategory(currentReportCategory);
}

// Genel Bakış Raporu
// Global tarih filtresi için değişkenler
let overviewDateRange = {
  startDate: null,
  endDate: null,
  preset: 'month' // 'today', 'week', 'month', 'custom'
};

// Chart instance'larını saklamak için (memory leak önleme)
let chartInstances = {};

// Chart'ları temizle
function destroyAllCharts() {
  Object.keys(chartInstances).forEach(key => {
    if (chartInstances[key] && typeof chartInstances[key].destroy === 'function') {
      chartInstances[key].destroy();
    }
    delete chartInstances[key];
  });
}

async function renderOverviewReport(revenue, allOrders) {
  const content = document.getElementById('report-content');
  if (!content) return;
  
  // Tarih aralığı hesaplama
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const monthAgo = new Date(today);
  monthAgo.setMonth(monthAgo.getMonth() - 1);
  
  // Tarih filtresi uygula
  let filteredOrders = allOrders;
  if (overviewDateRange.startDate && overviewDateRange.endDate) {
    const start = new Date(overviewDateRange.startDate);
    const end = new Date(overviewDateRange.endDate);
    end.setHours(23, 59, 59, 999); // Günün sonuna kadar
    filteredOrders = allOrders.filter(o => {
      const orderDate = new Date(o.createdAt);
      return orderDate >= start && orderDate <= end;
    });
  }
  
  const todayOrders = filteredOrders.filter(o => new Date(o.createdAt) >= today);
  const weekOrders = filteredOrders.filter(o => {
    const orderDate = new Date(o.createdAt);
    return orderDate >= weekAgo && (!overviewDateRange.startDate || orderDate >= new Date(overviewDateRange.startDate));
  });
  const monthOrders = filteredOrders.filter(o => {
    const orderDate = new Date(o.createdAt);
    return orderDate >= monthAgo && (!overviewDateRange.startDate || orderDate >= new Date(overviewDateRange.startDate));
  });
  
  const todayRevenue = todayOrders.reduce((sum, o) => sum + (parseFloat(o.totalAmount) || 0), 0);
  const weekRevenue = weekOrders.reduce((sum, o) => sum + (parseFloat(o.totalAmount) || 0), 0);
  const monthRevenue = monthOrders.reduce((sum, o) => sum + (parseFloat(o.totalAmount) || 0), 0);
  const filteredRevenue = filteredOrders.reduce((sum, o) => sum + (parseFloat(o.totalAmount) || 0), 0);
  
  // Tarih formatı helper - Input için (YYYY-MM-DD)
  const formatDateForInput = (date) => {
    if (!date) return '';
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  
  // Tarih formatı helper - Display için (DD.MM.YYYY)
  const formatDateDisplay = (date) => {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('tr-TR', { year: 'numeric', month: '2-digit', day: '2-digit' });
  };
  
  // Bugün için tarih string'i
  const todayStr = today.toISOString().split('T')[0];
  const weekAgoStr = weekAgo.toISOString().split('T')[0];
  const monthAgoStr = monthAgo.toISOString().split('T')[0];
  
  // Mevcut tarih aralığı için input değerleri
  const startDateInputValue = overviewDateRange.startDate ? formatDateForInput(overviewDateRange.startDate) : monthAgoStr;
  const endDateInputValue = overviewDateRange.endDate ? formatDateForInput(overviewDateRange.endDate) : todayStr;
  
  let html = `
    <div>
      <div class="flex justify-between items-center mb-6">
        <h2 class="text-3xl font-bold text-gray-800">📊 Genel Bakış</h2>
        
        <!-- Tarih Seçici -->
        <div class="flex items-center gap-4">
          <!-- Önceden Tanımlı Tarih Aralıkları -->
          <div class="flex gap-2">
            <button onclick="setOverviewDatePreset('today')" 
                    class="px-4 py-2 rounded-lg ${overviewDateRange.preset === 'today' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'} hover:bg-blue-400 transition">
              Bugün
            </button>
            <button onclick="setOverviewDatePreset('week')" 
                    class="px-4 py-2 rounded-lg ${overviewDateRange.preset === 'week' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'} hover:bg-blue-400 transition">
              Bu Hafta
            </button>
            <button onclick="setOverviewDatePreset('month')" 
                    class="px-4 py-2 rounded-lg ${overviewDateRange.preset === 'month' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'} hover:bg-blue-400 transition">
              Bu Ay
            </button>
            <button onclick="setOverviewDatePreset('all')" 
                    class="px-4 py-2 rounded-lg ${overviewDateRange.preset === 'all' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'} hover:bg-blue-400 transition">
              Tümü
            </button>
          </div>
          
          <!-- Özel Tarih Aralığı -->
          <div class="flex items-center gap-2 bg-white p-2 rounded-lg shadow">
            <input type="date" 
                   id="overview-start-date" 
                   value="${startDateInputValue}"
                   class="px-3 py-1 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500">
            <span class="text-gray-500">-</span>
            <input type="date" 
                   id="overview-end-date" 
                   value="${endDateInputValue}"
                   class="px-3 py-1 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500">
            <button onclick="applyOverviewDateRange()" 
                    class="px-4 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition">
              Uygula
            </button>
          </div>
        </div>
      </div>
      
      ${overviewDateRange.startDate && overviewDateRange.endDate ? `
        <div class="mb-4 p-3 bg-blue-50 rounded-lg">
          <p class="text-sm text-blue-700">
            📅 <strong>Seçilen Tarih Aralığı:</strong> ${formatDateDisplay(overviewDateRange.startDate)} - ${formatDateDisplay(overviewDateRange.endDate)}
            <span class="ml-2 text-gray-600">(${filteredOrders.length} sipariş, ${filteredRevenue.toFixed(2)}₺)</span>
          </p>
        </div>
      ` : ''}
      
      <!-- Özet Kartları -->
      <div class="grid grid-cols-4 gap-4 mb-6">
        <div class="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-xl shadow-lg">
          <div class="text-sm text-gray-600 mb-1">Bugün</div>
          <div class="text-2xl font-bold text-blue-600">${todayRevenue.toFixed(2)}₺</div>
          <div class="text-xs text-gray-500 mt-1">${todayOrders.length} sipariş</div>
        </div>
        <div class="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-xl shadow-lg">
          <div class="text-sm text-gray-600 mb-1">Bu Hafta</div>
          <div class="text-2xl font-bold text-green-600">${weekRevenue.toFixed(2)}₺</div>
          <div class="text-xs text-gray-500 mt-1">${weekOrders.length} sipariş</div>
        </div>
        <div class="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-xl shadow-lg">
          <div class="text-sm text-gray-600 mb-1">Bu Ay</div>
          <div class="text-2xl font-bold text-purple-600">${monthRevenue.toFixed(2)}₺</div>
          <div class="text-xs text-gray-500 mt-1">${monthOrders.length} sipariş</div>
        </div>
        <div class="bg-gradient-to-br from-orange-50 to-orange-100 p-6 rounded-xl shadow-lg">
          <div class="text-sm text-gray-600 mb-1">${overviewDateRange.startDate ? 'Seçilen Aralık' : 'Toplam'}</div>
          <div class="text-2xl font-bold text-orange-600">${(overviewDateRange.startDate ? filteredRevenue : (revenue.totalRevenue || 0)).toFixed(2)}₺</div>
          <div class="text-xs text-gray-500 mt-1">${overviewDateRange.startDate ? filteredOrders.length : (revenue.totalOrders || 0)} sipariş</div>
        </div>
      </div>
      
      <!-- İstatistikler -->
      <div class="grid grid-cols-3 gap-6 mb-6">
        <div class="bg-white p-6 rounded-lg shadow-lg text-center border-l-4 border-blue-500">
          <h3 class="text-sm text-gray-500 uppercase mb-2">Toplam Ciro</h3>
          <p class="text-3xl font-bold text-blue-600">${(overviewDateRange.startDate ? filteredRevenue : (revenue.totalRevenue || 0)).toFixed(2)}₺</p>
        </div>
        <div class="bg-white p-6 rounded-lg shadow-lg text-center border-l-4 border-green-500">
          <h3 class="text-sm text-gray-500 uppercase mb-2">Toplam Sipariş</h3>
          <p class="text-3xl font-bold text-green-600">${overviewDateRange.startDate ? filteredOrders.length : (revenue.totalOrders || 0)}</p>
        </div>
        <div class="bg-white p-6 rounded-lg shadow-lg text-center border-l-4 border-purple-500">
          <h3 class="text-sm text-gray-500 uppercase mb-2">Ortalama Sipariş</h3>
          <p class="text-3xl font-bold text-purple-600">${(overviewDateRange.startDate && filteredOrders.length > 0 ? (filteredRevenue / filteredOrders.length) : (revenue.averageOrderValue || 0)).toFixed(2)}₺</p>
        </div>
      </div>
      
      <!-- Grafikler -->
      <div class="grid grid-cols-2 gap-6 mb-6">
        <!-- Günlük Ciro Trendi -->
        <div class="bg-white p-6 rounded-lg shadow-lg">
          <h3 class="text-lg font-bold text-gray-800 mb-4">Günlük Ciro Trendi</h3>
          <canvas id="overview-revenue-chart" style="max-height: 200px;"></canvas>
        </div>
        
        <!-- Sipariş Dağılımı Donut Chart -->
        <div class="bg-white p-6 rounded-lg shadow-lg">
          <h3 class="text-lg font-bold text-gray-800 mb-4">Dönem Karşılaştırması</h3>
          <canvas id="overview-comparison-chart" style="max-height: 200px;"></canvas>
        </div>
      </div>
    </div>
  `;
  
  content.innerHTML = html;
  
  // Chart.js yüklenmediyse grafikleri atla ve devam et
  if (typeof window.Chart === 'undefined' || !window.Chart) {
    console.warn('⚠️ Chart.js yüklenmedi, grafikler gösterilmeyecek');
    return;
  }
  
  // Önceki chart'ları destroy et (performans için)
  try {
    if (chartInstances['overview-revenue-chart']) {
      chartInstances['overview-revenue-chart'].destroy();
      delete chartInstances['overview-revenue-chart'];
    }
    if (chartInstances['overview-comparison-chart']) {
      chartInstances['overview-comparison-chart'].destroy();
      delete chartInstances['overview-comparison-chart'];
    }
  } catch (e) {
    console.warn('Chart destroy hatası:', e);
  }
  
  // Günlük ciro trendi grafiği
  setTimeout(() => {
    try {
      const revenueCtx = document.getElementById('overview-revenue-chart');
      if (!revenueCtx) return;
      // Son 7 günün verilerini hazırla
      const last7Days = [];
      const last7DaysRevenue = [];
      const now = new Date();
      for (let i = 6; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        const dateStr = date.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' });
        last7Days.push(dateStr);
        
        const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        const dayEnd = new Date(dayStart);
        dayEnd.setHours(23, 59, 59, 999);
        
        const dayOrders = filteredOrders.filter(o => {
          const orderDate = new Date(o.createdAt);
          return orderDate >= dayStart && orderDate <= dayEnd;
        });
        last7DaysRevenue.push(dayOrders.reduce((sum, o) => sum + (parseFloat(o.totalAmount) || 0), 0));
      }
      
      chartInstances['overview-revenue-chart'] = new Chart(revenueCtx, {
        type: 'line',
        data: {
          labels: last7Days,
          datasets: [{
            label: 'Günlük Ciro (₺)',
            data: last7DaysRevenue,
            borderColor: 'rgb(59, 130, 246)',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            tension: 0.4,
            fill: true
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: true,
              position: 'top'
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                callback: function(value) {
                  return value.toFixed(0) + '₺';
                }
              }
            }
          }
        }
      });
    } catch (error) {
      console.error('Revenue chart oluşturma hatası:', error);
    }
    
    // Dönem karşılaştırması donut chart
    try {
      const comparisonCtx = document.getElementById('overview-comparison-chart');
      if (!comparisonCtx) return;
      if (typeof window.Chart === 'undefined') {
        console.warn('Chart.js yüklenmedi, grafik oluşturulamıyor');
        return;
      }
      chartInstances['overview-comparison-chart'] = new Chart(comparisonCtx, {
        type: 'doughnut',
        data: {
          labels: ['Bugün', 'Bu Hafta', 'Bu Ay'],
          datasets: [{
            data: [todayRevenue, weekRevenue, monthRevenue],
            backgroundColor: [
              'rgba(59, 130, 246, 0.8)',
              'rgba(34, 197, 94, 0.8)',
              'rgba(168, 85, 247, 0.8)'
            ],
            borderWidth: 2,
            borderColor: '#fff'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom'
            },
            tooltip: {
              callbacks: {
                label: function(context) {
                  return context.label + ': ' + context.parsed.toFixed(2) + '₺';
                }
              }
            }
          }
        }
      });
    } catch (error) {
      console.error('Comparison chart hatası:', error);
    }
  }, 100);
}

// Tarih önceden tanımlı aralık fonksiyonları
async function setOverviewDatePreset(preset) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  overviewDateRange.preset = preset;
  
  switch(preset) {
    case 'today':
      overviewDateRange.startDate = today.toISOString();
      overviewDateRange.endDate = new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1).toISOString();
      break;
    case 'week':
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);
      overviewDateRange.startDate = weekAgo.toISOString();
      overviewDateRange.endDate = new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1).toISOString();
      break;
    case 'month':
      const monthAgo = new Date(today);
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      overviewDateRange.startDate = monthAgo.toISOString();
      overviewDateRange.endDate = new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1).toISOString();
      break;
    case 'all':
      overviewDateRange.startDate = null;
      overviewDateRange.endDate = null;
      break;
  }
  
  // Raporu yeniden yükle
  await loadReportCategory('overview');
}

// Özel tarih aralığı uygula
async function applyOverviewDateRange() {
  const startDateInput = document.getElementById('overview-start-date');
  const endDateInput = document.getElementById('overview-end-date');
  
  if (!startDateInput || !endDateInput) return;
  
  const startDate = startDateInput.value;
  const endDate = endDateInput.value;
  
  if (!startDate || !endDate) {
    alert('Lütfen başlangıç ve bitiş tarihlerini seçin!');
    return;
  }
  
  if (new Date(startDate) > new Date(endDate)) {
    alert('Başlangıç tarihi bitiş tarihinden sonra olamaz!');
    return;
  }
  
  overviewDateRange.preset = 'custom';
  overviewDateRange.startDate = new Date(startDate).toISOString();
  overviewDateRange.endDate = new Date(endDate + 'T23:59:59').toISOString();
  
  // Raporu yeniden yükle
  await loadReportCategory('overview');
}

// Ciro sıfırlama fonksiyonu
async function resetRevenue() {
  if (!confirm('⚠️ UYARI: Tüm sipariş kayıtlarını ve ciroyu sıfırlamak istediğinize emin misiniz?\n\nBu işlem:\n- Tüm sipariş geçmişini silecek\n- Tüm ciro verilerini sıfırlayacak\n- Bu işlem GERİ ALINAMAZ!\n\nDevam etmek istiyor musunuz?')) {
    return;
  }
  
  // İkinci onay
  if (!confirm('🔥 SON UYARI: Tüm sipariş verilerini kalıcı olarak silmek üzeresiniz!\n\nBu işlemi onaylıyor musunuz?')) {
    return;
  }
  
  if (!isElectron) {
    alert('Bu işlem sadece Electron uygulamasında çalışır!');
    return;
  }
  
  if (!window.electronAPI || !window.electronAPI.dbClearOrders) {
    alert('Ciro sıfırlama fonksiyonu bulunamadı! Lütfen Electron uygulamasını yeniden başlatın.');
    return;
  }
  
  try {
    console.log('🗑️ Tüm siparişler siliniyor...');
    const result = await window.electronAPI.dbClearOrders();
    
    if (result) {
      console.log('✅ Tüm siparişler silindi');
      alert('✅ Başarılı!\n\nTüm sipariş kayıtları ve ciro verileri sıfırlandı.\nSayfa yenilenecek...');
      
      // Ayarlar sayfasındaysa yenile
      if (currentMainTab === 'settings') {
        await loadSettingsView();
      }
      
      // Eğer raporlar görünümündeyse raporları yenile
      if (currentMainTab === 'reports') {
        await loadReportCategory(currentReportCategory);
      }
      
      // Masalar görünümündeyse masaları yenile
      if (currentMainTab === 'tables') {
        await loadTablesView();
      }
    } else {
      alert('❌ Ciro sıfırlama başarısız! Lütfen Electron uygulamasını kontrol edin.');
    }
  } catch (error) {
    console.error('❌ Ciro sıfırlama hatası:', error);
    alert('❌ Ciro sıfırlanırken bir hata oluştu:\n\n' + error.message);
  }
}

// Global scope'a ekle
window.setOverviewDatePreset = setOverviewDatePreset;
window.applyOverviewDateRange = applyOverviewDateRange;
window.resetRevenue = resetRevenue;

// Sipariş Raporu
function renderOrderReport(allOrders) {
  const content = document.getElementById('report-content');
  if (!content) return;
  
  // Siparişleri tarihe göre grupla
  const ordersByDate = {};
  allOrders.forEach(order => {
    const date = new Date(order.createdAt).toLocaleDateString('tr-TR');
    if (!ordersByDate[date]) {
      ordersByDate[date] = [];
    }
    ordersByDate[date].push(order);
  });
  
  // Sipariş durumu analizi (domain vs restaurant)
  const sourceStats = {
    domain: allOrders.filter(o => o.source === 'domain' || !o.source).length,
    restaurant: allOrders.filter(o => o.source === 'restaurant').length
  };
  
  // Günlük sipariş sayıları (son 7 gün)
  const dailyOrderCounts = {};
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateStr = date.toLocaleDateString('tr-TR');
    dailyOrderCounts[dateStr] = 0;
  }
  allOrders.forEach(order => {
    const date = new Date(order.createdAt).toLocaleDateString('tr-TR');
    if (dailyOrderCounts.hasOwnProperty(date)) {
      dailyOrderCounts[date]++;
    }
  });
  
  let html = `
    <div>
      <h2 class="text-3xl font-bold text-gray-800 mb-6">📋 Sipariş Raporu</h2>
      
      <div class="mb-4">
        <p class="text-gray-600">Toplam <span class="font-bold">${allOrders.length}</span> tamamlanmış sipariş</p>
      </div>
      
      <!-- Grafikler -->
      <div class="grid grid-cols-2 gap-6 mb-6">
        <!-- Sipariş Kaynağı Donut Chart -->
        <div class="bg-white p-6 rounded-lg shadow-lg">
          <h3 class="text-lg font-bold text-gray-800 mb-4">Sipariş Kaynağı Dağılımı</h3>
          <canvas id="order-source-chart" style="max-height: 180px;"></canvas>
          <div class="mt-4 text-center">
            <div class="grid grid-cols-2 gap-4">
              <div>
                <div class="text-2xl font-bold text-blue-600">${sourceStats.domain}</div>
                <div class="text-sm text-gray-600">Domain/Mobil</div>
              </div>
              <div>
                <div class="text-2xl font-bold text-green-600">${sourceStats.restaurant}</div>
                <div class="text-sm text-gray-600">Restoran İçi</div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Günlük Sipariş Trendi -->
        <div class="bg-white p-6 rounded-lg shadow-lg">
          <h3 class="text-lg font-bold text-gray-800 mb-4">Günlük Sipariş Trendi</h3>
          <canvas id="daily-order-chart" style="max-height: 180px;"></canvas>
        </div>
      </div>
      
      <div class="space-y-4">
  `;
  
  // Tarihlere göre listele
  const sortedDates = Object.keys(ordersByDate).sort((a, b) => new Date(b) - new Date(a));
  
  sortedDates.forEach(date => {
    const orders = ordersByDate[date];
    const dayTotal = orders.reduce((sum, o) => sum + (parseFloat(o.totalAmount) || 0), 0);
    
    html += `
      <div class="bg-white border-l-4 border-blue-500 rounded-lg shadow-lg p-4 mb-4">
        <div class="flex justify-between items-center mb-3">
          <h3 class="text-lg font-bold text-gray-800">${date}</h3>
          <div class="text-right">
            <div class="text-sm text-gray-600">${orders.length} sipariş</div>
            <div class="text-xl font-bold text-blue-600">${dayTotal.toFixed(2)}₺</div>
          </div>
        </div>
        <div class="space-y-2">
    `;
    
    orders.forEach(order => {
      const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
      const time = new Date(order.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
      
      html += `
        <div class="flex justify-between items-center p-2 bg-gray-50 rounded">
          <div>
            <span class="font-medium">${time} - ${order.orderNumber || order.id}</span>
            ${order.tableId ? `<span class="text-xs text-gray-500 ml-2">Masa ${order.tableId}</span>` : ''}
            <div class="text-xs text-gray-500">${items.length} ürün</div>
          </div>
          <div class="font-bold text-blue-600">${(order.totalAmount || 0).toFixed(2)}₺</div>
        </div>
      `;
    });
    
    html += `
        </div>
      </div>
    `;
  });
  
  html += `
      </div>
    </div>
  `;
  
  content.innerHTML = html;
  
  // Önceki chart'ları destroy et (performans için)
  if (chartInstances['order-source-chart']) {
    chartInstances['order-source-chart'].destroy();
    delete chartInstances['order-source-chart'];
  }
  if (chartInstances['daily-order-chart']) {
    chartInstances['daily-order-chart'].destroy();
    delete chartInstances['daily-order-chart'];
  }
  
  // Grafikleri render et
  setTimeout(() => {
    // Sipariş kaynağı donut chart
    const sourceCtx = document.getElementById('order-source-chart');
    if (sourceCtx && window.Chart) {
      chartInstances['order-source-chart'] = new Chart(sourceCtx, {
        type: 'doughnut',
        data: {
          labels: ['Domain/Mobil', 'Restoran İçi'],
          datasets: [{
            data: [sourceStats.domain, sourceStats.restaurant],
            backgroundColor: [
              'rgba(59, 130, 246, 0.8)',
              'rgba(34, 197, 94, 0.8)'
            ],
            borderWidth: 2,
            borderColor: '#fff'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom'
            }
          }
        }
      });
    }
    
    // Günlük sipariş trendi line chart
    const dailyCtx = document.getElementById('daily-order-chart');
    if (dailyCtx && window.Chart) {
      const labels = Object.keys(dailyOrderCounts);
      const data = Object.values(dailyOrderCounts);
      
      chartInstances['daily-order-chart'] = new Chart(dailyCtx, {
        type: 'line',
        data: {
          labels: labels,
          datasets: [{
            label: 'Sipariş Sayısı',
            data: data,
            borderColor: 'rgb(168, 85, 247)',
            backgroundColor: 'rgba(168, 85, 247, 0.1)',
            tension: 0.4,
            fill: true
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: true,
              position: 'top'
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                stepSize: 1
              }
            }
          }
        }
      });
    }
  }, 100);
}

// Ödeme Raporu
function renderPaymentReport(allOrders) {
  const content = document.getElementById('report-content');
  if (!content) return;
  
  // Ödeme yöntemlerine göre grupla
  const paymentsByMethod = {
    cash: { count: 0, total: 0, orders: [] },
    card: { count: 0, total: 0, orders: [] }
  };
  
  allOrders.forEach(order => {
    const method = order.paymentMethod || 'cash';
    if (paymentsByMethod[method]) {
      paymentsByMethod[method].count += 1;
      paymentsByMethod[method].total += parseFloat(order.totalAmount) || 0;
      paymentsByMethod[method].orders.push(order);
    }
  });
  
  const totalRevenue = allOrders.reduce((sum, o) => sum + (parseFloat(o.totalAmount) || 0), 0);
  
  let html = `
    <div>
      <h2 class="text-3xl font-bold text-gray-800 mb-6">💳 Ödeme Raporu</h2>
      
      <div class="grid grid-cols-2 gap-6 mb-6">
        <div class="bg-gradient-to-br from-yellow-50 to-yellow-100 p-6 rounded-xl shadow-lg border-l-4 border-yellow-500">
          <div class="flex items-center gap-3 mb-2">
            <span class="text-3xl">💵</span>
            <h3 class="text-xl font-bold text-gray-800">Nakit</h3>
          </div>
          <div class="text-3xl font-bold text-yellow-600 mb-1">${paymentsByMethod.cash.total.toFixed(2)}₺</div>
          <div class="text-sm text-gray-600">${paymentsByMethod.cash.count} sipariş</div>
          <div class="text-xs text-gray-500 mt-1">%${totalRevenue > 0 ? ((paymentsByMethod.cash.total / totalRevenue) * 100).toFixed(1) : 0}</div>
        </div>
        
        <div class="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-xl shadow-lg border-l-4 border-green-500">
          <div class="flex items-center gap-3 mb-2">
            <span class="text-3xl">💳</span>
            <h3 class="text-xl font-bold text-gray-800">Kart</h3>
          </div>
          <div class="text-3xl font-bold text-green-600 mb-1">${paymentsByMethod.card.total.toFixed(2)}₺</div>
          <div class="text-sm text-gray-600">${paymentsByMethod.card.count} sipariş</div>
          <div class="text-xs text-gray-500 mt-1">%${totalRevenue > 0 ? ((paymentsByMethod.card.total / totalRevenue) * 100).toFixed(1) : 0}</div>
        </div>
      </div>
      
      <div class="grid grid-cols-2 gap-6 mb-6">
        <!-- Ödeme Yöntemi Dağılımı Donut Chart -->
        <div class="bg-white p-6 rounded-lg shadow-lg">
          <h3 class="text-lg font-bold text-gray-800 mb-4">Ödeme Yöntemi Dağılımı</h3>
          <canvas id="payment-method-chart" style="max-height: 180px;"></canvas>
        </div>
        
        <!-- Ödeme Yöntemi Karşılaştırması -->
        <div class="bg-white p-6 rounded-lg shadow-lg">
          <h3 class="text-lg font-bold text-gray-800 mb-4">Toplam Ciro</h3>
          <div class="text-5xl font-bold text-blue-600 mb-6">${totalRevenue.toFixed(2)}₺</div>
          
          <div class="space-y-4">
            <div class="p-4 bg-yellow-50 rounded-lg">
              <div class="flex justify-between items-center">
                <span class="font-medium text-gray-700">Nakit Toplamı</span>
                <span class="text-xl font-bold text-yellow-600">${paymentsByMethod.cash.total.toFixed(2)}₺</span>
              </div>
              <div class="mt-2 bg-gray-200 rounded-full h-2">
                <div class="bg-yellow-500 h-2 rounded-full" style="width: ${totalRevenue > 0 ? ((paymentsByMethod.cash.total / totalRevenue) * 100) : 0}%"></div>
              </div>
            </div>
            
            <div class="p-4 bg-green-50 rounded-lg">
              <div class="flex justify-between items-center">
                <span class="font-medium text-gray-700">Kart Toplamı</span>
                <span class="text-xl font-bold text-green-600">${paymentsByMethod.card.total.toFixed(2)}₺</span>
              </div>
              <div class="mt-2 bg-gray-200 rounded-full h-2">
                <div class="bg-green-500 h-2 rounded-full" style="width: ${totalRevenue > 0 ? ((paymentsByMethod.card.total / totalRevenue) * 100) : 0}%"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
  
  content.innerHTML = html;
  
  // Ödeme yöntemi donut chart
  setTimeout(() => {
    const paymentCtx = document.getElementById('payment-method-chart');
    if (paymentCtx && window.Chart) {
      new Chart(paymentCtx, {
        type: 'doughnut',
        data: {
          labels: ['Nakit', 'Kart'],
          datasets: [{
            data: [paymentsByMethod.cash.total, paymentsByMethod.card.total],
            backgroundColor: [
              'rgba(234, 179, 8, 0.8)',
              'rgba(34, 197, 94, 0.8)'
            ],
            borderWidth: 3,
            borderColor: '#fff'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom'
            },
            tooltip: {
              callbacks: {
                label: function(context) {
                  const label = context.label || '';
                  const value = context.parsed || 0;
                  const percentage = totalRevenue > 0 ? ((value / totalRevenue) * 100).toFixed(1) : 0;
                  return label + ': ' + value.toFixed(2) + '₺ (' + percentage + '%)';
                }
              }
            }
          }
        }
      });
    }
  }, 100);
}

// Ürün Satış Raporu
function renderProductSalesReport(productSales) {
  const content = document.getElementById('report-content');
  if (!content) return;
  
  // Ürünlere göre grupla ve topla
  const productMap = {};
  
  if (Array.isArray(productSales)) {
    productSales.forEach(sale => {
      const itemId = sale.menuItemId || sale.id;
      if (!productMap[itemId]) {
        productMap[itemId] = {
          name: sale.menuItemName || sale.name || 'Bilinmeyen',
          quantity: 0,
          revenue: 0,
          category: sale.category || ''
        };
      }
      productMap[itemId].quantity += sale.quantity || 0;
      productMap[itemId].revenue += parseFloat(sale.totalPrice || sale.totalRevenue || 0);
    });
  }
  
  const products = Object.values(productMap).sort((a, b) => b.quantity - a.quantity);
  
  // Kategori dağılımı hesapla
  const categoryStats = {};
  products.forEach(product => {
    const cat = product.category || 'Diğer';
    if (!categoryStats[cat]) {
      categoryStats[cat] = { quantity: 0, revenue: 0 };
    }
    categoryStats[cat].quantity += product.quantity;
    categoryStats[cat].revenue += product.revenue;
  });
  
  // En çok satan ürünler (ilk 10)
  const topProducts = products.slice(0, 10);
  
  let html = `
    <div>
      <h2 class="text-3xl font-bold text-gray-800 mb-6">📦 Ürün Satış Raporu</h2>
      
      <div class="mb-4">
        <p class="text-gray-600">Toplam <span class="font-bold">${products.length}</span> farklı ürün satıldı</p>
      </div>
      
      <!-- Grafikler -->
      <div class="grid grid-cols-2 gap-6 mb-6">
        <!-- En Çok Satan Ürünler Bar Chart -->
        <div class="bg-white p-6 rounded-lg shadow-lg">
          <h3 class="text-lg font-bold text-gray-800 mb-4">En Çok Satan Ürünler (Top 10)</h3>
          <canvas id="top-products-chart" style="max-height: 200px;"></canvas>
        </div>
        
        <!-- Kategori Dağılımı Donut Chart -->
        <div class="bg-white p-6 rounded-lg shadow-lg">
          <h3 class="text-lg font-bold text-gray-800 mb-4">Kategori Dağılımı</h3>
          <canvas id="category-distribution-chart" style="max-height: 200px;"></canvas>
        </div>
      </div>
      
      <div class="bg-white rounded-lg shadow-lg overflow-hidden">
        <table class="w-full">
          <thead class="bg-gray-100">
            <tr>
              <th class="p-3 text-left">Ürün Adı</th>
              <th class="p-3 text-center">Kategori</th>
              <th class="p-3 text-center">Adet</th>
              <th class="p-3 text-right">Toplam Ciro</th>
            </tr>
          </thead>
          <tbody>
  `;
  
  if (products.length === 0) {
    html += `
      <tr>
        <td colspan="4" class="p-8 text-center text-gray-500">Henüz ürün satışı bulunmuyor</td>
      </tr>
    `;
  } else {
    products.forEach((product, index) => {
      html += `
        <tr class="border-b hover:bg-gray-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}">
          <td class="p-3 font-medium">${product.name}</td>
          <td class="p-3 text-center text-sm text-gray-600">${product.category || '-'}</td>
          <td class="p-3 text-center font-bold">${product.quantity}</td>
          <td class="p-3 text-right font-bold text-blue-600">${product.revenue.toFixed(2)}₺</td>
        </tr>
      `;
    });
  }
  
  html += `
          </tbody>
        </table>
      </div>
    </div>
  `;
  
  content.innerHTML = html;
  
  // Önceki chart'ları destroy et (performans için)
  if (chartInstances['top-products-chart']) {
    chartInstances['top-products-chart'].destroy();
    delete chartInstances['top-products-chart'];
  }
  if (chartInstances['category-distribution-chart']) {
    chartInstances['category-distribution-chart'].destroy();
    delete chartInstances['category-distribution-chart'];
  }
  
  // Grafikleri render et
  setTimeout(() => {
    // En çok satan ürünler bar chart
    const topProductsCtx = document.getElementById('top-products-chart');
    if (topProductsCtx && window.Chart && topProducts.length > 0) {
      chartInstances['top-products-chart'] = new Chart(topProductsCtx, {
        type: 'bar',
        data: {
          labels: topProducts.map(p => p.name.length > 15 ? p.name.substring(0, 15) + '...' : p.name),
          datasets: [{
            label: 'Satış Adedi',
            data: topProducts.map(p => p.quantity),
            backgroundColor: 'rgba(59, 130, 246, 0.8)',
            borderColor: 'rgba(59, 130, 246, 1)',
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: true,
              position: 'top'
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                stepSize: 1
              }
            }
          }
        }
      });
    }
    
    // Kategori dağılımı donut chart
    const categoryCtx = document.getElementById('category-distribution-chart');
    if (categoryCtx && window.Chart && Object.keys(categoryStats).length > 0) {
      const categoryLabels = Object.keys(categoryStats);
      const categoryQuantities = Object.values(categoryStats).map(s => s.quantity);
      
      // Renk paleti
      const colors = [
        'rgba(59, 130, 246, 0.8)',   // Blue
        'rgba(34, 197, 94, 0.8)',    // Green
        'rgba(234, 179, 8, 0.8)',    // Yellow
        'rgba(168, 85, 247, 0.8)',   // Purple
        'rgba(236, 72, 153, 0.8)',   // Pink
        'rgba(249, 115, 22, 0.8)',   // Orange
        'rgba(20, 184, 166, 0.8)',   // Teal
        'rgba(239, 68, 68, 0.8)'     // Red
      ];
      
      chartInstances['category-distribution-chart'] = new Chart(categoryCtx, {
        type: 'doughnut',
        data: {
          labels: categoryLabels,
          datasets: [{
            data: categoryQuantities,
            backgroundColor: colors.slice(0, categoryLabels.length),
            borderWidth: 2,
            borderColor: '#fff'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom'
            },
            tooltip: {
              callbacks: {
                label: function(context) {
                  const label = context.label || '';
                  const value = context.parsed || 0;
                  const total = categoryQuantities.reduce((a, b) => a + b, 0);
                  const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                  return label + ': ' + value + ' adet (' + percentage + '%)';
                }
              }
            }
          }
        }
      });
    }
  }, 100);
}

// Bildirimler Sayfası
function loadNotificationsView() {
  const content = document.getElementById('main-content');
  
  // Sadece bekleyen çağrıları al
  const pendingCalls = pendingWaiterCalls.filter(call => call.status === 'pending' || !call.status);
  
  // İstatistikler hesapla (bugün gelen bekleyen çağrılar)
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  
  const todayCalls = pendingCalls.filter(call => {
    const callDate = call.createdAt ? new Date(call.createdAt.seconds ? call.createdAt.seconds * 1000 : call.createdAt) : new Date(0);
    return callDate >= todayStart;
  }).length;
  
  const weekCalls = pendingCalls.filter(call => {
    const callDate = call.createdAt ? new Date(call.createdAt.seconds ? call.createdAt.seconds * 1000 : call.createdAt) : new Date(0);
    return callDate >= weekStart;
  }).length;
  
  const monthCalls = pendingCalls.filter(call => {
    const callDate = call.createdAt ? new Date(call.createdAt.seconds ? call.createdAt.seconds * 1000 : call.createdAt) : new Date(0);
    return callDate >= monthStart;
  }).length;
  
  let html = `
    <div class="max-w-7xl mx-auto">
      <div class="mb-6 flex items-center justify-between">
        <div>
          <h2 class="text-3xl font-bold text-gray-800 mb-2">Bildirimler</h2>
          <p class="text-gray-600">Garson çağrılarını yönetin</p>
        </div>
        <div class="flex items-center gap-3">
          <button onclick="playNotificationSound()" 
                  class="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2">
            <span>🔊</span>
            <span>Test Sesi</span>
          </button>
          <button onclick="refreshNotifications()" 
                  class="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2">
            <span>🔄</span>
            <span>Yenile</span>
          </button>
        </div>
      </div>
      
      <!-- İstatistikler -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div class="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 shadow-lg">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-gray-600 mb-1">Bugün Gelen</p>
              <p class="text-2xl font-bold text-gray-800">${todayCalls}</p>
              <p class="text-xs text-gray-500 mt-1">Bekleyen çağrılar</p>
            </div>
            <span class="text-3xl">📊</span>
          </div>
        </div>
        <div class="bg-purple-50 border-2 border-purple-200 rounded-xl p-4 shadow-lg">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-gray-600 mb-1">Bu Hafta Gelen</p>
              <p class="text-2xl font-bold text-gray-800">${weekCalls}</p>
              <p class="text-xs text-gray-500 mt-1">Bekleyen çağrılar</p>
            </div>
            <span class="text-3xl">📈</span>
          </div>
        </div>
        <div class="bg-indigo-50 border-2 border-indigo-200 rounded-xl p-4 shadow-lg">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-gray-600 mb-1">Bu Ay Gelen</p>
              <p class="text-2xl font-bold text-gray-800">${monthCalls}</p>
              <p class="text-xs text-gray-500 mt-1">Bekleyen çağrılar</p>
            </div>
            <span class="text-3xl">📅</span>
          </div>
        </div>
        <div class="bg-orange-50 border-2 border-orange-200 rounded-xl p-4 shadow-lg">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-gray-600 mb-1">Toplam Bekleyen</p>
              <p class="text-2xl font-bold text-gray-800">${pendingCalls.length}</p>
              <p class="text-xs text-gray-500 mt-1">Tüm zamanlar</p>
            </div>
            <span class="text-3xl">🎯</span>
          </div>
        </div>
      </div>
      
      <!-- Bekleyen Çağrılar Kartı -->
      <div class="mb-6">
        <div class="bg-red-50 border-2 border-red-200 rounded-xl p-6 shadow-lg relative">
          ${pendingCalls.length > 0 ? '<div class="absolute top-2 right-2 w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>' : ''}
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-xl font-bold text-gray-800">Bekleyen Çağrılar</h3>
            <span class="bg-red-500 text-white rounded-full w-10 h-10 flex items-center justify-center text-lg font-bold">${pendingCalls.length}</span>
          </div>
          <p class="text-gray-600 text-sm">Yanıt bekleyen garson çağrıları</p>
        </div>
      </div>
      
      <!-- Arama ve Filtreleme -->
      <div class="mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div class="flex-1 w-full md:w-auto">
          <input type="text" 
                 id="notification-search" 
                 placeholder="Masa numarasına göre ara..." 
                 class="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                 onkeyup="filterNotifications()">
        </div>
        ${pendingCalls.length > 0 ? `
        <button onclick="markAllAsAnswered()" 
                class="bg-red-500 hover:bg-red-600 text-white font-semibold px-6 py-2 rounded-lg transition-colors flex items-center gap-2">
          <span>✓</span>
          <span>Tümünü Görüldü İşaretle (${pendingCalls.length})</span>
        </button>
        ` : ''}
      </div>
      
      <!-- Bekleyen Çağrılar Listesi -->
      <div id="pending-calls-section" class="mb-8">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-xl font-bold text-gray-800">Bekleyen Çağrılar</h3>
          <span class="text-sm text-gray-500" id="last-update-time">Son güncelleme: ${new Date().toLocaleTimeString('tr-TR')}</span>
        </div>
        <div id="pending-calls-list" class="space-y-3">
  `;
  
  if (pendingCalls.length === 0) {
    html += `
      <div class="bg-gray-50 rounded-lg p-8 text-center text-gray-500">
        <span class="text-4xl mb-2 block">✅</span>
        <p class="text-lg">Bekleyen garson çağrısı yok</p>
      </div>
    `;
  } else {
    pendingCalls.forEach(call => {
      const tableId = call.tableId || 'Bilinmiyor';
      const callTime = call.createdAt ? new Date(call.createdAt.seconds ? call.createdAt.seconds * 1000 : call.createdAt).toLocaleString('tr-TR') : 'Şimdi';
      const timeAgo = getTimeAgo(call.createdAt);
      
      html += `
        <div id="call-${call.id}" class="notification-card bg-red-50 border-2 border-red-200 rounded-xl p-5 shadow-lg hover:shadow-xl transition-all animate-pulse-once" data-table-id="${tableId}">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-4 flex-1">
              <div class="bg-red-500 rounded-full w-12 h-12 flex items-center justify-center text-white text-xl font-bold animate-pulse">
                🪑
              </div>
              <div class="flex-1">
                <h4 class="text-lg font-bold text-gray-800">Masa ${tableId} - Garson Çağrısı</h4>
                <p class="text-sm text-gray-600">${callTime}</p>
                <p class="text-xs text-red-600 mt-1">${timeAgo}</p>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <button onclick="showCallDetails('${call.id}')" 
                      class="bg-blue-500 hover:bg-blue-600 text-white font-semibold px-4 py-2 rounded-lg transition-colors">
                Detay
              </button>
              <button onclick="markWaiterCallAsAnswered('${call.id}')" 
                      class="bg-red-500 hover:bg-red-600 text-white font-semibold px-6 py-2 rounded-lg transition-colors">
                Görüldü İşaretle
              </button>
            </div>
          </div>
        </div>
      `;
    });
  }
  
  html += `
        </div>
      </div>
    </div>
  `;
  
  html += `
      <!-- Bildirim Detayları Modal -->
      <div id="call-details-modal" class="hidden fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
        <div class="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-xl font-bold text-gray-800">Çağrı Detayları</h3>
            <button onclick="closeCallDetails()" class="text-gray-500 hover:text-gray-700 text-2xl">&times;</button>
          </div>
          <div id="call-details-content"></div>
        </div>
      </div>
    </div>
  `;
  
  content.innerHTML = html;
  
  // Badge güncelle
  updateNotificationBadge();
  
  // Otomatik yenileme başlat
  startNotificationAutoRefresh();
  
  // Sesli bildirim kontrolü
  checkAndPlayNotificationSound(pendingCalls.length);
}

// Bekleyen çağrıları göster (artık sadece bu var)
function showPendingCalls() {
  document.getElementById('pending-calls-section').classList.remove('hidden');
}

// Global scope'a ekle
window.showPendingCalls = showPendingCalls;

// Bildirim badge'ini güncelle
function updateNotificationBadge() {
  const badge = document.getElementById('notification-badge');
  if (badge) {
    const pendingCount = pendingWaiterCalls.filter(call => call.status === 'pending' || !call.status).length;
    if (pendingCount > 0) {
      badge.textContent = pendingCount;
      badge.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
    }
  }
}

// Garson çağrısını görüldü olarak işaretle
async function markWaiterCallAsAnswered(callId) {
  if (!isElectron || !window.electronAPI) {
    alert('Bu özellik sadece Electron uygulamasında çalışır!');
    return;
  }
  
  try {
    console.log(`✅ Garson çağrısı görüldü olarak işaretleniyor: ${callId}`);
    
    // Firestore'da durumu güncelle
    if (window.electronAPI.dbUpdateWaiterCall) {
      const answeredAt = new Date().toISOString();
      await window.electronAPI.dbUpdateWaiterCall(callId, { 
        status: 'answered',
        answeredAt: answeredAt
      });
      console.log(`✅ Garson çağrısı güncellendi: ${callId}`);
      
      // Local state'i güncelle
      const callIndex = pendingWaiterCalls.findIndex(call => call.id === callId);
      if (callIndex !== -1) {
        const call = pendingWaiterCalls[callIndex];
        call.status = 'answered';
        call.answeredAt = answeredAt;
        
        // DOM'dan bekleyen çağrı kartını kaldır
        const callElement = document.getElementById(`call-${callId}`);
        if (callElement) {
          callElement.remove();
        }
        
        // Kart sayılarını güncelle
        updateNotificationCounts();
        
        // Eğer bekleyen çağrı kalmadıysa, boş mesaj göster
        const pendingCallsList = document.getElementById('pending-calls-list');
        if (pendingCallsList && pendingCallsList.children.length === 0) {
          pendingCallsList.innerHTML = `
            <div class="bg-gray-50 rounded-lg p-8 text-center text-gray-500">
              <span class="text-4xl mb-2 block">✅</span>
              <p class="text-lg">Bekleyen garson çağrısı yok</p>
            </div>
          `;
        }
      }
      
      // Badge güncelle
      updateNotificationBadge();
    } else {
      console.warn('⚠️ dbUpdateWaiterCall API mevcut değil');
      alert('Güncelleme yapılamadı!');
    }
  } catch (error) {
    console.error('❌ Garson çağrısı güncelleme hatası:', error);
    alert('Garson çağrısı güncellenemedi. Lütfen tekrar deneyin.');
  }
}

// Bildirim sayılarını güncelle (kartlardaki)
function updateNotificationCounts() {
  const pendingCalls = pendingWaiterCalls.filter(call => call.status === 'pending' || !call.status);
  
  // Bekleyen çağrılar kartındaki sayıyı güncelle
  const pendingCard = document.querySelector('.bg-red-50.border-red-200');
  if (pendingCard) {
    const pendingBadge = pendingCard.querySelector('.bg-red-500');
    if (pendingBadge) {
      pendingBadge.textContent = pendingCalls.length;
    }
  }
  
  // İstatistik kartlarındaki sayıları güncelle
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  
  const todayCalls = pendingCalls.filter(call => {
    const callDate = call.createdAt ? new Date(call.createdAt.seconds ? call.createdAt.seconds * 1000 : call.createdAt) : new Date(0);
    return callDate >= todayStart;
  }).length;
  
  const weekCalls = pendingCalls.filter(call => {
    const callDate = call.createdAt ? new Date(call.createdAt.seconds ? call.createdAt.seconds * 1000 : call.createdAt) : new Date(0);
    return callDate >= weekStart;
  }).length;
  
  const monthCalls = pendingCalls.filter(call => {
    const callDate = call.createdAt ? new Date(call.createdAt.seconds ? call.createdAt.seconds * 1000 : call.createdAt) : new Date(0);
    return callDate >= monthStart;
  }).length;
  
  // İstatistik kartlarını güncelle
  const statsCards = document.querySelectorAll('.bg-blue-50, .bg-purple-50, .bg-indigo-50, .bg-orange-50');
  if (statsCards.length >= 4) {
    const todayCard = statsCards[0]?.querySelector('.text-2xl');
    const weekCard = statsCards[1]?.querySelector('.text-2xl');
    const monthCard = statsCards[2]?.querySelector('.text-2xl');
    const totalCard = statsCards[3]?.querySelector('.text-2xl');
    
    if (todayCard) todayCard.textContent = todayCalls;
    if (weekCard) weekCard.textContent = weekCalls;
    if (monthCard) monthCard.textContent = monthCalls;
    if (totalCard) totalCard.textContent = pendingCalls.length;
  }
}

// Global scope'a ekle
window.updateNotificationCounts = updateNotificationCounts;

// Global scope'a ekle
window.markWaiterCallAsAnswered = markWaiterCallAsAnswered;

// Zaman farkını hesapla (örn: "2 dakika önce")
function getTimeAgo(timestamp) {
  if (!timestamp) return 'Az önce';
  
  const now = new Date();
  const callDate = timestamp.seconds ? new Date(timestamp.seconds * 1000) : new Date(timestamp);
  const diffMs = now - callDate;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return 'Az önce';
  if (diffMins < 60) return `${diffMins} dakika önce`;
  if (diffHours < 24) return `${diffHours} saat önce`;
  return `${diffDays} gün önce`;
}

// Sesli bildirim çal
function playNotificationSound() {
  try {
    // Web Audio API ile basit bir beep sesi oluştur
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 800; // Frekans
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
  } catch (error) {
    console.warn('Ses çalınamadı:', error);
  }
}

// Yeni bildirim geldiğinde ses çal
let lastNotificationCount = 0;
function checkAndPlayNotificationSound(currentCount) {
  if (currentCount > lastNotificationCount) {
    playNotificationSound();
    lastNotificationCount = currentCount;
  }
}

// Bildirimleri yenile
function refreshNotifications() {
  const content = document.getElementById('main-content');
  if (content && content.innerHTML.includes('Bildirimler')) {
    loadNotificationsView();
  }
}

// Tüm bekleyen çağrıları görüldü işaretle
async function markAllAsAnswered() {
  if (!isElectron || !window.electronAPI) {
    alert('Bu özellik sadece Electron uygulamasında çalışır!');
    return;
  }
  
  const pendingCalls = pendingWaiterCalls.filter(call => call.status === 'pending' || !call.status);
  
  if (pendingCalls.length === 0) {
    alert('Görüldü işaretlenecek çağrı yok!');
    return;
  }
  
  if (!confirm(`${pendingCalls.length} çağrıyı görüldü olarak işaretlemek istediğinize emin misiniz?`)) {
    return;
  }
  
  try {
    const answeredAt = new Date().toISOString();
    
    for (const call of pendingCalls) {
      if (window.electronAPI.dbUpdateWaiterCall) {
        await window.electronAPI.dbUpdateWaiterCall(call.id, {
          status: 'answered',
          answeredAt: answeredAt
        });
        
        // Local state'i güncelle
        const callIndex = pendingWaiterCalls.findIndex(c => c.id === call.id);
        if (callIndex !== -1) {
          pendingWaiterCalls[callIndex].status = 'answered';
          pendingWaiterCalls[callIndex].answeredAt = answeredAt;
        }
      }
    }
    
    // Sayfayı yenile
    refreshNotifications();
    updateNotificationBadge();
    alert(`${pendingCalls.length} çağrı görüldü olarak işaretlendi!`);
  } catch (error) {
    console.error('❌ Toplu güncelleme hatası:', error);
    alert('Bazı çağrılar güncellenemedi. Lütfen tekrar deneyin.');
  }
}

// Bildirimleri filtrele
function filterNotifications() {
  const searchTerm = document.getElementById('notification-search')?.value.toLowerCase() || '';
  const cards = document.querySelectorAll('.notification-card');
  
  cards.forEach(card => {
    const tableId = card.getAttribute('data-table-id') || '';
    if (tableId.toLowerCase().includes(searchTerm)) {
      card.style.display = '';
    } else {
      card.style.display = 'none';
    }
  });
}

// Çağrı detaylarını göster
function showCallDetails(callId) {
  const call = pendingWaiterCalls.find(c => c.id === callId);
  if (!call) return;
  
  const modal = document.getElementById('call-details-modal');
  const content = document.getElementById('call-details-content');
  
  if (!modal || !content) return;
  
  const tableId = call.tableId || 'Bilinmiyor';
  const callTime = call.createdAt ? new Date(call.createdAt.seconds ? call.createdAt.seconds * 1000 : call.createdAt).toLocaleString('tr-TR') : 'Şimdi';
  const timeAgo = getTimeAgo(call.createdAt);
  
  content.innerHTML = `
    <div class="space-y-4">
      <div class="bg-red-50 rounded-lg p-4">
        <div class="flex items-center gap-3 mb-2">
          <span class="text-3xl">🪑</span>
          <div>
            <h4 class="text-lg font-bold text-gray-800">Masa ${tableId}</h4>
            <p class="text-sm text-gray-600">Garson Çağrısı</p>
          </div>
        </div>
      </div>
      
      <div class="space-y-2">
        <div class="flex justify-between">
          <span class="text-gray-600">Çağrı Zamanı:</span>
          <span class="font-semibold">${callTime}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-gray-600">Ne Kadar Önce:</span>
          <span class="font-semibold text-red-600">${timeAgo}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-gray-600">Durum:</span>
          <span class="font-semibold text-red-600">Bekliyor</span>
        </div>
      </div>
      
      <div class="flex gap-2 pt-4">
        <button onclick="markWaiterCallAsAnswered('${callId}'); closeCallDetails();" 
                class="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold px-4 py-2 rounded-lg transition-colors">
          Görüldü İşaretle
        </button>
        <button onclick="closeCallDetails()" 
                class="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold px-4 py-2 rounded-lg transition-colors">
          Kapat
        </button>
      </div>
    </div>
  `;
  
  modal.classList.remove('hidden');
}

// Çağrı detaylarını kapat
function closeCallDetails() {
  const modal = document.getElementById('call-details-modal');
  if (modal) {
    modal.classList.add('hidden');
  }
}

// Modal dışına tıklandığında kapat
document.addEventListener('click', (e) => {
  const modal = document.getElementById('call-details-modal');
  if (modal && !modal.classList.contains('hidden')) {
    const modalContent = modal.querySelector('.bg-white');
    if (modalContent && !modalContent.contains(e.target) && !e.target.closest('.bg-white')) {
      closeCallDetails();
    }
  }
});

// Otomatik yenileme başlat
let notificationRefreshInterval = null;
function startNotificationAutoRefresh() {
  // Önceki interval'i temizle
  if (notificationRefreshInterval) {
    clearInterval(notificationRefreshInterval);
  }
  
  // Her 5 saniyede bir güncelleme zamanını güncelle
  notificationRefreshInterval = setInterval(() => {
    const lastUpdateTime = document.getElementById('last-update-time');
    if (lastUpdateTime) {
      lastUpdateTime.textContent = `Son güncelleme: ${new Date().toLocaleTimeString('tr-TR')}`;
    }
  }, 5000);
}

// Global scope'a ekle
window.getTimeAgo = getTimeAgo;
window.playNotificationSound = playNotificationSound;
window.refreshNotifications = refreshNotifications;
window.markAllAsAnswered = markAllAsAnswered;
window.filterNotifications = filterNotifications;
window.showCallDetails = showCallDetails;
window.closeCallDetails = closeCallDetails;

// Staff Management (same as before)
async function loadStaffManagement() {
  if (!isElectron) return;
  
  try {
    staffList = await window.electronAPI.dbGetAllStaff();
    renderStaffManagement();
  } catch (error) {
    console.error('Staff load error:', error);
  }
}

function renderStaffManagement() {
  const content = document.getElementById('main-content');
  
  let html = `
    <div class="mb-6 flex justify-between items-center">
      <h2 class="text-2xl font-bold text-gray-800">Çalışan Yönetimi</h2>
      <button onclick="openStaffModal()" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg">+ Yeni Çalışan</button>
    </div>
    <div class="space-y-4">
  `;
  
  staffList.forEach(staff => {
    html += `
      <div class="bg-white rounded-lg shadow-lg p-5 flex justify-between items-center">
        <div>
          <h3 class="font-bold text-lg text-gray-800">${staff.name}</h3>
          <p class="text-sm text-gray-500">${staff.email}</p>
        </div>
        <div class="flex items-center gap-3">
          <span class="text-xs font-semibold px-3 py-1 rounded-full ${staff.role === 'admin' ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'}">
            ${staff.role === 'admin' ? 'Yönetici' : 'Çalışan'}
          </span>
          ${staff.role !== 'admin' ? `
            <button onclick="editStaff('${staff.id}')" class="text-sm bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold py-2 px-3 rounded-lg">Düzenle</button>
            <button onclick="deleteStaff('${staff.id}')" class="text-sm bg-red-100 hover:bg-red-200 text-red-800 font-bold py-2 px-3 rounded-lg">Sil</button>
          ` : ''}
        </div>
      </div>
    `;
  });
  
  html += `</div>`;
  content.innerHTML = html;
}

// Utility functions
async function clearAllOrders() {
  if (!confirm('Tüm siparişler silinecek! Emin misiniz?')) return;
  
  try {
    await window.electronAPI.dbClearOrders();
    alert('Tüm siparişler silindi!');
    await loadReports();
  } catch (error) {
    alert('Silme hatası!');
  }
}

async function deleteStaff(id) {
  if (!confirm('Bu çalışanı silmek istediğinizden emin misiniz?')) return;
  
  try {
    await window.electronAPI.dbDeleteStaff(id);
    await loadStaffManagement();
  } catch (error) {
    alert('Silme hatası!');
  }
}

async function deleteMenuItem(id) {
  if (!confirm('Bu ürünü silmek istediğinizden emin misiniz?')) return;
  
  try {
    await window.electronAPI.dbDeleteMenuItem(id);
    alert('Ürün başarıyla silindi!');
    await loadMenuView();
  } catch (error) {
    console.error('Delete menu item error:', error);
    alert('Silme hatası: ' + (error.message || 'Bilinmeyen hata'));
  }
}

// Product Modal Functions
let editingProductId = null;

function openProductModal(productId = null) {
  editingProductId = productId;
  const modal = document.getElementById('product-modal');
  const title = document.getElementById('product-modal-title');
  const form = document.getElementById('product-form');
  
  // Kategori select'ini güncelle
  updateProductCategorySelect();
  
  // Kategori değişikliğini dinle
  const categorySelect = document.getElementById('product-category');
  if (categorySelect && !categorySelect.hasAttribute('data-listener-added')) {
    categorySelect.addEventListener('change', function() {
      toggleHelvaPriceFields(this.value);
    });
    categorySelect.setAttribute('data-listener-added', 'true');
  }
  
  if (productId) {
    // Edit mode
    const product = menuItems.find(p => p.id === productId);
    if (product) {
      title.textContent = 'Ürünü Düzenle';
      document.getElementById('product-name').value = product.name || '';
      const category = product.category || '';
      document.getElementById('product-category').value = category;
      
      // Helvalar kategorisiyse büyük/küçük fiyatları göster
      if (category === 'helvalar') {
        document.getElementById('product-price-small').value = product.priceSmall || product.price || 0;
        document.getElementById('product-price-large').value = product.priceLarge || product.price || 0;
        toggleHelvaPriceFields('helvalar');
      } else {
        document.getElementById('product-price').value = product.price || 0;
        toggleHelvaPriceFields(category);
      }
      
      document.getElementById('product-description').value = product.description || '';
    }
  } else {
    // Add mode
    title.textContent = 'Yeni Ürün Ekle';
    form.reset();
    toggleHelvaPriceFields('');
  }
  
  modal.classList.remove('hidden');
}

// Helvalar kategorisi için fiyat alanlarını göster/gizle
function toggleHelvaPriceFields(category) {
  const normalPriceContainer = document.getElementById('normal-price-container');
  const helvaPriceContainer = document.getElementById('helva-price-container');
  const normalPriceInput = document.getElementById('product-price');
  const smallPriceInput = document.getElementById('product-price-small');
  const largePriceInput = document.getElementById('product-price-large');
  
  if (category === 'helvalar') {
    // Helvalar kategorisi - büyük/küçük fiyatları göster
    if (normalPriceContainer) normalPriceContainer.classList.add('hidden');
    if (helvaPriceContainer) helvaPriceContainer.classList.remove('hidden');
    if (normalPriceInput) normalPriceInput.removeAttribute('required');
    if (smallPriceInput) smallPriceInput.setAttribute('required', 'required');
    if (largePriceInput) largePriceInput.setAttribute('required', 'required');
  } else {
    // Diğer kategoriler - normal fiyat göster
    if (normalPriceContainer) normalPriceContainer.classList.remove('hidden');
    if (helvaPriceContainer) helvaPriceContainer.classList.add('hidden');
    if (normalPriceInput) normalPriceInput.setAttribute('required', 'required');
    if (smallPriceInput) smallPriceInput.removeAttribute('required');
    if (largePriceInput) largePriceInput.removeAttribute('required');
  }
}

function closeProductModal() {
  const modal = document.getElementById('product-modal');
  modal.classList.add('hidden');
  editingProductId = null;
  document.getElementById('product-form').reset();
}

async function saveProduct(e) {
  e.preventDefault();
  
  if (!isElectron) {
    alert('Electron uygulaması gerekli!');
    return;
  }
  
  const category = document.getElementById('product-category').value;
  const productData = {
    name: document.getElementById('product-name').value.trim(),
    category: category,
    description: document.getElementById('product-description').value.trim(),
  };
  
  // Helvalar kategorisi için büyük/küçük fiyatları al
  if (category === 'helvalar') {
    const priceSmall = parseFloat(document.getElementById('product-price-small').value);
    const priceLarge = parseFloat(document.getElementById('product-price-large').value);
    
    if (!priceSmall || !priceLarge || priceSmall <= 0 || priceLarge <= 0) {
      alert('Lütfen hem küçük hem büyük fiyatı girin!');
      return;
    }
    
    productData.priceSmall = priceSmall;
    productData.priceLarge = priceLarge;
    // Geriye uyumluluk için price olarak küçük fiyatı kaydet (default)
    productData.price = priceSmall;
  } else {
    // Diğer kategoriler için normal fiyat
    const price = parseFloat(document.getElementById('product-price').value) || 0;
    if (price <= 0) {
      alert('Lütfen geçerli bir fiyat girin!');
      return;
    }
    productData.price = price;
  }
  
  if (!productData.name || !productData.category) {
    alert('Lütfen ürün adı ve kategori girin!');
    return;
  }
  
  try {
    if (editingProductId) {
      // Update
      await window.electronAPI.dbUpdateMenuItem(editingProductId, productData);
      alert('Ürün başarıyla güncellendi!');
    } else {
      // Create
      await window.electronAPI.dbCreateMenuItem(productData);
      alert('Ürün başarıyla eklendi!');
    }
    
    closeProductModal();
    await loadMenuView();
  } catch (error) {
    console.error('Product save error:', error);
    alert('Ürün kaydedilemedi: ' + (error.message || 'Bilinmeyen hata'));
  }
}

let editingStaffId = null;

function openStaffModal(staffId = null) {
  editingStaffId = staffId;
  const modal = document.getElementById('staff-modal');
  const title = document.getElementById('staff-modal-title');
  
  // Form alanlarını temizle
  document.getElementById('staff-name').value = '';
  document.getElementById('staff-email').value = '';
  document.getElementById('staff-password').value = '';
  document.getElementById('staff-role').value = 'staff';
  
  if (staffId) {
    // Düzenleme modu
    title.textContent = 'Çalışan Düzenle';
    const staff = staffList.find(s => s.id === staffId);
    if (staff) {
      document.getElementById('staff-name').value = staff.name || '';
      document.getElementById('staff-email').value = staff.email || '';
      document.getElementById('staff-role').value = staff.role || 'staff';
      // Şifre alanını boş bırak (değiştirilmek istenirse doldurulabilir)
    }
  } else {
    // Yeni ekleme modu
    title.textContent = 'Yeni Çalışan Ekle';
  }
  
  modal.classList.remove('hidden');
}

function closeStaffModal() {
  const modal = document.getElementById('staff-modal');
  modal.classList.add('hidden');
  editingStaffId = null;
  
  // Form alanlarını temizle
  document.getElementById('staff-name').value = '';
  document.getElementById('staff-email').value = '';
  document.getElementById('staff-password').value = '';
  document.getElementById('staff-role').value = 'staff';
}

async function saveStaff(event) {
  event.preventDefault();
  
  if (!isElectron) {
    alert('Bu özellik sadece Electron uygulamasında çalışır!');
    return;
  }
  
  const name = document.getElementById('staff-name').value.trim();
  const email = document.getElementById('staff-email').value.trim();
  const password = document.getElementById('staff-password').value;
  const role = document.getElementById('staff-role').value;
  
  // Validasyon
  if (!name || !email) {
    alert('Lütfen tüm alanları doldurun!');
    return;
  }
  
  if (!editingStaffId && !password) {
    alert('Lütfen şifre girin!');
    return;
  }
  
  if (password && password.length < 6) {
    alert('Şifre en az 6 karakter olmalıdır!');
    return;
  }
  
  try {
    if (editingStaffId) {
      // Güncelleme
      const updates = {
        name,
        email,
        role
      };
      
      // Şifre değiştirilmek isteniyorsa ekle
      if (password) {
        updates.password = password;
      }
      
      await window.electronAPI.dbUpdateStaff(editingStaffId, updates);
      alert('Çalışan başarıyla güncellendi!');
    } else {
      // Yeni ekleme
      const staffData = {
        name,
        email,
        password,
        role
      };
      
      await window.electronAPI.dbCreateStaff(staffData);
      alert('Çalışan başarıyla eklendi!');
    }
    
    closeStaffModal();
    await loadStaffManagement();
  } catch (error) {
    console.error('Çalışan kaydetme hatası:', error);
    alert('Çalışan kaydedilemedi! Hata: ' + (error.message || 'Bilinmeyen hata'));
  }
}

function editStaff(id) {
  openStaffModal(id);
}

// Global scope'a ekle
window.openStaffModal = openStaffModal;
window.closeStaffModal = closeStaffModal;
window.saveStaff = saveStaff;
window.editStaff = editStaff;

// Category Management
let editingCategoryKey = null;

function openCategoryModal(categoryKey = null) {
  editingCategoryKey = categoryKey;
  const modal = document.getElementById('category-modal');
  const title = document.getElementById('category-modal-title');
  const form = document.getElementById('category-form');
  
  if (categoryKey && categories[categoryKey]) {
    // Edit mode
    const category = categories[categoryKey];
    title.textContent = 'Kategoriyi Düzenle';
    document.getElementById('category-name').value = category.name || '';
    document.getElementById('category-icon').value = category.icon || '';
  } else {
    // Add mode
    title.textContent = 'Yeni Kategori Ekle';
    form.reset();
  }
  
  modal.classList.remove('hidden');
}

function closeCategoryModal() {
  const modal = document.getElementById('category-modal');
  modal.classList.add('hidden');
  editingCategoryKey = null;
  const form = document.getElementById('category-form');
  if (form) form.reset();
}

async function saveCategory(e) {
  e.preventDefault();
  
  const categoryName = document.getElementById('category-name').value.trim();
  const categoryIcon = document.getElementById('category-icon').value.trim();
  
  if (!categoryName || !categoryIcon) {
    alert('Lütfen kategori adı ve ikon girin!');
    return;
  }
  
  try {
    // Kategori key'ini oluştur (Türkçe karakterleri değiştir, küçük harfe çevir)
    const categoryKey = categoryName
      .toLowerCase()
      .replace(/ş/g, 's')
      .replace(/ğ/g, 'g')
      .replace(/ü/g, 'u')
      .replace(/ö/g, 'o')
      .replace(/ç/g, 'c')
      .replace(/ı/g, 'i')
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');
    
    if (editingCategoryKey && editingCategoryKey !== 'hepsi') {
      // Edit mode - eski kategoriyi güncelle
      const oldKey = editingCategoryKey;
      if (oldKey !== categoryKey) {
        // Key değişti, yeni key ile oluştur ve eskiyi sil
        categories[categoryKey] = { name: categoryName, icon: categoryIcon };
        delete categories[oldKey];
        
        // Bu kategorideki tüm ürünleri güncelle
        if (isElectron && window.electronAPI && window.electronAPI.dbGetMenuItems) {
          try {
            const items = await window.electronAPI.dbGetMenuItems();
            for (const item of items) {
              if (item.category === oldKey) {
                await window.electronAPI.dbUpdateMenuItem(item.id, { category: categoryKey });
              }
            }
          } catch (error) {
            console.error('Ürün kategorileri güncellenirken hata:', error);
          }
        }
      } else {
        // Aynı key, sadece güncelle
        categories[categoryKey] = { name: categoryName, icon: categoryIcon };
      }
    } else {
      // Add mode
      if (categories[categoryKey]) {
        alert('Bu kategori zaten mevcut!');
        return;
      }
      categories[categoryKey] = { name: categoryName, icon: categoryIcon };
    }
    
    // Kategorileri kaydet
    saveCategories();
    
    closeCategoryModal();
    
    // Menü görünümünü ve ürün modal'ındaki kategori listesini güncelle
    await loadMenuView();
    updateProductCategorySelect();
    
    alert('✅ Kategori başarıyla kaydedildi!');
  } catch (error) {
    console.error('Kategori kaydetme hatası:', error);
    alert('Kategori kaydedilemedi: ' + error.message);
  }
}

function deleteCategory(categoryKey) {
  if (categoryKey === 'hepsi') {
    alert('"Hepsi" kategorisi silinemez!');
    return;
  }
  
  if (!confirm(`"${categories[categoryKey]?.name || categoryKey}" kategorisini silmek istediğinize emin misiniz?\n\nBu kategorideki ürünler de silinecektir.`)) {
    return;
  }
  
  try {
    // Kategorideki ürünleri kontrol et
    const categoryItems = menuItems.filter(item => item.category === categoryKey);
    
    if (categoryItems.length > 0) {
      if (!confirm(`Bu kategoride ${categoryItems.length} ürün bulunuyor. Kategori silinirse bu ürünler de silinecektir. Devam etmek istiyor musunuz?`)) {
        return;
      }
      
      // Ürünleri sil
      categoryItems.forEach(async (item) => {
        try {
          if (isElectron && window.electronAPI && window.electronAPI.dbDeleteMenuItem) {
            await window.electronAPI.dbDeleteMenuItem(item.id);
          }
        } catch (error) {
          console.error('Ürün silme hatası:', error);
        }
      });
    }
    
    // Kategoriyi sil
    delete categories[categoryKey];
    saveCategories();
    
    // Menü görünümünü güncelle
    loadMenuView();
    updateProductCategorySelect();
    
    alert('✅ Kategori başarıyla silindi!');
  } catch (error) {
    console.error('Kategori silme hatası:', error);
    alert('Kategori silinemedi: ' + error.message);
  }
}

// Ürün modal'ındaki kategori select'ini güncelle
function updateProductCategorySelect() {
  const categorySelect = document.getElementById('product-category');
  if (!categorySelect) return;
  
  const currentValue = categorySelect.value;
  
  // 'hepsi' hariç tüm kategorileri ekle
  categorySelect.innerHTML = '<option value="">Kategori Seçin</option>';
  
  Object.keys(categories).forEach(catKey => {
    if (catKey !== 'hepsi') {
      const category = categories[catKey];
      categorySelect.innerHTML += `
        <option value="${catKey}">${category.icon} ${category.name}</option>
      `;
    }
  });
  
  // Önceki değeri geri yükle
  if (currentValue && categories[currentValue]) {
    categorySelect.value = currentValue;
  }
}

// Global scope'a ekle
window.openCategoryModal = openCategoryModal;
window.closeCategoryModal = closeCategoryModal;
window.saveCategory = saveCategory;
window.deleteCategory = deleteCategory;
window.updateProductCategorySelect = updateProductCategorySelect;

// Settings View
let appSettings = {
  okeyTables: 10,
  normalTables: 10
};

async function loadSettingsView() {
  if (!isElectron) return;
  
  try {
    // Ayarları veritabanından yükle (eğer varsa)
    if (window.electronAPI && window.electronAPI.dbGetSettings) {
      const settings = await window.electronAPI.dbGetSettings();
      if (settings) {
        appSettings = { ...appSettings, ...settings };
        
        // Masa sayıları ayarlandıysa masaları güncelle
        const okeyCount = settings.okeyTables || 10;
        const normalCount = settings.normalTables || 10;
        initializeTables(okeyCount, normalCount);
      }
    }
    renderSettingsView();
  } catch (error) {
    console.error('Settings load error:', error);
    renderSettingsView(); // Hata olsa bile varsayılan ayarlarla göster
  }
}

function renderSettingsView() {
  const content = document.getElementById('main-content');
  
  let html = `
    <div class="max-w-4xl mx-auto">
      <!-- Header -->
      <div class="mb-8">
        <h1 class="text-4xl font-bold text-gray-800 mb-2">⚙️ Ayarlar</h1>
        <p class="text-gray-500">Sistem ve cafe ayarlarını buradan yönetebilirsiniz</p>
      </div>
      
      <!-- Masa Ayarları -->
      <div class="bg-white rounded-xl shadow-lg p-6 mb-6">
        <h2 class="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
          <span>🪑</span>
          <span>Masa Ayarları</span>
        </h2>
        <form id="table-settings-form" onsubmit="saveTableSettings(event)">
          <div class="grid grid-cols-2 gap-6">
            <div class="bg-green-50 p-4 rounded-lg border-2 border-green-200">
              <label class="block mb-2 text-sm font-medium text-gray-700">🎴 Okey Masası Sayısı *</label>
              <input type="number" id="okey-tables" required min="0" max="100"
                     value="${appSettings.okeyTables || 10}"
                     class="w-full p-3 border-2 border-green-300 rounded-lg focus:outline-none focus:border-green-500">
              <p class="text-xs text-gray-600 mt-1">Okey masalarının toplam sayısı</p>
            </div>
            <div class="bg-blue-50 p-4 rounded-lg border-2 border-blue-200">
              <label class="block mb-2 text-sm font-medium text-gray-700">🪑 Normal Masa Sayısı *</label>
              <input type="number" id="normal-tables" required min="0" max="100"
                     value="${appSettings.normalTables || 10}"
                     class="w-full p-3 border-2 border-blue-300 rounded-lg focus:outline-none focus:border-blue-500">
              <p class="text-xs text-gray-600 mt-1">Normal masaların toplam sayısı</p>
            </div>
          </div>
          <div class="mt-6 bg-gray-50 p-4 rounded-lg">
            <div class="flex justify-between items-center">
              <span class="text-sm font-medium text-gray-700">Toplam Masa Sayısı:</span>
              <span class="text-xl font-bold text-blue-600" id="total-tables-display">${(appSettings.okeyTables || 10) + (appSettings.normalTables || 10)}</span>
            </div>
            <p class="text-xs text-gray-500 mt-2">Masalar kategorilerine göre numaralandırılacaktır</p>
          </div>
          <div class="mt-6 flex justify-end">
            <button type="submit" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg">
              💾 Kaydet
            </button>
          </div>
        </form>
      </div>
      
      <!-- Sistem Bilgileri -->
      <div class="bg-white rounded-xl shadow-lg p-6 mb-6">
        <h2 class="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
          <span>ℹ️</span>
          <span>Sistem Bilgileri</span>
        </h2>
        <div class="space-y-4">
          <div class="flex justify-between items-center py-3 border-b">
            <span class="text-gray-600">Uygulama Versiyonu</span>
            <span class="font-semibold">1.0.0</span>
          </div>
          <div class="flex justify-between items-center py-3 border-b">
            <span class="text-gray-600">Veritabanı Yolu</span>
            <span class="font-semibold text-sm text-gray-500">~/.config/bihter-admin/bihter_admin.db</span>
          </div>
        </div>
      </div>
      
      <!-- Veri Yönetimi -->
      <div class="bg-white rounded-xl shadow-lg p-6 mb-6 border-l-4 border-red-500">
        <h2 class="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
          <span>🗑️</span>
          <span>Veri Yönetimi</span>
        </h2>
        <div class="bg-red-50 p-4 rounded-lg mb-4">
          <p class="text-sm text-red-700 mb-2">
            <strong>⚠️ Dikkat:</strong> Aşağıdaki işlemler geri alınamaz!
          </p>
          <p class="text-xs text-red-600">
            Tüm sipariş kayıtlarını ve ciroyu sıfırlamak için aşağıdaki butona tıklayın. Bu işlem tüm sipariş geçmişini kalıcı olarak siler.
          </p>
        </div>
        <button onclick="resetRevenue()" 
                class="px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition shadow-lg flex items-center gap-2 font-bold">
          <span>🗑️</span>
          <span>Ciroyu ve Tüm Siparişleri Sıfırla</span>
        </button>
      </div>
    </div>
  `;
  
  content.innerHTML = html;
  
  // Toplam masa sayısı güncelleme event listener'larını ekle
  setTimeout(() => {
    updateTotalTablesDisplay();
  }, 100);
}

async function saveTableSettings(e) {
  e.preventDefault();
  
  if (!isElectron) {
    alert('Electron uygulaması gerekli!');
    return;
  }
  
  const okeyTables = parseInt(document.getElementById('okey-tables').value) || 0;
  const normalTables = parseInt(document.getElementById('normal-tables').value) || 0;
  const totalTables = okeyTables + normalTables;
  
  if (okeyTables < 0 || okeyTables > 100) {
    alert('Okey masası sayısı 0 ile 100 arasında olmalıdır!');
    return;
  }
  
  if (normalTables < 0 || normalTables > 100) {
    alert('Normal masa sayısı 0 ile 100 arasında olmalıdır!');
    return;
  }
  
  if (totalTables === 0) {
    alert('En az bir masa tanımlanmalıdır!');
    return;
  }
  
  try {
    const settings = {
      okeyTables: okeyTables,
      normalTables: normalTables
    };
    
    if (window.electronAPI.dbSaveSettings) {
      await window.electronAPI.dbSaveSettings(settings);
    } else {
      localStorage.setItem('bihter_table_settings', JSON.stringify(settings));
    }
    
    appSettings.okeyTables = okeyTables;
    appSettings.normalTables = normalTables;
    
    // Masa listesini güncelle
    initializeTables(okeyTables, normalTables);
    
    alert(`✅ Masa ayarları kaydedildi!\n\n🎴 Okey Masaları: ${okeyTables}\n🪑 Normal Masalar: ${normalTables}\n📊 Toplam: ${totalTables} masa`);
    
    // Eğer masa görünümündeyse yenile
    if (currentMainTab === 'tables') {
      await loadTablesView();
    }
    
    // Ayarlar sayfasını yenile
    if (currentMainTab === 'settings') {
      await loadSettingsView();
    }
  } catch (error) {
    console.error('Save table settings error:', error);
    alert('Masa ayarları kaydedilemedi: ' + error.message);
  }
}

// Masa sayılarını değiştirirken toplamı güncelle
function updateTotalTablesDisplay() {
  const okeyInput = document.getElementById('okey-tables');
  const normalInput = document.getElementById('normal-tables');
  const totalDisplay = document.getElementById('total-tables-display');
  
  if (okeyInput && normalInput && totalDisplay) {
    okeyInput.addEventListener('input', () => {
      const total = (parseInt(okeyInput.value) || 0) + (parseInt(normalInput.value) || 0);
      totalDisplay.textContent = total;
    });
    
    normalInput.addEventListener('input', () => {
      const total = (parseInt(okeyInput.value) || 0) + (parseInt(normalInput.value) || 0);
      totalDisplay.textContent = total;
    });
  }
}
