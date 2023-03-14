import http from 'k6/http';
import { sleep } from 'k6';

const apiVersion = 'v1'


export function notificationsReceived(iun) {

	var bearerToken = `${__ENV.BEARER_TOKEN_USER1}`
  var envName = `${__ENV.ENV_NAME}`

	var url = `https://webapi.${envName}.pn.pagopa.it/delivery/notifications/received/${iun}`;
	var token = 'Bearer ' + bearerToken;
  
	console.log(`Url ${url}`);

	var params = {
		headers: {
		'Content-Type': 'application/json',
		'Authorization': token
    }
  };
  
  return http.get(url, params);
}