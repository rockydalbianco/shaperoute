# TASK-150 — Il conto AdMob e i pagamenti sul conto dell'utente

**Stato**: In corso
**Fase**: 4 · **Branch**: `docs/TASK-150-admob-payments`
**Dipende da**: nessuno · **Serve prima di**: TASK-153 · In parallelo con TASK-152

## Obiettivo

L'utente ha un account AdMob pronto a pagarlo: titolare scelto con il
commercialista, profilo pagamenti con il suo conto, verifiche fatte. Una
guida passo passo in `docs/PUBBLICITA.md` dice come arrivano i soldi.

## Contesto da leggere

- `docs/DECISIONS.md` ADR-0102 (l'annuncio prima del percorso, TASK-132)
- Le pagine di Google, da ricontrollare all'inizio del task:
  [soglie di pagamento](https://support.google.com/admob/answer/2772208),
  [pagamenti e transazioni](https://support.google.com/admob/answer/2772140),
  [i passi per essere pagati](https://support.google.com/admob/checklist/2998383).

## Come funziona (controllato il 2026-10-02)

Google paga ogni mese, con bonifico, i guadagni del mese prima. Il 3 del
mese i guadagni del mese prima diventano definitivi. Se il 20 il saldo
supera la soglia (**70 €**), intorno al 21 parte il pagamento e arriva in
qualche giorno. Sotto la soglia, il saldo passa al mese dopo. Intorno ai
10 $ di guadagni Google chiede di confermare l'identità e manda per posta
un PIN per verificare l'indirizzo (4 mesi per inserirlo). Secondo il
paese, chiede anche dati fiscali (per esempio il modulo W-8BEN per i
ricavi dagli Stati Uniti).

## Cosa fare

Nessun codice. **Le scelte le fa l'utente**, una domanda per volta;
l'agente prepara le domande e la guida.

1. **Domande per il commercialista**, da scrivere e consegnare all'utente.
   L'agente non dà consigli fiscali.
   - I ricavi pubblicitari di un'app, pagati ogni mese da Google, si
     possono ricevere come persona fisica senza partita IVA? Da quale
     importo o frequenza serve la partita IVA (regime forfettario)?
   - Va bene una ditta o una società già esistente dell'utente, se c'è?
   - Come si documentano i pagamenti di Google: fattura, autofattura, IVA
     con inversione contabile («reverse charge»)?
   - Contributi INPS e dichiarazione dei redditi: cosa cambia?
   - Il modulo fiscale di Google per gli Stati Uniti: W-8BEN (persona) o
     W-8BEN-E (ditta)?
2. **Chi è il titolare**: persona o ditta. Scelta dell'utente, dopo il
   commercialista. Conviene lo stesso titolare per AdMob e per l'account
   Apple Developer di TASK-152 (individuale o organizzazione).
3. **Account AdMob**: lo crea l'utente, con il suo account Google.
   L'indirizzo postale deve essere quello dove arriva il PIN. Prima di
   confermare, l'utente controlla bene paese, fuso orario e valuta (EUR).
4. **Profilo pagamenti**: l'intestatario del conto deve avere lo stesso
   nome del profilo. L'IBAN e i dati fiscali li inserisce l'utente su
   AdMob: mai nel repository, mai in chat.
5. **Verifiche**: identità e PIN, quando Google li chiede. Si annota solo
   «fatto» o «in attesa», nessun dato.
6. **Guida**: `docs/PUBBLICITA.md`, con i passi qui sopra, il calendario
   dei pagamenti, cosa fare se un pagamento è bloccato («payment hold») e
   dove si vedono i guadagni. Una riga in `docs/INDEX.md`.

## Scelte prese (si aggiorna a ogni risposta)

1. **Persona o ditta**: **persona**, senza partita IVA per ora; la partita
   IVA si apre quando arrivano i guadagni. Scelta dell'utente
   (2026-10-02). Conseguenze in `docs/PUBBLICITA.md`, «Persona adesso,
   partita IVA dopo».

Fatto dall'agente il 2026-10-02: `docs/PUBBLICITA.md` con il calendario
dei pagamenti, i passi in ordine e le domande per il commercialista. Il
tipo di account AdMob (persona o ditta) non si cambia dopo la creazione:
le domande al commercialista vengono prima dell'account.

## Criteri di accettazione

- [ ] Le domande per il commercialista sono consegnate all'utente.
- [ ] La scelta «persona o ditta» è scritta qui sopra, presa dall'utente.
- [ ] L'account AdMob esiste e il profilo pagamenti ha il conto dell'utente
      (lo conferma l'utente).
- [ ] `docs/PUBBLICITA.md` esiste e `docs/INDEX.md` lo elenca.
- [ ] Nel repository non c'è nessun dato personale: IBAN, codice fiscale,
      indirizzo, ID del publisher.

## File toccati

```
docs/PUBBLICITA.md
docs/INDEX.md
docs/STATUS.md
docs/tasks/TASK-150.md
```

## Fuori scope

- Gli ID veri nell'app, `app-ads.txt` e il consenso: TASK-153.
- L'App Store e l'account Apple Developer: TASK-152.
- Consigli fiscali: li dà il commercialista, non l'agente.
- Altre reti pubblicitarie oltre AdMob.

## Esito

*(si compila a fine task)*
