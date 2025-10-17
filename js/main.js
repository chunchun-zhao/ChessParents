// --- Global Variables ---
const yearSelect = document.getElementById('year-select');
const tournamentList = document.getElementById('tournament-list');
const listYearSpan = document.getElementById('list-year');
const map = L.map('map').setView([39.8283, -98.5795], 4);
const markersLayer = L.layerGroup().addTo(map);
let allTournaments = [];

// --- Map Initialization ---
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(map);

// --- Functions ---

function updateUI(selectedYear) {
    markersLayer.clearLayers();
    tournamentList.innerHTML = '';
    listYearSpan.textContent = selectedYear;

    const filteredTournaments = allTournaments.filter(t => t.year === selectedYear);

    if (filteredTournaments.length === 0) {
        tournamentList.innerHTML = '<p>No tournaments found for this year.</p>';
    }

    filteredTournaments.forEach(tournament => {
        if (tournament.latitude && tournament.longitude) {
            const marker = L.marker([tournament.latitude, tournament.longitude]);
            marker.bindPopup(`<strong>${tournament.name}</strong><br>${tournament.location}`);
            markersLayer.addLayer(marker);
        }

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

    yearSelect.addEventListener('change', (event) => {
        updateUI(event.target.value);
    });
}

/**
 * Main function to load tournament data and initialize the application.
 * THIS FUNCTION IS REWRITTEN to use .then() for better compatibility.
 */
function initializeApp() {
    fetch('assets/tournaments_with_coords.json')
        .then(response => {
            if (!response.ok) {
                // If the server responded with an error, throw an error
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            // Otherwise, parse the JSON data
            return response.json();
        })
        .then(data => {
            // This runs if the JSON was successfully parsed
            allTournaments = data;
            populateYearSelector();
            updateUI(yearSelect.value);
        })
        .catch(error => {
            // This runs if any step in the chain failed
            console.error("Could not load tournament data:", error);
            tournamentList.innerHTML = `<p style="color: red;">Error: Could not load tournament data. Please check the console.</p>`;
        });
}

// --- Start the Application ---
initializeApp();