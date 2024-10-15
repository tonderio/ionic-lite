import { CustomizationOptions } from "../types/commons"

type ThreeDSHandlerContructor = {
  payload?: any,
  apiKey?: string,
  baseUrl?: string,
  customization?: CustomizationOptions,
  tdsIframeId?: string, 
  callBack?: (params: any) => any
}

export class ThreeDSHandler {

  callBack?: (params: any) => any
  baseUrl?: string
  apiKey?: string
  payload?: any
  localStorageKey: string = "verify_transaction_status_url"
  customization: CustomizationOptions = {
    saveCards: {
      showSaveCardOption: true,
      showSaved: true,
      autoSave: false
    },
    redirectOnComplete: true
  }
  tdsIframeId?: string

  constructor({
    payload = null,
    apiKey,
    baseUrl,
    customization,
    tdsIframeId,
    callBack
  }: ThreeDSHandlerContructor) {
    this.baseUrl = baseUrl,
    this.apiKey = apiKey,
    this.payload = payload
    this.tdsIframeId = tdsIframeId
    this.customization = {
      ...this.customization,
      ...(customization || {}),
      saveCards: {
        ...this.customization.saveCards,
        ...(customization?.saveCards || {}),
      },
    }
    this.callBack = callBack
  }

  setStorageItem (data: any) {
    return localStorage.setItem(this.localStorageKey, JSON.stringify(data))
  }

  getStorageItem () {
    return localStorage.getItem(this.localStorageKey)
  }

  removeStorageItem () {
    return localStorage.removeItem(this.localStorageKey)
  }

  saveVerifyTransactionUrl() {
    const url = this.payload?.next_action?.redirect_to_url?.verify_transaction_status_url
    if (url) {
      this.saveUrlWithExpiration(url)
    } else {
      const url = this.payload?.next_action?.iframe_resources?.verify_transaction_status_url
      if (url) {
        this.saveUrlWithExpiration(url)
      } else {
        console.log('No verify_transaction_status_url found');
      }
    }
  }

  saveUrlWithExpiration(url: string) {
    try {
      const now = new Date()
      const item = {
        url: url,
        // Expires after 20 minutes
        expires: now.getTime() + 20 * 60 * 1000
      }
      this.setStorageItem(item)
    } catch (error) {
     console.log('error: ', error)
    }
  }

  getUrlWithExpiration() {
    const status = this.getStorageItem();
    if(status) {
      const item = JSON.parse(status)
        if (!item) return
        const now = new Date()
        if (now.getTime() > item.expires) {
          this.removeVerifyTransactionUrl()
          return null
        } else {
          return item.url
        }
    } else {
      return null
    }
  }

  removeVerifyTransactionUrl() {
    return this.removeStorageItem()
  }

  getVerifyTransactionUrl() {
    return this.getStorageItem() 
  }

  loadIframe() {
    const iframe = this.payload?.next_action?.iframe_resources?.iframe

    if (iframe) {
      return new Promise((resolve, reject) => {
        const iframe = this.payload?.next_action?.iframe_resources?.iframe

        if (iframe) {
          this.saveVerifyTransactionUrl()
          const container = document.createElement('div')
          container.innerHTML = iframe
          document.body.appendChild(container)

          // Create and append the script tag manually
          const script = document.createElement('script')
          script.textContent = 'document.getElementById("tdsMmethodForm").submit();'
          container.appendChild(script)

          // Resolve the promise when the iframe is loaded
          const iframeElement = document.getElementById('tdsMmethodTgtFrame')
          if(iframeElement) {
            iframeElement.onload = () => resolve(true)
          } else {
            console.log('No redirection found');
            reject(false)
          }
        } else {
          console.log('No redirection found');
          reject(false)
        }
      })
    }
  }

  getRedirectUrl() {
    return this.payload?.next_action?.redirect_to_url?.url
  }

