# TASK-500 — L'app si apre prima: meno codice eseguito all'avvio

**Stato**: In lavorazione — parte 0 (misura) chiusa il 2026-11-28; prossima la parte A
**Fase**: 5 · **Branch**: `docs/TASK-500-part-0` (#1745), `docs/TASK-500-part-0-numbers`,
poi `feat/TASK-500-a-inline-requires`
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
  carica `app.config.ts`). **Misurato** su copia pulita: `8abaeb92` (runtime
  1.2.0) con e senza un `metro.config.js` con `inlineRequires`.

Dettagli e metodo: `out/TASK-500/PARTE-0.md` nel checkout principale.

## Numeri della parte 0 (2026-11-28)

iPhone 17e simulato, Expo Go 57 con `--no-dev --minify`, una patch di sola
misura mai committata (`out/TASK-500/misura.patch`), 5 aperture a freddo
per condizione (3 per «inline, intera»). Mediane in ms dall'inizio del
nostro JavaScript; il carico del Mac è a fianco.

| Condizione | carico | primo disegno | thread JS libero | fine animazione | motore pronto · `bootMs` |
|---|---|---|---|---|---|
| `main`, corta | 6 | 585 | ~1350 | 1756 | — |
| `main`, intera | 15 | 670 | ~1450 | 3479 | — |
| `main` + motore subito, corta | 21 | 660 | ~1460 | 1879 | 8098 · 6123 |
| `main` + motore subito, intera | 7 | 682 | ~1470 | 3467 | 4892 · 3023 |
| `inlineRequires`, corta | 9 | 166 | ~1030 | 1375 | — |
| `inlineRequires`, intera | 6 | 187 | ~1040 | 2968 | — |

- Su `main` ~0,5 s se ne vanno a eseguire i moduli e ~0,75 s in lavoro di
  `App` dopo il primo disegno.
- Il motore non allunga i blocchi del thread JS. Nei video ci sono fermi di
  ~0,23 s all'inizio del cuore **con e senza** motore; il blocco di ~1 s
  della TASK-505 era a carico 100.
- I numeri assoluti sono del simulatore, non di un iPhone; i confronti
  valgono.

## Parti

- **0 — Misura** (solo documenti; #1745 e la PR dei numeri). Fatta.
- **A — `inlineRequires` (O4)**: `apps/mobile/metro.config.js` (nuovo) e
  il suo test; prima, l'elenco dei moduli che devono girare all'avvio per
  effetto (task in background, gestori delle notifiche). Esce con un OTA.
  Poi si rimisura con lo stesso metodo.
- **B — Caricamento su richiesta**: lingue, testi legali, dati di
  Explore/Feed, solo se la misura dopo A li mostra ancora pesanti.
- **O5 (il motore dopo il primo schermo)**: non si fa (ADR-0404 punto 2);
  si riapre se la prova su iPhone mostra il cuore fermo.

## File toccati

- Parte 0: `docs/tasks/TASK-500.md`; con i numeri anche la voce in
  `docs/STATUS.md` e ADR-0404 in `docs/DECISIONS.md`.
- Parte A: `apps/mobile/metro.config.js` (nuovo), un test nuovo; altri file
  solo col via del Coordinatore.
- Parte B: da chiedere al Coordinatore (`i18n/`, `about/`, `explore/`,
  `feed/` sono condivisi).

## Criteri di accettazione

- Numeri di partenza e dopo, con lo stesso metodo, scritti qui.
- Impronta iOS misurata; se cambia, il cambio è nel taglio nativo.
- Test deterministici per ogni modulo caricato su richiesta; `tsc` verde.
- Nessuna dipendenza nuova; motore Python e server non toccati.
