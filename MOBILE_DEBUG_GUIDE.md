# Mobil Cihazdan Debug Rehberi

## Yöntem 1: Chrome DevTools ile Uzaktan Debug (ÖNERİLEN)

### Adımlar:

1. **Bilgisayarınızda Chrome'u açın**
   - Chrome'da şu adrese gidin: `chrome://inspect/#devices`
   - Veya: Chrome menüsü → More tools → Remote devices

2. **Mobil cihazınızı hazırlayın**
   - Android: Ayarlar → Developer options → USB debugging açık olmalı
   - iOS: Safari Developer Tools kullanılmalı (Mac gerektirir)

3. **USB ile bağlayın**
   - Telefonunuzu USB kablosu ile bilgisayara bağlayın
   - Telefonda "USB debugging izni ver" onayına "İzin ver" deyin

4. **Web sayfasını açın**
   - Telefonunuzda Chrome/Chrome'u açın
   - `bihtercafemenu.web.app` adresine gidin
   - "Menüye Git" butonuna tıklayın

5. **DevTools'da görün**
   - Bilgisayardaki Chrome'da `chrome://inspect` sayfasında telefonunuz görünecek
   - Web sayfanızın yanında "inspect" butonuna tıklayın
   - Console log'larını görebilirsiniz

---

## Yöntem 2: Eraser (Mobil Console Viewer)

### Adımlar:

1. **Telefonda Eraser uygulamasını yükleyin**
   - Play Store (Android) veya App Store (iOS)'da "Eraser" veya "Console Viewer" ara

2. **Veya basit bir log viewer kullanın**
   - Telefonda console log'larını görmek için özel bir uygulama yükleyin

---

## Yöntem 3: Alert ile Hata Gösterme (Hızlı Test)

En basit yöntem: Console log'larını alert olarak göstermek. Kodda hata mesajlarını alert ile gösterelim.

---

## Yöntem 4: Ekran Görüntüsü + Console Log'larını Manuel Paylaşma

1. **Telefonda ekran görüntüsü alın**
   - Hata mesajı varsa ekran görüntüsü alın
   - Console log'ları görünmüyorsa, hata mesajının detaylarını not alın

2. **Log'ları göndermek için:**
   - Hata mesajlarını ekran görüntüsü olarak paylaşın
   - Veya hata mesajlarını metin olarak yazın

---

## Yöntem 5: Firebase Console'dan Kontrol

1. **Firebase Console'a gidin**
   - https://console.firebase.google.com
   - Projenizi seçin: `bihtercafemenu`

2. **Firestore Database'i kontrol edin**
   - Sol menüden "Firestore Database" seçin
   - `menu_items` koleksiyonunu kontrol edin
   - Ürünlerin var olup olmadığını kontrol edin

---

## Yöntem 6: Kodda Alert Ekleyerek (Geçici)

En hızlı test için: Kodda hata mesajlarını alert ile gösterelim.