  redirectToChallenge() {
    const url = this.getRedirectUrl()
    if (url) {
      this.saveVerifyTransactionUrl()
      if(this.customization) {
        if(this.customization?.redirectOnComplete) {
          window.location = url;
        } else {
          const iframe = document.querySelector(`#${this.tdsIframeId}`)
          if(iframe) {
  
            iframe.setAttribute("src", url);
            iframe.setAttribute("style", "display: block");
            
            const self = this;
  
            const listenerHandler = async (event: any) => {
  
              const checkStatus = (result: any) => result?.transaction_status !== "Pending";
  
              const executeAction = () => {
                if(iframe) {
                  iframe.setAttribute("style", "display: none");
                }
                if(self.callBack) self.callBack(self.payload);
                iframe.removeEventListener("load", listenerHandler);
              }
  
              const chainPromises = async (promise: Promise<any>) => {
                const result = await new Promise((resolve, reject) => resolve(promise))
                if(result) {
                  if(checkStatus(result)) {
                    return executeAction()
                  } else {
                    const timer = setTimeout(async () => {
                      clearTimeout(timer);
                      await chainPromises(self.requestTransactionStatus());
                    }, 15000)
                  }
                }
              }
  
              await chainPromises(self.requestTransactionStatus())
            }
  
            iframe.addEventListener("load", listenerHandler)
  
          } else {
            console.log('No iframe found');
          }
        }
      } else {
        window.location = url;
      }
    } else {
      if (this.callBack) this.callBack!(this.payload);
    }
  }

  async requestTransactionStatus() {

    const verifyUrl = this.getUrlWithExpiration();
    const url = `${this.baseUrl}${verifyUrl}`;
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Token ${this.apiKey}`,
      },
      // body: JSON.stringify(data),
    });

    if (response.status !== 200) {
      console.error('La verificación de la transacción falló.');
      return null;
    } else {
      const response_json = await response.json();
      return response_json;
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

  handleSuccessTransaction(response: any) {
    this.removeVerifyTransactionUrl();
    console.log('Transacción autorizada.');
    return response;
  }

  handleDeclinedTransaction(response: any) {
    this.removeVerifyTransactionUrl();
    return response;
  }

  // TODO: the method below needs to be tested with a real 3DS challenge
  // since we couldn't get a test card that works with this feature
  async handle3dsChallenge(response_json: any) {
    // Create the form element:
    const form = document.createElement('form');
    form.name = 'frm';
    form.method = 'POST';
    form.action = response_json.redirect_post_url;

    // Add hidden fields:
    const creqInput = document.createElement('input');
    creqInput.type = 'hidden';
    creqInput.name = response_json.creq;
    creqInput.value = response_json.creq;
    form.appendChild(creqInput);

    const termUrlInput = document.createElement('input');
    termUrlInput.type = 'hidden';
    termUrlInput.name =  response_json.term_url;
    termUrlInput.value = response_json.TermUrl;
    form.appendChild(termUrlInput);

    // Append the form to the body:
    document.body.appendChild(form);
    form.submit();

    await this.verifyTransactionStatus();
  }

  // TODO: This method could be removed
  async handleTransactionResponse(response: any) {
    const response_json = await response.json();
    if (response_json.status === "Pending"  && response_json.redirect_post_url) {
      return await this.handle3dsChallenge(response_json);
    } else if (["Success", "Authorized"].includes(response_json.status)) {
      return this.handleSuccessTransaction(response_json);
    } else {
      this.handleDeclinedTransaction(response);
      return response_json
    }
  }

  async verifyTransactionStatus() {
    const verifyUrl = this.getUrlWithExpiration();
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

        if (response.status !== 200) {
          console.error('La verificación de la transacción falló.');
          this.removeVerifyTransactionUrl();
          return response
        }

        return await this.handleTransactionResponse(response);
      } catch (error) {
        console.error('Error al verificar la transacción:', error);
        this.removeVerifyTransactionUrl();
      }
    } else {
      console.log('No verify_transaction_status_url found');
    }
  }

  setPayload = (payload: any) => {
    this.payload = payload
  }
}
