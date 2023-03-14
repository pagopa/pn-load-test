"# pn-load-test" 

## Comando per lanciare i test di carico in locale:
- eseguire il comando
```
    docker run --rm -i -e ENV_NAME=envName -e API_KEY=apiKey -e TEST_TYPE=testType grafana/k6 run - <src/ScriptName.js

    /** IN ALTERNATIVA **\

    k6 run ScriptName.js -e ENV_NAME=envName -e API_KEY=apiKey -e TEST_TYPE=testType

```
sostiuendo ad envName il nome dell'ambiente su cui eseguire i test [dev,svil,coll...] ed ad apikey il valore dell'apikey per l'ambiente selezionato
