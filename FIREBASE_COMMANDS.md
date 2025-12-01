# Firebase Komutları - Bihter Cafe

## 📋 Kurulum ve Yapılandırma

### 1. Firebase CLI Kurulumu
```bash
# Firebase CLI'yi global olarak yükleyin
npm install -g firebase-tools

# Firebase'e giriş yapın
firebase login

# Firebase CLI versiyonunu kontrol edin
firebase --version
```

### 2. Proje Yapılandırması Kontrolü
```bash
# Mevcut Firebase projesini kontrol edin
firebase projects:list

# Aktif projeyi görüntüleyin
firebase use

# Proje değiştirme (eğer gerekirse)
firebase use bihtercafemenu
```

## 🚀 Hosting (Website Deploy)

### 3. Hosting Yapılandırması
`firebase.json` dosyası zaten yapılandırılmış. İçeriği:
```json
{
  "hosting": {
    "public": ".",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ]
  }
}
```

### 4. Hosting Deploy Komutları

```bash
# Proje dizinine gidin
cd /Users/mert/Desktop/bihter1

# Firebase hosting'i başlat (ilk kez ise)
firebase init hosting

# Hosting kurallarını kontrol edin
firebase hosting:channel:list

# Canlıya deploy et (production)
firebase deploy --only hosting

# Preview channel'e deploy et (test için)
firebase hosting:channel:deploy preview-channel

# Belirli dosyaları deploy et
firebase deploy --only hosting --project bihtercafemenu
```

### 5. Hosting İleri Seviye Komutlar

```bash
# Siteyi tamamen sil ve yeniden deploy et
firebase deploy --only hosting --force

# Deploy geçmişini görüntüle
firebase hosting:clone <source-site-id> <target-site-id>

# Hosting yapılandırmasını test et (local)
firebase serve --only hosting

# Sadece hosting kurallarını deploy et
firebase deploy --only hosting:rules
```

## 🔥 Firestore (Veritabanı) Komutları

### 6. Firestore Rules Deploy

```bash
# Firestore Security Rules'ı deploy et
firebase deploy --only firestore:rules

# Firestore indexes'leri deploy et
firebase deploy --only firestore:indexes

# Firestore yapılandırmasını kontrol et
firebase firestore:rules:get
```

### 7. Firestore Rules Güncelleme

```bash
# Rules dosyasının konumu: firestore.rules (oluşturulmalı)

# Rules'ı local'de test et
firebase emulators:start --only firestore

# Rules'ı deploy et
firebase deploy --only firestore:rules
```

## 📦 Tüm Servisleri Deploy Etme

### 8. Tüm Servisleri Deploy
```bash
# Tüm servisleri (hosting, firestore, functions vb.) deploy et
firebase deploy

# Sadece hosting ve firestore'u deploy et
firebase deploy --only hosting,firestore:rules

# Belirli bir projeye deploy et
firebase deploy --project bihtercafemenu
```

## 🔍 Durum Kontrol Komutları

### 9. Deploy Durumu ve Loglar

```bash
# Son deploy'ları görüntüle
firebase hosting:clone:list

# Deploy loglarını görüntüle
firebase deploy:list

# Hosting durumunu kontrol et
firebase hosting:sites:list

# Hosting detaylarını görüntüle
firebase hosting:channel:list
```

## 🛠️ Yerel Geliştirme

### 10. Local Emulator (Test için)

```bash
# Tüm emulator'ları başlat
firebase emulators:start

# Sadece hosting emulator'ını başlat
firebase emulators:start --only hosting

# Sadece firestore emulator'ını başlat
firebase emulators:start --only firestore

# Emulator'ları başlat ve UI'ı aç
firebase emulators:start --ui

# Emulator portlarını özelleştir
firebase emulators:start --port 8080
```

## 🔐 Güvenlik ve Yetkilendirme

### 11. Authentication ve Yetki

```bash
# Firebase CLI'de logout
firebase logout

# Farklı bir hesaba giriş yap
firebase login --no-localhost

# Mevcut login durumunu kontrol et
firebase login:list

# Token'ı yenile
firebase login:ci
```

## 📊 Firestore Indexes

### 12. Composite Indexes Oluşturma

```bash
# firestore.indexes.json dosyası oluştur (eğer yoksa)

# Indexes'leri deploy et
firebase deploy --only firestore:indexes

# Index oluşturma durumunu kontrol et
firebase firestore:indexes
```

## 🗑️ Temizleme Komutları

### 13. Cache ve Geçici Dosyalar

```bash
# Firebase cache'i temizle
firebase cache:clear

# .firebase/ klasörünü sil (cache)
rm -rf .firebase/
```

## 📝 Yaygın Kullanım Senaryoları

### Senaryo 1: İlk Deploy
```bash
cd /Users/mert/Desktop/bihter1
firebase login
firebase use bihtercafemenu
firebase deploy --only hosting
```

### Senaryo 2: Güncelleme Deploy
```bash
cd /Users/mert/Desktop/bihter1
# Dosyalarda değişiklik yap...
firebase deploy --only hosting
```

### Senaryo 3: Rules Güncelleme
```bash
cd /Users/mert/Desktop/bihter1
# firestore.rules dosyasını güncelle...
firebase deploy --only firestore:rules
```

### Senaryo 4: Test (Local)
```bash
cd /Users/mert/Desktop/bihter1
firebase serve --only hosting
# Tarayıcıda http://localhost:5000 açılır
```

### Senaryo 5: Tüm Servisleri Güncelleme
```bash
cd /Users/mert/Desktop/bihter1
firebase deploy
```

## 🚨 Hata Giderme

### 14. Sık Karşılaşılan Hatalar ve Çözümleri

```bash
# Firebase CLI'yi güncelle
npm update -g firebase-tools

# Node.js versiyonunu kontrol et (v14+ gerekli)
node --version

# Firebase login sorunları için
firebase logout
firebase login

# Proje bağlantısını yeniden kur
firebase use --add
# Proje seçimi yapın: bihtercafemenu

# Hosting yapılandırmasını sıfırla
firebase init hosting
# Mevcut yapılandırmayı korumak için "No" deyin
```

## 📍 Önemli Notlar

1. **Hosting URL**: https://bihtercafemenu.web.app
2. **Firebase Project ID**: bihtercafemenu
3. **Deploy öncesi**: `index.html` ve `app.js` dosyalarının güncel olduğundan emin olun
4. **Güvenlik**: `firebase-service-account.json` dosyasını asla deploy etmeyin (zaten `.firebase.json` ignore listesinde)

## 🎯 Hızlı Referans

```bash
# EN ÇOK KULLANILAN KOMUTLAR:

# 1. Deploy (En Önemli!)
firebase deploy --only hosting

# 2. Local Test
firebase serve --only hosting

# 3. Proje Kontrolü
firebase use

# 4. Tüm Servisleri Deploy
firebase deploy

# 5. Durum Kontrolü
firebase hosting:channel:list
```

## 📞 Yardım

```bash
# Firebase CLI yardımı
firebase help

# Belirli bir komut için yardım
firebase deploy --help
firebase hosting --help
```

