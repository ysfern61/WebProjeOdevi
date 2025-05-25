const loginForm = document.getElementById('loginForm'); // index.html'de var
const registerForm = document.getElementById('registerForm'); // index.html'de var
const adminForm = document.getElementById('adminForm'); // index.html'de var
const showLoginBtn = document.getElementById('showLoginBtn'); // index.html'de var
const showRegisterBtn = document.getElementById('showRegisterBtn'); // index.html'de var
const showAdminBtn = document.getElementById('showAdminBtn'); // index.html'de var
const showLoginLink = document.getElementById('showLoginLink'); // index.html'de var
const showRegisterLink = document.getElementById('showRegisterLink'); // index.html'de var
const showMainLink = document.getElementById('showMainLink'); // index.html'de var

// Sepet işlemleri
let cart = [];

// JWT token yönetimi için yardımcı fonksiyonlar
function getToken() {
    const token = localStorage.getItem('token');
    if (!token) {
        console.warn('Token bulunamadı!');
        return null;
    }
    return token;
}

function setToken(token) {
    if (!token) {
        console.error('Geçersiz token!');
        return;
    }
    localStorage.setItem('token', token);
    console.log('Token kaydedildi');
}

function removeToken() {
    localStorage.removeItem('token');
    localStorage.removeItem('userType');
    console.log('Token silindi');
}

// API istekleri için yardımcı fonksiyon
async function fetchWithAuth(url, options = {}) {
    const token = getToken();
    if (!token) {
        console.error('Token bulunamadı, istek yapılamıyor!');
        window.location.href = '/';
        return;
    }

    options = options || {};
    options.headers = {
        ...options.headers,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };

    try {
        const response = await fetch(url, options);
        if (response.status === 401) {
            console.error('Yetkisiz erişim!');
            removeToken();
            window.location.href = '/';
            return;
        }
        return response;
    } catch (error) {
        console.error('API isteği başarısız:', error);
        throw error;
    }
}

// Kullanıcı kaydı
async function registerUser(email, password, interests) {
    try {
        const response = await fetch('/projeodevi/api/auth/register.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password, interests })
        });

        const data = await response.json();
        console.log('Register yanıtı:', data);

        if (response.ok) {
            showSnackbar('Kayıt başarılı! Giriş yapabilirsiniz.', '#27ae60');
            // Giriş formunu göster
            const loginForm = document.getElementById('loginForm');
            const registerForm = document.getElementById('registerForm');
            if (loginForm && registerForm) {
                registerForm.style.display = 'none';
                loginForm.style.display = 'block';
            }
        } else {
           throw new Error(data.error || 'Kayıt başarısız');
        }
    } catch (error) {
        console.error('Kayıt hatası:', error);
        showSnackbar(error.message || 'Kayıt yapılırken bir hata oluştu', '#e74c3c');
    }
}

