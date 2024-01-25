"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Checkout = void 0;
const crypto_js_1 = require("crypto-js");
class Checkout {
    constructor({ apiKey, type = "payment", backgroundColor = "#141414", color = "#EBEBEB", cb = () => { }, url = "http://checkout.tonder.io/#/" }) {
        this.generateButton = (buttonText) => {
            this.buttonText = buttonText ? buttonText : this.buttonText;
            this.tonderButton = document.createElement('button');
            this.tonderButton.innerHTML = this.buttonText;
            this.stylishButton(this.tonderButton);
            this.tonderButton.onclick = this.openCheckout;
        };
        this.getButton = ({ buttonText }) => {
            this.generateButton(buttonText);
            return this.tonderButton;
        };
        this.mountButton = ({ buttonText }) => {
            this.generateButton(buttonText);
            const entryPoint = document.getElementById("tonder-checkout");
            try {
                if (entryPoint) {
                    entryPoint.innerHTML = "";
                    entryPoint.append(this.tonderButton);
                }
            }
            catch (error) {
                console.error(error);
            }
        };
        this.stylishButton = (element) => {
            element.style.backgroundColor = this.backgroundColor;
            element.style.color = this.color;
            element.style.display = 'flex';
            element.style.justifyContent = 'center';
            element.style.border = 'none';
            element.style.padding = '1rem';
            element.style.borderRadius = '10px';
            element.style.fontSize = '1rem';
            element.style.width = '100%';
            element.style.boxShadow = '0 3px 6px 0 rgba(0,0,0,0.16)';
        };
        this.setOrder = ({ products, email, shippingCost }) => {
            let _order = {};
            if (products)
                _order.products = products;
            if (email)
                _order.email = email;
            if (shippingCost)
                _order.shippingCost = shippingCost;
            this.order = Object.assign(Object.assign({}, this.order), _order);
            return this.order;
        };
        this.openTabListener = (tab, button) => {
            const tabInterval = setInterval(() => {
                if (tab.closed) {
                    clearInterval(tabInterval);
                    button.disabled = false;
                    button.innerHTML = this.buttonText;
                }
            }, 500);
        };
        this.openCheckout = () => {
            const queryString = this.getUrlParams();
            const encrypted = crypto_js_1.AES.encrypt(queryString, 'url-params-encrypt').toString();
            const encodedURL = encodeURIComponent(encrypted);
            this.params = "?" + encodedURL;
            const newWindow = window.open(this.url + this.params, '_blank', `width=1200,height=$800,left=0,top=0`);
            this.tonderButton.disabled = true;
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
      `;
            this.openTabListener(newWindow, this.tonderButton);
        };
        this.getUrlParams = () => {
            const params = Object.assign(Object.assign({ apiKey: this.apiKey }, this.order), { type: this.type });
            if (params.products) {
                params.products = JSON.stringify(params.products);
            }
            const queryString = new URLSearchParams(params).toString();
            return queryString;
        };
        this.url = url;
        this.apiKey = apiKey;
        this.type = type;
        this.backgroundColor = backgroundColor;
        this.color = color;
        this.params = "";
        this.order = {};
        this.buttonText = "Proceder al pago";
        this.cb = cb;
        window.addEventListener("message", this.receiveMessage.bind(this), false);
    }
    receiveMessage(event) {
        try {
            const data = JSON.parse(event.data);
            this.cb(data);
        }
        catch (error) {
            this.cb(event.data);
        }
    }
}
exports.Checkout = Checkout;
//# sourceMappingURL=checkout.js.map