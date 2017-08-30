var deviceName = getLocal('device-name');
var baudRate = getLocal('baud-rate');
let dadosDoProduto = null;
let purchaseType = {
    recurring: false,
    on_installments: false,
    all_now: false
};

function init () {
    getById('device-name').value = deviceName;
    getById('baud-rate').value = baudRate;

    $.get('https://solutions-api.herokuapp.com/dell')
	.done(function(data) {
	    console.log(data);
	    dadosDoProduto = data;
	    $('#product-image').attr('src',data.url);
	    $('#product-name').attr('value',data.name);
	    $('#amount').attr('value', (data.amount/100).toFixed(2));
	});
}

init();

function toggleInstallments() {
    if (document.getElementById('credit').checked) {
        document.getElementById('installments-paragraph').style.display = 'block';
    }
    else document.getElementById('installments-paragraph').style.display = 'none';
}

document.getElementById('recurring').onclick = function () {
    for(let method in purchaseType) {
	purchaseType[method] = false;
    }
    console.log(purchaseType);
    purchaseType.recurring = true;
    callWS ();
    return false; // stop the browser from following the link
};

document.getElementById('on_installments').onclick = function () {
    for(let method in purchaseType) {
	purchaseType[method] = false;
    }
    console.log(purchaseType);
    purchaseType.on_installments = true;
    callWS ();
    return false; // stop the browser from following the link
};

document.getElementById('all_now').onclick = function () {
    for(let method in purchaseType) {
	purchaseType[method] = false;
    }
    console.log(purchaseType);
    purchaseType.all_now = true;
    callWS ();
    return false; // stop the browser from following the link
};

function callWS () {    
    const contextId = getById('context-id').value
    const wsWrap = new WebSocketWrap(contextId)

    setValues(wsWrap)

    const valid = validate(wsWrap)

    if (!valid) return

    wsWrap.call(wsWrap.listDevices, handleResponse)
}

function setValues (wsWrap) {
     if(purchaseType.recurring === true){
	 wsWrap.amount = 400;
     }else if(purchaseType.on_installments === true){
	 wsWrap.amount = 518.66;
     }else if(purchaseType.all_now === true){
	 wsWrap.amount = 3112.00;
     }
     

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
    
    let transaction_json = {
	api_key: "ak_test_jUC8l5YGoIX34M8IMYSmG7Sd8YcUkH",
	card_hash: card_hash,	    
	soft_descriptor: "KrotonMatri",
	metadata: {
	    canalDeOrigem: "Totem de Matr�cula",
	    vestibular: "Novembro",
	    unidadeDeOrigem: "Anhanguera Belenzinho",
	    unidadeDoVestibular: "Anhanguera Brigadeiro"
	},
	split_rules: [
	    {
		"recipient_id": "re_cj6y7psp800bpil6dhmzph9at",
		"charge_processing_fee": false,
		"liable": false,
		"percentage": 0
	    },
	    {
		"recipient_id": "re_cj6y7qwiw03p8i76dutv4xrsn",
		"charge_processing_fee": true,
		"liable": true,
		"percentage": 100
	    }
	]
    };

    if(purchaseType.recurring === true) {
	transaction_json.amount = 40000; 
    } else if(purchaseType.on_installments === true) {
	transaction_json.amount = 311200;
	transaction_json.installments = 6;
    } else if(purchaseType.all_now === true) {
	transaction_json.amount = 311200; 
    }
    
    let subscription_json = {
	api_key: "ak_test_jUC8l5YGoIX34M8IMYSmG7Sd8YcUkH",
	plan_id: 203440,
	card_id: null,
	customer: {
	    email: "victor.teodoro@pagar.me"
	},
	soft_descriptor: "KrotonMatri",
	metadata: {
	    canalDeOrigem: "Totem de Matr�cula",
	    vestibular: "Novembro",
	    unidadeDeOrigem: "Anhanguera Belenzinho",
	    unidadeDoVestibular: "Anhanguera Brigadeiro"
	},
	split_rules: [
	    {
		"recipient_id": "re_cj6y7psp800bpil6dhmzph9at",
		"charge_processing_fee": false,
		"liable": false,
		"percentage": 0
	    },
	    {
		"recipient_id": "re_cj6y7qwiw03p8i76dutv4xrsn",
		"charge_processing_fee": true,
		"liable": true,
		"percentage": 100
	    }
	]
    };

    $.post( "https://api.pagar.me/1/transactions", transaction_json)
	.done(function(data) {
	    console.log(data);
	    if(purchaseType.recurring === true) {
		subscription_json.card_id = data.card.id
		$.post( "https://api.pagar.me/1/subscriptions", subscription_json)
		    .done(function(data) {
			console.log(data);
		    });
	    }
	});
    
    
    return {
	response_code: '0000',
	emv_data: '000000000.0000'
    }
}

function transaction(transaction_json) {
    
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
