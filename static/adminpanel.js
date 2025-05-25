
document.addEventListener( 'DOMContentLoaded', () => {
  // Weather API key and base URL
  const WEATHER_API_KEY = '4d8fb5b93d4af21d66a2948710284366';
  const WEATHER_API_BASE_URL = 'https://api.openweathermap.org/data/2.5/forecast';

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
                <p style="font-size:0.9em;color:#888;">${a.created_at}</p>
                <button class="modern-btn" style="background:#e74c3c;margin-top:8px;" onclick="deleteAnnouncement(${a.id})">Sil</button>
            </div>
        `).join('');
  }

  function renderAdminEvents(events) {
    const list = document.getElementById('eventsList');
    if (!list) return;

    if (!events.events.length) {
      list.innerHTML = '<p>Henüz etkinlik yok.</p>';
      return;
    }
    list.innerHTML = events.events.map(e => `
            <div class="card">
                <h3>${e.title}</h3>
                <p>${e.description}</p>
                <p>${e.category}</p>
                <p><b>Tarih:</b> ${e.date}</p>
                <p><b>Kapasite:</b> ${e.capacity}</p>
                <p><b>Kalan:</b> ${e.remaining_capacity}</p>
                <p><b>Fiyat:</b> ${e.price} TL</p>
                <div style="display:flex;gap:8px;margin-top:8px;">
                  <button class="modern-btn" style="background:#3498db;" onclick="openUpdateEventModal(${e.id})">Güncelle</button>
                  <button class="modern-btn" style="background:#e74c3c;" onclick="deleteEvent(${e.id})">Sil</button>
                </div>
            </div>
        `).join('');
  }

  async function loadAdminAnnouncements() {
    try {
      const response = await fetchWithAuth('/projeodevi/api/events/getAnnouncements.php');
      if (!response.ok) throw new Error('Duyurular yüklenemedi');
      const data = await response.json();
      renderAdminAnnouncements(data);
    } catch (err) {
      console.error(err);
      const list = document.getElementById('announcementList');
      if (list) list.innerHTML = '<p>Duyurular yüklenirken bir hata oluştu.</p>';
    }
  }

  async function loadAdminEvents() {
    try {
      const response = await fetchWithAuth('/projeodevi/api/events/getEvents.php');
      if (!response.ok) throw new Error('Etkinlikler yüklenemedi');
      const data = await response.json();
      renderAdminEvents(data);
    } catch (err) {
      const list = document.getElementById('eventsList');
      if (list) list.innerHTML = '<p>Etkinlikler yüklenirken bir hata oluştu.</p>';
    }
  }
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
  // Function to check weather for a given date and location
  async function checkWeather(date, location, displayElement) {
    if (!date || !location || !displayElement) return;

    try {
      // Convert location to coordinates (for simplicity, we'll use the location name directly)
      // In a real app, you might want to use a geocoding API to convert location to coordinates
      const weatherUrl = `${WEATHER_API_BASE_URL}?q=${encodeURIComponent(location)}&appid=${WEATHER_API_KEY}&units=metric`;

      const response = await fetch(weatherUrl);
      if (!response.ok) {
        displayElement.innerHTML = 'Hava durumu bilgisi alınamadı.';
        displayElement.className = 'weather-info warning';
        return false;
      }

      const weatherData = await response.json();

      // Find the forecast closest to our event date
      const eventDate = new Date(date);
      const eventDay = eventDate.getDate();
      const eventMonth = eventDate.getMonth();

      // Filter forecasts for the event date
      const relevantForecasts = weatherData.list.filter(forecast => {
        const forecastDate = new Date(forecast.dt * 1000);
        return forecastDate.getDate() === eventDay && forecastDate.getMonth() === eventMonth;
      });

      if (relevantForecasts.length === 0) {
        displayElement.innerHTML = 'Bu tarih için hava durumu tahmini bulunamadı (5 günlük tahmin sınırı).';
        displayElement.className = 'weather-info warning';
        return false;
      }

      // Check for extreme weather conditions
      let hasExtremeWeather = false;
      let weatherMessage = '';

      for (const forecast of relevantForecasts) {
        const weatherId = forecast.weather[0].id;
        const temp = forecast.main.temp;
        const windSpeed = forecast.wind.speed;
        const forecastTime = new Date(forecast.dt * 1000).toLocaleTimeString('tr-TR', {hour: '2-digit', minute:'2-digit'});

        // Check for extreme conditions
        if (weatherId < 600 && weatherId >= 500) { // Rain
          hasExtremeWeather = true;
          weatherMessage += `<div>⚠️ ${forecastTime} - Yağmur bekleniyor (${forecast.weather[0].description})</div>`;
        } else if (weatherId >= 600 && weatherId < 700) { // Snow
          hasExtremeWeather = true;
          weatherMessage += `<div>⚠️ ${forecastTime} - Kar yağışı bekleniyor (${forecast.weather[0].description})</div>`;
        } else if (weatherId >= 200 && weatherId < 300) { // Thunderstorm
          hasExtremeWeather = true;
          weatherMessage += `<div>⚠️ ${forecastTime} - Fırtına bekleniyor (${forecast.weather[0].description})</div>`;
        } else if (weatherId >= 900) { // Extreme
          hasExtremeWeather = true;
          weatherMessage += `<div>⚠️ ${forecastTime} - Ekstrem hava koşulları bekleniyor (${forecast.weather[0].description})</div>`;
        } else if (temp > 35) { // Very hot
          hasExtremeWeather = true;
          weatherMessage += `<div>⚠️ ${forecastTime} - Aşırı sıcak (${temp}°C)</div>`;
        } else if (temp < 0) { // Very cold
          hasExtremeWeather = true;
          weatherMessage += `<div>⚠️ ${forecastTime} - Dondurucu soğuk (${temp}°C)</div>`;
        } else if (windSpeed > 10) { // Strong wind
          hasExtremeWeather = true;
          weatherMessage += `<div>⚠️ ${forecastTime} - Kuvvetli rüzgar (${windSpeed} m/s)</div>`;
        }
      }

      if (hasExtremeWeather) {
        displayElement.innerHTML = `<strong>Uyarı:</strong> Seçilen tarihte olumsuz hava koşulları bekleniyor:<br>${weatherMessage}<br>Etkinlik planını gözden geçirin.`;
        displayElement.className = 'weather-info danger';
        return false;
      } else {
        const sampleForecast = relevantForecasts[0];
        displayElement.innerHTML = `<strong>Hava Durumu:</strong> ${sampleForecast.weather[0].description}, ${sampleForecast.main.temp}°C. Etkinlik için uygun hava koşulları bekleniyor.`;
        displayElement.className = 'weather-info good';
        return true;
      }
    } catch (error) {
      console.error('Hava durumu kontrolü sırasında hata:', error);
      displayElement.innerHTML = 'Hava durumu kontrol edilirken bir hata oluştu.';
      displayElement.className = 'weather-info warning';
      return false;
    }
  }

  // Etkinlik ekleme
  const eventForm = document.getElementById('eventForm');
  const eventDateInput = document.getElementById('eventDate');
  const eventLocationInput = document.getElementById('eventLocation');
  const weatherInfoElement = document.getElementById('weatherInfo');

  if (eventDateInput && eventLocationInput) {
    // Check weather when date or location changes
    const checkEventWeather = () => {
      const date = eventDateInput.value;
      const location = eventLocationInput.value;

      if (date && location) {
        checkWeather(date, location, weatherInfoElement);
      } else {
        weatherInfoElement.innerHTML = '';
        weatherInfoElement.className = 'weather-info';
      }
    };

    eventDateInput.addEventListener('change', checkEventWeather);
    eventLocationInput.addEventListener('change', checkEventWeather);
    eventLocationInput.addEventListener('blur', checkEventWeather);
  }

  if (eventForm) {
    eventForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const date = eventDateInput.value;
      const location = eventLocationInput.value;

      // Check weather before submitting
      if (date && location) {
        const weatherElement = document.getElementById('weatherInfo');
        const isWeatherOk = await checkWeather(date, location, weatherElement);

        if (!isWeatherOk) {
          const confirmCreate = confirm('Seçilen tarihte olumsuz hava koşulları bekleniyor. Yine de etkinliği oluşturmak istiyor musunuz?');
          if (!confirmCreate) {
            return;
          }
        }
      }

      const eventData = {
        title: document.getElementById('eventTitle').value,
        description: document.getElementById('eventDescription').value,
        date: new Date(eventDateInput.value).toISOString(),
        location: eventLocationInput.value,
        category_id: document.getElementById('eventType').value,
        capacity: parseInt(document.getElementById('eventCapacity').value),
        price: parseFloat(document.getElementById('eventPrice').value)
      };

      animateButton(eventForm.querySelector('button'));
      await window.addEvent(eventData);
    });
  }
  function animateButton(btn) {
    if (!btn) return;
    btn.classList.add('clicked');
    setTimeout(() => btn.classList.remove('clicked'), 200);
  }
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
        showSnackbar(data.message || 'Etkinlik eklenemedi!', '#e74c3c');
      }
    } catch (error) {
      showSnackbar('Etkinlik eklenirken bir hata oluştu!', '#e74c3c');
    }
  };
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
      const response = await fetchWithAuth('/projeodevi/api/events/loadUsers.php');
      if (!response.ok) throw new Error('Kullanıcılar yüklenemedi');
      const data = await response.json();
      renderUsers(data);
    } catch (err) {
      const list = document.getElementById('userList');
      if (list) list.innerHTML = '<p>Kullanıcılar yüklenirken bir hata oluştu.</p>';
    }
  }
  loadUsers();
  window.approveUser = async function(user_id) {
    if (!confirm('Kullanıcıyı onaylamak istiyor musunuz?')) return;
    try {
      const response = await fetchWithAuth(`/projeodevi/api/userActions/approveUser.php?user_id=${user_id}`, { method: 'GET' });
      const data = await response.json();
      showSnackbar(data.message, '#27ae60');
      await loadUsers();
    } catch (err) {
      showSnackbar('Onaylama sırasında hata oluştu!', '#e74c3c');
    }
  }
  window.deleteUser = async function(user_id) {
    if (!confirm('Kullanıcıyı silmek istiyor musunuz?')) return;
    try {
      const response = await fetchWithAuth(`/projeodevi/api/userActions/deleteUser.php?user_id=${user_id}`, { method: 'DELETE' });
      const data = await response.json();
      showSnackbar(data.message, '#27ae60');
      await loadUsers();
    } catch (err) {
      showSnackbar('Silme sırasında hata oluştu!', '#e74c3c');
    }
  }
  // Admin panelinde kullanıcıları otomatik yükle


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
      const response = await fetchWithAuth(`/projeodevi/api/events/deleteAnnouncement.php?id=${id}`, { method: 'DELETE' });
      const data = await response.json();
      showSnackbar(data.message, '#27ae60');
      await loadAdminAnnouncements();
    } catch (err) {
      console.log(err)
      showSnackbar('Duyuru silinirken hata oluştu!', '#e74c3c');
    }
  }
  window.deleteEvent = async function(id) {
    if (!confirm('Etkinliği silmek istiyor musunuz?')) return;
    try {
      const response = await fetchWithAuth(`/projeodevi/api/events/deleteEvent.php?id=${id}`, { method: 'DELETE' });
      const data = await response.json();
      showSnackbar(data.msg, '#27ae60');
      await loadAdminEvents();
    } catch (err) {
      showSnackbar('Etkinlik silinirken hata oluştu!', '#e74c3c');
    }
  }
  window.addAnnouncement = async function(announcementData) {
    try {
      const response = await fetchWithAuth('/projeodevi/api/events/createAnnouncement.php', {
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
        showSnackbar(data.message || 'Duyuru eklenemedi!', '#e74c3c');
      }
    } catch (error) {
      console.log(error)
      showSnackbar('Duyuru eklenirken bir hata oluştu!', '#e74c3c');
    }
  };
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.onclick = () => {
      animateButton(logoutBtn);
      window.logout();
    };
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

  // Event Update Modal Functions
  const updateEventModal = document.getElementById('updateEventModal');
  const closeModalBtn = document.querySelector('.close-modal');
  const updateEventForm = document.getElementById('updateEventForm');

  // Close modal when clicking the X button
  if (closeModalBtn) {
    closeModalBtn.addEventListener('click', () => {
      updateEventModal.style.display = 'none';
    });
  }

  // Close modal when clicking outside the modal content
  window.addEventListener('click', (event) => {
    if (event.target === updateEventModal) {
      updateEventModal.style.display = 'none';
    }
  });

  // Function to open the update modal and populate it with event data
  window.openUpdateEventModal = async function(eventId) {
    try {
      // Fetch event data
      const response = await fetchWithAuth(`/projeodevi/api/events/getEvents.php?id=${eventId}`);
      if (!response.ok) throw new Error('Etkinlik bilgileri alınamadı');

      const data = await response.json();
      const event = data.events;

      if (!event) {
        showSnackbar('Etkinlik bulunamadı', '#e74c3c');
        return;
      }

      // Format date for datetime-local input
      const eventDate = new Date(event.date);
      const formattedDate = eventDate.toISOString().slice(0, 16);

      // Populate form fields
      document.getElementById('updateEventId').value = event.id;
      document.getElementById('updateEventTitle').value = event.title;
      document.getElementById('updateEventDescription').value = event.description;
      document.getElementById('updateEventDate').value = formattedDate;
      document.getElementById('updateEventType').value = event.category_id || '';
      document.getElementById('updateEventLocation').value = event.location || '';
      document.getElementById('updateEventCapacity').value = event.capacity;
      document.getElementById('updateEventPrice').value = event.price;

      // Show the modal
      updateEventModal.style.display = 'block';

      // Check weather for the event date and location
      const date = document.getElementById('updateEventDate').value;
      const location = event.location || '';
      if (date && location) {
        checkWeather(date, location, document.getElementById('updateWeatherInfo'));
      }
    } catch (error) {
      console.error('Error fetching event details:', error);
      showSnackbar('Etkinlik bilgileri alınamadı', '#e74c3c');
    }
  };

  // Setup weather check for update form
  const updateEventDateInput = document.getElementById('updateEventDate');
  const updateEventLocationInput = document.getElementById('updateEventLocation');
  const updateWeatherInfoElement = document.getElementById('updateWeatherInfo');

  if (updateEventDateInput && updateEventLocationInput) {
    // Check weather when date or location changes in update form
    const checkUpdateWeather = () => {
      const date = updateEventDateInput.value;
      const location = updateEventLocationInput.value;

      if (date && location) {
        checkWeather(date, location, updateWeatherInfoElement);
      } else {
        updateWeatherInfoElement.innerHTML = '';
        updateWeatherInfoElement.className = 'weather-info';
      }
    };

    updateEventDateInput.addEventListener('change', checkUpdateWeather);
    updateEventLocationInput.addEventListener('change', checkUpdateWeather);
    updateEventLocationInput.addEventListener('blur', checkUpdateWeather);
  }

  // Handle form submission
  if (updateEventForm) {
    updateEventForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const date = updateEventDateInput.value;
      const location = updateEventLocationInput.value;

      // Check weather before submitting update
      if (date && location) {
        const isWeatherOk = await checkWeather(date, location, updateWeatherInfoElement);

        if (!isWeatherOk) {
          const confirmUpdate = confirm('Seçilen tarihte olumsuz hava koşulları bekleniyor. Yine de etkinliği güncellemek istiyor musunuz?');
          if (!confirmUpdate) {
            return;
          }
        }
      }

      const eventData = {
        id: document.getElementById('updateEventId').value,
        title: document.getElementById('updateEventTitle').value,
        description: document.getElementById('updateEventDescription').value,
        date: new Date(updateEventDateInput.value).toISOString(),
        location: updateEventLocationInput.value,
        category_id: document.getElementById('updateEventType').value,
        capacity: parseInt(document.getElementById('updateEventCapacity').value),
        price: parseFloat(document.getElementById('updateEventPrice').value)
      };

      animateButton(updateEventForm.querySelector('button'));
      await window.updateEvent(eventData);
    });
  }

  // Function to update event
  window.updateEvent = async function(eventData) {
    try {
      const response = await fetchWithAuth('/projeodevi/api/events/updateEvent.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventData)
      });

      const data = await response.json();

      if (response.ok) {
        showSnackbar('Etkinlik başarıyla güncellendi!', '#27ae60');
        updateEventModal.style.display = 'none';
        loadAdminEvents(); // Refresh the events list
      } else {
        showSnackbar(data.message || 'Etkinlik güncellenemedi!', '#e74c3c');
      }
    } catch (error) {
      console.error('Error updating event:', error);
      showSnackbar('Etkinlik güncellenirken bir hata oluştu!', '#e74c3c');
    }
  };
})
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
}
function getToken() {
  const token = localStorage.getItem('token');
  if (!token) {
    console.warn('Token bulunamadı!');
    return null;
  }
  return token;
}
