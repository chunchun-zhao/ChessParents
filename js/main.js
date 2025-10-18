document.addEventListener("DOMContentLoaded", function() {

    // --- 1. GLOBALS & INITIALIZATION ---

    let allTournaments = [];
    let tournamentMarkers = L.layerGroup();
    let locationMarker = null;
    
    // --- NEW: Store the center of our location search
    let currentSearchLocation = null; // Will be an L.latLng object
    const searchRadiusMeters = 48280; // ~30 miles

    // --- NEW: Define a custom red icon for the location search
    const redIcon = new L.Icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
    });
    // --- NEW: Define the custom CHESS PAWN icon for tournaments ---
    // This is a self-contained SVG of a chess pawn, colored with your header's blue
    const pawnIconUrl = "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 320 512'><path fill='%23053a5f' d='M208 416H112c-8.8 0-16 7.2-16 16v32c0 8.8 7.2 16 16 16h96c8.8 0 16-7.2 16-16v-32c0-8.8-7.2-16-16-16zM160 0C107 0 64 43 64 96v16c-35.3 0-64 28.7-64 64v32c0 8.8 7.2 16 16 16h288c8.8 0 16-7.2 16-16v-32c0-35.3-28.7-64-64-64v-16C256 43 213 0 160 0zM128 224h64c8.8 0 16 7.2 16 16v128H112v-128c0-8.8 7.2-16 16-16z'/></svg>";

    const tournamentIcon = new L.Icon({
        iconUrl: pawnIconUrl,
        iconSize: [25, 40],     // A good size, similar to the red pin
        iconAnchor: [12, 40],   // Point of the icon (bottom center)
        popupAnchor: [0, -40],  // Popup relative to the anchor
        // We add a shadow to make it look "real"
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        shadowSize: [41, 41]
    });

    // Set default map view
    const defaultCenter = [39.82, -98.57];
    const defaultZoom = 4;
    const map = L.map('map').setView(defaultCenter, defaultZoom);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    tournamentMarkers.addTo(map);

    // Get DOM elements
    const yearSelect = document.getElementById('year-select');
    const locationInput = document.getElementById('location-input');
    const locationButton = document.getElementById('location-button');
    const tournamentListElement = document.getElementById('tournament-list');

    // --- 2. DATA LOADING & INITIAL DRAW ---

    const currentYear = new Date().getFullYear();
    yearSelect.value = currentYear;

    fetch('assets/tournaments_with_coords.json')
        .then(response => response.json())
        .then(data => {
            allTournaments = data;
            drawTournaments(currentYear.toString());
        })
        .catch(error => {
            console.error("Error loading tournament data:", error);
            alert("Could not load tournament data from assets/tournaments_with_coords.json");
        });

    // --- 3. FILTER FUNCTIONS ---

    /**
     * [CORE LOGIC]
     * This function now filters by YEAR and, if a location is set,
     * it ALSO filters by proximity (30-mile range).
     */
    function drawTournaments(selectedYearString) {
        tournamentMarkers.clearLayers();
        tournamentListElement.innerHTML = "";

        // 1. Filter by Year
        let filteredTournaments = allTournaments.filter(t => t.year && t.year === selectedYearString);

        // 2. --- NEW: If a location search is active, filter by distance
        if (currentSearchLocation) {
            filteredTournaments = filteredTournaments.filter(t => {
                if (!t.latitude || !t.longitude) return false;
                
                const tournamentLocation = L.latLng(t.latitude, t.longitude);
                const distance = tournamentLocation.distanceTo(currentSearchLocation); // Distance in meters
                
                return distance <= searchRadiusMeters;
            });
        }
        
        // 3. Build the list and pins from the final filtered list
        let listHtml = "";
        filteredTournaments.forEach(t => {
            if (t.latitude && t.longitude) {
                // Add default (blue) pin to map// Add new triangle pin to map
                L.circleMarker([t.latitude, t.longitude], {
                    radius: 7,
                    color: '#053a5f',      // The blue outline
                    weight: 2,             // Outline thickness
                    fillColor: '#053a5f',  // The blue fill
                    fillOpacity: 0.8
                }).bindPopup(`<b>${t.name}</b><br>${t.location} (${t.year})`)
                .addTo(tournamentMarkers);
                
                // Add item to list
                listHtml += `
                    <div class="tournament-item">
                        <h4>${t.name}</h4>
                        <p>${t.location} (${t.year})</p>
                    </div>
                `;
            }
        });

        // 4. Display the new list
        if (listHtml === "") {
            listHtml = "<p style='padding: 20px;'>No tournaments found for this year or location.</p>";
        }
        tournamentListElement.innerHTML = listHtml;

        // 5. Reset map view *only if* no location search is active
        if (!currentSearchLocation) {
            map.setView(defaultCenter, defaultZoom);
        }
    }

    /**
     * [RIGHT FILTER - Location]
     * Zooms the map AND triggers the tournament re-filter.
     */
    function performLocationSearch() {
        const query = locationInput.value;

        // Clear old location marker
        if (locationMarker) map.removeLayer(locationMarker);
        
        // If the box is empty, reset the filter and redraw
        if (query === "") {
            currentSearchLocation = null; // Clear the location filter
            drawTournaments(yearSelect.value); // Redraw (will reset map)
            return; 
        }

        // Use Nominatim API to get coordinates
        const encodedQuery = encodeURIComponent(query);
        const apiUrl = `https://nominatim.openstreetmap.org/search?q=${encodedQuery}&format=json&limit=1&countrycodes=us`;

        fetch(apiUrl)
            .then(response => response.json())
            .then(data => {
                if (data.length === 0) throw new Error('Location not found');
                
                const result = data[0];
                const lat = parseFloat(result.lat);
                const lon = parseFloat(result.lon);
                
                // --- NEW: Set the global search location
                currentSearchLocation = L.latLng(lat, lon);
                
                // Set map view to the new location
                map.setView(currentSearchLocation, 9); // Zoom 9 is ~30-mile range

                // --- NEW: Add the RED location marker
                locationMarker = L.marker(currentSearchLocation, { icon: redIcon })
                    .addTo(map)
                    .bindPopup(`Search: ${query}`)
                    .openPopup();
                
                // --- REMOVED: No more circle
                
                // --- NEW: Redraw tournaments now that location is set
                drawTournaments(yearSelect.value);
            })
            .catch(error => {
                console.error(error);
                alert("Could not find that location. Please try again.");
            });
    }

    // --- 4. EVENT LISTENERS ---

    // Left Filter: When the year dropdown changes...
    yearSelect.addEventListener('change', (e) => {
        // This will automatically use the currentSearchLocation if it's set
        drawTournaments(e.target.value);
    });

    // Right Filter: When the location button is clicked...
    locationButton.addEventListener('click', performLocationSearch);

    // Right Filter: Allow pressing Enter to search
    locationInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            performLocationSearch();
        }
    });

});