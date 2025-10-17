// --- Global Variables ---
const yearSelect = document.getElementById('year-select');
const tournamentList = document.getElementById('tournament-list'); // NEW: List container
const listYearSpan = document.getElementById('list-year'); // NEW: Span for the year in the title
const map = L.map('map').setView([39.8283, -98.5795], 4);
const markersLayer = L.layerGroup().addTo(map);
let allTournaments = [];

// --- Map Initialization ---
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(map);

// --- Functions ---

/**
 * RENAMED: This function now updates both the map and the tournament list.
 */
function updateUI(selectedYear) {
    // Clear previous markers and list items
    markersLayer.clearLayers();
    tournamentList.innerHTML = ''; // Clear the list

    // Update the title of the list
    listYearSpan.textContent = selectedYear;

    const filteredTournaments = allTournaments.filter(t => t.year === selectedYear);

    // If no tournaments are found for that year, display a message
    if (filteredTournaments.length === 0) {
        tournamentList.innerHTML = '<p>No tournaments found for this year.</p>';
    }

    filteredTournaments.forEach(tournament => {
        // Add marker to map
        if (tournament.latitude && tournament.longitude) {
            const marker = L.marker([tournament.latitude, tournament.longitude]);
            marker.bindPopup(`<strong>${tournament.name}</strong><br>${tournament.location}`);
            markersLayer.addLayer(marker);
        }

        // NEW: Add item to the text list
        const itemDiv = document.createElement('div');
        itemDiv.className = 'tournament-item';
        itemDiv.innerHTML = `
            <strong>${tournament.name}</strong>
            <p>${tournament.location}</p>
        `;
        tournamentList.appendChild(itemDiv);
    });
}

function populateYearSelector() {
    const years = [...new Set(allTournaments.map(t => t.year))]
        .filter(year => year)
        .sort();

    years.forEach(year => {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        yearSelect.appendChild(option);
    });

    const currentYear = new Date().getFullYear().toString();
    if (years.includes(currentYear)) {
        yearSelect.value = currentYear;
    }

    // When the selection changes, update the UI
    yearSelect.addEventListener('change', (event) => {
        updateUI(event.target.value);
    });
}

async function initializeApp() {
    try {
        const response = await fetch('assets/tournaments_with_coords.json');
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        allTournaments = await response.json();
        populateYearSelector();
        // Initial UI update for the default year
        updateUI(yearSelect.value);
    } catch (error) {
        console.error("Could not load tournament data:", error);
        tournamentList.innerHTML = `<p style="color: red;">Error: Could not load tournament data. Please check the console.</p>`;
    }
}

// --- Start the Application ---
initializeApp();