# Etkinlik Yönetim Sistemi

Bu proje, kullanıcıların etkinlikleri görüntüleyebileceği, bilet alabileceği ve yöneticilerin etkinlikleri yönetebileceği bir web uygulamasıdır.

## Özellikler

- Kullanıcı kaydı ve girişi
- Yönetici onaylı kullanıcı sistemi
- Etkinlik listeleme ve filtreleme
- Bilet satın alma sistemi
- Hava durumu entegrasyonu
- Duyuru sistemi
- Kişiselleştirilmiş etkinlik önerileri

## Teknolojiler

### Frontend

- HTML5
- CSS3
- JavaScript (Vanilla)

### Backend

- Python
- Flask
- PostgreSQL

## Kurulum

1. PostgreSQL veritabanını kurun ve çalıştırın
2. Python bağımlılıklarını yükleyin:
   ```bash
   pip install -r requirements.txt
   ```
3. `.env` dosyasını oluşturun ve gerekli değişkenleri ayarlayın:
   ```
   DATABASE_URL=postgresql://username:password@localhost/event_db
   SECRET_KEY=your-secret-key
   WEATHER_API_KEY=your-weather-api-key
   ```
4. Backend'i başlatın:
   ```bash
   python app.py
   ```
5. Frontend dosyalarını bir web sunucusunda çalıştırın

## Kullanım

1. Tarayıcınızda `index.html` dosyasını açın
2. Kayıt olun veya giriş yapın
3. Etkinlikleri görüntüleyin ve bilet satın alın

## Yönetici Paneli

Yöneticiler şu işlemleri yapabilir:

- Kullanıcı onaylama
- Etkinlik ekleme/düzenleme/silme
- Duyuru yayınlama

## Lisans

Bu proje MIT lisansı altında lisanslanmıştır.
