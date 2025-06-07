const SVG_PATH = 'svg';

const availableBadges = {
    'OG': '🟣',
    'CENTO': '💯',
    'CAMICIA': '👕',
    'UGANDA': '🌍',
    'MONCADA': '👑',
    'MONCADAORO': '👑'
};

const badgeIcons = {
    OG: 'og.svg',
    CENTO: '100.svg',
    CAMICIA: 'camicia.svg',
    UGANDA: 'uganda.svg',
    MONCADA: 'moncada.svg',
    MONCADAORO: 'moncada_oro.svg'
};

function getBadgeDisplayName(badgeKey) {
    const displayNames = {
        'OG': 'OG',
        'CENTO': 'CENTO',
        'CAMICIA': 'CAMICIA NERA',
        'UGANDA': 'FANTAUGANDA',
        'MONCADA': 'TEST SUPERCOPPA MONCADA',
        'MONCADAORO': 'MONCADAORO'
    };
    return displayNames[badgeKey] || badgeKey;
}

function getBadgeDummyIcon(badgeKey) {
    return availableBadges[badgeKey] || '⭐';
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
            return 'trophy.svg';
    }
}

function addPoints(teams, teamNames, points, type, season) {
    const namesArray = Array.isArray(teamNames) ? teamNames : [teamNames];
    namesArray.forEach(teamName => {
        if (!teamName || teamName.trim() === '') return;
        teamName = teamName.trim();
        if (!teams[teamName]) {
            teams[teamName] = {
                name: teamName,
                points: 0,
                championshipsWon: 0,
                cupsWon: 0,
                championshipsSecond: 0,
                cupsSecond: 0,
                championshipsThird: 0,
                trophies: []
            };
        }
        teams[teamName].points += points;
        const trophy = {
            type: type,
            points: points,
            season: season,
            position: (points === 10 || points === 8) ? '1°' :
                      (points === 5 || points === 3) ? '2°' : '3°'
        };
        teams[teamName].trophies.push(trophy);
        if (type === 'campionato' || type === 'apertura' || type === 'clausura') {
            if (trophy.position === '1°') teams[teamName].championshipsWon++;
            else if (trophy.position === '2°') teams[teamName].championshipsSecond++;
            else if (trophy.position === '3°') teams[teamName].championshipsThird++;
        } else if (type === 'memorial' || type === 'latrina') {
            if (trophy.position === '1°') teams[teamName].cupsWon++;
            else if (trophy.position === '2°') teams[teamName].cupsSecond++;
        }
    });
}

function getTrophyRank(trophy) {
    if (trophy.type === 'campionato' || trophy.type === 'apertura' || trophy.type === 'clausura') {
        if (trophy.position === '1°') return 1;
        if (trophy.position === '2°') return 3;
        if (trophy.position === '3°') return 5;
    } else if (trophy.type === 'memorial' || trophy.type === 'latrina') {
        if (trophy.position === '1°') return 2;
        if (trophy.position === '2°') return 4;
    }
    return 6;
}

