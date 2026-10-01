# TASK-131 — «Explore»: città → categoria → percorso

**Stato**: In revisione
**Fase**: 4 · **Branch**: `feat/TASK-131-explore-ux`

Chiesto dall'utente il 2026-10-01: città predefinite in alto, «Type a
city» con suggerimenti, esempi per città, categorie in «Ask for a route»
(Food per prima), meno passaggi; niente di ciò che funziona va rotto.

## Obiettivo

Da «Explore» un percorso a tema si chiede in due tocchi: una città, una
categoria.

## Contesto da leggere

- ADR-0099, ADR-0102; `docs/UI.md` («Explore»), `docs/API.md` (`/cities`)

## Cosa fare

1. API: `GET /city-suggestions`; otto temi nuovi per le categorie.
2. App: città recenti e in evidenza, «Type a city» con suggerimenti,
   categorie da toccare, esempi per la città.
3. Prove: New York, Torino, Parigi, una città scritta a mano.

## Criteri di accettazione

- [x] Un tocco su una città la sceglie; un tocco su una categoria chiede il
      percorso per quella città.
- [x] I suggerimenti arrivano mentre si scrive, per città del mondo.
- [x] Il campo libero e l'elenco dei percorsi consigliati restano.
- [x] Test verdi (app 534, API 316, AI 35); lint, tipi e formattazione.
- [x] Prove dal vivo annotate.

## File toccati

```
services/api/shaperoute_api/themes.py
services/api/shaperoute_api/cities.py
services/api/shaperoute_api/app.py
services/api/tests/test_explore_categories.py
services/ai/shaperoute_ai/theme_reading.py
apps/mobile/App.tsx
apps/mobile/src/explore/ExploreScreen.tsx
apps/mobile/src/explore/ExploreTools.tsx
apps/mobile/src/explore/ExploreTools.test.tsx
apps/mobile/src/explore/cities.ts
apps/mobile/src/explore/presets.ts
apps/mobile/src/explore/presets.test.ts
apps/mobile/src/explore/recentCities.ts
docs/API.md
docs/UI.md
docs/DECISIONS.md
docs/STATUS.md
docs/tasks/TASK-131.md
```

## Fuori scope

- Preferiti, suggerimenti personali per utente (servono gli account).
- La prova sull'iPhone: dopo merge e `eas update`.

## Esito

Dall'API del branch, come fa l'app (2026-10-01):

| Città → categoria | Esito |
|---|---|
| New York (tocco) → Food | cerchio 10,0 km, 1,00; 3 ristoranti; 3 s |
| New York → Famous Places | stella 9,8 km, 0,99; 9 di 15 (One World Trade Center…); 12 s |
| Torino (tocco) → Romantic | cuore 9,6 km, 0,97; Giardini Reali e due palazzi; 12 s |
| Torino → Best Views | cerchio 9,8 km, 0,99; 3 giardini; 7 s |
| «Par» → Paris → Famous Places | suggerimenti ok; percorso `map_data_unavailable`: Overpass rifiuta da questo Mac (dopo i download del giorno) |
| «Bolo» → Bologna → Culture | stella 9,4 km, 0,98; 7 musei; 8 s |
| Bologna → Hidden Gems | stella 10,6 km, 0,92; 9 luoghi; 5 s |
| «Mila» → Milan → Nightlife | luna 10,1 km, 0,98; 8 locali; 11 s |
