# Sorun Giderme Rehberi

## Giriş Hatası Çözümü

### 1. Electron'u Terminal'den Başlatın

Terminal'den başlatarak hata mesajlarını görebilirsiniz:

```bash
cd /Users/mert/Desktop/bihter1
npm start
```

veya

```bash
npx electron .
```

### 2. DevTools'u Açın

DevTools açık olmalı. Eğer kapalıysa:
- **macOS**: `Cmd + Option + I`
- **Windows/Linux**: `Ctrl + Shift + I`

### 3. Konsol Mesajlarını Kontrol Edin

DevTools'da Console sekmesinde şu mesajları görmelisiniz:

```
🚀 Electron başlatılıyor...
✅ Veritabanı başlatıldı
✅ IPC handlers kuruldu
✅ Pencere oluşturuldu
👤 Admin kullanıcısı kontrol ediliyor...
✅ Admin kullanıcısı oluşturuldu
```

### 4. Giriş Denemesi

Giriş yaparken konsolda şunları görmelisiniz:

```
🔐 Login başlatılıyor...
   Email: admin@bihter.com
   Electron API mevcut: true
📡 API çağrısı yapılıyor...
🔐 Login denemesi: admin@bihter.com
   Şifre verildi: Evet
👤 Kullanıcı bulundu: Admin admin
🔑 Şifre kontrolü: ✅ Başarılı
✅ Giriş başarılı
```

### 5. Yaygın Hatalar ve Çözümleri

#### Hata: "Electron API bulunamadı"
**Çözüm:** Electron uygulaması başlatılmamış. `npm start` ile başlatın.

#### Hata: "Veritabanı bağlantısı yok"
**Çözüm:** Electron yeniden başlatılmalı. Uygulamayı kapatıp tekrar açın.

#### Hata: "Kullanıcı bulunamadı"
**Çözüm:** 
1. Electron'u kapatın
2. Terminal'de `npm start` ile yeniden başlatın
3. Konsolda "Admin kullanıcısı oluşturuldu" mesajını bekleyin
4. Sonra giriş yapmayı deneyin

#### Hata: "Şifre eşleşmedi"
**Çözüm:**
1. Varsayılan şifre: `admin123`
2. Email: `admin@bihter.com`
3. Eğer hala çalışmıyorsa, veritabanını silin ve yeniden başlatın

### 6. Veritabanını Sıfırlama

Eğer sorun devam ediyorsa, veritabanını sıfırlayabilirsiniz:

**macOS:**
```bash
rm ~/Library/Application\ Support/bihter-admin/bihter_admin.db
```

**Windows:**
```bash
del %APPDATA%\bihter-admin\bihter_admin.db
```

**Linux:**
```bash
rm ~/.config/bihter-admin/bihter_admin.db
```

Sonra Electron'u yeniden başlatın, admin kullanıcısı otomatik oluşturulacaktır.

### 7. Manuel Admin Oluşturma

Eğer admin kullanıcısı oluşturulmuyorsa, Electron konsolunda şunu çalıştırın:

```javascript
// DevTools Console'da:
const { ipcRenderer } = require('electron');
ipcRenderer.invoke('db:createStaff', {
  name: 'Admin',
  email: 'admin@bihter.com',
  password: 'admin123',
  role: 'admin'
});
```

### 8. Kontrol Listesi

- [ ] Electron başlatıldı (`npm start`)
- [ ] DevTools açık (konsol görünüyor)
- [ ] Konsolda "✅ Electron başarıyla başlatıldı!" mesajı var
- [ ] Konsolda "✅ Admin kullanıcısı oluşturuldu" mesajı var
- [ ] Email: `admin@bihter.com`
- [ ] Şifre: `admin123`
- [ ] Giriş yaparken konsolda hata yok

### 9. Detaylı Log Kontrolü

Terminal'de şunları kontrol edin:
- Veritabanı yolu doğru mu?
- Admin kullanıcısı oluşturuldu mu?
- IPC handlers kuruldu mu?

Eğer sorun devam ediyorsa, terminal çıktısını paylaşın.



