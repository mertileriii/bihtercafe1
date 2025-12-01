# 🔒 Firestore Security Rules

## ✅ Güncel Rules (Önerilen)

Firebase Console → Firestore Database → Rules sekmesine gidin ve aşağıdaki rules'u yapıştırın:

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

**ÖNEMLİ:** Rules'u güncelledikten sonra **"Publish"** butonuna tıklayın!

## 🔍 Mevcut Rules Sorunu

Şu anki rules tüm koleksiyonlara okuma/yazma izni veriyor ama sadece 2025 yılına kadar geçerli. Yukarıdaki rules'u kullanarak daha spesifik ve güvenli hale getirin.

## 📝 Test

Rules'u güncelledikten sonra:
1. Domain'i yenileyin
2. Browser Console'u açın (F12)
3. Firestore'dan veri çekiliyor mu kontrol edin


