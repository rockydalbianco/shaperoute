# TASK-152 — Sgrava sull'App Store

**Stato**: Todo · parte A fatta (profilo `production`, ADR-0233)
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
site/                  (nuovo: privacy, contatti, posto per app-ads.txt)
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
dall'utente prima dell'App Store; numero e ADR dal Coordinatore.

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
