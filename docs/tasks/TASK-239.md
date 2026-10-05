# TASK-239 — Il numero rosso delle richieste di follow, e «Follow back»

**Stato**: Done
**Fase**: 4 · **Branch**: `feat/TASK-239-follow-request-badge`
**Dipende da**: TASK-211 (A e B, in `main` e sul server). **ADR**: ADR-0203.

Chiesto dall'utente il 2026-10-05: «Deve arrivarti una notifica quando ti
mettono un follower: sulla sezione profilo deve apparire sulla foto in alto
a destra, tipo un pallino rosso oppure uno rosso che dice la notifica, e
quando accetti puoi seguire subito».

## Obiettivo

Chi riceve una richiesta di follow lo vede senza aprire «Profile»: un
numero rosso sul cerchio del profilo, in alto a destra nelle pagine. Da lì
a seguire a sua volta sono tre tocchi: il cerchio, «Accept», «Follow back».

## Contesto da leggere

- `docs/UI.md`, «Seguire» e «Sessione finita» (il pallino arancio)
- `docs/DECISIONS.md` ADR-0173 e ADR-0199
- `apps/mobile/src/social/FollowLists.tsx`, `followsDoor.ts`,
  `src/screens/ProfileLayer.tsx` (`ProfileButton`), `src/api/follows.ts`

## Cosa fare

1. **Il numero.** `countFollowRequests` in `api/follows.ts`:
   `GET /me/follow-requests?limit=1`, di cui si legge `total`. Nessuna
   modifica all'API.
2. **Chi lo chiede.** `social/followRequests.ts`,
   `useFollowRequestsOf(apiUrl, account)`: all'apertura con un account,
   ogni 60 secondi mentre l'app è sullo schermo, e quando l'app ci torna.
   Senza risposta resta l'ultimo numero; con un'API senza gli elenchi
   (`404`) chiede una volta sola.
3. **Dove si vede.** `social/RequestsBadge.tsx` su `ProfileButton`: un
   tondo rosso col numero («9+» oltre nove) sopra l'angolo in alto a destra
   del cerchio. Il nome del tasto per VoiceOver dice quante sono. Colori
   nuovi in `tokens.ts`: `badge`, `onBadge`. Il pallino di «Requests» in
   «Profile» diventa dello stesso rosso.
4. **«Requests» già aperto.** Se qualcuno aspetta quando «Profile» si apre,
   l'elenco «Requests» è aperto senza toccarlo.
5. **«Follow back».** Una richiesta accettata resta nella sua riga: al
   posto di «Accept» e «Decline» c'è «Follow back» (bianco), che manda la
   richiesta (`POST /users/{id}/follow`) e diventa la scritta «Requested» o
   «Following». Se lo si segue già, o si è già chiesto (`GET
   /users/{id}`, campo `follow`), la riga lo dice e il tasto non c'è.
6. **Il numero si aggiorna da «Profile»**: gli elenchi dicono a
   `ProfileLayer` quante richieste restano dopo ogni risposta.

## Criteri di accettazione

- [x] Con una richiesta in attesa, `ProfileButton` mostra «1» in rosso e si
      chiama «Profile, 1 follow request»; senza, niente numero.
- [x] Il numero arriva da solo entro un minuto e al ritorno dell'app sullo
      schermo; in secondo piano non si chiede niente.
- [x] «Profile» aperto con una richiesta mostra l'elenco «Requests» aperto.
- [x] «Accept» lascia la riga con «Follow back»; toccato, la riga dice
      «Requested» (o «Following») e il numero rosso è sparito.
- [x] Chi si segue già non ha «Follow back».
- [x] Una richiesta rifiutata sparisce come prima.
- [x] I testi nuovi sono nelle quattro tabelle (`tables.test.ts` verde).

## File toccati

```
apps/mobile/src/api/follows.ts
apps/mobile/src/api/follows.test.ts
apps/mobile/src/social/followRequests.ts            (nuovo)
apps/mobile/src/social/followRequests.test.ts       (nuovo)
apps/mobile/src/social/RequestsBadge.tsx            (nuovo)
apps/mobile/src/social/RequestsBadge.test.tsx       (nuovo)
apps/mobile/src/social/FollowBack.test.tsx          (nuovo)
apps/mobile/src/social/FollowRequestsFlow.test.tsx  (nuovo)
apps/mobile/src/social/FollowLists.tsx
apps/mobile/src/social/FollowLists.test.tsx
apps/mobile/src/social/followsDoor.ts
apps/mobile/src/screens/ProfileLayer.tsx
apps/mobile/src/theme/tokens.ts
apps/mobile/src/i18n/it.ts, de.ts, es.ts, fr.ts
docs/UI.md
docs/STATUS.md
docs/DECISIONS.md
docs/tasks/TASK-239.md
```

## Fuori scope

- **Le notifiche del telefono** (push, ad app chiusa): sono TASK-185 e
  vogliono una dipendenza nuova, una build propria e il server che le
  manda. Qui il numero si vede solo con l'app aperta.
- Il numero sulla foto grande dentro «Profile» (lì il cerchio cambia la
  foto: un numero farebbe credere che apra le richieste).
- «Follow back» nell'elenco «Followers».
- Un avviso per commenti e reazioni: stesso posto, altro task.

## Scelte dell'utente (2026-10-05)

Viste a codice scritto, confermate con «va bene così, tieni il giro al
minuto e fai il merge»:

- il **numero** rosso (non il pallino semplice);
- si spegne **quando ogni richiesta ha avuto una risposta**, non quando
  le si guarda;
- i testi: «Follow back» (it «Segui anche tu»), «Follow {name} back»,
  «Profile, {count} follow request(s)»;
- l'app chiede il numero **anche ogni minuto** mentre è aperta: il
  coordinatore proponeva solo all'apertura e al ritorno, per il server
  piccolo; l'utente ha scelto di tenere il giro.

## Esito

PR #343. Il numero rosso sul pulsante di «Profile», «Requests» già aperto
e «Follow back» nella riga accettata funzionano nei test (suite dell'app
1981 verde). **Non visto su un iPhone né nel simulatore**: posizione e
misura del numero sono da guardare alla prossima pubblicazione, con la
prova a due account già aperta per TASK-211 B. Rimandato: le notifiche ad
app chiusa (TASK-185); de/es/fr dei testi nuovi non riletti da un
madrelingua.
