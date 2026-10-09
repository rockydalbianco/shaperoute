# TASK-152 — Sgrava sull'App Store

**Stato**: In lavorazione · parte A fatta (profilo `production`, ADR-0233);
parte B (ambiente `production`, prima build) in corso
**Fase**: 4 · **Branch**: `feat/TASK-152-app-store` (parte A:
`feat/TASK-152-a-production-profile`)
**Dipende da**: TASK-132 (AdMob nell'app), API raggiungibile con HTTPS
(server Hetzner, TASK-122) · **Serve prima di**: TASK-153 · In parallelo
con TASK-150

## Obiettivo

Sgrava si scarica dall'App Store, prima con TestFlight e poi per tutti. La
scheda dello store ha un sito dello sviluppatore e un'informativa sulla
privacy, così AdMob può verificare l'app (TASK-153).

## Contesto da leggere

- `docs/DECISIONS.md` ADR-0078 (EAS Update ed Expo Go), ADR-0102 (AdMob)
- `docs/tasks/TASK-132.md` «Seguiti» (UIScene con l'SDK iOS 27)
- `docs/tasks/TASK-110.md` «Esito», ultima voce: il testo della privacy
  pubblicato a un indirizzo
- `docs/DEPLOY.md` A.6 (pubblicare con EAS)

## Domande per l'utente (prima di partire, una per volta)

1. **Account Apple Developer** (99 $ l'anno): individuale o organizzazione?
   Un'organizzazione chiede una ditta e il numero D-U-N-S. Il nome del
   venditore sullo store è quello del titolare. Va d'accordo con la scelta
   di TASK-150.
2. **Commerciante («trader») per la UE**: Apple chiede di dichiararlo per
   distribuire in Europa. Un'app con pubblicità lo è probabilmente; in quel
   caso indirizzo, telefono ed email del titolare si vedono sullo store.
3. **Il sito dello sviluppatore**: un dominio proprio (circa 10 € l'anno) o
   un indirizzo del server Hetzner? AdMob cerca `app-ads.txt` alla radice
   del dominio scritto nella scheda dello store.
4. **Il nome sullo store** e sotto l'icona: «Sgrava» o «ShapeRoute»? Oggi
   `app.json` dice «ShapeRoute» e l'app mostra «Sgrava».
5. **Solo iPhone o anche Android?** Google Play costa 25 $ una volta. Se sì,
   Android diventa un task a parte.

**Risposte** (2026-10-08):

1. **Persona fisica**, come AdMob (TASK-150). L'utente si è iscritto con
   il suo Apple ID il 2026-10-08. Quando aprirà una società vuole passare
   a organizzazione: si fa da developer.apple.com/account, «Membership» →
   «Switch to organization membership», con il numero D-U-N-S della
   società (gratuito, da Dun & Bradstreet); Apple può chiedere documenti
   e la verifica dura fino a circa tre settimane. L'app resta nello
   stesso account, cambia solo il nome del venditore.
2. **Commerciante («trader») UE: sì**, come persona fisica, con i suoi
   dati (2026-10-09). Domanda fatta esplicitamente, dicendo che indirizzo,
   telefono ed email diventano pubblici sull'App Store nell'UE; risposta
   dell'utente: «vorrei attivare da subito gli annunci pubblicitari quindi
   sì commerciante». La società la apre più avanti, dopo i primi ~300 € di
   guadagno: allora si aggiornano i dati del trader e l'account passa a
   organizzazione (risposta 1). Lo stato si imposta su App Store Connect,
   Business → Digital Services Act (lo fa l'utente).
3. **`getmuw.app`**, dominio proprio (TASK-265, ADR-0234): il sito è
   online lì, l'API su `api.getmuw.app`.
4. **«MuW»** (TASK-260, ADR-0224). Se il nome è già preso sull'App
   Store lo si scopre quando si crea la scheda.
5. *Aperta.*

## Cosa fare

1. L'utente si iscrive all'Apple Developer Program e accetta i contratti
   (lo fa l'utente, con le sue credenziali).
2. **Sito**: una pagina con informativa sulla privacy e contatti. La
   privacy dice cosa raccoglie l'app e perché: posizione per il percorso,
   richieste all'API, dati raccolti da AdMob, consenso, come cancellarli.
   Il posto per `app-ads.txt` è pronto; il contenuto arriva in TASK-153.
3. **Build per lo store**: profilo `production` in `eas.json`. Prima di
   toccare `runtimeVersion` e canali, decidere come convivono Expo Go
   (canale `preview`, ADR-0078) e la build dello store, e scriverlo in
   un ADR. **Fatto nella parte A** (ADR-0233, `DEPLOY.md` A.7).
4. **SDK richiesto da Apple**: controllare quale Xcode accetta oggi App
   Store Connect. Se serve l'SDK iOS 27, fare il seguito UIScene di
   TASK-132 (`ExpoAppSceneDelegate`) con un config plugin, non a mano.
5. **Testi dei permessi** in `app.json`: posizione e foto in inglese, come
   gli altri testi dell'app.
6. **Etichette privacy** dell'App Store: seguire la guida di Google per i
   dati di AdMob. Nessuna richiesta ATT (ADR-0102).
7. **Scheda**: screenshot, descrizione, categoria (Salute e fitness), età,
   URL della privacy e del sito.
8. **TestFlight**: build sull'iPhone dell'utente e degli amici. Prova:
   percorso, navigazione, GPX, annuncio di prova di Google.
9. Revisione di Apple. Il rifiuto o l'approvazione si scrivono qui.

## Criteri di accettazione

- [ ] Le cinque domande hanno una risposta dell'utente, scritta qui.
- [ ] La pagina della privacy è pubblicata a un indirizzo HTTPS.
- [ ] Una build `production` è su TestFlight e si apre sull'iPhone
      dell'utente: percorso, navigazione, GPX e annuncio di prova funzionano.
- [ ] La scheda dell'App Store ha il sito dello sviluppatore e l'URL della
      privacy.
- [ ] Inviata alla revisione di Apple; l'esito è scritto qui.
- [ ] Expo Go sul canale `preview` funziona come prima (ADR-0078).

## File toccati

```
apps/mobile/app.json
apps/mobile/eas.json
apps/mobile/app.config.ts          (nuovo, parte A)
apps/mobile/fingerprint.config.js  (nuovo, parte A)
apps/mobile/__tests__/appConfig.test.ts  (nuovo, parte A)
docs/DEPLOY.md
docs/DECISIONS.md
docs/STATUS.md
docs/tasks/TASK-152.md
```

## Fuori scope

- Gli ID veri di AdMob, il contenuto di `app-ads.txt`, il consenso GDPR:
  TASK-153.
- Pagamenti e fisco: TASK-150.
- Android e Google Play: un task a parte, se l'utente lo chiede.
- «Sign in with Apple» e la parte social.

## Esito

*(si compila a fine task)*

**Parte A — il profilo `production` (2026-10-08, ADR-0233)**. Chiesta
dall'utente prima dell'App Store; numero e ADR dal Coordinatore. In
`main` con la PR #446 (merge `9dcacbf4`); niente da pubblicare, `preview`
non cambia.

- `eas.json`: profilo `production` (canale `production`, ambiente EAS
  `production`, `autoIncrement`, `APP_VARIANT=production`).
- `app.config.ts` (nuovo): con `APP_VARIANT=production` il runtime è
  `{policy: "fingerprint"}`; senza resta quello di `app.json`,
  `exposdk:57.0.0`. `app.json` non cambia, così Expo Go e `preview`
  restano come prima e non c'è conflitto con TASK-261 (#441), che
  tocca `app.json`.
- `fingerprint.config.js` (nuovo): fuori dall'impronta versione, numero
  di build ed `eas.json`.
- `__tests__/appConfig.test.ts` (nuovo): caricata come la carica Expo
  (`getConfig`), senza variabile la config ha `exposdk:57.0.0` e tutti i
  plugin di `app.json` (chiesto dal Coordinatore; dopo il merge di #441,
  che aggiunge un plugin, va riallineato e riprovato); la variante
  `production` cambia solo il runtime; `APP_VARIANT` solo nel profilo
  `production`. `getConfig` valuta `app.config.ts` fuori da Jest, con le
  variabili vere del processo: la variante si prova chiamando la funzione. Provato anche sul Mac con `expo-updates
  runtimeversion:resolve` (i casi sono in ADR-0233). Nessuna build e nessun `eas update`: servono
  l'account Apple e le variabili dell'ambiente EAS `production`, oggi
  vuoto (`DEPLOY.md` A.7, punti 1–2).
- **Resta per la parte che fa la prima build**, nell'ordine:
  1. le variabili dell'ambiente EAS `production` (`EXPO_PUBLIC_API_URL`,
     `EXPO_PUBLIC_API_KEY`), oggi vuoto: le scrive l'utente, o l'agente
     solo con il suo sì esplicito, **prima** della prima build
     (`DEPLOY.md` A.7, punto 1);
  2. confrontare l'impronta della build con quella del Mac (`DEPLOY.md`
     A.7, punto 4);
  3. i passi 1–2 e 4–9 di «Cosa fare» e le cinque domande.

**Parte B — l'ambiente `production` e la prima build** (in corso, dal
2026-10-08). Data dal Coordinatore a una sessione nuova dopo la parte A.

- Iscrizione all'Apple Developer Program fatta dall'utente il
  2026-10-08, come persona fisica (risposta 1 sopra).
- Ambiente EAS `production`: `EXPO_PUBLIC_API_URL=https://api.getmuw.app`
  (plaintext) messo dall'agente il 2026-10-08 con il sì esplicito
  dell'utente. `EXPO_PUBLIC_API_KEY` la scrive l'utente, visibilità
  *Sensitive*; l'agente non la legge.
- Impronta calcolata sul Mac in un worktree pulito di `main` `d2ba47c6`
  dopo un `npm ci` vero: `97c9f355eb92df016e1222cfffa8f869ff391471`
  (uguale due volte; senza variabile resta `exposdk:57.0.0`). Va
  confrontata con quella della prima build sulla sua pagina di expo.dev
  (`DEPLOY.md` A.7, punto 4); la build parte dallo stesso worktree.
- La pagina della privacy non è ancora online: `getmuw.app/privacy` dà
  404 e la home non la collega (2026-10-08). Serve per la scheda e per
  il link pubblico di TestFlight. **La fa TASK-237 parte D** (sessione
  «SITO WEB», dalla bozza dell'app con i segnaposto compilati
  dall'utente), su decisione del Coordinatore del 2026-10-08: `site/`
  esce dai «File toccati» di questo task; l'URL arriva da lì e il
  Coordinatore avvisa quando è online.
- Il link di download del sito sarà il **link pubblico di TestFlight**
  (scelta dell'utente del 2026-10-08): appena esiste va scritto al
  Coordinatore, che lo passa a TASK-237. Vuole un gruppo di tester
  esterni e la Beta App Review della prima build.
- Primo tentativo di build `production` (2026-10-08 sera, lanciato
  dall'utente dal worktree pulito): login Apple e codice a due fattori
  riusciti, poi «You have no team associated with your Apple account»,
  cioè l'iscrizione non è ancora attiva. Nessuna build creata. Effetti
  rimasti, innocui: `buildNumber` su EAS passato da 1 a 2; canale e branch
  `production` creati su EAS. La build era partita senza
  `EXPO_PUBLIC_API_KEY` (non ancora nell'ambiente): al prossimo tentativo
  controllare che la riga «Environment variables … loaded» la elenchi.
- **Prima build `production` riuscita** il 2026-10-09 (build EAS
  `4455655b-154b-4a91-98e4-fd26b3dfc8dc`, `buildNumber` 3, commit
  `d2ba47c6`, team Apple «LUCA PALLAORO (Individual)», credenziali iOS
  create da EAS). **Impronta uguale a quella del Mac**:
  `97c9f355eb92df016e1222cfffa8f869ff391471`, quindi il controllo di
  `DEPLOY.md` A.7 punto 4 alla prima build è fatto. La build però non
  ha `EXPO_PUBLIC_API_KEY` (non era ancora nell'ambiente `production`):
  senza chiave l'API risponde 401 a tutto, quindi **non va mandata a
  TestFlight**; se ne fa un'altra con la chiave.
- Versione dell'app da `0.0.0` a **`1.0.0`** in `app.json`, prima della
  build per TestFlight: è il numero che Apple mostra sullo store e che
  la versione in App Store Connect deve uguagliare. L'impronta non lo
  guarda (`fingerprint.config.js`, provato in ADR-0233) e il runtime di
  Expo Go resta `exposdk:57.0.0`. Deciso dall'agente su delega
  dell'utente.
- **Seconda build `production`**, la prima per TestFlight (2026-10-09):
  build EAS `e1166bc0-842c-46d2-b39b-9180a20e9133`, versione `1.0.0`,
  build 4, commit `9295d17a`, runtime `97c9f355…` (uguale), con
  `EXPO_PUBLIC_API_KEY` (copiata dall'utente da `preview` a `production`
  con un suo comando `env:get | env:set`; l'agente non l'ha letta).
  `--auto-submit` è fallito con «Missing submit profile in eas.json:
  production» (con `--auto-submit` il profilo si cerca per nome; `eas
  submit` senza `--profile` usa quello predefinito): inviata a parte con
  `eas submit --platform ios --id e1166bc0…`. EAS ha creato su App Store
  Connect l'app **«MuW»** (il nome era libero; ASC App ID `6820961883`),
  il gruppo TestFlight interno «Team (Expo)» con l'utente e la chiave API
  di App Store Connect (salvata su EAS). La dichiarazione sulla
  crittografia non è stata chiesta (`usesNonExemptEncryption: false` in
  `app.json`). **L'utente l'ha installata da TestFlight: «sembra
  funzionare».**
- `eas.json`: profilo `submit.production` con l'`ascAppId`, così la
  prossima build va da sola su TestFlight con `--auto-submit` (`DEPLOY.md`
  A.7 punto 2); fuori dall'impronta. Test in `appConfig.test.ts`.
- **Ordine per la build 5, quella per la revisione** (Coordinatore,
  2026-10-09): #457 (TASK-121, segnala e blocca: lo chiede la Guideline
  1.2 di Apple per i contenuti degli utenti) → #451 (notifiche push,
  nativa) → TASK-153 (annunci veri, `app-ads.txt`; sessione «PUBBLICITA»).
  TASK-262 C (rubrica) solo se pronta in tempo, altrimenti 1.0.1. **Niente
  build 5 né invio in revisione senza il via del Coordinatore.**