// Kullanıcı girişi
async function loginUser(email, password) {
    try {
        const response = await fetch('/projeodevi/api/auth/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();
        console.log('Login yanıtı:', data);

        if (response.ok) {
            // Token'ı kaydet (PHP veya Flask yanıtına göre)
            const token = data.access_token || data.token;
            if (!token) {
                throw new Error('Token bulunamadı!');
            }
            setToken(token);

            // Kullanıcı tipini kaydet (PHP veya Flask yanıtına göre)
            const userType = data.user_type || (data.user && data.user.role);
            localStorage.setItem('userType', userType);
            localStorage.setItem('cart', JSON.stringify([]));

            // Yönlendirme öncesi token'ı kontrol et
            const savedToken = getToken();
            if (!savedToken) {
                throw new Error('Token kaydedilemedi!');
            }

            // Kullanıcı tipine göre yönlendirme
            if (userType === 'admin') {
                window.location.href = '/admin-panel.html';
            } else {
                window.location.href = '/user-panel.html';
            }
        } else {
            throw new Error(data.msg || data.message || 'Giriş başarısız');
        }
    } catch (error) {
        console.error('Giriş hatası:', error);
        showSnackbar(error.message || 'Giriş yapılırken bir hata oluştu', '#e74c3c');
    }
}

// Admin girişi
async function loginAdmin(email, password) {
    try {
        const response = await fetch('/projeodevi/api/auth/api/admin/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();
        console.log('Admin login yanıtı:', data);

        if (response.ok) {
            // Token'ı kaydet (PHP veya Flask yanıtına göre)
            const token = data.access_token || data.token;
            if (!token) {
                throw new Error('Token bulunamadı!');
            }
            setToken(token);
            localStorage.setItem('userType', 'admin');

            // Yönlendirme öncesi token'ı kontrol et
            const savedToken = getToken();
            if (!savedToken) {
                throw new Error('Token kaydedilemedi!');
            }

            window.location.href = '/admin-panel.html';
        } else {
            throw new Error(data.msg || data.message || 'Admin girişi başarısız');
        }
    } catch (error) {
        console.error('Admin giriş hatası:', error);
        showSnackbar(error.message || 'Admin girişi yapılırken bir hata oluştu', '#e74c3c');
    }
}

// Global scope'ta çıkış yapma fonksiyonu
window.logout = function() {
    removeToken();
    localStorage.removeItem('userType');
    localStorage.removeItem('cart');
    window.location.href = '/';
};

// Global scope'ta etkinlik ekleme fonksiyonu
window.addEvent = async function(eventData) {
    try {
        const response = await fetchWithAuth('/projeodevi/api/events/createEvent.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(eventData)
        });
        const data = await response.json();
        if (response.ok) {
            showSnackbar('Etkinlik başarıyla eklendi!', '#27ae60');
            document.getElementById('eventForm').reset();
            loadAdminEvents();
        } else {
            showSnackbar(data.msg || 'Etkinlik eklenemedi!', '#e74c3c');
        }
    } catch (error) {
        showSnackbar('Etkinlik eklenirken bir hata oluştu!', '#e74c3c');
    }
};

// Global scope'ta duyuru ekleme fonksiyonu
window.addAnnouncement = async function(announcementData) {
    try {
        const response = await fetchWithAuth('/api/announcements', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(announcementData)
        });
        const data = await response.json();
        if (response.ok) {
            showSnackbar('Duyuru başarıyla eklendi!', '#27ae60');
            document.getElementById('announcementForm').reset();
            loadAdminAnnouncements();
        } else {
            showSnackbar(data.msg || 'Duyuru eklenemedi!', '#e74c3c');
        }
    } catch (error) {
        showSnackbar('Duyuru eklenirken bir hata oluştu!', '#e74c3c');
    }
};

// Global scope'ta ödeme işlemleri
window.handlePayment = async function(paymentData) {
    try {
        const response = await fetchWithAuth('/api/payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(paymentData)
        });
        const data = await response.json();
        if (response.ok) {
            showSnackbar('Ödeme başarıyla tamamlandı!', '#27ae60');
            localStorage.removeItem('cart');
            setTimeout(() => {
                window.location.href = '/user-panel.html';
            }, 2000);
        } else {
            showSnackbar(data.msg || 'Ödeme işlemi başarısız!', '#e74c3c');
        }
    } catch (error) {
        showSnackbar('Ödeme sırasında bir hata oluştu!', '#e74c3c');
    }
};

