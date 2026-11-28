# TASK-451 — «Rifai meglio»: la stessa forma dopo una corsa uscita di strada

**Stato**: Done · 2026-11-28 · #1716 (parte 0), #1717 (A), #1726 (B),
documenti di chiusura (questa). Esito: «Save & redo» a fine corsa, provato
nel simulatore; restano l'OTA sulla 1.2.0 (la chiede il Coordinatore
all'utente) e la prova sul telefono.
**Fase**: 5 · **Branch**: `docs/TASK-451-part-0`,
`feat/TASK-451-a-redo-pick`, `feat/TASK-451-b-redo-button`,
`docs/TASK-451-closing`
**Dipende da**: TASK-313 («Draw it near me», in `main`); la parte B tocca
`App.tsx` dopo TASK-523 T in `main` (il Coordinatore lo dice)
**ADR**: ADR-0419 · numero del task dal Coordinatore l'11
novembre 2026 (idea I6 di `out/prova-app-2026-11-11/PROPOSTE.md`); avviato
dall'utente il 2026-11-27

## Obiettivo

Chi ha sbagliato strada e ha disegnato la forma storta, a fine corsa trova
un pulsante che salva la corsa e riapre «Draw» con **la stessa forma (o
parola), gli stessi km e la stessa partenza**, pronto per «Draw route». Il
percorso nuovo lo decide il motore, col giro di sempre: l'app sceglie solo
cosa chiedere. Nessuna coordinata nasce fuori dal motore.

## Cosa sa già l'app (letto su `main` c93a5463, 2026-11-27)

