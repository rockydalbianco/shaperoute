# TASK-182 — Le unità di misura: km o miglia

**Stato**: Todo
**Fase**: 4 · **Branch**: `feat/TASK-182-units` (parte A)

## Obiettivo

Chiesto dall'utente il 2026-10-02 fra le voci di «Settings» («Units»,
oggi con «Soon») e di nuovo il 2026-10-03: «ora fai il cambio unità di
misura». Alla fine, in «Settings» si sceglie fra chilometri e miglia, e
l'app mostra e dice le distanze e il passo in quella unità, subito.

## Scelte dell'utente (2026-10-03)

- **L'unità di partenza è quella del telefono**: un iPhone impostato con
  le miglia (Stati Uniti, Regno Unito) parte in miglia, gli altri in km.
  In «Settings» la riga «Units» offre «Phone units», «Kilometres»,
  «Miles», come la lingua (TASK-210, ADR-0172).
- **Con le miglia** (proposta accettata dall'utente, come fa Strava): le
  distanze in mi, il passo in min/mi, la voce a ogni miglio invece che a
  ogni km, le distanze brevi (le svolte, «In 50 metres») in piedi.

## Numeri e incroci

- **TASK-182 e ADR-0149** sono quelli tenuti in `STATUS.md`
  («Prossimo passo», le voci di «Settings»); il coordinatore li conferma
  prima che il task parta.
- **A pezzi, come TASK-210**: tocca file tenuti da altri lavori in corso
  al 2026-10-03: TASK-191 C (#255: `src/route/`, la distanza di «Draw»,
  `explore/`, `sport.ts`), TASK-208 (`RunEnd.tsx`, `PublicParts.tsx`,
  `PublicRow.tsx`), TASK-209 (la voce, i file delle frasi, la pagina
  «Data» della corsa). La **parte A** prende solo il modulo nuovo e i file
  liberi; le parti successive gli altri, dopo i loro merge. L'elenco dei
  file liberi lo dà il coordinatore al via.
- **Con TASK-210**: i testi nuovi passano da `t()` con le quattro tabelle
  (`src/i18n/`, `tables.test.ts`); i numeri con `decimal()`.
- **Con TASK-209**: la voce dice le distanze nell'unità scelta; le frasi
  dette sono di TASK-209, l'unità la legge da `src/units/`.

## Contesto da leggere

- `docs/UI.md`, «Settings» (la riga «Units» con «Soon», la riga
  «Language» come esempio), «Forma e distanza», «La navigazione», «La
  fine della corsa», «Correre senza percorso».
- ADR-0172 (come TASK-210 ha fatto la lingua: la scelta in un file nei
  documenti, la partenza dal telefono, `useLanguage()` alla radice).
- `src/i18n/language.ts` e `src/settings/LanguageSetting.tsx` (lo stesso
  schema per le unità); `src/route/distance.ts` (`DISTANCE_STEP_KM`,
  `stepDistance`, `toDistanceM`) e `DISTANCE_LIMITS_M` in
  `packages/shared-types` (corsa fino a 21 km, bici 10–30 km, canoa
  1–5 km); `src/navigation/freeRun.ts` (`kmLabel`, `paceLabel`).

## Cosa fare

**Parte A**:

1. `src/units/`: `Units = "km" | "mi"`, la scelta in un file nei
   documenti («Phone units» lo cancella), le unità del telefono senza
   dipendenze nuove (su iOS `Settings` di React Native, le chiavi del
   sistema di misura; nei test niente, quindi km), `useUnits()`, e i
   formattatori con i test: distanza (`5.2 km` / `3.2 mi`), passo
   (`4:44 /km` / `7:37 /mi`), distanza breve (metri / piedi).
2. La riga «Units» in «Settings», sotto «Preferences» dopo «Language»,
   al posto di quella con «Soon»: stesso aspetto e stesso comportamento
   della lingua.
3. Le unità nei file liberi: «My activities», i preferiti, il feed, i
   disegni, il profilo; testi nuovi in `t()`.
4. Il motore e l'API restano in metri: l'app converte solo per mostrare e
   per leggere quello che si scrive.
5. ADR-0149, `UI.md`, `STATUS.md`.

**Parti successive** (dopo i merge di chi tiene i file): la distanza di
«Draw» in miglia (passo e limiti in miglia, sempre dentro
`DISTANCE_LIMITS_M`; proposta: passi da 1 mi, la scelta va fatta qui e
scritta nell'ADR), le schermate della corsa e la fine corsa, «Explore»,
la voce (a ogni miglio, le svolte in piedi, con TASK-209), il GPX resta
in metri.

## Criteri di accettazione

Parte A:

- [ ] In «Settings» si sceglie fra «Phone units», «Kilometres» e
      «Miles»; la scelta vale subito e resta dopo un riavvio (test).
- [ ] Senza scelta, un telefono con le miglia mostra miglia, gli altri
      km; nei test sempre km (test).
- [ ] I formattatori danno distanza, passo e distanza breve giusti in km e
      in miglia, con la virgola nelle lingue che la usano (test).
- [ ] Con «Kilometres» l'app è byte per byte quella di prima: i test
      esistenti passano.
- [ ] I testi nuovi sono in `t()` con le quattro tabelle.
- [ ] Nessuna dipendenza nuova.
- [ ] Provato nel simulatore con il telefono in miglia.

## File toccati

```
(li fissa la sessione che prende il task, con l'elenco dei file liberi
dal coordinatore)
```

## Fuori scope

- Le altezze e le temperature (l'app non le mostra).
- Il motore, l'API, il GPX e il database: restano in metri.
- Le yarde: le distanze brevi in miglia si dicono in piedi.

## Esito

*(a fine task)*
