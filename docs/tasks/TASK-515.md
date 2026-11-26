# TASK-515 — Le email dell'account in produzione («Password dimenticata?»)

**Stato**: Done — 2026-11-26: «Forgot password?» è in produzione, provato
dall'utente sul telefono («Sì, funziona»); i due giri verso gli iscritti
restano spenti
**Fase**: 5 · **PR**: #1564 (parte 0), #1566 (parte A), chiusura in
`docs/TASK-515-done`
**ADR**: ADR-0410 · numeri dal Coordinatore (fork 3), 2026-11-24
**Dipende da**: TASK-300 (ADR-0261), TASK-284 (ADR-0244), TASK-262 B
(ADR-0226), TASK-291 (ADR-0251), TASK-308 (ADR-0268): tutti Done, tutti
spenti in produzione.

## Obiettivo

Chi ha perso la password di MuW la recupera da solo: sotto «Log in» c'è
«Forgot password?», arriva una email con un link, sceglie una password
nuova. Per arrivarci il server di produzione deve poter mandare email.

## Da dove viene

L'utente, chiudendo TASK-458 il 2026-11-24: «nella sezione accedi farei la
possibilità di recuperare la password se qualcuno l'ha persa». La funzione
c'è dal 26 ottobre (TASK-300, #559) ma in produzione non si vede: lo ha
guardato l'utente sul telefono lo stesso giorno («No non c'era», riferito
dalla sessione di TASK-458), e ha chiesto di partire subito («SI ADESSO»:
vale per cominciare il lavoro, non per account, chiavi o server).

## Verificato il 2026-11-24 (`main` = `faf37daf`)

- **Perché non si vede.** L'app mostra «Forgot password?» solo se
  `GET /account-email` risponde 200 (`apps/mobile/src/account/accountEmail.ts`).
  In produzione risponde 404 con la chiave (controllo del Coordinatore) e
  in `deploy/.env` non c'è nessuna variabile delle email.
- **Perché le variabili non sono mai arrivate.** TASK-284, TASK-262 B,
  TASK-291 e TASK-300 si sono chiusi a ottobre con lo stesso «resta»: il
  server dopo l'approvazione di Apple e col sì dell'utente, l'account
  Resend con `getmuw.app` verificato fatto dall'utente
  (`tasks/TASK-300.md`, «Prima della prima email»). Quel passo non è mai
  stato fatto: la riga è uscita da `STATUS.md` con l'archivio dell'8
  novembre e nessun task aperto la portava più.
- **Il dominio non è verificato su Resend.** Il DNS pubblico di
  `getmuw.app` (nameserver di Porkbun) non ha `resend._domainkey`, non ha
  record su `send.getmuw.app`, non ha `_dmarc`, e non ha un `MX` sul
  dominio: nessuno ha mai aggiunto i record di Resend, e una risposta
  scritta a `hello@getmuw.app` oggi torna indietro.
- **La privacy dice già tutto**, nell'app (`about/content/*.ts`, 23
  novembre 2026) e sul sito pubblicato (`getmuw.app/privacy`, stessa
  data), nelle cinque lingue: «Le email di MuW» nomina le email che
  servono all'account (conferma, avviso al vecchio indirizzo, link per la
  nuova password), l'email «quando sono via» e il riassunto; «Chi altro
  riceve dati» nomina Resend, negli Stati Uniti, con l'indirizzo e l'email
  stessa, le segnalazioni e il feedback.
- **L'app non ha bisogno di niente**: il link e le schermate sono in
  produzione; compaiono da soli quando il server risponde 200.

## Le email che l'API può mandare

Un solo codice parla con Resend (`resend_email.py`); il mittente è
`MuW <hello@getmuw.app>` (`SHAPEROUTE_EMAIL_FROM` lo cambia).

