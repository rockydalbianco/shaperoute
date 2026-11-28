# TASK-512 — Il menu degli sport più fitto, una riga sola in «Settings»

**Stato**: Done · 2026-11-28 · #1729 (A) (documenti: #1730) · esito: il
pannello degli sport ha tre caselle per riga con le famiglie e «Settings»
una riga sola che lo apre; schermate dal simulatore approvate dall'utente.
Restano l'OTA sulla 1.2.0 e lo sguardo sul telefono.
**Fase**: 5 · **Branch**: `docs/TASK-512-part-0` (questo file), poi
`feat/TASK-512-sport-menu`
**ADR**: ADR-0420 · numero di task e di ADR dal «Coordinatore (fork 3)»
(punto U10 di `out/prova-app-2026-11-23/PROPOSTE.md`)

## Obiettivo

Nella prova nel simulatore del 23 novembre 2026 (schermate s14–s16, s32):
il pannello degli sport ha caselle grandi, sei o sette per schermata, e per
arrivare a «Palestra» servono due scorrimenti; le Impostazioni ripetono
tutta la lista, una riga per sport, e spingono in fondo il resto. Alla fine
gli sport si vedono quasi tutti insieme e la sezione «Sport» di «Settings»
è una riga.

## Cosa era ancora vero il 27 novembre 2026 (`origin/main` f008241d)

| Punto | Stato | Dove |
|---|---|---|
| Pannello degli sport | vero: 18 sport, tutti pronti, cinque famiglie; caselle due per riga, ~150×117 pt su 375 pt, nove righe; Sci e Palestra con una riga in più | `settings/SportButton.tsx`, `settings/sportFamilies.ts` |
| Ultimi usati | non esistono: il telefono tiene solo lo sport scelto | `settings/sport.ts` (`saveSport`) |
| «Sport» in «Settings» | vero: 18 righe subito dopo ACCOUNT | `settings/SportSetting.tsx`, `profile/SettingsPage.tsx` |

`gym/SportsDoor.tsx` (TASK-506 D) è la porta di «Nuovo piano» della
Palestra, non questo menu: non si tocca.

## Scelte dell'utente (2026-11-27, una domanda alla volta)

1. **Il pannello: «3 per riga, famiglie».** Caselle piccole (emoji e nome,
   ~105×84 pt su 390 pt), tre per riga, i titoli delle famiglie restano. La
   riga «Turns MuW into your ski/training app» esce dalla casella e resta
   solo per VoiceOver. Sette righe al posto di nove (nel simulatore se ne
   vedono 15 su 18, «Gym» con uno scorrimento corto). Proposte anche: quattro per riga senza
   famiglie, una lista compatta.
2. **Ultimi usati: «No, niente recenti».** Nessuna riga in più, nessuna
   cronologia salvata. Proposta era: tre, lo sport attuale escluso.
3. **«Settings»: «Una riga che apre il menu».** «🏃‍♂️ Sport · Run ›» nello
   stesso posto (dopo ACCOUNT); un tocco apre lo stesso pannello
   dell'intestazione. Proposte anche: una pagina a parte, togliere la
   sezione.

Nessun testo nuovo: la riga usa «Sport, {sport}», «Changes the sport» e
«Sport», già tradotti.

## Parti

- **A — il pannello e la riga** (`feat/TASK-512-sport-menu`, #1729): un
  pannello solo, `settings/SportMenu.tsx`, aperto dal pulsante
  dell'intestazione e dalla riga di «Settings». Solo app: niente motore,
  niente server, impronta iOS invariata.
  File: `apps/mobile/src/settings/SportMenu.tsx` (nuovo),
  `SportMenu.test.tsx` (nuovo), `SportButton.tsx`, `SportSetting.tsx`, i
  test `SportButton.test.tsx`, `SportButtonGrid.test.tsx`,
  `SportSetting.test.tsx`, `SportStoreBuild.test.tsx`,
  `SportVoiceItalian.test.tsx`, `profile/SettingsPage.test.tsx`.
  Non toccati: `SettingsPage.tsx`, `sport.ts`, `sportFamilies.ts`,
  `nutrition/NutritionTile.tsx` (di TASK-489: riceve la larghezza nuova dal
  suo `size`; spento).

## Criteri di accettazione

- [x] Il pannello ha tre caselle per riga, le famiglie coi titoli: sette
      righe al posto di nove. Coi titoli non stanno tutte in una schermata:
      nel simulatore (iPhone 17, 402×874) 15 sport su 18, il resto con uno
      scorrimento corto (prima: 7, e «Gym» dopo due scorrimenti).
- [x] Sci e Palestra non scrivono la riga del modo nella casella; VoiceOver
      la sente come hint.
- [x] «Settings» ha una riga «Sport» con lo sport scelto; toccata apre lo
      stesso pannello; scegliere salva, chiude e aggiorna la riga.
- [x] Nessuna riga «ultimi usati».
- [x] Test dei file toccati verdi, CI verde.
- [x] Schermate dal simulatore (turno del Coordinatore, 2026-11-28)
      approvate dall'utente prima del merge («Sì, vanno bene»).

## Dopo

- **OTA sulla 1.2.0**: del Coordinatore, col sì dell'utente.
- **Uno sguardo sul telefono**: il pannello dall'intestazione e la riga di
  «Settings».
- Da segnalare a TASK-489: la casella «Nutrition» (spenta) prende la
  larghezza nuova, ma emoji e scritte interne restano più grandi delle
  altre caselle; il suo aspetto è di 489.
