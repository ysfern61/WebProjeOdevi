// Button animation helper function
function animateButton(btn) {
  if (!btn) return;
  btn.classList.add('clicked');
  setTimeout(() => btn.classList.remove('clicked'), 200);
}

document.addEventListener('DOMContentLoaded', () => {
    // DOM element references
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const adminForm = document.getElementById('adminForm');
    const showLoginBtn = document.getElementById('showLoginBtn');
    const showRegisterBtn = document.getElementById('showRegisterBtn');
    const showAdminBtn = document.getElementById('showAdminBtn');
    const showLoginLink = document.getElementById('showLoginLink');
    const showRegisterLink = document.getElementById('showRegisterLink');
    const showMainLink = document.getElementById('showMainLink');
    const passwordChangeModal = document.getElementById('passwordChangeModal');
    const firstLoginPasswordForm = document.getElementById('firstLoginPasswordForm');

    // İlk giriş şifre değiştirme formu
    if (firstLoginPasswordForm) {
      firstLoginPasswordForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        // Şifre doğrulama
        if (newPassword.length < 6) {
          showSnackbar('Şifre en az 6 karakter olmalıdır!', '#e74c3c');
          return;
        }

        if (newPassword !== confirmPassword) {
          showSnackbar('Şifreler eşleşmiyor!', '#e74c3c');
          return;
        }

        try {
          // İlk giriş şifre değiştirme isteği
          const response = await fetchWithAuth('/projeodevi/api/userActions/updatePassword.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              newPassword,
              isFirstLogin: true
            })
          });

          const data = await response.json();

          if (response.ok) {
            showSnackbar('Şifreniz başarıyla güncellendi!', '#27ae60');
            passwordChangeModal.style.display = 'none';

            // Kullanıcı paneline yönlendir
            setTimeout(() => {
              window.location.href = '/projeodevi/templates/user-panel.html';
            }, 1500);
          } else {
            showSnackbar(data.message || 'Şifre güncellenemedi!', '#e74c3c');
          }
        } catch (err) {
          console.error('Şifre güncelleme hatası:', err);
          showSnackbar('Şifre güncellenirken bir hata oluştu!', '#e74c3c');
        }
      });
    }

    // Giriş formu
    if (loginForm) {
      loginForm.onsubmit = async (e) => {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        animateButton(loginForm.querySelector('button'));
        await loginUser(email, password);
      };
    }

    // Kayıt formu
    if (registerForm) {
      registerForm.onsubmit = async (e) => {
        e.preventDefault();
        const email = document.getElementById('registerEmail').value;
        const password = document.getElementById('registerPassword').value;
        animateButton(registerForm.querySelector('button'));
        await registerUser(email, password);
      };
    }

    // Admin giriş formu
    if (adminForm) {
      adminForm.onsubmit = async (e) => {
        e.preventDefault();
        const email = document.getElementById('adminEmail').value;
        const password = document.getElementById('adminPassword').value;
        animateButton(adminForm.querySelector('button'));
        await loginAdmin(email, password);
      };
    }

    // Form görünürlüğünü yönet
    function showForm(formId) {
      const forms = ['loginForm', 'registerForm', 'adminForm'];
      forms.forEach(id => {
        const form = document.getElementById(id);
        if (form) form.style.display = id === formId ? 'block' : 'none';
      });
    }

    // Tüm formları gizle
    function resetForms() {
      if (loginForm) loginForm.style.display = 'none';
      if (registerForm) registerForm.style.display = 'none';
      if (adminForm) adminForm.style.display = 'none';
    }

    // Form görünürlük butonları
    if (showLoginBtn) {
      showLoginBtn.addEventListener('click', () => {
        resetForms();
        if (loginForm) loginForm.style.display = 'block';
      });
    }

    if (showRegisterBtn) {
      showRegisterBtn.addEventListener('click', () => {
        resetForms();
        if (registerForm) registerForm.style.display = 'block';
      });
    }

    if (showAdminBtn) {
      showAdminBtn.addEventListener('click', () => {
        resetForms();
        if (adminForm) adminForm.style.display = 'block';
      });
    }

    if (showLoginLink) {
      showLoginLink.addEventListener('click', (e) => {
        e.preventDefault();
        resetForms();
        if (loginForm) loginForm.style.display = 'block';
      });
    }

    if (showRegisterLink) {
      showRegisterLink.addEventListener('click', (e) => {
        e.preventDefault();
        resetForms();
        if (registerForm) registerForm.style.display = 'block';
      });
    }

    if (showMainLink) {
      showMainLink.addEventListener('click', (e) => {
        e.preventDefault();
        resetForms();
      });
    }
});

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

function showSnackbar(message, color = '#323232') {
  const snackbar = document.getElementById('snackbar');
  if (!snackbar) return;
  snackbar.textContent = message;
  snackbar.style.background = color;
  snackbar.className = 'show';
  setTimeout(() => { snackbar.className = snackbar.className.replace('show', ''); }, 2500);
}

function showPasswordChangeModal() {
  const modal = document.getElementById('passwordChangeModal');
  if (!modal) return;

  modal.style.display = 'block';

  // Modalın dışına tıklandığında kapatma (ama bu durumda kapatmayacağız)
  // window.addEventListener('click', (event) => {
  //   if (event.target === modal) {
  //     modal.style.display = 'none';
  //   }
  // });
}

// API istekleri için yardımcı fonksiyon
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

// Kullanıcı kaydı
async function registerUser(email, password) {
  try {
    const response = await fetch('/projeodevi/api/auth/register.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
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
      throw new Error(data.message || 'Kayıt başarısız');
    }
  } catch (error) {
    console.error('Kayıt hatası:', error);
    showSnackbar(error.message || 'Kayıt yapılırken bir hata oluştu', '#e74c3c');
  }
}

// Kullanıcı girişi
async function loginUser(email, password) {
  try {
    const response = await fetch('/projeodevi/api/auth/login.php', {
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

      // İlk giriş kontrolü
      const isFirstLogin = data.user && data.user.is_first_login === 1;

      if (isFirstLogin && userType !== 'admin') {
        // İlk giriş ise şifre değiştirme modalını göster
        showPasswordChangeModal();
        return; // Yönlendirme yapma
      }

      // Kullanıcı tipine göre yönlendirme
      if (userType === 'admin') {
        window.location.href = '/projeodevi/templates/admin-panel.html';
      } else {
        window.location.href = '/projeodevi/templates/user-panel.html';
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
    const response = await fetch('/projeodevi/api/auth/login.php', {
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

      window.location.href = '/projeodevi/templates/admin-panel.html';
    } else {
      throw new Error(data.message || 'Admin girişi başarısız');
    }
  } catch (error) {
    console.error('Admin giriş hatası:', error);
    showSnackbar(error.message || 'Admin girişi yapılırken bir hata oluştu', '#e74c3c');
  }
}
