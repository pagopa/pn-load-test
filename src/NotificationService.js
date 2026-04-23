import { check } from 'k6';
import exec from 'k6/execution';
import http from 'k6/http';

/**
 * Notification Service Class
 * Handles building and sending notification requests with single or multiple recipients
 */
export class NotificationService {
    constructor(config) {
        this.basePath = config.basePath;
        this.apiKey = config.apiKey;
        this.paTaxId = config.paTaxId;
        this.withGroup = config.withGroup;
        this.withPayment = config.withPayment;
        this.moreAttach = config.moreAttach;
        this.randomAddress = config.randomAddress;
        this.notificationRequest = config.notificationRequest;
        this.notificationDocument = config.notificationDocument;
        this.internalPreloadFile = config.internalPreloadFile;
        this.sha256 = null;
    }

    setSha256(value) {
        this.sha256 = value;
    }

    /**
     * List of 15 fixed recipients for multi-recipient notifications
     */
    getMultiRecipientsList() {
        return [
            {
                "recipientType": "PF",
                "taxId": "GRBGPP87L04L741X",
                "denomination": "Giuseppe Maria Garibaldi",
                "physicalAddress": {
                    "at": "Presso",
                    "address": "VIA @OK_AR",
                    "addressDetails": "",
                    "zip": "20019",
                    "municipality": "SETTIMO MILANESE",
                    "municipalityDetails": "",
                    "province": "MI",
                    "foreignState": "ITALIA"
                },
                "payments": [
                    {
                        "pagoPa": {
                            "noticeCode": "302010124463200000",
                            "creditorTaxId": "77777777777",
                            "applyCost": true,
                            "attachment": {
                                "digests": {"sha256": "1QKD/Ks6BohyQ+bgMxHf9NrpNhVmGUPxRYE1aerU4JQ="},
                                "contentType": "application/pdf",
                                "ref": {"key": "PN_NOTIFICATION_ATTACHMENTS-7c0c0fae8a254b01a77db753687095dc.pdf", "versionToken": "pfDiOl.4qDNG7jY3srbq6abmk__Ajq23"}
                            }
                        }
                    }
                ]
            },
            {
                "recipientType": "PF",
                "taxId": "GTTRNT80T25F205T",
                "denomination": "Renato Guttuso",
                "physicalAddress": {"at": "Presso", "address": "VIA @FAIL-DISCOVERYIRREPERIBILE_AR", "addressDetails": "", "zip": "20019", "municipality": "SETTIMO MILANESE", "municipalityDetails": "", "province": "MI", "foreignState": "ITALIA"},
                "payments": [{"pagoPa": {"noticeCode": "302010124463200001", "creditorTaxId": "77777777777", "applyCost": true, "attachment": {"digests": {"sha256": "1QKD/Ks6BohyQ+bgMxHf9NrpNhVmGUPxRYE1aerU4JQ="}, "contentType": "application/pdf", "ref": {"key": "PN_NOTIFICATION_ATTACHMENTS-7c0c0fae8a254b01a77db753687095dc.pdf", "versionToken": "pfDiOl.4qDNG7jY3srbq6abmk__Ajq23"}}}}]
            },
            {
                "recipientType": "PF",
                "taxId": "LVLDAA85T50G702B",
                "denomination": "Ada Lovelace",
                "physicalAddress": {"at": "Presso", "address": "VIA @FAIL_AR", "addressDetails": "", "zip": "20019", "municipality": "SETTIMO MILANESE", "municipalityDetails": "", "province": "MI", "foreignState": "ITALIA"},
                "payments": [{"pagoPa": {"noticeCode": "302010124463200002", "creditorTaxId": "77777777777", "applyCost": true, "attachment": {"digests": {"sha256": "1QKD/Ks6BohyQ+bgMxHf9NrpNhVmGUPxRYE1aerU4JQ="}, "contentType": "application/pdf", "ref": {"key": "PN_NOTIFICATION_ATTACHMENTS-7c0c0fae8a254b01a77db753687095dc.pdf", "versionToken": "pfDiOl.4qDNG7jY3srbq6abmk__Ajq23"}}}}]
            },
            {
                "recipientType": "PF",
                "taxId": "DRCGNN12A46A326K",
                "denomination": "Giovanna D'arco",
                "physicalAddress": {"at": "Presso", "address": "VIA @FAIL-IRREPERIBILE_AR", "addressDetails": "", "zip": "20019", "municipality": "SETTIMO MILANESE", "municipalityDetails": "", "province": "MI", "foreignState": "ITALIA"},
                "payments": [{"pagoPa": {"noticeCode": "302010124463200003", "creditorTaxId": "77777777777", "applyCost": true, "attachment": {"digests": {"sha256": "1QKD/Ks6BohyQ+bgMxHf9NrpNhVmGUPxRYE1aerU4JQ="}, "contentType": "application/pdf", "ref": {"key": "PN_NOTIFICATION_ATTACHMENTS-7c0c0fae8a254b01a77db753687095dc.pdf", "versionToken": "pfDiOl.4qDNG7jY3srbq6abmk__Ajq23"}}}}]
            },
            {
                "recipientType": "PF",
                "taxId": "NRELCU76E25L219L",
                "denomination": "Lucia Neri",
                "physicalAddress": {"at": "Presso", "address": "VIA @FAIL-DISCOVERY_AR", "addressDetails": "", "zip": "20019", "municipality": "SETTIMO MILANESE", "municipalityDetails": "", "province": "MI", "foreignState": "ITALIA"},
                "payments": [{"pagoPa": {"noticeCode": "302010124463200004", "creditorTaxId": "77777777777", "applyCost": true, "attachment": {"digests": {"sha256": "1QKD/Ks6BohyQ+bgMxHf9NrpNhVmGUPxRYE1aerU4JQ="}, "contentType": "application/pdf", "ref": {"key": "PN_NOTIFICATION_ATTACHMENTS-7c0c0fae8a254b01a77db753687095dc.pdf", "versionToken": "pfDiOl.4qDNG7jY3srbq6abmk__Ajq23"}}}}]
            },
            {
                "recipientType": "PF",
                "taxId": "BNCMTT76E25L219S",
                "denomination": "Matteo Bianchi",
                "physicalAddress": {"at": "Presso", "address": "VIA @OK-GIACENZA_AR", "addressDetails": "", "zip": "20019", "municipality": "SETTIMO MILANESE", "municipalityDetails": "", "province": "MI", "foreignState": "ITALIA"},
                "payments": [{"pagoPa": {"noticeCode": "302010124463200005", "creditorTaxId": "77777777777", "applyCost": true, "attachment": {"digests": {"sha256": "1QKD/Ks6BohyQ+bgMxHf9NrpNhVmGUPxRYE1aerU4JQ="}, "contentType": "application/pdf", "ref": {"key": "PN_NOTIFICATION_ATTACHMENTS-7c0c0fae8a254b01a77db753687095dc.pdf", "versionToken": "pfDiOl.4qDNG7jY3srbq6abmk__Ajq23"}}}}]
            },
            {
                "recipientType": "PF",
                "taxId": "RSSMLE80H14A944I",
                "denomination": "Emilio Rossi",
                "physicalAddress": {"at": "Presso", "address": "VIA @FAIL-GIACENZA_AR", "addressDetails": "", "zip": "20019", "municipality": "SETTIMO MILANESE", "municipalityDetails": "", "province": "MI", "foreignState": "ITALIA"},
                "payments": [{"pagoPa": {"noticeCode": "302010124463200006", "creditorTaxId": "77777777777", "applyCost": true, "attachment": {"digests": {"sha256": "1QKD/Ks6BohyQ+bgMxHf9NrpNhVmGUPxRYE1aerU4JQ="}, "contentType": "application/pdf", "ref": {"key": "PN_NOTIFICATION_ATTACHMENTS-7c0c0fae8a254b01a77db753687095dc.pdf", "versionToken": "pfDiOl.4qDNG7jY3srbq6abmk__Ajq23"}}}}]
            },
            {
                "recipientType": "PF",
                "taxId": "RSSVNT80H54A944A",
                "denomination": "Valentina Rossi",
                "physicalAddress": {"at": "Presso", "address": "VIA OK-GIACENZA-GT10_AR", "addressDetails": "", "zip": "20019", "municipality": "SETTIMO MILANESE", "municipalityDetails": "", "province": "MI", "foreignState": "ITALIA"},
                "payments": [{"pagoPa": {"noticeCode": "302010124413200007", "creditorTaxId": "77777777777", "applyCost": true, "attachment": {"digests": {"sha256": "1QKD/Ks6BohyQ+bgMxHf9NrpNhVmGUPxRYE1aerU4JQ="}, "contentType": "application/pdf", "ref": {"key": "PN_NOTIFICATION_ATTACHMENTS-7c0c0fae8a254b01a77db753687095dc.pdf", "versionToken": "pfDiOl.4qDNG7jY3srbq6abmk__Ajq23"}}}}]
            },
            {
                "recipientType": "PF",
                "taxId": "NREVNT80H54A944I",
                "denomination": "Valentina Neri",
                "physicalAddress": {"at": "Presso", "address": "VIA @FAIL-GIACENZA-GT10_AR", "addressDetails": "", "zip": "20019", "municipality": "SETTIMO MILANESE", "municipalityDetails": "", "province": "MI", "foreignState": "ITALIA"},
                "payments": [{"pagoPa": {"noticeCode": "302010124461200008", "creditorTaxId": "77777777777", "applyCost": true, "attachment": {"digests": {"sha256": "1QKD/Ks6BohyQ+bgMxHf9NrpNhVmGUPxRYE1aerU4JQ="}, "contentType": "application/pdf", "ref": {"key": "PN_NOTIFICATION_ATTACHMENTS-7c0c0fae8a254b01a77db753687095dc.pdf", "versionToken": "pfDiOl.4qDNG7jY3srbq6abmk__Ajq23"}}}}]
            },
            {
                "recipientType": "PF",
                "taxId": "NREMRN79H14A944K",
                "denomination": "Marino Neri",
                "physicalAddress": {"at": "Presso", "address": "VIA @FAIL-COMPIUTAGIACENZA_AR", "addressDetails": "", "zip": "20019", "municipality": "SETTIMO MILANESE", "municipalityDetails": "", "province": "MI", "foreignState": "ITALIA"},
                "payments": [{"pagoPa": {"noticeCode": "302010124463200009", "creditorTaxId": "77777777777", "applyCost": true, "attachment": {"digests": {"sha256": "1QKD/Ks6BohyQ+bgMxHf9NrpNhVmGUPxRYE1aerU4JQ="}, "contentType": "application/pdf", "ref": {"key": "PN_NOTIFICATION_ATTACHMENTS-7c0c0fae8a254b01a77db753687095dc.pdf", "versionToken": "pfDiOl.4qDNG7jY3srbq6abmk__Ajq23"}}}}]
            },
            {
                "recipientType": "PF",
                "taxId": "GLLNGL79H54A944E",
                "denomination": "Angela Gialli",
                "physicalAddress": {"at": "Presso", "address": "VIA @OK-RETRY_AR", "addressDetails": "", "zip": "20019", "municipality": "SETTIMO MILANESE", "municipalityDetails": "", "province": "MI", "foreignState": "ITALIA"},
                "payments": [{"pagoPa": {"noticeCode": "302010124463200010", "creditorTaxId": "77777777777", "applyCost": true, "attachment": {"digests": {"sha256": "1QKD/Ks6BohyQ+bgMxHf9NrpNhVmGUPxRYE1aerU4JQ="}, "contentType": "application/pdf", "ref": {"key": "PN_NOTIFICATION_ATTACHMENTS-7c0c0fae8a254b01a77db753687095dc.pdf", "versionToken": "pfDiOl.4qDNG7jY3srbq6abmk__Ajq23"}}}}]
            },
            {
                "recipientType": "PF",
                "taxId": "GLLVCN79H14A944A",
                "denomination": "Vincenzo Gialli",
                "physicalAddress": {"at": "Presso", "address": "VIA @OK-NONRENDICONTABILE_AR", "addressDetails": "", "zip": "20019", "municipality": "SETTIMO MILANESE", "municipalityDetails": "", "province": "MI", "foreignState": "ITALIA"},
                "payments": [{"pagoPa": {"noticeCode": "302010124461200111", "creditorTaxId": "77777777777", "applyCost": true, "attachment": {"digests": {"sha256": "1QKD/Ks6BohyQ+bgMxHf9NrpNhVmGUPxRYE1aerU4JQ="}, "contentType": "application/pdf", "ref": {"key": "PN_NOTIFICATION_ATTACHMENTS-7c0c0fae8a254b01a77db753687095dc.pdf", "versionToken": "pfDiOl.4qDNG7jY3srbq6abmk__Ajq23"}}}}]
            },
            {
                "recipientType": "PF",
                "taxId": "GLLGPP79H14H501X",
                "denomination": "Giuseppe Gialli",
                "physicalAddress": {"at": "Presso", "address": "VIA @OK-CAUSAFORZAMAGGIORE_AR", "addressDetails": "", "zip": "20019", "municipality": "SETTIMO MILANESE", "municipalityDetails": "", "province": "MI", "foreignState": "ITALIA"},
                "payments": [{"pagoPa": {"noticeCode": "302010124463200012", "creditorTaxId": "77777777777", "applyCost": true, "attachment": {"digests": {"sha256": "1QKD/Ks6BohyQ+bgMxHf9NrpNhVmGUPxRYE1aerU4JQ="}, "contentType": "application/pdf", "ref": {"key": "PN_NOTIFICATION_ATTACHMENTS-7c0c0fae8a254b01a77db753687095dc.pdf", "versionToken": "pfDiOl.4qDNG7jY3srbq6abmk__Ajq23"}}}}]
            },
            {
                "recipientType": "PF",
                "taxId": "RSSLGU79B14H501K",
                "denomination": "Luigi Rossi",
                "physicalAddress": {"at": "Presso", "address": "VIA @OK_AR-CON020-7Z1P", "addressDetails": "", "zip": "20019", "municipality": "SETTIMO MILANESE", "municipalityDetails": "", "province": "MI", "foreignState": "ITALIA"},
                "payments": [{"pagoPa": {"noticeCode": "302010124463200013", "creditorTaxId": "77777777777", "applyCost": true, "attachment": {"digests": {"sha256": "1QKD/Ks6BohyQ+bgMxHf9NrpNhVmGUPxRYE1aerU4JQ="}, "contentType": "application/pdf", "ref": {"key": "PN_NOTIFICATION_ATTACHMENTS-7c0c0fae8a254b01a77db753687095dc.pdf", "versionToken": "pfDiOl.4qDNG7jY3srbq6abmk__Ajq23"}}}}]
            },
            {
                "recipientType": "PF",
                "taxId": "NRELGU79B14H501S",
                "denomination": "Luigi Neri",
                "physicalAddress": {"at": "Presso", "address": "VIA @OK_AR_ZIP", "addressDetails": "", "zip": "20019", "municipality": "SETTIMO MILANESE", "municipalityDetails": "", "province": "MI", "foreignState": "ITALIA"},
                "payments": [{"pagoPa": {"noticeCode": "302010124462600014", "creditorTaxId": "77777777777", "applyCost": true, "attachment": {"digests": {"sha256": "1QKD/Ks6BohyQ+bgMxHf9NrpNhVmGUPxRYE1aerU4JQ="}, "contentType": "application/pdf", "ref": {"key": "PN_NOTIFICATION_ATTACHMENTS-7c0c0fae8a254b01a77db753687095dc.pdf", "versionToken": "pfDiOl.4qDNG7jY3srbq6abmk__Ajq23"}}}}]
            }
        ];
    }

