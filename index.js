var request = require('request');
var moment  = require('moment');
var md5     = require('md5');
var xml     = require('xml');
var parseString = require('xml2js').parseString;

var defaultUrl = "https://testpayments.globalone.me/merchant/xmlpayment";
var defaultPort = 80;
var url;
var port;

/**
 * GlobalOnePay Adapter 
 * @class
 */
class Adapter{
  constructor(client){
    this.client = client;
    this.credential = {
      Merchandt       : client.options.merchandt,
      TerminalID      : client.options.terminalId,
      SharedSecret    : client.options.sharedSecret
      // appSecret   : client.options.appSecret,
      // accessToken : client.options.accessToken,
      // timeout     : client.options.timeout || 1000
    }

    this.url = client.options.url || defaultUrl;
    this.port = client.options.port || defaultPort;
  }

  ///////////-------------Lib------------------------------
  //Register a credit card
  //parameters
  //   cardNumber:demoCreditCard.MasterCard,
  //   cardExpiry:"1220",
  //   cardType:"MASTERCARD",
  //   cardHolderName:"Messi"  
  register(data) {
    return new Promise((resolve, reject)=>{
      let regts = new Date();
      var dateTime =  moment(regts).format("DD-MM-YYYY:hh:mm:ss:SSS");
      var hash     =  md5(this.credential.TerminalID+this.credential.Merchandt+dateTime+data.cardNumber+data.cardExpiry+data.cardType+data.cardHolderName+this.credential.SharedSecret)
      console.log("Generated hash" , hash);
      var payload  = {
        "SECURECARDREGISTRATION":[
            {"MERCHANTREF"    : this.credential.Merchandt},
            {"TERMINALID"     : this.credential.TerminalID},
            {"DATETIME"       : dateTime},
            {"CARDNUMBER"     : data.cardNumber},
            {"CARDEXPIRY"     : data.cardExpiry},
            {"CARDTYPE"       : data.cardType},
            {"CARDHOLDERNAME" : data.cardHolderName},
            {"HASH"           : hash}
          ]
      }
      console.log("entra en payments.register globalonepay", payload)
      req(this.url, this.port, xml(payload, { declaration: true }))
      .then(resp=>{
       // console.log(resp);
        console.log("globalonepay register resp", resp);
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
            regts: regts,
            respts: new Date()
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



  //Pay direct with credit card
  // data.orderId        : ,
  // data.amount         : ,
  // data.currency       : ,
  // data.cardNumber     : ,
  // data.cardType       : ,
  // data.cardExpiry     : ,
  // data.cardHolderName : ,
  // data.cvv            : 

  pay(data, options){
    var options = options || {}
    return new Promise((resolve, reject)=>{
      let payTs    =  new Date();
      var dateTime =  moment(payTs).format("DD-MM-YYYY:hh:mm:ss:SSS");
      var hash     =  md5(this.credential.TerminalID+data.orderId+data.amount+dateTime+this.credential.SharedSecret)

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
          {"TRANSACTIONTYPE": options.transactionType},
          {"CVV"            : data.cvv}
        ]
      }

      req(this.url, this.port, xml(payload, { declaration: true }))
      .then(resp=>{
        console.log("globalonepay pay resp", resp);
       
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
            rPayTs          : moment(resp.PAYMENTRESPONSE.DATETIME[0], 'YYYY-MM-DDThh:mm:ss').toDate(),
            rApproved       : resp.PAYMENTRESPONSE.RESPONSECODE[0] == 'A',
            rPaycode        : resp.PAYMENTRESPONSE.RESPONSECODE[0],
            respts          : new Date()
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
  payRegistered(data, options){
    var options = options || {}
    return new Promise((resolve, reject)=>{
      let payTs    =  new Date();
      var dateTime =  moment(payTs).format("DD-MM-YYYY:hh:mm:ss:SSS");
      var hash     =  md5(this.credential.TerminalID+data.orderId+data.amount+dateTime+this.credential.SharedSecret)
        options.terminalType    = options.terminalType    || "2"
        options.transactionType = options.transactionType || "7"  
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
        console.log("globalonepay pay registered resp", resp);
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
            rPayTs          : moment(resp.PAYMENTRESPONSE.DATETIME[0], 'YYYY-MM-DDThh:mm:ss').toDate(),
            rApproved       : resp.PAYMENTRESPONSE.RESPONSECODE[0] == 'A',
            rPaycode        : resp.PAYMENTRESPONSE.RESPONSECODE[0],
            respts          : new Date()
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
  refund(data, options){

    var options = options || {}
    return new Promise((resolve, reject)=>{
      let payTs    =  new Date();
      var dateTime =  moment(payTs).format("DD-MM-YYYY:hh:mm:ss:SSS");
      var hash     =  md5(this.credential.TerminalID+data.paymentRef+data.amount+dateTime+this.credential.SharedSecret)
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

      req(this.url, this.port, xml(payload, { declaration: true }))
      .then(resp=>{
        console.log("globalonepay refund resp", resp);
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
            rPayTs          : moment(resp.REFUNDRESPONSE.DATETIME[0], 'DD-MM-YYYY:hh:mm:ss:SSS').toDate(),
            rApproved       : resp.REFUNDRESPONSE.RESPONSECODE[0] == 'A',
            rPaycode        : resp.REFUNDRESPONSE.RESPONSECODE[0],
            respts          : new Date()
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


function createError(errorInfo){
  return new Error( {code: (errorInfo.ERRORCODE ? errorInfo.ERRORCODE[0] : 0), msg: errorInfo.ERRORSTRING[0]} );
}

module.exports = Adapter;