function addCategorySection(container, title, teams, teamColors) {
    const section = document.createElement('div');
    section.className = 'teams-section';

    teams.forEach((team, index) => {
        const entry = document.createElement('div');
        entry.className = 'team-entry';

        if (index === 0) {
            entry.classList.add('rank-1');
        } else if (index === 1) {
            entry.classList.add('rank-2');
        } else if (index === 2) {
            entry.classList.add('rank-3');
        }

        if (team.trophies.length > 0) {
            entry.classList.add('has-wins');
        } else {
            entry.classList.add('no-wins');
        }

        const logoContainer = document.createElement('div');
        logoContainer.className = 'team-logo-container';
        const teamNameNormalized = team.name.toLowerCase().replace(/\s+/g, '_');
        const logoImg = document.createElement('img');
        logoImg.src = `${SVG_PATH}/${teamNameNormalized}.svg`;
        logoImg.alt = `${team.name} Logo`;
        logoImg.className = 'team-logo team-logo-real';

        logoContainer.innerHTML = `
            <div class="logo-mask">
                <img src="${SVG_PATH}/${teamNameNormalized}.svg" 
                     alt="${team.name} Logo" 
                     class="team-logo team-logo-real" 
                     onerror="this.classList.add('hidden'); this.nextElementSibling.classList.remove('hidden');">
                <div class="team-logo-placeholder hidden"></div>
            </div>
        `;

        const placeholderSvgContainer = logoContainer.querySelector('.team-logo-placeholder');
        const colors = teamColors[team.name] || { primaryColor: '#333333', secondaryColor: '#FFFFFF' };
        
        placeholderSvgContainer.innerHTML = `
            <svg viewBox="0 0 100 100" class="team-logo team-logo-svg-placeholder">
                <!-- Cerchio con bordo bianco -->
                <circle cx="50" cy="50" r="49" stroke="#FFFFFF" stroke-width="2" fill="none" />
                
                <!-- Cerchio di base -->
                <circle cx="50" cy="50" r="48" fill="${colors.secondaryColor}" />
                
                <!-- Metà sinistra - colore primario (sovrascritto sopra al cerchio bianco) -->
                <path d="M50,2 A48,48 0 0,0 2,50 L50,50 Z" fill="${colors.primaryColor}" />
                <path d="M2,50 A48,48 0 0,0 50,98 L50,50 Z" fill="${colors.primaryColor}" />
                
                <!-- Linea divisoria centrale -->
                <line x1="50" y1="2" x2="50" y2="98" stroke="${colors.secondaryColor}" stroke-width="1" />
            </svg>
        `;

        entry.appendChild(logoContainer);

        const infoDiv = document.createElement('div');
        infoDiv.className = 'team-info';
        const nameDiv = document.createElement('div');
        nameDiv.className = 'team-name';
        nameDiv.textContent = team.name;
        infoDiv.appendChild(nameDiv);
        const badgesDiv = document.createElement('div');
        badgesDiv.className = 'badges';
        if (window.teamBadges && window.teamBadges[team.name]) {
            window.teamBadges[team.name].forEach(badgeKey => {
                const badgeLink = document.createElement('a');
                badgeLink.className = 'badge';
                // MONCADAORO usa la pagina MONCADA ma mantiene la sua icona oro
                const linkBadgeKey = badgeKey === 'MONCADAORO' ? 'MONCADA' : badgeKey;
                badgeLink.href = `badge.html?badge=${linkBadgeKey}`;
                
                const badgeImg = document.createElement('img');
                badgeImg.src = `${SVG_PATH}/${badgeIcons[badgeKey]}`;
                badgeImg.alt = badgeKey;
                badgeImg.className = 'badge-icon';
                badgeLink.appendChild(badgeImg);
                
                // Usa i nomi di display per i tooltip
                const displayName = getBadgeDisplayName(badgeKey);
                badgeLink.title = displayName;
                badgesDiv.appendChild(badgeLink);
                
                badgeImg.onerror = function() {
                    this.classList.add('hidden');
                    const fallback = document.createElement('span');
                    fallback.textContent = getBadgeDummyIcon(badgeKey);
                    fallback.className = 'badge-fallback';
                    this.parentNode.insertBefore(fallback, this.nextSibling);
                };
            });
        }
        infoDiv.appendChild(badgesDiv);
        entry.appendChild(infoDiv);
        const trophiesDiv = document.createElement('div');
        trophiesDiv.className = 'trophies';
        team.trophies.sort((a, b) => {
            const rankA = getTrophyRank(a);
            const rankB = getTrophyRank(b);
            if (rankA !== rankB) return rankA - rankB;
            const yearA = parseInt(a.season.split('/')[0]);
            const yearB = parseInt(b.season.split('/')[0]);
            return yearA - yearB;
        });
        team.trophies.forEach(trophy => {
            const trophyLink = document.createElement('a');
            trophyLink.className = 'trophy-item';
            
            // Estrae la stagione senza suffissi (A) o (C)
            const baseSeason = trophy.season.replace(/ \([AC]\)$/, '');
            trophyLink.href = `competition.html?type=${trophy.type}&season=${encodeURIComponent(baseSeason)}`;
            trophyLink.title = `Visualizza dettagli ${trophy.type} ${trophy.season}`;
            
            const img = document.createElement('img');
            const iconFile = getTrophyIconFile(trophy.type, trophy.position);
            img.src = `${SVG_PATH}/${iconFile}`;
            img.alt = trophy.type;
            img.className = 'trophy-icon trophy-large';
            trophyLink.appendChild(img);
            const seasonDiv = document.createElement('div');
            seasonDiv.className = 'trophy-season';
            seasonDiv.textContent = trophy.season;
            trophyLink.appendChild(seasonDiv);
            trophiesDiv.appendChild(trophyLink);
            img.onerror = function() {
                this.classList.add('hidden');
                const fallback = document.createElement('span');
                fallback.textContent = getCompetitionDummyIcon(trophy.type);
                fallback.className = 'trophy-fallback';
                this.parentNode.insertBefore(fallback, this.nextSibling);
            };
        });
        entry.appendChild(trophiesDiv);        
        section.appendChild(entry);
    });
    container.appendChild(section);
}

