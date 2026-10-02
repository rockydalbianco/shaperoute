# TASK-160 — Il nome «Sgrava» nei testi dell'app

**Stato**: Done
**Fase**: 4 · **Branch**: `fix/TASK-160-sgrava-texts`
**Dipende da**: TASK-159 (in `main`)

Assegnato dal coordinatore il 2026-10-02 dopo TASK-159 (ADR-0129: il logo e
il nome scelti dall'utente), e preso su conferma dell'utente («ok, prendi
TASK-160»).

## Obiettivo

Nessun testo che l'utente legge nell'app dice più «ShapeRoute»: il nome è
«Sgrava», come sotto l'icona.

## Contesto da leggere

- `docs/UI.md` «La partenza», «Correre senza percorso»
- `docs/DECISIONS.md` ADR-0129 (TASK-159)

## Cosa fare

1. Cercare le scritte visibili «ShapeRoute» nell'app: non i nomi dei
   pacchetti (`@shaperoute/...`), lo `slug`, il bundle, le chiavi.
2. Cambiarle in «Sgrava», con i test che le cercano.
3. `UI.md`, `STATUS.md`.

## Criteri di accettazione

- [x] I tre messaggi sulla posizione spenta dicono «Sgrava»: prima
      schermata, navigazione, corsa libera.
- [x] Nessun'altra scritta visibile dell'app dice «ShapeRoute».
- [x] `app.json` non è toccato: il nome sotto l'icona è di TASK-159.
- [x] Test, lint, typecheck e prettier verdi.

## File toccati

```
apps/mobile/App.tsx
apps/mobile/__tests__/App.test.tsx
apps/mobile/src/screens/NavigateScreen.tsx
apps/mobile/src/screens/NavigateScreen.test.tsx
apps/mobile/src/screens/FreeRunScreen.tsx
apps/mobile/src/screens/FreeRunScreen.test.tsx
docs/UI.md
docs/STATUS.md
docs/tasks/TASK-160.md
```

## Fuori scope

- Il nome sotto l'icona e l'icona (`app.json`, TASK-159).
- I nomi che non si leggono nell'app: pacchetti, `slug`, bundle, la chiave
  del portachiavi, le cartelle del repository.
- Il nome del file GPX esportato («shaperoute-heart-5km-….gpx»): lo
  decide l'API, non l'app.
- La documentazione che chiama il progetto ShapeRoute.

## Esito

Fatto (2026-10-02). I tre messaggi dicono «Location is off for Sgrava…»;
nell'app non resta nessuna scritta visibile con «ShapeRoute». Un test nuovo
per il banner della navigazione, che non ne aveva; gli altri due seguono.
740 test dell'app verdi, lint, typecheck e prettier puliti.

Seguiti:

- Il file GPX esportato si chiama ancora «shaperoute-….gpx»: il nome lo dà
  l'API (`Content-Disposition`). Se l'utente lo vuole «sgrava-….gpx» è un
  task dell'API, con `GPX.md`.
- In Expo Go il permesso della posizione è di «Expo Go»: il messaggio dice
  «Sgrava», che è giusto solo in una build propria.
