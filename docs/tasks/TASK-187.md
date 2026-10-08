# TASK-187 — «Send to Strava»: la corsa fatta va sul profilo Strava

**Stato**: Done per il codice — parte API (PR #210) e parte app (PR #229); la prova dal vero (criterio 8) aspetta l'utente
**Fase**: 4 · **Branch**: `feat/TASK-187-send-to-strava`
**Dipende da**: TASK-172 in `main`, con la sua schermata «Save» /
«Discard» a fine corsa (`src/activities/RunEnd.tsx`) e la tabella `runs`
**ADR e migrazione**: ADR-0156 e migrazione `0004`, dal coordinatore il
2026-10-02. Prima era la `0007`; il coordinatore ha cambiato la regola: il
numero di una migrazione è il primo libero in `main` quando la PR entra,
così si applicano nello stesso ordine su ogni database

## Obiettivo

Chi ha collegato il suo account Strava manda una corsa fatta con Sgrava sul
suo profilo Strava, come attività, con la mappa e i tempi: dalla schermata
di fine corsa, accanto a «Save» e «Discard», e da una corsa di «My
activities».

Chiesto dall'utente il 2026-10-02: «quando termino l'attività […] una
nuova schermata nella quale mi dici salva, cancella, invia a Strava per
poterla pubblicare». Non è il «Run with Strava» tolto con TASK-170
(ADR-0138): quello portava un *percorso* in Strava a mano; questo carica
la *corsa fatta*, cosa che Strava permette alle altre app (`POST
/uploads`).

## Scelta dell'utente (2026-10-02)

Scelta di prodotto, chiesta e confermata: **«Sì, fallo vero»**, fra tre
proposte (l'invio vero con un'app Strava dell'utente; solo il file GPX da
caricare a mano dal sito; non adesso). L'utente sa che:

- serve un'**app Strava sua**, creata su `strava.com/settings/api`, con
  Client ID e Client Secret; il secret sta solo nel `.env` del server;
- finché Strava non approva l'app, **può collegarsi solo il suo account
  Strava** (un atleta); per gli altri serve la revisione di Strava.

## Cosa serve dall'utente, prima della prova dal vero

Non serve per costruire: i test usano uno Strava finto. Serve per provare
sull'iPhone.

1. Su `https://www.strava.com/settings/api` creare l'applicazione: nome
   «Sgrava», un sito qualunque suo, e in **Authorization Callback Domain**
   il dominio dell'API: `188-245-9-220.sslip.io`. Strava vuole anche
   un'icona.
2. Il **Client ID** (non è un segreto) lo dice alla sessione.
3. Il **Client Secret** lo scrive lui nel `.env` del server
   (`STRAVA_CLIENT_SECRET=`): non in chat, non nel repository. La sessione
   gli dà il comando.
4. L'ok per aggiornare il server (`DEPLOY.md` F.12, migrazione nuova) e
   pubblicare l'app.

## Contesto da leggere

- `docs/API.md` «Account», «My activities»; `docs/DATABASE.md` `runs`
- `docs/UI.md` «La fine della corsa», «My activities», «Cosa esce dal
  telefono»
- `docs/DECISIONS.md` ADR-0140 (le corse salvate), ADR-0138 e ADR-0106
  (cosa Strava permette, verificato il 2026-10-01), ADR-0123 (il server)
- `docs/GPX.md` (il GPX di una traccia con i tempi)
- `services/api/shaperoute_api/activities.py`, `accounts.py`, `access.py`
  (`OPEN_PATHS`), `places.py` (una chiave letta dall'ambiente)
- `apps/mobile/src/activities/` (`RunEnd.tsx`, `outbox.ts`,
  `activitiesDoor.ts`), `src/navigation/music.ts` (aprire un'altra app
  senza dipendenze)
- La documentazione di Strava, da rileggere al momento del task:
  «Authentication» (OAuth, `activity:write`, token che scadono),
  «Uploads», i limiti di richieste, le regole del marchio («Connect with
  Strava», «View on Strava»)

## Cosa fare

Proposta di disegno, decisa dall'agente su delega dell'utente; chi prende
il task la conferma o la cambia con un ADR.

1. **Nessuna dipendenza nuova nell'app**: il collegamento passa dal
   browser e dal server. L'app non vede mai il secret né i token di
   Strava.
2. API, ambiente: `STRAVA_CLIENT_ID` e `STRAVA_CLIENT_SECRET`
   (`.env.example`, `deploy/compose.yaml`). Vuote: Strava è spento, `GET
   /me/strava` risponde `available: false` e l'app non mostra niente.
3. API, collegamento:
   - `POST /me/strava/connect` (con il token dell'account): crea uno
     `state` casuale, usa-e-getta, che scade in 10 minuti, e risponde con
     l'indirizzo di Strava da aprire (`scope=activity:write`,
     `redirect_uri` sul dominio dell'API).
   - `GET /strava/callback` (aperto dal browser, senza `X-API-Key`: va in
     `OPEN_PATHS`; l'utente lo riconosce dallo `state`): scambia il `code`
     con i token, li salva, risponde con una pagina piccola «Strava is
     connected. Go back to Sgrava.». Senza `activity:write` concesso non
     salva niente e lo dice.
   - `GET /me/strava`: `available`, `connected`, il nome dell'atleta.
   - `DELETE /me/strava`: revoca su Strava (`/oauth/deauthorize`) e
     cancella i token. `DELETE /me` fa lo stesso.
4. API, invio: `POST /me/activities/{key}/strava` costruisce il GPX della
   corsa salvata (traccia con i tempi veri, da `runs`), lo carica con
   `POST /uploads` (`sport_type` corsa, `external_id` = la chiave della
   corsa, così due invii non fanno due attività), segue l'esito e salva
   l'id dell'attività Strava sulla corsa. Rinnova il token quando è
   scaduto. Gli errori di Strava (limite di richieste, token revocato,
   doppione) diventano errori nostri leggibili.
5. Database: una migrazione con i token per utente (tabella nuova) e, sulla
   corsa, lo stato dell'invio e l'id dell'attività Strava.
6. App, fine corsa (`RunEnd`): sopra «Save» e «Discard» una riga «Send to
   Strava». Non collegato: «Connect with Strava» apre il browser; al
   ritorno nell'app la riga si aggiorna. Collegato: un interruttore; con
   l'interruttore acceso «Save» salva la corsa e la manda. Senza rete
   l'invio aspetta nella coda con la corsa (`outbox`), senza raddoppiare.
7. App, «My activities»: una corsa aperta ha «Send to Strava» se non è
   stata mandata, «View on Strava» se lo è.
8. App, «Settings» (TASK-177): «Strava», collegato come…, «Disconnect».
9. Test deterministici: l'API contro uno Strava finto (nessuna rete), l'app
   con un'API finta. `API.md`, `DATABASE.md`, `UI.md` («Cosa esce dal
   telefono»: la corsa va a Strava solo quando l'utente lo chiede),
   `DEPLOY.md` (le due variabili, l'app Strava), ADR-0156, `STATUS.md`.

## Da chiedere all'utente durante il task (una per volta, con la proposta)

**Risposte dell'utente, 2026-10-02 sera** (sessione della parte app, una
domanda per volta):

1. Il nome: **modificabile prima di «Save»** (non la proposta). Un campo
   nella schermata di fine corsa e nella scheda di una corsa aperta; vuoto,
   il nome di Sgrava. Nell'API un corpo facoltativo `{ "name": … }` a
   `POST /me/activities/{key}/strava`; senza corpo tutto come prima.
2. La descrizione: **su ogni corsa** (non la proposta): «Drawn with Sgrava»
   con un percorso, «Recorded with Sgrava» per una corsa libera.
3. L'interruttore **ricorda l'ultima scelta** (la proposta); la prima volta
   è acceso.
4. **L'arancione di Strava** per «Connect with Strava» (la proposta): un
   token nuovo in `tokens.ts`.

Le domande com'erano, con quello che la parte API aveva costruito prima
delle risposte:

- Il **nome dell'attività** su Strava. Proposta: cosa è stato disegnato e
  dove («Heart in Trento»), o «Morning run» senza percorso; modificabile
  nella schermata prima di «Save»?
  *Costruito così*: «Heart in Trento», «CIAO in Trento», il tema di un
  percorso a tema; senza il luogo solo cosa. Una corsa senza percorso non
  manda un nome e Strava mette il suo («Morning Run», «Evening Run»: lo
  sceglie Strava dall'ora e nella lingua dell'atleta; l'API non sa il fuso
  del corridore). Il nome **non** è modificabile: l'endpoint non prende un
  corpo. Se l'utente lo vuole modificabile, è un campo `name` facoltativo
  in più, senza rompere niente.
- Una riga nella descrizione, «Drawn with Sgrava». Proposta: sì.
  *Costruito così*: sì, ma solo per una corsa che ha seguito un percorso;
  una corsa libera non ha disegnato niente e va senza descrizione. Da
  confermare anche questo.
- L'interruttore ricorda l'ultima scelta. Proposta: sì. *(Parte app.)*
- Il colore arancione di Strava per «Connect with Strava» (le regole del
  marchio lo chiedono): un token nuovo in `tokens.ts`. *(Parte app.)*

## Criteri di accettazione

- [x] Senza le due variabili sul server, l'app non mostra niente di Strava
      e tutto il resto funziona come prima.
- [x] Il secret e i token di Strava non compaiono mai in una risposta
      dell'API, nei log, nell'app o nel repository.
- [x] Uno `state` scaduto, già usato o di un altro utente non collega
      niente.
- [x] Una corsa mandata due volte è un'attività sola su Strava, e l'API lo
      dice senza errore.
- [x] Un token scaduto si rinnova da solo; uno revocato da Strava riporta
      l'utente a «Connect with Strava».
- [x] Una corsa salvata senza rete, con «Send to Strava» acceso, arriva su
      Strava dopo la prossima apertura con la rete, una volta sola.
- [x] «Disconnect» e la cancellazione dell'account revocano l'accesso su
      Strava e non lasciano token nel database.
- [ ] L'attività su Strava ha la traccia, la data e l'ora dell'inizio e la
      durata della corsa fatta (provato dal vero con l'account
      dell'utente).
- [x] Colori dai token; testi in inglese; test verdi.

## File toccati

Elenco aggiornato il 2026-10-02 con la parte API e detto al coordinatore.
Rispetto a quello previsto: tre file nuovi (`strava_client.py`,
`run_gpx.py`, `test_run_gpx.py`) e `docs/GPX.md`; `deploy/compose.yaml`
non serve (sotto, «A che punto siamo»).

Prima PR, la parte API:

```
services/api/migrations/0004_strava.sql
services/api/shaperoute_api/strava.py
services/api/shaperoute_api/strava_client.py
services/api/shaperoute_api/run_gpx.py
services/api/shaperoute_api/app.py
services/api/shaperoute_api/access.py
services/api/shaperoute_api/accounts.py
services/api/tests/test_strava.py
services/api/tests/test_run_gpx.py
packages/shared-types/fixtures/strava-*.json
.env.example
docs/API.md
docs/DATABASE.md
docs/GPX.md
docs/DEPLOY.md
docs/DECISIONS.md
docs/STATUS.md
docs/tasks/TASK-187.md
```

Seconda PR, la parte app. Elenco aggiornato il 2026-10-02 sera e detto
al coordinatore: in più `activitiesDoor.ts` (dopo il PUT, l'invio a
Strava), `ActivityCard.tsx` (la corsa aperta), `SettingsPage.tsx` e
`ProfileLayer.tsx` (la sezione e il context), e per le risposte
dell'utente `strava.py`, `test_strava.py` e `fixtures/strava-send.json`.
Nessuno è di TASK-200.

```
services/api/shaperoute_api/strava.py
services/api/tests/test_strava.py
packages/shared-types/fixtures/strava-send.json
apps/mobile/src/strava/
apps/mobile/src/api/strava.ts
apps/mobile/src/api/strava.test.ts
apps/mobile/src/activities/RunEnd.tsx
apps/mobile/src/activities/ActivityCard.tsx
apps/mobile/src/activities/activitiesDoor.ts
apps/mobile/src/activities/outbox.ts
apps/mobile/src/profile/SettingsPage.tsx
apps/mobile/src/screens/ProfileLayer.tsx
apps/mobile/src/theme/tokens.ts
apps/mobile/__tests__/AppStrava.test.tsx
docs/API.md
docs/UI.md
docs/DECISIONS.md
docs/STATUS.md
docs/tasks/TASK-187.md
```

## Fuori scope

- Portare un *percorso* in Strava (ADR-0138: non si fa).
- Leggere da Strava: attività, amici, segmenti. Si chiede solo
  `activity:write`.
- La revisione di Strava per collegare più di un atleta: la chiede
  l'utente, quando vorrà aprire la funzione agli altri.
- Altre destinazioni (Garmin, Apple Salute, Instagram): task nuovi.
- Foto e descrizione scritta dall'utente.

## A che punto siamo (2026-10-02)

**Fatta la parte API** (punti 2–5 e la parte API del 9), ADR-0156, PR
#210:

- `strava_client.py` parla con Strava (OAuth, revoca, upload) e non sa
  niente del database; `strava.py` tiene atleti e corse e ha gli endpoint;
  `run_gpx.py` scrive il GPX della corsa salvata. Come funziona: `API.md`,
  «Send to Strava».
- Oltre ai cinque endpoint del punto 3–4 c'è `GET
  /me/activities/{key}/strava`: lo stato dell'invio di una corsa
  (`not_sent`, `processing`, `sent` con `url`), per «Send to Strava» /
  «View on Strava» di una corsa aperta (punto 7). `Activity` non cambia.
- `POST /me/activities/{key}/strava` risponde `200` (`sent`) o `202`
  (`processing`: rifare la stessa chiamata più tardi). Errori: `409` non
  collegato (tornare a «Connect with Strava»), `429` con `Retry-After`,
  `502` riprovare, `422` Strava non legge la corsa (non riprovare), `503`
  Strava spento. Nessun codice d'errore nuovo.
- `deploy/compose.yaml` non è cambiato: il servizio `api` ha `env_file:
  .env`, le due variabili arrivano da sole. La callback usa
  `SHAPEROUTE_DOMAIN`.
- La revoca usa `POST /oauth/revoke`, non `/oauth/deauthorize` (in
  dismissione dal 2026-06-01).
- Criteri di accettazione coperti dai test dell'API (`test_strava.py`, 48
  test contro uno Strava finto; `test_run_gpx.py`): il secondo, il terzo,
  il quarto, il quinto, il settimo, e il primo per la parte API (`available:
  false`). Restano alla parte app il sesto (la coda senza rete) e il nono;
  l'ottavo è la prova dal vero.

**Da fare, la parte app** (punti 1, 6, 7, 8 e la parte app del 9):

- `src/api/strava.ts`: i tipi e le chiamate, sugli esempi
  `fixtures/strava-status.json`, `strava-connect.json`,
  `strava-activity.json`.
- `RunEnd`: la riga «Send to Strava» solo se `available`; «Connect with
  Strava» apre `url` con `Linking.openURL` (come `music.ts`); al ritorno
  nell'app (`AppState`) si richiede `GET /me/strava`.
- `outbox`: dopo il `PUT` della corsa, il `POST …/strava`; `202` e `502` e
  `429` si riprovano alla prossima apertura, `409` e `422` no. Il server
  non raddoppia: riprovare è sempre sicuro.
- «My activities», corsa aperta: `GET /me/activities/{key}/strava`.
- «Settings» (TASK-177 è in `main` dalla #202): «Strava», «Connected as
  …», «Disconnect» (`DELETE /me/strava`).
- `UI.md`, «Cosa esce dal telefono».

**Aspetta l'utente**: le quattro domande sopra; creare l'app Strava e
scrivere il secret sul server; l'ok per il server (migrazione `0004`) e
per pubblicare l'app; la prova dal vero, compreso come Strava conta la
durata di una corsa con una pausa (il GPX chiude un `<trkseg>` a ogni
pausa: da vedere se Strava lo legge come tempo fermo).

## Esito

**Codice fatto, in due PR** (2026-10-02): la parte API (#210) e la parte
app (#229), con le quattro risposte dell'utente (sopra). Resta all'utente la
prova dal vero.

- **App**: a fine corsa, sopra «Save» e «Discard», «Connect with Strava»
  (arancione, token `strava` e `onStrava`) o l'interruttore «Send to
  Strava» con «Name on Strava»; l'interruttore ricorda l'ultima scelta
  (`strava.json`, acceso la prima volta). Con l'interruttore acceso «Save»
  salva e poi manda, anche senza rete: la corsa porta `strava: { name }`
  in `activities-outbox.json`, e quando l'API la ha passa a
  `strava-outbox.json` fino a che Strava non la prende (o non la prenderà
  mai). Su una corsa aperta di «My activities» «Send to Strava», con il nome
  dell'API come suggerimento, o «View on Strava». In «Settings» la sezione
  «Strava», con «Connected as …» e «Disconnect» che chiede prima. Strava
  si chiede all'API solo dove si vede; un'API senza Strava, o più vecchia,
  e niente compare. Come funziona: `UI.md`; le scelte: ADR-0156, «Parte
  app».
- **API**: il corpo facoltativo `{ "name" }` (una riga, al più 100
  caratteri, conta solo al primo invio) e «Recorded with Sgrava» per una
  corsa libera; senza corpo tutto come prima.
- **Test**: API 53 in `test_strava.py` (5 nuovi); app 39 nuovi
  (`strava.test.ts`, `stravaOutbox.test.ts`, `stravaChoice.test.ts`,
  `stravaName.test.ts`, `AppStrava.test.tsx` con 17 scenari dell'app
  intera), suite dell'app 1280 verdi. Tolta apposta la messa in coda per
  Strava, i tre test che la riguardano falliscono.
- **Visto nel simulatore** (iPhone Air, Expo Go, API locale con un
  database usa-e-getta e Strava acceso con un client finto): la fine
  della corsa con «Connect with Strava», e con un atleta collegato
  (riga finta nel database) l'interruttore acceso, il campo del nome e
  «To Ada Lovelace's Strava, with Save.». «Settings» e la corsa aperta
  non visti (il simulatore non accettava tocchi): li coprono i test.

**Aspetta l'utente**, in quest'ordine: creare la sua app Strava e dire il
Client ID, scrivere il secret nel `.env` del server (`DEPLOY.md`,
«Strava»); l'ok per aggiornare il server a `main` (migrazioni
`0004`–`0007`, poi `draw_examples`) e per pubblicare l'app; la prova dal
vero (criterio 8: data, ora, durata, e come Strava legge le pause dei
`<trkseg>`). Sull'iPhone da guardare anche: la tastiera sopra il campo del
nome a fine corsa, il ritorno dal browser che aggiorna la riga da solo.

**Seguiti**: una corsa in bici (TASK-190) va a Strava come `Run`, perché
`runs` non tiene l'attività (`sport_type` da scegliere quando la tiene:
TASK-200 lo fa per i preferiti); un'attività cancellata su Strava resta
«View on Strava» da noi (ADR-0156).
