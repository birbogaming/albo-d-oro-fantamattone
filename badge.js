const SVG_PATH = 'svg';

const badgeDescriptions = {
    'OG': 'Badge assegnato alle squadre presenti alla prima edizione del Fantamattone.',
    'CENTO': 'Badge assegnato alle squadre che hanno disputato almeno 100 partite di campionato.',
    'CAMICIA NERA': 'Badge assegnato alle squadre arrivate in ultima posizione in un\'edizione del Fantamattone.',
    'FANTAUGANDA': 'Badge assegnato alle squadre che hanno partecipato al fantacalcio del campionato ugandese.',
    'TEST SUPERCOPPA MONCADA': 'Badge speciale assegnato alle squadre che hanno partecipato al test della Supercoppa Moncada.',
    'MONCADAORO': 'Badge speciale assegnato alle squadre che hanno partecipato al test della Supercoppa Moncada.'
};

const badgeIcons = {
    OG: 'og.svg',
    CENTO: '100.svg',
    CAMICIA: 'camicia.svg',
    UGANDA: 'uganda.svg',
    MONCADA: 'moncada.svg',
    MONCADAORO: 'moncada_oro.svg'
};

function getUrlParameter(name) {
    name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
    var regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
    var results = regex.exec(location.search);
    return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
}

// Mappatura dei nomi dei badge visualizzati alle chiavi dei dati
const badgeDisplayNames = {
    'OG': 'OG',
    'CENTO': 'CENTO',
    'CAMICIA': 'CAMICIA NERA',
    'UGANDA': 'FANTAUGANDA',
    'MONCADA': 'TEST SUPERCOPPA MONCADA',
    'MONCADAORO': 'MONCADAORO'
};

// Mappatura inversa per ottenere la chiave dati dal nome visualizzato
const badgeDataKeys = {
    'OG': 'OG',
    'CENTO': 'CENTO',
    'CAMICIA NERA': 'CAMICIA',
    'FANTAUGANDA': 'UGANDA',
    'TEST SUPERCOPPA MONCADA': 'MONCADA',
    'MONCADAORO': 'MONCADAORO'
};

function loadBadgeDetails() {
    const badgeParam = getUrlParameter('badge');
    
    if (!badgeParam) {
        displayError('Nessun badge specificato');
        return;
    }
    
    // Ottieni il nome da visualizzare
    const displayName = badgeDisplayNames[badgeParam];
    if (!displayName || !badgeDescriptions[displayName]) {
        displayError(`Badge "${badgeParam}" non trovato`);
        return;
    }
    
    const badgeImage = document.getElementById('badge-image');
    badgeImage.src = `${SVG_PATH}/${badgeIcons[badgeParam]}`;
    badgeImage.alt = displayName;
    
    document.getElementById('badge-name').textContent = displayName;
    document.getElementById('badge-description-text').textContent = badgeDescriptions[displayName] || 'Nessuna descrizione disponibile per questo badge.';
    
    badgeImage.onerror = function() {
        this.classList.add('hidden');
        const container = document.querySelector('.badge-image-container');
        const fallback = document.createElement('div');
        fallback.className = 'badge-fallback-large';
        fallback.textContent = getBadgeDummyIcon(badgeParam);
        container.appendChild(fallback);
    };
    
    loadTeamsWithBadge(badgeParam);
}

function loadTeamsWithBadge(badgeKey) {
    fetch('albo.json')
        .then(response => {
            if (!response.ok) throw new Error('Impossibile caricare il file JSON "albo.json"');
            return response.json();
        })
        .then(data => {
            const teamBadges = data.teamBadges || {};
            let teamsWithBadge = Object.keys(teamBadges).filter(team => 
                teamBadges[team].includes(badgeKey)
            );
            
            // Se il badge è MONCADA, includo anche le squadre con MONCADAORO
            if (badgeKey === 'MONCADA') {
                const teamsWithOro = Object.keys(teamBadges).filter(team => 
                    teamBadges[team].includes('MONCADAORO')
                );
                teamsWithBadge = [...new Set([...teamsWithBadge, ...teamsWithOro])];
            }
            
            displayTeamsList(teamsWithBadge);
        })
        .catch(error => {
            displayError(`Errore nel caricamento dei dati: ${error.message}`);
        });
}

