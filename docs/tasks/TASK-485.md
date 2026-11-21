# TASK-485 — La scheda della palestra come post

**Stato**: In lavorazione · parte 0 (documenti) fatta il 2026-11-21; A
(server) aspetta il turno del Coordinatore; B (app) dopo A sul server e
dopo TASK-481 A in `main`
**Fase**: 5 · **Branch**: `docs/TASK-485-gym-plan-post` (parte 0); A e B
ciascuna col suo branch e la sua PR
**Dipende da**: TASK-481 (il foglio «Add to Feed» e `addToFeedEntries.ts`,
ADR-0390), TASK-312 C1 (il disegno senza corsa, ADR-0272 precisazione C,
in `main`), TASK-433 e TASK-461 (le schede guidate e il pianificatore,
ADR-0360, ADR-0371)
**Parente**: TASK-466 E (la routine di stretching pubblicata, stessa
forma): due task separati per scelta del Coordinatore (2026-11-21). Al
2026-11-21 la E non è partita; quando parte, riusa il modo di questo task
(un disegno senza corsa con un'istantanea, un tipo suo in `X-MuW-Reads`).
**ADR**: ADR-0NNN (numero dal Coordinatore)

## Obiettivo

«Workout plan», la sesta voce del foglio «Add to Feed» (TASK-481, scelta
dell'utente del 2026-11-21): si sceglie una delle proprie schede (piani)
della palestra e la si pubblica nel Feed; chi la vede la copia fra le sue
schede con «Use this plan».

## Contesto da leggere

- `docs/tasks/TASK-481.md` (punti 3, 5, 6; parte E), ADR-0390;
- ADR-0272 precisazione C, `services/api/shaperoute_api/photo_posts.py`,
  migrazione `0080_photo_posts.sql`, `reads.py`;
- ADR-0360, ADR-0371, `docs/sports/gym.md` «Le schede guidate»,
  `services/api/shaperoute_api/gym_plans.py`;
- app: `apps/mobile/src/gym/GymPlans.tsx`, `GymPlanWizard.tsx`,
  `apps/mobile/src/api/gymPlans.ts`.

## Già scelto in TASK-481 (2026-11-21)

- Sesta voce del foglio, «Workout plan», riga sotto «Share one of your gym
  plans».
- Pubblicata con nome, obiettivo, giorni a settimana, settimane, esercizi
  di ogni giorno; chi la vede la copia con «Use this plan».
- Parte da «Everyone», che si vede e si cambia prima di «Post».
- Una riga di privacy sua, approvata dall'utente (punto 4 sotto).

## Parte 0 — Le scelte dell'utente (2026-11-21)

Una domanda per volta, ognuna con la proposta dell'agente.

1. **Che cosa mostra nel Feed.** Proposta, **accettata («Riquadro +
   dettaglio»)**: nel Feed un riquadro con nome, obiettivo, «4 days a week ·
   8 weeks», gli sport del piano e la settimana con la lettera di ogni
   allenamento; sopra, una riga di testo dell'autore, facoltativa.
   Toccato, si apre la scheda intera: ogni giorno coi suoi esercizi e le
   corse o uscite per nome («Long run · 8 km»), e «Use this plan» in fondo.
   Scartati: tutto aperto nel Feed; solo il riquadro senza dettaglio.
2. **Che cosa copia «Use this plan».** Proposta dell'agente: la struttura
   senza i kg. **Risposta: «Anche i kg»**. Si copiano giorni, esercizi,
   serie, ripetizioni, tempi **e kg**, il modo delle settimane, il ciclo,
   le settimane scritte a mano, le corse e le uscite. Restano dell'autore e
   non si copiano (parte della proposta, non toccata dalla risposta): i
   ritmi di corsa (se il piano ha corse, la guida chiede a chi copia «How do
   you run today?»), la data della meta (la meta resta, la data diventa
   «quando sono pronto»), il primo giorno (lo sceglie chi copia). Si apre
   l'ultimo passo della guida (nome, primo giorno) e «Save plan».
   Scartati: struttura senza kg; tutto uguale, ritmi e data compresi.
   Conseguenza: la scheda aperta mostra anche i kg («4 × 10 · 60 kg»).
3. **Se l'autore cambia o cancella la sua scheda.** Proposta, **accettata
   («No, resta com'era»)**: il post è una fotografia della scheda al
   momento di «Post». Cambiarla o cancellarla fra le proprie schede non
   tocca il post; per la versione nuova si fa un post nuovo. Scartati: il
   post segue la scheda; fotografia con «Update post».
4. **Testi e privacy.** **Risposta: «Approvo»**, in inglese; italiano,
   tedesco, francese e spagnolo li prepara l'agente e vanno all'utente con
   le schermate della parte B. In italiano la scheda di più settimane è il
   «piano» (`gym.md`).

   | Dove | Testo |
   |---|---|
   | Voce del foglio (già approvata) | «Workout plan» · «Share one of your gym plans» |
   | Scelta della scheda, titolo | «Choose a plan» |
   | Scelta della scheda, vuota | «No plans yet: make one in Gym › Plans.» |
   | Prima di «Post», testo | «Say something about this plan (optional)» |
   | Prima di «Post» | «Who sees it: Everyone» (si cambia lì) · «Post» |
   | Riquadro nel Feed | «Workout plan» · «{name} · {goal}» · «4 days a week · 8 weeks» · gli sport · «Use this plan» |
   | Scheda aperta | «A · Mon — Bench press 4 × 10 · 60 kg …» · «Thu — Long run · 8 km» · «Use this plan» |
   | Dopo la copia | «Added to your plans» |
   | 20 schede già fatte | «You already have 20 plans: delete one to add this.» |

   **Privacy** (sostituisce la frase di oggi sulle schede, «Your gym plans
   (…) only you see them…»), nelle cinque lingue e sul sito:

   > Your gym plans (their names, days, exercises and target values) are
   > kept on your phone and on your account, and they are deleted with your
   > account. Only you see them, unless you share one in the Feed: the post
   > is a copy of the plan as it was when you posted it, with its name,
   > goal, days, weeks, exercises and weights. Whoever sees the post can
   > copy the plan into their own plans. Changing or deleting your plan
   > does not change the post; deleting the post takes it off the Feed,
   > while copies already made stay with whoever made them. The calendar of
   > your workouts is seen only by you.

## Il modo (deciso dall'agente su delega dell'utente, ADR-0NNN)

Verificato sul codice di `main` (`5ef3d45b`):

1. **Un disegno senza corsa**, come il post di sole foto (ADR-0272
   precisazione C): `drawings.run_id` vuoto, `drawings.key` del telefono,
   l'autore in `drawings.user_id`. Reazioni, commenti, segnalazioni,
   blocchi, nascosti, «Followers», push e campanello valgono già per un
   disegno senza corsa dopo TASK-312 C1: nessuna tabella nuova. Chi parte
   da `runs` (totali, record, calendario, gioco, badge, concorso, «My
   activities») non lo vede mai.
2. **L'istantanea nel disegno**: una colonna nuova `drawings.plan` JSONB
   (migrazione col primo numero libero al merge, oggi dopo `0080`). Un
   disegno senza corsa con `plan` è una scheda pubblicata, senza `plan` è un
   post di sole foto. Il vincolo `drawings_photo_post_check` di 0080 vale
   già (mai «Only me», nessuna traccia); in più `plan` solo senza corsa.
   Pubblicato subito (`published_at` alla creazione), niente foto.
3. **Che cosa c'è nell'istantanea**: nome, giorni, esercizi coi kg, e il
   programma (obiettivo, settimane, modo, passo in kg, recupero, gli
   allenamenti, le settimane scritte a mano, la meta **senza data**),
   validati dagli stessi modelli di `gym_plans.py`. **Il server rifiuta**
   (`422`) un'istantanea con `runner` (i ritmi sono dell'autore e la
   privacy non li nomina) e non tiene `starts_on`. La manda il telefono, che
   ha la scheda anche senza rete: nessun legame con la riga di `gym_plans`
   (punto 3 delle scelte: il post resta com'era).
4. **Le rotte**, sotto `/me/plan-posts/{key}` come quelle delle foto: `PUT`
   crea (201) o rimanda la stessa (200), cambia testo e «chi lo vede»;
   `DELETE` lo toglie; `GET` per il proprio. Il disegno si legge dal Feed e
   dal dettaglio come gli altri, con `source: "plan"` e il campo `plan`.
5. **`plans` in `X-MuW-Reads`** (`reads.py`): solo le app che lo dicono
   ricevono una scheda pubblicata; `drawings_sql()` separa sole foto
   (`photos`) e schede (`plans`). Il server esce prima dell'app senza
   cambiare niente di quello che si vede.
6. **«Use this plan» non chiede rotte nuove**: il telefono fa una scheda
   nuova (chiave nuova) dall'istantanea, apre l'ultimo passo della guida e
   la salva con `PUT /me/gym-plans/{key}`, che tiene già il limite di 20.
   Il calcolo delle settimane è quello di sempre (`program.ts`,
   `targetWeeks.ts`).

**Alternative scartate**: il post che punta alla riga di `gym_plans`
(cambierebbe con la scheda, e sparirebbe con lei: contro la scelta 3); una
tabella `plan_posts` a sé (reazioni, commenti, segnalazioni da rifare);
una corsa finta di palestra (ogni lettore di `runs` da filtrare).

## Parti

### A — Il server (TASK-485 A)

Migrazione, `plan_posts.py`, `plans` in `X-MuW-Reads`, il disegno con
`source: "plan"` nel Feed e nel dettaglio, i tipi in `shared-types`.
Server col passo del Coordinatore e il sì dell'utente, prima della B.
Nessun cambiamento per le app che non dicono `plans`.

**File toccati (da approvare dal Coordinatore):**

```
services/api/migrations/00NN_plan_posts.sql          (nuovo: drawings.plan)
services/api/shaperoute_api/plan_posts.py            (nuovo: /me/plan-posts)
services/api/shaperoute_api/app.py                   (il router)
services/api/shaperoute_api/reads.py                 (plans; drawings_sql)
services/api/shaperoute_api/drawings.py              (source "plan", il campo plan)
services/api/shaperoute_api/feed.py                  (idem nel Feed)
services/api/shaperoute_api/gym_plans.py             (solo se serve esporre un modello dell'istantanea)
services/api/tests/test_plan_posts.py                (nuovo)
services/api/tests/test_reads.py
packages/shared-types/src/index.ts                   (PlanDrawing, PlanFeedPost, isPlanPost)
packages/shared-types/fixtures/plan-post-request.json (nuovo)
packages/shared-types/fixtures/feed-plans.json       (nuovo)
packages/shared-types/fixtures/reads.json
packages/shared-types/test/planPosts.test.ts         (nuovo)
docs/API.md
docs/DATABASE.md
docs/tasks/TASK-485.md
```

Se un lettore che parte da un disegno (email, campanello, segnalazioni)
nomina il tipo del post, la lista cresce: la nuova lista va al
Coordinatore prima del codice.

### B — L'app (TASK-485 B, esce con un OTA)

- La riga «Workout plan» in `addToFeedEntries.ts`, **dopo TASK-481 A in
  `main`**: c'è con un account, anche con zero schede (la scelta lo dice).
- Il flusso nel foglio: «Choose a plan» (le proprie schede, come in «My
  plans»), poi testo facoltativo, «Who sees it: Everyone» e «Post»; il post
  va in coda e parte anche senza rete, con la chiave del telefono.
- Il riquadro nel Feed e la scheda aperta (scelta 1), coi kg (scelta 2).
  L'autore non vede «Use this plan» sul suo post.
- «Use this plan»: la scheda nuova dall'istantanea, l'ultimo passo della
  guida (nome, primo giorno), «How do you run today?» se ha corse; «Added
  to your plans»; con 20 schede il messaggio del punto 4.
- `plans` nell'intestazione `X-MuW-Reads` dell'app.
- I testi nelle cinque lingue; la privacy a turno, col sì dell'utente sulle
  quattro traduzioni e le schermate dal simulatore.

**File toccati (da approvare dal Coordinatore; la lista esatta prima del
codice, perché i file del Feed e della guida sono in coda ad altri task):**

```
apps/mobile/src/feed/addToFeedEntries.ts             (una riga, dopo TASK-481 A)
apps/mobile/src/feed/addToFeedEntries.test.ts
apps/mobile/src/feed/PlanPostFlow.tsx                (nuovo: scelta, testo, Post)
apps/mobile/src/feed/PlanPostFlow.test.tsx           (nuovo)
apps/mobile/src/feed/PlanPostTile.tsx                (nuovo: il riquadro)
apps/mobile/src/feed/PlanPostDetail.tsx              (nuovo: la scheda aperta)
apps/mobile/src/feed/PlanPost.test.tsx               (nuovo)
apps/mobile/src/feed/FeedPost.tsx                    (source "plan" → il riquadro)
apps/mobile/src/api/planPosts.ts                     (nuovo, con la coda)
apps/mobile/src/api/planPosts.test.ts                (nuovo)
apps/mobile/src/api/reads.ts                         (plans in X-MuW-Reads)
apps/mobile/src/api/reads.test.ts
apps/mobile/src/gym/planCopy.ts                      (nuovo: istantanea ↔ scheda)
apps/mobile/src/gym/planCopy.test.ts                 (nuovo)
apps/mobile/src/gym/GymPlanWizard.tsx                (aprire l'ultimo passo con una scheda data)
apps/mobile/src/i18n/{it,de,fr,es}.ts
docs/sports/gym.md                                   (la scheda pubblicata)
docs/tasks/TASK-485.md
```

A turno (privacy, punto 4):

```
apps/mobile/src/about/content/{en,it,de,fr,es}.ts
apps/mobile/src/about/documents.test.ts              (+ AboutPage.test.tsx, site/tests/privacy.test.mjs: la data)
site/privacy/**/index.html                           (rigenerate con make_privacy.mjs)
```

## Criteri di accettazione

- [x] **0**: scelte dell'utente scritte qui e nell'ADR; parti e liste dei
      file al Coordinatore.
- [ ] **A**: `PUT /me/plan-posts/{key}` crea una volta sola; rifiuta
      `runner` e «Only me»; un'app senza `plans` non riceve mai la scheda
      pubblicata (test); reazioni, commenti, blocchi e nascosti valgono
      (test); chi parte da `runs` non la vede (test). CI verde; sul server
      col passo del Coordinatore.
- [ ] **B**: la voce compare solo con un account; pubblica una scheda
      anche senza rete; il riquadro e la scheda aperta coi kg; «Use this
      plan» fa una scheda nuova coi kg, senza ritmi e senza data; con 20
      schede il messaggio (test). Schermate e quattro traduzioni approvate
      dall'utente; privacy nelle cinque lingue e sul sito; `tsc` e jest dei
      file toccati verdi, CI verde.

## Fuori scope

- La routine di stretching pubblicata (TASK-466 E).
- Foto nel post della scheda; ricerca, link pubblico e chat per una scheda
  pubblicata (come per i post di sole foto, dopo, se l'utente li vuole).
- «Update post» da una scheda cambiata (scartato, scelta 3).

## Esito

_(a fine task)_
