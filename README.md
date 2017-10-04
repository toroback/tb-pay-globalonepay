# tb-payments-globalonepay

#### - **Instalación:**
  
  Para utilizar los servicios de pago de GlobalOnePay es necesario tener instalada las librerías "tb-payments" y "tb-payments-globalonepay".


#### - **Configuración del servicio:**

  + **Configuración desde A2Server:** 

    NO DISPONIBLE

  + **Configuración manual:**

    La configuración manual se realiza en el archivo "config.json".

    Para ello hay que añadir el objeto "paymentsOptions", si no se tenía enteriormente, y agregar un objeto cuya clave sea "globalonepay" que contendrá la información necesaria para el servicio. Al completarlo, debería quedar de la siguiente manera:

    ```
    "paymentsOptions":{
      "globalonepay":{
        "merchandt": "12343219",
        "terminalId": "99089",
        "sharedSecret": "123456789XX"
      }
    }
    ```


#### - **Ejemplos de uso:**
    
  - Registrar una tarjeta:

    ```
    register({
     cardNumber:demoCreditCard.MasterCard,
     cardExpiry:"1220",
     cardType:"MASTERCARD",
     cardHolderName:"Messi"  
    })
    .then(resp=>{
     console.log("bieen");
     console.log(resp);
    })
    .catch(err=>{
     console.log("Mal")
     console.error(err);
    });
    ```

  - Pago:

    ```
    pay({
     orderId        : "19827391827392",
     amount         : "289",
     currency       : "USD",
     cardNumber     : demoCreditCard.MasterCard,
     cardType       : "MASTERCARD",
     cardExpiry     : "1220",
     cardHolderName : "Messi" ,
     cvv            : "124" 
    })
    .then(resp=>{
     console.log("bieen");
     console.log(resp);
    })
    .catch(err=>{
     console.log("Mal")
     console.error(err);
    });
    ```

  - Pago con una tarjeta registrada:

    ```
    payRegistered({
     orderId        : "19827391827393",
     amount         : "289",
     currency       : "USD",
     cardNumber     : "2967535088608700"
    })
    .then(resp=>{
     console.log("bieen");
     console.log(resp);
    })
    .catch(err=>{
     console.log("Mal")
     console.error(err);
    });
    ```

  - Devolución:

    ```
    refund({
     paymentRef : "DG5Z3SB3QJ",
     amount     : "53"
    },{
     operator: "Javier "
    })
    ```
