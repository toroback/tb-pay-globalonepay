# tb-payments-globalonepay

## **Instalación:**
  
Para utilizar los servicios de pago de GlobalOnePay es necesario tener instalada las librerías "tb-payments" y "tb-payments-globalonepay".

## **Configuración del servicio:**

### **- Configuración desde interfaz administrativa:** 

NO DISPONIBLE

### **- Configuración manual:**

La configuración manual se realiza en el archivo "config.json".

Para ello hay que añadir el objeto "paymentsOptions", si no se tenía anteriormente, y agregar un objeto cuya clave sea "globalOnePay" que contendrá la información necesaria para el servicio. Al completarlo, debería quedar de la siguiente manera:

```javascript
"paymentsOptions":{
  "globalOnePay":{
    "terminalId": "99089",
    "sharedSecret": "123456789XX",
    "mcp": true,
    "url": myServiceUrl,
    "port": myServicePort
  }
}
```


## **Ejemplos de uso:**
    
### **- Registrar una tarjeta:**

#### **• Código Javascript:**

**Parámetros:**

| Clave | Tipo | Opcional   | Descripción  |
|---|---|:---:|---|
|data|Object||Información de la tarjeta que se va a registrar|
|data.merchantRef|String||Identificador único para la tarjeta que se va a registrar| 
|data.cardNumber|String||Número de la tarjeta de crédito.|
|data.cardExpiry|String||Fecha de vencimiento de la tarjeta de crédito en formato "MMYY" (Ej:0920 -> "Septiembre de 2020").|
|data.cardType|String||Información de la tarjeta que se va a registrar.|
|data.cvv|String||Código de seguridad impreso en la tarjeta| 
|data.cardHolderName|String||Información de la tarjeta que se va a registrar.|

**Respuesta:**

| Clave | Tipo | Opcional | Descripción |
|---|---|:---:|---|
|register|Object||Objeto con la información de la tarjeta registrada|
|register.cardNumber|String||Número de tarjeta. Los números de tajerjeta se almacenan guardando los 4 ultimos digitos completando con asteriscos el resto|
|register.cardExpiry|String||Fecha de vencimiento de la tarjeta de crédito en formato "MMYY" (Ej:0920 -> "Septiembre de 2020").|
|register.cardHolderName|String||Nombre en la tarjeta de crédito.|
|register.regts|Date||Timestamp de la fecha de registro|
|register.regrespts|Date||Timestamp de le fecha de la respuesta del registro|
|register.reference|String||Referencia de la tarjeta registrada|
|register.active|Boolean||Flag que indica si la tarjeta está activa o no|
|register.originalResponse|Object||Respuesta original del registro|
|register.serviceProvider|String||Servicio de pagos utilizado para el registro|

```javascript
register({
  merchantRef:"1234567890123459",
  cardNumber:myCardNumber,
  cardExpiry:"1220",
  cardType:"MASTERCARD",
  cvv: "231",
  cardHolderName:"Messi"   
})
.then(resp=>{
 console.log("bien");
 console.log(resp);
})
.catch(err=>{
 console.log("Mal")
 console.error(err);
});
```

### **- Pago:**

#### **• Código Javascript:**

**Parámetros:**

| Clave | Tipo | Opcional   | Descripción  |
|---|---|:---:|---|
|data|Object||Información del pago que se va a realizar.|
|data.orderId|String||Identificador de la compra|
|data.amount|String||Valor de la compra|
|data.currency|String||Divisa en la que se va a realizar el pago|
|data.cardNumber|String||Número de la tarjeta de crédito|
|data.cardExpiry|String||Fecha de vencimiento de la tarjeta de crédito en formato "MMYY" (Ej:0920 -> "Septiembre de 2020").|
|data.cardType|String||Tipo de tarjeta de crédito (EJ: MASTERCARD).|
|data.cardHolderName|String||Nombre en la tarjeta de crédito.|
|data.cvv|String||Código secreto que aparece en la tarjeta|
|data.customerPostcode|String|X|Código postal del dueño de la tarjeta|
|data.customerCity|String|X|Ciudad del dueño de la tarjeta|
|data.customerRegion|String|X|Región del dueño de la tarjeta|
|data.customerCountry|String|X|País del dueño de la tarjeta en formato ISO 3166-1-alpha-2|
|data.customerAddress1|String|X|Dirección 1 del dueño de la tarjeta|
|data.customerAddress2|String|X|Dirección 2 del dueño de la tarjeta|
|data.customerPhone|String|X|Teléfono del cliente asociado a la tarjeta en formato internacional|
|data.description|String|X|Descripción de la transacción|
|data.ipAddress|String|X|Dirección IP desde la que se realiza la transacción|
|options|Object|X|Opciones extras relacionadas con el pago.|
|options.terminalType|String||Terminal Type del servicio|
|options.transactionType|String||Tipo de transacción del servicio|

**Respuesta:**

