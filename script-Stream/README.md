"# pn-load-test" 

## Comando per eseuire lo script di avvio degli Stream in locale:
- eseguire il comando
```
   node stream.js API_KEY BASE_PATH FILE_NAME WRITE_MODE NUMBER_OF_STREAM TYPE_OF_STREAM

   Sostituendo:
   API_KEY con la corretta apikey 
   BASE_PATH con il corretto base path
   FILE_NAME con il nome scelto per il file
   WRITE_MODE con append o create in base al fatto che si voglia concatenare al file esistente o creare un nuovo file 
   NUMBER_OF_STREAM con il numero di stream che si desidera creare
   TYPE_OF_STREAM STATUS OR TIMELINE

```

## Per eseuire lo script di validazione degli Stream in locale:
- eseguire il comando
```
   node validate.js DYNAMO_FILE_PATH STREAM_FILE_PATH TYPE_OF_STREAM

   Sostituendo:
   DYNAMO_FILE_PATH con il path del file contenente le timeline estratte da dynamo
   STREAM_FILE_PATH con il path del file contenente le timeline estratte dallo stream
   TYPE_OF_STREAM STATUS OR TIMELINE

```