function displayAlbo(teams, teamColors) {
    const sortedTeams = Object.values(teams).sort((a, b) => {
        if (a.championshipsWon !== b.championshipsWon) return b.championshipsWon - a.championshipsWon;
        if (a.cupsWon !== b.cupsWon) return b.cupsWon - a.cupsWon;
        if (a.championshipsSecond !== b.championshipsSecond) return b.championshipsSecond - a.championshipsSecond;
        if (a.cupsSecond !== b.cupsSecond) return b.cupsSecond - a.cupsSecond;
        if (a.championshipsThird !== b.championshipsThird) return b.championshipsThird - a.championshipsThird;
        return a.name.localeCompare(b.name);
    });
    const content = document.getElementById('albo-content');
    content.innerHTML = '';
    if (sortedTeams.length === 0) {
        content.innerHTML = '<p class="no-data-message">Nessun dato disponibile per generare l\'albo d\'oro.</p>';
        return;
    }
    addCategorySection(content, '', sortedTeams, teamColors);
}

document.addEventListener('DOMContentLoaded', () => {
    Promise.all([
        fetch('albo.json').then(response => {
            if (!response.ok) throw new Error('Impossibile caricare il file JSON "albo.json"');
            return response.json();
        }),
        fetch('squadre.json').then(response => {
            if (!response.ok) throw new Error('Impossibile caricare il file JSON "squadre.json"');
            return response.json();
        })
    ])
    .then(([alboData, colorsData]) => {
        const seasonsData = alboData.seasonsData || {};
        window.teamBadges = alboData.teamBadges || {};
        const teamsWithoutWins = alboData.teamsWithoutWins || [];
        const teamColors = colorsData || {};

        const teams = {};
        Object.keys(seasonsData).forEach(season => {
            const d = seasonsData[season];
            const isSplit = d.isAperturaClausura;
            if (isSplit) {
                if (d.apertura) {
                    addPoints(teams, d.apertura.primo, 10, 'apertura', season + ' (A)');
                    addPoints(teams, d.apertura.secondo, 5, 'apertura', season + ' (A)');
                    addPoints(teams, d.apertura.terzo, 1, 'apertura', season + ' (A)');
                }
                if (d.clausura) {
                    addPoints(teams, d.clausura.primo, 10, 'clausura', season + ' (C)');
                    addPoints(teams, d.clausura.secondo, 5, 'clausura', season + ' (C)');
                    addPoints(teams, d.clausura.terzo, 1, 'clausura', season + ' (C)');
                }
            } else {
                if (d.campionato) {
                    addPoints(teams, d.campionato.primo, 10, 'campionato', season);
                    addPoints(teams, d.campionato.secondo, 5, 'campionato', season);
                    addPoints(teams, d.campionato.terzo, 1, 'campionato', season);
                }
            }
            if (d.memorial) {
                addPoints(teams, d.memorial.vincitore, 8, 'memorial', season);
                addPoints(teams, d.memorial.finalista, 3, 'memorial', season);
            }
            if (d.latrina) {
                addPoints(teams, d.latrina.vincitore, 8, 'latrina', season);
                addPoints(teams, d.latrina.finalista, 3, 'latrina', season);
            }
        });
        teamsWithoutWins.forEach(teamName => {
            if (!teams[teamName]) {
                teams[teamName] = {
                    name: teamName,
                    points: 0,
                    championshipsWon: 0,
                    cupsWon: 0,
                    championshipsSecond: 0,
                    cupsSecond: 0,
                    championshipsThird: 0,
                    trophies: []
                };
            }
        });
        displayAlbo(teams, teamColors);
        
        const downloadBtn = document.getElementById('download-btn');
        if (downloadBtn) {
            downloadBtn.classList.remove('hidden-btn');
            downloadBtn.classList.add('visible-btn');
            downloadBtn.addEventListener('click', downloadAlboImage);
        }
    })
    .catch(error => {
        console.error(error);
        const content = document.getElementById('albo-content');
        content.innerHTML = `<p class="error-text">Errore: ${error.message}</p>`;
    });
});

