# TASK-153 — AdMob dagli annunci di prova a quelli veri

**Stato**: Fermo (2026-10-09): gli annunci veri aspettano la società dell'utente (TASK-267 per la 1.0)
**Fase**: 4 · **Branch**: `feat/TASK-153-admob-live`
**Dipende da**: TASK-150 (account AdMob e pagamenti), TASK-152 (app
sull'App Store, sito dello sviluppatore)

## Obiettivo

L'app sullo store mostra annunci veri di AdMob prima del percorso, che
guadagnano. L'app è verificata con `app-ads.txt`, il consenso europeo è
quello di Google e l'utente può cambiarlo dall'app.

## Contesto da leggere

- `docs/DECISIONS.md` ADR-0102
- `docs/tasks/TASK-132.md` «Seguiti» (SKAdNetwork)
- `apps/mobile/src/ads/admob.ts`
- Le pagine di Google:
  [app-ads.txt](https://support.google.com/admob/answer/14538460),
  [app readiness](https://support.google.com/admob/answer/10564477).

## Cosa fare

1. **In AdMob** (lo fa l'utente, o l'agente con l'utente davanti): l'app
   iOS collegata alla scheda dell'App Store, un'unità **nativa** («Nativo
   avanzato»): da TASK-235 (ADR-0198) gli annunci sono nativi nel Feed,
   non più interstitial.
2. **ID veri nell'app**: l'ID dell'app nel plugin
   `react-native-google-mobile-ads` di `app.json` (si legge alla build) e
   `EXPO_PUBLIC_ADMOB_NATIVE_IOS` nell'ambiente EAS della build dello
   store. Le build di prova e lo sviluppo restano con gli ID di prova di
   Google. L'iPhone dell'utente si registra in AdMob come dispositivo di
   prova: **mai toccare i propri annunci veri**, Google lo considera
   traffico non valido.
3. **SKAdNetwork**: `skAdNetworkItems` nel plugin, con l'elenco di Google
   (l'SDK oggi ne segnala 50 mancanti).
4. **`app-ads.txt`** sul sito di TASK-152, con la riga che dà AdMob. Poi
   «Verifica app» in AdMob e la revisione «app readiness».
5. **Consenso GDPR**: in AdMob, «Privacy e messaggi», pubblicare il
   messaggio di consenso per lo Spazio economico europeo e il Regno Unito.
   Senza, il modulo di Google che l'app chiede già (`gatherConsent`) non ha
   niente da mostrare.
6. **Pulsante «Privacy options»**: Google chiede che l'utente possa
   cambiare il consenso quando lo richiede la legge
   (`privacyOptionsRequirementStatus`). **Dove metterlo è una scelta
   dell'utente**: proporre un posto (per esempio in fondo alla schermata
   principale) e chiedere. Con un test.
7. **Frequenza**: un annuncio a ogni ricerca è la scelta dell'utente
   (ADR-0102). Se il centro norme di AdMob la segnala, si limita dalla
   console di AdMob e si avvisa l'utente.
8. **Prova**: una build TestFlight con gli ID veri sull'iPhone registrato
   come dispositivo di prova mostra l'etichetta «Test Ad»; poi la build
   dello store.

## Criteri di accettazione

- [ ] In AdMob l'app risulta pronta e `app-ads.txt` è verificato.
- [ ] Il messaggio di consenso europeo è pubblicato in AdMob.
- [ ] «Privacy options» si apre dall'app dove ha scelto l'utente, con un
      test; in Expo Go non compare e l'app funziona come prima.
- [ ] Nel report di AdMob c'è la prima impressione vera.
- [ ] Nel repository non c'è nessun ID del publisher fuori da `app.json`
      ed `.env.example` (vuoto); le chiavi stanno in EAS.

## File toccati

```
apps/mobile/app.json
apps/mobile/src/ads/
apps/mobile/App.tsx (o la schermata scelta per «Privacy options»)
.env.example
site/app-ads.txt
docs/DEPLOY.md (solo site/app-ads.txt nell'elenco di F.14, dal coordinatore)
docs/DECISIONS.md
docs/PUBBLICITA.md
docs/STATUS.md
docs/tasks/TASK-153.md
```

## Fuori scope

- Altri formati (banner, annunci con premio) e altre reti (mediazione).
- Android.
- Cambiare dove compare l'annuncio: ADR-0102.

## Esito

**Fermo il 2026-10-09**, su decisione dell'utente («la lanciamo senza
pubblicità, faremo poi»; gli annunci veri quando ci sarà la società). La
1.0 dello store esce con gli annunci spenti: TASK-267, ADR-0237. ADR-0236
resta riservato a questo task. Branch e worktree tenuti, nessuna PR.

Già fatto sul branch `feat/TASK-153-admob-live` (commit b90d841c, da main
fb27b50d):

- **Annunci nativi, non interstitial.** Da TASK-235 (ADR-0198) l'app usa
  solo annunci nativi nel Feed: in AdMob va creata un'unità «Nativo
  avanzato», e la variabile di EAS è `EXPO_PUBLIC_ADMOB_NATIVE_IOS`.
  Corretto sopra.
- **SKAdNetwork**: `skAdNetworkItems` con i 50 identificativi di Google
  (letti con `curl` dalle pagine «quick-start» e «3p-skadnetworks», uguali
  fra loro; Google per primo) nel plugin `react-native-google-mobile-ads`
  di `app.json`. `expo config --type introspect` li mette tutti e 50 in
  `Info.plist`.
- **`site/app-ads.txt`** con l'ID publisher dell'utente, e nell'elenco di
  `git archive` di `DEPLOY.md` F.14.
- **«Privacy options»** nel codice: `src/ads/privacyOptions.ts`
  (`required()` chiede a Google se serve, `open()` mostra il suo modulo) e
  `usePrivacyOptions`, con test. Nascosto in Expo Go. Manca il punto dello
  schermo: proposta all'utente, senza risposta prima dello stop: una riga
  in Impostazioni → INFO sotto «Privacy» e un link piccolo sotto ogni
  annuncio «Sponsored» del Feed (anche chi non ha un account vede gli
  annunci), testi «Privacy options», «Opzioni privacy»,
  «Datenschutzoptionen», «Opciones de privacidad», «Options de
  confidentialité». Va richiesta di nuovo.

**Quando si riprende**: l'utente ha precisato il 2026-10-09 «la pubblicità
la inseriamo quando facciamo la società». Non alla prossima build: alla
società. Allora va verificato prima di tutto l'account AdMob: oggi è
**individuale** e Google non ne cambia il tipo, quindi forse servirà un
account della società, con un ID dell'app nuovo (in `app.json`) e un ID
publisher nuovo (in `site/app-ads.txt`), e un nuovo profilo pagamenti.
Anche lo spegnimento di TASK-267 (ADR-0237) va tolto.

Da rifare alla ripresa: aggiornare il branch da main; se l'account AdMob
cambia (società: il tipo di account non si cambia), cambiano anche l'ID
dell'app in `app.json` e l'ID publisher in `site/app-ads.txt`; i passi
nella console AdMob (scheda App Store, unità nativa, messaggio GDPR,
verifica di `app-ads.txt`) sono ancora tutti da fare.
