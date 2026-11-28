# TASK-459 — «Segui subito» sui profili aperti

**Stato**: In corso · parte 0 in `main` (#1736); A in `main` (#1740);
C in #1742; B aspetta (vedi «Dove siamo»)
**Fase**: 5 · **Branch**: `docs/TASK-459-part-0` (#1736),
`feat/TASK-459-a-approve-followers` (#1740), `docs/TASK-459-c-privacy`
(#1742), poi `feat/TASK-459-b-…` per l'app
**ADR**: ADR-0370 · numero di task e di ADR dal Coordinatore il 2026-11-11
(punto S14 della seconda prova, lato social); aperto dal «Coordinatore
(fork 3)» il 2026-11-28 col sì dell'utente («Sì, apri la 459»)

## Obiettivo

Oggi «Follow» su qualunque profilo diventa sempre «Requested» e aspetta che
l'altro accetti (TASK-211, ADR-0173). L'utente ha scelto il 2026-11-11
«Segui subito»: su un profilo aperto «Follow» segue subito, senza
richiesta. Alla fine si sa che cosa rende aperto un profilo, chi può ancora
chiedere l'approvazione, cosa succede alle richieste in attesa, quali testi
vede l'utente e se la Privacy cambia; poi le parti A e seguenti.

## Cosa è vero oggi (`origin/main` 66fa42b7, 2026-11-28)

| Punto | Stato | Dove |
|---|---|---|
| Ogni follow è una richiesta | `ask()` scrive sempre `status = 'pending'`; conta solo `accepted` (numeri, liste, chi vede i post «Followers») | `services/api/shaperoute_api/follows.py` |
| Un profilo «pubblico» | **non esiste**: nessuna impostazione dell'account. La visibilità è post per post: `everyone`, `followers`, `only_me` | `drawings.py` (`Visibility`) |
| Cosa vede chi non segue | sul profilo: totali, record, livelli in palestra, attrezzatura non nascosta, VO₂ max se mostrato, i post «Everyone»; mai i post «Followers» | `profiles.py`, `drawings.py` |
| Il pulsante | «Follow» → «Requested» (tocco: ritira la richiesta) → «Following» (tocco: chiede «Stop following {name}?») | `apps/mobile/src/social/FollowButton.tsx` |
| Le richieste | «Requests / Followers / Following» nel profilo; accetta o rifiuta; rifiutare cancella senza dirlo | `social/FollowLists.tsx`, `/me/follow-requests` |
| Le notifiche | push `follow_request` («{name} ha chiesto di seguirti.») e `follow_accepted` («{name} ha accettato la tua richiesta di follow.»); le stesse nella campanella e nell'email delle novità. Nessuna notifica «nuovo follower» senza richiesta | `push.py`, `notification_list.py`, `notice_email.py` |
| Privacy | «Chi segui, chi ti segue e le richieste di follow sono conservati con il tuo account.»; nulla su chi può seguire | `site/privacy/*/index.html` |
| Tabella | `follows (follower_id, followed_id, status, asked_at, …)`, migrazione `0011_follows.sql` | migrazioni |

Il punto di attenzione: con «Segui subito» chiunque tocchi «Follow» vede da
quel momento anche i post «Followers» di quel profilo. Oggi «Followers»
vuol dire «solo chi ho accettato».

## Scelte dell'utente (2026-11-28, una domanda alla volta)

1. **Che cosa rende aperto un profilo: «Interruttore».** Una riga in
   «Settings», **«Approve followers»**. Spenta: chiunque segue subito.
   Accesa: la richiesta come oggi. Erano proposte anche «aperto da solo se
   l'account ha almeno un post "Everyone"» e «tutti aperti, niente più
   richieste».
2. **Da che cosa parte: «Spento, tranne Follower».** Nuovi iscritti:
   spenta. Account di oggi: spenta, ma **accesa per chi ha almeno un post
   «Followers»**, così quei post non si aprono a chi segue senza una sua
   scelta. Erano proposte «spenta per tutti» e «nuovi spenta, vecchi
   accesa».
3. **Le richieste in attesa: «Accettate tutte».** Quando la riga è spenta
   (alla partenza, o perché il proprietario la spegne) le richieste in
   attesa diventano follower subito, come se avessero chiesto adesso, e chi
   aveva chiesto riceve la notifica di oggi «{name} accepted your follow
   request.». Le richieste rifiutate prima restano cancellate. Erano
   proposte «accettate in silenzio» e «restano da decidere».
4. **I testi: «Sì, vanno bene».**
   - Riga: «Approve followers» — it «Approva chi ti segue».
   - Nota sotto la riga: «Off: anyone can follow you at once and see your
     «Followers» posts. On: you accept each request.» — it «Spenta:
     chiunque può seguirti subito e vedere i tuoi post per i Follower.
     Accesa: accetti tu ogni richiesta.»
   - Notifica nuova (push, campanella, email delle novità), tipo
     `new_follower`: «{name} started following you.» — it «{name} ha
     iniziato a seguirti.»
   - Il pulsante resta «Follow» → «Following»: nessun testo nuovo.
   - Privacy, una frase in «Preferiti, commenti, reazioni e follow»: «Con
     "Approva chi ti segue" spento, qualunque iscritto può seguirti subito,
     senza richiesta, e da quel momento vede i tuoi post per i Follower.
     Accendilo in Impostazioni e ogni nuova richiesta aspetta il tuo sì.»
     Entra nella coda della privacy dopo #1725 e #1713, col turno del
     Coordinatore.
   - Tedesco, francese e spagnolo: mostrati all'utente nella PR dell'app
     (parte B) prima del merge.

## Parti

Una PR ciascuna, in quest'ordine; nessun codice prima del via del
Coordinatore sull'elenco dei file.

- **A — API e migrazione `0091`.** `users.approve_followers boolean NOT
  NULL DEFAULT false`; la migrazione la accende per chi ha almeno un
  disegno `visibility = 'followers'` e accetta le richieste in attesa
  verso tutti gli altri. Una migrazione non manda notifiche: le
  `follow_accepted` di quelle accettazioni (scelta 3) le manda un comando
  una tantum dopo il passo del server, nella stessa PR, lanciato dal
  Coordinatore. `POST /users/{id}/follow` scrive `accepted` quando l'altro
  ha la riga spenta e risponde `following`, con la notifica
  `new_follower`; accesa, come oggi. `GET` e `PUT /me/approve-followers`
  (come «Links to my posts»); spegnerla accetta le richieste in attesa
  con `follow_accepted` a ciascuno. Il tipo `new_follower` in push,
  campanella ed email delle novità, nelle cinque lingue. Da misurare
  nella parte A, su una copia del database: quante richieste in attesa e
  quanti account con post «Followers» ci sono. Un'app di prima riceve già
  `following` da `POST …/follow` (`FollowBody`); come mostra una voce
  `new_follower` nella campanella si verifica in A.
- **B — App.** La riga «Approve followers» in «Settings» con la sua nota,
  solo con un'API che la conosce (un'API di prima risponde 404 e la riga
  non c'è, come «Links to my posts»); il tipo `new_follower` nei tipi
  condivisi; i testi nelle cinque lingue.
- **C — Privacy.** La frase approvata, nelle cinque lingue del sito, dopo
  #1725 e #1713. Esce insieme al server della parte A.

Ordine di uscita: A sul server (passo del Coordinatore col sì
dell'utente) e C online insieme, poi B con l'OTA.

### File previsti (da confermare col Coordinatore)

A:

```
services/api/migrations/0091_approve_followers.sql            (nuovo)
services/api/shaperoute_api/follows.py
services/api/shaperoute_api/approve_followers.py               (nuovo: GET/PUT /me/approve-followers)
services/api/shaperoute_api/app.py                             (una riga: install)
services/api/shaperoute_api/push.py                            (tipo e testi new_follower)
services/api/shaperoute_api/notification_list.py
services/api/shaperoute_api/notice_email.py
services/api/tests/test_follows.py
services/api/tests/test_approve_followers.py                   (nuovo)
services/api/tests/test_migration_0091.py                      (nuovo)
services/api/shaperoute_api/accepted_after_0091.py             (nuovo: le notifiche una tantum, python -m)
packages/shared-types/src/index.ts                             (tipo new_follower, corpo della riga)
packages/shared-types/fixtures/approve-followers.json          (nuovo)
docs/API.md
docs/DATABASE.md
```

B:

```
apps/mobile/src/settings/ApproveFollowersSetting.tsx           (nuovo)
apps/mobile/src/settings/ApproveFollowersSetting.test.tsx      (nuovo)
apps/mobile/src/api/approveFollowers.ts                        (nuovo)
apps/mobile/src/api/approveFollowers.test.ts                   (nuovo)
apps/mobile/src/profile/SettingsPage.tsx                       (una riga)
apps/mobile/src/i18n/{it,de,fr,es}.ts
apps/mobile/src/social/FollowButton.tsx                        (solo il commento: «Follow» può seguire subito)
```

C:

```
site/tools/make_privacy.mjs
site/privacy/index.html, site/privacy/{it,de,fr,es}/index.html
```

## Dove siamo (2026-11-28)

- **Parte 0**: in `main` (#1736, `55eef518`).
- **Parte A** (API, migrazione `0091_approve_followers.sql`): in `main`
  (#1740, `fb71ea1e`), unita dal Coordinatore col sì dell'utente («Sì,
  unisci 1740»). Testi della notifica `new_follower` in DE, FR, ES
  approvati dall'utente («Sì, vanno bene»). Rispetto all'elenco
  approvato, in più solo dei test (sette file di test che volevano una
  richiesta in attesa ora accendono l'interruttore). La migrazione dura
  0,13 s con 1000 account e 3,9 s con 100 000 (dati finti,
  `out/TASK-459/time_migration.py` nella cartella principale).
  **Non è ancora sul server.**
- **Parte C** (Privacy): #1742 (`c05e5119`), la frase nelle cinque
  lingue (approvate dall'utente) e «nuovi follower» negli elenchi di push
  ed email («Sì, aggiungi»); Privacy datata 28 novembre 2026. Il merge
  col sì dell'utente lo chiede il Coordinatore; poi la copia sul sito.
- **Passo 29 del server** (del Coordinatore, col sì dell'utente, solo con
  C online): conti in sola lettura prima
  (`out/TASK-459/counts-before-0091.sql`), deploy con la migrazione, poi
  `python -m shaperoute_api.accepted_after_0091 --count` e la corsa vera,
  che avvisa chi aveva chiesto (`follow_accepted`). Rifatta non trova
  niente.
- **Parte B** (app): aspetta A sul server e il «tocca a te» del
  Coordinatore su `profile/SettingsPage.tsx` (prima viene 523 C1, il
  nuovo stile di «Settings»). I nomi della riga sono già decisi: «Approve
  followers», it «Approva chi ti segue», de «Follower bestätigen», fr
  «Approuver les abonnés», es «Aprobar seguidores»; la nota inglese e
  italiana è in «Scelte dell'utente», punto 4; la nota in DE, FR, ES va
  mostrata all'utente nella PR di B. Un'API senza
  `/me/approve-followers` risponde 404: la riga non c'è, come «Links to
  my posts».

## Criteri di accettazione della parte 0

- [x] Le quattro domande hanno una risposta dell'utente, scritta qui.
- [x] ADR-0370 dice la regola e il perché.
- [x] L'elenco dei file delle parti A e seguenti è mandato al Coordinatore.

## File toccati (parte 0)

```
docs/tasks/TASK-459.md
docs/DECISIONS.md
```
