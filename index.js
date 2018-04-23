/** 
 * @module tb-payments-globalonepay
 *
 * @description 
 *
 * <p>
 * Módulo que permite realizar pagos, registro de tarjetas de crédito y devoluciones a través del servicio GlobalObePay. Este servicio se utiliza a través del módulo <b>tb-payments</b>
 * <p>
 * 
 * @see [Guía de uso]{@tutorial tb-payments-globalonepay} para más información.
 * @see [REST API]{@link module:tb-payments/routes} (API externo).
 * @see [Class API]{@link module:tb-payments-globalonepay.Adapter} (API interno).
 * @see Repositorio en {@link https://github.com/toroback/tb-payments-globalonepay|GitHub}.
 * </p>
 * 
 */



var request = require('request');
var moment  = require('moment');
var md5     = require('md5');
var xml     = require('xml');
var parseString = require('xml2js').parseString;

var defaultUrl = "https://testpayments.globalone.me/merchant/xmlpayment";
var defaultPort = 443;

var SERVICE_PROVIDER_NAME = "globalOnePay";

// var url;
// var port;

/**
 * Adaptador del servicio GlobalOnePay
 * @memberOf module:tb-payments-globalonepay
 */
class Adapter{
  /**
   * Crea un adaptador de GlobalOnePay
   * @param  {Object} client                         Objeto con la informacion para crear el adaptador.
   * @param  {Object} client.options                 Objeto con las credenciales para el servicio.
   * @param  {Object} client.options.terminalId      TerminalID para GlobalOnePay
   * @param  {Object} client.options.sharedSecret    SharedSecret para GlobalOnePay
   * @param  {Object} [client.options.url]           URL para el servicio de pagos
   * @param  {Object} [client.options.port]          Puerto para el servicio de pagos
   * @param  {Object} [client.options.mcp]           Indica si se soportan múltiples monedas
   */
  constructor(client){
    this.client = client;
    this.credential = {
      // Merchandt       : client.options.merchandt,
      TerminalID      : client.options.terminalId,
      SharedSecret    : client.options.sharedSecret
      // appSecret   : client.options.appSecret,
      // accessToken : client.options.accessToken,
      // timeout     : client.options.timeout || 1000
    }

    this.url = client.options.url || defaultUrl;
    this.port = client.options.port || defaultPort;
    this.multiCurrency = client.options.mcp == true;
  }

