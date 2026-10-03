# TASK-209 — La voce della corsa: lingua e voce a scelta

**Stato**: Todo
**Fase**: 4 · **Branch**: `feat/TASK-209-run-voice-language`

## Obiettivo

Chiesto dall'utente il 2026-10-03: «nella sezione di registrazione delle
attività inserisci la possibilità di scegliere la voce e la lingua della
voce». Alla fine, durante una corsa, si sceglie in che lingua parla la voce
(**inglese, italiano, spagnolo, francese, tedesco**, scelta dell'utente) e
quale voce del telefono la dice; la voce dice tutte le sue frasi in quella
lingua. La lingua dello schermo non è di questo task: è di TASK-210 («Lingua
dell'app», in «Settings», le stesse cinque lingue).

## Scelte dell'utente (2026-10-03)

- **Le lingue**: le cinque sopra. Le frasi le traduce l'agente; l'utente
  conferma l'italiano; spagnolo, francese e tedesco restano «da
  confermare» finché qualcuno che le parla non le guarda.
- **Dove**: «nella sezione di registrazione delle attività»: la pagina
  «Data» della corsa, accanto all'interruttore «Voice» (TASK-169, ADR-0137;
  l'aspetto è quello di TASK-204, ADR-0163).
- **La voce**: fra quelle già installate sull'iPhone per la lingua scelta
  (`Speech.getAvailableVoicesAsync()` di `expo-speech`, già una
  dipendenza), con un tasto per sentirla prima su una frase d'esempio.
- **Con TASK-210** (deciso dal coordinatore e detto all'utente il
  2026-10-03): la voce segue la lingua dell'app, a meno che non se ne
  scelga un'altra solo per la voce. Finché TASK-210 non è in `main`, «la
  lingua dell'app» è l'inglese.

## Numeri e incroci (dal coordinatore, 2026-10-03)

- **ADR-0171**, se serve una decisione da registrare.
- **TASK-191 C** (la canoa nell'app, sessione «Tasto aggiunta foto
  profilo») toglie la voce di svolta sull'acqua e può toccare
  `useNavigation.ts`, `navigator.ts`, `phrases.ts`.
- **TASK-206** (la bici a mano, sessione «Task bici e padel»), parte C:
  annuncia a voce i tratti a piedi, cioè frasi nuove da tradurre.
- **TASK-210** (la lingua dell'app, sessione «Selezione lingua app»):
  `src/i18n/`, la riga «Language» in «Settings».
- **Accordo con TASK-210** (coordinatore): **un solo elenco di lingue e un
  solo posto per la lingua scelta, `src/i18n/`** (di TASK-210); la voce
  segue la lingua dell'app se in «Data» non se ne sceglie un'altra. Le
  frasi della voce sono di TASK-209, i testi dell'interfaccia di TASK-210,
  che non tocca i file delle frasi finché TASK-209 non è in `main`.
- **Cosa espone `src/i18n/`** (da TASK-210, 2026-10-03, accettato così):
  `languages.ts`: `type Language = "en" | "de" | "it" | "es" | "fr"`,
  `LANGUAGES: readonly { id; name /* nel suo nome */; speech /* "en-US",
  "de-DE", "it-IT", "es-ES", "fr-FR" */ }[]` in ordine English, Deutsch,
  Italiano, Español, Français, `BASE_LANGUAGE = "en"`, `isLanguage()`;
  `language.ts`: `appLanguage()`, `subscribeLanguage(listener)` (come
  `subscribeSport`); `useLanguage.ts`: `useLanguage()`. Sotto jest la lingua
  è sempre `"en"`: per provarne un'altra, `jest.mock` di `src/i18n/language`.
  TASK-210 entra in `main` **prima**; questo branch si allinea dopo.
  `instruction()` (il banner) resta a TASK-209 in questa fase; dopo il
  merge i testi scritti dei file delle frasi e di `RunDashboard.tsx` li
  traduce TASK-210.
- Quindi: le traduzioni e la scelta della voce in **file nuovi** (per
  esempio `src/voice/`, una tabella per lingua); nei file esistenti solo il
  passaggio della lingua. **Prima di toccare `useNavigation.ts` e i file
  delle frasi**, guardare le PR aperte e dirlo al coordinatore: entra prima
  chi è pronto prima, l'altro si aggiorna. Nessuna dipendenza nuova senza
  chiedere. La CI la guarda il coordinatore: «#NNN pronta».

## Contesto da leggere

- `docs/UI.md`, «La navigazione» (le frasi dette, «Voice», la penna alzata)
  e «L'aspetto della corsa».
- ADR-0137, ADR-0163.
- Il codice delle frasi dette: `src/navigation/phrases.ts` (svolte, «Then
  …», «In 50 metres, …», le vie senza nome di `KINDS`, «beside», la penna
  alzata), `navigator.ts` («You are off the route…», «Back on the route.»,
  «You have arrived.»), `freeRun.ts` (il km: «1 kilometre. Time: …
  Average pace: … per kilometre.»), `runControl.ts` («Paused.»,
  «Resumed.»), `penUp.ts`; chi parla: `useNavigation.ts`
  (`Speech.speak(cue.say, { language: "en-US" })`) e `useFreeRun.ts`.
- Come l'app ricorda una scelta: `src/settings/sport.ts` (un file nei
  documenti, TASK-189).

## Cosa fare

0. **Accordarsi con TASK-210** prima di scrivere codice: dove vive la
   lingua dell'app (`src/i18n/`), come la voce la legge, chi traduce cosa.
   Le traduzioni della voce vanno in **file nuovi** (indicazione del
   coordinatore: altri lavori toccano la voce, la canoa toglie le svolte
   sull'acqua, la bici annuncia i tratti a piedi).
1. **Separare il detto dallo scritto**: oggi `instruction()` serve sia al
   banner sia alla voce. Le frasi dette passano per una funzione che prende
   la lingua della voce; il banner segue la lingua dello schermo (inglese
   finché TASK-210 non lo cambia), byte per byte come oggi in inglese.
2. **Le frasi in cinque lingue**, tutte quelle dette oggi, con i numeri
   detti come in quella lingua (i metri arrotondati, il tempo, il passo).
   Le vie senza nome («the footpath») tradotte; i nomi delle vie mai
   tradotti né inventati (ADR-0057, ADR-0058). I testi della penna alzata
   sono ancora da confermare in inglese (TASK-198): tradurre quelli di
   oggi e segnarli «da confermare».
3. **La scelta sulla pagina «Data»**: la lingua (prima «come l'app», poi
   le cinque) e la voce (quelle del telefono per quella lingua, con
   «Default» prima), un tasto per ascoltarla. Spenta «Voice», la scelta
   resta visibile ma non parla.
4. **Ricordata sul telefono** fra una corsa e l'altra e fra un avvio e
   l'altro, come lo sport (un file nei documenti). Prima di qualsiasi
   scelta: la lingua dell'app (oggi l'inglese), con la voce di sistema.
5. Se la voce scelta non c'è più sul telefono, la voce di sistema della
   stessa lingua, senza errore.
6. `docs/UI.md`, una voce in `DECISIONS.md` (ADR dal coordinatore).

## Criteri di accettazione

- [ ] Ogni frase detta oggi esiste in en, it, es, fr, de (test che le
      elencano tutte e controllano che nessuna manchi).
- [ ] Senza scelta, la voce dice esattamente le frasi di oggi, in
      `en-US` (test).
- [ ] La lingua della voce non cambia lo schermo: il banner segue la
      lingua dell'app, non quella della voce (test).
- [ ] Lingua e voce si scelgono in «Data», si ascoltano, e restano dopo
      un riavvio dell'app (test).
- [ ] Una voce sparita dal telefono non rompe niente (test).
- [ ] Provato nel simulatore: la scelta, l'ascolto, una corsa che parla
      italiano.
- [ ] Le frasi italiane confermate dall'utente; le altre tre segnate «da
      confermare» in `UI.md`.

## File toccati

```
(li fissa la sessione che prende il task, prima di cominciare)
```

## Fuori scope

- Tradurre lo schermo: è TASK-210.
- Lingue oltre le cinque, voci scaricate da internet, voci a pagamento.
- La voce nelle «Settings» (si può aggiungere dopo, se l'utente lo chiede).
- Cambiare quando parla la voce o cosa dice (solo come lo dice).

## Esito

*(a fine task)*
