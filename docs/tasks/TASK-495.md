# TASK-495 — I gruppi per uscire insieme («Groups»)

**Stato**: In corso (0, A, A2, B e privacy in `main`; A3 #1629; poi C, D, E)
**Fase**: 5 · **Branch**: una PR per parte; la parte 0 è
`docs/TASK-495-groups`
**Dipende da**: TASK-309 (le corse di gruppo, `EVENTI.md`, ADR-0269),
TASK-211 (follow), TASK-121 e TASK-291 (blocchi, segnalazioni, nascosti),
TASK-213 (il filtro dei testi), TASK-262 A (le push), TASK-178 (la foto del
profilo), TASK-463 (l'alpinismo senza percorso, ADR-0373)
**Si incrocia con**: TASK-309 B2 (la fila del Feed) e C (i commenti): i
loro file non si toccano; la parte C di questo task tocca `group_runs.py`
solo con la lista al Coordinatore. TASK-468 e TASK-319 (la chat) per la
parte E. TASK-482 D (il link che apre l'app) per gli inviti con un link.
**ADR**: **ADR-0402** · numero del task e dell'ADR dal Coordinatore
(fork 3) il 2026-11-23.

## Obiettivo

L'utente, il 2026-11-23: poter fare dei gruppi dentro l'app per andare a
camminare insieme, in bici insieme e in alpinismo insieme, e poi negli
altri sport. Gruppi che restano nel tempo, con una pagina, membri e uscite.
Le regole sono in `docs/GRUPPI.md`.

## Le scelte dell'utente (2026-11-23)

La proposta con i default è stata fatta una domanda alla volta; l'utente
ha detto sì a ogni default:

1. **Il gruppo**: nome (40), foto facoltativa, descrizione (500), da 1 a 3
   sport, zona = una città, mai un indirizzo; al più 5 gruppi creati per
   account, 300 membri per gruppo.
2. **Ingresso**: Public, Request (di partenza), Invite only; un gruppo con
   l'alpinismo mai Public.
3. **Ruoli**: admin e fino a 3 co-admin; l'admin passa il ruolo per
   uscire; con l'account cancellato il ruolo passa al co-admin più vecchio,
   poi al membro più vecchio; un rimosso può chiedere di nuovo.
4. **Pagina**: Next outings, Members, Recent activity (14 giorni, solo i
   post che chi guarda vede già), Past outings; chi non è membro di un
   gruppo Request vede solo intestazione e descrizione.
5. **Uscite**: le corse di gruppo legate al gruppo, con o senza percorso
   (l'alpinismo: ritrovo sulla mappa, giorno, ora, meta scritta); le crea
   ogni membro, admin e co-admin le annullano; di partenza solo i membri,
   «Everyone» in un gruppo Public.
6. **Chat di gruppo** come parte a sé (E) dopo A–D; prima ci si organizza
   dalla pagina dell'uscita.
7. **Trovarli**: Explore «Groups» entro 50 km, filtro per sport e ricerca
   per nome; nel Feed solo le uscite dei miei gruppi nella fila «Group
   runs»; sul profilo una riga «Groups» visibile solo a sé.
8. **Notifiche**: nuova uscita, promemoria, cambio, annullamento,
   richiesta d'ingresso, richiesta accettata, invito; «Push notifications»
   e blocchi come oggi, più «Mute» per gruppo; niente email del giorno.
9. **Alpinismo**: l'avviso di `GRUPPI.md` §9, così com'è, senza spunta;
   nessun grado dall'app.
10. **Fuori**: tutto quello di `GRUPPI.md` §13.

Proposta completa: `side-session-notes/local_bea49206-…/GRUPPI-proposta.md`
(fuori dal repository); le regole valgono come scritte in `GRUPPI.md`.

## Condizioni fisse (dai documenti, non chieste)

- Sicurezza dei ritrovi come `EVENTI.md` §10: luogo pubblico, 16 anni o
  più, avviso a chi crea.
- Contenuti degli utenti (Apple 1.2): filtro di TASK-213 su nome e
  descrizione, segnalazione e blocco; chi è bloccato dall'admin non vede il
  gruppo e non entra.
- Privacy: appartenenze, ruoli, richieste e inviti sono dati nuovi; la
  riga dell'informativa la approva l'utente **prima dell'OTA**; tutto si
  cancella con l'account.
- La migrazione prende il primo numero libero, chiesto al Coordinatore con
  la lista dei file della parte A (oggi la 0086 è di TASK-493).
- Server e OTA passano dal Coordinatore, col sì dell'utente.
- Nessun modulo nativo: foto col selettore che l'app ha già, giorno e ora
  come le corse di gruppo. Tutto esce con un OTA.
- Testi dell'interfaccia in inglese, documentazione in italiano.

## Le parti

Una PR per parte; prima del codice di ogni parte, i «File toccati» al
Coordinatore; per ogni PR «#NNNN pronta <sha>» al Coordinatore, che
mergia.

- **0 — Documenti** (questa PR): `GRUPPI.md`, questo file, ADR-0402,
  righe in `INDEX.md` e `STATUS.md`.
- **A — API e migrazione**: tabelle `groups`, `group_members`,
  `group_requests`, `group_invites`; endpoint per creare, cambiare,
  entrare, chiedere, invitare, accettare, uscire, rimuovere, passare il
  ruolo, Mute; chi vede che cosa (`GRUPPI.md` §5); il tipo `group` nelle
  segnalazioni; le push nuove; il passaggio del ruolo con
  `app.state.before_account_delete`; tipi e fixture in `shared-types`;
  `API.md` «Groups», `DATABASE.md`.
- **B — App: crea, entra, la pagina del gruppo**: modulo, pagina con le
  quattro sezioni (le uscite vuote finché non c'è C), richieste e inviti,
  gestione dei membri, la riga «Groups» del profilo, la push che apre la
  pagina.
- **C — Uscite di gruppo per più sport**: `group_id`, la visibilità
  `group` e le uscite senza percorso (`destination`) nelle corse di gruppo
  di TASK-309, nell'API e nell'app; l'avviso dell'alpinismo. Tocca file di
  TASK-309: la lista al Coordinatore, che controlla con B2 e C.
- **D — Scoperta e notifiche**: la sezione «Groups» di Explore (vicino,
  sport, ricerca), le uscite dei miei gruppi nella fila del Feed quando
  c'è, `group_outing_new` con «Mute».
- **Privacy**: la riga dell'informativa nelle cinque lingue
  (`about/content/*`, `site/privacy`), approvata dall'utente, prima
  dell'OTA che accende i gruppi.
- **E — Chat di gruppo**: una conversazione per gruppo, testo e foto,
  filtro dei testi su ogni messaggio, segnalazione del messaggio, l'admin
  cancella. Il disegno preciso si scrive qui quando parte.

## Criteri di accettazione

- [ ] Ogni regola di `GRUPPI.md` §2–§10 ha il suo test deterministico
      nell'API (parte A e C) e nell'app (parti B–D).
- [ ] Blocco con l'admin: il gruppo risponde 404 e non si entra (test).
- [ ] Invite only fuori da Explore e dalla ricerca (test).
- [ ] Un gruppo con l'alpinismo non può essere Public (test).
- [ ] Sempre un solo admin; il ruolo passa quando l'admin cancella
      l'account; un gruppo senza membri si cancella (test).
- [ ] Un'uscita dei soli membri non si vede né si dice «I'm going» da
      fuori (test).
- [ ] Uscita senza percorso: ritrovo, ora, «Destination», «Start» apre
      la registrazione senza percorso (test).
- [ ] «Mute» zittisce solo `group_outing_new` di quel gruppo (test).
- [ ] Nome e descrizione rifiutati dal filtro non si salvano (test).
- [ ] Nessuna dipendenza nuova, nessun modulo nativo; lint, typecheck,
      test e format:check verdi; i testi approvati dall'utente.
- [ ] Privacy approvata e in `main` prima dell'OTA.

## File toccati

Parte 0 (questa PR):
```
docs/GRUPPI.md              (nuovo)
docs/tasks/TASK-495.md      (nuovo)
docs/DECISIONS.md           (ADR-0402: la riga nell'Indice e la voce in fondo)
docs/INDEX.md               (una riga: «I gruppi» → GRUPPI.md)
docs/STATUS.md              (la voce in «In lavorazione»)
```

Parte A (#1538, lista approvata dal Coordinatore il 2026-11-23, con
`notification_list.py` e `test_moderation.py` in più):
```
services/api/migrations/0087_groups.sql            (nuovo, dopo la 0086 di TASK-493)
services/api/shaperoute_api/groups.py              (nuovo)
services/api/shaperoute_api/push.py                (tre Kind, group_id, i testi)
services/api/shaperoute_api/notification_list.py   (group_id nella campanella)
services/api/shaperoute_api/app.py                 (install_groups)
services/api/shaperoute_api/moderation.py, report_email.py   (il tipo group)
services/api/tests/test_groups.py                  (nuovo), test_moderation.py
packages/shared-types/src/groups.ts                (nuovo), src/index.ts (REPORT_KINDS, export)
packages/shared-types/fixtures/group*.json, my-groups.json   (nuovi)
packages/shared-types/test/groups.test.ts          (nuovo), moderation.test.ts
docs/API.md («Groups»), docs/DATABASE.md
```

Parte A2 (#1543): `groups.py`, `test_groups.py`, `src/groups.ts`,
`fixtures/group-activity.json` (nuovo), `test/groups.test.ts`, `API.md`.

Parte B (lista approvata dal Coordinatore il 2026-11-24): `apps/mobile/src/groups/`
(nuova), `src/screens/ProfileLayer.tsx`, `src/notifications/notificationTap.ts`
e il suo test, `src/i18n/{de,es,fr,it}.ts`; `src/profile/ProfileHome.tsx`
una riga sola, dopo #1517 di TASK-489 e col via del Coordinatore.

Parti C–E e la privacy: si scrivono qui, una per volta, dopo il sì del
Coordinatore sulla lista.

## Fuori scope

Tutto `GRUPPI.md` §13. Cambiare le corse di gruppo che non hanno un gruppo:
restano come in `EVENTI.md`.

## Esito

*(si compila a fine task)*

**Registro**

- 2026-11-23 · parte 0 in `main` (#1515).
- 2026-11-23 · parte A in `main` (#1538, `ccb318c7`): l'API dei gruppi
  (`API.md` «Groups»), la migrazione `0087_groups.sql`, le tre push coi
  testi approvati dall'utente lo stesso giorno, la campanella, le
  segnalazioni. 45 test in `test_groups.py`. Sul server col prossimo passo
  del Coordinatore (`out/TASK-495/SERVER-A.md` e `check_a.sql` nel
  checkout principale, solo letture).
- 2026-11-24 · parte A2 (#1543): `GET /groups/{id}/activity`, i post dei
  membri degli ultimi 14 giorni negli sport del gruppo; armata dal
  Coordinatore, merge al verde.
- 2026-11-24 · parte A e A2 sul server (passo 22 del Coordinatore,
  `080a4e83`): `check_a.sql` torna come atteso.
- 2026-11-24 · parte B scritta; al simulatore (iPhone 17, API e DB usa e
  getta) nove schermate in `out/TASK-495/b/` del checkout principale,
  **approvate dall'utente con i testi** («Sì, approvo»). Trovato e
  corretto lì: un bottone spento non sembrava spento, perché `Tap` mette
  la sua opacità sopra lo stile; ora si spengono anche le parole. Scelta
  dell'utente lo stesso giorno: l'avviso di sicurezza del modulo parla di
  gruppi («MuW doesn't organise or check groups or their outings»).
- 2026-11-24 · privacy: la sezione «Groups» nelle cinque lingue (en e it
  approvati il 23–24, de/es/fr e «o un gruppo» in «Reports» il 24); #1561
  in `main` (`93da3378`), sito copiato dall'utente a `c33f3920`.
- 2026-11-24 · **«Delete group»**: l'utente vuole che l'admin cancelli il
  gruppo anche con membri dentro; testi approvati (bottone, conferma,
  push «{name} deleted the group {title}.» che non apre niente) → parte
  A3, lista dei file approvata dal Coordinatore. La privacy non cambia.
- 2026-11-26 · parte B in `main` (#1560, `7224177b`), col «Sì, unisci»
  dell'utente; esce con il prossimo OTA (la privacy è già online).
- 2026-11-26 · parte A3 (#1629, `98785b9a`): API + app in una PR, nessuna
  migrazione; con un server di prima l'app dice «Something went wrong.» e
  il gruppo resta, quindi l'OTA può partire prima del passo server
  (`out/TASK-495/SERVER-A3.md`). Merge col «Sì, unisci» dell'utente.
- **Prossimo**: OTA della B (Coordinatore) e prova dell'utente sul
  telefono; A3 in `main` e sul server; poi C (uscite di gruppo, anche
  senza percorso: tocca i file di TASK-309, lista al Coordinatore), D
  (Explore e `group_outing_new`), E (chat di gruppo).
- **TASK-309 B2** (la fila del Feed) va alla stessa sessione dopo la
  chiusura di B, con il contesto pulito: brief in
  `out/TASK-309/AVVIO-B2.md` del checkout principale.
