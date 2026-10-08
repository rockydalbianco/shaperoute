# PUBBLICITÀ — Gli annunci e i soldi sul conto

> Come gli annunci di Sgrava diventano un bonifico sul conto dell'utente.
> Scritto con TASK-150; gli annunci nell'app sono ADR-0102 (TASK-132), gli
> annunci veri TASK-153. Le regole di Google cambiano: i fatti qui sotto
> sono controllati il 2026-10-02 sulle pagine linkate, da ricontrollare
> prima di ogni passo importante.

## Oggi

Dal 2026-10-05 gli annunci stanno nel **Feed**: un annuncio nativo AdMob
che somiglia a un post, con l'etichetta «Sponsored», ogni 5 post
(ADR-0198, TASK-235). Ha preso il posto dell'annuncio a schermo intero
all'inizio della ricerca (ADR-0102, TASK-132 e TASK-166). Solo in una
build propria; in Expo Go nessun annuncio. Sono gli **annunci di prova di
Google**: non guadagnano. Per quelli veri servono l'account AdMob con il
profilo pagamenti (questo documento), l'app sull'App Store (TASK-152) e gli
ID veri (TASK-153). L'unità da creare in AdMob è quindi di tipo **nativo**
(«Nativo avanzato»), non interstitial. L'ID dell'app iOS dell'utente è in
`apps/mobile/app.json` da TASK-166.

## Come paga Google

- Si guadagna per annuncio visto o toccato. Una ricerca con annuncio vale
  pochi centesimi o meno: conta quante persone usano l'app.
- Ogni mese, il 3, i guadagni del mese prima diventano definitivi.
- Se il 20 il saldo supera la **soglia di 70 €**, intorno al 21 parte un
  **bonifico** sul conto del profilo pagamenti; arriva in qualche giorno,
  fino a una decina. Sotto soglia, il saldo passa al mese dopo.
- Intorno ai **10 $** di guadagni Google chiede di confermare l'identità
  (un documento, entro 45 giorni) e manda per posta un **PIN** per
  verificare l'indirizzo: 4 mesi per inserirlo, altrimenti i pagamenti si
  bloccano.
- Secondo il paese chiede anche **dati fiscali**, come il modulo per gli
  Stati Uniti (W-8BEN per una persona, W-8BEN-E per una ditta).
- Paga Google, con le sue regole fiscali per l'Italia: come si
  documentano quei pagamenti lo dice il commercialista (sotto).

Fonti: [soglie di pagamento](https://support.google.com/admob/answer/2772208),
[pagamenti e transazioni](https://support.google.com/admob/answer/2772140),
[i passi per essere pagati](https://support.google.com/admob/checklist/2998383).

## I passi, in ordine

L'ordine conta: **il tipo di account (persona o ditta) non si cambia dopo**
averlo creato; per cambiarlo si chiude l'account e se ne apre un altro
([guida della community di AdMob](https://support.google.com/admob/community-guide/290490939/clarifying-admob-account-types)).

1. **Commercialista**: le domande qui sotto, prima di creare l'account.
2. **Persona o ditta**: la sceglie l'utente, dopo il commercialista.
   Conviene lo stesso titolare per AdMob e per l'account Apple Developer
   (TASK-152). Una ditta paga intestato alla ditta e può dare accesso ad
   altri; una persona paga intestato a sé.
3. **Account AdMob**: lo crea l'utente con il suo account Google. Indirizzo
   postale = dove arriverà il PIN. Prima di confermare: paese, fuso orario
   e valuta (EUR).
4. **Profilo pagamenti**: nome uguale a quello dell'intestatario del conto;
   IBAN e dati fiscali li inserisce l'utente su AdMob.
5. **Verifiche**: identità e PIN quando Google li chiede.
6. **Annunci veri**: TASK-152 (App Store) e TASK-153 (ID veri,
   `app-ads.txt`, consenso). Prima di questo l'account non guadagna.
7. **Primo pagamento**: il 21 del mese dopo quello in cui il saldo
   supera i 70 €.

## Persona adesso, partita IVA dopo

Scelta dell'utente del 2026-10-02 (TASK-150): l'account AdMob, e quello
Apple Developer di TASK-152, si aprono come **persona**; la partita IVA si
apre quando arrivano i guadagni. Cosa comporta:

- I pagamenti arrivano sul conto personale dell'utente, intestati a lui.
- Anche senza partita IVA i guadagni si dichiarano: come, lo dice il
  commercialista (domanda 1 e 4 qui sotto).
- Quando si apre la partita IVA, chiedere al commercialista se l'account
  AdMob da persona può restare così. Se serve un account da ditta, Google
  non cambia il tipo: si apre un account nuovo e l'app va ricollegata
  (nuovi ID, TASK-153 da rifare in piccolo).
- Segnale per chiamare il commercialista: i primi pagamenti regolari, o il
  saldo che supera la soglia più mesi di fila.

## Domande per il commercialista

L'agente non dà consigli fiscali: queste sono le domande da portare.

1. I ricavi pubblicitari di un'app, pagati ogni mese da Google (Google
   Ireland), si possono ricevere come persona fisica senza partita IVA?
   Da quale importo o frequenza serve la partita IVA? Il regime
   forfettario va bene?
2. Se c'è già una ditta o una società, conviene intestare a lei l'account
   AdMob e l'account Apple Developer?
3. Come si documentano i pagamenti di Google: fattura, autofattura, IVA con
   inversione contabile («reverse charge»)? Serve l'iscrizione al VIES?
4. Contributi INPS e dichiarazione dei redditi: cosa cambia, e da quando?
5. Il modulo fiscale per gli Stati Uniti che chiede Google: W-8BEN
   (persona) o W-8BEN-E (ditta)? Va indicato il trattato Italia–USA?
6. Le spese dell'app (Apple Developer 99 $ l'anno, server, dominio) si
   possono dedurre?

## Cosa non va mai nel repository

IBAN, codice fiscale o partita IVA, indirizzo, documento, PIN, ID del
publisher AdMob (`pub-…`) se non dove TASK-153 lo prevede. Nel task file si
scrive solo «fatto» o «in attesa».

## Dove si vedono i guadagni

Nell'app AdMob o su admob.google.com: «Home» per la stima di oggi,
«Payments» per saldo, transazioni e pagamenti. Se un pagamento è fermo, la
pagina «Payments» dice il motivo («payment hold»): di solito un PIN, un
documento o i dati fiscali che mancano.
