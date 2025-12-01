# 🚀 Deployment Rehberi

## ✅ Tamamlanan Yapılandırmalar

1. ✅ Firebase Service Account Key eklendi
2. ✅ Firebase Web App Config eklendi
3. ✅ Electron Firestore senkronizasyonu hazır
4. ✅ Domain menüsü Firestore'dan okuyor

## 📋 Son Adımlar

### 1. Firestore Security Rules

Firebase Console → Firestore Database → Rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /menu_items/{itemId} {
      // Herkes okuyabilir (domain menüsü için)
      allow read: if true;
      // Sadece Admin SDK ile yazılabilir (Electron'dan)
      allow write: if false;
    }
  }
}
```

### 2. Firestore Index (Opsiyonel)

Eğer `isActive` filter'ı ile sorun yaşarsanız, Firebase Console'da composite index oluşturun:

1. Firebase Console → Firestore Database → Indexes
2. **Create Index** butonuna tıklayın
3. Collection: `menu_items`
4. Fields:
   - `isActive` (Ascending)
   - `category` (Ascending)
5. **Create** butonuna tıklayın

**NOT:** Index oluşturma gerekli değil, kod zaten index olmadan da çalışacak şekilde yazıldı.

### 3. Test Etme

1. **Electron Admin Panel:**
   ```bash
   cd /Users/mert/Desktop/bihter1
   npm start
   ```

2. **Admin Panelde Ürün Ekle:**
   - Giriş yapın (admin@bihter.com / admin123)
   - "Ana Sayfa" → "Envanter" → "+ Ürün Ekle"
   - Ürün bilgilerini girin ve kaydedin

3. **Domain'de Kontrol:**
   - `bihtercafemenu.web.app` adresine gidin
   - Eklenen ürünlerin göründüğünü kontrol edin

### 4. Firebase Hosting Deploy (İlk Kez)

```bash
# Firebase CLI'yi yükle (eğer yoksa)
npm install -g firebase-tools

# Firebase'e giriş yap
firebase login

# Firebase Hosting'i başlat
firebase init hosting

# Seçimler:
# - Use an existing project: bihtercafemenu
# - Public directory: . (nokta)
# - Single-page app: No
# - Set up automatic builds: No

# Deploy et
firebase deploy --only hosting
```

### 5. Firebase Hosting Deploy (Sonraki Güncellemeler)

```bash
cd /Users/mert/Desktop/bihter1
firebase deploy --only hosting
```

## 🔍 Sorun Giderme

### Menü Görünmüyor

1. **Browser Console'u kontrol edin** (F12)
2. **Firebase Console'da Firestore'a bakın:**
   - `menu_items` koleksiyonu var mı?
   - Ürünler eklenmiş mi?
   - `isActive` alanı `true` veya `1` mi?

### Electron'dan Firestore'a Yazılmıyor

1. **Terminal'deki log'ları kontrol edin:**
   ```bash
   npm start
   ```
   - "✅ Firebase Firestore başlatıldı" mesajını görmelisiniz
   - "✅ Menu item Firestore'a senkronize edildi" mesajını görmelisiniz

2. **Service Account Key kontrolü:**
   - `/Users/mert/Desktop/bihter1/firebase-service-account.json` dosyası var mı?
   - İçeriği doğru mu?

## ✅ Başarı Kriterleri

- [ ] Electron admin panelinde ürün eklenebiliyor
- [ ] Ürünler Firestore'a yazılıyor
- [ ] Domain'de (`bihtercafemenu.web.app`) menü görünüyor
- [ ] Gerçek zamanlı güncellemeler çalışıyor (admin panelde ürün ekleyince domain'de anında görünüyor)

## 📞 Destek

Sorun yaşarsanız:
1. Browser Console'daki hataları kontrol edin
2. Electron terminal'deki log'ları kontrol edin
3. Firebase Console'da Firestore verilerini kontrol edin


