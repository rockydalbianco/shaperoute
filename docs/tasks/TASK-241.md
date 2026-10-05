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

## Parte B — Nemmeno VoiceOver legge il punteggio

Chiesto dall'utente il 2026-10-05, alla domanda fatta dopo la parte A:
«sì toglilo anche da VoiceOver». Branch `feat/TASK-241-b-feed-label`.

L'etichetta del post passa da «{user} in {city}: {title}. {facts}. Score
{score} out of 100.» a «{user} in {city}: {title}. {facts}.», in
`FeedPost.tsx` e nelle quattro tabelle delle lingue (una voce per file).

- [x] L'etichetta di un post non contiene il punteggio, in nessuna lingua.
- [x] Lint, typecheck, Prettier e test dell'app verdi.

```
apps/mobile/src/feed/FeedPost.tsx
apps/mobile/src/feed/FeedPost.test.tsx
apps/mobile/src/i18n/de.ts
apps/mobile/src/i18n/es.ts
apps/mobile/src/i18n/fr.ts
apps/mobile/src/i18n/it.ts
docs/UI.md
docs/STATUS.md
docs/DECISIONS.md
docs/tasks/TASK-241.md
```

## Parte C — Niente punteggio nel post da condividere

Chiesto dall'utente il 2026-10-05: «togli il punteggio anche dal post da
condividere». Branch `feat/TASK-241-c-share-no-score`.

Nel post di «Share» (TASK-231) «Score» esce dai risultati: niente
pastiglia in «Results», niente numero sull'immagine, niente «Score 87»
nel testo per Strava. `PostRun` non porta più il punteggio.

- [x] «Results» offre solo «Distance», «Time», «Pace».
- [x] L'immagine del post non mostra il punteggio.
- [x] Il testo per Strava non contiene il punteggio.
- [x] Lint, typecheck, Prettier e test dell'app verdi.

```
apps/mobile/src/share/postRun.ts
apps/mobile/src/share/postRun.test.ts
apps/mobile/src/share/PostImage.tsx
apps/mobile/src/share/SharePost.test.tsx
apps/mobile/src/screens/FinishScreen.tsx
apps/mobile/src/screens/FreeRunScreen.tsx
apps/mobile/src/i18n/de.ts
apps/mobile/src/i18n/es.ts
apps/mobile/src/i18n/fr.ts
apps/mobile/src/i18n/it.ts
docs/UI.md
docs/STATUS.md
docs/DECISIONS.md
docs/tasks/TASK-241.md
```

Fuori scope: il punteggio a fine corsa, in «My activities» e sotto un
disegno aperto dal «Profile».

## Parte D — Niente punteggio in «My activities»

Chiesto dall'utente il 2026-10-05: «toglilo anche da My activities».
Branch `feat/TASK-241-d-activities-no-score`.

- [x] Una riga dell'elenco non mostra «Score 91», né lo legge VoiceOver.
- [x] La corsa aperta non mostra «91 · out of 100».
- [x] Lint, typecheck, Prettier e test dell'app verdi.

```
apps/mobile/src/activities/ActivitiesList.tsx
apps/mobile/src/activities/ActivityCard.tsx
apps/mobile/__tests__/AppActivities.test.tsx
docs/UI.md
docs/STATUS.md
docs/DECISIONS.md
docs/tasks/TASK-241.md
```

Fuori scope: il punteggio a fine corsa e sui disegni del «Profile»
(griglia e disegno aperto); il campo `score` dell'API.

## Esito

Fatto il 2026-10-05. Parte A (PR #345, merge `ad80385`): il riquadro non
c'è più, nel «Feed» e nei post che «Explore» mostra mentre disegna una
città (stesso componente). Parte B (PR #348, merge `69af6c6`): nemmeno
VoiceOver legge più il punteggio. Parte C (PR #355, merge `b7a82da`): il
post da condividere non ha più il punteggio, nemmeno nel testo per
Strava. Parte D: «My activities» non lo mostra più, né nell'elenco né
sulla corsa aperta. Le pubblicazioni le fa il coordinatore, con l'ok
dell'utente: ogni parte esce con la prima che parte da un `main` che la
contiene. Resta il punteggio a fine corsa e sui disegni del «Profile».
