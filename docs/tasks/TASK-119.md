# TASK-119 — Reazioni ai disegni pubblicati, e il super like di Sgrava

**Stato**: Todo
**Fase**: 4 · **Branch**: `feat/TASK-119-a-reactions-api` (parte A),
`feat/TASK-119-b-reactions-app` (parte B)
**Dipende da**: TASK-117 (i disegni pubblicati) · TASK-120 (i commenti) ·
TASK-213 (il filtro dei commenti negativi) — tutti in `main` ·
**ADR**: ADR-0193

> **Cambiato il 2026-10-04, scelte dell'utente**: era «Like», un cuore
> solo dopo il feed vero (TASK-118). Diventa **le reazioni con le emoji**,
> subito sotto i disegni pubblicati aperti da un profilo, come i commenti
> (TASK-120). Le parole dell'utente: «puoi reagire con varie emoji e metti
> anche l'emoji del cuore di sgrava»; «il cuore sgrava è super like e si
> fa premendo due volte sul post»; «quando metto il super like, sei
> obbligato a mettere un commento di minimo due caratteri». Il doppio
> tocco vale sul disegno aperto (scelta fra due proposte). I post di
> esempio del «Feed» (TASK-156) restano senza reazioni: quando arriva
> TASK-118, le sue schede useranno gli stessi endpoint.

## Obiettivo

Sotto un disegno pubblicato chi lo vede lascia una reazione fra sei: il
cuore di Sgrava (il super like, con un commento obbligatorio), 🔥 👏 💪 😂
😮. Una a testa; sotto il disegno si vedono le tre più usate e il totale.

## Contesto da leggere

- `docs/API.md` («Drawings», «Comments»), `docs/DATABASE.md`
- `services/api/shaperoute_api/comments.py` (il modello da seguire),
  `comment_filter.py`, `drawings.py` (`drawing_seen_sql`)
- Parte B: `apps/mobile/src/social/DrawingCard.tsx`, `DrawingComments.tsx`,
  `src/intro/HeartBadge.tsx`, `src/map/MapView.tsx`, `src/map/mapPage.ts`

## Le scelte

Dell'utente:

1. **Sei reazioni**, in quest'ordine: il cuore di Sgrava (`HeartBadge`, il
   cuore sul quadrato giallo), 🔥 👏 💪 😂 😮.
2. **Una reazione a testa** per disegno: sceglierne un'altra la cambia,
   ritoccare la propria la toglie.
3. **Sotto il disegno**: le tre più usate e il totale, accanto al
   pulsante dei commenti.
4. **Il cuore di Sgrava è il super like** e si mette con **un doppio
   tocco sul disegno aperto** (sulla sua mappa).
5. **Il super like vuole un commento di almeno 2 caratteri**: senza, non
   si salva.
6. Senza rete la reazione torna com'era, con un avviso.

Dell'agente, su delega (nell'ADR):

7. **Codici fissi**, non i caratteri delle emoji: `super_like`, `fire`,
   `clap`, `strong`, `laugh`, `wow`. L'app li disegna; un'emoji nuova è
   una migrazione e una riga nel contratto.
8. **Super like e commento insieme**, in una sola richiesta e una sola
   transazione: o si salvano tutti e due, o niente. Il commento passa da
   `checked_text` e dal filtro di TASK-213 come gli altri; il minimo è 2
   caratteri senza gli spazi ai lati. Un commento negativo: `422
   comment_rejected` e l'avviso di ADR-0176, niente super like.
9. **Dopo, sono due cose separate**: togliere o cambiare il super like
   lascia il commento (sono parole scritte, restano finché chi le ha
   scritte non le cancella); cancellare il commento lascia il super like.
10. **Doppio tocco su un super like già messo**: il cuore compare di
    nuovo, nient'altro (come Instagram: il doppio tocco non toglie mai).
11. **Il tocco sul pulsante delle reazioni apre la barra delle sei**; il
    cuore di Sgrava nella barra apre lo stesso campo del commento. Così
    chi usa VoiceOver, che non fa il doppio tocco sulla mappa, mette il
    super like dalla barra.
12. **Sul disegno aperto il doppio tocco non fa più lo zoom** della mappa;
    lo zoom con due dita resta. Altrove la mappa non cambia.
13. **Le reazioni hanno il loro endpoint**, come il numero dei commenti
    (`total` di TASK-120): `DrawingDetail` non cambia, e il feed vero
    (TASK-118) potrà portarle nelle sue schede.
14. Chi ha fatto il disegno può reagire al suo, come altrove.

## Cosa fare

### Parte A — l'API

1. Migrazione (il primo numero libero al merge, oggi `0015`): tabella
   `reactions` con `drawing_id` e `user_id` (chiave primaria la coppia:
   una a testa, garantito dal database), `kind` con un `CHECK` sui sei
   codici, `created_at`; `ON DELETE CASCADE` su disegno e account; un
   indice per account.
2. `reactions.py`, sul modello di `comments.py`:
   - `GET /drawings/{id}/reactions` → `{counts, total, mine}`: `counts`
     ha i sei codici (anche a zero), `mine` il codice di chi chiede o
     `null`;
   - `PUT /drawings/{id}/reaction` con `{kind}`, idempotente; per
     `super_like` anche `{comment}` (2–500 caratteri, filtro di TASK-213),
     salvati insieme; risponde con le reazioni e, se c'è, il commento
     nuovo (`Comment` di TASK-120);
   - `DELETE /drawings/{id}/reaction`, idempotente, risponde con le
     reazioni;
   - chi non vede il disegno (`drawing_seen_sql`): `404` come per un id
     che non c'è; un limite di cambi al minuto per account.
