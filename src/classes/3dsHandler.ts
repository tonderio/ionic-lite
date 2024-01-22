type ThreeDSHandlerContructor = {
  payload?: any,
  apiKey?: string,
  baseUrl?: string,
  successUrl?: Location | string
}

export class ThreeDSHandler {

  baseUrl?: string
  apiKey?: string
  payload?: any
  successUrl?: Location | string

  constructor({
    payload = null,
    apiKey,
    baseUrl,
    successUrl
  }: ThreeDSHandlerContructor) {
    this.baseUrl = baseUrl,
    this.apiKey = apiKey,
    this.payload = payload,
    this.successUrl = successUrl
  }

  saveVerifyTransactionUrl() {
    const url = this.payload?.next_action?.redirect_to_url?.verify_transaction_status_url
    if (url) {
      localStorage.setItem("verify_transaction_status_url", url)
    }
  }

  removeVerifyTransactionUrl() {
    localStorage.removeItem("verify_transaction_status_url")
  }

  getVerifyTransactionUrl() {
    return localStorage.getItem("verify_transaction_status_url") 
  }

  redirectTo3DS() {
    const url = this.payload?.next_action?.redirect_to_url?.url
    if (url) {
      this.saveVerifyTransactionUrl()
      window.location = url;
      // window.open(url, '_blank');
      return true
    } else {
      console.log('No redirection found');
      return false
    }
  }

  // Returns an object
  // https://example.com/?name=John&age=30&city=NewYork
  // { name: "John", age: "30", city: "NewYork" }
  getURLParameters() {
    const parameters: any = {};
    const urlParams: any = new URLSearchParams(window.location.search);

    for (const [key, value] of urlParams) {
      parameters[key] = value;
    }

    return parameters;
  }

  async verifyTransactionStatus() {
    const verifyUrl = this.getVerifyTransactionUrl();

    if (verifyUrl) {
      const url = `${this.baseUrl}${verifyUrl}`;
      try {
        const response = await fetch(url, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Token ${this.apiKey}`,
          },
          // body: JSON.stringify(data),
        });

        if (response.status === 200) {
          this.removeVerifyTransactionUrl();
          //@ts-ignore
          window.location = this.successUrl
          console.log('La transacción se verificó con éxito.');
          return response;
        } else {
          console.error('La verificación de la transacción falló.');
          return null;
        }
      } catch (error) {
        console.error('Error al verificar la transacción:', error);
        return error;
      }
    } else {
      console.log('No verify_transaction_status_url found');
      return null;
    }
  }
}
