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

## Parte E — Niente punteggio a fine corsa né sui disegni del «Profile»

Chiesto dall'utente il 2026-10-05: «sì toglilo anche da lì»; alla domanda
su cosa mostra la scheda di fine corsa ha scelto «Solo km e tempo».
Branch `feat/TASK-241-e-no-score-anywhere`.

- [x] La griglia «Drawings» non mostra «Score 87», né lo legge VoiceOver.
- [x] Il disegno aperto dal «Profile» non mostra «87 · out of 100».
- [x] La scheda di fine corsa dice solo «4.0 km · 32 min».
- [x] A fine corsa l'app non chiama `POST /track-scores`.
- [x] «Done» senza account toglie la corsa dal telefono.
- [x] Lint, typecheck, Prettier e test dell'app verdi.

```
apps/mobile/App.tsx
apps/mobile/src/screens/FinishScreen.tsx
apps/mobile/src/screens/FinishScreen.test.tsx
apps/mobile/src/social/DrawingsGrid.tsx
apps/mobile/src/social/DrawingsGrid.test.tsx
apps/mobile/src/social/DrawingCard.tsx
apps/mobile/src/about/content/en.ts
apps/mobile/src/about/content/it.ts
apps/mobile/src/i18n/de.ts
apps/mobile/src/i18n/es.ts
apps/mobile/src/i18n/fr.ts
apps/mobile/src/i18n/it.ts
apps/mobile/__tests__/AppActivities.test.tsx
apps/mobile/__tests__/AppDrawings.test.tsx
apps/mobile/__tests__/AppPenUpSaved.test.tsx
docs/UI.md
docs/STATUS.md
docs/DECISIONS.md
docs/tasks/TASK-241.md
```

Fuori scope: il campo `score` e `POST /track-scores` dell'API;
`src/api/trackScores.ts` (resta, senza chi lo chiama: lo leggono i test
della penna alzata); le due frasi di «Privacy» che nominano il punteggio.

## Esito

Fatto il 2026-10-05. Parte A (PR #345, merge `ad80385`): il riquadro non
c'è più, nel «Feed» e nei post che «Explore» mostra mentre disegna una
città (stesso componente). Parte B (PR #348, merge `69af6c6`): nemmeno
VoiceOver legge più il punteggio. Parte C (PR #355, merge `b7a82da`): il
post da condividere non ha più il punteggio, nemmeno nel testo per
Strava. Parte D (PR #358, merge `78e9bc1`): «My activities» non lo
mostra più, né nell'elenco né sulla corsa aperta. Parte E (PR #365,
merge `0294922`): via anche dai disegni del «Profile» e dalla fine corsa,
dove l'app non lo chiede più all'API. **Il punteggio non si vede più da
nessuna parte.** Le pubblicazioni le fa il coordinatore, con l'ok
dell'utente: ogni parte esce con la prima che parte da un `main` che la
contiene.

**Cosa resta nell'API**, non toccata:

- Il punteggio continua a essere calcolato e salvato dall'API al
  salvataggio della corsa («Save» manda la corsa senza punteggio, com'era
  già: `pauses`, `points`, `shape`, `similarity`, `style`, `title`,
  `track`, `word`). `score` e `fidelity` restano nelle risposte di
  `/me/activities` e dei disegni; l'app li legge e non li mostra. I
  punteggi già salvati restano dove sono.
- `POST /track-scores` esiste ancora ma l'app non lo chiama più. Con lui
  **l'evento `run_scored` degli `insights` non viene più registrato**
  (partiva da quella richiesta): se quel dato serve, è un seguito (il
  server potrebbe registrarlo al salvataggio).
- Nell'app `src/api/trackScores.ts` resta senza una schermata che lo
  chiami: lo leggono i test della penna alzata (`toScoreRequest`).
  Toglierlo è un seguito.
- I post d'esempio del «Feed» tengono `score` nei dati: `feedRoute` lo usa
  come somiglianza del percorso che si apre dal post.

**Parte F — la bozza di «Privacy»** (2026-10-05; alla proposta «lascio
la prima frase, tolgo "a run scored" dalla seconda» l'utente ha risposto
«ok continua»). In `src/about/content/en.ts` e `it.ts` l'elenco degli
eventi tenuti è «(a route chosen, a GPX file exported)»: l'app non manda
più la richiesta che faceva registrare `run_scored`. La frase sui dati
della corsa salvata («…distance, duration, score and the name of the
place») resta: il server il punteggio lo tiene. Branch
`feat/TASK-241-f-privacy-run-scored`; file: i due di `about/content`,
STATUS, questo task file. Se un giorno il server registra di nuovo
l'evento al salvataggio, la frase va rimessa.