function svgToBase64(svgElement) {
    return new Promise((resolve) => {
        try {
            const svgData = new XMLSerializer().serializeToString(svgElement);
            const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.readAsDataURL(svgBlob);
        } catch (error) {
            console.error('Errore conversione SVG:', error);
            resolve(null);
        }
    });
}

function preloadImages(container) {
    return new Promise((resolve) => {
        const images = container.querySelectorAll('img');
        const promises = [];
        
        images.forEach(img => {
            if (img.src && !img.complete) {
                promises.push(new Promise((imgResolve) => {
                    const tempImg = new Image();
                    tempImg.onload = () => imgResolve();
                    tempImg.onerror = () => imgResolve();
                    tempImg.src = img.src;
                }));
            }
        });
        
        Promise.all(promises).then(() => {
            setTimeout(resolve, 500);
        });
    });
}

async function prepareContainerForCapture(container) {
    const originalTransitions = [];
    const animatedElements = container.querySelectorAll('*');
    
    animatedElements.forEach((element, index) => {
        const computed = window.getComputedStyle(element);
        originalTransitions[index] = {
            element: element,
            transition: computed.transition,
            animation: computed.animation
        };
        element.style.transition = 'none !important';
        element.style.animation = 'none !important';
    });
    
    const svgElements = container.querySelectorAll('svg');
    const svgPromises = [];
    
    svgElements.forEach(svg => {
        svgPromises.push(svgToBase64(svg).then(base64 => {
            if (base64) {
                const img = document.createElement('img');
                img.src = base64;
                img.style.width = svg.style.width || svg.getAttribute('width') || '100%';
                img.style.height = svg.style.height || svg.getAttribute('height') || '100%';
                img.classList.add('svg-converted');
                return { svg, img };
            }
            return null;
        }));
    });
    
    await preloadImages(container);
    
    return { originalTransitions, svgPromises };
}

function restoreContainerAfterCapture(originalTransitions) {
    originalTransitions.forEach(({ element, transition, animation }) => {
        if (element && element.style) {
            element.style.transition = transition;
            element.style.animation = animation;
        }
    });
    
    document.querySelectorAll('.svg-converted').forEach(img => {
        if (img.parentNode) {
            img.parentNode.removeChild(img);
        }
    });
}