    /**
     * Build and send a notification request
     * @param recipients - Array of recipient objects
     * @param withPayment - Whether to include payment info
     * @returns HTTP response
     */
    buildAndSendNotificationRequest(recipients, withPayment = false) {
        let requestCopy = JSON.parse(JSON.stringify(this.notificationRequest));
        
        let resultPreload = this.internalPreloadFile();
        requestCopy.documents[0].ref.key = resultPreload.key;
        requestCopy.documents[0].digests.sha256 = this.sha256;

        // Set recipients
        requestCopy.recipients = JSON.parse(JSON.stringify(recipients));

        // Handle additional documents
        if(this.moreAttach && this.moreAttach !== 'undefined') {
            for(let i = 1; i <= this.moreAttach; i++){
                let preloadDocument = this.internalPreloadFile(false,i);
                let docCopy = JSON.parse(JSON.stringify(this.notificationDocument));
                docCopy.ref.key = preloadDocument.key;
                docCopy.digests.sha256 = this.sha256;
                docCopy.title = 'TEST_PDF_'+i;
                requestCopy.documents[i] = docCopy;
            }
        }

        // Handle payments if needed and provided
        if(withPayment && withPayment !== 'undefined') {
            for(let i = 0; i < requestCopy.recipients.length; i++) {
                if(requestCopy.recipients[i].payments && requestCopy.recipients[i].payments.length > 0) {
                    // Payments are already included in recipients, just update attachment reference if needed
                    let paymentAttachPreload = this.internalPreloadFile();
                    requestCopy.recipients[i].payments[0].pagoPa.attachment.digests.sha256 = this.sha256;
                    requestCopy.recipients[i].payments[0].pagoPa.attachment.ref.key = paymentAttachPreload.key;
                }
            }
        }

        // Handle groups
        let params = {
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': this.apiKey
            },
        };

