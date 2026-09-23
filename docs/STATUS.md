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
scrive un GPX con i suoi controlli. Dall'iPhone, con l'API sul PC, si
sceglie forma e distanza e il percorso compare sulla mappa: 3–10 km nelle
zone in cache in 5–25 s, 15 km in circa 30 s, con l'attesa che dice cosa
succede. Le zone nuove dipendono da Overpass, che da questo PC risponde
solo a volte (`MAPS.md`).

## Prossimo passo

**TASK-024 — Export e condivisione GPX dal telefono.** Il file del task è
da scrivere (`docs/tasks/`, branch `docs/TASK-024-task-file`). Il GPX oggi
lo scrive solo la CLI (`route_engine/export_gpx.py`, `GPX.md`). Da decidere
lì: chi scrive il GPX per l'app (l'API, riusando l'export del motore, o
l'app), come il telefono lo salva o lo condivide (foglio di condivisione di
iOS, file), e l'attribuzione OSM nel GPX (`MAPS.md`, «Ancora aperto»). Dopo:
la distanza libera (TASK-026); la forma libera in fase 4 (`ROADMAP.md`).

## In lavorazione

Niente. PR di TASK-025 da aprire: il criterio della CI verde si spunta lì.

## Completato

- **Fase 2 finora** (TASK-020–025): monorepo npm con app Expo e
  `shared-types` (ADR-0028); mappa MapLibre GL JS in WebView con posizione
  GPS e ricerca del luogo (ADR-0029); API FastAPI con grafi di zona in
  memoria (ADR-0030); app che chiede i percorsi, li disegna e spiega ogni
  errore (ADR-0031); richieste in due tempi con stati, per 15 km e zone
  nuove (ADR-0032). Tutto provato sull'iPhone.
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
- Motore lento sui 15 km: circa 50 s di calcolo e 14 s per ritagliare la
  zona anche dalla memoria (TASK-023, «Limiti misurati»). Le richieste in
  due tempi lo rendono sopportabile, non veloce: `PRODUCT.md` chiede al
  massimo 30 s.
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
- Il disco C: di questo PC è quasi pieno (1,1 GB liberi il 2026-09-23;
  ogni zona nuova scaricata vale circa 40 MB, più le risposte di Overpass
  in `data/cache/http/`, già 244 MB):
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