3. `app.py`: `install_reactions(app)` dopo i commenti.
4. Contratto in `packages/shared-types` (tipi e fixture).
5. Test in `tests/test_reactions.py`; `API.md`, `DATABASE.md`.

### Parte B — l'app

1. `src/api/reactions.ts`: le tre chiamate.
2. Sotto il disegno aperto (`DrawingCard.tsx`, una riga): la riga delle
   reazioni (`DrawingReactions.tsx`): il pulsante con la propria reazione
   (o una faccina neutra se non c'è), le tre più usate, il totale. Il
   tocco apre la barra delle sei; scegliere cambia subito e torna
   indietro con un avviso se l'API rifiuta.
3. Il doppio tocco sulla mappa del disegno aperto: `MapView.tsx` e
   `mapPage.ts` prendono il doppio tocco senza zoom quando glielo si
   chiede, `App.tsx` lo passa solo con un disegno aperto. Il cuore giallo
   compare grande sul disegno.
4. Il foglio del super like (`SuperLikeSheet.tsx`): il campo del
   commento sopra la tastiera, «Send» spento sotto i 2 caratteri,
   «Cancel» che non lascia niente; dopo «Send» il cuore e il commento
   contano insieme. Non è ottimista: aspetta l'API (il commento può
   essere rifiutato).
5. Testi nelle cinque lingue, da confermare con l'utente prima del
   merge. Proposta: «Super like», «Write a comment to send your super
   like», «At least 2 characters», «Send», «Cancel», «React», «Your
   reaction: {name}», «Your reaction wasn't saved. Check the
   connection.»; per VoiceOver i nomi delle sei: «Sgrava heart, super
   like», «Fire», «Clap», «Strong», «Laugh», «Wow».
6. Test; `UI.md`.

## Criteri di accettazione

- [ ] Due `PUT` di fila dello stesso utente contano una reazione; un
      `PUT` con un'altra la cambia; `DELETE` la toglie.
- [ ] `super_like` senza commento, o con meno di 2 caratteri: `422`, e non
      si salva niente.
- [ ] `super_like` con un commento negativo: `422 comment_rejected`, e
      non si salvano né il super like né il commento.
- [ ] `super_like` con un commento buono: il super like conta e il
      commento compare in `GET /drawings/{id}/comments`.
- [ ] Reazione a un disegno che chi chiede non vede: `404`.
- [ ] Cancellato un disegno o un account, le sue reazioni spariscono.
- [ ] App: il doppio tocco sul disegno aperto mostra il cuore e apre il
      campo del commento; «Cancel» non lascia niente; lì il doppio tocco
      non fa zoom, le due dita sì.
- [ ] App: dalla barra si mette il super like anche con VoiceOver.
- [ ] Senza rete una reazione torna com'era, con un avviso.
- [ ] Test verdi; prova sull'iPhone con due account.

## File toccati

Parte A:

```
services/api/migrations/0015_reactions.sql
services/api/shaperoute_api/reactions.py
services/api/shaperoute_api/app.py
services/api/tests/test_reactions.py
packages/shared-types/src/index.ts
packages/shared-types/fixtures/reaction-request.json
packages/shared-types/fixtures/super-like-request.json
packages/shared-types/fixtures/reactions.json
packages/shared-types/fixtures/reaction-result.json
packages/shared-types/tests/
docs/API.md
docs/DATABASE.md
docs/STATUS.md
docs/tasks/TASK-119.md
```

Parte B:

```
apps/mobile/src/api/reactions.ts
apps/mobile/src/api/reactions.test.ts
apps/mobile/src/social/DrawingReactions.tsx
apps/mobile/src/social/DrawingReactions.test.tsx
apps/mobile/src/social/SuperLikeSheet.tsx
apps/mobile/src/social/SuperLikeSheet.test.tsx
apps/mobile/src/social/useDrawingReactions.ts
apps/mobile/src/social/reactionKinds.ts
apps/mobile/src/social/DrawingCard.tsx
apps/mobile/src/map/MapView.tsx
apps/mobile/src/map/mapPage.ts
apps/mobile/App.tsx
apps/mobile/src/i18n/
docs/UI.md
docs/STATUS.md
docs/tasks/TASK-119.md
```

`src/social/` e `DrawingCard.tsx`: liberi, ok del coordinatore del
2026-10-04 (TASK-211 B e TASK-208 B non sono partite). `MapView.tsx`,
`mapPage.ts` e `App.tsx`: da chiedere al coordinatore quando parte la
parte B. Il nome della migrazione segue il primo numero libero al merge.

## Fuori scope

- L'elenco di chi ha reagito. Le notifiche.
- Le reazioni ai commenti.
- Le reazioni nei post di esempio del «Feed» e nelle schede del feed vero
  (TASK-118 le porterà con gli stessi endpoint).
- Il doppio tocco sui quadratini della griglia del profilo (scartato
  dall'utente: il tocco singolo apre subito).
- Un limite di super like al giorno.

## Esito

