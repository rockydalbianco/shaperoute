# TASK-497 — Le foto di chi commenta: l'indirizzo della foto nel commento, non il profilo intero

**Stato**: In corso · 2026-11-24 · parte A (server) alla PR; parte B (app)
dopo che la A è sul server
**Fase**: 5 · **Branch**: `feat/TASK-497-a-comment-author-photo` (A), poi
`feat/TASK-497-b-comment-avatars-app` (B)
**Dipende da**: TASK-355 parte B (`avatars.py`, la foto a un indirizzo suo),
TASK-454 (risposte ai commenti), TASK-120 (ADR-0175, i commenti)
**ADR**: aggiunta datata ad ADR-0175 (punto 9, che supera il punto 7): lo ha
detto il Coordinatore il 2026-11-24 · numero di task dal Coordinatore il
2026-11-23

## Obiettivo

Punto O7 della lettura del codice del 2026-11-23
(`out/prova-app-2026-11-23/PROPOSTE.md` del Mac, fuori da git; l'utente:
«Sì, tutte»). Per mostrare la foto di chi ha scritto un commento l'app
chiede il **profilo intero** di ogni autore. Alla fine il commento dice da
solo dove si legge la foto piccola, e l'app la legge da lì, con la cache del
telefono. **L'utente non vede differenze**: le stesse foto, prima.

Nessuna scelta di prodotto: è tutto tecnico, deciso dall'agente su delega.

## Riverificato su `origin/main` (`22722561`, 2026-11-24)

- `CommentRow` (`apps/mobile/src/social/DrawingComments.tsx`) chiama
  `door.photoOf(publicId)`; `commentsDoor.ts` fa `fetchProfile` →
  `GET /users/{public_id}`, una volta per autore finché l'app è aperta
  (ADR-0175 punto 7, scritto prima degli avatar di TASK-355).
- `Profiles.public` (`profiles.py`) è una query con dodici sotto-query
  (pubblicati, follower, seguiti, stato del seguire, vittorie, distanza,
  dislivello, reazioni, badge, record, VO₂ max, livelli di palestra) più
  quella dei premi, e manda la foto da 256 px in base64: tutto per tenere
  la foto.
- L'autore di un commento (`AuthorBody`) ha solo `public_id` e `username`.
  Il feed ha già `FeedAuthorBody.photo`, l'indirizzo
  `/users/{id}/photo?v=…` di `avatars.py` (128 px, `Cache-Control: private,
  max-age=86400`, versione = `profile_photos.updated_at`).

## Il disegno

**Parte A, server.** L'autore di commenti e risposte diventa
`CommentAuthorBody` (`AuthorBody` + `photo`): lo stesso nome e lo stesso
indirizzo dell'autore di un post del feed; `null` senza foto. In
`comments.py` le colonne di un commento prendono `p.updated_at AS photo_at`
con una `LEFT JOIN profile_photos p` (una riga al più, per chiave): vale
per `GET /drawings/{id}/comments` (con e senza `threads`) e per
`GET /comments/{id}/replies`. Il `POST` porta la foto di chi scrive con una
sotto-query nel `RETURNING` dell'`INSERT` che c'era, e così il commento
tenuto con un super like (`reactions.py`, che costruiva l'autore a mano:
sì del Coordinatore al file il 2026-11-24). **Nessuna query in più**, e il
JPEG non viene letto. `mention` resta nome e id: è solo «@nome».
Il campo è un'aggiunta: un'app di prima non lo legge.

Chi è bloccato o nascosto non cambia: il commento non si legge già
(`read_sql`), e l'indirizzo della foto risponde 404 attraverso un blocco
(`avatars.py`), con la stessa regola (`apart_sql`).

**Parte B, app.** `CommentRow` legge `comment.author.photo`:

