document.addEventListener( 'DOMContentLoaded', () => {
  const searchInput = document.getElementById('eventSearch');
  const typeFilter = document.getElementById('eventTypeFilter');
  const dateFilter = document.getElementById('eventDateFilter');

  if (searchInput) searchInput.oninput = renderFilteredEvents;
  if (typeFilter) typeFilter.oninput = renderFilteredEvents;
  if (dateFilter) dateFilter.oninput = renderFilteredEvents;

  // Checkout button event listener
  const checkoutBtn = document.getElementById('checkoutBtn');
  if (checkoutBtn) {
    checkoutBtn.addEventListener('click', function() {
      // Get cart data from localStorage
      const cart = JSON.parse(localStorage.getItem('cart') || '[]');

      // Create a URL with cart data as a query parameter
      const url = new URL('/projeodevi/templates/payment.html', window.location.origin);
      url.searchParams.append('cart', JSON.stringify(cart));

      // Navigate to payment page with cart data
      window.location.href = url.toString();
    });
  }
  window.logout = function() {
    removeToken();
    localStorage.removeItem('userType');
    localStorage.removeItem('cart');
    window.location.href = '/projeodevi/templates/index.html';
  };
  function removeToken() {
    localStorage.removeItem('token');
    localStorage.removeItem('userType');
    console.log('Token silindi');
  }
  // Event delegation for add-to-cart and remove-from-cart buttons
  document.addEventListener('click', function(event) {
    if (event.target && event.target.classList.contains('add-to-cart-btn')) {
      const eventId = event.target.getAttribute('data-event-id');
      if (eventId) {
        addToCart(parseInt(eventId));
      }
    } else if (event.target && event.target.classList.contains('remove-from-cart-btn')) {
      const eventId = event.target.getAttribute('data-event-id');
      if (eventId) {
        removeFromCart(parseInt(eventId));
      }
    }
  });

  // Kullanıcı panel verilerini yükle
  let allEvents = [];
  loadEvents();
  loadAnnouncements();
  loadTickets();
  updateCart();

  function removeFromCart(eventId) {
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    const index = cart.indexOf(eventId);
    if (index !== -1) {
      cart.splice(index, 1);
      localStorage.setItem('cart', JSON.stringify(cart));
      showSnackbar('Etkinlik sepetten çıkarıldı!');
      updateCart();
    }
  };
  // Snackbar notification function
  function showSnackbar(message) {
    const snackbar = document.getElementById('snackbar');
    if (snackbar) {
      snackbar.textContent = message;
      snackbar.className = 'show';
      setTimeout(() => {
        snackbar.className = snackbar.className.replace('show', '');
      }, 3000);
    } else {
      console.log(message); // Fallback if snackbar element doesn't exist
    }
  }

  async function addToCart(eventId) {
    const token = getToken();
    if (!token) {
      console.error('addToCart: Token bulunamadı, işlem yapılamıyor.');
      showSnackbar('Bu işlemi yapmak için giriş yapmalısınız.');
      // İsteğe bağlı: Kullanıcıyı giriş sayfasına yönlendir
      // logout();
      return;
    }

    try {
      // Etkinlik detayını çekmek fetchWithAuth kullanıyor (doğrudan '/api/events/...' çağıracak)
      const response = await fetchWithAuth(`/projeodevi/api/events/getEvents.php?id=${eventId}`);
      if (response.ok) {
        const cart = JSON.parse(localStorage.getItem('cart') || '[]');
        // Sepete sadece ID ekliyoruz.
        if (!cart.includes(eventId)) {
          cart.push(eventId);
          localStorage.setItem('cart', JSON.stringify(cart));
          showSnackbar('Etkinlik sepete eklendi!');
          if(window.location.pathname === '/projeodevi/templates/user-panel.html') { // Sadece kullanıcı panelindeyken sepeti güncelle
            updateCart();
          }
        } else {
          showSnackbar('Bu etkinlik zaten sepetinizde.');
        }
      } else {
        const errorData = await response.json();
        console.error('Etkinlik detayı çekilemedi:', errorData);
        showSnackbar(errorData.message || 'Etkinlik sepete eklenemedi.');
        if (response.status === 401) {
          window.logout();
        }
      }
    } catch (error) {
      console.error('Sepete eklerken hata oluştu:', error);
      showSnackbar('Etkinlik sepete eklenirken bir hata oluştu.');
    }
  };
  function renderFilteredEvents() {
    const search = (document.getElementById('eventSearch')?.value || '').toLowerCase();
    const type = (document.getElementById('eventTypeFilter')?.value || '').toLowerCase();
    const date = document.getElementById('eventDateFilter')?.value;
    let filtered = allEvents;
    if (search) filtered = filtered.filter(e => e.title.toLowerCase().includes(search));
    // Check if the event has a type field, if not use category field
    if (type) filtered = filtered.filter(e => {
      const eventType = e.type ? e.type.toLowerCase() : (e.category ? e.category.toLowerCase() : '');
      return eventType.includes(type);
    });
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
      // Use type if available, otherwise use category
      const eventType = e.type || e.category || '';
      return `
            <div class="card">  
                <h3>${e.title}</h3>
                <p>${e.description}</p>
                <p><b>Tarih:</b> ${new Date(e.date).toLocaleString('tr-TR')}</p>
                <p><b>Tür:</b> ${eventType}</p>
                <p><b>Kapasite:</b> ${e.capacity}</p>
                <p><b>Kalan:</b> ${e.remaining_capacity}</p>
                <p><b>Fiyat:</b> ${e.price} TL</p>
                <button class="modern-btn add-to-cart-btn" data-event-id="${e.id}" ${disabled}>${btnText}</button>
            </div>
            `;
    }).join('');
  }

  function renderTickets(tickets) {
    const list = document.getElementById('ticketsList');
    if (!list) return;
    if (!tickets.length) {
      list.innerHTML = '<p>Henüz biletiniz yok.</p>';
      return;
    }
    list.innerHTML = tickets.map(t => `
            <div class="ticket-card">
                <div class="ticket-qr">QR</div>
                <h3>${t.event_title}</h3>
                <p class="ticket-price"><b>Fiyat:</b> ${Number(t.total_price)} TL</p>
                <p class="ticket-date"><b>Satın Alma:</b> ${new Date(t.created_at).toLocaleString('tr-TR')}</p>
            </div>
        `).join('');
  }
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
                <p style="font-size:0.9em;color:#888;">${new Date(a.created_at).toLocaleString('tr-TR')}</p>
            </div>
        `).join('');
  }
  async function loadTickets() {
    const token = getToken();
    if (!token) {
      console.error('loadTickets: Token bulunamadı, API çağrısı yapılmıyor.');
      // İsteğe bağlı: Kullanıcıyı giriş sayfasına yönlendir
      // logout();
      return;
    }

    try {
      const response = await fetchWithAuth('/projeodevi/api/events/getTickets.php');

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Biletler yüklenirken hata (API yanıtı): ', errorData);
        showSnackbar(errorData.message || 'Biletler yüklenemedi');
        if (response.status === 401) {
          window.logout(); // Yetkisiz erişimde çıkış yap
        }
        return;
      }

      const data = await response.json();
      renderTickets(data);
    } catch (err) {
      console.error('Biletler yüklenirken hata:', err);
      const list = document.getElementById('ticketsList');
      if (list) list.innerHTML = '<p>Biletler yüklenirken bir hata oluştu.</p>';
    }
  }
   async function updateCart() {
    const token = getToken();
    if (!token) {
      console.error('updateCart: Token bulunamadı, API çağrısı yapılmıyor.');
      // İsteğe bağlı: Kullanıcıyı giriş sayfasına yönlendir
      // window.logout();
      return;
    }

    const cartItemsElement = document.getElementById('cartItems');
    const cartTotalElement = document.getElementById('cartTotal');
    const cartSection = document.getElementById('cartSection');
    const cartIds = JSON.parse(localStorage.getItem('cart') || '[]');

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
        const response = await fetchWithAuth(`/projeodevi/api/events/getEvents.php?id=${eventId}`); // Korumalı API çağrısı
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
                     <span>${item.events.title}</span>
                     <span>${item.events.price} TL</span>
                     <button class="remove-from-cart-btn" data-event-id="${item.events.id}">Kaldır</button>
                 </div>
             `).join('');

      const total = eventsInCart.reduce((sum, item) => sum + Number(item.events.price), 0);
      cartTotalElement.innerHTML = `Toplam: ${total} TL`;

      cartSection.style.display = 'block';

    } catch (error) {
      console.error('Sepet güncellenirken etkinlik detayları çekilemedi:', error);
      cartItemsElement.innerHTML = '<p>Sepet bilgileri yüklenemedi.</p>';
      cartTotalElement.innerHTML = '';
      cartSection.style.display = 'block';
    }
  }
  async function loadAnnouncements() {
    const token = getToken();
    if (!token) {
      console.error('loadAnnouncements: Token bulunamadı, API çağrısı yapılmıyor.');
      // İsteğe bağlı: Kullanıcıyı giriş sayfasına yönlendir
      // logout();
      return;
    }

    try {
      const response = await fetchWithAuth('/projeodevi/api/events/getAnnouncements.php');

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Duyurular yüklenirken hata (API yanıtı): ', errorData);
        showSnackbar(errorData.msg || 'Duyurular yüklenemedi');
        if (response.status === 401) {
          window.logout(); // Yetkisiz erişimde çıkış yap
        }
        return;
      }

      const announcements = await response.json();

      renderAnnouncements(announcements);
    } catch (error) {
      console.error(error);
    }
  }

  async function fetchWithAuth(url, options = {}) {
    const token = getToken();
    if (!token) {
      console.error('Token bulunamadı, istek yapılamıyor!');
      window.location.href = '/projeodevi/templates/index.html';
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
        window.location.href = '/projeodevi/templates/index.html';
        return;
      }
      return response;
    } catch (error) {
      console.error('API isteği başarısız:', error);
      throw error;
    }
  }const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.onclick = () => {
      animateButton(logoutBtn);
      window.logout();
    };
  }
  function animateButton(btn) {
    if (!btn) return;
    btn.classList.add('clicked');
    setTimeout(() => btn.classList.remove('clicked'), 200);
  }

  function getToken() {
    const token = localStorage.getItem('token');
    if (!token) {
      console.warn('Token bulunamadı!');
      window.logout();
      return null;
    }
    return token;
  }

  async function loadEvents() {
    const token = getToken();
    if (!token) {
      console.error('loadEvents: Token bulunamadı, API çağrısı yapılmıyor.');
      // İsteğe bağlı: Kullanıcıyı giriş sayfasına yönlendir
      // logout();
      return;
    }

    try {
      const response = await fetchWithAuth('/projeodevi/api/events/getEvents.php');
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Etkinlikler yüklenirken hata (API yanıtı): ', errorData);
        showSnackbar(errorData.message || 'Etkinlikler yüklenemedi');
        if (response.status === 401) {
          window.logout(); // Yetkisiz erişimde çıkış yap
        }
        return;
      }

      const data = await response.json();

      // Update the global allEvents array with the events data
      if (data.events && Array.isArray(data.events)) {
        allEvents = data.events;
        // Render the filtered events (which will show all events initially)
        renderFilteredEvents();
      } else {
        console.error('Etkinlikler verisi beklenen formatta değil:', data);
        showSnackbar('Etkinlikler verisi beklenen formatta değil');
      }
    } catch (error) {
      console.error('Etkinlikler yüklenirken hata oluştu:', error);
      showSnackbar('Etkinlikler yüklenirken bir hata oluştu');
    }
  }
  const profileForm = document.getElementById('profileForm');
    profileForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('profileEmail').value;
      const interests = document.getElementById('profileInterests').value;
      try {
        const response = await fetchWithAuth('/projeodevi/api/userActions/updateUser.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, interests })
        });
        const data = await response.json();
        if (response.ok) {
          showSnackbar(data.message, '#27ae60');
        } else {
          showSnackbar(data.message || 'Profil güncellenemedi!', '#e74c3c');
        }
      } catch (err) {
        showSnackbar('Profil güncellenirken hata oluştu!', '#e74c3c');
      }
    });

  // Password change form handling
  const changePasswordForm = document.getElementById('changePasswordForm');
  if (changePasswordForm) {
    changePasswordForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const currentPassword = document.getElementById('currentPassword').value;
      const newPassword = document.getElementById('newPassword').value;

      // Client-side validation
      if (!currentPassword || !newPassword) {
        showSnackbar('Lütfen tüm alanları doldurun!', '#e74c3c');
        return;
      }

      if (newPassword.length < 6) {
        showSnackbar('Yeni şifre en az 6 karakter olmalıdır!', '#e74c3c');
        return;
      }

      try {
        const response = await fetchWithAuth('/projeodevi/api/userActions/updatePassword.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ currentPassword, newPassword })
        });

        const data = await response.json();

        if (response.ok) {
          showSnackbar(data.message, '#27ae60');
          // Clear the form
          document.getElementById('currentPassword').value = '';
          document.getElementById('newPassword').value = '';
        } else {
          showSnackbar(data.message || 'Şifre güncellenemedi!', '#e74c3c');
        }
      } catch (err) {
        console.error('Şifre güncelleme hatası:', err);
        showSnackbar('Şifre güncellenirken bir hata oluştu!', '#e74c3c');
      }
    });
  }

})
