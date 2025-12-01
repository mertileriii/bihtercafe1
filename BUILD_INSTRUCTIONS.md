# Electron Uygulamasını Kurulum Dosyasına Dönüştürme

Bu rehber, Electron uygulamanızı Windows, macOS ve Linux için kurulum dosyasına dönüştürmenize yardımcı olur.

## Gereksinimler

1. Node.js ve npm yüklü olmalı
2. Tüm bağımlılıklar yüklü olmalı (`npm install`)

## Kurulum Dosyası Oluşturma

### Windows için (.exe installer)

```bash
npm run build:win
```

Bu komut `dist/` klasöründe şu dosyaları oluşturur:
- `Bihter Admin-1.0.0-Setup.exe` - Windows kurulum dosyası

**Özellikler:**
- Kullanıcı kurulum dizinini seçebilir
- Masaüstü kısayolu oluşturulur
- Başlat menüsüne eklenir
- Kurulumdan sonra otomatik başlatılır

### macOS için (.dmg)

```bash
npm run build:mac
```

Bu komut `dist/` klasöründe şu dosyaları oluşturur:
- `Bihter Admin-1.0.0-arm64.dmg` - Apple Silicon (M1/M2) için
- `Bihter Admin-1.0.0-x64.dmg` - Intel Mac için
- `Bihter Admin-1.0.0-arm64.zip` - ZIP arşivi

### Linux için

```bash
npm run build:linux
```

Bu komut `dist/` klasöründe şu dosyaları oluşturur:
- `Bihter Admin-1.0.0.AppImage` - Tüm Linux dağıtımları için
- `Bihter Admin-1.0.0.deb` - Debian/Ubuntu için

### Tüm Platformlar için

```bash
npm run build
```

Bu komut tüm platformlar için kurulum dosyalarını oluşturur.

## Kurulum Dosyalarını Dağıtma

1. `dist/` klasörüne gidin
2. İlgili kurulum dosyasını USB flash drive'a kopyalayın
3. Diğer bilgisayarlarda kurulum dosyasını çalıştırın

## Windows Kurulumu

1. `Bihter Admin-1.0.0-Setup.exe` dosyasını çift tıklayın
2. Kurulum sihirbazını takip edin
3. Kurulum dizinini seçin (varsayılan: `C:\Program Files\Bihter Admin`)
4. "Kur" butonuna tıklayın
5. Kurulum tamamlandıktan sonra uygulama otomatik başlatılır

## macOS Kurulumu

1. `.dmg` dosyasını çift tıklayın
2. Açılan pencerede "Bihter Admin" uygulamasını "Applications" klasörüne sürükleyin
3. Uygulamayı Applications klasöründen çalıştırın
4. İlk açılışta macOS güvenlik uyarısı verebilir - Sistem Tercihleri'nden izin verin

## Linux Kurulumu

### AppImage:
```bash
chmod +x Bihter\ Admin-1.0.0.AppImage
./Bihter\ Admin-1.0.0.AppImage
```

### DEB paketi:
```bash
sudo dpkg -i Bihter\ Admin-1.0.0.deb
```

## Önemli Notlar

1. **Firebase Service Account Key**: Kurulum dosyası `firebase-service-account.json` dosyasını içerir. Bu dosya güvenlik açısından önemlidir, sadece güvenilir bilgisayarlara kurulum yapın.

2. **Veritabanı**: Her kurulumda yeni bir SQLite veritabanı oluşturulur. Verileri yedeklemek için `%APPDATA%/bihter-admin/` (Windows) veya `~/Library/Application Support/bihter-admin/` (macOS) klasörünü yedekleyin.

3. **Güncellemeler**: Yeni bir sürüm yayınladığınızda, `package.json` dosyasındaki `version` numarasını artırın ve tekrar build alın.

## Sorun Giderme

### Build hatası alıyorsanız:

1. `node_modules` klasörünü silin ve tekrar yükleyin:
```bash
rm -rf node_modules package-lock.json
npm install
```

2. Electron Builder'ı yeniden yükleyin:
```bash
npm install electron-builder --save-dev
```

3. Native modülleri yeniden derleyin:
```bash
npm run rebuild
```

### Icon dosyaları eksikse:

Icon dosyalarını `build/` klasörüne ekleyin:
- `build/icon.ico` - Windows için (256x256)
- `build/icon.icns` - macOS için (512x512)
- `build/icon.png` - Linux için (512x512)

Icon dosyaları yoksa Electron Builder varsayılan icon kullanacaktır.

## Versiyon Güncelleme

Yeni bir sürüm yayınlamak için:

1. `package.json` dosyasındaki `version` numarasını artırın (örn: "1.0.0" → "1.0.1")
2. Build komutunu çalıştırın
3. Yeni kurulum dosyalarını `dist/` klasöründe bulacaksınız