| Clave | Tipo | Opcional | Descripción |
|---|---|:---:|---|
|transaction|Object||Objeto con la información de la transacción|
|transaction.action|String||"pay" - Acción que se realiza en la transacción|
|transaction.orderId|String||Identificador de orden de la transacción|
|transaction.amount|Number||Cantidad de dinero de la transacción|
|transaction.currency|tString||ISO de la Moneda de la transacción|
|transaction.payReference|String||Referencia del pago que se utiliza en la transacción (Para devoluciones)|
|transaction.payTs|Date||Timestamp de la fecha en que se solicita la transacción |
|transaction.optional|Object||Información adicional relacionada con la transacción|
|transaction.cardNumber|String||Número de tarjeta o referencia de tarjeta registrada. Los números de tajerjeta se almacenan guardando los 4 ultimos digitos completando con asteriscos el resto y si es la referencia se guarda el numero completo|
|transaction.rPayReference|String||Número de referencia del pago o devolución de la transaccion realizada|
|transaction.rPayTs|Date||Timestamp de la fecha en que se realiza la transacción|
|transaction.rApproved|Boolean||Flag que indica si la transacción fue aprobada|
|transaction.rPaycode|String||Código de respuesta del estado de la transacción |
|transaction.respts|Date||Timestamp de la fecha en que se recibe la respuesta de la transacción|
|transaction.rApprovalCode|String||Código de aprovación de la transacción|
|transaction.rBankcode|String||Código de respuesta de la transacción proporcionado por el banco |
|transaction.rText|String||Texto de respuesta de la transacción|
|transaction.originalResponse|Object||Respuesta original del pago|
|transaction.serviceProvider|String||Servicio de pagos utilizado para el pago|

```javascript
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

### **- Pago con una tarjeta registrada:**

#### **• Código Javascript:**

**Parámetros:**

| Clave | Tipo | Opcional   | Descripción  |
|---|---|:---:|---|
|data|Object||Información del pago que se va a realizar. |
|data.orderId|String||Identificador de la compra|
|data.amount|String||Valor de la compra|
|data.currency|String||Divisa en la que se va a realizar el pago|
|data.cardNumber|String||Identificador de la tarjeta de crédito registrada|
|options|Object|X|Opciones extras relacionadas con el pago. |
|options.terminalType|String||Terminal Type del servicio|
|options.transactionType|String||Tipo de transacción del servicio|

**Respuesta:**

| Clave | Tipo | Opcional | Descripción |
|---|---|:---:|---|
|transaction|Object||Objeto con la información de la transacción|
|transaction.action|String||"pay" - Acción que se realiza en la transacción|
|transaction.orderId|String||Identificador de orden de la transacción|
|transaction.amount|Number||Cantidad de dinero de la transacción|
|transaction.currency|tString||ISO de la Moneda de la transacción|
|transaction.payReference|String||Referencia del pago que se utiliza en la transacción (Para devoluciones)|
|transaction.payTs|Date||Timestamp de la fecha en que se solicita la transacción |
|transaction.optional|Object||Información adicional relacionada con la transacción|
|transaction.cardNumber|String||Número de tarjeta o referencia de tarjeta registrada. Los números de tajerjeta se almacenan guardando los 4 ultimos digitos completando con asteriscos el resto y si es la referencia se guarda el numero completo|
|transaction.rPayReference|String||Número de referencia del pago o devolución de la transaccion realizada|
|transaction.rPayTs|Date||Timestamp de la fecha en que se realiza la transacción|
|transaction.rApproved|Boolean||Flag que indica si la transacción fue aprobada|
|transaction.rPaycode|String||Código de respuesta del estado de la transacción |
|transaction.respts|Date||Timestamp de la fecha en que se recibe la respuesta de la transacción|
|transaction.rApprovalCode|String||Código de aprovación de la transacción|
|transaction.rBankcode|String||Código de respuesta de la transacción proporcionado por el banco |
|transaction.rText|String||Texto de respuesta de la transacción|
|transaction.originalResponse|Object||Respuesta original del pago|
|transaction.serviceProvider|String||Servicio de pagos utilizado para el pago|

```javascript
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

### **- Devolución:**

#### **• Código Javascript:**

**Parámetros:**

| Clave | Tipo | Opcional   | Descripción  |
|---|---|:---:|---|
|data|Object||Información del pago que se va a realizar.|
|data.paymentRef|String||Referencia del pago del que se va a realizar la devolución|
|data.amount|String||Cantidad a devolver|
|options|Object|X|Opciones extras relacionadas con la devolución. |
|options.operator|String||Nombre de quien realiza la operacion|
|options.reason|String||Razón de la devolución|

**Respuesta:**

| Clave | Tipo | Opcional | Descripción |
|---|---|:---:|---|
|transaction|Object||Objeto con la información de la transacción|
|transaction.action|String||"refund" - Acción que se realiza en la transacción|
|transaction.orderId|String||Identificador de orden de la transacción|
|transaction.amount|Number||Cantidad de dinero de la transacción|
|transaction.currency|tString||ISO de la Moneda de la transacción|
|transaction.payReference|String||Referencia del pago que se utiliza en la transacción (Para devoluciones)|
|transaction.payTs|Date||Timestamp de la fecha en que se solicita la transacción |
|transaction.optional|Object||Información adicional relacionada con la transacción|
|transaction.cardNumber|String||Número de tarjeta o referencia de tarjeta registrada. Los números de tajerjeta se almacenan guardando los 4 ultimos digitos completando con asteriscos el resto y si es la referencia se guarda el numero completo|
|transaction.rPayReference|String||Número de referencia del pago o devolución de la transaccion realizada|
|transaction.rPayTs|Date||Timestamp de la fecha en que se realiza la transacción|
|transaction.rApproved|Boolean||Flag que indica si la transacción fue aprobada|
|transaction.rPaycode|String||Código de respuesta del estado de la transacción |
|transaction.respts|Date||Timestamp de la fecha en que se recibe la respuesta de la transacción|
|transaction.rText|String||Texto de respuesta de la transacción|
|transaction.originalResponse|Object||Respuesta original de la transacción|
|transaction.serviceProvider|String||Servicio de pagos utilizado para de la transacción|

```javascript
refund({
 paymentRef : "DG5Z3SB3QJ",
 amount     : "53"
},{
 operator: "Javier "
})
```
