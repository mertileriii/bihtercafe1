# 🔍 Firestore Debug Rehberi

## Sorun: Ürünler Firestore'da ama domain'de görünmüyor

### Adım 1: Browser Console Kontrolü

Domain'de (`bihtercafemenu.web.app`) F12 → Console sekmesinde şunları arayın:

**Normal akış:**
1. `📥 Firestore'dan menü yükleniyor...`
2. `🔍 Firestore query başlatılıyor...`
3. `📦 Firestore'dan X doküman alındı`
4. Her ürün için: `📋 Ürün Adı - isActive: true/false, category: ...`
5. `✅ X ürün gösteriliyor (tümü)`
6. `📂 Kategorilere organize ediliyor: X ürün`
7. `✅ X kategori oluşturuldu`
8. `🎨 Menü render ediliyor...`
9. `✅ Menü HTML render edildi`

### Adım 2: Firestore Security Rules

Firebase Console → Firestore Database → Rules:

**ÖNEMLİ:** Aşağıdaki rules'u ekleyin:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /menu_items/{itemId} {
      // HERKES okuyabilir (domain menüsü için)
      allow read: if true;
      // Sadece Admin SDK ile yazılabilir (Electron'dan)
      allow write: if false;
    }
  }
}
```

**Publish** butonuna tıklayın!

### Adım 3: Firestore'da Veri Kontrolü

Firebase Console → Firestore Database → Data → `menu_items`:

Her ürünün şu alanları olmalı:
- ✅ `name` (string)
- ✅ `category` (string) - Örnek: `sicak-kahveler`, `helvalar`
- ✅ `price` (number) - Örnek: `40.00`
- ✅ `isActive` (boolean) - `true` veya `false`
- ✅ `description` (string, opsiyonel)

### Adım 4: Console'da Ne Görüyorsunuz?

**Senaryo 1: Hiç log yok**
- → Firebase bağlantısı kurulmamış
- → `app.js` yüklenmemiş olabilir

**Senaryo 2: "Permission denied" hatası**
- → Firestore Security Rules sorunu
- → Rules'u yukarıdaki gibi güncelleyin

**Senaryo 3: "0 doküman alındı"**
- → Firestore'da veri yok
- → Electron'dan ürün eklemeyi deneyin

**Senaryo 4: "X doküman alındı" ama ürün görünmüyor**
- → `organizeCategories` veya `renderMenu` çalışmıyor
- → Console log'larını kontrol edin

### Adım 5: Manuel Test

Browser Console'da şunu çalıştırın:

```javascript
// Firestore'dan direkt veri çek
const { getFirestore, collection, getDocs } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
const db = window.appState?.db || getFirestore();
const snapshot = await getDocs(collection(db, 'menu_items'));
console.log('Firestore\'dan direkt:', snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
```

Bu komut Firestore'dan direkt veri çeker ve console'da gösterir.


