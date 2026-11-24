# GRUPPI — I gruppi per uscire insieme («Groups»)

> Regole dei gruppi di MuW (TASK-495, ADR-0402). Il perché sta in
> `DECISIONS.md`, i passi in `tasks/TASK-495.md`, i contratti esatti in
> `API.md` quando la parte A li scrive. Le uscite di un gruppo sono le
> corse di gruppo di `EVENTI.md`: qui c'è solo quello che cambia.

## 1. Cos'è

Un **gruppo** è una comunità che resta nel tempo, per uscire insieme a
camminare, in bici, in gravel, in alpinismo e negli altri sport di MuW. Ha
una pagina, dei membri e le sue **uscite**: le corse di gruppo di TASK-309
legate al gruppo. È il pezzo che `EVENTI.md` §13 lasciava fuori («I club,
con una pagina propria»).

Richiesta dell'utente del 2026-11-23: «poter fare dei gruppi dentro l'app
per andare a camminare insieme, in bici insieme e in alpinismo insieme».
La proposta con i default ha avuto il sì dell'utente, punto per punto, lo
stesso giorno: sono le regole qui sotto.

## 2. Il gruppo

| Campo | Regola |
|---|---|
| nome | obbligatorio, una riga, al più **40** caratteri |
| foto | facoltativa, JPEG o PNG come la foto del profilo (TASK-178); senza, l'icona del primo sport |
| descrizione | facoltativa, al più **500** caratteri, a capo compresi |
| sport | da **1 a 3** fra gli sport di MuW (hike, walk, bike, gravel, MTB, alpinismo, corsa, …) |
| zona | una **città**, scelta da una lista o dalla mappa: si tiene il nome e un punto arrotondato a ~1 km; **mai un indirizzo** |
| ingresso | **Public**, **Request** (di partenza) o **Invite only** (§3); si cambia dopo |

- Nome e descrizione passano dal **filtro dei testi** (TASK-213,
  `comment_filter.check_comment`): un testo rifiutato non si salva.
- **Al più 5 gruppi** di cui un account è admin; **al più 300 membri** per
  gruppo.
- Chi crea il gruppo vede, sopra «Create», l'avviso di sicurezza di
  `EVENTI.md` §10; per un gruppo con l'alpinismo anche quello del §9.

## 3. Come si entra

- **Public**: «Join» e si è dentro.
- **Request**: «Join» manda una richiesta; admin e co-admin la accettano o
  la rifiutano. Chi chiede vede «Requested» e può ritirarla.
- **Invite only**: il gruppo non compare in Explore né nella ricerca; si
  entra solo su invito di admin o co-admin (cercando il nome della persona,
  o mandando il gruppo in chat come lo «Share» di un post, TASK-455).
  L'invitato accetta o rifiuta.
- **Un gruppo con l'alpinismo è solo Request o Invite only**, mai Public.
- **Un blocco** fra chi chiede e l'admin (`follows.apart_sql`, nei due
  sensi) nasconde il gruppo del tutto: non si vede, non si apre, non si
  entra; risponde come un id che non c'è. Un iscritto nascosto
  (`users.hidden_at`) è lontano da tutti, come oggi.

## 4. I ruoli

- Chi crea è **admin**. C'è sempre un admin, e uno solo.
- L'admin nomina **fino a 3 co-admin**. Admin e co-admin accettano le
  richieste, invitano, creano e annullano le uscite del gruppo, rimuovono i
  membri. Solo l'admin cambia nome, foto, descrizione, sport, zona e
  ingresso, nomina e toglie i co-admin, rimuove un co-admin.
- **Uscire**: ogni membro, in ogni momento. L'admin, per uscire, passa il
  ruolo a un altro membro; se è l'ultimo membro, il gruppo si cancella.
- **Account cancellato**: se era l'admin, il ruolo passa al co-admin più
  vecchio nel ruolo, poi al membro più vecchio nel gruppo; un gruppo senza
  membri si cancella.