        if(this.withGroup && this.withGroup !== 'undefined') {
            let gruopUrl = `https://${this.basePath}/ext-registry-b2b/pa/v1/groups?metadataOnly=true`;
            let groupList = JSON.parse((http.get(gruopUrl, params)).body);
            console.log(JSON.stringify(groupList));
            let group = groupList.find((elem) => elem.status === 'ACTIVE');
            requestCopy.group = group.id;
        }

        requestCopy.senderTaxId = this.paTaxId;
        requestCopy.paProtocolNumber = ("2023" + (((exec.scenario.iterationInTest+''+exec.vu.idInTest+''+(Math.floor(Math.random() * 9999999))).substring(0,7) +''+ new Date().getTime().toString().substring(0,13)).padStart(20, '0').substring(0, 20)));

        console.log('paprotocol: '+requestCopy.paProtocolNumber);
        let url = `https://${this.basePath}/delivery/v2.5/requests`;
        let payload = JSON.stringify(requestCopy);

        console.log('notificationRequest: '+JSON.stringify(requestCopy));

        let r = http.post(url, payload, params);

        console.log(`Status ${r.status}`);

        check(r, {
            'status is 409': (r) => r.status === 409,
        });

        check(r, {
            'status is 202': (r) => r.status === 202,
        });
        
