console.log("Payments Error file");
class PaymentsError extends Error {
  constructor(paymentCode, ...params) {
    console.log("Payments Error constructor");
    // Pass remaining arguments (including vendor specific ones) to parent constructor
    super(...params);

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, PaymentsError);
    }

    // Custom debugging information
    this.code = paymentCode;
  }
}

module.exports = PaymentsError;