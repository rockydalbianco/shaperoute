# TASK-208 — Pubblicare una corsa in stile Strava

**Stato**: Todo — task file scritto con le scelte dell'utente (2026-10-03);
la parte A aspetta la parte A di TASK-211
**Fase**: 4 · **Branch**: `feat/TASK-208-publish-api` (parte A),
`feat/TASK-208-publish-app` (parte B)
**Dipende da**: TASK-117 (fatto), TASK-211 (parte A per la nostra A, parte
B per la nostra B) · **ADR**: dal coordinatore

## Obiettivo

A fine corsa chi ha un account compila la sua attività come su Strava:
la mappa in cima con fino a tre foto, il titolo, com'è andata, le persone
taggate, il tipo di attività e chi la può vedere. Gli altri vedono tutto
questo nel disegno.

## Com'è oggi (TASK-117, ADR-0159, ADR-0166)

Sopra «Save» e «Discard» (`RunEnd.tsx`): l'interruttore «Public», spento a
ogni corsa, e un solo campo «Title» (anche il nome su Strava), poi «Send
to Strava». Nell'API `drawings` ha `title` e `public` (migrazione `0009`);
una corsa (`runs`) non sa se era corsa, bici o canoa. Le stesse due voci
stanno sulla scheda di una corsa in «My activities» (`PublicRow.tsx`).

## Le scelte dell'utente (2026-10-03)

1. **I campi**, in quest'ordine: titolo, descrizione, persone da taggare,
   tipo di attività, chi la può vedere. La mappa resta in cima.
2. **La descrizione** è un campo vuoto con scritto in grigio «How did it
   go?», come Strava. Punteggio, km e tempo restano accanto alla mappa.
3. **Le foto**: la mappa è la prima immagine; se ne aggiungono **fino a
   tre**, dal rullino o dalla fotocamera.