- una stringa → un `Image` con indirizzo, token e chiave (come la foto
  dell'autore in `FeedPost`), **sopra l'iniziale**: mentre carica, e se non
  arriva, si vede l'iniziale come oggi;
- `null` → l'iniziale, senza nessuna richiesta;
- campo assente (API di prima) → `door.photoOf`, la strada di oggi.

## Cosa fare

1. A: `comments.py`, test, tipi e fixture di `shared-types`, `docs/API.md`.
2. «#NNN pronta» al Coordinatore; il merge e il passo sul server sono suoi,
   col sì dell'utente.
3. B, dopo la A sul server: `commentsDoor.ts`, `DrawingComments.tsx`,
   `CommentAvatar.tsx`, test.
4. Documenti di chiusura in una PR a parte: aggiunta ad ADR-0175, riga in
   `docs/archive/COMPLETATI.md`, questo file a `Done`.

## Criteri di accettazione

- [ ] A: commenti e risposte portano `author.photo` (indirizzo con la foto,
      `null` senza), nelle tre liste e nella risposta del `POST`.
- [ ] A: una foto nuova ha un indirizzo nuovo; tolta la foto, `null`.
- [ ] A: autore bloccato o account cancellato: come oggi, il commento non
      c'è.
- [ ] A: il numero di istruzioni SQL di una pagina non cresce con gli
      autori, e nessuna legge il JPEG.
- [ ] A: gli esempi di `shared-types` passano sia in Python sia in
      TypeScript; un corpo di prima (senza `photo`) è ancora un commento.
- [ ] B: con il campo presente non parte nessun `GET /users/{id}`.
- [ ] B: senza il campo resta il comportamento di oggi (`photoOf`).
- [ ] Impronta iOS invariata (`5e1b5ce5`), nessuna dipendenza nuova,
      nessuna migrazione.

## File toccati

Parte A:

```
services/api/shaperoute_api/comments.py
services/api/shaperoute_api/reactions.py            (il commento del super like)
services/api/tests/test_comment_author_photos.py   (nuovo)
services/api/tests/test_comment_threads.py
services/api/tests/test_comments.py
packages/shared-types/src/index.ts
packages/shared-types/fixtures/comment-reply.json
packages/shared-types/fixtures/comment-threads.json
packages/shared-types/test/commentThreads.test.ts
docs/API.md
docs/tasks/TASK-497.md                              (nuovo)
```

Parte B:

```
apps/mobile/src/social/commentsDoor.ts
apps/mobile/src/social/commentsDoor.test.ts
apps/mobile/src/social/DrawingComments.tsx
apps/mobile/src/social/DrawingComments.test.tsx
apps/mobile/src/social/CommentAvatar.tsx            (nuovo)
apps/mobile/src/social/CommentAvatar.test.tsx       (nuovo)
```

## Fuori scope

- Le altre liste che portano ancora la foto in base64 (persone, campanella,
  messaggi): non sono di O7.
- La foto nell'intestazione del profilo aperto da un commento
  (`openProfile` con `photo: null`): resta com'è.
- Togliere `photoOf` e il punto 7 di ADR-0175 dal codice: serve finché
  un'app nuova può parlare con un'API di prima.

## Misure

**Misurato** (2026-11-24, in locale, PostgreSQL di prova, contando le
istruzioni SQL che partono per ogni richiesta HTTP, autenticazione compresa;
un post con 10 autori diversi fra commenti e risposte):

| | Prima | Dopo |
|---|---|---|
| `GET /drawings/{id}/comments?threads=true` | 6 istruzioni | 6 istruzioni (la `LEFT JOIN` sta nella query che c'era) |
| Le foto dei 10 autori | 10 `GET /users/{id}`: 3 istruzioni l'una (30 in tutto), di cui una con 64 `SELECT` nel testo | 10 `GET /users/{id}/photo`: 2 istruzioni l'una (20 in tutto), una `JOIN` per chiave |
| Alla riapertura dell'app | di nuovo i 10 profili | niente per un giorno, se il telefono tiene la cache (`max-age=86400`) |

Il numero di istruzioni di una pagina **non cambia** passando da 1 a 7
autori, per le tre liste, e nessuna legge il JPEG
(`test_a_page_costs_the_same_statements_whoever_wrote_it`).

**Non misurato**: i tempi sul server vero e sul telefono; i byte risparmiati
(le foto di prova sono a tinta unita, non dicono niente: un profilo porta la
foto da 256 px in base64, l'indirizzo quella da 128 px); che la cache HTTP
di iOS e Android tenga davvero l'immagine per un giorno (si vede solo sul
telefono, con la parte B).

## Esito

*(si compila a fine task)*
