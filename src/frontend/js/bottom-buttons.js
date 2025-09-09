// Bottom Buttons Functionality - Sorting and Filtering
(function() {
    'use strict';

    let currentLocations = []; // Store per le locations correnti
    let currentSortOrder = 'asc'; // 'asc' o 'desc'
    let availableSpaceTypes = new Set(); // Set per i tipi di spazio disponibili
    let activeFilters = new Set(['all']); // Filtri attivi
    let currentSearchQuery = ''; // Query di ricerca corrente

    // Funzione principale per caricare le locations con le impostazioni correnti
    async function loadLocationsWithCurrentSettings() {
        try {
            if (!window.apiService) {
                console.error('ApiService not available');
                return;
            }

            let locations = [];

            // Ottieni sempre le locations ordinate
            console.log(`Loading locations with sort order: ${currentSortOrder}`);
            locations = await window.apiService.getLocationsAlphabetical(currentSortOrder);
            
            console.log(`Loaded ${locations.length} locations from API`);

            // Se c'è una ricerca attiva, applica il filtro di ricerca
            if (currentSearchQuery.trim()) {
                console.log('Applying search filter:', currentSearchQuery);
                locations = applySearchFilter(locations, currentSearchQuery);
                console.log(`After search filtering: ${locations.length} locations remaining`);
            }

            // Se ci sono filtri specifici per tipo di spazio, applica filtro lato client  
            if (!activeFilters.has('all') && activeFilters.size > 0) {
                console.log('Applying client-side filters:', Array.from(activeFilters));
                locations = filterLocationsByType(locations);
                console.log(`After filtering: ${locations.length} locations remaining`);
            }

            currentLocations = locations;
            
            // Renderizza la griglia
            if (window.renderGrid) {
                window.isFiltering = true; // Flag per evitare loop
                window.renderGrid(locations);
                window.isFiltering = false;
            }

        } catch (error) {
            console.error('Error loading locations with current settings:', error);
            
            // Fallback: prova a caricare con il metodo standard
            try {
                if (window.getAllLocations) {
                    console.log('Fallback to standard loading method');
                    let locations = await window.getAllLocations();
                    
                    // Applica ordinamento lato client come fallback
                    locations = sortLocationsByName(locations, currentSortOrder);
                    
                    // Applica filtri se necessario
                    if (!activeFilters.has('all') && activeFilters.size > 0) {
                        locations = filterLocationsByType(locations);
                    }
                    
                    currentLocations = locations;
                    
                    if (window.renderGrid) {
                        window.isFiltering = true;
                        window.renderGrid(locations);
                        window.isFiltering = false;
                    }
                }
            } catch (fallbackError) {
                console.error('Fallback also failed:', fallbackError);
                
                // Ultimo fallback: mostra messaggio di errore
                const gridContainer = document.querySelector('.grid-container');
                if (gridContainer) {
                    gridContainer.innerHTML = '<div class="error">Errore nel caricamento delle locations</div>';
                }
            }
        }
    }

    // Funzione per inizializzare i bottom buttons
    function initializeBottomButtons() {
        const sortingButton = document.querySelector('.sorting-button');
        const filterButton = document.querySelector('.filter-button');
        
        if (sortingButton) {
            sortingButton.addEventListener('click', handleSortingClick);
        }
        
        if (filterButton) {
            filterButton.addEventListener('click', handleFilterClick);
        }

        // Initialize filter menu handlers
        initializeFilterMenu();
    }

    // Gestisce il click sul pulsante di ordinamento
    async function handleSortingClick() {
        // Cattura la query di ricerca corrente prima di ordinare
        currentSearchQuery = getCurrentSearchQuery();
        
        // Cambia l'ordine
        currentSortOrder = currentSortOrder === 'asc' ? 'desc' : 'asc';
        
        // Aggiorna l'icona
        updateSortingIcon();
        
        // Ricarica le locations con il nuovo ordinamento
        await loadLocationsWithCurrentSettings();
        
        console.log(`Ordinamento cambiato a: ${currentSortOrder}`);
    }

    // Aggiorna l'icona del pulsante di ordinamento
    function updateSortingIcon() {
        const sortingButton = document.querySelector('.sorting-button .material-symbols-outlined');
        if (sortingButton) {
            sortingButton.textContent = 'sort_by_alpha';
            
            if (currentSortOrder === 'asc') {
                // Ordine crescente: icona normale
                sortingButton.style.transform = 'scaleY(1)';
            } else {
                // Ordine decrescente: icona ruotata
                sortingButton.style.transform = 'scaleY(-1)';
            }
        }
    }

    // Ordina le locations per nome
    function sortLocationsByName(locations, order = 'asc') {
        return [...locations].sort((a, b) => {
            const nameA = (a.location_name || a.name || '').toLowerCase();
            const nameB = (b.location_name || b.name || '').toLowerCase();
            
            if (order === 'asc') {
                return nameA.localeCompare(nameB);
            } else {
                return nameB.localeCompare(nameA);
            }
        });
    }

    // Gestisce il click sul pulsante di filtro
    function handleFilterClick() {
        showFilterMenu();
    }

    // Mostra il menu di filtro
    function showFilterMenu() {
        // Crea overlay
        const overlay = document.createElement('div');
        overlay.className = 'filter-overlay';
        overlay.addEventListener('click', hideFilterMenu);
        document.body.appendChild(overlay);

        // Mostra il menu
        const filterMenu = document.getElementById('filter-menu');
        if (filterMenu) {
            // Popola i tipi di spazio disponibili
            populateSpaceTypeFilters();
            filterMenu.style.display = 'block';
        }
    }

    // Nasconde il menu di filtro
    function hideFilterMenu() {
        const overlay = document.querySelector('.filter-overlay');
        if (overlay) {
            overlay.remove();
        }

        const filterMenu = document.getElementById('filter-menu');
        if (filterMenu) {
            filterMenu.style.display = 'none';
        }
    }

    // Popola i filtri per tipo di spazio
    async function populateSpaceTypeFilters() {
        const container = document.getElementById('space-type-filters');
        if (!container) return;

        try {
            // Ottieni tutti i tipi di spazio dal backend
            if (!window.apiService) {
                console.error('ApiService not available');
                return;
            }

            const spaceTypes = await window.apiService.getAllSpaceTypes();
            availableSpaceTypes.clear();
            
            // Aggiungi i tipi di spazio dal backend
            spaceTypes.forEach(type => {
                const typeName = type.name || type.type_name || 'Tipo sconosciuto';
                if (typeName !== 'Tipo sconosciuto') {
                    availableSpaceTypes.add(typeName);
                }
            });

            // Se non ci sono tipi, aggiungi un tipo generico
            if (availableSpaceTypes.size === 0) {
                availableSpaceTypes.add('Spazio generico');
            }

            // Genera le opzioni di filtro
            container.innerHTML = '';
            availableSpaceTypes.forEach(spaceType => {
                const label = document.createElement('label');
                label.className = 'filter-option';
                
                // Seleziona il checkbox solo se è specificamente nei filtri attivi
                // NON selezionare se 'all' è attivo (perché significa che vogliamo tutti i tipi ma visivamente solo 'all' selezionato)
                const isChecked = activeFilters.has(spaceType) && !activeFilters.has('all');
                
                label.innerHTML = `
                    <input type="checkbox" value="${spaceType}" ${isChecked ? 'checked' : ''}>
                    <span class="checkmark"></span>
                    ${spaceType}
                `;
                
                container.appendChild(label);
            });
        } catch (error) {
            console.error('Error loading space types:', error);
            // Fallback ai tipi dalle locations correnti
            collectSpaceTypes();
            
            container.innerHTML = '';
            availableSpaceTypes.forEach(spaceType => {
                const label = document.createElement('label');
                label.className = 'filter-option';
                
                // Seleziona il checkbox solo se è specificamente nei filtri attivi
                // NON selezionare se 'all' è attivo
                const isChecked = activeFilters.has(spaceType) && !activeFilters.has('all');
                
                label.innerHTML = `
                    <input type="checkbox" value="${spaceType}" ${isChecked ? 'checked' : ''}>
                    <span class="checkmark"></span>
                    ${spaceType}
                `;
                
                container.appendChild(label);
            });
        }
        
        // Sincronizza lo stato del checkbox "all"
        syncAllCheckboxState();
    }
    
    // Sincronizza lo stato del checkbox "all" in base ai filtri attivi
    function syncAllCheckboxState() {
        const allCheckbox = document.querySelector('input[value="all"]');
        if (allCheckbox) {
            allCheckbox.checked = activeFilters.has('all');
        }
    }

    // Raccoglie tutti i tipi di spazio unici
    function collectSpaceTypes() {
        availableSpaceTypes.clear();
        
        currentLocations.forEach(location => {
            const spaceTypes = location.space_types || location.spaceTypes || [];
            
            if (Array.isArray(spaceTypes)) {
                spaceTypes.forEach(type => {
                    const typeName = type.name || type.type_name || type.typeName;
                    if (typeName && typeName !== 'Tipo sconosciuto') {
                        availableSpaceTypes.add(typeName);
                    }
                });
            }
        });

        // Se non ci sono tipi specifici, aggiungi tipi generici
        if (availableSpaceTypes.size === 0) {
            availableSpaceTypes.add('Spazio generico');
        }
    }

    // Inizializza i gestori del menu di filtro
    function initializeFilterMenu() {
        // Close button
        const closeButton = document.getElementById('close-filter');
        if (closeButton) {
            closeButton.addEventListener('click', hideFilterMenu);
        }

        // Apply filters button
        const applyButton = document.getElementById('apply-filters');
        if (applyButton) {
            applyButton.addEventListener('click', applyFilters);
        }

        // Clear filters button
        const clearButton = document.getElementById('clear-filters');
        if (clearButton) {
            clearButton.addEventListener('click', clearFilters);
        }

        // All types checkbox handler
        document.addEventListener('change', function(e) {
            if (e.target.type === 'checkbox' && e.target.value === 'all') {
                handleAllTypesToggle(e.target.checked);
            } else if (e.target.type === 'checkbox' && e.target.closest('#space-type-filters')) {
                // Se viene selezionato un checkbox specifico, deseleziona "all"
                const allCheckbox = document.querySelector('input[value="all"]');
                if (allCheckbox && allCheckbox.checked && e.target.checked) {
                    allCheckbox.checked = false;
                }
            }
        });
    }

    // Gestisce il toggle del checkbox "Tutti i tipi"
    function handleAllTypesToggle(isChecked) {
        if (isChecked) {
            // Se "all" è selezionato, deseleziona tutti gli altri checkbox specifici
            const specificCheckboxes = document.querySelectorAll('#space-type-filters input[type="checkbox"]:not([value="all"])');
            specificCheckboxes.forEach(checkbox => {
                checkbox.checked = false;
            });
        }
        // Se "all" viene deselezionato, non tocchiamo gli altri checkbox - l'utente sceglierà cosa selezionare
    }

    // Applica i filtri selezionati
    async function applyFilters() {
        // Raccogli i filtri selezionati
        const selectedFilters = new Set();
        const allCheckbox = document.querySelector('input[value="all"]');
        
        if (allCheckbox && allCheckbox.checked) {
            // Se "all" è selezionato, ignora tutti gli altri filtri
            selectedFilters.add('all');
        } else {
            // Solo se "all" NON è selezionato, considera i singoli filtri
            const typeCheckboxes = document.querySelectorAll('#space-type-filters input[type="checkbox"]:checked:not([value="all"])');
            typeCheckboxes.forEach(checkbox => {
                selectedFilters.add(checkbox.value);
            });
        }

        activeFilters = selectedFilters;
        
        // Ricarica le locations con i nuovi filtri
        await loadLocationsWithCurrentSettings();
        
        // Chiudi il menu
        hideFilterMenu();
        
        console.log('Filtri applicati:', Array.from(activeFilters));
    }

    // Cancella tutti i filtri
    async function clearFilters() {
        activeFilters = new Set(['all']);
        
        // Reset checkboxes - solo "all" deve essere selezionato
        const allCheckbox = document.querySelector('input[value="all"]');
        if (allCheckbox) {
            allCheckbox.checked = true;
        }
        
        // Deseleziona tutti gli altri checkbox specifici
        const typeCheckboxes = document.querySelectorAll('#space-type-filters input[type="checkbox"]:not([value="all"])');
        typeCheckboxes.forEach(checkbox => {
            checkbox.checked = false;
        });
        
        // Ricarica le locations senza filtri
        await loadLocationsWithCurrentSettings();
        
        console.log('Filtri cancellati');
    }

    // Filtra le locations per tipo di spazio
    function filterLocationsByType(locations) {
        if (activeFilters.has('all') || activeFilters.size === 0) {
            return locations; // Mostra tutte le locations
        }

        return locations.filter(location => {
            const spaceTypes = location.space_types || location.spaceTypes || [];
            
            if (!Array.isArray(spaceTypes) || spaceTypes.length === 0) {
                // Se non ha tipi definiti, controlla se è incluso "Spazio generico"
                return activeFilters.has('Spazio generico');
            }

            // Controlla se almeno uno dei tipi della location è nei filtri attivi
            return spaceTypes.some(type => {
                const typeName = (type.name || type.type_name || type.typeName || 'Spazio generico').trim();
                
                // Confronto diretto con i filtri attivi
                for (const activeFilter of activeFilters) {
                    if (activeFilter.trim() === typeName) {
                        return true;
                    }
                }
                return false;
            });
        });
    }

    // Intercetta il rendering della griglia per aggiornare lo store locale
    function interceptGridRendering() {
        // Override della funzione renderGrid originale
        const originalRenderGrid = window.renderGrid;
        if (originalRenderGrid) {
            window.renderGrid = function(locations) {
                // Aggiorna lo store locale se non stiamo già filtrando
                if (arguments.length > 0 && Array.isArray(locations)) {
                    // Solo se non proviene da un filtro (controllo se le locations sono già filtrate)
                    if (!window.isFiltering) {
                        currentLocations = [...locations];
                    }
                }
                
                // Chiama la funzione originale
                return originalRenderGrid.apply(this, arguments);
            };
        }
    }

    // Override della funzione displayLocations per integrare l'ordinamento
    function interceptDisplayLocations() {
        const originalDisplayLocations = window.displayLocations;
        if (originalDisplayLocations) {
            window.displayLocations = async function() {
                // Usa le impostazioni di sorting/filtering attuali invece del caricamento standard
                if (currentSortOrder !== 'asc' || !activeFilters.has('all')) {
                    await loadLocationsWithCurrentSettings();
                } else {
                    // Caricamento normale solo se non ci sono personalizzazioni
                    await originalDisplayLocations.apply(this, arguments);
                }
                
                return;
            };
        }
    }

    // Inizializzazione quando il DOM è pronto
    function initialize() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', function() {
                setTimeout(() => {
                    initializeBottomButtons();
                    interceptGridRendering();
                    interceptDisplayLocations();
                    updateSortingIcon(); // Imposta l'icona iniziale
                }, 200);
            });
        } else {
            setTimeout(() => {
                initializeBottomButtons();
                interceptGridRendering();
                interceptDisplayLocations();
                updateSortingIcon();
            }, 200);
        }
    }

    // Applica filtro di ricerca alle locations
    function applySearchFilter(locations, query) {
        if (!query || !query.trim()) {
            return locations;
        }

        const normalizedQuery = query.trim().toLowerCase();
        return locations.filter(location => {
            const locationName = (location.location_name || location.name || '').toLowerCase();
            const city = (location.city || '').toLowerCase();
            const address = (location.address || '').toLowerCase();
            
            return locationName.includes(normalizedQuery) ||
                   city.includes(normalizedQuery) ||
                   address.includes(normalizedQuery) ||
                   locationName.split(' ').some(word => word.includes(normalizedQuery)) ||
                   city.split(' ').some(word => word.includes(normalizedQuery));
        });
    }

    // Cattura la query di ricerca corrente dall'input
    function getCurrentSearchQuery() {
        const searchInput = document.getElementById('search-input');
        return searchInput ? searchInput.value.trim() : '';
    }

    // Aggiorna la query di ricerca corrente
    function updateSearchQuery(query) {
        currentSearchQuery = query || '';
    }

    // Avvia inizializzazione
    initialize();

    // Esporta funzioni utili
    window.bottomButtons = {
        sortLocationsByName,
        filterLocationsByType,
        getCurrentSortOrder: () => currentSortOrder,
        getActiveFilters: () => Array.from(activeFilters),
        updateSearchQuery: updateSearchQuery
    };

})();
