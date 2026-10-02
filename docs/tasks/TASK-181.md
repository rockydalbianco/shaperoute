# TASK-181 — La schermata di avvio nativa gialla

**Stato**: Done
**Fase**: 4 · **Branch**: `feat/TASK-181-yellow-splash`
**Dipende da**: TASK-179 (in `main` dalla #190)

Chiesto dall'utente il 2026-10-02, alla domanda lasciata da TASK-179: «sì,
fai gialla anche la schermata di avvio nativa».

## Obiettivo

In una build propria l'avvio è giallo dall'inizio alla fine: la schermata
nativa è gialla con il logo nero, e l'animazione di TASK-179 parte già
gialla, senza il nero in mezzo.

## Contesto da leggere

- `docs/UI.md` «Il logo e l'icona» (la schermata di avvio, l'animazione)
- `docs/DECISIONS.md` ADR-0134 e ADR-0147
- `apps/mobile/app.json` (il plugin `expo-splash-screen`)
- `apps/mobile/src/intro/LaunchIntro.tsx` e il suo test
- `docs/tasks/TASK-165.md` «Cosa è stato verificato» (come si controlla il
  prebuild e cosa va annullato dopo)

## Cosa si sa già

- Le due immagini scure sono **già in questo branch**:
  `assets/splash-logo-dark.png` (1040 × 1040, il logo intero) e
  `assets/splash-icon-dark.png` (1024 × 1024, il segno), cioè
  `splash-logo.png` e `splash-icon.png` con ogni pixel a `#0A0A0B` e la
  stessa trasparenza. Fatte con `out/intro/tint.swift` (fuori da git):
  `swift tint.swift in.png out.png 0A0A0B`.
- Oggi l'animazione parte dal nero (`color.background`) e un cerchio giallo
  riempie lo schermo in 0,35 s (`INTRO_MS.flood`): dopo una schermata nativa
  gialla sarebbe giallo → nero → giallo.
- La schermata nativa si vede solo in una build propria (TASK-152); la parte
  dell'animazione si vede anche in Expo Go, dopo una pubblicazione.
- `app.json` è libero (coordinatore, 2026-10-02). Per l'ADR: un paragrafo
  «Aggiornamento 2026-10-02» in fondo ad ADR-0134 e ad ADR-0147, senza
  numero nuovo e senza riscrivere quello che c'è.

## Cosa fare

1. `apps/mobile/app.json`, plugin `expo-splash-screen`: `backgroundColor`
   `#FFD02B`, `image` `./assets/splash-icon-dark.png`, `ios.image`
   `./assets/splash-logo-dark.png`. Le larghezze restano 240 e 260.
2. `LaunchIntro.tsx`: il fondo è `color.accent` dal primo fotogramma; via il
   cerchio che riempie lo schermo. I 0,35 s restano come attesa prima che la
   penna parta (`INTRO_MS.flood` diventa `INTRO_MS.wait`): i tempi totali
   non cambiano, il giallo si vede 2,4 s. La penna e il punto di partenza
   si vedono da subito. Il logo usa `splash-logo-dark.png`, senza
   `tintColor`.
3. Se dopo il punto 2 niente usa più `assets/splash-logo.png` e
   `assets/splash-icon.png` (`grep` in `apps/` e in `app.json`), cancellarli.
4. Test: aggiornare `LaunchIntro.test.tsx` ai nomi nuovi; i tempi restano
   quelli.
5. Controllo del prebuild, come in TASK-165: `npx expo config --type
   public`; `npx expo prebuild --platform ios --no-install`, guardare in
   `SplashScreen.storyboard` il colore `SplashScreenBackground` e le
   immagini generate; poi cancellare `ios/` e annullare ciò che il prebuild
   scrive in `app.json` (`android.package`) e in `package.json` (due
   script).
6. `UI.md` (i due paragrafi dell'avvio), i due aggiornamenti degli ADR,
   `STATUS.md`.

## Criteri di accettazione

- [x] `npx expo config` legge il plugin con fondo `#FFD02B` e le due
      immagini scure.
- [x] Il prebuild di iOS genera la schermata di avvio gialla con il logo
      nero.
- [x] L'animazione non mostra più il nero: il primo fotogramma è giallo.
- [x] Il giallo si vede sempre almeno 2 secondi (2,4 s).
- [x] Nessun colore scritto a mano nell'app (`app.json` non può leggere i
      token: lì il giallo è scritto, come il nero di prima).
- [x] Test, lint, typecheck e prettier verdi.
- [ ] Vista in una build propria (TASK-152).

## File toccati

```
apps/mobile/app.json
apps/mobile/assets/splash-logo-dark.png
apps/mobile/assets/splash-icon-dark.png
apps/mobile/assets/splash-logo.png
apps/mobile/assets/splash-icon.png
apps/mobile/src/intro/LaunchIntro.tsx
apps/mobile/src/intro/LaunchIntro.test.tsx
docs/DECISIONS.md
docs/UI.md
docs/STATUS.md
docs/tasks/TASK-181.md
```

## Fuori scope

- Il logo che dalla schermata nativa (al centro) scende sotto il cuore con
  un movimento: oggi fa un salto. Se in una build propria si nota, un task
  a parte.
- Una schermata di avvio diversa con il telefono in tema chiaro o scuro
  (`dark` del plugin): è gialla per tutti.
- L'icona dell'app: resta gialla su nero (TASK-159).
- Pubblicare su `preview`: con l'ok dell'utente, da `main` pulito. Cambia
  solo l'inizio dell'animazione (niente più cerchio dal nero).

## Cosa è stato verificato

- **`npx expo config --type public`**: il plugin ha `backgroundColor`
  `#FFD02B`, `splash-icon-dark.png` e, per iOS, `splash-logo-dark.png`.
- **Prebuild di iOS** (`npx expo prebuild --platform ios --no-install`):
  `SplashScreenBackground` è sRGB 255, 208, 43; `SplashScreen.storyboard`
  mette `SplashScreenLogo` in un riquadro di 260 × 260 al centro; l'immagine
  generata a 3x è 780 × 780, il logo nero. Composta su uno schermo di
  390 × 844: logo nero centrato sul giallo. La cartella `ios/` è stata
  cancellata e i due script che il prebuild cambia in `package.json`
  annullati; `app.json` il prebuild di iOS non lo tocca.
- **Animazione, in un simulatore** (iPhone 17, iOS 27, Expo Go, Metro dal
  worktree): filmata. Il primo fotogramma è giallo con il punto di partenza
  e il logo; il cuore si disegna tutto, resta fermo, poi compare «Draw».
- **Il difetto trovato filmando**: alla prima ripresa, con il Mac molto
  carico (load oltre 600), il cuore partiva più di un secondo in ritardo e
  la dissolvenza lo tagliava a metà. Corretto (ADR-0147, aggiornamento) e
  rifilmato: il cuore finisce sempre prima della dissolvenza.
- Android: non provato il prebuild (in TASK-165 era stato controllato; qui
  cambiano solo colore e immagine). Su un telefono: serve una build propria.

## Esito

Fatto (2026-10-02). L'avvio è tutto giallo: schermata nativa gialla con il
logo nero, animazione che parte già gialla. In più l'animazione non può più
essere tagliata a metà su un telefono lento. 14 test dell'animazione, suite
dell'app, lint, typecheck e prettier verdi. Le due immagini gialle non più
usate sono cancellate. **Da pubblicare su `preview`** con l'ok dell'utente
per la parte dell'animazione; la schermata nativa si vede in una build
propria (TASK-152). Rimandato: il logo che scende dal centro con un
movimento, se in una build propria il salto si nota.
