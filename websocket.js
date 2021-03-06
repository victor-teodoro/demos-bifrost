var WebSocketWrap = function (contextId) {
  this.contextId = contextId

  this.response = {
    unknownCommand: 0,
    devicesListed: 1,
    initialized: 2,
    alreadyInitialized: 3,
    processed: 4,
    finished: 5,
    messageDisplayed: 6,
    status: 7,
    contextClosed: 8,
    error: 9,
  }

  this.request = {
    listDevices: 1,
    initialize: 2,
    process: 4,
    finish: 5,
    displayMessage: 6,
    status: 7,
    closeContext: 8,
  }

  this.amount = 0
  this.method = null
  this.ws = null

  this.call = function (onopen, onmessage) {
    if ('WebSocket' in window) {
      this.ws = new WebSocket('wss://localhost:2000/mpos')

      this.ws.parent = this
      this.ws.onopen = onopen
      this.ws.onmessage = onmessage
      this.ws.onclose = this.close
      this.ws.onerror = this.error

      this.parent = this
    } else {
      showMessage('WebSocket NÃO suportado neste navegador')
    }
  }

  this.close = function () {
  }

  this.error = function () {
    showMessage('Endereço "' + this.url + '" não encontrado ou desconectado. Verifique se o serviço está rodando e se o protocolo usado é o correto.')
    this.close()
  }

  this.listDevices = function () {
    const request = {
      request_type: this.parent.request.listDevices,
      context_id: this.parent.contextId,
    }

    this.parent.sendMessage(request)
  }

  this.initialize = function (encryptionKey, deviceId, baudRate, simpleInitialize, timeoutMilliseconds) {
    const request = {
      request_type: this.request.initialize,
      context_id: this.contextId,
      initialize: {
        device_id: deviceId,
        encryption_key: encryptionKey,
        baud_rate: baudRate,
        simple_initialize: simpleInitialize,
        timeout_milliseconds: timeoutMilliseconds,
      }
    }

    this.sendMessage(request)
  }

  this.process = function () {
    const request = {
      request_type: this.request.process,
      context_id: this.contextId,
      process: {
        amount: this.amount * 100,
        magstripe_payment_method: this.method
      }
    }

    this.sendMessage(request)
  }

  this.finish = function (response) {
    const request = {
      request_type: this.request.finish,
      context_id: this.contextId,
      finish: {
        success: true,
        response_code: response.response_code,
        emv_data: response.emv_data
      }
    }

      this.sendMessage(request);
  }

  this.displayMessage = function (text) {
    const request = {
      request_type: this.request.displayMessage,
      context_id: this.contextId,
      display_message: {
        message: text
      }
    }

    this.sendMessage(request)
  }

  this.closeContext = function () {
    const request = {
      request_type: this.parent.request.closeContext,
      context_id: this.parent.contextId,
    }

    this.parent.sendMessage(request)
  }

  this.sendMessage = function (request) {
    const message = JSON.stringify(request)
    this.ws.send(message)
  }
}
