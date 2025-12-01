# Electron Başlatma Rehberi

## Sorun Giderme

Electron açılmıyorsa şu adımları takip edin:

### 1. Bağımlılıkları Kontrol Edin

```bash
cd /Users/mert/Desktop/bihter1
npm install
```

### 2. Terminal'den Çalıştırın

Terminal'den çalıştırarak hata mesajlarını görebilirsiniz:

```bash
cd /Users/mert/Desktop/bihter1
npm start
```

veya

```bash
npx electron .
```

### 3. Geliştirme Modu (DevTools ile)

```bash
npm run dev
```

Bu mod DevTools'u da açar, böylece konsol hatalarını görebilirsiniz.

### 4. Hata Mesajlarını Kontrol Edin

Eğer hala açılmıyorsa, terminal'de çıkan hata mesajlarını kontrol edin. Özellikle şunlara dikkat edin:

- Veritabanı hatası
- Dosya yolu hatası
- Modül yüklenememe hatası

### 5. Electron Versiyonunu Kontrol Edin

```bash
npx electron --version
```

Bu komut Electron versiyonunu gösterir.

### 6. Dosya Yapısını Kontrol Edin

Şu dosyaların olduğundan emin olun:

- `electron/main.js`
- `electron/preload.js`
- `admin/index.html`
- `admin/admin.js`

### 7. Manuel Test

Electron'un çalışıp çalışmadığını test etmek için:

```bash
npx electron --version
```

Eğer bir versiyon numarası görürseniz, Electron yüklü demektir.

## Yaygın Sorunlar

### "Electron is not defined"
- `npm install` çalıştırın

### "Cannot find module 'better-sqlite3'"
- Native modül sorunu olabilir, `npm rebuild better-sqlite3` deneyin

### Pencere açılmıyor ama hata yok
- Terminal çıktısını kontrol edin
- `npm run dev` ile DevTools'u açıp konsolu kontrol edin



