-- Veritabanını oluştur
CREATE DATABASE projeVeritabani;

-- Kullanıcılar tablosu
CREATE TABLE "user" (
    id SERIAL PRIMARY KEY,
    email VARCHAR(120) UNIQUE NOT NULL,
    password VARCHAR(200) NOT NULL,
    is_admin BOOLEAN DEFAULT FALSE,
    is_approved BOOLEAN DEFAULT FALSE,
    first_login BOOLEAN DEFAULT TRUE,
    interests VARCHAR(500)
);

-- Etkinlikler tablosu
CREATE TABLE event (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    date TIMESTAMP NOT NULL,
    type VARCHAR(50) NOT NULL,
    capacity INTEGER,
    remaining_capacity INTEGER,
    price DECIMAL(10,2),
    is_active BOOLEAN DEFAULT TRUE
);

-- Duyurular tablosu
CREATE TABLE announcement (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    content TEXT,
    date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Biletler tablosu
CREATE TABLE ticket (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES "user"(id),
    event_id INTEGER REFERENCES event(id),
    ticket_type VARCHAR(50),
    price DECIMAL(10,2),
    purchase_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Örnek veriler

-- Admin kullanıcısı
INSERT INTO "user" (email, password, is_admin, is_approved, first_login)
VALUES ('admin@example.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBAQN3J9.5JQHy', TRUE, TRUE, FALSE);

-- Normal kullanıcılar
INSERT INTO "user" (email, password, is_approved, interests)
VALUES 
('user1@example.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBAQN3J9.5JQHy', TRUE, 'müzik,spor'),
('user2@example.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBAQN3J9.5JQHy', TRUE, 'tiyatro,sinema');

-- Örnek etkinlikler
INSERT INTO event (title, description, date, type, capacity, remaining_capacity, price)
VALUES 
('Rock Konseri', 'Yerel rock gruplarının performansı', CURRENT_TIMESTAMP + INTERVAL '7 days', 'müzik', 100, 100, 150.00),
('Basketbol Turnuvası', 'Yerel basketbol turnuvası', CURRENT_TIMESTAMP + INTERVAL '14 days', 'spor', 50, 50, 75.00),
('Tiyatro Gösterisi', 'Klasik tiyatro oyunu', CURRENT_TIMESTAMP + INTERVAL '21 days', 'tiyatro', 200, 200, 100.00),
('Film Festivali', 'Yerel film festivali', CURRENT_TIMESTAMP + INTERVAL '30 days', 'sinema', 300, 300, 200.00);

-- Örnek duyurular
INSERT INTO announcement (title, content, date)
VALUES 
('Yeni Etkinlikler Eklendi', 'Bu ay birçok yeni etkinlik eklendi. Hemen kontrol edin!', CURRENT_TIMESTAMP),
('Özel İndirim', 'Bu hafta tüm biletlerde %20 indirim!', CURRENT_TIMESTAMP - INTERVAL '2 days');

-- İndeksler
CREATE INDEX idx_user_email ON "user"(email);
CREATE INDEX idx_event_date ON event(date);
CREATE INDEX idx_event_type ON event(type);
CREATE INDEX idx_ticket_user ON ticket(user_id);
CREATE INDEX idx_ticket_event ON ticket(event_id);
CREATE INDEX idx_announcement_date ON announcement(date);

-- Yetkilendirme
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres;

\c projeVeritabani
\dt 