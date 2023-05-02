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