        console.log('REQUEST-ID-LOG: '+r.body)

        if (r.status === 403) {
            // throttling.add(1);
            console.log('Throttling response detected');
        }

        return r;
    }

    /**
     * Send notification with single recipient (original behavior)
     * @param recipientTaxId - Tax ID for the recipient
     * @param recipientAddress - Address for the recipient
     * @param addressNumber - Address number
     * @returns HTTP response
     */
    sendSingleRecipientNotification(recipientTaxId, recipientAddress, addressNumber) {
        let recipients = JSON.parse(JSON.stringify(this.notificationRequest.recipients));
        
        recipients[0].taxId = recipientTaxId;
        recipients[0].physicalAddress.address = recipientAddress;
        recipients[0].physicalAddress.at = 'VIALE C. COLOMBO '+addressNumber;
        console.log('ADDRESS: '+recipients[0].physicalAddress.at);
        recipients[0].physicalAddress.address = 'VIALE C. COLOMBO '+addressNumber;
        recipients[0].physicalAddress.zip = '87100';
        recipients[0].physicalAddress.municipality = 'Cosenza';
        recipients[0].physicalAddress.municipalityDetails = 'Cosenza';
        recipients[0].physicalAddress.province = 'CS';

        return this.buildAndSendNotificationRequest(recipients, this.withPayment);
    }

    /**
     * Send notification with multiple recipients (15 fixed recipients)
     * @returns HTTP response
     */
    sendMultiRecipientNotification() {
        return this.buildAndSendNotificationRequest(this.getMultiRecipientsList(), false);
    }
}
