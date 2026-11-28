# TASK-510 — Emoji al posto delle icone, secondo giro

**Stato**: In lavorazione · parte 0 chiusa il 2026-11-28 (scelte
dell'utente fatte, foglio dei segni approvato); codice dopo il via del
Coordinatore sui file
**Fase**: 5 · **Branch**: `docs/TASK-510-part-0` (questo file), poi una PR
`feat/TASK-510-…` per zona
**ADR**: nessuno, come la TASK-444 di cui è il secondo giro (la 444 non ha
ADR: le scelte stanno nel task file) · numero di task dal «Coordinatore
(fork 3)» (punto U6 di `out/prova-app-2026-11-23/PROPOSTE.md`)

## Obiettivo

Nella prova nel simulatore del 23 novembre 2026 (schermate s09, s13–s15,
s17, s20, s32) l'app mescolava ancora emoji a colori e icone a linea: la
TASK-444 aveva cambiato Feed, «Guide» e avvisi, ma restavano emoji nel menu
degli sport, nei pulsanti gialli, in «New plan», «Gym calendar», «Find an
exercise», nelle caselle del profilo, sul lucchetto dei badge e in tutte le
righe delle Impostazioni; Escursione e Scialpinismo avevano la stessa
montagna, Ciaspole un fiocco di neve. Alla fine: un solo modo di disegnare
un segno d'interfaccia, a linea e coi colori dei token, come deciso nella
TASK-444.

Solo app (`apps/mobile`): JavaScript e PNG serviti da Metro. Nessuna
dipendenza nuova, niente codice nativo (impronta iOS `5e1b5ce5`).

## Cosa era ancora vero il 28 novembre 2026 (`origin/main` feaa5bc6)

Censimento completo, file per file, in `out/TASK-510/PARTE-0.md` (268 righe
con un'emoji in ~130 file, test esclusi; checkout principale). Le zone:

| Zona | Dove | Emoji |
|---|---|---|
| A · segni degli sport | campo `emoji` di `sports/*.ts`; usato da `settings/SportMenu.tsx`, `SportButton.tsx`, `screens/RunNoRouteButton.tsx` (`withoutRouteIcon`: pulsanti gialli di Training e Ski), `activities/ActivityCalendar.tsx`, `gym/SportsDoor.tsx`, caselle `GymTile`/`PoolTile`, righe «🏋️ Gym» e «🏊 Pool swim», avvisi di nuoto, neve e pagaia | 18 sport |
| B · palestra | `trainingmode/TrainingWorkoutsPage.tsx`, `gym/GymDrawGuide.tsx` | 📋 📅 🔍 |
| C · profilo | `profile/ProfileHome.tsx` (caselle), `profile/PhotoRow.tsx` | ❤️ 🏃‍♂️ ⚙️ 📷 |
| D · badge | `profile/BadgesSection.tsx` (badge da prendere) | 🔒 |
| E · meteo | `ski/ResortWeather.tsx`, `feed/PostWeather.tsx`, `feed/postSections.ts` | ☀️ ⛅ 🌧 ❄️ … |
| F · gruppi e attrezzatura | `groups/groupText.ts`, `ExploreGroups.tsx`, `GroupForm.tsx`; `gear/gearKinds.ts` e i suoi punti d'uso | sport e 25 tipi |
| G · Impostazioni | una ventina di righe: `settings/*Setting.tsx`, `social/BlockedPeople.tsx`, `engine/OfflineMapsSetting.tsx`, `stretch/MorningStretchSetting.tsx`, `gear/GearSetting.tsx`, `about/AboutRows.tsx`, `messages/MessagesRow.tsx` | 📱 ✉️ 🚫 🌐 … |

`profile/SettingsPage.tsx` non ha emoji: le righe stanno nei loro file.

## Scelte dell'utente (2026-11-28, una domanda alla volta)

1. **Segni degli sport: «Lucide + 7 disegnati».** Undici sport con
   un'icona di Lucide (Camminata `footprints`, Corsa `sport-shoe`,
   Escursione `backpack`, Bici `bike`, Carrozzina `accessibility`, Pagaia
   `kayak`, Nuoto `waves-horizontal`, piscina `waves-ladder`, Scialpinismo
   `mountain-snow`, Alpinismo `pickaxe`, Palestra `dumbbell`, Stretching
   `person-standing`); Gravel, MTB, Roller, Sci, Sci di fondo, Ciaspole e
   Parapendio disegnati per MuW nello stesso stile (griglia 24, tratto 2,
   punte tonde). Escursione e Scialpinismo non hanno più la stessa
   montagna; le Ciaspole hanno due racchette. Proposte anche: sport
   ancora a emoji (solo l'interfaccia a linea), solo Lucide senza disegni.
2. **Badge: «Premi a colori, lucchetto a linea».** I badge guadagnati, la
   coppa del concorso e gli animali dei livelli della palestra restano
   emoji: sono premi. Il lucchetto dei badge da prendere diventa `lock`,
   in `textMuted`. Proposte anche: tutto a linea, niente cambia.
3. **Impostazioni: «Icona a linea per riga».** Ogni riga tiene un segno,
   di Lucide e in `textMuted`, dopo il restyle di «Settings» (TASK-523 C).
   Proposta anche: nessuna icona.
4. **Cosa resta fuori: meteo, gruppi e attrezzatura entrano.** Su
   proposta di lasciarli fuori, l'utente ha scelto «Aggiungi anche il
   meteo», poi chiarito «Meteo + gruppi e attrezzatura». Restano emoji:
   reazioni, adesivi, emoji e animali del video (contenuti scelti dalle
   persone), anteprime dei messaggi («📷 Photo», che vanno anche nelle
   notifiche), l'Apple Watch, «Nutrition» (TASK-489) e il volo (TASK-479).
   Restano anche i segni tipografici (✓ ✕ ♥ ▶ ⚑ ⚠).
5. **Foglio dei segni: «Sì, vanno bene».** I 78 segni di
   `out/TASK-510/foglio.html`, nei colori dell'app in scuro, approvati
   prima del codice. SVG in `out/TASK-510/icons/` (`lucide/` da
   lucide-static 1.83.0, ISC; `muw/` i sette disegnati).

## Come (deciso dall'agente su delega dell'utente)

- I segni sono PNG bianchi in `assets/ui/icons/` colorati da `tintColor`
  coi token, come nella TASK-444 (`out/TASK-444/tools/icon.swift`): niente
  `react-native-svg`. I sette disegnati portano il nome del file SVG.
- Un modulo nuovo, `sports/sportIcons.ts`, dà il segno di ogni sport, e
  un componente nuovo lo disegna con la label di accessibilità del nome
  dello sport; il campo `emoji` dei profili resta per il testo puro (Apple
  Watch, anteprime, notifiche).
- Nessun significato affidato al solo colore: ogni segno ha accanto il suo
  nome, o la label per VoiceOver dove sta da solo.

## Parti

Una PR per zona, in quest'ordine; la lista dei file di ciascuna va al
Coordinatore prima del codice.

- **A — segni degli sport** (zona A).
- **B — palestra, profilo, lucchetto** (zone B, C, D).
- **C — meteo** (zona E).
- **D — gruppi e attrezzatura** (zona F).
- **E — righe delle Impostazioni** (zona G), dopo TASK-523 C.

## Criteri di accettazione

- [ ] Nessuna emoji a colori nelle zone A–G, fuori da quelle che la scelta
      4 tiene.
- [ ] I 18 sport hanno segni diversi tra loro; ogni segno ha il nome
      accanto o una label di accessibilità.
- [ ] Colori solo dai token; scuro e chiaro guardati nel simulatore.
- [ ] Impronta iOS invariata (`5e1b5ce5`), nessuna dipendenza nuova.
- [ ] Test dei file toccati verdi, CI verde.
- [ ] Schermate prima e dopo dal simulatore (turno del Coordinatore)
      approvate dall'utente.

## Dopo

- **OTA**: del Coordinatore, col sì dell'utente.
- **Uno sguardo sul telefono**: menu degli sport, profilo, Impostazioni.
