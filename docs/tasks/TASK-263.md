# TASK-263 — Tono scuro o chiaro, e la sua luminosità

**Stato**: In corso
**Fase**: 4 · **Branch**: `feat/TASK-263-tone` · **ADR**: ADR-0231

## Obiettivo

In «Settings» si sceglie il tono dell'app, scuro o chiaro, e dentro il tono
la luminosità, in cinque passi: l'app e la mappa si ridisegnano con i
colori scelti, e la scelta resta sul telefono.

## La richiesta

L'utente, 2026-10-08: «dai la possibilità di cambiare tono scuro chiaro, e
la luminosità, nel tono». Alla domanda su cosa sia la luminosità ha scelto
«più chiaro o più scuro il tono»: uno slider a cinque passi che schiarisce
o scurisce i colori dell'app e della mappa dentro il tono scelto (con Dark
dal nero pieno al grigio antracite, con Light dal grigio chiaro al bianco
pieno); il giallo del percorso resta uguale. Ha visto e accettato che,
cambiando tono, l'app si riapre per un istante con i colori nuovi.
Scartata la luminosità dello schermo del telefono.

## Contesto da leggere

- `docs/UI.md`, «Il tema»
- `docs/DECISIONS.md`, ADR-0046 (un solo tema scuro: questo task lo supera)
- `apps/mobile/src/theme/tokens.ts`
- `apps/mobile/src/settings/UnitsSetting.tsx` (una voce di «Settings» che
  si apre con le scelte sotto)

## Cosa fare

1. **Le tavolozze** (`src/theme/tokens.ts`): quattro estremi, scuro spento
   (i colori di oggi, identici), scuro acceso (antracite), chiaro spento
   (grigio chiaro), chiaro acceso (bianco). I cinque passi stanno fra i due
   estremi del tono, mescolati colore per colore. `color` resta l'oggetto
   che tutta l'app importa, riempito all'avvio con la tavolozza scelta.
   Giallo, `onAccent`, `badge` e Strava non cambiano mai.
2. **La scelta** (`src/theme/tone.ts`, nuovo): `{ tone, dark, light }`, il
   passo di ciascun tono, in `tone.json` sul telefono, letta in modo
   sincrono all'avvio come lingua e unità. Senza scelta: scuro, passo 0,
   cioè l'app di oggi. Il chiaro parte dal passo 4, il bianco.
3. **Cambiare tono senza toccare 101 `StyleSheet.create`**: gli stili
   leggono i colori quando il file si carica, quindi «Apply» salva la scelta
   e riapre l'app (`reloadAppAsync` di `expo`), che si ricarica con la tavolozza
   nuova. Prima di «Apply» un'anteprima, disegnata con la tavolozza scelta,
   mostra fondo, scheda, testi, mappa e percorso: si provano i passi senza
   riaprire l'app a ogni tocco.
4. **La voce «Tone»** (`src/settings/ToneSetting.tsx`, nuovo), nella
   sezione «PREFERENCES» dopo «Units»: «Dark» e «Light», «Brightness» a
   cinque passi (dal più scuro al più chiaro), l'anteprima, «Apply».
5. **La barra di stato**: chiara sul tono scuro, scura sul chiaro (token
   `statusBarStyle`, in `App.tsx`).
6. **Il percorso sulla mappa chiara**: il giallo su una mappa chiara non si
   vede; sotto la linea gialla un bordo scuro, solo nel tono chiaro (token
   `route.casing`, in `src/map/mapPage.ts`). Dopo il merge della #438, che
   tocca `mapPage.ts`, e d'accordo col coordinatore per TASK-264.
7. **I testi** in cinque lingue, da far approvare all'utente prima del
   merge.
8. ADR-0231, `UI.md` «Il tema», `STATUS.md`.

## Criteri di accettazione

- [ ] Senza scelta l'app ha esattamente i colori di oggi (test: la
      tavolozza scura al passo 0 è uguale ai valori di ADR-0046).
- [ ] Ogni tono a ogni passo rispetta i contrasti: testo ≥ 7:1 su fondo,
      scheda e comando; testi secondari ≥ 4,5:1 su fondo e scheda; bordo
      dei comandi ≥ 3:1 sul fondo; avvisi ed errori ≥ 4,5:1 sul fondo
      (test).
- [ ] Il passo scelto e il tono restano dopo la riapertura (test su
      `tone.json`); un file rotto vale come nessuna scelta.
- [ ] In «Settings» si sceglie tono e passo, l'anteprima cambia subito,
      «Apply» compare solo se qualcosa è cambiato e salva e riapre l'app
      (test).
- [ ] Nel tono chiaro la barra di stato è scura e il percorso ha il bordo
      scuro; nel tono scuro tutto come oggi.
- [ ] Testi approvati dall'utente in cinque lingue.
- [ ] Lint, typecheck, format e test verdi.

## File toccati

```
apps/mobile/src/theme/tokens.ts
apps/mobile/src/theme/tone.ts                 (nuovo)
apps/mobile/src/theme/tone.test.ts            (nuovo)
apps/mobile/src/theme/palettes.test.ts        (nuovo)
apps/mobile/src/settings/ToneSetting.tsx      (nuovo)
apps/mobile/src/settings/ToneSetting.test.tsx (nuovo)
apps/mobile/src/profile/SettingsPage.tsx      (una riga, condivisa con TASK-262 A)
apps/mobile/src/profile/SettingsPage.test.tsx (la riga «Tone» fra i pulsanti)
apps/mobile/App.tsx                           (la barra di stato, una riga)
apps/mobile/src/map/mapPage.ts                (il bordo del percorso, dopo #438)
apps/mobile/src/map/mapPageTone.test.ts       (nuovo: la mappa nei due toni)
apps/mobile/src/i18n/{de,es,fr,it}.ts         (i testi di «Tone», dopo #438)
docs/tasks/TASK-263.md
docs/DECISIONS.md
docs/UI.md                                    (solo «Il tema»)
docs/STATUS.md
```

## Fuori scope

- **Le tastiere** (`keyboardAppearance="dark"` in una decina di file di
  altri task): nel tono chiaro restano scure. Una parte B, quando quei file
  sono liberi.
- **Il logo bianco «Compatible with Strava»** (TASK-218): sul fondo chiaro
  serve la versione scura del pacchetto di Strava, da scaricare con il sì
  dell'utente. Parte B.
- Seguire il tono del telefono (chiaro di giorno, scuro di notte): non
  chiesto.
- La luminosità dello schermo: scartata dall'utente.
- Il tipo di mappa (satellite, 3D): TASK-264.

## Esito

_(a fine task)_
