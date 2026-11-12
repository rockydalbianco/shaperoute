# TASK-473 — Il menu degli sport a griglia

**Stato**: In corso
**Fase**: 5 · **Branch**: `feat/TASK-473-sport-grid`

## Obiettivo

Il bottone dello sport in alto apre un pannello ordinato: quadrati grandi,
due per riga, raggruppati per famiglia, al posto della tendina stretta con
gli sport uno sotto l'altro.

## Contesto da leggere

- `apps/mobile/src/settings/SportButton.tsx` (TASK-205, ADR-0165; la
  modalità sci di TASK-429)
- `apps/mobile/src/settings/sport.ts`, `ALL_SPORTS`: l'ordine per famiglia
  (TASK-371)

## Scelte dell'utente (2026-11-12)

- «riordina la scheda degli sport … un rettangolo e sono da premere i
  quadrati due per linea più grandi»: il pannello con due quadrati per riga.
- Vista la bozza, «raggruppa per famiglia»: un titoletto per gruppo (a
  piedi, su ruote, sull'acqua, sulla neve, altro).
- «No, vai alla PR»: niente prova nel simulatore prima della PR.

## Testi nuovi (approvati dall'utente il 2026-11-12)

| Inglese | Italiano | Francese | Tedesco | Spagnolo |
|---|---|---|---|---|
| On foot | A piedi | À pied | Zu Fuß | A pie |
| On wheels | Su ruote | Sur roues | Auf Rädern | Sobre ruedas |
| Other (gruppo della palestra) | Altro | Autres | Weitere | Otros |

«On the water» e «On snow» esistevano già, con le loro traduzioni.
Sì dell'utente (2026-11-12), viste le tre righe con le quattro
traduzioni: «Sì, approvati».

## Cosa fare

1. `SportButton.tsx`: il menu diventa un pannello a tutta larghezza
   sotto il bottone (16 pt dai lati), con titolo «Sport» e «Close» (✕);
   dentro, i gruppi con i quadrati, che scorrono se non ci stanno.
   Restano: «Soon» sugli sport non pronti, la riga della modalità sci
   sotto «Ski», il riquadro «Ski mode» in cima, un tocco fuori che chiude.
2. `sportFamilies.ts` (nuovo): la famiglia di ogni sport (`FAMILY_OF`,
   esaustiva sul tipo `Sport`) e `groupSports`.
3. I titoli nuovi («On foot», «On wheels», «Other@@sport») in it, fr, de,
   es; «On the water» e «On snow» c'erano già.
4. Test nuovo `SportButtonGrid.test.tsx`; quello esistente
   `SportButton.test.tsx` resta verde senza modifiche.

## Criteri di accettazione

- [x] Il pannello mostra gli sport per famiglia, nell'ordine di
      `ALL_SPORTS`; un gruppo vuoto non ha titolo.
- [x] Due quadrati per riga, larghi quanto metà pannello; quello scelto
      ha il bordo più marcato e la ✓.
- [x] Toccare un quadrato salva lo sport e chiude; la ✕ e il tocco fuori
      chiudono senza cambiare nulla.
- [x] Ogni sport di `ALL_SPORTS` sta in una e una sola famiglia: uno
      sport nuovo senza famiglia fa fallire test e `tsc`.
- [x] Gli sport «Soon» non si possono scegliere.
- [x] VoiceOver legge nome e stato di ogni quadrato (radio, «checked»;
      «…, coming soon»), i titoli delle famiglie come intestazioni.
- [x] Sui telefoni piccoli (375 × 667) il pannello scorre e contiene
      tutti gli sport.
- [x] `SportButton.test.tsx` e il test delle tabelle di traduzione verdi
      senza modifiche; `tsc` verde.
- [x] Sì dell'utente sui testi nuovi, scritto sopra.

## File toccati

```
apps/mobile/src/settings/SportButton.tsx
apps/mobile/src/settings/sportFamilies.ts            (nuovo)
apps/mobile/src/settings/SportButtonGrid.test.tsx    (nuovo)
apps/mobile/src/i18n/it.ts
apps/mobile/src/i18n/fr.ts
apps/mobile/src/i18n/de.ts
apps/mobile/src/i18n/es.ts
docs/tasks/TASK-473.md
```

## Fuori scope

- La lista «Sport» in Impostazioni (`SportSetting.tsx`): resta com'è.
- Il foglio animato dal basso (`ui/SheetModal`): i test esistenti di
  `SportButton.test.tsx`, toccati dalla #1249, vogliono il menu chiuso
  subito dopo una scelta; resta la dissolvenza di oggi.
- Le righe di STATUS/DECISIONS/INDEX: in una PR di soli documenti dopo il
  merge.

## Esito

*(a fine task)*
