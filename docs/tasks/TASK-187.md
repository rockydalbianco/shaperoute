# TASK-187 — «Send to Strava»: la corsa fatta va sul profilo Strava

**Stato**: Todo
**Fase**: 4 · **Branch**: `feat/TASK-187-send-to-strava`
**Dipende da**: TASK-172 in `main`, con la sua schermata «Save» /
«Discard» a fine corsa (`src/activities/RunEnd.tsx`) e la tabella `runs`
**ADR e migrazione**: da chiedere al coordinatore prima di partire (ha
tenuto il numero del task; la migrazione viene dopo `0005`)

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
   `DEPLOY.md` (le due variabili, l'app Strava), ADR, `STATUS.md`.

## Da chiedere all'utente durante il task (una per volta, con la proposta)

- Il **nome dell'attività** su Strava. Proposta: cosa è stato disegnato e
  dove («Heart in Trento»), o «Morning run» senza percorso; modificabile
  nella schermata prima di «Save»?
- Una riga nella descrizione, «Drawn with Sgrava». Proposta: sì.
- L'interruttore ricorda l'ultima scelta. Proposta: sì.
- Il colore arancione di Strava per «Connect with Strava» (le regole del
  marchio lo chiedono): un token nuovo in `tokens.ts`.

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

Elenco previsto; chi prende il task lo conferma con il coordinatore.

```
services/api/migrations/000X_strava.sql
services/api/shaperoute_api/strava.py
services/api/shaperoute_api/app.py
services/api/shaperoute_api/access.py
services/api/shaperoute_api/accounts.py
services/api/tests/test_strava.py
packages/shared-types/fixtures/strava-*.json
apps/mobile/src/strava/
apps/mobile/src/api/strava.ts
apps/mobile/src/api/strava.test.ts
apps/mobile/src/activities/RunEnd.tsx
apps/mobile/src/activities/outbox.ts
apps/mobile/src/theme/tokens.ts
apps/mobile/__tests__/AppStrava.test.tsx
.env.example
deploy/compose.yaml
docs/API.md
docs/DATABASE.md
docs/UI.md
docs/DEPLOY.md
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

## Esito

*(si compila a fine task)*
