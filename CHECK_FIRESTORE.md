# 🔍 Firestore Kontrol Rehberi

## Domain'de Ürün Görünmüyorsa

### 1. Browser Console'u Kontrol Edin

Domain'de (`bihtercafemenu.web.app`) F12 tuşuna basın ve Console sekmesine bakın:

**Beklenen loglar:**
- `📥 Firestore'dan menü yükleniyor...`
- `🔍 Query: isActive == 1 (number)` veya `isActive == true (boolean)`
- `📦 Firestore'dan X doküman alındı`
- `✅ X ürün arasından Y aktif ürün bulundu`
- `✅ Menü render edildi: Y ürün`

**Hata varsa:**
- `❌ Menu load error:` - Hata detaylarını kontrol edin
- Permission denied - Firestore Security Rules sorunu
- Index required - Firestore index oluşturmanız gerekiyor

### 2. Firebase Console'da Kontrol Edin

1. Firebase Console → Firestore Database → Data
2. `menu_items` koleksiyonunu açın
3. Ürünlerin orada olup olmadığını kontrol edin
4. Her ürünün şu alanları olduğundan emin olun:
   - `name` (string)
   - `category` (string)
   - `price` (number)
   - `isActive` (boolean: `true` veya `false`)

### 3. Firestore Security Rules Kontrolü

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

### 4. Firestore Index (Gerekirse)

Eğer "Index required" hatası alırsanız:

1. Firebase Console → Firestore Database → Indexes
2. Hata mesajındaki linke tıklayın
3. Veya manuel olarak index oluşturun:
   - Collection: `menu_items`
   - Fields: `isActive` (Ascending)

### 5. Test Adımları

1. **Electron'da ürün ekleyin:**
   - Admin panel → Envanter → + Ürün Ekle
   - Ürün bilgilerini girin
   - "Kaydet" butonuna tıklayın
   - Terminal'de "✅ Menu item Firestore'a senkronize edildi" mesajını görün

2. **Firebase Console'da kontrol edin:**
   - Firestore → menu_items → Ürünün orada olduğunu görün
   - `isActive: true` olduğundan emin olun

3. **Domain'de kontrol edin:**
   - `bihtercafemenu.web.app` adresine gidin
   - F12 → Console
   - Log'ları kontrol edin
   - Ürünün göründüğünü kontrol edin

### 6. Yaygın Sorunlar

**Sorun:** Ürün Firestore'da var ama domain'de görünmüyor
- **Çözüm:** Browser Console'da `isActive` değerini kontrol edin. `true` olmalı.

**Sorun:** "Permission denied" hatası
- **Çözüm:** Firestore Security Rules'u güncelleyin (yukarıdaki rules)

**Sorun:** "Index required" hatası
- **Çözüm:** Firebase Console'da index oluşturun veya query'yi değiştirin

**Sorun:** Hiç ürün görünmüyor
- **Çözüm:** Browser Console'da hata var mı kontrol edin
- **Çözüm:** Firestore'da `menu_items` koleksiyonu var mı kontrol edin


