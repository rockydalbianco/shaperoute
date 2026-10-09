# TASK-267 — Annunci spenti nella build dello store

**Stato**: In corso
**Fase**: 4 · **Branch**: `feat/TASK-267-store-without-ads`
**Dipende da**: TASK-235 (annunci nel Feed), TASK-152 (build `production`)

## Obiettivo

La 1.0 sull'App Store esce senza pubblicità, scelta dell'utente del
2026-10-09 («la pubblicità la inseriamo quando facciamo la società»):
nella build `production` non c'è il codice nativo di AdMob, non si chiede
il consenso, il Feed non mostra annunci né spazi vuoti, e nessun annuncio
di prova arriva ad Apple. Preview ed Expo Go come oggi.

## Contesto da leggere

- `docs/DECISIONS.md` ADR-0198, ADR-0237
- `docs/DEPLOY.md` A.7
- `apps/mobile/src/ads/admob.ts`, `apps/mobile/app.config.ts`

## Cosa fare

1. `apps/mobile/react-native.config.js`: con `APP_VARIANT=production`
   (da `eas.json`) `react-native-google-mobile-ads` esce dall'autolinking,
   iOS e Android.
2. Test: il file toglie il pacchetto solo con `production`; fuori da
   `src/ads/admob.ts` il pacchetto è importato solo come tipo, così il JS
   non si rompe senza il modulo nativo (come in Expo Go, test di
   TASK-235).
3. Prova con una build vera, come quella dello store: prebuild e
   `pod install` con `APP_VARIANT=production`, build Release nel simulatore.
4. Controllare se privacy, termini e scheda dello store parlano di
   annunci: se sì, segnalarlo al coordinatore (i file non sono di questo
   task).

## Criteri di accettazione

- [x] Con `APP_VARIANT=production` l'autolinking iOS non ha più
      `react-native-google-mobile-ads`; `Podfile.lock` non ha
      `Google-Mobile-Ads-SDK`, `GoogleUserMessagingPlatform` né
      `RNGoogleMobileAds`.
- [x] Senza la variabile l'autolinking è quello di prima (preview).
- [x] Nell'app costruita: nessun file di Google, nessun suo manifesto
      della privacy, nessun simbolo di AdMob nell'eseguibile.
- [x] Aperta nel simulatore: l'app parte, il Feed scorre oltre il quinto
      post solo con post, nessun modulo di consenso (nessuna chiave
      `ump_` o `IABTCF` salvata).
- [x] Fuori da `admob.ts` il pacchetto è solo importato come tipo (test).
- [ ] Nella build 5: stessa verifica sul telefono, e impronta controllata.

## Parte B — I testi senza pubblicità (proposta, da approvare)

Dopo «451 in main», PR nuova, stessa ADR. File: `apps/mobile/src/about/content/{en,it,de,es,fr}.ts`
e `site/privacy/**` (rigenerata con `site/tools/make_privacy.mjs`), più
`site/tests/privacy.test.mjs` se serve. La data di «Privacy» e di
«Termini» diventa quella del giorno dell'approvazione. Proposta
(inglese, il testo di partenza, e italiano; tedesco, spagnolo e francese
dicono lo stesso):

1. **Termini → «Pubblicità»** (oggi: «MuW mostra pubblicità, fornita da
   Google AdMob, fra i disegni di «Feed»…»): diventa
   - EN «MuW shows no advertising.»
   - IT «MuW non mostra pubblicità.»
2. **Privacy → «Pubblicità»** (oggi: i due paragrafi su AdMob, il modulo
   di consenso di Google e l'identificativo pubblicitario): diventa un
   paragrafo solo
   - EN «MuW shows no adverts and uses no advertising service: nothing
     about you goes to an advertising network, and the app never asks to
     track you across other apps.»
   - IT «MuW non mostra annunci e non usa servizi pubblicitari: nessun
     dato su di te va a una rete pubblicitaria, e l'app non chiede mai di
     tracciarti nelle altre app.»
3. **Privacy → chi riceve i dati** (oggi «Google AdMob e Strava, come
   detto sopra.»): EN «Strava, as said above.», IT «Strava, come detto
   sopra.»
4. **Privacy → perché possiamo usare i dati, il consenso** (oggi «…, il
   collegamento a Strava e la pubblicità dove il modulo di Google lo
   chiede.»): EN «Your consent: the phone number you choose to add and the
   connection to Strava. You can take a consent back at any time; what was
   done before stays lawful.», IT «Il tuo consenso: il numero di telefono
   che scegli di aggiungere e il collegamento a Strava. Puoi ritirare un
   consenso in qualsiasi momento; quello che è stato fatto prima resta
   lecito.»

Approvazione dell'utente: *(in attesa)*

## Come ricontrollare l'impronta

Dopo il merge, da un worktree pulito di `main`, come in `DEPLOY.md` A.7
punto 4: `APP_VARIANT=production npx expo-updates runtimeversion:resolve
--platform ios --workflow managed`, da confrontare con l'impronta della
build 5 sulla sua pagina su expo.dev. Senza `APP_VARIANT=production`
l'autolinking ha di nuovo AdMob e l'impronta non torna. In questo branch,
il 2026-10-09: con il file `3edcf510…`, senza `a1a80f0b…` (valori del
worktree, non quelli della build).

## File toccati

```
apps/mobile/react-native.config.js            (nuovo)
apps/mobile/__tests__/storeWithoutAds.test.ts (nuovo)
docs/DECISIONS.md
docs/STATUS.md
docs/tasks/TASK-267.md
```

## Fuori scope

- `app.json` e `app.config.ts` (il plugin di AdMob resta: scrive solo
  chiavi in `Info.plist`).
- I testi di «Termini» e «Privacy» (app: TASK-262 A e C; sito: TASK-237).
- Gli annunci veri: TASK-153, fermo fino alla società.

## Esito

*(si compila a fine task)*
