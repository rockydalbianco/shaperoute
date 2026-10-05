# TASK-241 — Niente punteggio sulle foto dei post del «Feed»

**Stato**: Done
**Fase**: 4 · **Branch**: `feat/TASK-241-feed-no-score`
**ADR**: ADR-0207.

Chiesto dall'utente il 2026-10-05: «togli dalle foto dei post 98 su 100 -
93 su 100...».

## Obiettivo

Sopra il disegno di un post del «Feed» non c'è più il riquadro del
punteggio («98», «out of 100»).

## Contesto da leggere

- `apps/mobile/src/feed/FeedPost.tsx`
- `docs/UI.md`, il punto «Feed» dell'elenco delle pagine

## Cosa fare

1. In `FeedPost.tsx` togliere il riquadro del punteggio dal disegno, con i
   suoi stili.
2. Aggiornare `FeedPost.test.tsx`: il punteggio non è scritto, e sopra il
   disegno resta solo il credito della mappa.
3. Aggiornare `docs/UI.md`.

## Criteri di accettazione

- [x] Un post del «Feed» non mostra né il numero del punteggio né «out of
      100».
- [x] Il credito della mappa resta in basso a destra della foto.
- [x] Titolo, riga dei fatti, tocco che apre il percorso: come prima.
- [x] Lint, typecheck, Prettier e test dell'app verdi.

## File toccati

```
apps/mobile/src/feed/FeedPost.tsx
apps/mobile/src/feed/FeedPost.test.tsx
docs/UI.md
docs/STATUS.md
docs/DECISIONS.md
docs/tasks/TASK-241.md
```

## Fuori scope

- L'etichetta letta da VoiceOver («… Score 92 out of 100.»): cambiarla
  vuole una chiave nuova nei file `src/i18n/*`, che sono di TASK-239
  (PR #343). Resta com'è.
- Il punteggio negli altri posti: a fine corsa, in «My activities», sotto
  un disegno aperto dal «Profile» (`DrawingCard`), nel post da condividere.
  L'utente ha parlato delle foto dei post.
- Il campo `score` dei post d'esempio (`sampleFeed`): resta nei dati.

## Esito

Fatto il 2026-10-05. Il riquadro non c'è più, nel «Feed» e nei post che
«Explore» mostra mentre disegna una città (stesso componente). VoiceOver
legge ancora il punteggio: da decidere con l'utente se toglierlo anche lì,
quando i file delle lingue sono liberi. Non pubblicato: esce con la
prossima pubblicazione, con l'ok dell'utente.
