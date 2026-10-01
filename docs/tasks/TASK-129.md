# TASK-129 — «Explore» per ogni città, e percorsi a tema con tappe vere

**Stato**: In revisione
**Fase**: 4 · **Branch**: `feat/TASK-129-explore-themes`

Chiesto dall'utente il 2026-10-01: cercare qualsiasi città in «Explore» e
chiedere un percorso in parole («romantico a Parigi», «gastronomico a
Tokyo»), con luoghi veri e verificati; «forma + tappe» (scelta dell'utente).
Senza toccare ciò che già funziona.

## Obiettivo

Da «Explore» si sceglie una città qualsiasi e si chiede un percorso a tema:
una forma del catalogo che passa dai luoghi veri del tema, sulla mappa.

## Contesto da leggere

- ADR-0097, ADR-0098, ADR-0099; `docs/API.md` (`/places`, `/route-jobs`)
- `docs/UI.md` («Explore»), `docs/AI.md`, `docs/MAPS.md` (Overpass)

## Cosa fare

1. API: `GET /cities`; `POST/GET /themed-route-jobs` (tabelle, AI per il
   tema, luoghi da Geoapify Places, il motore).
2. Motore: `stops.py`, la forma da partenze fra i luoghi.
3. App: «City» e «Ask for a route» in «Explore»; il percorso coi luoghi
   sulla mappa.
4. Prove reali: New York, Torino, Parigi, Tokyo, una città fuori catalogo.

## Criteri di accettazione

- [x] «Explore» di prima funziona come prima: i suoi test non cambiano.
- [x] Nessun luogo inventato: solo OpenStreetMap, e se sono pochi lo dice.
- [x] L'AI solo per il tema, vincolata; prima le tabelle.
- [x] Test deterministici (motore, API, AI, app); lint e tipi puliti.
- [x] Prove reali annotate qui sotto.

## File toccati

```
services/route-engine/route_engine/stops.py
services/route-engine/tests/test_stops.py
services/api/shaperoute_api/themes.py
services/api/shaperoute_api/themed.py
services/api/shaperoute_api/cities.py
services/api/shaperoute_api/app.py
services/api/shaperoute_api/__main__.py
services/api/tests/test_themed.py
services/api/tests/fixtures/geoapify-places-bologna.json
services/api/tests/fixtures/geoapify-city-milano.json
services/ai/shaperoute_ai/theme_reading.py
services/ai/tests/test_theme_reading.py
packages/shared-types/fixtures/themed-route-job-done.json
packages/shared-types/fixtures/themed-route-job-failed.json
apps/mobile/App.tsx
apps/mobile/src/explore/*
apps/mobile/src/map/MapView.tsx
apps/mobile/src/map/mapPage.ts
apps/mobile/src/map/mapStyle.ts
apps/mobile/src/map/messages.ts
apps/mobile/src/map/messages.test.ts
apps/mobile/src/theme/tokens.ts
docs/API.md
docs/UI.md
docs/AI.md
docs/DECISIONS.md
docs/STATUS.md
docs/tasks/TASK-129.md
docs/tasks/TASK-127.md   (solo lo stato: Done, dopo il merge di #127)
```

## Fuori scope

- Overpass affidabile da questo Mac (TASK-127) e più città nel catalogo
  (TASK-128).
- Pesare i luoghi dentro la ricerca dell'ottimizzatore.
- «Start» con le svolte sui percorsi a tema.

## Esito

Prove reali (API del branch, 2026-10-01):

| Richiesta | Esito |
|---|---|
| «voglio un percorso romantico a Torino» | cuore 9,6 km, 0,97; Giardini Reali, Palazzo Solaro del Borgo, Palazzo Turinetti (3 di 5); 9 s |
| «un giro per innamorati a Bologna» | letto dall'AI: romantico; cuore 9,3 km, 0,98; 4 giardini di 12; 11 s |
| «a sightseeing tour in Bologna» | stella 9,7 km, 0,96; 9 di 15 (Piazza Maggiore, il Nettuno…); 3 s |
| «luoghi famosi a Milano» | stella 9,9 km, 1,00; Duomo e Battistero (4 di 15); 5 s |
| «giro gastronomico a Roma, 8 km» | cerchio 7,2 km, 0,91; 5 locali di 15; 4 s |
| «un giro nella natura a Caldonazzo» (fuori catalogo) | `no_places`: 1 solo luogo verificato, detto |
| «percorso turistico a New York» (con TASK-127) | stella 9,8 km, 0,99; 7 di 15: One World Trade Center, One World Observatory, Soldiers' Monument…; 319 s, quasi tutti di download |
| Parigi famosi, Tokyo gastronomico (con TASK-127) | città e luoghi trovati (Notre-Dame; ramen a Tokyo); il percorso no: dopo i download di New York Overpass ha smesso di accettare connessioni da entrambi gli indirizzi (il limite di MAPS.md). Da qui una sola zona per tutte le partenze (`prepare`), non una per partenza: da riprovare quando Overpass riapre |
