from flask import Flask, request, jsonify, send_from_directory, render_template
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
import os
from datetime import datetime, timedelta
import requests
from dotenv import load_dotenv
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
import re

load_dotenv()

app = Flask(__name__, static_folder='static', template_folder='templates')
CORS(app)

# PostgreSQL bağlantı ayarları
app.config['SQLALCHEMY_DATABASE_URI'] = 'postgresql://postgres:123456@localhost/projeVeritabani'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['JWT_SECRET_KEY'] = 'your-super-secret-key-here'
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=1)
app.config['JWT_TOKEN_LOCATION'] = ['headers']
app.config['JWT_HEADER_NAME'] = 'Authorization'
app.config['JWT_HEADER_TYPE'] = 'Bearer'

db = SQLAlchemy(app)
jwt = JWTManager(app)

# Kullanıcı modeli
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password = db.Column(db.String(200), nullable=False)
    is_admin = db.Column(db.Boolean, default=False)
    is_approved = db.Column(db.Boolean, default=False)
    first_login = db.Column(db.Boolean, default=True)
    interests = db.Column(db.String(500))

# Etkinlik modeli
class Event(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    date = db.Column(db.DateTime, nullable=False)
    type = db.Column(db.String(50), nullable=False)
    capacity = db.Column(db.Integer)
    remaining_capacity = db.Column(db.Integer)
    price = db.Column(db.Float)
    is_active = db.Column(db.Boolean, default=True)

# Duyuru modeli
class Announcement(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    content = db.Column(db.Text)
    date = db.Column(db.DateTime, default=datetime.utcnow)

# Bilet modeli
class Ticket(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'))
    event_id = db.Column(db.Integer, db.ForeignKey('event.id'))
    ticket_type = db.Column(db.String(50))
    price = db.Column(db.Float)
    purchase_date = db.Column(db.DateTime, default=datetime.utcnow)

# JWT hata işleyicileri
@jwt.unauthorized_loader
def unauthorized_callback(error_string):
    return jsonify({
        'msg': 'Missing Authorization Header',
        'error': error_string
    }), 401

@jwt.invalid_token_loader
def invalid_token_callback(error_string):
    return jsonify({
        'msg': 'Invalid token',
        'error': error_string
    }), 401

@jwt.expired_token_loader
def expired_token_callback(jwt_header, jwt_payload):
    return jsonify({
        'msg': 'Token has expired',
        'error': 'Token has expired'
    }), 401

def is_valid_email(email):
    return re.match(r'^[^@\s]+@[^@\s]+\.[^@\s]+$', email)

def is_valid_password(password):
    return password and len(password) >= 6

# Kullanıcı kayıt endpoint'i
@app.route('/api/register', methods=['POST'])
def register():
    data = request.get_json()
    email = data.get('email', '').strip()
    password = data.get('password', '')
    if not is_valid_email(email):
        return jsonify({'error': 'Geçerli bir e-posta girin!'}), 400
    if not is_valid_password(password):
        return jsonify({'error': 'Şifre en az 6 karakter olmalı!'}), 400
    if User.query.filter_by(email=email).first():
        return jsonify({'error': 'Email already registered'}), 400
    hashed_password = generate_password_hash(password)
    new_user = User(
        email=email,
        password=hashed_password,
        is_admin=False,
        is_approved=True
    )
    db.session.add(new_user)
    db.session.commit()
    return jsonify({'message': 'Registration successful, giriş yapabilirsiniz'}), 201

# Kullanıcı giriş endpoint'i
@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    email = data.get('email', '').strip()
    password = data.get('password', '')
    if not is_valid_email(email):
        return jsonify({'msg': 'Geçerli bir e-posta girin!'}), 400
    if not is_valid_password(password):
        return jsonify({'msg': 'Şifre en az 6 karakter olmalı!'}), 400
    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({'msg': 'Kullanıcı bulunamadı'}), 401
    if not check_password_hash(user.password, password):
        return jsonify({'msg': 'Geçersiz şifre'}), 401
    if not user.is_approved:
        return jsonify({'msg': 'Hesabınız henüz onaylanmadı'}), 403
    access_token = create_access_token(identity=user.id)
    return jsonify({
        'access_token': access_token,
        'user_type': 'admin' if user.is_admin else 'user',
        'msg': 'Giriş başarılı'
    }), 200

# Admin giriş endpoint'i
@app.route('/api/admin/login', methods=['POST'])
def admin_login():
    data = request.get_json()
    user = User.query.filter_by(email=data.get('email')).first()
    
    if not user:
        return jsonify({'msg': 'Kullanıcı bulunamadı'}), 401
    
    if not user.is_admin:
        return jsonify({'msg': 'Bu hesap admin değil'}), 403
    
    if not check_password_hash(user.password, data.get('password')):
        return jsonify({'msg': 'Geçersiz şifre'}), 401
    
    access_token = create_access_token(identity=user.id)
    return jsonify({
        'access_token': access_token,
        'user_type': 'admin',
        'msg': 'Admin girişi başarılı'
    }), 200

# Şifre değiştirme endpoint'i (Artık JWT ile korunuyor)
@app.route('/api/change-password', methods=['POST'])
@jwt_required()
def change_password():
    current_user_id = get_jwt_identity() # JWT ile kullanıcı ID'sini al
    user = User.query.get(current_user_id)

    if not user:
        return jsonify({'msg': 'Kullanıcı bulunamadı'}), 404

    data = request.get_json()

    # İlk giriş kontrolü
    if user.first_login:
         # İlk girişte eski şifre yerine kullanıcı e-postasını veya varsayılan bir değeri isteyebilirsiniz
         # Şimdilik mevcut_sifre kontrolünü yapalım, mantığı sonra refine edilebilir.
         if not check_password_hash(user.password, data.get('current_password')):
              return jsonify({'msg': 'Geçerli şifre yanlış'}), 400
    else:
        # Sonraki girişlerde eski şifreyi kontrol et
        if not check_password_hash(user.password, data.get('current_password')):
             return jsonify({'msg': 'Mevcut şifre yanlış'}), 400


    user.password = generate_password_hash(data.get('new_password'))
    user.first_login = False # İlk giriş tamamlandı olarak işaretle
    db.session.commit()
    
    return jsonify({'message': 'Şifre başarıyla değiştirildi'}), 200

# Etkinlik listesi endpoint'i (JWT ile korunuyor)
@app.route('/api/events', methods=['GET'])
@jwt_required()
def get_events():
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    if not user:
        return jsonify({'msg': 'Kullanıcı bulunamadı'}), 404
    
    events = Event.query.all()
    return jsonify([{
        'id': event.id,
        'title': event.title,
        'description': event.description,
        'date': event.date.isoformat(),
        'type': event.type,
        'price': event.price,
        'capacity': event.capacity,
        'remaining_capacity': event.remaining_capacity
    } for event in events])

@app.route('/api/events/<int:event_id>', methods=['GET'])
@jwt_required()
def get_event(event_id):
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    if not user:
        return jsonify({'msg': 'Kullanıcı bulunamadı'}), 404
    
    event = Event.query.get_or_404(event_id)
    return jsonify({
        'id': event.id,
        'title': event.title,
        'description': event.description,
        'date': event.date.isoformat(),
        'type': event.type,
        'price': event.price,
        'capacity': event.capacity,
        'remaining_capacity': event.remaining_capacity
    })

# Hava durumu kontrolü endpoint'i (JWT ile korunuyor)
@app.route('/api/weather-check/<event_id>', methods=['GET'])
@jwt_required()
def check_weather(event_id):
    event = Event.query.get_or_404(event_id)
    # OpenWeatherMap API kullanımı (API key gerekli)
    weather_api_key = os.getenv('WEATHER_API_KEY')
    # Burada gerçek API çağrısı yapılacak
    return jsonify({'weather_suitable': True})  # Örnek yanıt

# Duyuru listesi endpoint'i (JWT ile korunuyor)
@app.route('/api/announcements', methods=['GET'])
@jwt_required()
def get_announcements():
    announcements = Announcement.query.order_by(Announcement.date.desc()).all()
    return jsonify([
        {
            'id': a.id,
            'title': a.title,
            'content': a.content,
            'date': a.date.isoformat()
        } for a in announcements
    ])

# Duyuru ekleme endpoint'i (JWT ile korunuyor)
@app.route('/api/announcements', methods=['POST'])
@jwt_required()
def add_announcement():
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    if not user or not user.is_admin:
        return jsonify({'msg': 'Sadece adminler duyuru ekleyebilir'}), 403
    data = request.get_json()
    new_announcement = Announcement(
        title=data['title'],
        content=data['content']
    )
    db.session.add(new_announcement)
    db.session.commit()
    return jsonify({'msg': 'Duyuru eklendi'}), 201

# Etkinlik ekleme endpoint'i (JWT ile korunuyor)
@app.route('/api/events', methods=['POST'])
@jwt_required()
def add_event():
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    if not user or not user.is_admin:
        return jsonify({'msg': 'Sadece adminler etkinlik ekleyebilir'}), 403
    data = request.get_json()
    new_event = Event(
        title=data['title'],
        description=data['description'],
        date=datetime.fromisoformat(data['date']),
        type=data['type'],
        capacity=data['capacity'],
        remaining_capacity=data['capacity'],
        price=data['price'],
        is_active=True
    )
    db.session.add(new_event)
    db.session.commit()
    return jsonify({'msg': 'Etkinlik eklendi'}), 201

# Ana sayfa route'u
@app.route('/')
def index():
    return render_template('index.html')

# Statik dosyalar için route
@app.route('/<path:path>')
def serve_static(path):
    if path.endswith('.html'):
        return render_template(path)
    return send_from_directory('static', path)

# Diğer sayfalar için route'lar
@app.route('/register.html')
def register_page():
    return render_template('register.html')

@app.route('/admin-login.html')
def admin_login_page():
    return render_template('admin-login.html')

@app.route('/user-panel.html')
def user_panel():
    return render_template('user-panel.html')

@app.route('/payment.html')
def payment_page():
    return render_template('payment.html')

@app.route('/admin-panel.html')
def admin_panel():
    return render_template('admin-panel.html')

# Admin kullanıcısı oluşturma fonksiyonu
def create_admin_user():
    with app.app_context():
        # Admin kullanıcısı var mı kontrol et
        admin = User.query.filter_by(email='yusuf@admin.com').first()
        if not admin:
            # Admin kullanıcısı yoksa oluştur
            admin = User(
                email='yusuf@admin.com',
                password=generate_password_hash('yusuf123'),
                is_admin=True,
                is_approved=True
            )
            db.session.add(admin)
            db.session.commit()
            print('Admin kullanıcısı oluşturuldu!')
        else:
            # Admin kullanıcısı varsa şifresini güncelle
            admin.password = generate_password_hash('yusuf123')
            db.session.commit()
            print('Admin kullanıcısı güncellendi!')

@app.route('/api/payment', methods=['POST'])
@jwt_required()
def payment():
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    if not user:
        return jsonify({'msg': 'Kullanıcı bulunamadı'}), 404
    data = request.get_json()
    cart = data.get('cart', [])
    if not cart:
        return jsonify({'msg': 'Sepet boş!'}), 400
    errors = []
    for item in cart:
        event = Event.query.get(item['id'])
        if event and event.remaining_capacity > 0:
            ticket = Ticket(
                user_id=user.id,
                event_id=event.id,
                ticket_type='standart',
                price=event.price
            )
            event.remaining_capacity -= 1
            db.session.add(ticket)
        else:
            errors.append(f"'{event.title if event else 'Etkinlik'}' kapasitesi dolu!")
    db.session.commit()
    if errors:
        return jsonify({'msg': 'Bazı etkinlikler için bilet alınamadı: ' + ', '.join(errors)}), 400
    return jsonify({'msg': 'Ödeme başarılı, biletleriniz oluşturuldu!'}), 200

@app.route('/api/tickets', methods=['GET'])
@jwt_required()
def get_tickets():
    current_user_id = get_jwt_identity()
    tickets = Ticket.query.filter_by(user_id=current_user_id).all()
    result = []
    for t in tickets:
        event = Event.query.get(t.event_id)
        result.append({
            'id': t.id,
            'event_title': event.title if event else 'Etkinlik silinmiş',
            'price': t.price,
            'purchase_date': t.purchase_date.isoformat()
        })
    return jsonify(result)

@app.route('/api/users', methods=['GET'])
@jwt_required()
def get_users():
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    if not user or not user.is_admin:
        return jsonify({'msg': 'Sadece adminler kullanıcıları görebilir'}), 403
    users = User.query.all()
    return jsonify([
        {
            'id': u.id,
            'email': u.email,
            'is_admin': u.is_admin,
            'is_approved': u.is_approved
        } for u in users
    ])

@app.route('/api/users/<int:user_id>/approve', methods=['POST'])
@jwt_required()
def approve_user(user_id):
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    if not user or not user.is_admin:
        return jsonify({'msg': 'Sadece adminler onaylayabilir'}), 403
    target = User.query.get(user_id)
    if not target:
        return jsonify({'msg': 'Kullanıcı bulunamadı'}), 404
    target.is_approved = True
    db.session.commit()
    return jsonify({'msg': 'Kullanıcı onaylandı'})

@app.route('/api/users/<int:user_id>', methods=['DELETE'])
@jwt_required()
def delete_user(user_id):
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    if not user or not user.is_admin:
        return jsonify({'msg': 'Sadece adminler silebilir'}), 403
    target = User.query.get(user_id)
    if not target:
        return jsonify({'msg': 'Kullanıcı bulunamadı'}), 404
    db.session.delete(target)
    db.session.commit()
    return jsonify({'msg': 'Kullanıcı silindi'})

@app.route('/api/events/<int:event_id>', methods=['DELETE'])
@jwt_required()
def delete_event(event_id):
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    if not user or not user.is_admin:
        return jsonify({'msg': 'Sadece adminler silebilir'}), 403
    event = Event.query.get(event_id)
    if not event:
        return jsonify({'msg': 'Etkinlik bulunamadı'}), 404
    db.session.delete(event)
    db.session.commit()
    return jsonify({'msg': 'Etkinlik silindi'})

@app.route('/api/announcements/<int:announcement_id>', methods=['DELETE'])
@jwt_required()
def delete_announcement(announcement_id):
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    if not user or not user.is_admin:
        return jsonify({'msg': 'Sadece adminler silebilir'}), 403
    ann = Announcement.query.get(announcement_id)
    if not ann:
        return jsonify({'msg': 'Duyuru bulunamadı'}), 404
    db.session.delete(ann)
    db.session.commit()
    return jsonify({'msg': 'Duyuru silindi'})

@app.route('/api/profile', methods=['GET', 'POST'])
@jwt_required()
def profile():
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    if not user:
        return jsonify({'msg': 'Kullanıcı bulunamadı'}), 404
    if request.method == 'GET':
        return jsonify({
            'email': user.email,
            'interests': user.interests or ''
        })
    data = request.get_json()
    user.email = data.get('email', user.email)
    user.interests = data.get('interests', user.interests)
    db.session.commit()
    return jsonify({'msg': 'Profil güncellendi'})

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
        create_admin_user()  # Admin kullanıcısını oluştur
    app.run(debug=True) 