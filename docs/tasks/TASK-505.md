# TASK-505 — L'animazione iniziale e i file del video: le due scelte dell'utente

**Stato**: Proposto · parte 0 (questa PR, soli documenti), scelte
dell'utente fatte il 2026-11-23; prossima la parte A, quando il
Coordinatore dà il via sulla lista dei file
**Fase**: 5 · **Branch**: `docs/TASK-505-intro-video-assets` (parte 0), poi
`feat/TASK-505-a-short-intro`
**ADR**: ADR-0405 · numeri dal Coordinatore (fork 3), 2026-11-23

## Obiettivo

Chi apre MuW tutti i giorni non aspetta 2,7 secondi a ogni apertura:
l'animazione del cuore resta intera la prima volta e dopo una versione
nuova, e le altre volte dura un secondo e si chiude con un tocco.

## Da dove viene

La lettura del codice del 2026-11-23 (quindici proposte, O1–O15; l'utente:
«Sì, tutte»). O6 e O15 sono scelte di prodotto, non delegate: questo task
le ha fatte decidere all'utente prima di scrivere codice.

## Contesto da leggere

- ADR-0147 (`grep -n "ADR-0147" docs/archive/DECISIONS-fino-al-2026-11.md`):
  l'animazione all'avvio, i suoi tempi, «non si salta con un tocco».
- ADR-0405: le due scelte e il come.
- `apps/mobile/src/intro/LaunchIntro.tsx`, `Root.tsx`;
  `apps/mobile/src/tour/tourSeen.ts` (come il telefono ricorda una cosa
  vista: un file letto subito, senza attese).

## Verificato su `main` (8c917647, 2026-11-23)

- **O6**: `LaunchIntro.tsx` ha `INTRO_MS = { wait: 350, draw: 1600,
  hold: 450, fade: 300 }`, 2,7 s in tutto; `Root.tsx` la monta a ogni
  apertura a freddo, senza condizioni; prende i tocchi finché c'è. L'app
  parte sotto e si carica intanto.
- **O15**: `assets/characters` 13 zip, 3,8 MB; `assets/music` 10 brani,
  1,8 MB; li leggono solo `share/videoCharacter.ts` e `share/videoMusic.ts`
  con `require`. Tutta la cartella `assets` pesa 28 MB, 21 del motore.
- **Si potrebbero scaricare?** Sì: sono dati (modelli glTF e audio), non
  codice. ADR-0177 ha scartato lo scaricare Pyodide e il motore, che sono
  codice (regole 2.5.2 e 4.7 di Apple); le zone, che sono dati, l'app le
  scarica già. ADR-0339, precisazione B, punto 2: senza rete il video esce
  lo stesso, senza animale. Il risparmio però arriverebbe solo con una
  build nuova dello store: un OTA non toglie file da un'app già installata.

## Le scelte dell'utente (2026-11-23)

| # | Domanda | Risposta |
|---|---|---|
| 1 | L'animazione iniziale: resta di 2,7 s a ogni apertura, intera sempre ma saltabile, o intera solo la prima volta? | **«Intera solo la prima volta»**: intera (2,7 s) alla prima apertura e dopo ogni versione nuova dall'App Store o da Google Play; le altre volte corta, circa 1 secondo (il cuore si disegna in 0,6 s, resta 0,15 s, sfuma in 0,25 s); un tocco sullo schermo la chiude subito |
| 2 | Animali e musiche del video (5,6 MB): dentro l'app, scaricati al primo uso, o dentro solo i primi? | **«Restano dentro, si chiude»**: niente cambia; si riapre se gli animali diventano molti di più |

## Parti

- **0 — Domande e documenti** (questa PR). Fatta.
- **A — L'animazione corta** (solo app, solo JavaScript). File:
  - `apps/mobile/src/intro/LaunchIntro.tsx` e `LaunchIntro.test.tsx`: i
    tempi corti, quale delle due si vede, il tocco che la chiude;
  - `apps/mobile/src/intro/Root.tsx`: legge se l'intera è già stata vista
    con questa versione e lo segna quando finisce;
  - nuovi `apps/mobile/src/intro/introSeen.ts` e `introSeen.test.ts`.

  Nessuna dipendenza nuova (`expo-file-system` ed `expo-constants` ci sono
  già), niente di nativo, nessun testo nuovo: l'impronta iOS non cambia e
  si pubblica con un OTA. Da guardare una volta sul simulatore, al turno
  che dà il Coordinatore: con l'animazione di 1 s l'app sotto si vede
  prima, anche se non ha finito di caricarsi.
- **Chiusura**: documenti (`ARCHITECTURE` non cambia; ADR-0405 «Attiva»),
  una riga in `archive/COMPLETATI.md`.

O15 non ha parti: chiusa dalla scelta 2.

## Vincoli

- `intro/Root.tsx` e `intro/firstPage.ts` possono servire a TASK-500
  (avvio, O4+O5): la parte A parte solo col sì del Coordinatore sulla
  lista dei file, e l'ordine fra le due lo decide lui. La misura di
  TASK-500 cambia se l'animazione dura 1 s invece di 2,7: meglio che
  sappia quale delle due sta misurando.
- `INTRO_TOTAL_MS` resta il tempo dell'animazione intera: lo usa
  `intro/SavedLogo.test.tsx`, che non si tocca.

## Criteri di accettazione (parte A)

- Prima apertura dopo l'installazione: animazione intera, 2,7 s.
- Seconda apertura a freddo con la stessa versione: animazione corta,
  1,0 s (0,6 + 0,15 + 0,25).
- Dopo che `version` di `app.json` è cambiata: intera una volta, poi corta.
- Un tocco durante l'animazione, intera o corta: sfuma in 0,25 s e l'app è
  sotto le dita; `onDone` chiamato una volta sola.
- Un telefono che non riesce a leggere o scrivere il file vede l'intera:
  mai un errore, mai uno schermo giallo che resta.
- Test deterministici per ognuno dei punti sopra; `tsc` pulito.

## Esito

- 2026-11-23, parte 0: verificati O6 e O15 su `main`, due domande
  all'utente, risposte nella tabella. O15 chiusa senza lavoro.
