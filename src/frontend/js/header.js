// Header functionality and navigation
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
            this.updateHeaderUI();
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
            // User menu dropdown
            const userMenuBtn = document.getElementById('user-menu-btn');
            const userMenuDropdown = document.getElementById('user-menu-dropdown');
            
            if (userMenuBtn && userMenuDropdown) {
                userMenuBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    userMenuDropdown.classList.toggle('show');
                });

                // Close dropdown when clicking outside
                document.addEventListener('click', () => {
                    userMenuDropdown.classList.remove('show');
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
                        FrontendUtils.showError('Nessuna location disponibile');
                    } else {
                        alert('Nessuna location disponibile');
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
                        FrontendUtils.showError(`Nessuna location trovata per "${trimmedQuery}"`);
                    } else {
                        alert(`Nessuna location trovata per "${trimmedQuery}"`);
                    }
                }
                
            } catch (error) {
                console.error('Search error:', error);
                if (window.FrontendUtils) {
                    FrontendUtils.showError('Errore nella ricerca');
                } else {
                    alert('Errore nella ricerca');
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
                if (protectedPages.includes(page) && window.authService && !window.authService.isAuthenticated()) {
                    window.location.href = 'login.html';
                    return;
                }
                
                // Check admin role for admin page
                if (page === 'admin' && window.authService && !window.authService.isAdmin()) {
                    if (window.FrontendUtils) {
                        FrontendUtils.showError('Accesso non autorizzato');
                    } else {
                        alert('Accesso non autorizzato');
                    }
                    return;
                }
                
                window.location.href = routes[page];
            }
        }

        updateHeaderUI() {
            const isAuthenticated = window.authService ? window.authService.isAuthenticated() : false;
            const user = window.authService ? window.authService.getUser() : null;

            // Show/hide authentication elements
            const authElements = document.querySelectorAll('[data-auth="true"]');
            const noAuthElements = document.querySelectorAll('[data-auth="false"]');
            
            authElements.forEach(el => {
                el.style.display = isAuthenticated ? 'flex' : 'none';
            });
            
            noAuthElements.forEach(el => {
                el.style.display = isAuthenticated ? 'none' : 'flex';
            });

            // Update user information
            if (isAuthenticated && user) {
                const userNameElement = document.getElementById('user-name');
                const userEmailElement = document.getElementById('user-email');
                const userAvatarElement = document.getElementById('user-avatar');
                
                if (userNameElement) {
                    userNameElement.textContent = `${user.name} ${user.surname}`;
                }
                
                if (userEmailElement) {
                    userEmailElement.textContent = user.email;
                }
                
                if (userAvatarElement) {
                    // Set user initials as avatar
                    const initials = `${user.name[0]}${user.surname[0]}`.toUpperCase();
                    userAvatarElement.textContent = initials;
                }

                // Show admin menu if user is admin
                const adminMenuItems = document.querySelectorAll('[data-role="admin"]');
                adminMenuItems.forEach(item => {
                    item.style.display = (window.authService && window.authService.isAdmin()) ? 'block' : 'none';
                });
            }
        }
    }

    // Mobile menu functionality
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

            // Close menu when clicking on links
            const mobileNavLinks = mobileMenu?.querySelectorAll('a');
            mobileNavLinks?.forEach(link => {
                link.addEventListener('click', () => {
                    mobileMenu.classList.remove('show');
                    document.body.style.overflow = 'auto';
                });
            });
        }
    }

    // Expose to global scope
    window.HeaderService = HeaderService;
    window.MobileMenuService = MobileMenuService;

    // Initialize header services when DOM is loaded
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
        // Handle search results from session storage
        const searchResults = sessionStorage.getItem('searchResults');
        if (searchResults && window.location.pathname.includes('home')) {
            const locations = JSON.parse(searchResults);
            sessionStorage.removeItem('searchResults');
            
            // Wait for grid.js to load then display results
            setTimeout(() => {
                if (typeof renderGrid === 'function') {
                    renderGrid(locations);
                }
            }, 100);
        }
    }

    // Initialize immediately
    initializeHeader();

})();