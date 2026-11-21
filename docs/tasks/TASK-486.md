# TASK-486 — L'attrezzatura: scarpe, bici, sci e tutto il resto, coi km

**Stato**: Todo · parte 0 (domande e documenti) chiusa il 2026-11-21
**Fase**: 5 · **Branch**: `docs/TASK-486-gear` (parte 0), poi
`feat/TASK-486-<parte>-…` per ogni parte
**ADR**: ADR-0393 · numeri dal Coordinatore (fork 2), 2026-11-21

## Obiettivo

Ogni iscritto tiene la lista della sua attrezzatura (scarpe, bici, sci,
caschi, imbraghi, vele…), la aggancia alle attività, e ogni attrezzo conta
da solo i suoi km, le ore o le uscite. La lista si vede sul suo profilo.

## La richiesta (2026-11-21)

> «Possibilità di aggiungere il modello di scarpa, il modello di bici, lo
> sci, poi associarla alla corsa/attività, così segna i km… e poter vedere
> sul profilo dell'utente o amico tutta la sua attrezzatura, scarpe,
> vestiti anche volendo, bici, sci, scarpe arrampicata, scarpone, e possono
> aggiungere anche dei commenti all'attrezzatura, tipo quando l'hanno
> comprata.» Poi: «anche vele, imbraghi, caschi… tutto proprio».

## Contesto da leggere

- `services/api/shaperoute_api/activities.py` (docstring: il server conta
  metri e secondi di ogni attività, che resta del suo proprietario);
- `services/api/migrations/0050_outfit_tags.sql`,
  `services/api/shaperoute_api/outfit_tags.py`, `docs/API.md`
  «Outfit tags» (i capi taggati sulle foto dei post, TASK-394, ADR-0333);
- `docs/API.md` e `docs/DATABASE.md` per le foto (`drawing_photos`) e la
  visibilità del profilo;
- `apps/mobile/src/activities/RunEnd.tsx` (il modulo di fine attività).

## Scelte dell'utente (2026-11-21)

1. **Prima versione «Base + foto»**: un attrezzo ha tipo, marca e modello,
   un nome scelto da chi lo possiede, la data d'acquisto, una nota
   («comprate a Milano, mezza di Roma») e una foto. Per ogni sport un
   attrezzo predefinito che si aggancia da solo a ogni attività e si cambia
   a fine attività; i totali salgono da soli. I **commenti degli amici**
   sugli attrezzi non entrano qui: la «nota» è di chi possiede l'attrezzo.
2. **Ogni tipo di attrezzo**, «tutto proprio»: scarpe, bici, sci, scarponi,
   scarpette d'arrampicata, imbraghi, caschi, vele, tavole, pagaie, vestiti
   e un tipo «Other» libero.
3. **Collegata ai capi taggati**: l'attrezzatura è la lista fissa; quando
   si tagga una foto di un post si può scegliere un attrezzo dalla propria
   lista invece di riscrivere marca e modello, e il pallino apre
   l'attrezzo. I tag di oggi restano come sono.
4. **Visibile come il profilo**: la vede chi vede già il profilo; ogni
   attrezzo ha «Hide from profile» (i suoi totali contano lo stesso).
5. **Ritira e avviso**: «Retire» toglie un attrezzo dalla scelta e lo
   tiene nella storia coi suoi totali. Un limite facoltativo per attrezzo
   (per esempio 700 km): raggiunto, un avviso nell'app («Your Pegasus 41
   reached 700 km»). Cancellare resta possibile.
6. **Nel dettaglio del post**: una riga piccola «👟 Pegasus 41 · 412 km»
   che apre l'attrezzo. Non sulla scheda del Feed, che resta com'è. Un
   attrezzo nascosto dal profilo non si vede neanche qui.

## Decise dall'agente su delega dell'utente

- **Più attrezzi per attività** (scarpe e casco, bici e casco, imbrago e
  scarpette), al massimo 10; i predefiniti di uno sport possono essere più
  di uno. Con un attrezzo per attività casco e imbrago non conterebbero
  mai.
- **Cosa si conta** dipende dal tipo: km per scarpe, bici, sci, scarponi,
  tavole, vele, pagaie; ore e uscite per tutti. La scheda mostra la prima
  misura del tipo (km, se no ore). I numeri li conta il server dalle
  attività agganciate, come i totali del profilo: mai quelli del telefono.
- **I tipi in una lista fissa nel server** (come `OutfitItem`), con
  `other` e un nome libero: la lista può crescere con una migrazione, mai
  restringersi.
