# TASK-409 — Nuoto in piscina: calorie, battito medio e tempo nelle zone

**Stato**: In corso: parte A (calorie) in `main` e in produzione; parte B
nella 1.0.3
**Fase**: 5 · **Branch**: `feat/TASK-409-a-pool-calories` (parte A, col task
file); la parte B avrà il suo
**Dipende da**: TASK-400 (nuoto in piscina, chiuso), TASK-374 (Il mio corpo,
ADR-0318: A e B in `main`, C e D nella 1.0.3), TASK-345 C (battito da Salute,
1.0.3)
**ADR**: precisazioni di ADR-0318 («il nuoto in piscina») e di ADR-0334
(«precisazione D») · numeri dal Coordinatore il 2026-11-06: task nuovo,
nessun ADR nuovo

## Obiettivo

Un nuoto in piscina (TASK-400) mostra, come l'Apple Watch, le **calorie**,
il **battito medio** e il **tempo in ogni zona del battito**, oltre a vasche,
metri, tempo e passo /100 m che ha già.

## Scelte dell'utente (2026-11-06, una alla volta)

1. **Cosa e quando**: «Calorie subito, battiti da Salute». Data dall'utente
   alla sessione che ha avviato questa (`local_658242ce-2ac0-4e93-98f3-318c99a1bfd9`,
   il nuoto in piscina), che l'ha passata nel brief. Calorie con un OTA,
   stimate da tempo, vasche e peso di «Il mio corpo» (70 kg se manca);
   battito e zone letti da Apple Salute / Health Connect, dall'orologio che ha
   registrato nella finestra del nuoto. Senza orologio, solo le calorie.
2. **Formula delle calorie**: «MET per passo». I MET del *Compendium of
   Physical Activities* 2024 per lo stile libero (crawl), scelti dal passo
   medio /100 m (tempo senza le pause, metri = vasche × vasca), meno il
   consumo a riposo come per corsa e bici (ADR-0318 §3):

   | Passo /100 m | MET | Codice |
   |---|---|---|
   | più lento di 2:18 | 5,8 | 18292 (crawl lento, 30–45 yd/min) |
   | da 2:18 a 1:45 | 8,0 | 18290 (crawl medio, ~50 yd/min) |
   | da 1:45 a 1:13 | 10,5 | 18280 (crawl veloce, ~75 yd/min) |
   | più veloce di 1:13 | 14,5 | 18294 (agonisti, > 90 yd/min) |

   Esempio: 70 kg, 1500 m in 35 min (2:20/100 m) → circa 206 kcal. **Le acque
   libere restano senza calorie** (TASK-323, ADR-0318 §14).
3. **Testi**: «Approvati così». La parte A non ha testi nuovi: «Calories» e
   «kcal» ci sono già in ogni lingua. Quelli della parte B:

   | English | it | de | fr | es |
   |---|---|---|---|---|
   | Avg heart rate | Battito medio | Durchschn. Herzfrequenz | FC moyenne | FC media |
   | Time in zones | Tempo nelle zone | Zeit in Zonen | Temps par zone | Tiempo en zonas |
   | From your watch, via Apple Health | Dal tuo orologio, tramite Salute | Von deiner Uhr, über Apple Health | De ta montre, via Santé | De tu reloj, a través de Salud |
   | From your watch, via Health Connect | Dal tuo orologio, tramite Health Connect | Von deiner Uhr, über Health Connect | De ta montre, via Health Connect | De tu reloj, a través de Health Connect |

   I nomi delle zone sono quelli già approvati in TASK-374 (scelta 6).
4. **Il via alla parte B** (2026-11-08): «SI PROCEDIAMO», «APPROVO», detto
   alla proposta che chiedeva i suoi sì su testi della privacy, App Privacy e
   build. Vale come via alla parte B; ogni testo concreto (privacy, App
   Privacy, Data safety, chiave di lettura) gli si mostra comunque prima del
   merge o dell'invio.
5. **Dove si vede il battito**: «Anche nel post del Feed» (2026-11-08). Il
   battito medio va al server e si vede nel post, con la riga per nasconderlo
   come in TASK-345 B; il tempo nelle zone resta sul telefono (ADR-0318 §1).
   Scartate: «Solo sul telefono» (la proposta), «Telefono ora, Feed dopo».