async function downloadAlboImage() {
    const downloadBtn = document.getElementById('download-btn');
    const alboContainer = document.querySelector('.albo-container');
    
    if (!alboContainer) {
        alert('Errore: Impossibile trovare l\'albo d\'oro da scaricare.');
        return;
    }
    
    try {
        downloadBtn.disabled = true;
        const downloadText = downloadBtn.querySelector('.download-text');
        if (downloadText) {
            downloadText.textContent = 'Preparando...';
        } else {
            downloadBtn.textContent = 'Preparando...';
        }
        
        const { originalTransitions } = await prepareContainerForCapture(alboContainer);
        
        alboContainer.classList.add('capture-mode');
        
        if (downloadText) {
            downloadText.textContent = 'Generando...';
        } else {
            downloadBtn.textContent = 'Generando...';
        }
        
        const options = {
            backgroundColor: '#1a2433',
            scale: 2,
            useCORS: true,
            allowTaint: true,
            scrollX: 0,
            scrollY: 0,
            width: alboContainer.offsetWidth,
            height: alboContainer.offsetHeight,
            foreignObjectRendering: false,
            imageTimeout: 15000,
            removeContainer: false,
            logging: false,
            onclone: (clonedDoc) => {
                const clonedContainer = clonedDoc.querySelector('.albo-container');
                if (clonedContainer) {
                    clonedContainer.style.transform = 'none';
                    clonedContainer.style.animation = 'none';
                    
                    const allElements = clonedContainer.querySelectorAll('*');
                    allElements.forEach(el => {
                        if (el.style) {
                            el.style.opacity = el.style.opacity || '1';
                            el.style.visibility = 'visible';
                        }
                    });
                }
            }
        };
        
        let canvas;
        try {
            canvas = await html2canvas(alboContainer, options);
        } catch (firstError) {
            console.warn('Primo tentativo fallito, provo con opzioni semplificate:', firstError);
            
            const fallbackOptions = {
                backgroundColor: '#1a2433',
                scale: 1,
                useCORS: false,
                allowTaint: false,
                scrollX: 0,
                scrollY: 0,
                foreignObjectRendering: false,
                imageTimeout: 5000,
                removeContainer: false,
                logging: true
            };
            
            canvas = await html2canvas(alboContainer, fallbackOptions);
        }
        
        const context = canvas.getContext('2d');
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        const pixels = imageData.data;
        let hasContent = false;
        
        for (let i = 0; i < pixels.length; i += 4) {
            const r = pixels[i];
            const g = pixels[i + 1];
            const b = pixels[i + 2];
            const a = pixels[i + 3];
            
            if (a > 0 && (r !== 26 || g !== 36 || b !== 51)) {
                hasContent = true;
                break;
            }
        }
        
        if (!hasContent) {
            throw new Error('L\'immagine generata è vuota. Verifica che l\'albo sia visibile sullo schermo e riprova.');
        }
        
        const link = document.createElement('a');
        link.download = `albo-oro-fantamattone-${new Date().toISOString().split('T')[0]}.png`;
        link.href = canvas.toDataURL('image/png', 1.0);
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        alboContainer.classList.remove('capture-mode');
        restoreContainerAfterCapture(originalTransitions);
        
        downloadBtn.disabled = false;
        if (downloadText) {
            downloadText.textContent = 'Scarica';
        } else {
            downloadBtn.textContent = 'Scarica';
        }
        
    } catch (error) {
        console.error('Errore durante la generazione dell\'immagine:', error);
        alert(`Errore durante la generazione dell'immagine: ${error.message}`);
        
        alboContainer.classList.remove('capture-mode');
        
        downloadBtn.disabled = false;
        if (downloadText) {
            downloadText.textContent = 'Scarica';
        } else {
            downloadBtn.textContent = 'Scarica';
        }
    }
} 