# TASK-493 — La mappa dei decolli: i siti di volo con lo storico di MuW

**Stato**: In lavorazione · 0 (#1514) e A (#1518, migrazione 0086, sul server col passo 22) in `main`; prossima B, poi C e D (vento dopo TASK-479 H).
Prima del 2026-11-24: Proposto · parte 0 (questa PR, soli documenti), scelte dell'utente fatte il 2026-11-23; prossima la parte A
**Fase**: 5 · **Branch**: `docs/TASK-493-494-takeoffs-glider-checks` (parte 0), poi
`feat/TASK-493-<parte>-…` per ogni parte
**ADR**: ADR-0400 · numeri dal Coordinatore (fork 3), 2026-11-23

## Obiettivo

Chi vola apre una mappa dei decolli e degli atterraggi e, toccando un
decollo, legge la sua scheda: quota, orientamento, dislivello fino
all'atterraggio e lo storico di MuW, cioè quanti voli partono da lì, in che
mesi, quanti piloti diversi, chi vola oggi e i record del posto.

## La richiesta (2026-11-23)

> «Continua a migliorarla, deve essere professionale, dammi nuove idee,
> magari punti di decollo segnati sulla mappa, con storico di quante
> persone volano da quel posto.» Poi, tra le idee proposte: «Mappe dei
> decolli in una scheda e la scadenza della vela in un'altra».

## Contesto da leggere

- `tasks/TASK-479.md`: «Cosa si usa e cosa no» (decolli e atterraggi da
  OpenStreetMap, ODbL), le parti A (mappa 3D col decollo) e D (atterraggio
  più vicino), la parte H (vento in quota), «Gli avvisi».
- `tasks/TASK-305.md`: le parti R (i voli salvati, «Pronto al decollo», il
  live, i tratti a piedi e in volo di R6).
- Studio sul Mac, `out/TASK-305/research_data_sources.md` §1 (le fonti dei
  decolli: OSM sì; ParaglidingEarth solo con una licenza scritta; DHV e
  XContest no).
- ADR-0375 (registrazione in volo), ADR-0388 (il parapendio completo).

## Cosa c'è già

- I voli salvati (`paragliding`) col punto di decollo, la quota e i tratti
  in volo (`run_stats.stats.flight_parts`); il live con chi è in volo.
- La mappa con il 3D e il terreno (TASK-479 A); nessun dato di decolli nel
  codice: TASK-479 li prevede da OSM per A e D, ma non li ha ancora
  scaricati.

## Le fonti

| Cosa | Fonte | Licenza |
|---|---|---|
| Decolli e atterraggi | OpenStreetMap: `free_flying:takeoff`, `free_flying:landing`, la vecchia `free_flying:site`, `sport=free_flying` | ODbL, «© OpenStreetMap contributors» sempre visibile |
| Quota e dislivello | il tag `ele` di OSM, se no il terreno che l'app già legge (AWS Terrain Tiles) | aperta |
| Orientamento | i tag di OSM quando ci sono, se no niente (non lo si indovina) | ODbL |
| Storico | i voli salvati in MuW | dati degli iscritti: vedi le domande |
| Vento | la parte H di TASK-479, quando c'è | CC BY 4.0 |

Non si usano: ParaglidingEarth (licenza dei dati non scritta), DHV,
XContest, Burnair.

## Vincoli dal Coordinatore (2026-11-23)

- I file di `apps/mobile/src/air/` sono di TASK-479 (D2 in corso): le
  parti di questo task usano file nuovi fuori da lì (per esempio
  `apps/mobile/src/takeoffs/`).
- Il vento di TASK-479 H è una **dipendenza**: la parte D parte solo
  quando H è in `main`.
- La migrazione si chiede al Coordinatore con la lista dei file del
  server, non si prenota prima.
- I numeri dei voli sono dati degli iscritti: una riga di privacy prima
  dell'OTA.

## Le parti

### Parte 0 — documenti (questa PR)

Il task, l'ADR, le domande all'utente.

### Parte A — I siti sul server

- Un job a sé estrae i siti dagli estratti OSM che il server già scarica
  (Geofabrik, come le zone a piedi), una volta a settimana, in una tabella
  `flying_sites` (id, tipo decollo/atterraggio, punto, nome, quota,
  orientamento, id OSM).
- `GET /flying-sites?bbox=…` per la mappa; una tabella nuova, nessuna
  rotta esistente cambia. La stessa tabella può servire a TASK-479 D
  (l'atterraggio più vicino): da concordare con quella sessione.

### Parte B — Lo storico

- Un volo appartiene a un decollo se il suo punto di decollo è entro
  300 m e 150 m di quota da un decollo OSM.
- `GET /flying-sites/{id}`: la scheda coi numeri contati dal server (voli
  per mese degli ultimi 12 mesi, piloti diversi, voli di oggi, in volo
  adesso dal live) e i record dai soli voli pubblici (vedi le domande).

### Parte C — La mappa nell'app

- La mappa dei decolli (il segno del decollo e dell'atterraggio) e la
  scheda del decollo, con l'attribuzione OSM; «Fly from here» porta a
  «Pronto al decollo».

### Parte D — Il vento sulla scheda (dopo TASK-479 H)

- Il vento previsto in quota accanto all'orientamento del decollo: solo
  numeri e frecce, mai «volabile», «buono», «sicuro».

## Scelte dell'utente (2026-11-23)

Le 5 proposte qui sotto, tutte accettate dall'utente: «Sì, tutte». L'ordine
delle parti (A → B → C → D) è **deciso dall'agente su delega dell'utente**.


1. **Dove si apre la mappa.** Proposta: dalla scelta dello sport
   «Paragliding», un bottone «Takeoffs» accanto a «I tuoi voli», a tutto
   schermo; in alternativa una voce in «Explore».
2. **Quali voli contano nello storico.** Proposta: tutti i voli salvati,
   anche privati, ma solo come numeri senza nomi, e i numeri si vedono solo
   quando i piloti diversi sono almeno 3 (sotto: «Few flights yet»). Una
   riga nuova nella privacy. In alternativa: solo i voli pubblici.
3. **I record del posto con i nomi.** Proposta: volo più lungo, quota
   massima sopra il decollo e durata più lunga, solo dai post pubblici,
   col nome di chi li ha fatti e il post che si apre.
4. **I decolli che OSM non ha.** Proposta: nella prima versione solo OSM,
   con un link «Missing? Add it on OpenStreetMap». Dopo, se serve, i
   decolli «trovati dai voli» (almeno 3 piloti diversi dallo stesso
   punto) come proposta da mandare su OSM.
5. **Chi vola adesso.** Proposta: sulla scheda «2 in the air now», e il
   link dal vivo solo di chi lo condivide già in pubblico.

## Criteri di accettazione (per tutto il task)

- [ ] La mappa mostra i decolli e gli atterraggi di OSM con
      l'attribuzione, anche senza account.
- [ ] La scheda di un decollo mostra quota, dislivello, orientamento se
      OSM lo dice, e lo storico contato dal server.
- [ ] Sotto la soglia dei piloti i numeri non si vedono.
- [ ] Un volo privato non dà mai un nome né una traccia a chi non è il
      suo pilota.
- [ ] Nessun testo giudica le condizioni («volabile», «sicuro»).
- [ ] La privacy lo dice nelle cinque lingue e sul sito prima dell'uscita;
      server e OTA col sì dell'utente.

## File toccati

Parte 0 (questa PR, soli documenti):

```
docs/tasks/TASK-493.md        (nuovo)
docs/tasks/TASK-494.md        (nuovo, stessa PR)
docs/DECISIONS.md
docs/STATUS.md
docs/INDEX.md
```

Le liste delle parti si scrivono qui prima di ogni parte, dopo il via del
Coordinatore; nessun file di `src/air/` senza il via della sessione di
TASK-479.

## Fuori scope

- Dati da ParaglidingEarth, DHV, XContest (licenze).
- Giudizi sulle condizioni, regole locali, NOTAM, tasse del sito.
- Modifiche a OSM fatte da MuW.
- Commenti o foto sul sito (una parte dopo, se l'utente la chiede).

## Esito

*(a fine task)*
