"# pn-load-test" 

## Comando per lanciare i test di carico in locale:
- eseguire il comando
```
    k6 run ^
    --log-format json ^ OPZIONALE (utile per metriche in output su file)
    TestName.js ^
    --out json=result-tming.json ^ OPZIONALE (utile per metriche in output su file)
    --http-debug="full" ^ OPZIONALE (utile per metriche http estese in output su file/console)
    -e ENV_NAME=envName  ^
    -e WITH_GROUP=si ^ OPZIONALE**
    -e WITH_PAYMENT=si ^ OPZIONALE**
    -e PA_TAX_ID= Codice_Fiscale_PA ^
    -e BEARER_TOKEN_PA= tokenPA ^
    -e API_KEY= apiKeyPa ^
    -e TAX_ID_USER1=Codice_Fiscale_Utente_1 ^
    -e TAX_ID_USER2=Codice_Fiscale_Utente_2  ^
    -e BEARER_TOKEN_USER1= token_User_1 ^
    -e BEARER_TOKEN_USER2= token_User_2 ^
    -e TEST_TYPE= testType ^
    --console-output=console-output.txt ^ OPZIONALE (utile per metriche in output su file)
    --log-output=file=http-output.json OPZIONALE (utile per metriche in output su file)


```
sostituendo ad envName il nome dell'ambiente su cui eseguire i test [dev,svil,coll...] ed ad apikey il valore dell'apikey per l'ambiente selezionato e a BEARER_TOKEN_ i token relativi.

TEST_TYPE può essere valorizzato con 
[fixedRate,load,loadFixedRate,localTest,rampingVu,smoke,soak,spike,spikeFixedRate,stress...] 
(file disponibili nella cartalle modules/test-types. N.B. non è necessario specificare l'estensione ".json")

TestName.js deve essere valorizzato con il nome del file di test da eseguire: 
[DeliverySendNotification.js,DeliveryGetNotification.js,DeliveryGetNotificationStatus.js,DeliveryGetNotificationWeb.js...] (file disponibili e consultabili nella cartella src del progetto)

** I parametri WITH_GROUP e WITH_PAYMENT se presenti causeranno l'invio di una notifica rispettivamente con gruppo e con pagamento (con conseguente upload del file collegato) per escludere uno o entrambi di queste comportamenti è sufficiente non inserire il parametro nel comando di avvio

Parametro ONLY_PRELOAD_URL: Per i soli test SafeStorage.js e SafeStorageDirectTest.js è possibile specificare il parametro ONLY_PRELOAD_URL (-e ONLY_PRELOAD_URL=si) per effettuare un test che preveda la sola richiesta di presigned url.

## Eventi di pagamento pagoPA (PN-20853) - PaymentEventsTest.js
Pubblica eventi di pagamento sul topic Kafka dei pagamenti tramite il mock Kafka di pn-external-channels
(`POST /external-channels/v1/kafka/payment`); gli eventi vengono poi elaborati da pn-kafka-bridge, pn-notification-cost-service e delivery-push (PAYMENT_NOTICE_PAID).
Il mock non è esposto sull'API Gateway: si raggiunge solo dall'ALB interno dell'ambiente (porta 8080), quindi l'URL va passato con `EXTERNAL_CHANNELS_BASE_URL`.
```
    k6 run src/PaymentEventsTest.js ^
    -e TEST_TYPE=paymentEventsSmoke ^
    -e EXTERNAL_CHANNELS_BASE_URL=http://localhost:8887 ^
    -e IUV_FILE=./resources/PaymentEventsIUV.txt ^ OPZIONALE (default ./resources/PaymentEventsIUV.txt, relativo a src/)
    -e AMOUNT=1000 OPZIONALE (eurocent; se assente il mock usa 1000)
```
- In locale e negli ambienti condivisi usare solo `paymentEventsSmoke` (shared-iterations, 20 chiamate in tutto). I profili di carico vanno lanciati solo nella finestra e nell'ambiente concordati.
- Da locale serve un tunnel SSM verso l'ALB interno core, ad esempio:
  `aws ssm start-session --profile <profilo core> --region eu-south-1 --target <bastion> --document-name AWS-StartPortForwardingSessionToRemoteHost --parameters host="<alb interno core>",portNumber="8080",localPortNumber="8887"`.
  Da CodeBuild (dentro la VPC) si usa direttamente `http://<alb interno core>:8080`.
- Dataset: un IUV per riga (o separati da `;`) nel formato SEND `<creditorTaxId>##<noticeCode>` (11 + 18 cifre), cioè la `pk` di `pn-PaymentInfo` dell'ambiente di test, usati a rotazione. Lo script si ferma se trova righe malformate.
- Profili: `paymentEventsSmoke` (20 chiamate, 1 VU), `paymentEventsFirstIteration` (10 eventi/s per 10 minuti) e `paymentEventsRamp` (10 → 92 → 140 → 200 eventi/s, 73 minuti, circa 623 mila eventi).
- Protezioni: il test si interrompe se il mock ha disattivato la connessione a Kafka (lo script non la riattiva mai) e, nei profili di carico, quando errori, p99 o iterazioni scartate superano le soglie.
- Metriche custom: `payment_events_published` (con tag `partition`), `code_success`, `code_badrequest`, `code_iserror`, `code_serviceunavailable`, `code_other`.
