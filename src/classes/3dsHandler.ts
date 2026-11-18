import { sanitize3dsMarkup } from "../helpers/sanitize3dsMarkup"
import { isHttpsUrl } from "../helpers/safeUrl"
import { ErrorKeyEnum } from "../shared/enum/ErrorKeyEnum"
import { buildPublicAppError } from "../shared/utils/appError"
import { ICoreTransactionResponse, PaymentEngine } from "../types/core"

type CoreResultBuilder = (transaction: ICoreTransactionResponse) => Record<string, any>

// A core payment that has not reached one of these is still open.
const OPEN_CORE_STATUSES = ["Pending", "Processing"]

type StoredVerification = {
  url: string,
  expires: number,
  engine?: PaymentEngine
}

type ThreeDSHandlerContructor = {
  payload?: any,
  apiKey?: string,
  baseUrl?: string,
  coreBaseUrl?: string,
  buildCoreResult?: CoreResultBuilder,
  redirectOnComplete?: boolean,
  tdsIframeId?: string, 
  tonderPayButtonId?: string,
  callBack?: (params: any) => any
}

export class ThreeDSHandler {

  callBack?: (params: any) => any
  baseUrl?: string
  coreBaseUrl?: string
  buildCoreResult: CoreResultBuilder
  engine: PaymentEngine = "legacy"
  apiKey?: string
  payload?: any
  localStorageKey: string = "verify_transaction_status_url"
  redirectOnComplete?: boolean
  tdsIframeId?: string
  tonderPayButtonId?: string

