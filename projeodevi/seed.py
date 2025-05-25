from app import app, db, User, Event, Announcement
from datetime import datetime, timedelta
from werkzeug.security import generate_password_hash

def seed_database():
    with app.app_context():
        # Veritabanını temizle
        db.drop_all()
        db.create_all()

        # Admin kullanıcısı oluştur
        admin = User(
            email='admin@example.com',
            password=generate_password_hash('admin123'),
            is_admin=True,
            is_approved=True,
            first_login=False
        )
        db.session.add(admin)

        # Örnek kullanıcılar
        users = [
            User(
                email='user1@example.com',
                password=generate_password_hash('user123'),
                is_approved=True,
                interests='müzik,spor'
            ),
            User(
                email='user2@example.com',
                password=generate_password_hash('user123'),
                is_approved=True,
                interests='tiyatro,sinema'
            )
        ]
        db.session.add_all(users)

        # Örnek etkinlikler
        events = [
            Event(
                title='Rock Konseri',
                description='Yerel rock gruplarının performansı',
                date=datetime.now() + timedelta(days=7),
                type='müzik',
                capacity=100,
                remaining_capacity=100,
                price=150.0
            ),
            Event(
                title='Basketbol Turnuvası',
                description='Yerel basketbol turnuvası',
                date=datetime.now() + timedelta(days=14),
                type='spor',
                capacity=50,
                remaining_capacity=50,
                price=75.0
            ),
            Event(
                title='Tiyatro Gösterisi',
                description='Klasik tiyatro oyunu',
                date=datetime.now() + timedelta(days=21),
                type='tiyatro',
                capacity=200,
                remaining_capacity=200,
                price=100.0
            ),
            Event(
                title='Film Festivali',
                description='Yerel film festivali',
                date=datetime.now() + timedelta(days=30),
                type='sinema',
                capacity=300,
                remaining_capacity=300,
                price=200.0
            )
        ]
        db.session.add_all(events)

        # Örnek duyurular
        announcements = [
            Announcement(
                title='Yeni Etkinlikler Eklendi',
                content='Bu ay birçok yeni etkinlik eklendi. Hemen kontrol edin!',
                date=datetime.now()
            ),
            Announcement(
                title='Özel İndirim',
                content='Bu hafta tüm biletlerde %20 indirim!',
                date=datetime.now() - timedelta(days=2)
            )
        ]
        db.session.add_all(announcements)

        # Değişiklikleri kaydet
        db.session.commit()

if __name__ == '__main__':
    seed_database()
    print("Veritabanı başarıyla dolduruldu!") 