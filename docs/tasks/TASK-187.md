# TASK-187 — «Send to Strava»: la corsa fatta va sul profilo Strava

**Stato**: In corso — parte API fatta (prima PR), parte app da fare (seconda PR)
**Fase**: 4 · **Branch**: `feat/TASK-187-send-to-strava`
**Dipende da**: TASK-172 in `main`, con la sua schermata «Save» /
«Discard» a fine corsa (`src/activities/RunEnd.tsx`) e la tabella `runs`
**ADR e migrazione**: ADR-0156 e migrazione `0007`, assegnati dal
coordinatore il 2026-10-02 (la `0006` è di TASK-183)

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

**Tutte e quattro in attesa dell'utente** (2026-10-02: era via, il lavoro è
andato avanti in automatico). La parte API è costruita con la proposta
dove le serviva; cambiarla è una riga (`activity_name` e `DESCRIPTION` in
`strava.py`).

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

- [ ] Senza le due variabili sul server, l'app non mostra niente di Strava
      e tutto il resto funziona come prima.
- [ ] Il secret e i token di Strava non compaiono mai in una risposta
      dell'API, nei log, nell'app o nel repository.
- [ ] Uno `state` scaduto, già usato o di un altro utente non collega
      niente.
- [ ] Una corsa mandata due volte è un'attività sola su Strava, e l'API lo
      dice senza errore.
- [ ] Un token scaduto si rinnova da solo; uno revocato da Strava riporta
      l'utente a «Connect with Strava».
- [ ] Una corsa salvata senza rete, con «Send to Strava» acceso, arriva su
      Strava dopo la prossima apertura con la rete, una volta sola.
- [ ] «Disconnect» e la cancellazione dell'account revocano l'accesso su
      Strava e non lasciano token nel database.
- [ ] L'attività su Strava ha la traccia, la data e l'ora dell'inizio e la
      durata della corsa fatta (provato dal vero con l'account
      dell'utente).
- [ ] Colori dai token; testi in inglese; test verdi.

## File toccati

Elenco aggiornato il 2026-10-02 con la parte API e detto al coordinatore.
Rispetto a quello previsto: tre file nuovi (`strava_client.py`,
`run_gpx.py`, `test_run_gpx.py`) e `docs/GPX.md`; `deploy/compose.yaml`
non serve (sotto, «A che punto siamo»).

Prima PR, la parte API:

```
services/api/migrations/0007_strava.sql
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

Seconda PR, la parte app:

```
apps/mobile/src/strava/
apps/mobile/src/api/strava.ts
apps/mobile/src/api/strava.test.ts
apps/mobile/src/activities/RunEnd.tsx
apps/mobile/src/activities/outbox.ts
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

**Fatta la parte API** (punti 2–5 e la parte API del 9), ADR-0156:

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
- Criteri di accettazione coperti dai test dell'API (`test_strava.py`, 47
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
scrivere il secret sul server; l'ok per il server (migrazione `0007`) e
per pubblicare l'app; la prova dal vero, compreso come Strava conta la
durata di una corsa con una pausa (il GPX chiude un `<trkseg>` a ogni
pausa: da vedere se Strava lo legge come tempo fermo).

## Esito

*(si compila a fine task)*
