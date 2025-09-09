import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { showMessage } from "./main.js";

// Funzionalità dell'header e navigazione
(function() {
    'use strict';
    
    // Evita duplicazioni
    if (window.HeaderService) {
        console.warn('HeaderService already loaded');
        return;
    }

    class HeaderService {
        constructor() {
            this.initializeHeader();
        }

        initializeHeader() {
            this.setupNavigation();
            this.setupUserMenu();
            this.setupSearch();
            // NUOVO: Avvia l'ascoltatore di autenticazione di Firebase all'inizializzazione del servizio.
            this.setupAuthListener(); 
        }
        
        // NUOVO METODO: Gestisce l'ascoltatore di autenticazione di Firebase.
        // Questo listener è fondamentale perché reagisce a ogni cambiamento dello stato di login.
        setupAuthListener() {
            const auth = getAuth();
            onAuthStateChanged(auth, (user) => {
                // Chiama il metodo per aggiornare l'interfaccia utente in base allo stato di login.
                this.updateHeaderUI(user);
                
                // Opzionale: mostra un messaggio di benvenuto o di logout.
                if (user) {
                    showMessage(`Benvenuto, ${user.displayName || 'Utente'}!`, 'success');
                } else {
                    showMessage('Sei stato disconnesso con successo.', 'success');
                }
            });
        }

        setupNavigation() {
            // Logo click - redirect to home
            const logo = document.querySelector('.logo');
            if (logo) {
                logo.addEventListener('click', () => {
                    window.location.href = 'home.html';
                });
            }

            // Navigation links
            const navLinks = document.querySelectorAll('[data-nav]');
            navLinks.forEach(link => {
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    const page = link.dataset.nav;
                    this.navigateTo(page);
                });
            });
        }

        setupUserMenu() {
            // Riferimento agli elementi per gestire il menu utente
            const userIcon = document.getElementById('user-icon');
            const userDropdown = document.getElementById('user-dropdown');
            
            // LOGICA DEL MENU A TENDINA E DEL LOGOUT:
            // L'icona del profilo utente ora apre/chiude il menu a tendina.
            if (userIcon && userDropdown) {
                userIcon.addEventListener('click', (e) => {
                    e.stopPropagation(); // Impedisce che il click si propaghi al documento
                    userDropdown.style.display = userDropdown.style.display === 'block' ? 'none' : 'block';
                });

                // Chiudi il menu a tendina quando si clicca al di fuori di esso.
                document.addEventListener('click', (e) => {
                    if (e.target.closest('#user-profile') === null) {
                        userDropdown.style.display = 'none';
                    }
                });
            }

            // LOGICA DEL PULSANTE DI LOGOUT:
            // Aggiunto il gestore per il pulsante di logout
            const logoutBtn = document.getElementById('logout-button');
            if (logoutBtn) {
                logoutBtn.addEventListener('click', () => {
                    const auth = getAuth();
                    signOut(auth)
                        .catch((error) => {
                            showMessage(`Errore durante il logout: ${error.message}`, 'error');
                        });
                });
            }
            
            // Login/Signup buttons
            const loginBtn = document.getElementById('login-btn');
            const signupBtn = document.getElementById('signup-btn');
            
            if (loginBtn) {
                loginBtn.addEventListener('click', () => {
                    window.location.href = 'login.html';
                });
            }
            
            if (signupBtn) {
                signupBtn.addEventListener('click', () => {
                    window.location.href = 'signup.html';
                });
            }
        }

        setupSearch() {
            const searchInput = document.getElementById('search-input');
            const searchBtn = document.getElementById('search-btn');
            
            if (searchInput && searchBtn) {
                // Search button click
                searchBtn.addEventListener('click', () => {
                    this.performSearch(searchInput.value);
                });
                
                // Enter key in search input
                searchInput.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        this.performSearch(searchInput.value);
                    }
                });
            }
        }

        async performSearch(query) {
            const trimmedQuery = query.trim();
            
            try {
                console.log('Performing search for:', trimmedQuery || '(empty - showing all locations)');
                
                // Check if apiService is available
                if (!window.apiService) {
                    console.error('ApiService not available');
                    return;
                }
                
                // Get all locations
                const allLocations = await window.apiService.getAllLocations();
                console.log('Total locations retrieved:', allLocations.length);
                
                if (!Array.isArray(allLocations) || allLocations.length === 0) {
                    if (window.FrontendUtils) {
                        window.FrontendUtils.showError('Nessuna location disponibile');
                    } else {
                        // Utilizza showMessage al posto di alert
                        showMessage('Nessuna location disponibile', 'error');
                    }
                    return;
                }
                
                // If query is empty, show all locations
                if (!trimmedQuery) {
                    console.log('Empty search - displaying all locations');
                    this.displaySearchResults(allLocations);
                    return;
                }
                
                // Normalize query for better matching
                const normalizedQuery = trimmedQuery.toLowerCase();
                
                // Filter locations by multiple criteria
                const filteredLocations = allLocations.filter(location => {
                    // Get location name (handle both formats)
                    const locationName = (location.location_name || location.name || '').toLowerCase();
                    const city = (location.city || '').toLowerCase();
                    const address = (location.address || '').toLowerCase();
                    
                    // Check if query matches any field
                    return locationName.includes(normalizedQuery) ||
                           city.includes(normalizedQuery) ||
                           address.includes(normalizedQuery) ||
                           // Also check for word-based matching (e.g., "Milano Centro" can be found with "Centro")
                           locationName.split(' ').some(word => word.includes(normalizedQuery)) ||
                           city.split(' ').some(word => word.includes(normalizedQuery));
                });
                
                console.log('Filtered locations:', filteredLocations.length);
                
                if (filteredLocations.length > 0) {
                    this.displaySearchResults(filteredLocations);
                } else {
                    if (window.FrontendUtils) {
                        window.FrontendUtils.showError(`Nessuna location trovata per "${trimmedQuery}"`);
                    } else {
                         showMessage(`Nessuna location trovata per "${trimmedQuery}"`, 'error');
                    }
                }
                
            } catch (error) {
                console.error('Search error:', error);
                if (window.FrontendUtils) {
                    window.FrontendUtils.showError('Errore nella ricerca');
                } else {
                    showMessage('Errore nella ricerca', 'error');
                }
            }
        }

        displaySearchResults(locations) {
            // Se siamo nella pagina home, aggiorna la griglia
            if (window.location.pathname.includes('home') && typeof renderGrid === 'function') {
                renderGrid(locations);
            } else {
                // Redirect alla home con risultati
                sessionStorage.setItem('searchResults', JSON.stringify(locations));
                window.location.href = 'home.html';
            }
        }

        navigateTo(page) {
            const routes = {
                'home': 'home.html',
                'locations': 'locations.html',
                'bookings': 'bookings.html',
                'profile': 'profile.html',
                'admin': 'admin.html'
            };

            if (routes[page]) {
                // Check authentication for protected pages
                const protectedPages = ['bookings', 'profile', 'admin'];
                // La logica di reindirizzamento deve essere gestita da un listener globale per la pagina
                // e non direttamente qui per evitare conflitti.
                window.location.href = routes[page];
            }
        }

        // METODO AGGIUNTO: Aggiorna l'interfaccia utente in base allo stato di autenticazione.
        // A differenza del tuo codice originale, questo metodo è chiamato dal listener di Firebase
        // ogni volta che lo stato di login cambia, rendendolo più dinamico.
        updateHeaderUI(user) {
            // Riferimenti agli elementi HTML
            const authButtons = document.getElementById('auth-buttons');
            const userProfile = document.getElementById('user-profile');
            const userDropdown = document.getElementById('user-dropdown');
        
            if (user) {
                // L'utente è loggato: mostra l'icona e nasconde i pulsanti.
                authButtons.style.display = 'none';
                userProfile.style.display = 'flex';
                // Chiudi il dropdown quando l'utente si autentica
                userDropdown.style.display = 'none';
            } else {
                // L'utente non è loggato: mostra i pulsanti e nasconde l'icona.
                authButtons.style.display = 'flex';
                userProfile.style.display = 'none';
                // Chiudi il dropdown se non c'è un utente loggato
                userDropdown.style.display = 'none';
            }
        }
    }

    // Funzionalità del menu mobile
    class MobileMenuService {
        constructor() {
            this.initializeMobileMenu();
        }

        initializeMobileMenu() {
            const mobileMenuBtn = document.getElementById('mobile-menu-btn');
            const mobileMenu = document.getElementById('mobile-menu');
            const mobileMenuClose = document.getElementById('mobile-menu-close');

            if (mobileMenuBtn && mobileMenu) {
                mobileMenuBtn.addEventListener('click', () => {
                    mobileMenu.classList.add('show');
                    document.body.style.overflow = 'hidden';
                });
            }

            if (mobileMenuClose && mobileMenu) {
                mobileMenuClose.addEventListener('click', () => {
                    mobileMenu.classList.remove('show');
                    document.body.style.overflow = 'auto';
                });
            }

            // Chiude il menu quando si clicca sui link
            const mobileNavLinks = mobileMenu?.querySelectorAll('a');
            mobileNavLinks?.forEach(link => {
                link.addEventListener('click', () => {
                    mobileMenu.classList.remove('show');
                    document.body.style.overflow = 'auto';
                });
            });
        }
    }

    // Esponi al campo di applicazione globale
    window.HeaderService = HeaderService;
    window.MobileMenuService = MobileMenuService;

    // Inizializza i servizi dell'header quando il DOM è caricato
    function initializeHeader() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                new HeaderService();
                new MobileMenuService();
                handleSearchResults();
            });
        } else {
            new HeaderService();
            new MobileMenuService();
            handleSearchResults();
        }
    }

    function handleSearchResults() {
        // Gestisce i risultati di ricerca dalla session storage
        const searchResults = sessionStorage.getItem('searchResults');
        if (searchResults && window.location.pathname.includes('home')) {
            const locations = JSON.parse(searchResults);
            sessionStorage.removeItem('searchResults');
            
            // Attendi che grid.js sia caricato e poi visualizza i risultati
            setTimeout(() => {
                if (typeof renderGrid === 'function') {
                    renderGrid(locations);
                }
            }, 100);
        }
    }

    // Inizializza immediatamente
    initializeHeader();
})();
