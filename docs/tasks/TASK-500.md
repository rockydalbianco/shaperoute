# TASK-500 — L'app si apre prima: meno codice all'avvio, il motore dopo il primo schermo

**Stato**: In lavorazione — parte 0 (misura) in corso
**Fase**: 5 · **Branch**: `docs/TASK-500-part-0` (parte 0), poi
`feat/TASK-500-...`
**ADR**: ADR-0404 · numeri dal Coordinatore (fork 3), 2026-11-23

## Obiettivo

Dal tocco sull'icona al primo schermo usabile passa meno tempo, e
l'animazione del cuore non si blocca mentre l'app si carica sotto.

## Da dove viene

La lettura del codice del 2026-11-23 (O1–O15, tutte approvate dall'utente):
**O4** (tutto il codice si carica all'apertura) e **O5** (Pyodide parte
mentre gira l'animazione). Indicazione del Coordinatore: prima la misura,
poi il controllo dell'impronta con `metro.config.js`; se cambia, va col
taglio nativo.

## Contesto da leggere

- ADR-0177 (`grep -n "## ADR-0177 —" docs/archive/DECISIONS-fino-al-2026-11.md`):
  il motore sul telefono; tra gli scartati, un `metro.config.js` per i tipi
  di asset.
- ADR-0248 punto 4: Python parte appena una zona copre la posizione.
- ADR-0339 prec. B punto 5: «un `metro.config.js` entra nell'impronta iOS»
  (da verificare, vedi sotto).
- ADR-0405 (TASK-505): l'animazione corta dalla seconda apertura.
- `apps/mobile/index.ts`, `src/intro/Root.tsx`, `src/intro/firstPage.ts`,
  `src/engine/usePhoneZones.ts`, `src/engine/page.ts`,
  `src/engine/phoneEngine.ts`, `src/i18n/translate.ts`.

## Verificato su `main` (`feaa5bc6`, 2026-11-28)

- Né `metro.config.js` né `babel.config.js`: Expo 57.0.24,
  `inlineRequires: false`. Tutti i moduli vengono eseguiti prima del primo
  disegno; nessun `React.lazy` nell'app.
- Bundle iOS di produzione: bytecode Hermes 8,2 MB, 2371 file (1276
  dell'app). Le quattro tabelle delle lingue 871 KB (ne serve una), i testi
  legali in cinque lingue 300 KB, `air/egm96Grid.ts` 170 KB,
  `explore/themedIdeas.json` 286 KB, `react-native-google-mobile-ads`
  382 KB caricato dalla prima pagina (`FeedScreen`).
- Il motore: `engine.warmUp()` parte appena una zona salvata copre la
  posizione, senza aspettare `markFirstPage()`. `bootMs` si misura ma non
  si mostra né si scrive da nessuna parte.
- `@expo/fingerprint` 0.20.13 non legge `metro.config.js` (conta i file che
  carica `app.config.ts`): un `metro.config.js` **dovrebbe** lasciare
  l'impronta iOS a `5e1b5ce5`. Da misurare su copia pulita.

Dettagli e metodo: `out/TASK-500/PARTE-0.md` nel checkout principale.

## Parti

- **0 — Misura** (solo documenti). Statico fatto (sopra). Da fare, col
  turno del simulatore del Coordinatore: i tempi con una patch di sola
  misura mai committata (avvio nativo, fine dei moduli, primo disegno, fine
  dell'animazione, motore pronto + `bootMs`, buchi del thread JS, video del
  cuore), animazione intera e corta, con e senza zona salvata, 5 aperture
  per condizione. Più l'impronta con e senza `metro.config.js`.
- **A — Meno codice all'avvio (O4)**: da definire coi numeri della parte 0
  (`inlineRequires`, lingue e dati caricati su richiesta). Lista dei file
  al Coordinatore prima del codice.
- **B — Il motore dopo il primo schermo (O5)**: solo se la misura mostra
  che il suo avvio pesa sull'animazione. Sposta il primo percorso al
  massimo di 1,0 s (2,7 s alla prima apertura): è una scelta di prodotto,
  si chiede all'utente coi numeri.

## File toccati

- Parte 0: `docs/tasks/TASK-500.md`.
- Parti A e B: da chiedere al Coordinatore (`App.tsx`, `i18n/`, `engine/`,
  `FeedScreen.tsx` sono condivisi).

## Criteri di accettazione

- Numeri di partenza e dopo, con lo stesso metodo, scritti qui.
- Impronta iOS misurata; se cambia, il cambio è nel taglio nativo.
- Test deterministici per ogni modulo caricato su richiesta; `tsc` verde.
- Nessuna dipendenza nuova; motore Python e server non toccati.
