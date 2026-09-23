# TASK-020 — Bootstrap monorepo, mobile Expo, shared-types

**Stato**: Done
**Fase**: 2 · **Branch**: `feat/TASK-020-mobile-bootstrap`

## Obiettivo

L'app ShapeRoute si apre sul telefono dell'utente (Expo Go) e mostra una
schermata che legge le forme disponibili da `packages/shared-types`; lint,
tipi e test dell'app girano in locale e in CI.

## Contesto da leggere

- `docs/ARCHITECTURE.md` §2 (albero), §3 (contratto), §4 (dipendenze)
- `docs/DECISIONS.md` ADR-0016 (contratto del route-engine), ADR-0027
- `docs/TESTING.md`, «Test automatici» e «CI»
- `services/route-engine/route_engine/models.py` (da rispecchiare in TS)

## Cosa c'è già

Solo Python: `services/route-engine` e `tools/`. Nessun `package.json`;
`.gitignore` ignora già `node_modules/` e `.expo/`. Sul PC ci sono Node 24
e npm 11; pnpm e yarn no.

## Cosa fare

1. **Confermato dall'utente il 2026-09-23**: A, B e C come proposte,
   purché tutto sia aperto e gratuito (lo è: npm, Expo, ESLint, Prettier,
   Jest e Testing Library hanno licenza MIT):
   - **A. Monorepo**: workspace di **npm** (già installato), un solo
     `package.json` alla radice con `apps/*` e `packages/*`, un solo
     `package-lock.json`, **Node 24** in `.nvmrc` ed `engines`. Niente
     pnpm, yarn o Turborepo: con due pacchetti non servono. Expo riconosce
     da solo i workspace npm, senza configurare Metro a mano.
   - **B. App e tipi**:
     - app creata con `create-expo-app`, template **`blank-typescript`**,
       SDK stabile più recente (Expo Go sul telefono apre solo quella),
       `strict` attivo; **senza expo-router**: la navigazione si sceglie
       quando ci sono le schermate (TASK-021, TASK-023);
     - `@shaperoute/shared-types`: solo TypeScript, **senza build** (Metro e
       `tsc` leggono i sorgenti). Contiene `RouteRequest`, `RouteResult`,
       forme, attività e limiti di distanza copiati a mano da `models.py`,
       **con gli stessi nomi dei campi** (`distance_m`, snake_case) perché
       l'API li passerà senza conversioni;
     - controllo di allineamento: un JSON di esempio in
       `packages/shared-types/fixtures/` è tipato da TypeScript
       (`satisfies RouteResult`) e letto da un test del route-engine che ne
       confronta i campi con le dataclass. Se uno dei due lati cambia, un
       test fallisce.
   - **C. Strumenti** (nuove dipendenze di sviluppo, solo in `devDependencies`):
     - lint: **ESLint** con `eslint-config-expo` (`expo lint`);
     - formato: **Prettier**, l'equivalente di `black`;
     - test: **Jest** con `jest-expo` e `@testing-library/react-native`;
     - tipi: `tsc --noEmit` su tutti i workspace;
     - CI: un job `mobile` in `.github/workflows/ci.yml` (Node 24, cache
       npm, `npm ci`, lint, formato, tipi, test).
2. **Monorepo**: `package.json` radice con gli script `lint`, `format`,
   `typecheck`, `test`, `mobile` (avvia Expo), `.nvmrc`.
3. **`packages/shared-types`**: tipi, costanti e il JSON di esempio.
4. **`apps/mobile`**: app dal template, una sola schermata: titolo
   «ShapeRoute» e l'elenco delle forme preso da `shared-types`. Nessuna
   mappa, nessuna chiamata di rete.
5. **Test**: uno smoke test Jest che renderizza la schermata e trova le
   forme; il test Python di allineamento (`tests/test_contract.py` nel
   route-engine).
6. **CI** come al punto C. Il controllo `mobile` si aggiunge a mano alle
   regole di `main` su GitHub dopo il primo giro (`SETUP.md`, passo 7.3).
7. **Documentazione**: `SETUP.md` (installare Node, Expo Go sul telefono,
   `npm install`, `npm run mobile`), `README.md` «Provarlo»,
   `ARCHITECTURE.md` §3 (dove vivono i tipi), `TESTING.md` (test TS),
   ADR per le scelte confermate, `STATUS.md`.

## Criteri di accettazione

- [x] Dalla radice, `npm install` e poi `npm run lint`, `npm run typecheck`
      e `npm test` passano, offline dopo l'installazione.
- [x] `npm run mobile` avvia Expo; l'utente apre l'app con Expo Go sul
      telefono e vede «ShapeRoute» con `circle` e `heart`: visto
      sull'iPhone dell'utente il 2026-09-23. Il bundle Android si genera
      (`expo export`) ed `expo-doctor` passa 21 controlli su 21.
- [x] Cambiare un campo in `models.py` senza cambiare il JSON di esempio, o
      viceversa, fa fallire un test (provato a mano: un campo rinominato nel
      JSON rompe `tsc`, una distanza fuori limite rompe `test_contract.py`).
- [ ] Il job `mobile` della CI è verde sulla PR; `route-engine` resta
      verde: **da vedere sulla PR**.
- [x] `services/route-engine` non dipende da nulla di Node: `pip install`
      e `pytest -m "not network"` funzionano come prima.
- [x] `SETUP.md` (passo 9), `README.md`, `ARCHITECTURE.md`, `TESTING.md`,
      `STATUS.md` aggiornati; ADR-0028.

Differenze dal piano: i test di `shared-types` usano `node --test` invece
di Jest, con `@types/node`; `test-renderer` è fermo a ~1.2 e React ha un
`overrides` alla radice (ADR-0028, conseguenza); via dal template i file
per agenti AI e la licenza di Expo.

## File toccati

```
package.json
package-lock.json
.nvmrc
.prettierrc.json
apps/mobile/**
packages/shared-types/**
services/route-engine/tests/test_contract.py
.github/workflows/ci.yml
README.md
docs/SETUP.md
docs/ARCHITECTURE.md
docs/TESTING.md
docs/DECISIONS.md
docs/STATUS.md
```

## Fuori scope

- Mappa e provider di tile (TASK-021, ADR-0011). Da sapere già ora:
  MapLibre in React Native richiede una *development build*, non basta
  Expo Go; si decide lì.
- API e chiamate di rete (TASK-022); generare i tipi dall'OpenAPI
  dell'API è una scelta di TASK-022.
- Navigazione, tema grafico, icone, splash, traduzioni.
- `packages/geometry` e `packages/config`: si creano quando servono
  (ARCHITECTURE §2).
- Build per gli store, EAS, account Expo.
- Spostare i modelli Python in `packages/`: il route-engine resta
  installabile da solo.

## Esito

L'app si apre sull'iPhone con Expo Go e legge le forme dal contratto
condiviso; lint, formato, tipi e test girano dalla radice e in CI. Emerso
provandola: su iPhone Expo Go vuole l'accesso con lo stesso account Expo
sul PC e sul telefono, PowerShell blocca `npm` (si usa `npm.cmd`) e con il
disco pieno Expo si ferma: tutto annotato in `SETUP.md`, passo 9. Per
TASK-021: MapLibre non gira in Expo Go (vedi `STATUS.md`).