4. **Chi la può vedere**: **«Everyone», «Followers», «Only me»**, subito.
   «Followers» vuole il «segui», che non c'è: è **TASK-211**, con
   richiesta da accettare (scelta dell'utente), e va prima.
5. **Le persone da taggare** sono iscritti a Sgrava, cercati per nome
   (la ricerca è di TASK-211). I nomi taggati compaiono sul disegno e
   aprono il loro profilo. Nessuna notifica finché non c'è TASK-185.

## Proposte dell'agente (da confermare con l'utente prima della parte B)

- «Who can see it» parte da **«Only me»** a ogni corsa, come oggi
  «Public» spento (scelta dell'utente per TASK-117).
- **Il tipo di attività**: «Run», «Bike», «Paddle», scelto in partenza
  dallo sport di «Settings» (TASK-189, TASK-205); cambia anche il tipo
  su Strava. Non cambia il punteggio.
- **Strava**: titolo, descrizione e tipo vanno anche a Strava; le foto no
  (l'API di Strava non le accetta). «Send to Strava» resta dov'è.
- **La scheda di una corsa in «My activities»** ha lo stesso modulo, per
  cambiare dopo (oggi lì ci sono «Public» e «Title»).
- Al più **10 persone** taggate; descrizione al più **500 caratteri**.
- I testi nuovi: «How did it go?», «Tag people», «Activity» («Run»,
  «Bike», «Paddle»), «Who can see it» («Everyone», «Followers», «Only
  me»), «Add photo». Da far confermare, e da passare a TASK-210 (la
  lingua dell'app) quando entrano.

## Contesto da leggere

- `docs/DECISIONS.md` ADR-0114 (punto 4), ADR-0146 (foto del profilo),
  ADR-0156 (Strava), ADR-0159, ADR-0166
- `docs/API.md` «Drawings», «My activities», «Send to Strava»
- `docs/DATABASE.md` `runs`, `drawings`, `profile_photos`
- `docs/UI.md` «La fine della corsa», «My activities»
- `docs/tasks/TASK-211.md` (la ricerca degli iscritti e `follows`)

## Parte A — l'API

1. Migrazione nuova (il primo numero libero in `main` al merge):
   - `drawings.public` diventa `visibility` (`everyone`, `followers`,
     `only_me`): `true` → `everyone`, `false` → `only_me`;
   - `drawings.description` (al più 500 caratteri);
   - `runs.activity` (`running`, `cycling`, `paddling`, per difetto
     `running`): ogni corsa di prima era una corsa a piedi;
   - `drawing_photos`: fino a 3 per disegno, in ordine, JPEG rifatti
     dall'API senza EXIF, come `profile_photos` (ADR-0146), nel database;
   - `drawing_tags`: le persone taggate (account, ordine), al più 10;
     cancellato l'account taggato, il tag sparisce.
2. `PUT /me/activities/{key}/drawing` prende titolo, descrizione,
   visibilità, attività e tag (`public_id` degli iscritti); le foto con
   `PUT` e `DELETE /me/activities/{key}/drawing/photos/{n}` (n da 1 a 3).
   `PUT /me/activities/{key}` accetta `activity`.
3. Chi vede cosa: `everyone` tutti gli iscritti; `followers` chi segue il
   proprietario con la richiesta accettata (`follows` di TASK-211);
   `only_me` nessun altro. Gli altri hanno «non trovato», come oggi un
   disegno privato. La traccia resta tagliata dei 200 m.
4. Il disegno per gli altri ha descrizione, attività, i tag (nome e
   `public_id`) e gli indirizzi delle foto; `GET
   /drawings/{id}/photos/{n}`.
5. Strava: descrizione e tipo di attività nell'invio (`strava.py`).
6. Test, `API.md`, `DATABASE.md`, ADR-0170.

## Parte B — l'app

1. La fine della corsa (`RunEnd.tsx`, `FinishScreen.tsx`): in cima la
   mappa e accanto «Add photo» (fino a tre), sotto punteggio, km e tempo;
   poi titolo, «How did it go?», «Tag people» (la ricerca di TASK-211),
   «Activity», «Who can see it», «Send to Strava», «Discard» e «Save».
2. Lo stesso modulo sulla scheda di una corsa in «My activities»
   (`PublicRow.tsx`).
3. Senza rete la scelta e le foto aspettano sul telefono, come oggi
   `drawings-outbox.json` (le foto già ridotte, in un file).
4. Il disegno aperto (`DrawingCard.tsx`): mappa e foto da scorrere,
   descrizione, attività, i nomi taggati che aprono il profilo.
5. Test, `UI.md`, i testi nuovi.

## Criteri di accettazione

- [ ] Un disegno `followers` lo vede chi segue con la richiesta
      accettata; chi ha solo chiesto, o non segue, ha «non trovato»
      (test).
- [ ] Un disegno `only_me` dà «non trovato» a chiunque altro (test).
- [ ] La migrazione porta ogni `public` di prima nella visibilità
      giusta (test).
- [ ] Una quarta foto, o un undicesimo tag, sono rifiutati (`422`, test).
- [ ] Le foto non hanno EXIF (test, come per la foto del profilo).
- [ ] Taggare un account che non esiste dà `422`; cancellato un account
      taggato, il suo nome sparisce dal disegno (test).
- [ ] Senza rete titolo, descrizione, tag, visibilità e foto non si
      perdono (parte B, test).
- [ ] Con «Send to Strava» descrizione e tipo arrivano nell'invio (test
      con Strava finto).
- [ ] Test verdi dell'API e dell'app.
- [ ] Prova sull'iPhone, dopo l'aggiornamento del server, con l'ok
      dell'utente.

## File toccati

Parte A:

```
services/api/migrations/00NN_drawing_details.sql   (nuovo)
services/api/shaperoute_api/drawings.py
services/api/shaperoute_api/drawing_photos.py      (nuovo)
services/api/shaperoute_api/activities.py
services/api/shaperoute_api/strava.py
services/api/shaperoute_api/app.py
services/api/tests/test_drawings.py
services/api/tests/test_drawing_photos.py          (nuovo)
packages/shared-types/                              (contratto e fixture)
docs/API.md, docs/DATABASE.md, docs/DECISIONS.md, docs/STATUS.md
```

Parte B:

```
apps/mobile/src/activities/RunEnd.tsx
apps/mobile/src/screens/FinishScreen.tsx
apps/mobile/src/social/PublicParts.tsx
apps/mobile/src/social/PublicRow.tsx
apps/mobile/src/social/DrawingCard.tsx
apps/mobile/src/social/drawingOutbox.ts
apps/mobile/src/social/                             (file nuovi)
apps/mobile/src/api/drawings.ts
apps/mobile/src/strava/StravaRunEnd.tsx
docs/UI.md, docs/DECISIONS.md, docs/STATUS.md
```

## Fuori scope

- Il «segui», la ricerca degli iscritti, «Requests»: TASK-211.
- Notifiche a chi è taggato o a chi segue: TASK-185.
- Togliersi da un tag, segnalare, bloccare: TASK-121.
- Il feed dei disegni di chi segui: TASK-118.
- Like e commenti: TASK-119, TASK-120.
- Le foto su Strava.

## Esito

*(si compila a fine task)*