- **Fine corsa** (`App.tsx`: `FinishBanner`, `FinishCard` in
  `screens/FinishScreen.tsx`, sotto `RunEnd` con «Save»/«Discard»): mostra
  percorso giallo e traccia bianca, distanza e tempo; **nessun punteggio**
  (TASK-241, scelta dell'utente).
- **Nessuno misura dove si è usciti dal percorso** dopo la corsa:
  `track_score.py` riduce tutto a medie, `navigation/progress.ts`
  (`OFF_ROUTE_M = 40`) lavora solo dal vivo.
- **Il motore non ha input per evitare strade o zone** (`RouteRequest`):
  la lettura «evita i tratti sbagliati» sarebbe un task del motore.
- **«Draw it near me»** (TASK-313, `route/drawAgain.ts`) riapre già «Draw»
  con forma o parola e distanza; non mette la partenza. Foto e disegni a
  mano non si riaprono da una richiesta.
- La corsa salvata (server e `SavedRun`) **non tiene distanza chiesta né
  partenza**: le sa solo la richiesta ancora aperta nell'app a fine corsa.
- `endSave` (App.tsx) fa già «Save» del modulo da fuori (la striscia
  ripiegata, TASK-472).

## Scelte dell'utente (parte 0, 2026-11-27)

1. **Versione (a) «Rifai uguale»**: stessa forma, km e partenza, il motore
   ripianifica. Niente «evita i tratti sbagliati» (sarebbe un task del
   motore, eventualmente dopo).
2. **Solo a fine corsa**, nella scheda distanza · tempo accanto a «Share» e
   «Keep running». Niente server, niente corse passate.
3. **Solo se si è lasciato il percorso**: almeno **200 m** di percorso,
   prima del punto dove ci si è fermati, rimasti a più di **40 m** dalla
   traccia. Smettere prima della fine non conta («Keep running» c'è già).
   Le soglie si ritoccano dopo la prova.
4. **Sport su strade e sentieri**: corsa, camminata, escursione, bici,
   mountain bike, gravel, pattini, ciaspole, carrozzina. Fuori canoa e nuoto.
5. **Salva e rifai**: il tocco fa ciò che fa «Save» (modulo e visibilità
   come sono), poi apre «Draw» compilato. Senza account la corsa lascia il
   telefono come con «Done».
6. **Testi** (approvati):

   | | Con account | Senza account |
   |---|---|---|
   | EN | Save & redo | Redo |
   | IT | Salva e rifai | Rifai |
   | DE | Speichern & wiederholen | Wiederholen |
   | ES | Guardar y repetir | Repetir |
   | FR | Enregistrer et refaire | Refaire |

   VoiceOver con account: «Save the run and draw the same shape again» ·
   «Salva la corsa e disegna di nuovo la stessa forma» · «Lauf speichern und
   dieselbe Form neu zeichnen» · «Guarda la carrera y dibuja otra vez la
   misma forma» · «Enregistre la course et redessine la même forme».
   Senza account: «Draw the same shape again» · «Disegna di nuovo la stessa
   forma» · «Dieselbe Form neu zeichnen» · «Dibuja otra vez la misma forma»
   · «Redessine la même forme».

Deciso dall'agente su delega dell'utente (tecnico):

- Vale per ogni corsa su un percorso la cui richiesta è una **forma del
  catalogo o una parola** (da «Draw», da «Explore», da un preferito). Foto
  e disegni a mano no: «Draw» non li riapre da una richiesta (come
  TASK-313).
- La partenza è quella della richiesta della corsa, messa in «Draw» come un
  posto scelto sulla mappa (`setPlace`, `startMode = "place"`).
- Il calcolo dei metri mancati è una funzione pura sul telefono: percorso
  campionato ogni 10 m su piano proiettato in metri, distanza da ogni
  campione alla traccia, campioni oltre 40 m contati solo fino all'ultimo
  campione raggiunto (entro 40 m) della corsa.

## Parti

- **A — la scelta (solo file nuovi)**: `redoBetter.ts` con
  `missedRouteM(route, fixes)` e `redoOf(...)` → forma o parola, distanza,
  partenza, oppure `null` (sport sull'acqua, richiesta non riapribile,
  meno di 200 m mancati). Test deterministici.
- **B — il pulsante**: `FinishCard` con il pulsante (nome con o senza
  account), `App.tsx` lo collega (`endSave` o `clearRun`, poi «Draw»
  compilato), le chiavi nelle quattro tabelle nella sezione della fine
  corsa. Test della scheda. Schermate all'utente prima di «pronta».

## File toccati

Lista mandata al Coordinatore il 2026-11-27, prima del codice; approvata lo
stesso giorno.

```
# Parte 0 (documenti)
docs/tasks/TASK-451.md                                  (nuovo)
docs/STATUS.md                                          (la voce del task)
docs/DECISIONS.md                                       (se c'è un ADR)

# Parte A (solo file nuovi)
apps/mobile/src/route/redoBetter.ts, .test.ts           (nuovi)

# Parte B (dopo A in main)
apps/mobile/src/screens/FinishScreen.tsx
apps/mobile/src/screens/FinishRedo.test.tsx             (nuovo)
apps/mobile/App.tsx                                     (il collegamento)
apps/mobile/src/i18n/it.ts, de.ts, es.ts, fr.ts         (le chiavi nuove)

# Chiusura (documenti)
docs/tasks/TASK-451.md, docs/STATUS.md (la voce esce)
docs/archive/COMPLETATI.md                              (una riga)
docs/DECISIONS.md                                       (precisazione di ADR-0419)
docs/INDEX.md                                           (una riga)
docs/UI.md                                              («La fine della corsa»)
```

## Com'è andata (2026-11-28)

- **Parte A** (#1717): `route/redoBetter.ts` con `missedRouteM` e
  `redoOf`, 16 test su un quadrato di 1 km.
- **Parte B** (#1726): il pulsante in `FinishCard`, il collegamento in
  `App.tsx`, le quattro chiavi nelle quattro tabelle (`Redo@@run` resta
  separata dal «Redo» dei tratti), `FinishRedo.test.tsx`.
- **La richiesta della corsa**: quella di «Draw» quando il percorso
  corso è quello scelto lì; altrimenti quella di «Explore» (i preferiti
  passano da lì) quando il suo risultato è il percorso corso.
- **Prova nel simulatore** (2026-11-27, API locale usa e getta): cuore di
  5 km a Trento, corsa simulata che taglia circa 1100 m → la scheda mostra
  «Save & redo»; il tocco salva (`PUT /me/activities` 201) e riapre
  «Draw» col cuore, 5,0 km e la partenza della corsa; «Draw route» ridà
  lo stesso cuore. Un taglio di 110 m non mostra il pulsante.
- **Trovati nella prova e corretti in #1726**: la riga «Share» · «Keep
  running» · «Save & redo» non ci stava e tagliava «Share» → la riga va a
  capo; su un giro chiuso «dove ci si è fermati» prendeva il passaggio
  sbagliato vicino a partenza e arrivo → si prende il passaggio più avanti
  i cui 100 m prima sono stati corsi per più di metà (precisazione di
  ADR-0419).
- Nessuna dipendenza nuova, nessun file nativo: fingerprint iOS
  `5e1b5ce5` invariato.

## Cosa resta

- **L'OTA sulla 1.2.0**, dopo l'approvazione di App Review: la chiede il
  Coordinatore all'utente.
- **La prova dell'utente sul telefono**: una corsa uscita di strada di
  almeno 200 m su una forma o una parola, poi «Save & redo»; le soglie
  (200 m, 40 m) si ritoccano dopo, se serve.

## Criteri di accettazione

- [x] `missedRouteM` e `redoOf` coperti da test deterministici: corsa
      fedele → nessun pulsante; deviazione di 200 m o più → pulsante;
      corsa interrotta prima della fine senza deviazioni → nessun pulsante;
      canoa e nuoto → mai; foto/disegno a mano → mai; forma e parola →
      stessa forma/parola, distanza e partenza.
- [x] Il pulsante appare a fine corsa solo con le condizioni sopra, col nome
      con o senza account e il testo di VoiceOver approvati.
- [x] Il tocco con account salva come «Save»; se il salvataggio fallisce la
      corsa resta dov'è e «Draw» non si apre.
- [x] «Draw» si apre con forma o parola, km e partenza della corsa; «Draw
      route» chiede al motore il percorso di sempre.
- [x] Nessun colore a mano, chiavi nelle quattro lingue, fingerprint iOS
      invariato (`5e1b5ce5`), `tsc` e test toccati verdi.
