const SVG_PATH = 'svg';

const competitionNames = {
    'campionato': 'Campionato',
    'apertura': 'Torneo Apertura',
    'clausura': 'Torneo Clausura',
    'memorial': 'Memorial',
    'latrina': 'Coppa Latrina'
};

const competitionDescriptions = {
    'campionato': 'Il campionato principale della stagione',
    'apertura': 'Il torneo di apertura della stagione',
    'clausura': 'Il torneo di chiusura della stagione',
    'memorial': 'Il torneo Memorial',
    'latrina': 'La Coppa Latrina'
};

function getTrophyIconFile(type, position) {
    switch(type) {
        case 'campionato':
            switch(position) {
                case '1°': return 'scudetto.svg';
                case '2°': return 'scudetto2.svg';
                case '3°': return 'scudetto3.svg';
                default: return 'scudetto.svg';
            }
        case 'apertura':
            switch(position) {
                case '1°': return 'apertura.svg';
                case '2°': return 'apertura2.svg';
                case '3°': return 'apertura3.svg';
                default: return 'apertura.svg';
            }
        case 'clausura':
            switch(position) {
                case '1°': return 'clausura.svg';
                case '2°': return 'clausura2.svg';
                case '3°': return 'clausura3.svg';
                default: return 'clausura.svg';
            }
        case 'memorial':
            switch(position) {
                case '1°': return 'memorial.svg';
                case '2°': return 'finalista_memorial.svg';
                default: return 'memorial.svg';
            }
        case 'latrina':
            switch(position) {
                case '1°': return 'latrina.svg';
                case '2°': return 'finalista_latrina.svg';
                default: return 'latrina.svg';
            }
        default:
            return 'scudetto.svg';
    }
}

function getCompetitionDummyIcon(type) {
    switch(type) {
        case 'campionato': return '🏆';
        case 'apertura': return '🥇';
        case 'clausura': return '🥈';
        case 'memorial': return '🏅';
        case 'latrina': return '🍕';
        default: return '🏆';
    }
}

function getUrlParameter(name) {
    name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
    var regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
    var results = regex.exec(location.search);
    return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
}

function loadCompetitionDetails() {
    const type = getUrlParameter('type');
    const season = getUrlParameter('season');
    
    if (!type || !season) {
        displayError('Parametri competizione mancanti');
        return;
    }
    
    if (!competitionNames[type]) {
        displayError(`Tipo di competizione "${type}" non trovato`);
        return;
    }
    
    const seasonDisplay = type === 'apertura' ? `${season} (A)` : 
                         type === 'clausura' ? `${season} (C)` : season;
    
    document.getElementById('competition-title').textContent = competitionNames[type];
    document.getElementById('competition-season').textContent = seasonDisplay;
    
    const trophyImage = document.getElementById('competition-trophy');
    const trophyFileName = getTrophyIconFile(type, '1°');
    const trophySrc = `${SVG_PATH}/${trophyFileName}`;
    
    trophyImage.classList.remove('hidden');
    trophyImage.style.display = 'block';
    
    trophyImage.src = trophySrc;
    trophyImage.alt = `Trofeo ${competitionNames[type]}`;
    
    trophyImage.onload = function() {
        this.classList.remove('hidden');
        this.style.display = 'block';
    };
    
    trophyImage.onerror = function() {
        this.classList.add('hidden');
        const container = document.querySelector('.competition-trophy-container');
        const fallback = document.createElement('div');
        fallback.className = 'trophy-fallback-large';
        fallback.textContent = getCompetitionDummyIcon(type);
        container.appendChild(fallback);
    };
    
    loadCompetitionResults(type, season);
    loadStandings(type, season);
}

function loadCompetitionResults(type, season) {
    fetch('albo.json')
        .then(response => {
            if (!response.ok) throw new Error('Impossibile caricare il file JSON "albo.json"');
            return response.json();
        })
        .then(data => {
            const seasonsData = data.seasonsData || {};
            const seasonData = seasonsData[season];
            
            if (!seasonData) {
                displayError(`Dati non trovati per la stagione ${season}`);
                return;
            }
            
            let competitionData = null;
            
            if (type === 'memorial' || type === 'latrina') {
                competitionData = seasonData[type];
                if (competitionData) {
                    displayMemorialLatrinaResults(competitionData, type);
                }
            } else {
                competitionData = seasonData[type];
                if (competitionData) {
                    displayStandardResults(competitionData, type);
                }
            }
            
            if (!competitionData) {
                displayError(`Nessun dato trovato per ${competitionNames[type]} nella stagione ${season}`);
            }
        })
        .catch(error => {
            displayError(`Errore nel caricamento dei dati: ${error.message}`);
        });
}