  ///////////-------------Lib------------------------------
  //Register a credit card
  //parameters
  //   cardNumber:demoCreditCard.MasterCard,
  //   cardExpiry:"1220",
  //   cardType:"MASTERCARD",
  //   cardHolderName:"Messi"  
  /**
   * Registra una tarjeta de credito
   * @param  {Object} data Información de la tarjeta a registrar.
   * @param  {String} data.merchantRef Identificador para la tarjeta de crédito. 
   * @param  {String} data.cardNumber Número de la tarjeta de crédito.
   * @param  {String} data.cardExpiry Fecha de vencimiento de la tarjeta de crédito en formato "MMYY" (Ej:0920 -> "Septiembre de 2020").
   * @param  {String} data.cardType  Tipo de tarjeta de crédito (EJ: MASTERCARD).
   * @param  {String} data.cardHolderName Nombre en la tarjeta de crédito.
   * @param  {String} data.cvv CVV de la tarjeta de crédito.
   * @return {Promise<PaymentRegisterSchema>} Promesa con la información del registro
   */
  register(data) {
    return new Promise((resolve, reject)=>{
      let regts = new Date();
      var dateTime =  moment.utc(regts).format("DD-MM-YYYY:HH:mm:ss:SSS");
      var hash     =  hashData([
        this.credential.TerminalID,
        data.merchantRef,
        dateTime,
        data.cardNumber,
        data.cardExpiry,
        data.cardType,
        data.cardHolderName,
        this.credential.SharedSecret
      ]);

      // console.log("Register data" , data);
      // console.log("Generated hash" , hash);
      var payload  = {
        "SECURECARDREGISTRATION":[
            // {"MERCHANTREF"    : this.credential.Merchandt},
            {"MERCHANTREF"    : data.merchantRef},
            {"TERMINALID"     : this.credential.TerminalID},
            {"DATETIME"       : dateTime},
            {"CARDNUMBER"     : data.cardNumber},
            {"CARDEXPIRY"     : data.cardExpiry},
            {"CARDTYPE"       : data.cardType},
            {"CARDHOLDERNAME" : data.cardHolderName},
            {"HASH"           : hash}
          ]
      }
      if(data.cvv){
        payload.SECURECARDREGISTRATION.push({"CVV" : data.cvv});
      }
      // console.log("entra en payments.register globalonepay", payload)
      req(this.url, this.port, xml(payload, { declaration: true }))
      .then(resp=>{
       // console.log(resp);
        console.log("globalonepay register resp", JSON.stringify(resp));
        if (resp.ERROR){
          //manejar la situacion con error code
          reject(createError(resp.ERROR));
          //{ ERROR: { ERRORCODE: [ 'E08' ], ERRORSTRING: [ 'INVALID MERCHANTREF' ] } }
          //{ ERROR: { ERRORCODE: [ 'E13' ], ERRORSTRING: [ 'INVALID HASH' ] } }
          //{ ERROR: { ERRORCODE: [ 'E10' ], ERRORSTRING: [ 'INVALID CARDNUMBER' ] } }
        }else {
          //Guardar en bd
          //verificar md5

          let registration = {
            reference: resp.SECURECARDREGISTRATIONRESPONSE.CARDREFERENCE[0],
            cardHolderName: data.cardHolderName,
            cardExpiry: data.cardExpiry,
            cardNumber: hideCardNumber(data.cardNumber),
            regts: moment.utc(resp.SECURECARDREGISTRATIONRESPONSE.DATETIME[0], 'DD-MM-YYYY:HH:mm:ss:SSS').toDate(),//regts,
            regrespts: moment.utc(new Date()).toDate(),
            active: true,
            serviceProvider : SERVICE_PROVIDER_NAME,
            originalResponse: resp
          }

          resolve(registration);
        }
      })
      .catch(err=>{
        //MANEJAR ERROR
        reject(err);
      })    
    })
  }

  /**
   * Desregistra una tarjeta de credito. 
   * @param  {Object} data Información de la tarjeta a desregistrar. La información dependerá del servicio a utilizar.
   * @param  {String} data.merchantRef Identificador personal de la tarjeta de crédito que se va a desregistrar.
   * @param  {String} data.reference Referencia de GlobalOnePay de la tarjeta de crédito registrada. 
   * @return {Promise<PaymentRegisterSchema>} Promesa que indica si se desregistró correctamente
   */
  unregister(data){
    return new Promise((resolve, reject)=>{
      let unregts = new Date();
      var dateTime =  moment.utc(unregts).format("DD-MM-YYYY:HH:mm:ss:SSS");
      var hash     =  hashData([this.credential.TerminalID,data.merchantRef,dateTime,data.reference,this.credential.SharedSecret]);
      // console.log("Generated hash" , hash);
      var payload  = {
        "SECURECARDREMOVAL":[
            // {"MERCHANTREF"    : this.credential.Merchandt},
            {"MERCHANTREF"    : data.merchantRef},
            {"CARDREFERENCE"  : data.reference},
            {"TERMINALID"     : this.credential.TerminalID},
            {"DATETIME"       : dateTime},
            {"HASH"           : hash}
          ]
      }
      // console.log("entra en payments.unregister globalonepay", payload)
      req(this.url, this.port, xml(payload, { declaration: true }))
        .then(resp=>{
         // console.log(resp);
          console.log("globalonepay unregister resp", JSON.stringify(resp));
          if (resp.ERROR){
            //manejar la situacion con error code
            reject(createError(resp.ERROR));
            //{ ERROR: { ERRORCODE: [ 'E08' ], ERRORSTRING: [ 'INVALID MERCHANTREF' ] } }
            //{ ERROR: { ERRORCODE: [ 'E13' ], ERRORSTRING: [ 'INVALID HASH' ] } }
            //{ ERROR: { ERRORCODE: [ 'E10' ], ERRORSTRING: [ 'INVALID CARDNUMBER' ] } }
          }else {
            //Guardar en bd
            //verificar md5

            let unregistration = {
              unregts: moment.utc(resp.SECURECARDREMOVALRESPONSE.DATETIME[0], 'DD-MM-YYYY:HH:mm:ss:SSS').toDate(),
              reference: data.reference,
              unregrespts: moment.utc(new Date()).toDate(),
              active: false,
              serviceProvider : SERVICE_PROVIDER_NAME,
              originalResponse: resp
            }

            resolve(unregistration);
          }
        })
        .catch(err=>{
          //MANEJAR ERROR
          reject(err);
        })    
    });
  }

