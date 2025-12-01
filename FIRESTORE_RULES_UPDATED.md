# Firestore Security Rules - Güncellenmiş Kurallar

## Güncellenmiş Kurallar

Aşağıdaki kuralları Firebase Console'da uygulayın:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Menu items - Herkes okuyabilir, sadece admin yazabilir (Electron'dan)
    match /menu_items/{itemId} {
      allow read: if true;
      allow write: if false; // Sadece Electron Admin SDK'dan yazılabilir
    }
    
    // Orders - Herkes okuyabilir, herkes yeni sipariş oluşturabilir
    match /orders/{orderId} {
      allow read: if true;
      allow create: if true; // Domain'den sipariş oluşturma izni
      allow update: if false; // Sadece Electron Admin SDK'dan güncellenebilir
      allow delete: if false;
    }
    
    // Waiter calls - Herkes okuyabilir, herkes yeni garson çağrısı oluşturabilir
    match /waiter_calls/{callId} {
      allow read: if true;
      allow create: if true; // Domain'den garson çağrısı oluşturma izni
      allow update: if false; // Sadece Electron Admin SDK'dan güncellenebilir
      allow delete: if false;
    }
  }
}
```

## Firebase Console'da Uygulama Adımları

1. Firebase Console'a gidin: https://console.firebase.google.com/
2. Projenizi seçin: `bihtercafemenu`
3. Sol menüden **"Firestore Database"** seçin
4. Üst menüden **"Rules"** sekmesine tıklayın
5. Yukarıdaki kuralları kopyalayıp yapıştırın
6. **"Publish"** butonuna tıklayın

## Önemli Notlar

- ✅ `waiter_calls` collection'ına `create: if true` eklendi
- ✅ `orders` collection'ına da `create: if true` eklendi (zaten vardı)
- ✅ Her iki collection için `read: if true` var (herkes okuyabilir)
- ⚠️ `write` ve `update` sadece Electron Admin SDK'dan yapılabilir (güvenlik için)

## Test

Kuralları uyguladıktan sonra:
1. Web sitesinde "Garson Çağır" butonuna tıklayın
2. Console'da hata olmamalı
3. Firestore Console'da `waiter_calls` collection'ında yeni bir doküman görünmeli

