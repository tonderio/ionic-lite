"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _InlineCheckout_instances, _InlineCheckout_mountPayButton, _InlineCheckout_handlePaymentClick, _InlineCheckout_handleCustomer, _InlineCheckout_updatePayButton, _InlineCheckout_fetchMerchantData, _InlineCheckout_mountTonder, _InlineCheckout_checkout;
Object.defineProperty(exports, "__esModule", { value: true });
exports.InlineCheckout = void 0;
const template_1 = require("../helpers/template");
const api_1 = require("../data/api");
const utils_1 = require("../helpers/utils");
const skyflow_1 = require("../helpers/skyflow");
const _3dsHandler_1 = require("./3dsHandler");
class InlineCheckout {
    constructor({ apiKey, returnUrl, successUrl, renderPaymentButton = false, callBack = () => { }, styles, }) {
        _InlineCheckout_instances.add(this);
        this.paymentData = {};
        this.items = [];
        this.baseUrl = "https://stage.tonder.io";
        this.collectContainer = null;
        this.apiKeyTonder = apiKey;
        this.returnUrl = returnUrl;
        this.successUrl = successUrl;
        this.renderPaymentButton = renderPaymentButton;
        this.callBack = callBack;
        this.customStyles = styles;
        this.abortController = new AbortController();
        this.process3ds = new _3dsHandler_1.ThreeDSHandler({
            apiKey: apiKey,
            baseUrl: this.baseUrl,
            successUrl: successUrl
        });
    }
    payment(data) {
        return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            try {
                __classPrivateFieldGet(this, _InlineCheckout_instances, "m", _InlineCheckout_handleCustomer).call(this, data.customer);
                this.setCartTotal((_a = data.cart) === null || _a === void 0 ? void 0 : _a.total);
                this.setCartItems((_b = data.cart) === null || _b === void 0 ? void 0 : _b.items);
                const response = yield __classPrivateFieldGet(this, _InlineCheckout_instances, "m", _InlineCheckout_checkout).call(this);
                if (response) {
                    const process3ds = new _3dsHandler_1.ThreeDSHandler({ payload: response });
                    this.callBack(response);
                    if (!process3ds.redirectTo3DS()) {
                        resolve(response);
                    }
                    else {
                        resolve(response);
                    }
                }
            }
            catch (error) {
                reject(error);
            }
        }));
    }
    setCartItems(items) {
        this.cartItems = items;
    }
    setCustomerEmail(email) {
        this.email = email;
    }
    setPaymentData(data) {
        if (!data)
            return;
        this.paymentData = data;
    }
    setCartTotal(total) {
        this.cartTotal = total;
        __classPrivateFieldGet(this, _InlineCheckout_instances, "m", _InlineCheckout_updatePayButton).call(this);
    }
    setCallback(cb) {
        this.cb = cb;
    }
    injectCheckout() {
        if (InlineCheckout.injected)
            return;
        this.process3ds.verifyTransactionStatus();
        const injectInterval = setInterval(() => {
            const queryElement = document.querySelector("#tonder-checkout");
            if (queryElement) {
                queryElement.innerHTML = template_1.cardTemplate;
                __classPrivateFieldGet(this, _InlineCheckout_instances, "m", _InlineCheckout_mountTonder).call(this);
                clearInterval(injectInterval);
                InlineCheckout.injected = true;
            }
        }, 500);
    }
    getCustomer(email, signal) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield (0, api_1.customerRegister)(this.baseUrl, email, signal, this.apiKeyTonder);
        });
    }
    removeCheckout() {
        InlineCheckout.injected = false;
        this.abortController.abort();
        this.abortController = new AbortController();
        clearInterval(this.injectInterval);
        console.log("InlineCheckout removed from DOM and cleaned up.");
    }
    ;
}
exports.InlineCheckout = InlineCheckout;
_InlineCheckout_instances = new WeakSet(), _InlineCheckout_mountPayButton = function _InlineCheckout_mountPayButton() {
    if (!this.renderPaymentButton)
        return;
    const payButton = document.querySelector("#tonderPayButton");
    if (!payButton) {
        console.error("Pay button not found");
        return;
    }
    payButton.style.display = "block";
    payButton.textContent = `Pagar $${this.cartTotal}`;
    payButton.onclick = (event) => __awaiter(this, void 0, void 0, function* () {
        event.preventDefault();
        yield __classPrivateFieldGet(this, _InlineCheckout_instances, "m", _InlineCheckout_handlePaymentClick).call(this, payButton);
    });
}, _InlineCheckout_handlePaymentClick = function _InlineCheckout_handlePaymentClick(payButton) {
    return __awaiter(this, void 0, void 0, function* () {
        const prevButtonContent = payButton.innerHTML;
        payButton.innerHTML = `<div class="lds-dual-ring"></div>`;
        try {
            const response = yield this.payment(this.paymentData);
            this.callBack(response);
        }
        catch (error) {
            console.error("Payment error:", error);
        }
        finally {
            payButton.innerHTML = prevButtonContent;
        }
    });
}, _InlineCheckout_handleCustomer = function _InlineCheckout_handleCustomer(customer) {
    if (!customer)
        return;
    this.firstName = customer === null || customer === void 0 ? void 0 : customer.firstName;
    this.lastName = customer === null || customer === void 0 ? void 0 : customer.lastName;
    this.country = customer === null || customer === void 0 ? void 0 : customer.country;
    this.address = customer === null || customer === void 0 ? void 0 : customer.street;
    this.city = customer === null || customer === void 0 ? void 0 : customer.city;
    this.state = customer === null || customer === void 0 ? void 0 : customer.state;
    this.postCode = customer === null || customer === void 0 ? void 0 : customer.postCode;
    this.email = customer === null || customer === void 0 ? void 0 : customer.email;
    this.phone = customer === null || customer === void 0 ? void 0 : customer.phone;
}, _InlineCheckout_updatePayButton = function _InlineCheckout_updatePayButton() {
    const payButton = document.querySelector("#tonderPayButton");
    if (!payButton)
        return;
    payButton.textContent = `Pagar $${this.cartTotal}`;
}, _InlineCheckout_fetchMerchantData = function _InlineCheckout_fetchMerchantData() {
    return __awaiter(this, void 0, void 0, function* () {
        this.merchantData = yield (0, api_1.getBusiness)(this.baseUrl, this.abortController.signal, this.apiKeyTonder);
        return this.merchantData;
    });
}, _InlineCheckout_mountTonder = function _InlineCheckout_mountTonder() {
    return __awaiter(this, void 0, void 0, function* () {
        __classPrivateFieldGet(this, _InlineCheckout_instances, "m", _InlineCheckout_mountPayButton).call(this);
        const result = yield __classPrivateFieldGet(this, _InlineCheckout_instances, "m", _InlineCheckout_fetchMerchantData).call(this);
        if (result) {
            const { vault_id, vault_url } = result;
            this.collectContainer = yield (0, skyflow_1.initSkyflow)(vault_id, vault_url, this.baseUrl, this.abortController.signal, this.customStyles, this.apiKeyTonder);
        }
    });
}, _InlineCheckout_checkout = function _InlineCheckout_checkout() {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const selector = document.querySelector("#tonderPayButton");
            if (selector) {
                selector.disabled = true;
            }
        }
        catch (error) {
        }
        if (this.merchantData) {
            const { openpay_keys, reference, business } = this.merchantData;
            const total = Number(this.cartTotal);
            var cardTokensSkyflowTonder = null;
            try {
                const collectResponseSkyflowTonder = yield ((_a = this.collectContainer) === null || _a === void 0 ? void 0 : _a.collect());
                cardTokensSkyflowTonder = yield collectResponseSkyflowTonder["records"][0]["fields"];
            }
            catch (error) {
                (0, utils_1.showError)("Por favor, verifica todos los campos de tu tarjeta");
                throw error;
            }
            try {
                let deviceSessionIdTonder;
                if (openpay_keys.merchant_id && openpay_keys.public_key) {
                    deviceSessionIdTonder = yield (0, api_1.getOpenpayDeviceSessionID)(openpay_keys.merchant_id, openpay_keys.public_key, this.abortController.signal);
                }
                if (this.email) {
                    const { auth_token } = yield this.getCustomer(this.email, this.abortController.signal);
                    var orderItems = {
                        business: this.apiKeyTonder,
                        client: auth_token,
                        billing_address_id: null,
                        shipping_address_id: null,
                        amount: total,
                        status: "A",
                        reference: reference,
                        is_oneclick: true,
                        items: this.cartItems,
                    };
                    const jsonResponseOrder = yield (0, api_1.createOrder)(this.baseUrl, orderItems, this.apiKeyTonder);
                    const now = new Date();
                    const dateString = now.toISOString();
                    var paymentItems = {
                        business_pk: business.pk,
                        amount: total,
                        date: dateString,
                        order: jsonResponseOrder.id,
                    };
                    const jsonResponsePayment = yield (0, api_1.createPayment)(this.baseUrl, paymentItems, this.apiKeyTonder);
                    const routerItems = {
                        card: cardTokensSkyflowTonder,
                        name: cardTokensSkyflowTonder.cardholder_name,
                        last_name: "",
                        email_client: this.email,
                        phone_number: this.phone,
                        return_url: this.returnUrl,
                        id_product: "no_id",
                        quantity_product: 1,
                        id_ship: "0",
                        instance_id_ship: "0",
                        amount: total,
                        title_ship: "shipping",
                        description: "transaction",
                        device_session_id: deviceSessionIdTonder ? deviceSessionIdTonder : null,
                        token_id: "",
                        order_id: jsonResponseOrder.id,
                        business_id: business.pk,
                        payment_id: jsonResponsePayment.pk,
                        source: 'sdk',
                    };
                    const jsonResponseRouter = yield (0, api_1.startCheckoutRouter)(this.baseUrl, routerItems, this.apiKeyTonder);
                    if (jsonResponseRouter) {
                        try {
                            const selector = document.querySelector("#tonderPayButton");
                            if (selector) {
                                selector.disabled = false;
                            }
                        }
                        catch (_b) { }
                        return jsonResponseRouter;
                    }
                    else {
                        (0, utils_1.showError)("No se ha podido procesar el pago");
                        return false;
                    }
                }
            }
            catch (error) {
                console.log(error);
                (0, utils_1.showError)("Ha ocurrido un error");
                throw error;
            }
        }
    });
};
InlineCheckout.injected = false;
//# sourceMappingURL=inlineCheckout.js.map