- **Le attività di prima** si agganciano a mano da «My activities»
  (dettaglio dell'attività, «Gear»); niente aggancio automatico
  all'indietro.

## Le parti

Ogni parte è una PR. Prima di ognuna la lista dei file va al Coordinatore;
server e privacy col sì dell'utente.

### Parte A — Il server (solo API, spenta nell'app)

- Migrazione `00NN_gear.sql` (il numero libero al momento):
  - `gear` (id, user_id con `ON DELETE CASCADE`, `kind` dalla lista,
    `brand`, `model`, `name`, `bought_on`, `note`, `hidden`,
    `retired_at`, `limit_m`, `created_at`);
  - `gear_photos` (una foto per attrezzo, JPEG come quelle dei post);
  - `activity_gear` (attività ↔ attrezzo, al massimo 10 per attività);
  - `gear_defaults` (sport ↔ attrezzi predefiniti);
  - `drawing_outfit_tags.gear_id` facoltativo, `ON DELETE SET NULL`;
  - `reports.kind` con `gear` (nome, nota e foto si segnalano).
- `gear.py`: `GET/POST /me/gear`, `PATCH/DELETE /me/gear/{id}`,
  `PUT/DELETE /me/gear/{id}/photo`, `PUT /me/gear/defaults/{sport}`,
  `PUT /me/activities/{key}/gear`, `GET /users/{id}/gear` con le regole
  di visibilità del profilo, senza gli attrezzi nascosti. I totali (metri,
  secondi, uscite) dalle attività agganciate.
- Nome, marca, modello e nota passano dal filtro dei commenti
  (`comment_filter`), come i capi taggati.
- `docs/API.md` «Gear», `docs/DATABASE.md`; test in PostgreSQL vero.
- **Privacy** nelle cinque lingue e sul sito prima che l'app la mostri
  (testo approvato dall'utente). Server: un passo, col sì dell'utente.

### Parte B — La lista e la scheda dell'attrezzo (app)

- «Gear» da «Settings» e dal proprio profilo: la lista divisa in «In use»
  e «Retired», «Add gear», la scheda con foto, tipo, marca, modello, nome,
  data, nota, limite, «Hide from profile», «Retire», «Delete».
- I predefiniti per sport nella scheda («Use by default for: Run, Trail»).
- File nuovi in `apps/mobile/src/gear/`; testi in en/it/de/fr/es.

### Parte C — Fine attività e «My activities»

- Nel modulo di fine attività una riga «Gear» coi predefiniti dello sport
  già scelti; si tolgono o se ne aggiungono altri. Anche nel dettaglio di
  un'attività salvata.
- `RunEnd.tsx` è un punto caldo (il `saveRef` di TASK-478): la riga va in
  un componente nuovo, in `RunEnd.tsx` solo l'aggancio, col via del
  Coordinatore.

### Parte D — Sul profilo

- Una sezione «Gear» in `ProfileHome.tsx` e `UserProfilePage.tsx`: le
  schede degli attrezzi in uso, poi «Retired». Le due pagine oggi le tocca
  TASK-309 B1: la sezione è un componente nuovo, l'aggancio nelle pagine
  dopo il merge di 309 B1.

### Parte E — Nel dettaglio del post

- Il dettaglio di un disegno porta `gear` (gli attrezzi agganciati e non
  nascosti, coi totali); nell'app la riga «👟 Pegasus 41 · 412 km» apre
  la scheda dell'attrezzo. Le app di prima ignorano il campo.

### Parte F — I capi taggati dalla propria attrezzatura

- Nell'editor dei tag di una foto, «From my gear»: scelto un attrezzo,
  tipo, marca e modello vengono da lì e il tag tiene `gear_id`; il pallino
  apre l'attrezzo (e «Shop» resta com'è, se c'è un link).

### Parte G — L'avviso del limite

- Quando un'attività porta un attrezzo oltre il suo limite, una voce nella
  campanella, una volta sola per limite; niente push nella prima versione.

## Criteri di accettazione (per tutto il task)

- [ ] Un iscritto aggiunge un attrezzo di ogni tipo della lista, con foto
      e nota, e lo trova nella sua lista.
- [ ] Un'attività salvata con un predefinito fa salire i totali di
      quell'attrezzo dei metri e dei secondi contati dal server.
- [ ] Chi vede il profilo vede la sezione «Gear» senza gli attrezzi
      nascosti; chi non vede il profilo riceve 404 da
      `GET /users/{id}/gear`.
- [ ] Un attrezzo ritirato non compare nella scelta di fine attività e
      tiene i suoi totali.
- [ ] Un limite superato dà una sola voce nella campanella.
- [ ] Nel dettaglio di un post si vede la riga dell'attrezzo, non sulla
      scheda del Feed.
- [ ] Un tag di foto fatto da «From my gear» apre l'attrezzo.
- [ ] Cancellare l'account cancella attrezzi, foto e agganci.
- [ ] La privacy lo dice nelle cinque lingue e sul sito prima dell'uscita.

## File toccati

Parte 0 (questa PR, soli documenti):

```
docs/tasks/TASK-486.md        (nuovo)
docs/DECISIONS.md
docs/STATUS.md
docs/INDEX.md
```

Le liste delle parti A–G si scrivono qui prima di ogni parte, dopo il via
del Coordinatore.

## Fuori scope

- I commenti degli amici sugli attrezzi (scelta 1: una parte dopo, se
  l'utente la chiede).
- Prendere l'attrezzatura da Strava o Garmin, mandarla a Strava.
- Link ai negozi sull'attrezzo e conteggi di «Shop» (restano dei capi
  taggati).
- Push per il limite, suggerimenti di sostituzione, prezzi.
- Agganciare da sole le attività di prima.

## Esito

*(a fine task)*