  constructor({
    payload = null,
    apiKey,
    baseUrl,
    coreBaseUrl,
    buildCoreResult = (transaction) => transaction,
    redirectOnComplete,
    tdsIframeId,
    tonderPayButtonId,
    callBack
  }: ThreeDSHandlerContructor) {
    this.buildCoreResult = buildCoreResult
    this.baseUrl = baseUrl,
    this.coreBaseUrl = coreBaseUrl,
    this.apiKey = apiKey,
    this.payload = payload
    this.tdsIframeId = tdsIframeId
    this.tonderPayButtonId = tonderPayButtonId
    this.redirectOnComplete = redirectOnComplete
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

  setEngine(engine: PaymentEngine) {
    this.engine = engine
  }

  saveUrlWithExpiration(url: string) {
    try {
      const now = new Date()
      const item: StoredVerification = {
        url: url,
        // Expires after 20 minutes
        expires: now.getTime() + 20 * 60 * 1000,
        engine: this.engine
      }
      this.setStorageItem(item)
    } catch (error) {
     console.log('error: ', error)
    }
  }

  getStoredVerification(): StoredVerification | null | undefined {
    const status = this.getStorageItem();
    if(status) {
      const item = JSON.parse(status)
        if (!item) return
        const now = new Date()
        if (now.getTime() > item.expires) {
          this.removeVerifyTransactionUrl()
          return null
        } else {
          return item
        }
    } else {
      return null
    }
  }

  getUrlWithExpiration() {
    const item = this.getStoredVerification()
    return item === undefined ? undefined : item?.url ?? null
  }

  // A state stored before the engine existed belongs to a legacy payment.
  getStoredEngine(): PaymentEngine {
    return this.getStoredVerification()?.engine === "core" ? "core" : "legacy"
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
          // The 3DS Method step is device fingerprinting, not UI: the ACS form posts
          // itself into its target frame and nothing here is ever meant to be seen. The
          // hiding belongs to the SDK rather than to the remote markup that asks for it,
          // so the sanitizer is free to drop the style attribute, and a fragment that
          // positions itself over the card fields has nothing to render into.
          container.style.display = 'none'
          container.appendChild(sanitize3dsMarkup(iframe))
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
      // The challenge URL arrives in the remote payload and reaches two sinks below:
      // window.location and an iframe src. A javascript: URL at either one executes in
      // the merchant's own origin, next to the card fields.
      //
      // Rejection throws rather than skipping the navigation: the caller turns it into
      // a rejected payment the merchant can surface and the shopper can retry, whereas
      // doing nothing would strand the shopper mid-challenge with no signal that the
      // flow had stopped. The error code is locked so it survives the caller's wrapping
      // and stays distinguishable from an ordinary payment failure.
      if (!isHttpsUrl(url)) {
        throw buildPublicAppError({
          errorCode: ErrorKeyEnum.THREEDS_REDIRECTION_ERROR,
          statusCode: 400,
          lockErrorCode: true,
        })
      }

      this.saveVerifyTransactionUrl()
        if(this.redirectOnComplete) {
          window.location = url;
        } else {
          const iframe = document.querySelector(`#${this.tdsIframeId}`)
          if(iframe) {
  
            iframe.setAttribute("src", url);
            iframe.setAttribute("style", "display: block");
            
            const self = this;
  
            const listenerHandler = async (event: any) => {
              const checkStatus = (result: any) => self.isVerificationFinal(result);
  
              const executeAction = () => {
                try {
                  const selector: any = document.querySelector(`#${this.tonderPayButtonId}`);
                  if(selector) {
                    selector.disabled = false;
                  }
                } catch {}
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
                    }, 7000)
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
      if (this.callBack) this.callBack!(this.payload);
    }
  }

  // The verify URL of a core payment is relative to the core, not to the monolith.
  async fetchVerification(item: StoredVerification) {
    const base = item.engine === "core" ? this.coreBaseUrl : this.baseUrl
    const url = item.url.startsWith("https://") ? item.url : `${base}${item.url}`;
    return await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Token ${this.apiKey}`,
      },
      // body: JSON.stringify(data),
    });
  }

  async requestTransactionStatus() {
    const item = this.getStoredVerification()
    // The state expires or is cleared by another tab while the iframe polls.
    if (!item) return null;
    let response: Response;
    try {
      response = await this.fetchVerification(item);
      if (response.status === 200) return await response.json();
    } catch (error) {
      if (this.isTransientCoreFailure(item)) return this.keepPolling();
      throw error;
    }
    console.error('La verificación de la transacción falló.');
    return this.isTransientCoreFailure(item, response.status) ? this.keepPolling() : null;
  }

  // A server error, a throttle or a dropped connection is not an answer: the poller asks again.
  keepPolling() {
    return { status: "Pending", transaction_status: "Pending" }
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

  // A core payment is open until the core says otherwise, whatever the rail answered meanwhile.
  isCoreOpen(transaction: ICoreTransactionResponse) {
    return OPEN_CORE_STATUSES.includes(transaction?.status)
  }

  // The core continues its own route, so there is nothing to resume here: the payment is
  // read and answered like pay() answers it. An open payment keeps its state so a later
  // call can get the outcome.
  async handleCoreTransaction(response: Response) {
    const transaction = await response.json();
    if (!this.isCoreOpen(transaction)) this.removeVerifyTransactionUrl();
    return this.buildCoreResult(transaction);
  }

  // The iframe poller stops on a final answer.
  isVerificationFinal(result: any) {
    return this.engine === "core"
      ? !this.isCoreOpen(result)
      : result?.transaction_status !== "Pending"
  }

  // Only a refusal that will not change (the payment cannot be read) ends a core verification;
  // a server error, a throttle or a dropped connection leaves it to be tried again.
  isTransientCoreFailure(item: StoredVerification, status?: number) {
    return item.engine === "core" && (status === undefined || status >= 500 || status === 429 || status === 408)
  }

  async verifyTransactionStatus() {
    const item = this.getStoredVerification();
    if (item?.url) {
      try {
        const response = await this.fetchVerification(item);

        if (response.status !== 200) {
          console.error('La verificación de la transacción falló.');
          if (!this.isTransientCoreFailure(item, response.status)) this.removeVerifyTransactionUrl();
          if (item.engine === "core") {
            throw await buildPublicAppError({ response, errorCode: ErrorKeyEnum.FETCH_TRANSACTION_ERROR });
          }
          return response
        }

        if (item.engine === "core") {
          return await this.handleCoreTransaction(response);
        }
        return await this.handleTransactionResponse(response);
      } catch (error) {
        console.error('Error al verificar la transacción:', error);
        if (item.engine === "core") {
          throw buildPublicAppError({ errorCode: ErrorKeyEnum.FETCH_TRANSACTION_ERROR }, error);
        }
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