- **Rimuovere** un membro: non vede più quello che è dei soli membri; può
  chiedere di nuovo di entrare (l'admin può bloccarlo, come oggi).

## 5. La pagina del gruppo

In alto: foto, nome, sport, zona, quanti membri, il bottone «Join» /
«Requested» / «Member» (con «Leave», «Mute», e per l'admin «Edit»).
Sotto, nell'ordine:

1. **Next outings** — le uscite in arrivo del gruppo;
2. **Members** — l'elenco, admin e co-admin in cima, con nome e foto
   piccola, mai l'email;
3. **Recent activity** — i post dei membri negli sport del gruppo, ultimi
   **14 giorni**, solo quelli che chi guarda vede già nel Feed;
4. **Past outings**.

**Chi vede che cosa:**

| | Membro | Non membro, Public | Non membro, Request | Non membro, Invite only |
|---|---|---|---|---|
| intestazione e descrizione | sì | sì | sì | solo se invitato |
| uscite «Everyone» | sì | sì | — (non ce ne sono) | — |
| uscite dei soli membri | sì | no | no | no |
| elenco dei membri, Recent activity | sì | no | no | no |

Chi non è membro vede solo **quanti** sono i membri: l'appartenenza è un
dato personale (§11).

## 6. Le uscite del gruppo

- Sono **le corse di gruppo di `EVENTI.md`** con il gruppo accanto (un
  campo `group_id`): stessi campi, stesso «I'm going», stesso promemoria,
  stessi cambi e annullamento, stessi limiti e avviso di sicurezza.
- **Due tipi**:
  - **con percorso**, come oggi: da Draw, Explore o un Preferito (hike,
    walk, bike, gravel, corsa, …);
  - **senza percorso**, per l'alpinismo e gli sport registrati senza
    percorso (`recordOnly`, ADR-0373): il **punto di ritrovo** scelto sulla
    mappa, giorno e ora, una **«Destination»** scritta (al più 80 caratteri:
    «Cima Tosa, normal route»), note e descrizione. «Start» apre la
    registrazione dello sport, senza percorso.
- **Le crea ogni membro**; admin e co-admin possono annullare quelle degli
  altri. Chi esce dal gruppo o è rimosso: le sue uscite in arrivo si
  annullano, con la push di sempre a chi va.
- **Chi le vede**: di partenza **solo i membri**; in un gruppo Public chi
  crea può scegliere **Everyone**. «Followers» non c'è nelle uscite di un
  gruppo.
- Per dire «I'm going» a un'uscita dei soli membri bisogna essere membri.

## 7. Trovare i gruppi

- **Explore**: una sezione **«Groups»** con i gruppi Public e Request la
  cui zona è **entro 50 km** dal telefono (`FEED_NEAR_M`, la regola del
  Feed), filtro per sport e ricerca per nome (la ricerca per nome vale
  ovunque). Senza la posizione del telefono, solo la ricerca. Gli Invite
  only non compaiono mai.
- **Feed**: le uscite in arrivo dei miei gruppi entrano nella fila «Group
  runs» (`EVENTI.md` §5) quando la fila c'è (TASK-309 B2). Niente gruppi
  suggeriti nel Feed.
- **Profilo**: una riga **«Groups»** coi gruppi dell'account, **visibile
  solo a sé**.

## 8. Notifiche

| Tipo | Quando | A chi |
|---|---|---|
| `group_outing_new` | un membro crea un'uscita nel gruppo | i membri, non chi la crea, non chi ha messo «Mute» |
| `group_run_soon`, `group_run_changed`, `group_run_cancelled` | come `EVENTI.md` §8 | chi va |
| `group_join_request` | qualcuno chiede di entrare | admin e co-admin |
| `group_join_accepted` | la richiesta è accettata | chi l'ha fatta |
| `group_invite` | admin o co-admin invita | l'invitato |

- Valgono l'interruttore «Push notifications» e i blocchi (TASK-262 A).
- **«Mute»**, per ogni gruppo, zittisce solo `group_outing_new` di quel
  gruppo. Nessun interruttore nuovo nelle impostazioni.
- Nessuno di questi tipi entra nell'email del giorno (TASK-262 B).
- La push porta `{ kind, group_id }` o `{ kind, group_run_id }` e apre la
  pagina del gruppo o dell'uscita.

## 9. Alpinismo

- Sempre visibile, sopra «Create» del gruppo e sopra «Publish»
  dell'uscita, quando c'è l'alpinismo (testo approvato dall'utente il
  2026-11-23):

  > Mountaineering is dangerous. MuW doesn't organise, guide or check
  > groups, outings, routes or difficulty, and isn't a mountain guide.
  > Everyone is responsible for their own experience, gear and safety.

- **Nessuna difficoltà né grado dall'app**: solo il testo di chi crea.
- Un gruppo con l'alpinismo è solo Request o Invite only (§3).

## 10. Segnalare, bloccare, sicurezza

- Un gruppo si segnala (`POST /reports`, il tipo nuovo `group`) e la
  segnalazione arriva per email con «Hide it from everyone else»
  (TASK-291): nascosto, lo vedono solo i membri; non entra nessuno di
  nuovo e non compare in Explore. Le uscite si segnalano come oggi
  (`group_run`).
- Blocchi: §3; fra due membri, un blocco toglie l'uno dall'elenco e dalle
  uscite dell'altro, come in `EVENTI.md` §14.
- Ritrovi dal vivo: `EVENTI.md` §10 vale tutto (luogo pubblico, mai a
  casa; MuW non organizza né controlla; tutti su MuW hanno 16 anni o più).

## 11. Privacy

L'appartenenza a un gruppo, il ruolo, le richieste e gli inviti sono dati
nuovi. L'elenco dei membri lo vedono solo i membri; chi non è membro vede
il numero. La riga del profilo la vede solo l'account. Gruppi creati,
appartenenze, richieste e inviti si cancellano con l'account (`ON DELETE
CASCADE`, con il passaggio del ruolo del §4). La riga dell'informativa,
in inglese, da approvare con l'utente nella parte «privacy» prima
dell'OTA:

> If you join or create a group, its members see your name, your photo,
> your role and your posts in the group's sports that they can already
> see. We delete your groups, memberships, requests and invites when you
> delete your account.

## 12. I dati

Le tabelle dei gruppi sono della migrazione `0087_groups.sql` (parte A,
`DATABASE.md`); le colonne nuove di `group_runs` arrivano con la parte C.

```
groups
  id            uuid, primaria
  name          text, 1–40
  description   text, al più 500, facoltativo
  sports        text[], 1–3 nomi di runs.activity
  city          text
  area          geography(Point), arrotondato a ~1 km, indice GIST
  access        'public' | 'request' | 'invite'
  created_at, updated_at, hidden_at

group_photos     (group_id, jpeg, updated_at) — quadrata, 256 px

group_members
  group_id → groups ON DELETE CASCADE, user_id → users ON DELETE CASCADE
  role          'admin' | 'coadmin' | 'member'   (un solo admin: indice unico parziale)
  muted         boolean
  joined_at, role_since
  primaria (group_id, user_id)

group_requests   (group_id, user_id, created_at)              — chi chiede
group_invites    (group_id, user_id, invited_by, created_at)  — chi è invitato

group_runs (TASK-309), in più:
  group_id      → groups ON DELETE CASCADE, facoltativo
  visibility    anche 'group'
  destination   text, al più 80, facoltativo
  il percorso   facoltativo, solo per le uscite senza percorso
```

Il ruolo di admin passa prima che il suo account si cancelli
(`groups.before_account_delete`, §4); tutto il resto va con l'account
(`ON DELETE CASCADE`).

**Scelte della parte A** (dell'agente, su delega dell'utente; ADR-0402,
precisazione A):

- la foto del gruppo è quadrata, 256 px, come quella del profilo; nelle
  schede una copia piccola;
- passato il ruolo, l'admin di prima diventa membro;
- un gruppo che diventa Public fa entrare chi aveva chiesto (fino a 300);
- invitare chi ha già chiesto lo fa entrare, come una richiesta accettata;
- un co-admin toglie i membri, non gli altri co-admin né l'admin;
- in Explore la ricerca per nome vuole almeno 2 caratteri e vale ovunque;
  senza nome serve la posizione del telefono;
- un admin nascosto da una segnalazione (`users.hidden_at`) è lontano da
  tutti: il suo gruppo non lo vede più nessuno, membri compresi, finché
  resta nascosto;
- «Recent activity» (parte A2) tiene solo i post di una corsa di uno sport
  del gruppo: non i post di sole foto, del sonno o di una scheda;
- la push di una nuova uscita (`group_outing_new`) arriva con le uscite,
  nella parte C.

## 13. Fuori da questa versione

Gruppi a pagamento o quote; classifiche e statistiche di gruppo; badge di
gruppo; uscite che si ripetono; posti limitati e liste d'attesa; uscite di
più giorni; «Add to calendar» (modulo nativo); sottogruppi; gruppi
verificati o di società; il link d'invito che apre l'app (aspetta TASK-482
D e la build nativa). La **chat di gruppo** non è fuori: è la parte E,
dopo le altre (§14).

## 14. Le parti

0 documenti (#1515) → **A** API e migrazione (gruppi, membri, richieste,
inviti, segnalazioni, push; #1538) → **A2** «Recent activity» (#1543) →
**B** app: crea, entra, pagina del gruppo → **C**
uscite di gruppo per più sport, anche senza percorso (tocca i file di
TASK-309: la lista al Coordinatore prima) → **D** Explore e notifiche →
**privacy** (prima dell'OTA) → **E** chat di gruppo: testo e foto, filtro
dei testi su ogni messaggio, segnalazione del messaggio, l'admin cancella.
Nessun modulo nativo: tutto esce con un OTA.
