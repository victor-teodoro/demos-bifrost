var deviceName = getLocal('device-name')
var baudRate = getLocal('baud-rate')

function init () {
    getById('device-name').value = deviceName
    getById('baud-rate').value = baudRate
}

init()

function callWS () {
    const contextId = getById('context-id').value
    const wsWrap = new WebSocketWrap(contextId)

    setValues(wsWrap)

    const valid = validate(wsWrap)

    if (!valid) return

    wsWrap.call(wsWrap.listDevices, handleResponse)
}

function setValues (wsWrap) {
    wsWrap.amount = getById('amount').value;

    wsWrap.method =
	getById('credit').checked ? 'Credit' :
	getById('debit').checked ? 'Debit' :
	null

    wsWrap.installments = $('#installments').val();
}

function validate (wsWrap) {
    let message = ''
    let valid = true

    if (isNaN(wsWrap.amount) || wsWrap.amount <= 0) {
	message += '\n- Valor inválido'
	valid = false
    }

    if (wsWrap.method == null) {
	message += '\n- Método de pagamento não escolhido'
	valid = false
    }

    if (!valid) {
	showMessage('Erros:' + message)
    }

    return valid
}

function handleResponse (response) {
    const ws = this
    const wsWrap = ws.parent

    const responseJson = JSON.parse(response.data)

    switch (responseJson.response_type) {
	case wsWrap.response.devicesListed:
	    initialize(wsWrap, responseJson)
	    break

	case wsWrap.response.initialized:
	case wsWrap.response.alreadyInitialized:
	    wsWrap.process()
	    break

	case wsWrap.response.processed:
	    const acquirerResponse = sendToAcquirer(responseJson);
	    wsWrap.finish(acquirerResponse);	    
	    wsWrap.displayMessage("Trans. Aprovada!");
	    break

	case wsWrap.response.finished:
	    showMessage("Pagamento feito com sucesso");
	    break
	    
	case wsWrap.response.contextClosed:
	    break

	default:
	    wsWrap.closeContext()

	    const message = getEndingMessage(wsWrap, responseJson)
	    if (message) showMessage(message)

	    break
    }
}

function initialize (wsWrap, responseJson) {
    const encryptionKey = getById('encryption-key').value

    const deviceId = getDevice(wsWrap, responseJson)

    if (deviceId != null) {
	wsWrap.initialize(encryptionKey, deviceId, baudRate)
    }
}

function getDevice (wsWrap, responseJson) {
    const devices = responseJson.device_list

    for(let d = 0; d < devices.length; d++) {
	if (devices[d].name === deviceName) {
	    return devices[d].id
	}
    }

    showMessage('Dispositivo ' + deviceName + ' não encontrado')

    wsWrap.ws.close()
    wsWrap.close()

    return null
}

function sendToAcquirer(response) {
    console.log(response);
    let card_hash = response.process.card_hash;
    let amount = Number($('#amount').val())*100;
    let installments = $('#installments').val();

    $.post( "https://api.pagar.me/1/transactions",
	    {
		api_key: "ak_test_jUC8l5YGoIX34M8IMYSmG7Sd8YcUkH",
		amount: amount,
		installments: installments,
		card_hash: card_hash,
		soft_descriptor: "LojaFisica",
		metadata: {
		    "Filial": "Sao Paulo",
		    "Meio de Captura": "MPOS",
		    "Canal de Origem": "App de Autoatendimento",
		    "Promocao de Origem": "15% OFF - Carnaval"
		},
		split_rules: [
		    {
			recipient_id: "re_cj5ec35kw04g38c6ey9zu7jr0",
			liable: false,
			charge_processing_fee: true,
			percentage: "12"
		    },
		    {
			recipient_id: "re_cj5ec4prx04gu8c6epih6pm39",
			liable: true,
			charge_processing_fee: false,
			percentage: "88"
		    }
		]
	    }
    )
     .done(function(data) {
	 console.log(data);
     });
    
    return {
	response_code: '0000',
	emv_data: '000000000.0000'
    }
}

function getEndingMessage (wsWrap, responseJson) {
    switch (responseJson.response_type) {
	case wsWrap.response.error:
	    return responseJson.error

	case wsWrap.response.unknownCommand:
	    return 'Comando desconhecido'

	default:
	    return 'Resposta desconhecida'
    }
}
