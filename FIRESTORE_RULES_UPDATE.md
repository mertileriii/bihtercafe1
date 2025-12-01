# Firestore Security Rules Güncellemesi

Domain'den sipariş oluşturabilmek için `orders` koleksiyonuna `write` izni eklemelisiniz.

## Önerilen Security Rules:

Firebase Console → Firestore Database → Rules sekmesine gidin ve şu rules'u yapıştırın:

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    match /menu_items/{itemId} {
      allow read: if true;
      allow write: if false; // Sadece Electron'dan (Admin SDK) yazılabilir
    }
    
    match /orders/{orderId} {
      allow read: if true; // Herkes okuyabilir (gerekirse daha kısıtlayabilirsiniz)
      allow create: if true; // Domain'den sipariş oluşturma izni
      allow update: if false; // Sadece Electron'dan (Admin SDK) güncellenebilir
      allow delete: if false; // Sadece Electron'dan (Admin SDK) silinebilir
    }
  }
}
```

## Açıklama:

- **menu_items**: Sadece okuma izni var, yazma sadece Electron (Firebase Admin SDK) üzerinden yapılır
- **orders**: 
  - `read`: Herkes okuyabilir (gerçek zamanlı sipariş takibi için)
  - `create`: Domain'den sipariş oluşturulabilir
  - `update` ve `delete`: Sadece Electron (Firebase Admin SDK) üzerinden yapılır

## Güvenlik Notu:

Eğer daha güvenli olmasını istiyorsanız, `create` iznini şu şekilde kısıtlayabilirsiniz:

```javascript
allow create: if request.resource.data.keys().hasAll(['tableId', 'items', 'totalAmount', 'status', 'createdAt'])
              && request.resource.data.status == 'pending'
              && request.resource.data.totalAmount is number
              && request.resource.data.tableId is number;
```

Bu, sadece geçerli sipariş verilerinin oluşturulmasına izin verir.


