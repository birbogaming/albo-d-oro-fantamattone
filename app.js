// Albo Fantamattone - JavaScript Application
// Migrazione da Blazor WASM a JavaScript puro

(function() {
    'use strict';

    // ============================================
    // CONFIGURAZIONE
    // ============================================
    const BASE_PATH = '/albo-d-oro-fantamattone/';
    const DATA_BASE = 'data/v2/';

    // ============================================
    // STATO GLOBALE
    // ============================================
    let appData = null;
    let currentRoute = '/';
    let mobileMenuOpen = false;

    // ============================================
    // UTILITY
    // ============================================
    function normalizePath(path) {
        if (path.startsWith(BASE_PATH)) {
            path = path.substring(BASE_PATH.length);
        }
        if (!path.startsWith('/')) {
            path = '/' + path;
        }
        return path;
    }

    function getRouteFromPath(path) {
        path = normalizePath(path);
        if (path === '/' || path === '') return '/';
        const parts = path.split('/').filter(p => p);
        if (parts.length === 0) return '/';
        return '/' + parts.join('/');
    }

    function getRouteParams(route) {
        const path = normalizePath(window.location.pathname);
        const parts = path.split('/').filter(p => p);
        const routeParts = route.split('/').filter(p => p);
        const params = {};
        
        for (let i = 0; i < routeParts.length; i++) {
            if (routeParts[i].startsWith(':')) {
                const key = routeParts[i].substring(1);
                params[key] = parts[i] || '';
            }
        }
        return params;
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function normalizeHex(raw) {
        if (!raw || !raw.trim()) return null;
        let s = raw.trim();
        if (!s.startsWith('#')) {
            s = '#' + s;
        }
        return s;
    }

    // ============================================
    // CARICAMENTO DATI
    // ============================================
    async function loadData() {
        if (appData) return appData;

        try {
            const [teamsRes, badgesRes, competitionsRes, seasonsRes] = await Promise.all([
                fetch(DATA_BASE + 'teams.json'),
                fetch(DATA_BASE + 'badges.json'),
                fetch(DATA_BASE + 'competitions.json'),
                fetch(DATA_BASE + 'seasons.json')
            ]);

            const [teamsFile, badgesFile, competitionsFile, seasonsFile] = await Promise.all([
                teamsRes.json(),
                badgesRes.json(),
                competitionsRes.json(),
                seasonsRes.json()
            ]);

            appData = {
                squadre: teamsFile.teams || [],
                badge: badgesFile.badges || [],
                competizioni: competitionsFile.competitions || [],
                stagioni: seasonsFile.seasons || [],
                squadreById: {},
                badgeByKey: {},
                competizioniByKey: {},
                stagioniById: {}
            };

            // Build indexes
            appData.squadre.forEach(s => {
                if (s.id) appData.squadreById[s.id.toLowerCase()] = s;
            });

            appData.badge.forEach(b => {
                if (b.chiave) appData.badgeByKey[b.chiave.toLowerCase()] = b;
            });

            appData.competizioni.forEach(c => {
                if (c.key) appData.competizioniByKey[c.key.toLowerCase()] = c;
            });

            appData.stagioni.forEach(s => {
                if (s.id) appData.stagioniById[s.id.toLowerCase()] = s;
            });

            return appData;
        } catch (error) {
            console.error('Errore nel caricamento dati:', error);
            throw error;
        }
    }

    // ============================================
    // CALCOLI ALBO D'ORO
    // ============================================
    const PUNTI_CAMPIONATO_PRIMO = 10;
    const PUNTI_CAMPIONATO_SECONDO = 5;
    const PUNTI_CAMPIONATO_TERZO = 1;
    const PUNTI_COPPA_VINCITORE = 8;
    const PUNTI_COPPA_FINALISTA = 3;

    function getTrofeoRank(t) {
        switch (t.ruolo) {
            case 'Primo': return 1;
            case 'Vincitore': return 2;
            case 'Secondo': return 3;
            case 'Finalista': return 4;
            case 'Terzo': return 5;
            default: return 99;
        }
    }

    function getSeasonStartYear(seasonId) {
        if (seasonId && seasonId.length >= 4) {
            const year = parseInt(seasonId.substring(0, 4));
            if (!isNaN(year)) return year;
        }
        return Number.MAX_SAFE_INTEGER;
    }

    function buildTrofeiByTeamId(data) {
        const result = {};

        data.stagioni.forEach(stagione => {
            stagione.edizioni.forEach(edizione => {
                const competizione = data.competizioniByKey[edizione.competizioneKey.toLowerCase()];
                if (!competizione) return;

                if (competizione.tipo === 'Campionato') {
                    addTrofeoGroup(result, data, competizione, stagione, edizione.risultati.primo, 'Primo', PUNTI_CAMPIONATO_PRIMO, competizione.iconaVincitoreSvgPath);
                    addTrofeoGroup(result, data, competizione, stagione, edizione.risultati.secondo, 'Secondo', PUNTI_CAMPIONATO_SECONDO, competizione.iconaSecondoSvgPath);
                    addTrofeoGroup(result, data, competizione, stagione, edizione.risultati.terzo, 'Terzo', PUNTI_CAMPIONATO_TERZO, competizione.iconaTerzoSvgPath);
                } else {
                    addTrofeoGroup(result, data, competizione, stagione, edizione.risultati.vincitore, 'Vincitore', PUNTI_COPPA_VINCITORE, competizione.iconaVincitoreSvgPath);
                    addTrofeoGroup(result, data, competizione, stagione, edizione.risultati.finalista, 'Finalista', PUNTI_COPPA_FINALISTA, competizione.iconaSecondoSvgPath);
                }
            });
        });

        data.squadre.forEach(squadra => {
            if (!result[squadra.id.toLowerCase()]) {
                result[squadra.id.toLowerCase()] = [];
            }
        });

        return result;
    }

    function addTrofeoGroup(result, data, competizione, stagione, teamIds, ruolo, puntiAlbo, iconaSvgPath) {
        if (!teamIds) return;
        
        teamIds.forEach(teamId => {
            const key = teamId.toLowerCase();
            if (!data.squadreById[key]) return;

            if (!result[key]) {
                result[key] = [];
            }

            result[key].push({
                competizioneKey: competizione.key,
                competizioneNome: competizione.nome,
                stagioneId: stagione.id,
                stagioneNome: stagione.nome,
                ruolo: ruolo,
                puntiAlbo: puntiAlbo,
                iconaSvgPath: iconaSvgPath
            });
        });
    }

    function buildAlboDoro(data) {
        const trofeiByTeamId = buildTrofeiByTeamId(data);
        const entries = [];

        data.squadre.forEach(squadra => {
            const trofei = trofeiByTeamId[squadra.id.toLowerCase()] || [];

            let campionatiVinti = 0;
            let coppeVinte = 0;
            let campionatiSecondi = 0;
            let coppeSecondi = 0;
            let campionatiTerzi = 0;

            trofei.forEach(t => {
                const competizione = data.competizioniByKey[t.competizioneKey.toLowerCase()];
                if (!competizione) return;

                if (competizione.tipo === 'Campionato') {
                    if (t.ruolo === 'Primo') campionatiVinti++;
                    else if (t.ruolo === 'Secondo') campionatiSecondi++;
                    else if (t.ruolo === 'Terzo') campionatiTerzi++;
                } else {
                    if (t.ruolo === 'Vincitore') coppeVinte++;
                    else if (t.ruolo === 'Finalista') coppeSecondi++;
                }
            });

            entries.push({
                squadra: squadra,
                trofei: trofei.sort((a, b) => {
                    const rankA = getTrofeoRank(a);
                    const rankB = getTrofeoRank(b);
                    if (rankA !== rankB) return rankA - rankB;
                    const yearA = getSeasonStartYear(a.stagioneId);
                    const yearB = getSeasonStartYear(b.stagioneId);
                    if (yearA !== yearB) return yearB - yearA;
                    return a.competizioneKey.localeCompare(b.competizioneKey, undefined, { sensitivity: 'base' });
                }),
                campionatiVinti: campionatiVinti,
                coppeVinte: coppeVinte,
                campionatiSecondi: campionatiSecondi,
                coppeSecondi: coppeSecondi,
                campionatiTerzi: campionatiTerzi
            });
        });

        return entries.sort((a, b) => {
            if (a.campionatiVinti !== b.campionatiVinti) return b.campionatiVinti - a.campionatiVinti;
            if (a.coppeVinte !== b.coppeVinte) return b.coppeVinte - a.coppeVinte;
            if (a.campionatiSecondi !== b.campionatiSecondi) return b.campionatiSecondi - a.campionatiSecondi;
            if (a.coppeSecondi !== b.coppeSecondi) return b.coppeSecondi - a.coppeSecondi;
            if (a.campionatiTerzi !== b.campionatiTerzi) return b.campionatiTerzi - a.campionatiTerzi;
            return a.squadra.nome.localeCompare(b.squadra.nome, undefined, { sensitivity: 'base' });
        });
    }

    // ============================================
    // COMPONENTI
    // ============================================
    function renderTeamLogo(team, small = false) {
        if (!team) return '';

        const containerClass = small ? 'team-logo-small-container' : 'team-logo-container';
        const maskClass = small ? 'logo-mask small' : 'logo-mask';
        const logoClass = small ? 'team-logo-small team-logo-real' : 'team-logo team-logo-real';
        const placeholderClass = small ? 'team-logo-placeholder-small' : 'team-logo-placeholder';

        const primary = normalizeHex(team.colorePrimarioHex) || '#334155';
        const secondary = normalizeHex(team.coloreSecondarioHex) || '#ffffff';

        return `
            <div class="${containerClass}">
                <div class="${maskClass}">
                    <img src="${escapeHtml(team.logoSvgPath)}"
                         alt="Logo ${escapeHtml(team.nome)}"
                         class="${logoClass}"
                         onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" />
                    <div class="${placeholderClass}" style="display:none;">
                        <svg viewBox="0 0 100 100" class="team-logo-svg-placeholder" aria-hidden="true">
                            <circle cx="50" cy="50" r="49" stroke="var(--border-color)" stroke-width="2" fill="none" />
                            <circle cx="50" cy="50" r="48" fill="${secondary}" />
                            <path d="M50,2 A48,48 0 0,0 2,50 L50,50 Z" fill="${primary}" />
                            <path d="M2,50 A48,48 0 0,0 50,98 L50,50 Z" fill="${primary}" />
                            <line x1="50" y1="2" x2="50" y2="98" stroke="${secondary}" stroke-width="1" />
                        </svg>
                    </div>
                </div>
            </div>
        `;
    }

    // ============================================
    // RENDERING PAGINE
    // ============================================
    function renderLoading() {
        return `
            <div class="loading-screen">
                <div class="loading-logo">🏆</div>
                <div class="loading-text">Albo Fantamattone</div>
                <div class="loading-bar">
                    <div class="loading-bar-fill"></div>
                </div>
            </div>
        `;
    }

    function renderError(message) {
        return `
            <div class="error-message">
                <p>${escapeHtml(message)}</p>
            </div>
        `;
    }

    function renderIndex() {
        if (!appData) return renderLoading();

        try {
            const entries = buildAlboDoro(appData);
            let html = '';

            entries.forEach((entry, i) => {
                const rankClass = i === 0 ? 'rank-1' : i === 1 ? 'rank-2' : i === 2 ? 'rank-3' : '';

                let badgesHtml = '';
                entry.squadra.badgeKeys.forEach(badgeKey => {
                    const badge = appData.badgeByKey[badgeKey.toLowerCase()];
                    if (badge) {
                        badgesHtml += `
                            <a class="badge" href="/badge/${escapeHtml(badge.chiave)}" title="${escapeHtml(badge.nome)}">
                                <img class="badge-icon" src="${escapeHtml(badge.iconaSvgPath)}" alt="${escapeHtml(badge.nome)}" />
                            </a>
                        `;
                    }
                });

                let trophiesHtml = '';
                entry.trofei.forEach(t => {
                    trophiesHtml += `
                        <a class="trophy-item"
                           href="/competizioni/${escapeHtml(t.competizioneKey)}/${escapeHtml(t.stagioneId)}"
                           title="${escapeHtml(t.competizioneNome)} ${escapeHtml(t.stagioneNome)}">
                            <img class="trophy-icon trophy-large" src="${escapeHtml(t.iconaSvgPath)}" alt="${escapeHtml(t.competizioneNome)}" />
                            <div class="trophy-season">${escapeHtml(t.stagioneNome)}</div>
                        </a>
                    `;
                });

                html += `
                    <div class="team-entry ${rankClass}">
                        ${renderTeamLogo(entry.squadra)}
                        <div class="team-info">
                            <div class="team-name">
                                <a href="/squadre/${escapeHtml(entry.squadra.id)}">${escapeHtml(entry.squadra.nome)}</a>
                            </div>
                            <div class="badges">
                                ${badgesHtml}
                            </div>
                        </div>
                        <div class="trophies">
                            ${trophiesHtml}
                        </div>
                    </div>
                `;
            });

            return `<div class="teams-section">${html}</div>`;
        } catch (error) {
            return renderError(error.message);
        }
    }

    function renderStagioniLista() {
        if (!appData) return renderLoading();

        try {
            const stagioni = [...appData.stagioni].sort((a, b) => {
                return b.id.localeCompare(a.id);
            });

            let html = `
                <div class="page-header">
                    <h2 class="page-title">Stagioni</h2>
                    <p class="muted">Tutte le stagioni del Fantamattone</p>
                </div>
                <div class="grid-list">
            `;

            stagioni.forEach(stagione => {
                html += `
                    <a href="/stagioni/${escapeHtml(stagione.id)}" class="grid-card">
                        <div class="grid-card-icon">📅</div>
                        <div class="grid-card-content">
                            <div class="grid-card-title">${escapeHtml(stagione.nome)}</div>
                            <div class="grid-card-subtitle">${stagione.edizioni.length} competizioni</div>
                        </div>
                    </a>
                `;
            });

            html += '</div>';
            return html;
        } catch (error) {
            return renderError(error.message);
        }
    }

    function renderCompetizioniLista() {
        if (!appData) return renderLoading();

        try {
            let html = `
                <div class="page-header">
                    <h2 class="page-title">Competizioni</h2>
                    <p class="muted">Tutte le competizioni del Fantamattone</p>
                </div>
                <div class="grid-list">
            `;

            appData.competizioni.forEach(comp => {
                html += `
                    <a href="/competizioni/${escapeHtml(comp.key)}" class="grid-card">
                        <div class="grid-card-icon-img">
                            <img src="${escapeHtml(comp.iconaVincitoreSvgPath)}" alt="${escapeHtml(comp.nome)}" />
                        </div>
                        <div class="grid-card-content">
                            <div class="grid-card-title">${escapeHtml(comp.nome)}</div>
                            <div class="grid-card-subtitle">${escapeHtml(comp.tipo)}</div>
                        </div>
                    </a>
                `;
            });

            html += '</div>';
            return html;
        } catch (error) {
            return renderError(error.message);
        }
    }

    function renderSquadreLista() {
        if (!appData) return renderLoading();

        try {
            const squadre = [...appData.squadre].sort((a, b) => {
                return a.nome.localeCompare(b.nome, undefined, { sensitivity: 'base' });
            });

            let html = `
                <div class="page-header">
                    <h2 class="page-title">Squadre</h2>
                    <p class="muted">Tutte le squadre del Fantamattone</p>
                </div>
                <div class="teams-grid">
            `;

            squadre.forEach(squadra => {
                let badgesHtml = '';
                squadra.badgeKeys.slice(0, 3).forEach(badgeKey => {
                    const badge = appData.badgeByKey[badgeKey.toLowerCase()];
                    if (badge) {
                        badgesHtml += `<img class="team-grid-badge" src="${escapeHtml(badge.iconaSvgPath)}" alt="${escapeHtml(badge.nome)}" title="${escapeHtml(badge.nome)}" />`;
                    }
                });
                if (squadra.badgeKeys.length > 3) {
                    badgesHtml += `<span class="team-grid-badge-more">+${squadra.badgeKeys.length - 3}</span>`;
                }

                html += `
                    <a href="/squadre/${escapeHtml(squadra.id)}" class="team-grid-card">
                        ${renderTeamLogo(squadra)}
                        <div class="team-grid-name">${escapeHtml(squadra.nome)}</div>
                        ${badgesHtml ? `<div class="team-grid-badges">${badgesHtml}</div>` : ''}
                    </a>
                `;
            });

            html += '</div>';
            return html;
        } catch (error) {
            return renderError(error.message);
        }
    }

    function renderBadgesLista() {
        if (!appData) return renderLoading();

        try {
            let html = `
                <div class="page-header">
                    <h2 class="page-title">Badge</h2>
                    <p class="muted">Tutti i badge ottenibili nel Fantamattone</p>
                </div>
                <div class="badges-grid">
            `;

            appData.badge.forEach(badge => {
                const teamsCount = appData.squadre.filter(s => 
                    s.badgeKeys.some(bk => bk.toLowerCase() === badge.chiave.toLowerCase())
                ).length;

                html += `
                    <a href="/badge/${escapeHtml(badge.chiave)}" class="badge-grid-card">
                        <div class="badge-grid-icon">
                            <img src="${escapeHtml(badge.iconaSvgPath)}" alt="${escapeHtml(badge.nome)}" />
                        </div>
                        <div class="badge-grid-content">
                            <div class="badge-grid-title">${escapeHtml(badge.nome)}</div>
                            <div class="badge-grid-description">${escapeHtml(badge.descrizione)}</div>
                            <div class="badge-grid-count">${teamsCount} squadre</div>
                        </div>
                    </a>
                `;
            });

            html += '</div>';
            return html;
        } catch (error) {
            return renderError(error.message);
        }
    }

    function renderStagione(stagioneId) {
        if (!appData) return renderLoading();

        try {
            const stagione = appData.stagioniById[stagioneId.toLowerCase()];
            if (!stagione) {
                return renderError(`Stagione non trovata: '${stagioneId}'.`);
            }

            const edizioni = [...stagione.edizioni].sort((a, b) => {
                return a.competizioneKey.localeCompare(b.competizioneKey, undefined, { sensitivity: 'base' });
            });

            let html = `
                <div class="page-header">
                    <h2 class="page-title">Stagione ${escapeHtml(stagione.nome)}</h2>
                </div>
                <section class="section">
                    <h3 class="section-title">Competizioni</h3>
                    <ul class="simple-list">
            `;

            edizioni.forEach(e => {
                const comp = appData.competizioniByKey[e.competizioneKey.toLowerCase()];
                if (comp) {
                    html += `
                        <li class="simple-list-item">
                            <a href="/competizioni/${escapeHtml(comp.key)}/${escapeHtml(stagione.id)}">${escapeHtml(comp.nome)}</a>
                        </li>
                    `;
                }
            });

            html += '</ul></section>';
            return html;
        } catch (error) {
            return renderError(error.message);
        }
    }

    function renderCompetizione(compKey) {
        if (!appData) return renderLoading();

        try {
            const competizione = appData.competizioniByKey[compKey.toLowerCase()];
            if (!competizione) {
                return renderError(`Competizione non trovata: '${compKey}'.`);
            }

            const edizioni = [];
            appData.stagioni.forEach(stagione => {
                stagione.edizioni.forEach(edizione => {
                    if (edizione.competizioneKey.toLowerCase() === competizione.key.toLowerCase()) {
                        edizioni.push({ stagione, edizione });
                    }
                });
            });

            edizioni.sort((a, b) => {
                return b.stagione.nome.localeCompare(a.stagione.nome, undefined, { sensitivity: 'base' });
            });

            function getShortResultText(competizione, edizione) {
                if (competizione.tipo === 'Campionato') {
                    const primo = resolveTeams(edizione.risultati.primo || []);
                    const secondo = resolveTeams(edizione.risultati.secondo || []);
                    const terzo = resolveTeams(edizione.risultati.terzo || []);
                    const parts = [];
                    if (primo) parts.push(`1° ${primo}`);
                    if (secondo) parts.push(`2° ${secondo}`);
                    if (terzo) parts.push(`3° ${terzo}`);
                    return parts.length > 0 ? parts.join(' · ') : 'Risultati non disponibili';
                } else {
                    const vincitore = resolveTeams(edizione.risultati.vincitore || []);
                    const finalista = resolveTeams(edizione.risultati.finalista || []);
                    if (!vincitore && !finalista) return 'Risultati non disponibili';
                    return `V ${vincitore} · F ${finalista}`;
                }
            }

            function resolveTeams(ids) {
                if (!ids || ids.length === 0) return '';
                const names = ids.map(id => {
                    const team = appData.squadreById[id.toLowerCase()];
                    return team ? team.nome : id;
                });
                return names.join(', ');
            }

            let html = `
                <div class="page-header">
                    <h2 class="page-title">${escapeHtml(competizione.nome)}</h2>
                    ${competizione.descrizione ? `<p class="muted">${escapeHtml(competizione.descrizione)}</p>` : ''}
                </div>
                <section class="section">
                    <h3 class="section-title">Storico edizioni</h3>
            `;

            if (edizioni.length === 0) {
                html += '<p class="muted">Nessuna edizione trovata.</p>';
            } else {
                html += '<ul class="simple-list">';
                edizioni.forEach(({ stagione, edizione }) => {
                    html += `
                        <li class="simple-list-item">
                            <a href="/competizioni/${escapeHtml(competizione.key)}/${escapeHtml(stagione.id)}">${escapeHtml(stagione.nome)}</a>
                            <span class="muted"> — ${escapeHtml(getShortResultText(competizione, edizione))}</span>
                        </li>
                    `;
                });
                html += '</ul>';
            }

            html += '</section>';
            return html;
        } catch (error) {
            return renderError(error.message);
        }
    }

    function renderEdizione(compKey, stagioneId) {
        if (!appData) return renderLoading();

        try {
            const competizione = appData.competizioniByKey[compKey.toLowerCase()];
            if (!competizione) {
                return renderError(`Competizione non trovata: '${compKey}'.`);
            }

            const stagione = appData.stagioniById[stagioneId.toLowerCase()];
            if (!stagione) {
                return renderError(`Stagione non trovata: '${stagioneId}'.`);
            }

            const edizione = stagione.edizioni.find(e => 
                e.competizioneKey.toLowerCase() === competizione.key.toLowerCase()
            );

            if (!edizione) {
                return renderError(`Edizione non trovata: '${compKey}' in stagione '${stagioneId}'.`);
            }

            function renderPlacement(label, teamIds, iconPath) {
                if (!teamIds || teamIds.length === 0) {
                    return `
                        <div class="result-card">
                            <div class="result-card-header">
                                <img class="result-icon" src="${escapeHtml(iconPath)}" alt="${escapeHtml(label)}" />
                                <div class="result-label">${escapeHtml(label)}</div>
                            </div>
                            <div class="result-teams">
                                <div class="muted">-</div>
                            </div>
                        </div>
                    `;
                }

                let teamsHtml = '';
                teamIds.forEach(teamId => {
                    const team = appData.squadreById[teamId.toLowerCase()];
                    if (team) {
                        teamsHtml += `<a href="/squadre/${escapeHtml(team.id)}">${escapeHtml(team.nome)}</a>`;
                    } else {
                        teamsHtml += `<span>${escapeHtml(teamId)}</span>`;
                    }
                });

                return `
                    <div class="result-card">
                        <div class="result-card-header">
                            <img class="result-icon" src="${escapeHtml(iconPath)}" alt="${escapeHtml(label)}" />
                            <div class="result-label">${escapeHtml(label)}</div>
                        </div>
                        <div class="result-teams">
                            ${teamsHtml}
                        </div>
                    </div>
                `;
            }

            let html = `
                <nav class="back-link">
                    <a href="/competizioni/${escapeHtml(competizione.key)}">${escapeHtml(competizione.nome)}</a>
                    <span class="muted">›</span>
                    <span>${escapeHtml(stagione.nome)}</span>
                </nav>
                <div class="page-header">
                    <h2 class="page-title">${escapeHtml(competizione.nome)} ${escapeHtml(stagione.nome)}</h2>
                </div>
                <section class="section">
                    <h3 class="section-title">Risultati</h3>
                    <div class="results-grid">
            `;

            if (competizione.tipo === 'Campionato') {
                html += renderPlacement('1° Posto', edizione.risultati.primo, competizione.iconaVincitoreSvgPath);
                html += renderPlacement('2° Posto', edizione.risultati.secondo, competizione.iconaSecondoSvgPath);
                html += renderPlacement('3° Posto', edizione.risultati.terzo, competizione.iconaTerzoSvgPath);
            } else {
                html += renderPlacement('Vincitore', edizione.risultati.vincitore, competizione.iconaVincitoreSvgPath);
                html += renderPlacement('Finalista', edizione.risultati.finalista, competizione.iconaSecondoSvgPath);
            }

            html += '</div></section>';

            if (edizione.classifica && edizione.classifica.length > 0) {
                html += `
                    <section class="section">
                        <h3 class="section-title">Classifica</h3>
                        <div class="standings-table-wrap">
                            <table class="standings-table">
                                <thead>
                                    <tr>
                                        <th>#</th>
                                        <th>Squadra</th>
                                        <th>P</th>
                                        <th>G</th>
                                        <th>V</th>
                                        <th>N</th>
                                        <th>Per</th>
                                        <th>GF</th>
                                        <th>GS</th>
                                    </tr>
                                </thead>
                                <tbody>
                `;

                [...edizione.classifica].sort((a, b) => a.posizione - b.posizione).forEach(r => {
                    const team = appData.squadreById[r.squadraId.toLowerCase()];
                    html += `
                        <tr>
                            <td>${r.posizione}</td>
                            <td>${team ? `<a href="/squadre/${escapeHtml(team.id)}">${escapeHtml(team.nome)}</a>` : escapeHtml(r.squadraId)}</td>
                            <td>${r.punti !== null && r.punti !== undefined ? r.punti : '-'}</td>
                            <td>${r.giocate !== null && r.giocate !== undefined ? r.giocate : '-'}</td>
                            <td>${r.vinte !== null && r.vinte !== undefined ? r.vinte : '-'}</td>
                            <td>${r.pareggiate !== null && r.pareggiate !== undefined ? r.pareggiate : '-'}</td>
                            <td>${r.perse !== null && r.perse !== undefined ? r.perse : '-'}</td>
                            <td>${r.golFatti !== null && r.golFatti !== undefined ? r.golFatti : '-'}</td>
                            <td>${r.golSubiti !== null && r.golSubiti !== undefined ? r.golSubiti : '-'}</td>
                        </tr>
                    `;
                });

                html += '</tbody></table></div></section>';
            }

            if (edizione.immagineClassificaPath) {
                html += `
                    <section class="section">
                        <div class="standings-container">
                            <img class="standings-image"
                                 src="${escapeHtml(edizione.immagineClassificaPath)}"
                                 alt="Classifica ${escapeHtml(stagione.nome)} - ${escapeHtml(competizione.nome)}"
                                 onerror="this.style.display='none'; this.nextElementSibling.style.display='block';" />
                            <div class="standings-placeholder" style="display:none;">
                                <p>Immagine non disponibile</p>
                            </div>
                        </div>
                    </section>
                `;
            }

            return html;
        } catch (error) {
            return renderError(error.message);
        }
    }

    function renderSquadra(squadraId) {
        if (!appData) return renderLoading();

        try {
            const squadra = appData.squadreById[squadraId.toLowerCase()];
            if (!squadra) {
                return renderError(`Squadra non trovata: '${squadraId}'.`);
            }

            const trofeiByTeamId = buildTrofeiByTeamId(appData);
            const trofei = (trofeiByTeamId[squadra.id.toLowerCase()] || []).sort((a, b) => {
                const yearA = getSeasonStartYear(a.stagioneId);
                const yearB = getSeasonStartYear(b.stagioneId);
                if (yearA !== yearB) return yearB - yearA;
                return a.competizioneKey.localeCompare(b.competizioneKey, undefined, { sensitivity: 'base' });
            });

            function hasAlias() {
                return squadra.alias && squadra.alias.some(a => 
                    a.toLowerCase() !== squadra.nome.toLowerCase()
                );
            }

            function getDisplayAliases() {
                if (!squadra.alias) return [];
                return squadra.alias.filter(a => 
                    a.toLowerCase() !== squadra.nome.toLowerCase()
                );
            }

            function hasStaff() {
                return (squadra.presidente && squadra.presidente.trim()) ||
                       (squadra.dirigente && squadra.dirigente.trim()) ||
                       (squadra.allenatore && squadra.allenatore.trim());
            }

            function generatePersonId(name) {
                return name.toLowerCase()
                    .replace(/\s+/g, '-')
                    .replace(/'/g, '')
                    .replace(/\./g, '');
            }

            let html = `
                <div class="page-header">
                    <div class="team-header-centered">
                        ${renderTeamLogo(squadra)}
                        <h2 class="page-title">${escapeHtml(squadra.nome)}</h2>
            `;

            if (hasAlias()) {
                const aliases = getDisplayAliases().map(a => `EX ${escapeHtml(a)}`).join(' · ');
                html += `<div class="team-aliases">${aliases}</div>`;
            }

            html += '</div></div>';

            if (hasStaff()) {
                html += `
                    <section class="section">
                        <h3 class="section-title">Staff</h3>
                        <div class="staff-grid">
                `;

                if (squadra.presidente && squadra.presidente.trim()) {
                    html += `
                        <a href="/persone/${generatePersonId(squadra.presidente)}" class="staff-card">
                            <div class="staff-role">Presidente</div>
                            <div class="staff-name">${escapeHtml(squadra.presidente)}</div>
                        </a>
                    `;
                }

                if (squadra.dirigente && squadra.dirigente.trim()) {
                    html += `
                        <a href="/persone/${generatePersonId(squadra.dirigente)}" class="staff-card">
                            <div class="staff-role">Dirigente</div>
                            <div class="staff-name">${escapeHtml(squadra.dirigente)}</div>
                        </a>
                    `;
                }

                if (squadra.allenatore && squadra.allenatore.trim()) {
                    html += `
                        <a href="/persone/${generatePersonId(squadra.allenatore)}" class="staff-card">
                            <div class="staff-role">Allenatore</div>
                            <div class="staff-name">${escapeHtml(squadra.allenatore)}</div>
                        </a>
                    `;
                }

                html += '</div></section>';
            }

            if (squadra.badgeKeys && squadra.badgeKeys.length > 0) {
                html += `
                    <section class="section">
                        <h3 class="section-title">Badge</h3>
                        <div class="badges">
                `;

                squadra.badgeKeys.forEach(badgeKey => {
                    const badge = appData.badgeByKey[badgeKey.toLowerCase()];
                    if (badge) {
                        html += `
                            <a class="badge" href="/badge/${escapeHtml(badge.chiave)}" title="${escapeHtml(badge.nome)}">
                                <img class="badge-icon" src="${escapeHtml(badge.iconaSvgPath)}" alt="${escapeHtml(badge.nome)}" />
                            </a>
                        `;
                    }
                });

                html += '</div></section>';
            }

            html += `
                <section class="section">
                    <h3 class="section-title">Trofei</h3>
            `;

            if (trofei.length === 0) {
                html += '<p class="muted">Nessun trofeo registrato.</p>';
            } else {
                html += '<div class="trophies">';
                trofei.forEach(t => {
                    html += `
                        <a class="trophy-item"
                           href="/competizioni/${escapeHtml(t.competizioneKey)}/${escapeHtml(t.stagioneId)}"
                           title="${escapeHtml(t.competizioneNome)} ${escapeHtml(t.stagioneNome)}">
                            <img class="trophy-icon trophy-large" src="${escapeHtml(t.iconaSvgPath)}" alt="${escapeHtml(t.competizioneNome)}" />
                            <div class="trophy-season">${escapeHtml(t.stagioneNome)}</div>
                        </a>
                    `;
                });
                html += '</div>';
            }

            html += '</section>';
            return html;
        } catch (error) {
            return renderError(error.message);
        }
    }

    function renderBadge(badgeKey) {
        if (!appData) return renderLoading();

        try {
            const badge = appData.badgeByKey[badgeKey.toLowerCase()];
            if (!badge) {
                return renderError(`Badge non trovato: '${badgeKey}'.`);
            }

            const teamsWithBadge = appData.squadre.filter(t => 
                t.badgeKeys && t.badgeKeys.some(bk => bk.toLowerCase() === badge.chiave.toLowerCase())
            ).sort((a, b) => {
                return a.nome.localeCompare(b.nome, undefined, { sensitivity: 'base' });
            });

            let html = `
                <div class="badge-info">
                    <div class="badge-image-container">
                        <img src="${escapeHtml(badge.iconaSvgPath)}" alt="${escapeHtml(badge.nome)}" class="badge-image" />
                    </div>
                    <div class="badge-description">
                        <h3>${escapeHtml(badge.nome)}</h3>
                        <p>${escapeHtml(badge.descrizione)}</p>
                    </div>
                </div>
                <section class="section">
                    <h3 class="section-title">Squadre con questo badge</h3>
            `;

            if (teamsWithBadge.length === 0) {
                html += '<p class="muted">Nessuna squadra possiede questo badge.</p>';
            } else {
                html += '<ul class="badge-teams-list">';
                teamsWithBadge.forEach(team => {
                    html += `
                        <li class="badge-team-item">
                            ${renderTeamLogo(team, true)}
                            <div class="badge-team-name">
                                <a href="/squadre/${escapeHtml(team.id)}">${escapeHtml(team.nome)}</a>
                            </div>
                        </li>
                    `;
                });
                html += '</ul>';
            }

            html += '</section>';
            return html;
        } catch (error) {
            return renderError(error.message);
        }
    }

    function renderPersona(personId) {
        if (!appData) return renderLoading();

        try {
            let personName = personId.replace(/-/g, ' ');
            personName = personName.split(' ').map(word => 
                word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
            ).join(' ');

            function generateId(name) {
                return name.toLowerCase()
                    .replace(/\s+/g, '-')
                    .replace(/'/g, '')
                    .replace(/\./g, '');
            }

            function matchesName(storedName, searchName) {
                if (!storedName || !storedName.trim()) return false;
                return storedName.toLowerCase() === searchName.toLowerCase() ||
                       generateId(storedName).toLowerCase() === personId.toLowerCase();
            }

            function getInitials(name) {
                const parts = name.split(' ').filter(p => p);
                if (parts.length === 0) return '?';
                if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
                return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
            }

            const roles = [];
            appData.squadre.forEach(squadra => {
                if (matchesName(squadra.presidente, personName)) {
                    roles.push({ squadraId: squadra.id, squadra: squadra, ruolo: 'Presidente' });
                }
                if (matchesName(squadra.dirigente, personName)) {
                    roles.push({ squadraId: squadra.id, squadra: squadra, ruolo: 'Dirigente' });
                }
                if (matchesName(squadra.allenatore, personName)) {
                    roles.push({ squadraId: squadra.id, squadra: squadra, ruolo: 'Allenatore' });
                }
            });

            let html = `
                <div class="page-header">
                    <div class="person-header">
                        <div class="person-photo">
                            <div class="person-photo-placeholder">
                                <span>${getInitials(personName)}</span>
                            </div>
                        </div>
                        <h2 class="page-title">${escapeHtml(personName)}</h2>
                    </div>
                </div>
            `;

            if (roles.length > 0) {
                html += `
                    <section class="section">
                        <h3 class="section-title">Ruoli</h3>
                        <div class="person-roles">
                `;

                roles.forEach(role => {
                    html += `
                        <a href="/squadre/${escapeHtml(role.squadraId)}" class="person-role-card">
                            ${renderTeamLogo(role.squadra, true)}
                            <div class="person-role-info">
                                <div class="person-role-team">${escapeHtml(role.squadra.nome)}</div>
                                <div class="person-role-title">${escapeHtml(role.ruolo)}</div>
                            </div>
                        </a>
                    `;
                });

                html += '</div></section>';
            }

            return html;
        } catch (error) {
            return renderError(error.message);
        }
    }

    // ============================================
    // ROUTING
    // ============================================
    const routes = {
        '/': renderIndex,
        '/stagioni': renderStagioniLista,
        '/stagioni/:id': (params) => renderStagione(params.id),
        '/competizioni': renderCompetizioniLista,
        '/competizioni/:key': (params) => renderCompetizione(params.key),
        '/competizioni/:key/:stagioneId': (params) => renderEdizione(params.key, params.stagioneId),
        '/squadre': renderSquadreLista,
        '/squadre/:id': (params) => renderSquadra(params.id),
        '/badges': renderBadgesLista,
        '/badge/:key': (params) => renderBadge(params.key),
        '/persone/:id': (params) => renderPersona(params.id)
    };

    function findRoute(path) {
        path = getRouteFromPath(path);
        
        // Exact match
        if (routes[path]) {
            return { handler: routes[path], params: {} };
        }

        // Pattern match
        const pathParts = path.split('/').filter(p => p);
        for (const [routePattern, handler] of Object.entries(routes)) {
            const patternParts = routePattern.split('/').filter(p => p);
            if (pathParts.length !== patternParts.length) continue;

            const params = {};
            let match = true;
            for (let i = 0; i < patternParts.length; i++) {
                if (patternParts[i].startsWith(':')) {
                    params[patternParts[i].substring(1)] = pathParts[i];
                } else if (patternParts[i] !== pathParts[i]) {
                    match = false;
                    break;
                }
            }

            if (match) {
                return { handler, params };
            }
        }

        return null;
    }

    async function navigate(path) {
        currentRoute = getRouteFromPath(path);
        const pageContent = document.getElementById('page-content');
        if (!pageContent) return;

        pageContent.innerHTML = renderLoading();

        try {
            if (!appData) {
                await loadData();
            }

            const route = findRoute(path);
            if (!route) {
                pageContent.innerHTML = renderError('Pagina non trovata');
                document.title = 'Not found - Albo Fantamattone';
                return;
            }

            let html;
            if (typeof route.handler === 'function') {
                if (Object.keys(route.params).length > 0) {
                    html = route.handler(route.params);
                } else {
                    html = route.handler();
                }
            } else {
                html = renderError('Handler non valido');
            }

            pageContent.innerHTML = html;

            // Update active nav link
            document.querySelectorAll('.nav-link').forEach(link => {
                link.classList.remove('active');
                const linkRoute = link.getAttribute('data-route');
                if (linkRoute && (linkRoute === currentRoute || (linkRoute === '/' && currentRoute === '/'))) {
                    link.classList.add('active');
                }
            });

            // Update title
            const titleMatch = html.match(/<h2[^>]*class="page-title"[^>]*>(.*?)<\/h2>/);
            if (titleMatch) {
                document.title = titleMatch[1].replace(/<[^>]*>/g, '') + ' - Albo Fantamattone';
            } else {
                document.title = 'Albo Fantamattone';
            }

            // Scroll to top
            window.scrollTo(0, 0);
        } catch (error) {
            console.error('Errore nella navigazione:', error);
            pageContent.innerHTML = renderError(error.message || 'Errore sconosciuto');
        }
    }

    // ============================================
    // GESTIONE TEMA
    // ============================================
    function initTheme() {
        const themeToggle = document.querySelector('.theme-toggle');
        const themeDot = document.querySelector('.theme-dot');
        
        if (!themeToggle || !themeDot) return;

        function updateTheme() {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
            themeDot.classList.remove('dark', 'light');
            themeDot.classList.add(newTheme);
        }

        themeToggle.addEventListener('click', updateTheme);

        // Set initial theme dot position
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
        themeDot.classList.add(currentTheme);
    }

    // ============================================
    // GESTIONE MENU MOBILE
    // ============================================
    function initMobileMenu() {
        const mobileToggle = document.querySelector('.mobile-toggle');
        const navbarMenu = document.querySelector('.navbar-menu');
        const hamburger = document.querySelector('.hamburger');

        if (!mobileToggle || !navbarMenu || !hamburger) return;

        function toggleMenu() {
            mobileMenuOpen = !mobileMenuOpen;
            if (mobileMenuOpen) {
                navbarMenu.classList.add('open');
                hamburger.classList.add('open');
            } else {
                navbarMenu.classList.remove('open');
                hamburger.classList.remove('open');
            }
        }

        function closeMenu() {
            mobileMenuOpen = false;
            navbarMenu.classList.remove('open');
            hamburger.classList.remove('open');
        }

        mobileToggle.addEventListener('click', toggleMenu);

        // Close menu when clicking on a link
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', closeMenu);
        });

        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (mobileMenuOpen && 
                !navbarMenu.contains(e.target) && 
                !mobileToggle.contains(e.target)) {
                closeMenu();
            }
        });
    }

    // ============================================
    // GESTIONE LINK
    // ============================================
    function initLinks() {
        document.addEventListener('click', (e) => {
            const link = e.target.closest('a');
            if (!link) return;

            const href = link.getAttribute('href');
            if (!href) return;

            // External links or anchors
            if (href.startsWith('http') || href.startsWith('mailto:') || href.startsWith('#')) {
                return;
            }

            // Check if it's a route we handle
            const path = normalizePath(href);
            const route = findRoute(path);
            if (route) {
                e.preventDefault();
                window.history.pushState({}, '', href);
                navigate(path);
            }
        });
    }

    // ============================================
    // INIZIALIZZAZIONE
    // ============================================
    function init() {
        initTheme();
        initMobileMenu();
        initLinks();

        // Handle browser back/forward
        window.addEventListener('popstate', () => {
            navigate(window.location.pathname);
        });

        // Initial navigation
        navigate(window.location.pathname);
    }

    // Start app when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();

