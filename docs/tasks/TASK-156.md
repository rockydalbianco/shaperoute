# TASK-156 — «Feed» con quindici disegni di esempio

**Stato**: Done
**Fase**: 4 · **Branch**: `feat/TASK-156-sample-feed`
**Dipende da**: TASK-154 (in `main`)

Chiesto dall'utente il 2026-10-02: «nella sezione feed crea già in
automatico 15 attività con nomi inventati, utenti inventati, che hanno
fatto delle figure in sette città differenti d'Italia, e seleziona le
figure che sono venute meglio o che verranno meglio, così riempiamo la
sezione feed».

## Obiettivo

La pagina «Feed» mostra quindici disegni di esempio, presi dalle figure
meglio riuscite del catalogo nelle sue sette città, con corridori e titoli
inventati.

## Contesto da leggere

- `docs/UI.md` «Le pagine» (TASK-154)
- `catalog/README.md`, `catalog/seed/*.json`
- `services/api/shaperoute_api/recommended.py` (gli `id`, l'anteprima)
- `apps/mobile/src/explore/RouteThumb.tsx` (`thumbSegments`)

## Cosa fare

1. `tools/sample_feed.py`: sceglie le figure dal catalogo e scrive
   `apps/mobile/src/feed/sampleFeed.json`, con i suoi test.
2. `src/feed/FeedPost.tsx`: la scheda di un disegno.
3. `FeedScreen.tsx`: l'elenco.
4. Test dei dati, della scheda e della pagina.
5. `UI.md`, ADR, `STATUS.md`.

## Criteri di accettazione

- [x] Quindici disegni, sette città con almeno due ciascuna, nessuna forma
      più di due volte.
- [x] Ogni punto di ogni linea è un punto del percorso del catalogo.
- [x] Corridori e titoli diversi fra loro; nomi validi come nomi utente
      dell'app.
- [x] Nessuna richiesta all'API da «Feed»; nessuna dipendenza nuova; colori
      dai token; testi in inglese.
- [x] Test dell'app e di `tools/` verdi; lint, typecheck, prettier, ruff e
      black puliti.
- [ ] Prova sull'iPhone.

## File toccati

```
tools/sample_feed.py
tools/test_sample_feed.py
apps/mobile/src/feed/sampleFeed.json
apps/mobile/src/feed/sampleFeed.ts
apps/mobile/src/feed/sampleFeed.test.ts
apps/mobile/src/feed/FeedPost.tsx
apps/mobile/src/feed/FeedPost.test.tsx
apps/mobile/src/screens/FeedScreen.tsx
apps/mobile/src/screens/FeedScreen.test.tsx
apps/mobile/__tests__/AppPages.test.tsx
docs/UI.md
docs/DECISIONS.md
docs/STATUS.md
docs/tasks/TASK-156.md
```

## Fuori scope

- Il feed vero: account, disegni salvati, endpoint (TASK-117, TASK-118).
- Like e commenti (TASK-119, TASK-120).
- Aprire un disegno o il profilo di chi l'ha fatto.
- Orari («2 h ago»): sarebbero finti per sempre.

## Esito

Fatto (2026-10-02, ADR-0127). «Feed» mostra quindici disegni: cavallo e
luna a Levico, stella e cerchio a Trento, luna e cuore a Bologna, cerchio e
farfalla a Roma, lumaca, pesce e cavallo a Firenze, testa di cane e gatto a
Torino, testa di coniglio e stella a Milano. Undici forme, somiglianza da
0,954 a 1,000. Test dell'app e di
`tools/` verdi (8 nuovi nell'app, 11 in `tools/`), lint, typecheck,
prettier, ruff e black puliti. Visto su un simulatore con Expo Go.

**Da provare sull'iPhone**, con l'app ripubblicata.

Seguiti:

- TASK-118 decide cosa fare degli esempi quando arrivano i disegni veri.
- Se il catalogo cambia: `python tools/sample_feed.py`, poi i test.
- Niente sulla pagina dice che sono esempi: l'agente aveva messo una riga
  in cima, l'utente l'ha fatta togliere (2026-10-02). Da rivedere prima di
  invitare persone che non conoscono l'app.