function displayStandardResults(competitionData, type) {
    const resultsList = document.getElementById('competition-results-list');
    resultsList.innerHTML = '';
    
    const positions = ['primo', 'secondo', 'terzo'];
    const positionNames = ['1° Posto', '2° Posto', '3° Posto'];
    const positionClasses = ['result-first', 'result-second', 'result-third'];
    
    positions.forEach((pos, index) => {
        if (competitionData[pos] && competitionData[pos].length > 0) {
            const resultDiv = document.createElement('div');
            resultDiv.className = `competition-result ${positionClasses[index]}`;
            
            const positionDiv = document.createElement('div');
            positionDiv.className = 'result-position';
            positionDiv.textContent = positionNames[index];
            resultDiv.appendChild(positionDiv);
            
            const teamsDiv = document.createElement('div');
            teamsDiv.className = 'result-teams';
            
            competitionData[pos].forEach(team => {
                const teamDiv = document.createElement('div');
                teamDiv.className = 'result-team';
                
                const logoContainer = document.createElement('div');
                logoContainer.className = 'team-logo-small-container';
                
                const teamNameNormalized = team.toLowerCase().replace(/\s+/g, '_');
                logoContainer.innerHTML = `
                    <div class="logo-mask small">
                        <img src="${SVG_PATH}/${teamNameNormalized}.svg" 
                             alt="${team} Logo" 
                             class="team-logo-small team-logo-real" 
                             onerror="this.classList.add('hidden'); this.nextElementSibling.classList.remove('hidden');">
                        <div class="team-logo-placeholder-small hidden"></div>
                    </div>
                `;
                
                const teamNameDiv = document.createElement('div');
                teamNameDiv.className = 'result-team-name';
                teamNameDiv.textContent = team;
                
                teamDiv.appendChild(logoContainer);
                teamDiv.appendChild(teamNameDiv);
                teamsDiv.appendChild(teamDiv);
            });
            
            resultDiv.appendChild(teamsDiv);
            resultsList.appendChild(resultDiv);
        }
    });
    
    loadTeamColors();
}

function displayMemorialLatrinaResults(competitionData, type) {
    const resultsList = document.getElementById('competition-results-list');
    resultsList.innerHTML = '';
    
    const roles = ['vincitore', 'finalista'];
    const roleNames = type === 'memorial' 
        ? ['Vincitore Memorial', 'Finalista Memorial']
        : ['Vincitore Coppa Latrina', 'Finalista Coppa Latrina'];
    const roleClasses = ['result-winner', 'result-finalist'];
    
    roles.forEach((role, index) => {
        if (competitionData[role] && competitionData[role].length > 0) {
            const resultDiv = document.createElement('div');
            resultDiv.className = `competition-result ${roleClasses[index]}`;
            
            const roleDiv = document.createElement('div');
            roleDiv.className = 'result-position';
            roleDiv.textContent = roleNames[index];
            resultDiv.appendChild(roleDiv);
            
            const teamsDiv = document.createElement('div');
            teamsDiv.className = 'result-teams';
            
            competitionData[role].forEach(team => {
                const teamDiv = document.createElement('div');
                teamDiv.className = 'result-team';
                
                const logoContainer = document.createElement('div');
                logoContainer.className = 'team-logo-small-container';
                
                const teamNameNormalized = team.toLowerCase().replace(/\s+/g, '_');
                logoContainer.innerHTML = `
                    <div class="logo-mask small">
                        <img src="${SVG_PATH}/${teamNameNormalized}.svg" 
                             alt="${team} Logo" 
                             class="team-logo-small team-logo-real" 
                             onerror="this.classList.add('hidden'); this.nextElementSibling.classList.remove('hidden');">
                        <div class="team-logo-placeholder-small hidden"></div>
                    </div>
                `;
                
                const teamNameDiv = document.createElement('div');
                teamNameDiv.className = 'result-team-name';
                teamNameDiv.textContent = team;
                
                teamDiv.appendChild(logoContainer);
                teamDiv.appendChild(teamNameDiv);
                teamsDiv.appendChild(teamDiv);
            });
            
            resultDiv.appendChild(teamsDiv);
            resultsList.appendChild(resultDiv);
        }
    });
    
    loadTeamColors();
}

