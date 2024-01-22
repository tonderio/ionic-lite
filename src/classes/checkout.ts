import { AES } from "crypto-js";

type CheckoutType = {
  apiKey?: string,
  type: string,
  backgroundColor: string,
  color: string,
  cb: (params?: any)=> void,
  url: string,
}

export class Checkout {

  url: string
  apiKey?: string
  type: string
  backgroundColor: string
  color: string
  params: string
  order: any
  buttonText: string
  cb: (params: any) => void
  tonderButton: any

  constructor({
    apiKey,
    type = "payment",
    backgroundColor="#141414",
    color="#EBEBEB",
    cb=()=>{},
    url="http://checkout.tonder.io/#/"
  }: CheckoutType) {
    this.url = url
    this.apiKey = apiKey
    this.type = type
    this.backgroundColor = backgroundColor
    this.color = color
    this.params = ""
    this.order = {}
    this.buttonText = "Proceder al pago"
    this.cb = cb

    window.addEventListener("message", this.receiveMessage.bind(this), false);
  }
  generateButton = (buttonText: string) => {
    this.buttonText = buttonText ? buttonText : this.buttonText
    this.tonderButton = document.createElement('button');
    this.tonderButton.innerHTML = this.buttonText;
    this.stylishButton(this.tonderButton)
    this.tonderButton.onclick = this.openCheckout
  }
  getButton = ({ buttonText }: { buttonText: string }) => {
    this.generateButton(buttonText)
    return this.tonderButton
  }
  mountButton = ({ buttonText }: { buttonText: string }) => {
    this.generateButton(buttonText)
    const entryPoint: HTMLElement | null = document.getElementById("tonder-checkout")
    try {
      if(entryPoint) {
        entryPoint.innerHTML = ""
        entryPoint.append(this.tonderButton)
      }
    } catch(error) {
      console.error(error)
    }
  }
  stylishButton = (element: HTMLElement) => {
    element.style.backgroundColor = this.backgroundColor
    element.style.color = this.color
    element.style.display = 'flex'
    element.style.justifyContent = 'center'
    element.style.border = 'none'
    element.style.padding = '1rem'
    element.style.borderRadius = '10px'
    element.style.fontSize = '1rem'
    element.style.width = '100%'
    element.style.boxShadow = '0 3px 6px 0 rgba(0,0,0,0.16)'
  }
  setOrder = ({ products, email, shippingCost }: { products: any, email: string, shippingCost: string }) => {
    let _order: any = {}
    if (products) _order.products = products 
    if (email) _order.email = email 
    if (shippingCost) _order.shippingCost = shippingCost
    this.order = {...this.order, ..._order}
    return this.order
  }
  openTabListener = (tab: any, button: HTMLButtonElement) => {
    const tabInterval = setInterval(() => {
      if (tab.closed) {
        clearInterval(tabInterval);
        button.disabled = false
        button.innerHTML = this.buttonText
      }
    }, 500)
  }
  openCheckout = () => {
    const queryString = this.getUrlParams()
    const encrypted = AES.encrypt(queryString, 'url-params-encrypt').toString()
    const encodedURL = encodeURIComponent(encrypted);
    this.params = "?" + encodedURL;
    const newWindow = window.open(this.url + this.params, '_blank', `width=1200,height=$800,left=0,top=0`);
    this.tonderButton.disabled = true
    this.tonderButton.innerHTML = `
      <div class="loader"></div>
      <style>
      .loader {
        border: 4px solid ${this.color};
        border-radius: 50%;
        border-top: 4px solid ${this.backgroundColor};
        width: 0.625rem;
        height: 0.625rem;
        -webkit-animation: spin 2s linear infinite; /* Safari */
          animation: spin 2s linear infinite;
      }

    /* Safari */
      @-webkit-keyframes spin {
        0% { -webkit-transform: rotate(0deg); }
        100% { -webkit-transform: rotate(360deg); }
      }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
      </style>
      `
    this.openTabListener(newWindow, this.tonderButton)
  }
  getUrlParams = () => {
    const params = { apiKey: this.apiKey, ...this.order, type: this.type}
    if (params.products) {
      params.products = JSON.stringify(params.products)
    }
    const queryString = new URLSearchParams(params).toString();
    return queryString
  }
  receiveMessage(event: any) {
    // Parse data if it is possible, in case of error it will return the raw data.
    try {
      const data = JSON.parse(event.data)
      this.cb(data)
    } catch(error) {
      this.cb(event.data)
    }
  }
}