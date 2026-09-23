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
scrive un GPX con i suoi controlli. L'app per telefono esiste e si apre
con Expo Go, ma per ora mostra solo le forme disponibili.

## Prossimo passo

**TASK-021 — Mappa + posizione GPS.** Il file del task è da scrivere, sul
branch `docs/TASK-021-task-file` (già aperto); va decisa prima ADR-0011
(mappa e tile). Vincolo da sapere: l'utente prova su
**iPhone** da un **PC Windows**, con strumenti gratuiti. MapLibre per React
Native richiede una *development build*, e su un iPhone vero questa chiede
un Mac o EAS con un account Apple Developer a pagamento. Funzionano invece
in Expo Go `react-native-maps` (su iOS usa Apple Maps) o una WebView con
una mappa web e tile OSM, come l'anteprima di TASK-019.

## In lavorazione

Niente.

## Completato

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
  (già fatto).
- Il disco C: di questo PC è quasi pieno (2 GB liberi il 2026-09-23): Expo
  si ferma con `ENOSPC` quando finisce lo spazio.
- Le partenze delle tre zone sono in `docs/TESTING.md`.
- Nella versione app la partenza sarà la posizione GPS del dispositivo
  (fase 2); le zone fisse servono solo a confrontare le prove.
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
