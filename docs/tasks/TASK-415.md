# TASK-415 — Ski touring: lo scialpinismo «Record only»

**Stato**: In corso — parte 0 in `main` (#932), parte A in `main` (#948) e sul server, parte B in `main` (#1160) e nella preview.
**Fase**: 4 · **Branch**: `docs/TASK-415-0-skimo` (parte 0), poi
`feat/TASK-415-a-ski-touring-api`, `feat/TASK-415-b-…` ·
**ADR**: ADR-0344 · numeri dal Coordinatore · sessione dello sport,
avviata dal «Coordinatore Sport»

## Obiettivo

Chi va in scialpinismo registra la gita in MuW e ne riceve i numeri che
contano: le fasi (salita, cambio pelli, discesa) con l'ora di ogni cambio,
la VAM, la traccia colorata per pendenza del terreno con il tempo sopra i
30°, la vetta raggiunta col suo nome e una collezione delle vette. Nessuna
forma: è uno sport «Record only» (TASK-375, ADR-0319).

## Contesto

Il Coordinatore Sport, 2026-11-07: tre sport nuovi in parallelo (ciaspole,
carrozzina/passeggino, scialpinismo), con la parte 0 di sola
documentazione. L'utente, lo stesso giorno:

- «OK SÌ»: lo scialpinismo è «Record only», tiene i dati importanti ed è
  innovativo;
- «Le prime 4 (a–d)»: (a) fasi automatiche, (b) VAM, (c) pendenza dal
  modello Terrarium col tempo sopra i 30°, solo informativa, (d) la vetta da
  OSM `natural=peak` e la collezione;
- fuori, per ora: il video 3D, l'efficienza per battito, l'«Everest» della
  stagione, le condizioni della neve, il timer del rientro.

Da leggere: `docs/sports/skimo.md` (il disegno e i costi),
`docs/sports/CONDIVISO.md`, `docs/sports/COME-AGGIUNGERE.md`,
`tasks/TASK-375.md` (la categoria, le salite e gli impianti, i nomi dal
server), ADR-0300 (le quote dalle tegole, parte G di TASK-347),
`tasks/TASK-410.md` (`run_stats`, i numeri del post).

## Scelte dell'utente (2026-11-07, una alla volta)

1. **Nome ed emoji**: «Ski touring» 🏔️ — it Scialpinismo · de Skitour ·
   fr Ski de randonnée · es Esquí de travesía. (Proposta accettata.)
2. **Le metriche**: «Sì, così».
   - A fine gita: in grande il D+; sotto D−, tempo in salita, tempo in
     discesa, VAM media della salita (m/h), quota massima, km totali e
     tempo totale; poi l'elenco delle fasi (salita, cambio pelli, discesa)
     con ora e durata di ogni cambio, e la VAM di ogni salita.
   - Durante la gita: VAM degli ultimi 5 minuti, D+ fin qui, fase attuale,
     quota e tempo.
   - Tempo sopra i 30° e vetta stanno nel post, calcolati dal server.
   - Niente calorie sulla neve (come TASK-375).
3. **L'avviso sulla pendenza**: «Bozza approvata».

   | Dove | Testo |
   |---|---|
   | Avviso, en | «Slope from a terrain model (about 30 m): information only. It is not an avalanche bulletin and does not tell you whether a slope is safe.» |
   | it | «Pendenza da un modello del terreno (circa 30 m): solo un'informazione. Non è un bollettino valanghe e non dice se un pendio è sicuro.» |
   | de | «Hangneigung aus einem Geländemodell (etwa 30 m): nur zur Information. Sie ist kein Lawinenlagebericht und sagt nicht, ob ein Hang sicher ist.» |
   | fr | «Pente tirée d'un modèle de terrain (environ 30 m) : à titre d'information. Ce n'est pas un bulletin d'avalanches et cela ne dit pas si une pente est sûre.» |
   | es | «Pendiente de un modelo del terreno (unos 30 m): solo información. No es un boletín de aludes y no indica si una ladera es segura.» |
   | Legenda | «Slope» · Pendenza · Hangneigung · Pente · Pendiente — «<30° · 30–35° · 35–40° · >40°», uguale in tutte le lingue |
   | Casella | «Above 30°» · Sopra 30° · Über 30° · Au-dessus de 30° · Más de 30° |

4. **La collezione delle vette**: «Profilo, come i post». Una riga
   «Summits» nel profilo («12 summits») che apre l'elenco con nome, quota,
   data della prima salita e quante volte; la vede chi può vedere i post
   della persona. Nel post della gita, la vetta raggiunta col suo nome.
   I testi della riga e della pagina si fanno approvare con la parte D.
5. **Quando si accende**: «Acceso con a e b». «Soon» nelle impostazioni
   finché non ci sono fasi e VAM (solo telefono); acceso appena pronti, con
   un OTA col sì dell'utente. Pendenza (c) e vette (d) arrivano dopo nel
   post, quando il server ha tegole e vette (comandi col sì dell'utente).

## Decisioni dell'agente (su delega dell'utente)

- L'attività si chiama `ski_touring` (Strava `BackcountrySki`, `<type>` del
  GPX `ski_touring`). Apple Salute `.crossCountrySkiing` (60), Health
  Connect `EXERCISE_TYPE_SKIING` (61): non c'è un tipo per lo scialpinismo;
  i numeri si verificano sulle librerie in A.
- Fuori dal gioco e senza record personali, come lo sci.
- I moduli sono generici, non dello scialpinismo: `mountainPhases.ts`,
  `terrain.py`, `summits.py`. Le ciaspole e Hike possono usarli.
- Il resto del disegno tecnico: `docs/sports/skimo.md` e ADR-0344.
- Parte B (2026-11-11): lo sport in «Settings» si chiama `skimo` (gli id
  di «Settings» sono corti, come `xc_ski`); si salva come `ski_touring`.
  Il D+ della fine gita e del pannello conta solo le salite (le risalite
  in impianto no); il D− solo le discese. Il tempo «in movimento» delle
  fasi e della VAM lascia fuori i passi sotto 0,2 m/s (`MOVING_MIN_MPS`):
  la soglia di 0,5 m/s vale solo per i cambi. Il pannello dice «Cambio
  pelli» quando la gita è ferma da 90 s (o in pausa) vicino alla quota
  della svolta: una sosta lunga a metà salita può sembrarlo, da tarare in
  E. Il pannello sta sopra la scheda della corsa (`FreeRunScreen.tsx`,
  come `DayResort` per lo sci): `RunDashboard.tsx` non cambia.

## Le parti

| Parte | Cosa | Server, testi, OTA |
|---|---|---|
| 0 | Questo: disegno, costi, scelte | — |
| A | Contratto, API, migrazione del CHECK, profilo nascosto nell'app | server col sì dell'utente |
| B | App: fasi e VAM (a, b), la fine gita, il pannello in gita, la riga in «Settings»; acceso con l'OTA | testi e OTA col sì |
| B2 | I numeri e le fasi nel post, in `run_stats` | dopo TASK-410 C e D |
| C | La pendenza: `terrain.py` (condiviso con TASK-347 G), il lavoro dopo il salvataggio, il layer colorato e l'avviso | server col sì |
| D | Le vette: `peak_extract.py`, `summits.py`, `run_summits`, le rotte, il profilo | server, privacy e testi col sì |
| E | La prova sulla neve: soglie delle fasi e della VAM, batteria al freddo | — |

A prima; B dopo A; B2 dopo B e TASK-410 C/D; C dopo A e TASK-410 C; D dopo
A, indipendente da B e C; E con la neve.

## Criteri di accettazione

Parte 0:
- [x] Le quattro funzioni hanno disegno, strato, migrazione, nativo,
  riuso, rischi e costo (`docs/sports/skimo.md`).
- [x] Le cinque domande hanno una risposta scritta qui.
- [x] ADR-0344 «proposto», una riga in INDEX, righe proprie in STATUS.
- [x] Le voci per `CONDIVISO.md` (pendenza da Terrarium, fasi, vette) sono
  mandate al Coordinatore Sport, che lo tiene.
- [x] La lista della parte A è approvata dal Coordinatore (2026-11-08).

Ogni parte dopo: test deterministici; l'impronta del motore e quella iOS
non cambiano; nessuna dipendenza nuova.

## File toccati

Parte 0:

```
docs/tasks/TASK-415.md      (nuovo)
docs/sports/skimo.md        (nuovo)
docs/DECISIONS.md           (solo ADR-0344, in fondo)
docs/STATUS.md              (righe proprie)
docs/INDEX.md               (una riga)
```

Parte A (`feat/TASK-415-a-ski-touring-api`), proposta al Coordinatore,
sulla ricetta (`COME-AGGIUNGERE.md` §2–4) per uno sport «Record only»:

```
packages/shared-types/src/sports/ski_touring.ts        (nuovo)
packages/shared-types/src/sports/index.ts              (RECORDED_SPORTS)
packages/shared-types/fixtures/run-activities.json, reads.json
packages/shared-types/test/skiTouring.test.ts          (nuovo)
packages/shared-types/test/sportRegistry.test.ts       (lista «da allora»)
services/api/shaperoute_api/sports/ski_touring.py      (nuovo)
services/api/shaperoute_api/sports/__init__.py
services/api/shaperoute_api/activities.py              (RunActivity)
services/api/shaperoute_api/reads.py                   (NEWER_ACTIVITIES)
services/api/migrations/0057_ski_touring.sql           (nuovo; 0056 in bozza, 0057 dopo TASK-406 D1)
services/api/tests/test_ski_touring_api.py             (nuovo)
services/api/tests/test_sport_registry_api.py, test_record_only.py,
    test_reads.py, test_game_rules.py                  (solo se l'ordine lo chiede)
apps/mobile/src/sports/ski_touring.ts                  (nuovo, nascosto)
apps/mobile/src/sports/index.ts
apps/mobile/src/sports/sportProfiles.test.ts, activityName.test.ts,
    src/api/accounts.test.ts
apps/mobile/targets/watch/Core/Sources/WatchCore/Resources/sports.json,
    targets/watch/{de,en,es,fr,it}.lproj/Localizable.strings
                                                       (se l'orologio elenca gli sport, come per il Roller)
apps/mobile/assets/engine/engine.zip                   (i moduli sports/ dell'API vanno sul telefono)
apps/mobile/src/social/PublicParts.tsx, src/settings/snowSport.test.ts
                                                       (aggiunti dal Coordinatore il 2026-11-08:
                                                        `NOT_YET_ON_SNOW`, che la parte B toglie)
docs/tasks/TASK-415.md, docs/STATUS.md, docs/DECISIONS.md, docs/API.md,
    docs/DATABASE.md
```

Niente motore, niente `contract.json` (il contratto dei percorsi tiene solo
le attività che si disegnano, come per lo sci). Impronta del motore neutra,
impronta iOS invariata.

Parti B–D: la lista si manda al Coordinatore prima di ciascuna.

Parte B (`feat/TASK-415-b-skimo-phases`), mandata al Coordinatore il
2026-11-11:

```
apps/mobile/src/activities/mountainPhases.ts, .test.ts     (nuovi)
apps/mobile/src/screens/SkiTourFinishCard.tsx, .test.tsx   (nuovi: la fine gita, e i test del pannello)
apps/mobile/src/screens/SkiTourLive.tsx                    (nuovo: il pannello in gita)
apps/mobile/src/activities/snowDay.ts                      (export di legs, isLift, droppedM; turnM facoltativo)
apps/mobile/src/screens/FreeRunScreen.tsx                  (i due rami dello scialpinismo)
apps/mobile/src/settings/sport.ts                          ("skimo", pronto)
apps/mobile/src/screens/RunNoRouteButton.tsx               (🏔️)
apps/mobile/src/sports/ski_touring.ts                      (nome con tLater)
apps/mobile/src/social/PublicParts.tsx                     (via NOT_YET_ON_SNOW)
apps/mobile/src/i18n/{it,de,fr,es}.ts                      (testi approvati dall'utente il 2026-11-11)
apps/mobile/targets/watch/{de,es,fr,it}.lproj/Localizable.strings
                                                           (rigenerati da scripts/watch-texts.sh: solo il nome)
apps/mobile/src/settings/{sport,snowSport,sportRows}.test.ts,
    {SportButton,SportSetting,SportStoreBuild,SportVoiceItalian}.test.tsx,
    src/social/snowChips.test.tsx                          (le liste «di prima»)
docs/tasks/TASK-415.md
```

## Dove si è

2026-11-07: le cinque scelte dell'utente prese. 2026-11-08: parte 0 in PR,
la lista della parte A approvata dal
Coordinatore, migrazione 0056 in bozza (anche TASK-406 D1 ha la 0056: chi
arriva secondo rinomina). La PR di A entra col sì dell'utente per il
server, che chiede il Coordinatore.

2026-11-08, parte A in PR (`feat/TASK-415-a-ski-touring-api`): la 0056 era
libera in `main` all'apertura; la #935 di TASK-406 D1 è entrata prima con
la sua 0056, e la nostra è diventata `0057_ski_touring.sql` (Coordinatore).
Contratto, API, migrazione del solo CHECK di `runs`, profilo nascosto e
orologio come da lista. I test col database
(migrazione, salvataggio, record) girano in CI: sul Mac Docker era spento.
Il modulo per pubblicare una giornata sulla neve non offre lo scialpinismo
finché c'è `NOT_YET_ON_SNOW` in `PublicParts.tsx`. Restano per B: toglierlo,
il nome con `tLater` e i testi dell'orologio nelle quattro
lingue (`scripts/watch-texts.sh`), la riga in `settings/sport.ts`, fasi e
VAM.

2026-11-08, parte A in `main` (#948, merge 8e898de5) e sul server, col sì
dell'utente («Sì, ok server», al Coordinatore): copia
`shaperoute-2026-11-08T1718Z.dump`, immagine di ritorno
`shaperoute-api:before-task415`, checkout 8e898de5, `up -d --build`,
migrazioni in cima `0057_ski_touring` e `0056_ski_days`,
`runs_activity_check` con `'ski_touring'`, `/health` ok. Prossimo: la lista
della parte B al Coordinatore.

2026-11-11, parte B: lista al Coordinatore; i testi nuovi nelle cinque
lingue approvati dall'utente («Approvo così»; sull'orologio solo il
nome). Fasi, cambi e VAM in `activities/mountainPhases.ts`, fine gita
`SkiTourFinishCard.tsx`, pannello `SkiTourLive.tsx`, riga «Ski touring»
pronta in «Settings». Impronta del motore uguale a `main`
(`427ed1a16a97 8ab61d8e87f9`), impronta iOS su una copia pulita
`6f8bba4cf1b6f95fc3c1c84ba9812d950a2232a1`, come `main` e la produzione. Lo sport si accende col primo OTA di
produzione dopo il merge: quell'OTA vuole il sì dell'utente anche per lo
scialpinismo.

Gli screenshot dal simulatore (pannello in gita e fine gita, due caselle
per riga) visti dall'utente il 2026-11-11: «Sì, va bene».

2026-11-11, parte B in `main`: #1160, merge `c378cd69` (Coordinatore),
precisazione B di ADR-0344. **Preview**: pubblicata dal Coordinatore da
`main` `a9ade90c`, gruppo `149b3411-1be6-4dfb-b4dc-b0abbbde94ee` (iOS
`01a1cca3-f6f3-7b5e-90b0-063bf210516f`, Android
`01a1cca3-f6f3-7567-a35a-0daf8e792f5b`): lo scialpinismo è acceso lì.
**Produzione**: no per ora. L'utente ha deciso col Coordinatore di non far
uscire aggiornamenti per due giorni, poi un'uscita completa; il suo «sì
pubblica» valeva per la preview. Restano:
- l'OTA di produzione con l'uscita completa (Coordinatore, col sì
  dell'utente): accende lo sport;
- la prova sul telefono: una gita registrata, la fine gita, il pannello;
- sull'orologio della 1.1 (build 14) lo scialpinismo c'è già
  (`sports.json`, `onWatch`); il nome tradotto arriva con la prossima build
  dell'orologio;
- dopo: B2 (numeri e fasi nel post, `run_stats`), C (pendenza), D (vette),
  E (taratura sulla neve).