  //Pay direct with credit card
  // data.orderId        : ,
  // data.amount         : ,
  // data.currency       : ,
  // data.cardNumber     : ,
  // data.cardType       : ,
  // data.cardExpiry     : ,
  // data.cardHolderName : ,
  // data.cvv            : 
  /**
   * Realiza un pago
   * @param  {Object} data Información del pago que se va a realizar. La información dependerá del servicio a utilizar.
   * @param  {String} data.orderId Identificador de la compra
   * @param  {String} data.amount  Valor de la compra
   * @param  {String} data.currency  Divisa en la que se va a realizar el pago
   * @param  {String} data.cardNumber Número de la tarjeta de crédito.
   * @param  {String} data.cardExpiry Fecha de vencimiento de la tarjeta de crédito en formato "MMYY" (Ej:0920 -> "Septiembre de 2020").
   * @param  {String} data.cardType  Tipo de tarjeta de crédito (EJ: MASTERCARD).
   * @param  {String} data.cardHolderName Nombre en la tarjeta de crédito.
   * @param  {[String]} data.cvv Código secreto que aparece en la tarjeta
   *
   * @param  {[String]} data.customerPostcode Código postal del dueño de la tarjeta
   * @param  {[String]} data.customerCity Ciudad del dueño de la tarjeta
   * @param  {[String]} data.customerRegion Región del dueño de la tarjeta
   * @param  {[String]} data.customerCountry País del dueño de la tarjeta en formato ISO 3166-1-alpha-2
   * @param  {[String]} data.customerAddress1 Dirección 1 del dueño de la tarjeta
   * @param  {[String]} data.customerAddress2 Dirección 2 del dueño de la tarjeta
   * @param  {[String]} data.customerPhone Teléfono del cliente asociado a la tarjeta en formato internacional
   * @param  {[String]} data.description Descripción de la transacción
   * @param  {[String]} data.ipAddress Dirección IP desde la que se realiza la transacción
   * 
   * @param  {Object} [options] Opciones extras relacionadas con el pago. La información dependerá del servicio a utilizar.
   * @param  {String} options.terminalType Terminal Type de GlobalOnePay
   * @param  {String} options.transactionType Tipo de transacción de GlobalOnePay
   * @return {Promise<TransactionSchema>} Promesa con la información de la transacción
   */
  pay(data, options){
    var options = options || {}
    return new Promise((resolve, reject)=>{
      let payTs    =  new Date();
      var dateTime =  moment.utc(payTs).format("DD-MM-YYYY:HH:mm:ss:SSS");
      var hash     =  hashData([this.credential.TerminalID,
        data.orderId,
        (this.multiCurrency ? data.currency : ""), //Sólo hay que mandarlo si el TerminalId es multy-currency
        data.amount,
        dateTime,
        this.credential.SharedSecret]);

      options.terminalType    = options.terminalType    || "2"
      options.transactionType = options.transactionType || "7"
      var payload = {
        "PAYMENT" :[
          {"ORDERID"        : data.orderId},
          {"TERMINALID"     : this.credential.TerminalID},
          {"AMOUNT"         : data.amount},
          {"DATETIME"       : dateTime},
          {"CARDNUMBER"     : data.cardNumber},
          {"CARDTYPE"       : data.cardType},
          {"CARDEXPIRY"     : data.cardExpiry},
          {"CARDHOLDERNAME" : data.cardHolderName},
          {"HASH"           : hash},
          {"CURRENCY"       : data.currency},
          {"TERMINALTYPE"   : options.terminalType},
          {"TRANSACTIONTYPE": options.transactionType}
        ]
      }

      if(data.cvv) payload.PAYMENT.push({"CVV" : data.cvv});

      if(data.customerPostcode) payload.PAYMENT.push({"POSTCODE" : data.customerPostcode});
      if(data.customerCity) payload.PAYMENT.push({"CITY" : data.customerCity});
      if(data.customerRegion) payload.PAYMENT.push({"REGION" : data.customerRegion});
      if(data.customerCountry) payload.PAYMENT.push({"COUNTRY" : data.customerCountry});
      if(data.customerAddress1) payload.PAYMENT.push({"ADDRESS1" : data.customerAddress1});
      if(data.customerAddress2) payload.PAYMENT.push({"ADDRESS2" : data.customerAddress2});
      if(data.customerPhone) payload.PAYMENT.push({"PHONE" : data.customerPhone});
      if(data.description) payload.PAYMENT.push({"DESCRIPTION" : data.description});
      if(data.ipAddress) payload.PAYMENT.push({"IPADDRESS" : data.ipAddress});

      req(this.url, this.port, xml(payload, { declaration: true }))
      .then(resp=>{
        console.log("globalonepay pay resp", JSON.stringify(resp));
       
        if (resp.ERROR){
          //manejar la situacion con error code
          reject(createError(resp.ERROR));
          //{ ERROR: { ERRORCODE: [ 'E08' ], ERRORSTRING: [ 'INVALID MERCHANTREF' ] } }
        }else {
          //Guardar en bd
          //verificar md5
          let transaction = {
            action          : 'pay',
            orderId         : data.orderId,
            amount          : data.amount, 
            currency        : data.currency,
            payTs           : payTs,
            optional        : options, 
            cardNumber      : hideCardNumber(data.cardNumber),
            rPayReference   : resp.PAYMENTRESPONSE.UNIQUEREF[0],
            rPayTs          : moment.utc(resp.PAYMENTRESPONSE.DATETIME[0], 'YYYY-MM-DDTHH:mm:ss').toDate(),
            rApproved       : resp.PAYMENTRESPONSE.RESPONSECODE[0] == 'A',
            rPaycode        : resp.PAYMENTRESPONSE.RESPONSECODE[0],
            rText           : resp.PAYMENTRESPONSE.RESPONSETEXT[0],
            rApprovalCode   : (resp.PAYMENTRESPONSE.APPROVALCODE[0] || undefined), //Si es cadena vacía se guarda undefined
            rBankcode       : resp.PAYMENTRESPONSE.BANKRESPONSECODE[0],
            respts          : new Date(),
            serviceProvider : SERVICE_PROVIDER_NAME,
            originalResponse: resp
          };

          resolve(transaction);
          // { PAYMENTRESPONSE: 
          //    { UNIQUEREF: [ 'I3R9T0B7QR' ],
          //      RESPONSECODE: [ 'A' ],
          //      RESPONSETEXT: [ 'APPROVAL' ],
          //      APPROVALCODE: [ '475318' ],
          //      DATETIME: [ '2017-10-01T12:58:26' ],
          //      AVSRESPONSE: [ 'X' ],
          //      CVVRESPONSE: [ 'M' ],
          //      HASH: [ '4ae930ef7e98895925ce1f11fb8f2a6e' ] } }        
        }
      })
      .catch(err=>{
        //MANEJAR ERROR
        reject(err);
      })    
    })
  }


