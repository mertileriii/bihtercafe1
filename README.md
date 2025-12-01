# Bihter Kafe - Electron Admin Panel

Bihter Kafe için Electron tabanlı masaüstü admin paneli uygulaması.

## 📋 Özellikler

- ✅ **Menü Yönetimi** - Ürün ekleme, düzenleme, silme
- ✅ **Ciro Raporları** - Toplam ciro, sipariş sayısı, ortalama sipariş değeri
- ✅ **Çalışan Satış Raporları** - Her çalışanın satış performansı
- ✅ **Ürün Satış Detayları** - Detaylı ürün satış raporları
- ✅ **Çalışan Yönetimi** - Çalışan ekleme, düzenleme, silme
- ✅ **SQLite Veritabanı** - Local veritabanı, tamamen offline çalışır

## 🚀 Kurulum

```bash
# Bağımlılıkları yükle
npm install
```

## 💻 Çalıştırma

```bash
# Normal mod
npm start

# Geliştirme modu (DevTools ile)
npm run dev
```

## 🔐 Giriş Bilgileri

**Varsayılan Admin:**
- Email: `admin@bihter.com`
- Şifre: `admin123`

## 🏗️ Production Build

### macOS
```bash
npm run build:mac
```

### Windows
```bash
npm run build:win
```

### Linux
```bash
npm run build:linux
```

Build dosyaları `dist` klasöründe oluşturulacaktır.

## 📁 Dosya Yapısı

```
bihter1/
├── electron/
│   ├── main.js       # Electron main process
│   └── preload.js    # IPC bridge
├── admin/
│   ├── index.html    # Admin paneli arayüzü
│   └── admin.js      # Admin paneli JavaScript
├── package.json
└── README.md
```

## 📊 Veritabanı

SQLite veritabanı şu konumda saklanır:

- **macOS**: `~/Library/Application Support/bihter-admin/bihter_admin.db`
- **Windows**: `%APPDATA%/bihter-admin/bihter_admin.db`
- **Linux**: `~/.config/bihter-admin/bihter_admin.db`

## 🛠️ Geliştirme

### Özellik Ekleme

1. `electron/main.js` dosyasında yeni IPC handler ekleyin
2. `electron/preload.js` dosyasında API'yi expose edin
3. `admin/admin.js` dosyasında frontend fonksiyonunu ekleyin

### Veritabanı Şeması

- **staff** - Çalışan bilgileri
- **menu_items** - Menü ürünleri
- **orders** - Siparişler

## 📝 Notlar

- Uygulama tamamen offline çalışır
- Veritabanı yerel olarak saklanır
- Admin paneli Tailwind CSS ile tasarlanmıştır



