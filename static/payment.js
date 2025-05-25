document.addEventListener('DOMContentLoaded', function() {
    // Get elements
    const paymentForm = document.getElementById('paymentForm');
    const paymentTypeSelect = document.getElementById('paymentType');
    const creditCardFields = document.getElementById('creditCardFields');
    const bankTransferFields = document.getElementById('bankTransferFields');
    const logoutBtn = document.getElementById('logout-btn');
    const cardNumberInput = document.getElementById('cardNumber');
    const cardExpiryInput = document.getElementById('cardExpiry');
    const cardCVCInput = document.getElementById('cardCVC');

    // Initialize the page
    initPage();

    // Event listeners
    if (paymentTypeSelect) {
        paymentTypeSelect.addEventListener('change', togglePaymentFields);
    }

    if (paymentForm) {
        paymentForm.addEventListener('submit', handlePaymentSubmit);
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }

    if (cardNumberInput) {
        cardNumberInput.addEventListener('input', formatCardNumber);
    }

    if (cardExpiryInput) {
        cardExpiryInput.addEventListener('input', formatCardExpiry);
    }

    if (cardCVCInput) {
        cardCVCInput.addEventListener('input', validateNumericInput);
    }

    // Functions
    function initPage() {
        // Load cart data from URL parameters
        loadCartFromUrl();

        // Set default payment method
        if (paymentTypeSelect) {
            togglePaymentFields({ target: paymentTypeSelect });
        }
    }

    function loadCartFromUrl() {
        const urlParams = new URLSearchParams(window.location.search);
        const cartParam = urlParams.get('cart');

        if (!cartParam) {
            showSnackbar('Sepet bilgisi bulunamadı!', '#e74c3c');
            return;
        }

        try {
            const cart = JSON.parse(cartParam);
            if (!cart.length) {
                showSnackbar('Sepetiniz boş!', '#e74c3c');
                return;
            }

            // Fetch cart items details
            fetchCartItems(cart);
        } catch (error) {
            console.error('Cart data parsing error:', error);
            showSnackbar('Sepet bilgisi yüklenirken bir hata oluştu!', '#e74c3c');
        }
    }

    async function fetchCartItems(cartIds) {
        const cartItemsElement = document.getElementById('cartItems');
        const cartTotalElement = document.getElementById('cartTotal');

        if (!cartItemsElement || !cartTotalElement) return;

        try {
            const token = getToken();
            if (!token) {
                showSnackbar('Oturum bilgisi bulunamadı!', '#e74c3c');
                setTimeout(() => {
                    window.location.href = '/projeodevi/templates/index.html';
                }, 2000);
                return;
            }

            cartItemsElement.innerHTML = '<p>Sepet yükleniyor...</p>';

            const eventsInCart = [];
            for (const eventId of cartIds) {
                const response = await fetchWithAuth(`/projeodevi/api/events/getEvents.php?id=${eventId}`);
                if (response.ok) {
                    const event = await response.json();
                    eventsInCart.push(event);
                } else {
                    console.error(`Etkinlik detayı çekilirken hata: ${eventId}`);
                }
            }

            if (eventsInCart.length === 0) {
                cartItemsElement.innerHTML = '<p>Sepetinizde ürün bulunamadı.</p>';
                cartTotalElement.innerHTML = '';
                return;
            }

            cartItemsElement.innerHTML = eventsInCart.map(item => `
                <div class="cart-item">
                    <span>${item.events.title}</span>
                    <span>${item.events.price} TL</span>
                </div>
            `).join('');

            const total = eventsInCart.reduce((sum, item) => sum + Number(item.events.price), 0);
            cartTotalElement.innerHTML = `Toplam: ${total} TL`;

        } catch (error) {
            console.error('Cart loading error:', error);
            cartItemsElement.innerHTML = '<p>Sepet bilgileri yüklenemedi.</p>';
            cartTotalElement.innerHTML = '';
        }
    }

    function togglePaymentFields(event) {
        const paymentType = event.target.value;

        if (paymentType === 'credit-card') {
            creditCardFields.style.display = 'block';
            bankTransferFields.style.display = 'none';
        } else {
            creditCardFields.style.display = 'none';
            bankTransferFields.style.display = 'block';
        }
    }

    function handlePaymentSubmit(event) {
        event.preventDefault();

        const paymentType = paymentTypeSelect.value;

        if (paymentType === 'credit-card') {
            if (!validateCreditCardFields()) {
                return;
            }
        }

        // Process payment
        processPayment(paymentType);
    }

    function validateCreditCardFields() {
        const cardNumber = cardNumberInput.value.replace(/\s/g, '');
        const cardName = document.getElementById('cardName').value;
        const cardExpiry = cardExpiryInput.value;
        const cardCVC = cardCVCInput.value;

        if (cardNumber.length < 16) {
            showSnackbar('Geçerli bir kart numarası giriniz!', '#e74c3c');
            return false;
        }

        if (!cardName.trim()) {
            showSnackbar('Kart üzerindeki ismi giriniz!', '#e74c3c');
            return false;
        }

        if (!cardExpiry.match(/^\d{2}\/\d{2}$/)) {
            showSnackbar('Geçerli bir son kullanma tarihi giriniz (AA/YY)!', '#e74c3c');
            return false;
        }

        if (cardCVC.length < 3) {
            showSnackbar('Geçerli bir CVC kodu giriniz!', '#e74c3c');
            return false;
        }

        return true;
    }

    async function processPayment(paymentType) {
        // Get cart data from URL
        const urlParams = new URLSearchParams(window.location.search);
        const cartParam = urlParams.get('cart');
        const cart = cartParam ? JSON.parse(cartParam) : [];

        if (!cart.length) {
            showSnackbar('Sepetiniz boş!', '#e74c3c');
            return;
        }

        // Show processing message
        showSnackbar('Ödeme işleniyor...', '#2d6cdf');

        try {
            // Prepare payment data
            const paymentData = {
                payment_type: paymentType,
                cart: cart
            };

            // Add credit card details if payment type is credit card
            if (paymentType === 'credit-card') {
                paymentData.card = {
                    number: document.getElementById('cardNumber').value.replace(/\s/g, ''),
                    name: document.getElementById('cardName').value,
                    expiry: document.getElementById('cardExpiry').value,
                    cvc: document.getElementById('cardCVC').value
                };
            }

            // Send payment data to server
            const response = await fetchWithAuth('/projeodevi/api/events/createTicket.php', {
                method: 'POST',
                body: JSON.stringify(paymentData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Ödeme işlenirken bir hata oluştu');
            }

            const result = await response.json();

            // Clear cart from localStorage
            localStorage.removeItem('cart');

            // Show success message
            showSnackbar('Ödeme başarıyla tamamlandı! Biletleriniz oluşturuldu.', '#27ae60');

            // Redirect to user panel after a delay
            setTimeout(() => {
                window.location.href = '/projeodevi/templates/user-panel.html';
            }, 2000);

        } catch (error) {
            console.error('Payment processing error:', error);
            showSnackbar('Ödeme işlenirken bir hata oluştu: ' + error.message, '#e74c3c');
        }
    }

    function handleLogout() {
        // Clear token and cart
        localStorage.removeItem('token');
        localStorage.removeItem('userType');
        localStorage.removeItem('cart');

        // Redirect to login page
        window.location.href = '/projeodevi/templates/index.html';
    }

    // Helper functions
    function formatCardNumber(event) {
        let value = event.target.value.replace(/\D/g, '');
        value = value.replace(/(.{4})/g, '$1 ').trim();
        event.target.value = value;
    }

    function formatCardExpiry(event) {
        let value = event.target.value.replace(/\D/g, '');

        if (value.length > 2) {
            value = value.substring(0, 2) + '/' + value.substring(2, 4);
        }

        event.target.value = value;
    }

    function validateNumericInput(event) {
        event.target.value = event.target.value.replace(/\D/g, '');
    }

    function showSnackbar(message, color = '#323232') {
        const snackbar = document.getElementById('snackbar');
        if (snackbar) {
            snackbar.textContent = message;
            snackbar.style.backgroundColor = color;
            snackbar.className = 'show';
            setTimeout(() => {
                snackbar.className = snackbar.className.replace('show', '');
            }, 3000);
        } else {
            console.log(message);
        }
    }

    function getToken() {
        return localStorage.getItem('token');
    }

    async function fetchWithAuth(url, options = {}) {
        const token = getToken();
        if (!token) {
            console.error('Token bulunamadı, istek yapılamıyor!');
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
                handleLogout();
                return;
            }
            return response;
        } catch (error) {
            console.error('API isteği başarısız:', error);
            throw error;
        }
    }
});