  //Pago con tarjeta registrada
  // data.orderId
  // data.amount
  // data.cardNumber
  // data.currency
  /**
   * Realiza un pago con una tarjeta de crédito previamente registrada
   * @param  {Object} data Información del pago que se va a realizar. La información dependerá del servicio a utilizar.
   * @param  {String} data.orderId Identificador de la compra
   * @param  {String} data.amount  Valor de la compra
   * @param  {String} data.currency  Divisa en la que se va a realizar el pago
   * @param  {String} data.cardNumber Identificador de la tarjeta de crédito registrada
   * @param  {Object} [options] Opciones extras relacionadas con el pago. La información dependerá del servicio a utilizar.
   * @param  {String} options.terminalType Terminal Type de GlobalOnePay
   * @param  {String} options.transactionType Tipo de transacción de GlobalOnePay
   * @return {Promise<TransactionSchema>} Promesa con la información de la transacción
   */
  payRegistered(data, options){
    var options = options || {}
    return new Promise((resolve, reject)=>{
      
      let payTs    =  new Date();
      var dateTime =  moment.utc(payTs).format("DD-MM-YYYY:HH:mm:ss:SSS");
      var hash     = hashData([
        this.credential.TerminalID,
        data.orderId,
        (this.multiCurrency ? data.currency : ""),
        data.amount,
        dateTime,
        this.credential.SharedSecret
      ]);

      options.terminalType    = options.terminalType    || "2";
      options.transactionType = options.transactionType || "7"; 
      var payload = {
        "PAYMENT" :[
          {"ORDERID"        : data.orderId},
          {"TERMINALID"     : this.credential.TerminalID},
          {"AMOUNT"         : data.amount},
          {"DATETIME"       : dateTime},
          {"CARDNUMBER"     : data.cardNumber},
          {"CARDTYPE"       : "SECURECARD"},
          {"HASH"           : hash},
          {"CURRENCY"       : data.currency},
          {"TERMINALTYPE"   : options.terminalType},
          {"TRANSACTIONTYPE": options.transactionType}
        ]
      }  

      req(this.url, this.port, xml(payload, { declaration: true }))
      .then(resp=>{
        console.log("globalonepay pay registered resp", JSON.stringify(resp));
        if (resp.ERROR){
          //manejar la situacion con error code
          reject(createError(resp.ERROR));
          //{ ERROR: { ERRORCODE: [ 'E08' ], ERRORSTRING: [ 'INVALID MERCHANTREF' ] } }
        }else {
          //Guardar en bd
          //verificar md5
          let transaction = {
            action          : 'pay',
            orderId         : data.orderId,
            amount          : data.amount, 
            currency        : data.currency,
            payTs           : payTs,
            optional        : options, 
            cardNumber      : data.cardNumber,
            rPayReference   : resp.PAYMENTRESPONSE.UNIQUEREF[0],
            rPayTs          : moment.utc(resp.PAYMENTRESPONSE.DATETIME[0], 'YYYY-MM-DDTHH:mm:ss').toDate(),
            rApproved       : resp.PAYMENTRESPONSE.RESPONSECODE[0] == 'A',
            rPaycode        : resp.PAYMENTRESPONSE.RESPONSECODE[0],
            rText           : resp.PAYMENTRESPONSE.RESPONSETEXT[0],
            rApprovalCode   : (resp.PAYMENTRESPONSE.APPROVALCODE[0] || undefined), //Si es cadena vacía se guarda undefined
            rBankcode       : resp.PAYMENTRESPONSE.BANKRESPONSECODE[0],
            respts          : new Date(),
            serviceProvider : SERVICE_PROVIDER_NAME,
            originalResponse: resp
          };

          resolve(transaction);
          // { PAYMENTRESPONSE: 
          //    { UNIQUEREF: [ 'I3R9T0B7QR' ],
          //      RESPONSECODE: [ 'A' ],
          //      RESPONSETEXT: [ 'APPROVAL' ],
          //      APPROVALCODE: [ '475318' ],
          //      DATETIME: [ '2017-10-01T12:58:26' ],
          //      AVSRESPONSE: [ 'X' ],
          //      CVVRESPONSE: [ 'M' ],
          //      HASH: [ '4ae930ef7e98895925ce1f11fb8f2a6e' ] } }        
        }
      })
      .catch(err=>{
        //MANEJAR ERROR
        reject(err);
      })    
    })
  }