// Sayfa yüklendiğinde tüm event listener'ları bağla
document.addEventListener('DOMContentLoaded', () => {
    // Token kontrolü
    const token = getToken();
    const userType = localStorage.getItem('userType');
    const pathname = window.location.pathname;

    console.log('Sayfa yüklendi:', {
        pathname,
        hasToken: !!token,
        userType
    });

    // Çıkış butonu
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.onclick = () => {
            animateButton(logoutBtn);
            window.logout();
        };
    }

    // Ödeme sayfası işlemleri
    if (pathname === '/payment.html') {
        const paymentTypeSelect = document.getElementById('paymentType');
        const creditCardFields = document.getElementById('creditCardFields');
        const bankTransferFields = document.getElementById('bankTransferFields');
        const paymentForm = document.getElementById('paymentForm');

        // Ödeme yöntemi değiştiğinde
        if (paymentTypeSelect) {
            paymentTypeSelect.onchange = (e) => {
                if (e.target.value === 'credit-card') {
                    creditCardFields.style.display = 'block';
                    bankTransferFields.style.display = 'none';
                } else {
                    creditCardFields.style.display = 'none';
                    bankTransferFields.style.display = 'block';
                }
            };
        }

        // Ödeme formu submit
        if (paymentForm) {
            paymentForm.onsubmit = async (e) => {
                e.preventDefault();

                // Get cart data from URL parameters instead of localStorage
                const urlParams = new URLSearchParams(window.location.search);
                const cartParam = urlParams.get('cart');
                const cart = cartParam ? JSON.parse(cartParam) : [];

                if (!cart.length) {
                    showSnackbar('Sepetiniz boş!', '#e74c3c');
                    return;
                }

                const paymentData = {
                    payment_type: paymentTypeSelect.value,
                    cart: cart
                };

                if (paymentTypeSelect.value === 'credit-card') {
                    paymentData.card = {
                        number: document.getElementById('cardNumber').value.replace(/\s/g, ''),
                        name: document.getElementById('cardName').value,
                        expiry: document.getElementById('cardExpiry').value,
                        cvc: document.getElementById('cardCVC').value
                    };
                }

                animateButton(paymentForm.querySelector('button'));
                await window.handlePayment(paymentData);
            };
        }

        // Sepeti göster
        updateCart();
    }

    // Admin panel işlemleri
    if (pathname === '/admin-panel.html') {
        // Etkinlik formu
        const eventForm = document.getElementById('eventForm');
        if (eventForm) {
            eventForm.onsubmit = async (e) => {
                e.preventDefault();
                const eventData = {
                    title: document.getElementById('eventTitle').value,
                    description: document.getElementById('eventDescription').value,
                    date: new Date(document.getElementById('eventDate').value).toISOString(),
                    type: document.getElementById('eventType').value,
                    capacity: parseInt(document.getElementById('eventCapacity').value),
                    price: parseFloat(document.getElementById('eventPrice').value)
                };
                animateButton(eventForm.querySelector('button'));
                await window.addEvent(eventData);
            };
        }

        // Duyuru formu
        const announcementForm = document.getElementById('announcementForm');
        if (announcementForm) {
            announcementForm.onsubmit = async (e) => {
                e.preventDefault();
                const announcementData = {
                    title: document.getElementById('announcementTitle').value,
                    content: document.getElementById('announcementContent').value
                };
                animateButton(announcementForm.querySelector('button'));
                await window.addAnnouncement(announcementData);
            };
        }

        // Admin panel verilerini yükle
        loadAdminEvents();
        loadAdminAnnouncements();
        loadUsers();
    }

    // Kullanıcı panel işlemleri
    if (pathname === '/user-panel.html') {
        // Etkinlik arama ve filtreleme
        const searchInput = document.getElementById('eventSearch');
        const typeFilter = document.getElementById('eventTypeFilter');
        const dateFilter = document.getElementById('eventDateFilter');

        if (searchInput) searchInput.oninput = renderFilteredEvents;
        if (typeFilter) typeFilter.oninput = renderFilteredEvents;
        if (dateFilter) dateFilter.oninput = renderFilteredEvents;

        // Kullanıcı panel verilerini yükle
        loadEvents();
        loadAnnouncements();
        loadTickets();
        updateCart();
    }

    // Ana sayfa işlemleri


    // --- User Paneli: Duyuruları ve etkinlikleri modern kartlarla göster ---
    function renderAnnouncements(announcements) {
        const list = document.getElementById('announcementList');
        if (!list) return;
        if (!announcements.length) {
            list.innerHTML = '<p>Henüz duyuru yok.</p>';
            return;
        }
        list.innerHTML = announcements.map(a => `
            <div class="card">
                <h3>${a.title}</h3>
                <p>${a.content}</p>
                <p style="font-size:0.9em;color:#888;">${new Date(a.date).toLocaleString('tr-TR')}</p>
            </div>
        `).join('');
    }

    // --- Etkinlik Arama ve Filtreleme ---
    let allEvents = [];
    function renderEvents(events) {
        allEvents = events;
        renderFilteredEvents();
    }
    function renderFilteredEvents() {
        const search = (document.getElementById('eventSearch')?.value || '').toLowerCase();
        const type = (document.getElementById('eventTypeFilter')?.value || '').toLowerCase();
        const date = document.getElementById('eventDateFilter')?.value;
        let filtered = allEvents;
        if (search) filtered = filtered.filter(e => e.title.toLowerCase().includes(search));
        if (type) filtered = filtered.filter(e => e.type.toLowerCase().includes(type));
        if (date) filtered = filtered.filter(e => e.date.slice(0,10) === date);
        const list = document.getElementById('eventsList');
        if (!list) return;
        if (!filtered.length) {
            list.innerHTML = '<p>Aradığınız kriterlere uygun etkinlik yok.</p>';
            return;
        }
        list.innerHTML = filtered.map(e => {
            const disabled = e.remaining_capacity === 0 ? 'disabled' : '';
            const btnText = e.remaining_capacity === 0 ? 'Kapasite Doldu' : 'Sepete Ekle';
            return `
            <div class="card">
                <h3>${e.title}</h3>
                <p>${e.description}</p>
                <p><b>Tarih:</b> ${new Date(e.date).toLocaleString('tr-TR')}</p>
                <p><b>Tür:</b> ${e.type}</p>
                <p><b>Kapasite:</b> ${e.capacity}</p>
                <p><b>Kalan:</b> ${e.remaining_capacity}</p>
                <p><b>Fiyat:</b> ${e.price} TL</p>
                <button class="modern-btn" onclick="addToCart(${e.id}, '${e.title}', ${e.price}, ${e.remaining_capacity})" ${disabled}>${btnText}</button>
            </div>
            `;
        }).join('');
    }
    if (window.location.pathname === '/user-panel.html') {
        document.addEventListener('DOMContentLoaded', () => {
            const search = document.getElementById('eventSearch');
            const type = document.getElementById('eventTypeFilter');
            const date = document.getElementById('eventDateFilter');
            if (search) search.addEventListener('input', renderFilteredEvents);
            if (type) type.addEventListener('input', renderFilteredEvents);
            if (date) date.addEventListener('input', renderFilteredEvents);
        });
    }

    // Etkinlikleri yükleme
    async function loadEvents() {
        const token = getToken();
        if (!token) {
            console.error('loadEvents: Token bulunamadı, API çağrısı yapılmıyor.');
            // İsteğe bağlı: Kullanıcıyı giriş sayfasına yönlendir
            // logout();
            return;
        }

        try {
            const response = await fetchWithAuth('/api/events');

            if (!response.ok) {
                 const errorData = await response.json();
                 console.error('Etkinlikler yüklenirken hata (API yanıtı): ', errorData);
                 showSnackbar(errorData.msg || 'Etkinlikler yüklenemedi', '#e74c3c');
                 if (response.status === 401) {
                     logout(); // Yetkisiz erişimde çıkış yap
                 }
                 return;
            }

            const events = await response.json();
            const eventsList = document.getElementById('eventsList');

            if (eventsList) {
                 eventsList.innerHTML = '';

                 events.forEach(event => {
                     const eventCard = createEventCard(event);
                     eventsList.appendChild(eventCard);
                 });
            }
        } catch (error) {
            console.error('Etkinlikler yüklenirken hata oluştu:', error);
             showSnackbar('Etkinlikler yüklenirken bir hata oluştu', '#e74c3c');
        }
    }

    // Etkinlik kartı oluşturma
    function createEventCard(event) {
        const card = document.createElement('div');
        card.className = 'event-card';
        card.innerHTML = `
            <h3>${event.title}</h3>
            <p>${event.description}</p>
            <p>Tarih: ${new Date(event.date).toLocaleDateString()}</p>
            <p>Kalan Kontenjan: ${event.remaining_capacity}</p>
            <p>Fiyat: ${event.price} TL</p>
            <button onclick="addToCart(${event.id})">Sepete Ekle</button>
        `;
        return card;
    }

    // Sepeti güncelleme
    async function updateCart() {
        const token = getToken();
         if (!token) {
            console.error('updateCart: Token bulunamadı, API çağrısı yapılmıyor.');
            // İsteğe bağlı: Kullanıcıyı giriş sayfasına yönlendir
            // logout();
            return;
         }

        const cartItemsElement = document.getElementById('cartItems');
        const cartTotalElement = document.getElementById('cartTotal');
        const cartSection = document.getElementById('cart');

        // Check if we're on the payment page
        const isPaymentPage = window.location.pathname === '/payment.html';
        let cartIds = [];

        if (isPaymentPage) {
            // Get cart data from URL parameters
            const urlParams = new URLSearchParams(window.location.search);
            const cartParam = urlParams.get('cart');
            cartIds = cartParam ? JSON.parse(cartParam) : [];
        } else {
            // Get cart data from localStorage for other pages
            cartIds = JSON.parse(localStorage.getItem('cart') || '[]');
        }

        if (!cartItemsElement || !cartTotalElement || !cartSection) return; // Elementler yoksa çalışma

        if (cartIds.length === 0) {
            cartItemsElement.innerHTML = '<p>Sepetiniz boş.</p>';
            cartTotalElement.innerHTML = '';
            cartSection.style.display = 'none';
            return;
        }

        // Etkinlik detaylarını API'den çek
        try {
             const eventsInCart = [];
             for (const eventId of cartIds) {
                 // fetchWithAuth doğrudan '/api/events/...' çağıracak
                 const response = await fetchWithAuth(`/api/events/${eventId}`); // Korumalı API çağrısı
                  if (response.ok) {
                     const event = await response.json();
                     eventsInCart.push(event);
                 } else {
                     console.error(`Etkinlik detayı çekilirken hata: ${eventId}`);
                     // Hatalı ID'leri sepetten çıkarmayı düşünebilirsiniz.
                 }
             }

             cartItemsElement.innerHTML = eventsInCart.map(item => `
                 <div class=\"cart-item\">
                     <span>${item.title}</span>
                     <span>${item.price} TL</span>
                     <button onclick=\"window.removeFromCart(${item.id})\">Kaldır</button>
                 </div>
             `).join('');

             const total = eventsInCart.reduce((sum, item) => sum + item.price, 0);
             cartTotalElement.innerHTML = `Toplam: ${total} TL`;

             cartSection.style.display = 'block';

        } catch (error) {
             console.error('Sepet güncellenirken etkinlik detayları çekilemedi:', error);
             cartItemsElement.innerHTML = '<p>Sepet bilgileri yüklenemedi.</p>';
             cartTotalElement.innerHTML = '';
             cartSection.style.display = 'block';
        }
    }

    // Duyuruları yükleme
    async function loadAnnouncements() {
        const token = getToken();
        if (!token) {
            console.error('loadAnnouncements: Token bulunamadı, API çağrısı yapılmıyor.');
            // İsteğe bağlı: Kullanıcıyı giriş sayfasına yönlendir
            // logout();
            return;
        }

        try {
            const response = await fetchWithAuth('/api/announcements');

             if (!response.ok) {
                 const errorData = await response.json();
                 console.error('Duyurular yüklenirken hata (API yanıtı): ', errorData);
                 showSnackbar(errorData.msg || 'Duyurular yüklenemedi', '#e74c3c');
                  if (response.status === 401) {
                     logout(); // Yetkisiz erişimde çıkış yap
                 }
                 return;
            }

            const announcements = await response.json();
            const announcementsList = document.getElementById('announcementList');

            if (announcementsList) {
                 announcementsList.innerHTML = announcements.map(announcement => `
                    <div class=\"announcement-card\">
                        <h3>${announcement.title}</h3>
                        <p>${announcement.content}</p>
                        <p class=\"date\">Tarih: ${new Date(announcement.date).toLocaleString('tr-TR')}</p>
                    </div>
                `).join('');
            }
        } catch (error) {
            console.error('Duyurular yüklenirken hata:', error);
             showSnackbar('Duyurular yüklenirken bir hata oluştu', '#e74c3c');
        }
    }

    // Hava durumu kontrolü
    async function checkWeather(eventId) {
        const token = getToken();
         if (!token) {
            console.error('checkWeather: Token bulunamadı, API çağrısı yapılmıyor.');
            // İsteğe bağlı: Kullanıcıyı giriş sayfasına yönlendir
            // logout();
            return false;
         }
        try {
            // fetchWithAuth doğrudan '/api/weather-check/...' çağıracak
            const response = await fetchWithAuth(`/api/weather-check/${eventId}`); // Korumalı API çağrısı

             if (!response.ok) {
                 const errorData = await response.json();
                 console.error('Hava durumu kontrolü yapılırken hata (API yanıtı): ', errorData);
                 showSnackbar(errorData.msg || 'Hava durumu kontrolü başarısız', '#e74c3c');
                  if (response.status === 401) {
                     logout();
                 }
                 return false;
            }

            const data = await response.json();
            return data.weather_suitable;
        } catch (error) {
            console.error('Hava durumu kontrolü yapılırken hata oluştu:', error);
             showSnackbar('Hava durumu kontrolü yapılırken bir hata oluştu', '#e74c3c');
            return false;
        }
    }

    // addToCart fonksiyonu (Global)
    window.addToCart = async function(eventId) {
        const token = getToken();
         if (!token) {
            console.error('addToCart: Token bulunamadı, işlem yapılamıyor.');
            showSnackbar('Bu işlemi yapmak için giriş yapmalısınız.', '#e74c3c');
            // İsteğe bağlı: Kullanıcıyı giriş sayfasına yönlendir
            // logout();
            return;
         }

        try {
            // Etkinlik detayını çekmek fetchWithAuth kullanıyor (doğrudan '/api/events/...' çağıracak)
            const response = await fetchWithAuth(`/api/events/${eventId}`);
             if (response.ok) {
                const event = await response.json();
                const cart = JSON.parse(localStorage.getItem('cart') || '[]');
                // Sepete sadece ID ekliyoruz.
                if (!cart.includes(eventId)) {
                     cart.push(eventId);
                     localStorage.setItem('cart', JSON.stringify(cart));
                     showSnackbar('Etkinlik sepete eklendi!', '#27ae60');
                     if(window.location.pathname === '/user-panel.html') { // Sadece kullanıcı panelindeyken sepeti güncelle
                        updateCart();
                     }
                } else {
                     showSnackbar('Bu etkinlik zaten sepetinizde.', '#e67e22');
                }
            } else {
                const errorData = await response.json();
                console.error('Etkinlik detayı çekilemedi:', errorData);
                showSnackbar(errorData.msg || 'Etkinlik sepete eklenemedi.', '#e74c3c');
                 if (response.status === 401) {
                    logout();
                }
            }
        } catch (error) {
            console.error('Sepete eklerken hata oluştu:', error);
             showSnackbar('Etkinlik sepete eklenirken bir hata oluştu.', '#e74c3c');
        }
    };

    // removeFromCart fonksiyonu (Global)
    window.removeFromCart = function(eventId) {
        const token = getToken();
         if (!token) {
            console.error('removeFromCart: Token bulunamadı, işlem yapılamıyor.');
            showSnackbar('Bu işlemi yapmak için giriş yapmalısınız.', '#e74c3c');
            // İsteğe bağlı: Kullanıcıyı giriş sayfasına yönlendir
            // logout();
            return;
         }
        let cart = JSON.parse(localStorage.getItem('cart') || '[]');
        const initialLength = cart.length;
        // İlk bulunan eşleşmeyi sil
        const index = cart.findIndex(id => id === eventId);
        if (index > -1) {
            cart.splice(index, 1);
            localStorage.setItem('cart', JSON.stringify(cart));
            showSnackbar('Etkinlik sepetten kaldırıldı!', '#27ae60');
            if(window.location.pathname === '/user-panel.html') { // Sadece kullanıcı panelindeyken sepeti güncelle
                 updateCart();
            }
        }
    };

    // --- Admin Paneli: Etkinlik ve Duyuru Ekleme ve Listeleme ---
    function renderAdminAnnouncements(announcements) {
        const list = document.getElementById('announcementList');
        if (!list) return;
        if (!announcements.length) {
            list.innerHTML = '<p>Henüz duyuru yok.</p>';
            return;
        }
        list.innerHTML = announcements.map(a => `
            <div class="card admin-card">
                <h3>${a.title}</h3>
                <p>${a.content}</p>
                <p style="font-size:0.9em;color:#888;">${new Date(a.date).toLocaleString('tr-TR')}</p>
                <button class="modern-btn" style="background:#e74c3c;margin-top:8px;" onclick="deleteAnnouncement(${a.id})">Sil</button>
            </div>
        `).join('');
    }

    function renderAdminEvents(events) {
        const list = document.getElementById('eventsList');
        if (!list) return;
        if (!events.length) {
            list.innerHTML = '<p>Henüz etkinlik yok.</p>';
            return;
        }
        list.innerHTML = events.map(e => `
            <div class="card">
                <h3>${e.title}</h3>
                <p>${e.description}</p>
                <p><b>Tarih:</b> ${new Date(e.date).toLocaleString('tr-TR')}</p>
                <p><b>Tür:</b> ${e.type}</p>
                <p><b>Kapasite:</b> ${e.capacity}</p>
                <p><b>Kalan:</b> ${e.remaining_capacity}</p>
                <p><b>Fiyat:</b> ${e.price} TL</p>
                <button class="modern-btn" style="background:#e74c3c;margin-top:8px;" onclick="deleteEvent(${e.id})">Sil</button>
            </div>
        `).join('');
    }

    async function loadAdminAnnouncements() {
        try {
            const response = await fetchWithAuth('/api/announcements');
            if (!response.ok) throw new Error('Duyurular yüklenemedi');
            const data = await response.json();
            renderAdminAnnouncements(data);
        } catch (err) {
            const list = document.getElementById('announcementList');
            if (list) list.innerHTML = '<p>Duyurular yüklenirken bir hata oluştu.</p>';
        }
    }

    async function loadAdminEvents() {
        try {
            const response = await fetchWithAuth('/api/events');
            if (!response.ok) throw new Error('Etkinlikler yüklenemedi');
            const data = await response.json();
            renderAdminEvents(data);
        } catch (err) {
            const list = document.getElementById('eventsList');
            if (list) list.innerHTML = '<p>Etkinlikler yüklenirken bir hata oluştu.</p>';
        }
    }

    document.addEventListener('DOMContentLoaded', () => {
        const pathname = window.location.pathname;
        // Admin panelindeysek formları işle ve listele
        if (pathname === '/admin-panel.html') {
            loadAdminAnnouncements();
            loadAdminEvents();
            // Duyuru ekleme
            const announcementForm = document.getElementById('announcementForm');
            if (announcementForm) {
                announcementForm.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    const announcementData = {
                        title: document.getElementById('announcementTitle').value,
                        content: document.getElementById('announcementContent').value
                    };
                    animateButton(announcementForm.querySelector('button'));
                    await window.addAnnouncement(announcementData);
                });
            }
            // Etkinlik ekleme
            const eventForm = document.getElementById('eventForm');
            if (eventForm) {
                eventForm.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    const eventData = {
                        title: document.getElementById('eventTitle').value,
                        description: document.getElementById('eventDescription').value,
                        date: new Date(document.getElementById('eventDate').value).toISOString(),
                        type: document.getElementById('eventType').value,
                        capacity: parseInt(document.getElementById('eventCapacity').value),
                        price: parseFloat(document.getElementById('eventPrice').value)
                    };
                    animateButton(eventForm.querySelector('button'));
                    await window.addEvent(eventData);
                });
            }
        }
    });

    // --- Kullanıcı Biletleri ---
    function renderTickets(tickets) {
        const list = document.getElementById('ticketsList');
        if (!list) return;
        if (!tickets.length) {
            list.innerHTML = '<p>Henüz biletiniz yok.</p>';
            return;
        }
        list.innerHTML = tickets.map(t => `
            <div class="card">
                <h3>${t.event_title}</h3>
                <p><b>Fiyat:</b> ${t.price} TL</p>
                <p><b>Satın Alma:</b> ${new Date(t.purchase_date).toLocaleString('tr-TR')}</p>
            </div>
        `).join('');
    }
    async function loadTickets() {
        try {
            const response = await fetchWithAuth('/api/tickets');
            if (!response.ok) throw new Error('Biletler yüklenemedi');
            const data = await response.json();
            renderTickets(data);
        } catch (err) {
            const list = document.getElementById('ticketsList');
            if (list) list.innerHTML = '<p>Biletler yüklenirken bir hata oluştu.</p>';
        }
    }
    // User panelinde biletleri otomatik yükle
    if (window.location.pathname === '/user-panel.html') {
        document.addEventListener('DOMContentLoaded', loadTickets);
    }

    // --- Admin Kullanıcı Yönetimi ---
    function renderUsers(users) {
        const list = document.getElementById('userList');
        if (!list) return;
        if (!users.length) {
            list.innerHTML = '<p>Kayıtlı kullanıcı yok.</p>';
            return;
        }
        list.innerHTML = users.map(u => `
            <div class="card">
                <h3>${u.email}</h3>
                <p>${u.is_admin ? '<b>Admin</b>' : 'Kullanıcı'}</p>
                <p>Onaylı: <b style="color:${u.is_approved ? '#27ae60' : '#e67e22'}">${u.is_approved ? 'Evet' : 'Hayır'}</b></p>
                <div style="margin-top:1rem;display:flex;gap:0.5rem;">
                    ${!u.is_approved && !u.is_admin ? `<button class="modern-btn" onclick="approveUser(${u.id})">Onayla</button>` : ''}
                    ${!u.is_admin ? `<button class="modern-btn" style="background:#e74c3c;" onclick="deleteUser(${u.id})">Sil</button>` : ''}
                </div>
            </div>
        `).join('');
    }
    async function loadUsers() {
        try {
            const response = await fetchWithAuth('/api/users');
            if (!response.ok) throw new Error('Kullanıcılar yüklenemedi');
            const data = await response.json();
            renderUsers(data);
        } catch (err) {
            const list = document.getElementById('userList');
            if (list) list.innerHTML = '<p>Kullanıcılar yüklenirken bir hata oluştu.</p>';
        }
    }
    window.approveUser = async function(id) {
        if (!confirm('Kullanıcıyı onaylamak istiyor musunuz?')) return;
        try {
            const response = await fetchWithAuth(`/api/users/${id}/approve`, { method: 'POST' });
            const data = await response.json();
            showSnackbar(data.msg, '#27ae60');
            await loadUsers();
        } catch (err) {
            showSnackbar('Onaylama sırasında hata oluştu!', '#e74c3c');
        }
    }
    window.deleteUser = async function(id) {
        if (!confirm('Kullanıcıyı silmek istiyor musunuz?')) return;
        try {
            const response = await fetchWithAuth(`/api/users/${id}`, { method: 'DELETE' });
            const data = await response.json();
            showSnackbar(data.msg, '#27ae60');
            await loadUsers();
        } catch (err) {
            showSnackbar('Silme sırasında hata oluştu!', '#e74c3c');
        }
    }
    // Admin panelinde kullanıcıları otomatik yükle
    if (window.location.pathname === '/admin-panel.html') {
        document.addEventListener('DOMContentLoaded', loadUsers);
    }

    function showSnackbar(msg, color = '#323232') {
        const sb = document.getElementById('snackbar');
        if (!sb) return;
        sb.textContent = msg;
        sb.style.background = color;
        sb.className = 'show';
        setTimeout(() => { sb.className = sb.className.replace('show', ''); }, 2500);
    }

    window.deleteAnnouncement = async function(id) {
        if (!confirm('Duyuruyu silmek istiyor musunuz?')) return;
        try {
            const response = await fetchWithAuth(`/api/announcements/${id}`, { method: 'DELETE' });
            const data = await response.json();
            showSnackbar(data.msg, '#27ae60');
            await loadAdminAnnouncements();
        } catch (err) {
            showSnackbar('Duyuru silinirken hata oluştu!', '#e74c3c');
        }
    }
    window.deleteEvent = async function(id) {
        if (!confirm('Etkinliği silmek istiyor musunuz?')) return;
        try {
            const response = await fetchWithAuth(`/api/events/${id}`, { method: 'DELETE' });
            const data = await response.json();
            showSnackbar(data.msg, '#27ae60');
            await loadAdminEvents();
        } catch (err) {
            showSnackbar('Etkinlik silinirken hata oluştu!', '#e74c3c');
        }
    }

    // --- Kullanıcı Profili Getir/Güncelle ---
    async function loadProfile() {
        try {
            const response = await fetchWithAuth('/api/profile');
            if (!response.ok) throw new Error('Profil yüklenemedi');
            const data = await response.json();
            document.getElementById('profileEmail').value = data.email;
            document.getElementById('profileInterests').value = data.interests || '';
        } catch (err) {
            showSnackbar('Profil yüklenirken hata oluştu!', '#e74c3c');
        }
    }
    const profileForm = document.getElementById('profileForm');
    if (profileForm) {
        profileForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('profileEmail').value;
            const interests = document.getElementById('profileInterests').value;
            try {
                const response = await fetchWithAuth('/api/profile', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, interests })
                });
                const data = await response.json();
                if (response.ok) {
                    showSnackbar(data.msg, '#27ae60');
                } else {
                    showSnackbar(data.msg || 'Profil güncellenemedi!', '#e74c3c');
                }
            } catch (err) {
                showSnackbar('Profil güncellenirken hata oluştu!', '#e74c3c');
            }
        });
    }
    if (window.location.pathname === '/user-panel.html') {
        document.addEventListener('DOMContentLoaded', loadProfile);
    }

    // --- Kayıt ve Girişte Şifre/E-posta Doğrulama ---
    function validateEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }
    function validatePassword(password) {
        return password.length >= 6;
    }

    // Butonlara animasyon ve görsel geri bildirim ekle
    function animateButton(btn) {
        if (!btn) return;
        btn.classList.add('clicked');
        setTimeout(() => btn.classList.remove('clicked'), 200);
    }

    // Buton animasyonu için CSS ekle
    const style = document.createElement('style');
    style.innerHTML = `
    .clicked {
        animation: btnClick 0.2s;
    }
    @keyframes btnClick {
        0% { transform: scale(1); }
        50% { transform: scale(0.95); }
        100% { transform: scale(1); }
    }`;
    document.head.appendChild(style);
}); 
