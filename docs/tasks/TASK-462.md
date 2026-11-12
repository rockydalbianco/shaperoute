# TASK-462 — Il calendario di tutte le attività, con lo storico dei tempi

**Stato**: Done — A #1162, B #1172 in `main` (2026-11-12)
**Fase**: 5 · **Branch**: `feat/TASK-462-a-activity-calendar-api` (A),
`feat/TASK-462-b-activity-calendar-app` (B) ·
**ADR**: ADR-0372 (`GET /me/activity-calendar`)

## Obiettivo

Nel profilo e in «My activities» un calendario di tutte le attività fatte,
di ogni sport (corsa, bici, nuoto, palestra, sci, escursione…), con lo
storico dei tempi mese per mese. Richiesta dell'utente del 2026-11-11: «fai
un calendario dove vedi tutte le attività fatte nel profilo con lo storico
tempi... anche alpinismo nuoto tutti gli sport possibili...».

## Scelte dell'utente (2026-11-11, una domanda alla volta, dopo l'anteprima)

1. **Dove**: in tutti e due i posti. Nel profilo, sotto i totali, la
   striscia della settimana e «Calendario ›» che apre il mese; lo stesso
   calendario in «My activities».
2. **Un giorno**: nella griglia del mese solo le icone degli sport fatti;
   toccando il giorno, ogni attività con ora, km, tempo, passo e kcal.
3. **Storico tempi**: l'andamento mese per mese, cioè barre degli ultimi 12
   mesi (tempo, km, numero) per lo sport del filtro o per tutti, e sotto i
   record personali che il profilo ha già (nessun calcolo nuovo dei
   migliori tempi).
4. **Alpinismo**: sì, come sport registrato senza percorso. **Non** sta in
   questa task (Coordinatore, 2026-11-11): è uno sport del registro
   (TASK-376) con migrazione propria e numero a parte.

## Parti

- **A — server** (questa PR): `GET /me/activity-calendar?tz=&month=&sport=`,
  sola lettura da `runs` e `run_stats` sul modello del calendario della
  palestra (`gym_calendar.py`), nessuna migrazione. Poi il passo sul
  server, che fa il Coordinatore col sì dell'utente.
- **B — app**, dopo A in main e sul server: il calendario, la striscia
  della settimana nel profilo, il foglio del giorno, le barre dei 12 mesi.
  Il Coordinatore stabilisce l'ordine con TASK-457 (profilo) e TASK-456
  («My activities»).

## Criteri di accettazione (parte A)

- [x] Un mese sul fuso del telefono con i giorni delle attività di ogni
      sport che l'app legge, ognuna con sport, inizio, metri, tempo e kcal
      (`null` senza statistiche).
- [x] `sport` filtra giorni, somme e `trend`; `sports` elenca sempre tutti
      gli sport del proprietario, il più frequente prima.
- [x] `trend` ha 12 mesi fino a quello chiesto, anche vuoti.
- [x] Solo il proprietario; solo ciò che `X-MuW-Reads` dice; `422` per un
      fuso, un mese o uno sport sconosciuti.
- [x] L'esempio `fixtures/activity-calendar.json` è controllato dall'API e
      da `shared-types`.

## File toccati (parte A)

```
services/api/shaperoute_api/activity_calendar.py   (nuovo)
services/api/shaperoute_api/app.py
services/api/tests/test_activity_calendar.py       (nuovo)
packages/shared-types/src/activityCalendar.ts      (nuovo)
packages/shared-types/src/index.ts
packages/shared-types/fixtures/activity-calendar.json (nuovo)
packages/shared-types/test/activityCalendar.test.ts (nuovo)
docs/API.md
docs/tasks/TASK-462.md                             (nuovo)
```

## Criteri di accettazione (parte B)

- [x] Nel profilo, sotto i totali, la settimana da lunedì con le icone degli
      sport fatti e i suoi totali; un tocco apre il calendario. Un'API
      senza calendario lascia il profilo com'era.
- [x] In «My activities», sopra la lista, «📅 Calendar» apre lo stesso
      calendario.
- [x] Nel mese solo le icone; un giorno toccato elenca ogni attività con
      ora, km, tempo, passo e kcal; una apre la sua corsa come in «My
      activities» (una nuotata in piscina no).
- [x] Il filtro per sport (gli sport dell'account), le barre dei 12 mesi
      (tempo) che aprono il loro mese, sotto i record dello sport scelto.
- [x] Testi in it, de, es, fr; colori solo da `tokens.ts`; nessuna
      dipendenza nuova, niente di nativo.

## File toccati (parte B)

```
apps/mobile/src/api/activityCalendar.ts            (nuovo)
apps/mobile/src/api/activityCalendar.test.ts       (nuovo)
apps/mobile/src/activities/ActivityCalendar.tsx    (nuovo)
apps/mobile/src/activities/ActivityCalendar.test.tsx (nuovo)
apps/mobile/src/activities/WeekStrip.tsx           (nuovo)
apps/mobile/src/activities/calendarText.ts         (nuovo)
apps/mobile/src/activities/ActivitiesList.tsx
apps/mobile/src/profile/ProfileHome.tsx
apps/mobile/src/i18n/it.ts, de.ts, es.ts, fr.ts
apps/mobile/src/tabs/TabSwipeOwners.test.ts      (una riga: i chip degli sport)
docs/tasks/TASK-462.md
```

`gym/GymCalendar.tsx` non è toccato: `monthGrid` era già esportato.

## Fuori scope

- L'alpinismo come sport nuovo (numero a parte, vedi sopra).
- Un calcolo nuovo dei migliori tempi: lo storico usa le somme per mese, i
  record restano quelli di `personal_bests`.
- STATUS, DECISIONS, INDEX: le righe e la voce intera di ADR-0372 vanno in
  una PR di soli documenti dopo il merge.

## Esito

Done il 2026-11-12. Parte A in `main` con la #1162 (279a737a), sul server
col passo 9 del Coordinatore (2026-11-12 08:38Z, server a 02214e9b, i
controlli di `out/TASK-462/SERVER.md` come attesi). Parte B in `main` con
la #1172 (46be7779), dopo il sì dell'utente alle schermate in cinque
lingue («Approvo»). Documenti: #1179 (ADR-0372) e la PR di chiusura.

**Cosa resta**: l'app esce con l'aggiornamento completo (OTA del
Coordinatore col sì dell'utente), non prima; dopo, la prova sul telefono
vero (la settimana nel profilo, il foglio da «My activities», un mese con
più sport, le barre). L'alpinismo è TASK-463 (ADR-0373), dopo TASK-415 B
e TASK-413 B.