  //funcionpara hacer un refund de un pago
  // data.paymentRef},
  // data.amount},
  // options.operator},
  // options.reason }
  /**
   * Realiza una devolución
   * @param  {Object} data Información de la devolución que se va a realizar. La información dependerá del servicio a utilizar.
   * @param  {String} data.paymentRef  Referencia del pago del que se va a realizar la devolución
   * @param  {String} data.amount      Cantidad a devolver
   * @param  {Object} [options] Opciones extras relacionadas con la devolución.
   * @param  {String} [options.operator]  Nombre de quien realiza la operacion
   * @param  {String} [options.reason]    Razón de la devolución
   * @return {Promise<TransactionSchema>} Promesa con la información de la transacción
   */
  refund(data, options){

    var options = options || {}
    return new Promise((resolve, reject)=>{
      let payTs    =  new Date();
      var dateTime =  moment.utc(payTs).format("DD-MM-YYYY:HH:mm:ss:SSS");
      var hash     =  hashData([this.credential.TerminalID,data.paymentRef,data.amount,dateTime,this.credential.SharedSecret]);

      options.operator = options.operator || "UNKNOW"
      options.reason   = options.reason   || "UNKNOW"  
      var payload = {
        "REFUND" :[
          {"UNIQUEREF"      : data.paymentRef},
          {"TERMINALID"     : this.credential.TerminalID},
          {"AMOUNT"         : data.amount},
          {"DATETIME"       : dateTime},
          {"HASH"           : hash},
          {"OPERATOR"       : options.operator},
          {"REASON"         : options.reason }
        ]
      }  

      // console.log("refund payload -> ", payload);
      req(this.url, this.port, xml(payload, { declaration: true }))
      .then(resp=>{
        console.log("globalonepay refund resp", JSON.stringify(resp));
        if (resp.ERROR){
          //manejar la situacion con error code
          reject(createError(resp.ERROR));
          //{ ERROR: { ERRORCODE: [ 'E08' ], ERRORSTRING: [ 'INVALID MERCHANTREF' ] } }
          //{ ERROR: { ERRORSTRING: [ 'Invalid UNIQUEREF field' ] } }
        }else {
          //Guardar en bd
          //verificar md5

          let transaction = {
            action          : 'refund',
            payReference    : data.paymentRef,
            amount          : data.amount, 
            currency        : data.currency,
            payTs           : payTs,
            optional        : options, 
            rPayReference   : resp.REFUNDRESPONSE.UNIQUEREF[0],
            rPayTs          : moment.utc(resp.REFUNDRESPONSE.DATETIME[0], 'DD-MM-YYYY:HH:mm:ss:SSS').toDate(),
            rApproved       : resp.REFUNDRESPONSE.RESPONSECODE[0] == 'A',
            rPaycode        : resp.REFUNDRESPONSE.RESPONSECODE[0],
            rText           : resp.REFUNDRESPONSE.RESPONSETEXT[0],
            respts          : new Date(),
            serviceProvider : SERVICE_PROVIDER_NAME,
            originalResponse: resp
          };
          resolve(transaction);
          // { RESPONSECODE: [ 'A' ],
          //   RESPONSETEXT: [ 'SUCCESS' ],
          //   UNIQUEREF: [ 'IZBPMUSXLA' ],
          //   DATETIME: [ '02-10-2017:06:35:33:099' ],
          //   HASH: [ '129301558fc8e8797c8cf5b5911d05d2' ] }
        }
      })
      .catch(err=>{
        //MANEJAR ERROR
        reject(err);
      })    
    })
  }


}

function hideCardNumber(cardNumber){
  return "**********"+cardNumber.substring(cardNumber.length-4);
}

function req(url, port, payload){
  return new Promise((resolve, reject)=>{
    request.post({
      url:  url,
      port: port,
      method:"POST",
      headers:{
          'Content-Type': 'application/xml',
      },
       body: payload
    },
    (error, response, body)=> {
      if (error) reject(error);
      else{
        parseString(body, (err, result) =>{
          if (error) reject(error);
          else resolve(result);
        });         
      }
    });
  })
}

function hashData(partsArray){
  return md5(partsArray.join(''));
}

function createError(errorInfo){
  var PaymentsError = require('./model/paymentsError');

  var error =  new PaymentsError( (errorInfo.ERRORCODE ? errorInfo.ERRORCODE[0] : 0), errorInfo.ERRORSTRING[0] );
  return error;
}

module.exports = Adapter;