6. **Il consenso alla lettura**: «Pulsante a fine nuoto» (2026-11-08). A
   fine nuoto, se Apple Salute c'è, il pulsante «Add heart rate from Apple
   Health»: il primo tocco apre la richiesta di lettura del battito di iOS e
   vale come consenso esplicito (GDPR art. 9), ricordato per i nuoti dopo;
   poi battito medio e tempo nelle zone; nel modulo del post «Show heart
   rate», acceso. Senza tocco non si legge nulla; si spegne nelle
   Impostazioni di Salute. Scartate: un interruttore nelle Impostazioni,
   chiedere a ogni nuoto.
7. **Testi della parte B e privacy**: «Approvati così» (2026-11-08).
   Inglese → italiano; tedesco, francese e spagnolo li traduce l'agente.

   | English | Italiano |
   |---|---|
   | Add heart rate from Apple Health | Aggiungi il battito da Salute |
   | No heart rate from your watch for this swim. | Nessun battito dall'orologio per questa nuotata. |
   | Show heart rate | Mostra il battito |

   Privacy, al posto di «MuW non legge mai i tuoi dati di salute, e niente di
   questi arriva al nostro server o a qualche pubblicità»: «Se a fine
   nuotata in piscina tocchi «Aggiungi il battito da Salute», MuW legge il
   battito che il tuo orologio ha registrato durante quella nuotata, e
   nient'altro. Medio e massimo restano con la nuotata sul nostro server e si
   vedono nel suo post, a meno che tu spenga «Mostra il battito»; il tempo in
   ogni zona resta sul telefono. Niente dei tuoi dati di salute arriva a
   qualche pubblicità.» Tra le basi giuridiche, sotto «Il tuo consenso»: «…
   e la lettura del battito da Apple Salute.»

## Contesto da leggere

- `DECISIONS.md` ADR-0318 (§3, §13, §14 e precisazioni), ADR-0334 e le sue
  precisazioni B e C
- `apps/mobile/src/body/energy.ts` (`restKcalPerMin`, `DEFAULT_WEIGHT_KG`),
  `apps/mobile/src/pool/`
- Per la parte B: `tasks/TASK-345.md` (parte C), `tasks/TASK-374.md` (parti C
  e D)

## Parte A — calorie, con un OTA

1. Modulo puro `pool/poolKcal.ts`: il MET dal passo (le fasce sopra, come
   `MetBand` in km/h: 2,60 / 3,43 / 4,94), energia = MET × 0,0175 × peso ×
   minuti, meno `restKcalPerMin` per gli stessi minuti; intero, mai sotto zero,
   zero senza metri o senza tempo. Peso e corpo da `body/bodyProfile.ts`.
   `body/energy.ts` non cambia: lo sport «Swim» resta senza energia, così le
   acque libere restano come sono.
2. **Fine del nuoto** (`PoolSwimEnd.tsx`): un quinto riquadro «Calories» dopo
   il passo, «–» finché non ci sono le vasche.
3. **Apple Salute / Health Connect** (`poolHealth.ts`): le kcal come energia
   attiva dell'allenamento, `null` se zero.
4. **Feed** (`feed/postEnergy.ts`): un post di nuoto senza linea
   (`isPoolLine`) ha le kcal di `poolKcal`, con il corpo del telefono per i
   propri post e 70 kg per quelli degli altri (ADR-0318 §5). La riga del post
   finisce con «· 206 kcal», come le altre attività.
5. **My activities** (`ActivitiesList.tsx`): la riga di un nuoto in piscina
   finisce con «· 206 kcal».
6. Impronta iOS invariata (`6f8bba4c`): solo JS.

## Parte B — battito medio e tempo nelle zone