| # | Email | A chi | Cosa la fa partire | Si accende con |
|---|---|---|---|---|
| 1 | Conferma dell'indirizzo | chi si iscrive | l'iscrizione; «Send the link again» in «Settings» | `RESEND_API_KEY` + `SHAPEROUTE_EMAIL_SECRET` + `SHAPEROUTE_DOMAIN` |
| 2 | Conferma del nuovo indirizzo, e avviso al vecchio | chi cambia email in «Settings» | il cambio | le stesse tre |
| 3 | Link per una nuova password | chi lo chiede da «Forgot password?» | `POST /password-reset` (al massimo 3 l'ora per indirizzo) | le stesse tre |
| 4 | «Email when I'm away» | **ogni iscritto** con l'interruttore acceso (lo è di default) che non apre l'app da 14 giorni e ha disegni nuovi da vedere | un giro al giorno, 17:00 UTC, fino a 500 email | le stesse tre |
| 5 | Riassunto delle notifiche | solo chi ha acceso «Email notifications» (spento di default) | un giro al giorno, 18:00 UTC, nei giorni con novità | le stesse tre |
| 6 | Segnalazione, col link che nasconde | chi gestisce MuW | ogni segnalazione nuova | le stesse tre + `SHAPEROUTE_REPORTS_TO` |
| 7 | Messaggio di «Send feedback» | chi gestisce MuW (Reply-To: l'iscritto) | ogni messaggio | `RESEND_API_KEY` + `SHAPEROUTE_FEEDBACK_TO`, o in mancanza `SHAPEROUTE_REPORTS_TO` |

**Oggi non si può accendere solo il recupero della password.** Le email
1–5 leggono tutte la stessa configurazione (`AwaySetup.from_env`, in
`__main__.py`): messe le tre variabili partono insieme le email
dell'account, il giro di «quando sono via» e quello del riassunto.
`AWAY_EMAIL_AT` e `NOTICE_EMAIL_AT` spostano solo l'ora. Le 6 e 7 hanno
invece il loro indirizzo: senza, restano spente. Il primo giro della 4
scriverebbe in un colpo a tutti gli iscritti assenti.

Dentro le email dell'account (1–3) non c'è separazione: conferma e
recupero sono lo stesso modulo (`account_email.py`) e la stessa risposta
di `GET /account-email`.

## Le scelte dell'utente (2026-11-24)

Chieste una alla volta, con una proposta.

| # | Domanda | Risposta |
|---|---|---|
| 1 | Hai già un account Resend con `getmuw.app` verificato? | **«Non ricordo»**. Il DNS pubblico dice di no (sopra): l'account e i record li fa l'utente, coi passi di «Cosa fa l'utente su Resend» |
| 2 | Quali email accendere adesso: solo account, account + riassunto, tutte e tre, solo il recupero? | **«Solo account»**: recupero della password e conferma dell'indirizzo (email 1–3). «Quando sono via» (4) e il riassunto (5) restano spenti, con un interruttore sul server; si accendono dopo, ciascuna con un suo sì |
| 3 | Vuoi ricevere per email le segnalazioni e i messaggi di «Send feedback» (arrivano solo a te)? | **«Sì, tutte e due»** (email 6 e 7): l'indirizzo lo scrive l'utente sul server |
| 4 | I testi delle email dell'account e delle loro schermate, nelle cinque lingue, vanno ancora bene? (inglese approvato il 2026-10-25; it, de, es, fr dell'agente, mostrati ora così come sono nel codice) | **«Sì, vanno bene»**: nessuna modifica |
| 5 | La privacy dice già di Resend e delle email dell'account: resta com'è? | **«Sì, resta com'è»**: nessuna modifica, né nell'app né sul sito |
| 6 | Gli account già iscritti restano «Email not confirmed» finché non confermano da «Settings», senza email mandate da sole, come deciso a ottobre per i 3 di allora? | **«Sì, come a ottobre»**: nessuna email di massa; il recupero funziona per tutti, e aprire quel link conferma anche l'indirizzo |

I testi mostrati all'utente sono quelli di `account_email_texts.py` e
delle tabelle `apps/mobile/src/i18n/*.ts` (le frasi di TASK-300 parte B),
estratti dal codice senza riscriverli.

## Resend: quanto costa (letto su resend.com il 2026-11-24)

- **Free**: 0 $ al mese, 3.000 email al mese, **al massimo 100 al
  giorno** (il giorno è quello UTC), 3 domini, dati tenuti 30 giorni.
  Oltre la quota Resend rifiuta l'email (`429`) e non la rimanda.
- **Pro**: 20 $ al mese, 50.000 email al mese, nessun limite al giorno.
- Non c'è un piano in mezzo.

Per le email 1–3, 6 e 7 **basta il piano gratuito**: ogni iscrizione è
una email, ogni recupero un'altra. Il limite da tenere d'occhio è quello
dei 100 al giorno: un giorno con più di 100 fra iscrizioni e recuperi
lascerebbe fuori gli ultimi (l'iscrizione funziona lo stesso, l'indirizzo
resta «non confermato»). Accendere «quando sono via» (4) è il momento in
cui il piano va riguardato: prima si conta quanti sono gli assenti.

## Cosa fa l'utente su Resend (nessun agente crea account o tocca il DNS)

1. Su <https://resend.com> crea l'account (piano gratuito).
2. **Domains › Add domain**: `getmuw.app`, **il dominio intero** e non un
   sottodominio (il mittente è `hello@getmuw.app`; verificando solo un
   sottodominio si potrebbe scrivere soltanto da lì). Regione proposta:
   **Ireland (`eu-west-1`)**; non si cambia dopo senza rifare i record.
3. Resend mostra i record da copiare. Su Porkbun, **DNS** di `getmuw.app`:
   si aggiungono così come Resend li scrive, mettendo nel campo «Host»
   solo la parte prima del dominio. Il 2026-11-26 erano **due `CNAME`**,
   `send` e `rsend` (verso nomi di Resend; quello di `rsend` porta la
   regione, `…-euw1…` per l'Irlanda), e un `TXT` su `resend._domainkey`
   (DKIM). Non più un `MX` e un `TXT` su `send`, come scritto qui il 24
   novembre: vale sempre quello che Resend mostra. I record di oggi
   (sito, `api`) non si toccano.
4. In Resend **Verify**: può volerci da qualche minuto a qualche ora.
5. Facoltativo ma consigliato: un `TXT` su `_dmarc` con
   `v=DMARC1; p=none;`.
6. **API Keys › Create API key**: permesso di solo invio, limitata a
   `getmuw.app`. La chiave (`re_…`) non si rivede: la si incolla una volta
   sola sul server, nel passo del Coordinatore, mai in chat né nel
   repository.

## Parti

- **0 — Domande e documenti** (questa PR). Nessun codice, nessun account,
  nessun server.
- **A — I due giri si accendono a parte** (API, piccola). Con le tre
  variabili partono le email dell'account; «quando sono via» e il
  riassunto partono solo se `SHAPEROUTE_EMAIL_ROUNDS` li nomina (ADR-0410).
  Vuota, nessuno dei due: una email a tutti gli iscritti deve essere un
  gesto voluto, non una dimenticanza. File:
  - nuovo `services/api/shaperoute_api/email_rounds.py` (legge e controlla
    la variabile) e nuovo `services/api/tests/test_email_rounds.py`;
  - `services/api/shaperoute_api/__main__.py`: i due giri partono solo se
    nominati; le righe dell'avvio dicono quale è acceso e quale no;
  - `.env.example`: la variabile nuova, senza valore.

  Niente nell'app, niente nel motore, nessuna migrazione, nessuna
  dipendenza, nessun testo nuovo. I documenti (`DEPLOY.md`, «Email di
  ritorno» e «Email confermata e password dimenticata»; `API.md` se serve)
  vanno nella PR di chiusura.
- **U — L'utente su Resend** (sopra), in parallelo con A.
- **S — Il passo sul server** (Coordinatore, col sì dell'utente; dopo A in
  `main` e dopo che Resend dice «Verified»). Uno script che non si può
  lanciare due volte: l'utente scrive la chiave e il suo indirizzo con
  comandi che non li mostrano, il segreto dei link lo genera il server
  (`DEPLOY.md`, «Email di ritorno», punto 2), poi l'API nuova. Il passo è
  fatto se l'avvio dice «Addresses confirmed and passwords reset by email
  (Resend)», «Each new report is emailed», «Each message of «Send
  feedback» is emailed», e **non** dice che i due giri sono accesi; e se
  `GET /account-email` risponde 200.
- **P — La prova vera** (utente, sul telefono, senza OTA): «Forgot
  password?» sotto «Log in» con un account di prova, l'email arriva (anche
  nello spam si guarda), password nuova, accesso; un'iscrizione nuova
  riceve la conferma; una segnalazione e un feedback di prova arrivano
  all'utente. Il Coordinatore guarda nel log che nessuna email sia
  rifiutata.
- **Chiusura**: `DEPLOY.md`, ADR-0410 «Attiva», una riga in
  `archive/COMPLETATI.md`.

Ordine: 0 → A e U insieme → S → P → chiusura. La privacy non ha una
parte: resta com'è (scelta 5).

## Com'è andata

- **0** — #1564, in `main` il 2026-11-24.
- **A** — #1566, in `main` il 2026-11-24 (`0321161d`): `email_rounds.py`,
  `test_email_rounds.py`, le righe dell'avvio in `__main__.py`,
  `.env.example`. Sul server col passo 23 (`bd61af6c`, 2026-11-26).
- **U** — l'utente, il 2026-11-26: «ho fatto l'account Resend, il dominio è
  verificato». Nel DNS pubblico, lo stesso giorno: `send` e `rsend` sono
  `CNAME` verso Resend (`rsend-euw1`, la regione proposta), la chiave DKIM
  è su `resend._domainkey`, `_dmarc` ha `v=DMARC1; p=none;`. La chiave API
  l'ha creata e tenuta lui.
- **S** — il 2026-11-26, passo 24 del Coordinatore
  (`out/coordinatore/passo24.sh`), lanciato dall'utente dal Mac: chiave e
  indirizzo scritti da lui senza mostrarli, segreto generato sul server,
  `SHAPEROUTE_DOMAIN=api.getmuw.app`, `SHAPEROUTE_EMAIL_ROUNDS` vuota;
  ricreato solo il contenitore `api`. Controllo del Coordinatore sul
  server: l'avvio dice «Addresses confirmed and passwords reset by email
  (Resend)», «Each new report is emailed», «Each message of «Send
  feedback» is emailed» e i due giri «off (SHAPEROUTE_EMAIL_ROUNDS does
  not name away / notices)»; `GET /account-email` risponde 200.
- **P** — il 2026-11-26 l'utente, a cui erano stati chiesti il recupero
  con «Forgot password?», un'iscrizione nuova, una segnalazione e un
  feedback di prova: **«Sì, funziona»**. Nessun OTA.
- **Log** — il controllo che Resend non abbia rifiutato nessuna email è
  del Coordinatore, dopo la prova.

## Fuori da questo task

- **Accendere «quando sono via» e il riassunto**: ciascuna col suo sì
  dell'utente, dopo aver contato gli assenti
  (`python -m shaperoute_api.away_email`, che non manda niente) e
  riguardato il piano di Resend.
- **Le risposte a `hello@getmuw.app`** (ancora aperto il 2026-11-26, il
  dominio non ha un `MX`): oggi il dominio non riceve posta,
  chi risponde a una email di MuW riceve un errore. Proposta, da decidere
  con l'utente: un inoltro di `hello@getmuw.app` alla sua casella dal
  gestore del dominio (lo fa lui), senza codice. Non blocca niente.

## Criteri di accettazione (parte 0)

- [x] Elenco delle email dell'API, di cosa le fa partire e delle variabili.
- [x] Detto che oggi il recupero non si accende da solo, e proposta la
      parte di codice.
- [x] Le sei risposte dell'utente registrate.
- [x] ADR-0410 in `DECISIONS.md` e la sua riga nell'indice.
- [x] PR di soli documenti «pronta» al Coordinatore (#1564).
- [x] Parti successive e lista dei file mandate al Coordinatore.

## Criteri di accettazione (il task)

- [x] Con le tre variabili partono le email dell'account e non i due giri
      (parte A, `test_email_rounds.py`).
- [x] In produzione `GET /account-email` risponde 200 e l'avvio dice i due
      giri spenti (passo 24).
- [x] L'utente recupera una password dal telefono, senza OTA.
- [x] `DEPLOY.md` e `API.md` dicono come si accende ogni email adesso;
      ADR-0410 «Attiva».

## File toccati (parte 0)

- `docs/tasks/TASK-515.md` (nuovo)
- `docs/DECISIONS.md` (ADR-0410 in «Voci nuove» e nell'indice)
- `docs/STATUS.md` (la voce del task)
- `docs/INDEX.md` (una riga)

## File toccati (chiusura)

- `docs/tasks/TASK-515.md`
- `docs/DEPLOY.md` («Email di ritorno», «Email confermata e password
  dimenticata»)
- `docs/API.md` (le due righe «Spenta» dei giri)
- `docs/DECISIONS.md` (ADR-0410 «Attiva», voce e indice)
- `docs/STATUS.md` (la voce esce)
- `docs/archive/COMPLETATI.md` (una riga)

## Cosa resta (non blocca, non è di questo task)

- Accendere «quando sono via» o il riassunto: `SHAPEROUTE_EMAIL_ROUNDS` sul
  server, ciascuno col sì dell'utente («Fuori da questo task»).
- L'inoltro di `hello@getmuw.app`, se l'utente lo vuole.
- Il piano gratuito di Resend ha 100 email al giorno: da riguardare se un
  giorno iscrizioni e recuperi ci si avvicinano.
