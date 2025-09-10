// Authentication Service per gestire login, logout e autenticazione
class AuthService {
    constructor() {
        this.tokenKey = 'coworkspace_token';
        this.userKey = 'coworkspace_user';
    }

    // Salva token nel localStorage
    saveToken(token) {
        localStorage.setItem(this.tokenKey, token);
    }

    // Ottiene token dal localStorage
    getToken() {
        return localStorage.getItem(this.tokenKey);
    }

    // Rimuove token dal localStorage   
    removeToken() {
        localStorage.removeItem(this.tokenKey);
    }

    // Salva informazioni utente
    saveUser(user) {
        localStorage.setItem(this.userKey, JSON.stringify(user));
    }

    // Ottiene informazioni utente
    getUser() {
        const userString = localStorage.getItem(this.userKey);
        return userString ? JSON.parse(userString) : null;
    }

    // Rimuove informazioni utente
    removeUser() {
        localStorage.removeItem(this.userKey);
    }

    // Controlla se l'utente è autenticato
    isAuthenticated() {
        return !!this.getToken();
    }

    // Metodo centralizzato per redirect dopo login
    redirectAfterLogin() {
        setTimeout(() => {
            window.location.href = 'home.html';
        }, 1000);
    }

    // Login
    async login(email, password) {
        try {
            const response = await apiService.loginUser({ email, password });
            
            // Salva token e informazioni utente
            if (response.token) {
                this.saveToken(response.token);
                this.saveUser(response.user);
            }
            
            return response;
        } catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    }

    // Register
    async register(userData) {
        try {
            const response = await apiService.registerUser(userData);
            
            // Se il registro restituisce anche un token, salvalo
            if (response.token) {
                this.saveToken(response.token);
                this.saveUser(response.user);
            }
            
            return response;
        } catch (error) {
            console.error('Registration error:', error);
            throw error;
        }
    }

    // Logout
    logout() {
        this.removeToken();
        this.removeUser();
        // Redirect alla pagina di login - path relativo per compatibilità con entrambe le porte
        window.location.href = 'login.html';
    }

    // Ottieni header per richieste autenticate
    getAuthHeaders() {
        const token = this.getToken();
        return token ? { 'Authorization': `Bearer ${token}` } : {};
    }

    // Controlla il ruolo dell'utente
    hasRole(role) {
        const user = this.getUser();
        return user && user.role === role;
    }

    // Controlla se l'utente è admin
    isAdmin() {
        return this.hasRole('admin');
    }

    // Controlla se l'utente è manager
    isManager() {
        return this.hasRole('manager');
    }

    // Controlla se l'utente è un utente normale
    isUser() {
        return this.hasRole('user');
    }
}

// Crea istanza globale
const authService = new AuthService();

// Il login form è gestito da login.js

// Registration form handler
function handleRegistrationForm() {
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = new FormData(registerForm);
            const userData = Object.fromEntries(formData);
            
            // Validazione base
            if (!userData.email || !userData.password || !userData.name || !userData.surname) {
                FrontendUtils.showError('Tutti i campi sono richiesti');
                return;
            }
            
            if (userData.password !== userData.confirmPassword) {
                FrontendUtils.showError('Le password non corrispondono');
                return;
            }
            
            // Rimuovi il campo confirmPassword prima di inviare
            delete userData.confirmPassword;
            
            try {
                const response = await authService.register(userData);
                FrontendUtils.showSuccess('Registrazione effettuata con successo!');
                
                // Redirect al login o homepage
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 1000);
                
            } catch (error) {
                FrontendUtils.showError('Errore nella registrazione: ' + error.message);
            }
        });
    }
}

// Logout button handler
function handleLogoutButton() {
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (confirm('Sei sicuro di voler effettuare il logout?')) {
                authService.logout();
            }
        });
    }
}

// Controlla autenticazione su pagine protette
function checkAuthentication() {
    const protectedPages = ['dashboard.html', 'profile.html', 'bookings.html'];
    const currentPage = window.location.pathname;
    
    if (protectedPages.some(page => currentPage.includes(page)) && !authService.isAuthenticated()) {
        window.location.href = 'login.html';
    }
}

// Update UI basato sullo stato di autenticazione
function updateAuthUI() {
    const user = authService.getUser();
    const isAuth = authService.isAuthenticated();
    
    // Mostra/nascondi elementi basati sull'autenticazione
    const authElements = document.querySelectorAll('[data-auth="true"]');
    const noAuthElements = document.querySelectorAll('[data-auth="false"]');
    
    authElements.forEach(el => {
        el.style.display = isAuth ? 'block' : 'none';
    });
    
    noAuthElements.forEach(el => {
        el.style.display = isAuth ? 'none' : 'block';
    });
    
    // Update user info
    if (user) {
        const userNameElements = document.querySelectorAll('[data-user="name"]');
        const userEmailElements = document.querySelectorAll('[data-user="email"]');
        
        userNameElements.forEach(el => {
            el.textContent = `${user.name} ${user.surname}`;
        });
        
        userEmailElements.forEach(el => {
            el.textContent = user.email;
        });
    }
}

// Inizializzazione autenticazione quando DOM è pronto
document.addEventListener('DOMContentLoaded', () => {
    checkAuthentication();
    updateAuthUI();
    handleRegistrationForm();
    handleLogoutButton();
});