Va **sopra** i lettori di TASK-345 C (battito da Salute: campioni tra inizio e
fine, medio e massimo) e TASK-374 D (tempo in ogni zona, con le zone di
TASK-374 B). Nessun lettore nuovo in `pool/`: il nuoto in piscina passa a
quelle funzioni la sua finestra (`startedMs`–`endedMs`, pause escluse).
Il 2026-11-08 TASK-345 C e TASK-374 D non sono ancora iniziati: chi li
costruisce, e se la parte B parte prima, lo decide il Coordinatore (chiesto
lo stesso giorno). Su iPhone la 1.0.1 build 8 (`6f8bba4c`) ha già
`NSHealthShareUsageDescription` per il battito: la lettura può arrivare con
un OTA; il server (scelta 5) va prima, col sì dell'utente.

1. A nuoto salvato in Salute, l'app legge i campioni di battito della
   finestra; con almeno un campione mostra «Avg heart rate» e «Time in zones»
   nella fine del nuoto, con la riga della fonte («From your watch, via Apple
   Health» o «…via Health Connect»).
2. Il battito medio va al server come in TASK-345 B (`heart_avg_bpm`,
   `heart_max_bpm`, `heart_shown`), e nel post si vede come lì; il tempo nelle
   zone resta sul telefono (ADR-0318 §1).
3. Mai sulla build 7; su Android dopo TASK-321 C. Negata la lettura, niente
   cambia e nessun messaggio.
4. Privacy, App Privacy e la chiave `NSHealthShareUsageDescription` cambiano
   una volta sola con TASK-345 C e 374 C, col sì dell'utente.
5. Si apre quando TASK-345 C e TASK-374 D sono in `main`; la lista dei file
   al Coordinatore prima del codice.

## Criteri di accettazione

- [x] A: `poolKcal` dà i casi calcolati a mano in ogni fascia, e ai bordi;
      zero senza metri o senza tempo; il peso di «Il mio corpo» la cambia in
      proporzione, senza peso 70 kg.
- [x] A: le stesse kcal nella fine del nuoto, nell'allenamento salvato in
      Salute / Health Connect, nel post del Feed (i propri col corpo, gli altri
      a 70 kg) e nella riga di «My activities».
- [x] A: un nuoto in acque libere resta senza calorie (test esistenti verdi).
      (`pool/poolKcal.test.ts`, `pool/PoolKcal.test.tsx`,
      `pool/poolHealth.test.ts`, `feed/postEnergy.test.ts`,
      `pool/PoolTile.test.tsx`, `health/swimWorkout.test.ts`)
- [x] A: impronta iOS `6f8bba4c` invariata (misurata con `npm ci` su una
      copia pulita di `3bf2802d`); test toccati, tsc, lint e Prettier verdi in
      locale, CI verde.
- [ ] B: con un orologio, battito medio e tempo nelle zone della finestra del
      nuoto (modulo finto); senza campioni o con la lettura negata, solo le
      calorie.

## File toccati

Parte A:

```
apps/mobile/src/pool/poolKcal.ts, poolKcal.test.ts (nuovi)
apps/mobile/src/pool/PoolKcal.test.tsx (nuovo: fine del nuoto, riga)
apps/mobile/src/pool/PoolSwimEnd.tsx
apps/mobile/src/pool/poolHealth.ts, poolHealth.test.ts
apps/mobile/src/feed/postEnergy.ts, postEnergy.test.ts
apps/mobile/src/activities/ActivitiesList.tsx
apps/mobile/src/pool/PoolTile.test.tsx (aggiunto: la riga di «My activities»
  che quel test controllava ora finisce con le kcal)
docs/tasks/TASK-409.md
docs/DECISIONS.md
docs/STATUS.md
docs/INDEX.md
```

Parte B: dopo TASK-345 C e TASK-374 D.

## Esito

- **Parte A** (2026-11-08): #922 in `main` (merge `3bf2802d`, unita dal
  Coordinatore). OTA di produzione col sì dell'utente («ok produzuone»,
  «pubblicala tu»): gruppo `fc8aa133-9844-4fed-a538-2b2029e1b708`, solo iOS,
  runtime `6f8bba4c`, commit `3bf2802d`; con lei uscivano anche #923, #930,
  #921 e #943. Gli OTA di produzione successivi (`10279e05`, `8b1af1b4` da
  `a0f38012`) la contengono. Android non pubblicato (test chiuso).
- **Parte B**: aperta, nella 1.0.3, quando TASK-345 C e TASK-374 D sono in
  `main` (sezione «Parte B» sopra).