function loadTeamColors() {
    fetch('squadre.json')
        .then(response => {
            if (!response.ok) throw new Error('Impossibile caricare il file JSON "squadre.json"');
            return response.json();
        })
        .then(teamColors => {
            const placeholders = document.querySelectorAll('.team-logo-placeholder-small');
            
            placeholders.forEach(placeholder => {
                const logoContainer = placeholder.closest('.team-logo-small-container');
                const teamDiv = logoContainer.closest('.result-team');
                const teamName = teamDiv.querySelector('.result-team-name').textContent;
                
                const colors = teamColors[teamName] || { primaryColor: '#333333', secondaryColor: '#FFFFFF' };
                
                placeholder.innerHTML = `
                    <svg viewBox="0 0 100 100" class="team-logo-small">
                        <circle cx="50" cy="50" r="49" stroke="#FFFFFF" stroke-width="2" fill="none" />
                        <circle cx="50" cy="50" r="48" fill="${colors.secondaryColor}" />
                        <path d="M50,2 A48,48 0 0,0 2,50 L50,50 Z" fill="${colors.primaryColor}" />
                        <path d="M2,50 A48,48 0 0,0 50,98 L50,50 Z" fill="${colors.primaryColor}" />
                        <line x1="50" y1="2" x2="50" y2="98" stroke="${colors.secondaryColor}" stroke-width="1" />
                    </svg>
                `;
            });
        })
        .catch(error => console.error('Errore nel caricamento dei colori delle squadre:', error));
}

function loadStandings(type, season) {
    const seasonFormatted = season.replace('/', '-');
    
    const extensions = ['webp', 'png', 'jpg', 'jpeg', 'JPG', 'JPEG'];
    
    const baseFileName = `${seasonFormatted}_${type}`;
    
    function tryLoadStanding(extensionIndex = 0) {
        if (extensionIndex >= extensions.length) {
            return;
        }
        
        const extension = extensions[extensionIndex];
        const fileName = `${baseFileName}.${extension}`;
        const imagePath = `standings/${fileName}`;
        
        const testImg = new Image();
        
        testImg.onload = function() {
            displayStandingImage(imagePath, `Classifica ${season} - ${type}`);
        };
        
        testImg.onerror = function() {
            tryLoadStanding(extensionIndex + 1);
        };
        
        setTimeout(() => {
            if (!testImg.complete) {
                testImg.src = '';
                tryLoadStanding(extensionIndex + 1);
            }
        }, 3000);
        
        testImg.src = imagePath;
    }
    
    tryLoadStanding();
}

function displayStandingImage(imagePath, altText) {
    const standingsContainer = document.getElementById('standings-container');
    
    if (!standingsContainer) {
        console.error('Container standings non trovato');
        return;
    }
    
    const imageContainer = document.createElement('div');
    imageContainer.className = 'standings-image-container';
    
    const img = document.createElement('img');
    img.src = imagePath;
    img.alt = altText;
    img.className = 'standings-image';
    
    img.onload = function() {
        console.log('Classifica caricata:', imagePath);
    };
    
    img.onerror = function() {
        console.error('Errore caricamento classifica:', imagePath);
        standingsContainer.innerHTML = '<div class="standings-placeholder"><p>Errore nel caricamento della classifica</p></div>';
    };
    
    imageContainer.appendChild(img);
    standingsContainer.innerHTML = '';
    standingsContainer.appendChild(imageContainer);
}

function displayError(message) {
    const content = document.getElementById('competition-content');
    content.innerHTML = `
        <div class="error-message">
            <p>${message}</p>
            <div class="back-link">
                <a href="index.html">← Torna all'Albo d'Oro</a>
            </div>
        </div>
    `;
}

document.addEventListener('DOMContentLoaded', loadCompetitionDetails); 