function displayTeamsList(teams) {
    const teamsList = document.getElementById('teams-list');
    teamsList.innerHTML = '';
    
    if (teams.length === 0) {
        teamsList.innerHTML = '<p class="empty-badge-message">Nessuna squadra possiede questo badge.</p>';
        return;
    }
    
    teams.sort((a, b) => a.localeCompare(b));
    
    const teamList = document.createElement('ul');
    teamList.className = 'badge-teams-list';
    
    teams.forEach(team => {
        const teamItem = document.createElement('li');
        teamItem.className = 'badge-team-item';
        teamItem.setAttribute('data-team', team);
        
        const logoContainer = document.createElement('div');
        logoContainer.className = 'team-logo-small-container';
        
        const teamNameNormalized = team.toLowerCase().replace(/\s+/g, '_');
        const placeholderId = `badge-team-logo-placeholder-${teamNameNormalized}`;
        
        logoContainer.innerHTML = `
            <div class="logo-mask small">
                <img src="${SVG_PATH}/${teamNameNormalized}.svg" 
                     alt="${team} Logo" 
                     class="team-logo-small team-logo-real" 
                     onerror="this.classList.add('hidden'); this.nextElementSibling.classList.remove('hidden');">
                <div class="team-logo-placeholder-small hidden" id="${placeholderId}"></div>
            </div>
        `;
        
        teamItem.appendChild(logoContainer);
        
        const teamNameDiv = document.createElement('div');
        teamNameDiv.className = 'badge-team-name';
        teamNameDiv.textContent = team;
        teamItem.appendChild(teamNameDiv);
        
        teamItem.addEventListener('click', function() {
        });
        
        teamList.appendChild(teamItem);
    });
    
    teamsList.appendChild(teamList);
    
    const items = teamList.querySelectorAll('.badge-team-item');
    items.forEach((item, index) => {
        const staggerClass = `badge-team-stagger-${Math.min(index + 1, 10)}`;
        item.classList.add('badge-team-stagger', staggerClass);
    });
    
    fetch('squadre.json')
        .then(response => {
            if (!response.ok) throw new Error('Impossibile caricare il file JSON "squadre.json"');
            return response.json();
        })
        .then(teamColors => {
            teams.forEach(team => {
                const teamNameNormalized = team.toLowerCase().replace(/\s+/g, '_');
                const placeholderId = `badge-team-logo-placeholder-${teamNameNormalized}`;
                const placeholderContainer = document.getElementById(placeholderId);
                
                if (placeholderContainer) {
                    const colors = teamColors[team] || { primaryColor: '#333333', secondaryColor: '#FFFFFF' };
                    
                    placeholderContainer.innerHTML = `
                        <svg viewBox="0 0 100 100" class="team-logo-small">
                            <circle cx="50" cy="50" r="49" stroke="#FFFFFF" stroke-width="2" fill="none" />
                            <circle cx="50" cy="50" r="48" fill="${colors.secondaryColor}" />
                            <path d="M50,2 A48,48 0 0,0 2,50 L50,50 Z" fill="${colors.primaryColor}" />
                            <path d="M2,50 A48,48 0 0,0 50,98 L50,50 Z" fill="${colors.primaryColor}" />
                            <line x1="50" y1="2" x2="50" y2="98" stroke="${colors.secondaryColor}" stroke-width="1" />
                        </svg>
                    `;
                }
            });
        })
        .catch(error => console.error('Errore nel caricamento dei colori delle squadre:', error));
}

function getBadgeDummyIcon(badgeKey) {
    const availableBadges = {
        'OG': '🟣',
        'CENTO': '💯',
        'CAMICIA': '👕',
        'UGANDA': '🌍',
        'MONCADA': '👑',
        'MONCADAORO': '👑'
    };
    return availableBadges[badgeKey] || '⭐';
}

function displayError(message) {
    const content = document.getElementById('badge-content');
    content.innerHTML = `
        <div class="error-message">
            <p>${message}</p>
            <div class="back-link badge-error-content">
                <a href="index.html">← Torna all'Albo d'Oro</a>
            </div>
        </div>
    `;
}

document.addEventListener('DOMContentLoaded', loadBadgeDetails); 