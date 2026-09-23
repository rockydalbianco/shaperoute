# STATUS — Dove siamo adesso

> **Unica fonte di verità sullo stato del progetto.**
> Primo file da leggere in ogni sessione, ultimo da aggiornare a fine task.
> Se è disallineato dalla realtà, tutto il resto del sistema smette di
> funzionare: aggiornarlo non è burocrazia, è la parte che regge il metodo.

**Ultimo aggiornamento**: 2026-09-23 · **Fase corrente**: 2 — App e API

---

## In una riga

Il route engine, da riga di comando, disegna cuori e cerchi riconoscibili
su strade reali (Trento e Milano bene, Levico quasi, valle sospesa) e
scrive un GPX con i suoi controlli. L'app, in Expo Go sull'iPhone, mostra
la mappa sulla posizione GPS o su un luogo cercato. L'API sul PC calcola i
percorsi e risponde anche dal telefono, ma l'app non la chiama ancora.

## Prossimo passo

**TASK-023 — Collegamento app ↔ API, anteprima percorso.** Il file del
task è da scrivere (`docs/tasks/`, branch `docs/TASK-023-task-file`). Da
decidere lì: come l'app conosce l'indirizzo dell'API sul PC, scelta di
forma e distanza, attesa e messaggi per ogni `code` di errore (domande
aperte in `UI.md`), e se servono richieste in due tempi (ADR-0030).

## In lavorazione

Niente.

## Completato

- **TASK-022** — API FastAPI in `services/api/`: `POST /routes` e
  `GET /health`, errori con un codice, grafi di zona in memoria senza
  ritagli salvati, 7–32 s per percorso; ADR-0009 rinviata alla fase 4
  (ADR-0030). Provata dall'iPhone.
- **TASK-021** — Mappa MapLibre GL JS in WebView con tile OpenFreeMap,
  posizione GPS con `expo-location` e, senza posizione, ricerca di città o
  via con Photon (ADR-0029). Provata sull'iPhone.
- **TASK-020** — Monorepo npm con `apps/mobile` (Expo SDK 57, una
  schermata) e `packages/shared-types` (contratto in TypeScript, allineato
  al Python da test); job `mobile` in CI (ADR-0028). Provata sull'iPhone.
- **Fase 1 — Route engine** (TASK-010–019): CLI e GPX; forme circle e
  heart; snapping su OSMnx con zone e corridoio (ADR-0022); ottimizzatore
  che ruota, scala e sposta la partenza fino a 500 m (ADR-0023, ADR-0025);
  validazione con ripercorso e percorribilità (ADR-0026); anteprima dei
  campioni su mappa (ADR-0024). Cancello superato con la valle sospesa
  (ADR-0027).
- **TASK-001** — Repository pubblico, `main` protetto da PR obbligatoria.

## Bloccato

Niente.

## Note per la prossima sessione

- Setup locale del route-engine: in `services/route-engine/`,
  `python -m venv .venv` e `pip install -e ".[dev]"`.
- In cache ci sono i grafi `foot` di zona di trento, levico, valsugana e
  milano (ADR-0023): tutti i casi girano offline. Da questo PC un indirizzo
  di `overpass-api.de` non risponde: prima di scaricare, leggere `MAPS.md`,
  "Overpass: come si scarica".
- Per misurare sui casi di riferimento (in `services/route-engine/`):
  `python tests/measure_optimizer.py` (ottimizzatore, `--no-optimize` per
  TASK-017) e `python tests/measure_snapping.py` (solo snapping).
- Fuori scope di TASK-016, annotati: tag `surface`, `sac_scale` e
  `sidewalk` (serve riscaricare i grafi), ed evitare scale e strade
  principali nella ricerca (oggi si misurano e si avvisa soltanto).
- In sospeso, piccoli: dichiarare `numpy` in `pyproject.toml` (lo usa già il
  motore, arriva con osmnx: nulla da installare); in fase 2, far scegliere
  all'utente fra più percorsi alternativi (la ricerca li ha già).
- La Valsugana è sospesa su richiesta dell'utente: cuore e cerchio da 5 km
  lì non sono disponibili (ADR-0025, ADR-0027).
- matplotlib non è una dipendenza: per guardare le forme basta uno script
  usa-e-getta fuori dal repository.
- Con latitudine negativa serve la forma `--start=-33.9,18.4`: argparse
  scambia `-33.9,...` per un'opzione.
- App: dalla radice `npm install`, poi `npm run mobile` e il QR con la
  Fotocamera dell'iPhone (`SETUP.md`, passo 9). In PowerShell di questo PC
  si scrive `npm.cmd` al posto di `npm` (script bloccati). Sull'iPhone
  Expo Go vuole l'accesso con lo stesso account Expo sul PC e sul telefono
  (già fatto); il permesso di posizione è di Expo Go (`SETUP.md`, 9.4).
- API: dalla radice `services\api\.venv\Scripts\python.exe -m
  shaperoute_api --lan` (`SETUP.md`, passo 10); risponde anche su `/docs`.
- Il disco C: di questo PC è quasi pieno (1,3 GB liberi il 2026-09-23):
  Expo si ferma con `ENOSPC` quando finisce lo spazio. In `data/cache/`
  ci sono ritagli salvati dalla CLI che si possono togliere a mano.
- Le partenze delle tre zone sono in `docs/TESTING.md`.
- Nell'app la partenza è la posizione GPS o un luogo cercato (`UI.md`);
  le zone fisse servono solo a confrontare le prove.
- Il repository è pubblico: nessun segreto nei file, mai. Le chiavi stanno
  solo in `.env`, che non entra nel repository.

---

## Come si aggiorna

A fine task, in un solo commit dentro la stessa PR:

1. Sposta il task da **In lavorazione** a **Completato**, con una riga di
   esito: cosa funziona adesso che prima non funzionava.
2. Riscrivi **Prossimo passo** con un solo task.
3. Aggiorna **In una riga**.
4. Svuota o aggiorna **Note per la prossima sessione**.

Tenere breve questo file è parte del lavoro: è quello che si paga in ogni
sessione. Lo storico sta nei commit e nelle PR, non qui. Se **Completato**
supera una decina di righe, si condensa per fase.
