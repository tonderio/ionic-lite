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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LiteCheckout = void 0;
const skyflow_js_1 = __importDefault(require("skyflow-js"));
class LiteCheckout {
    constructor({ signal, baseUrlTonder, publicApiKeyTonder }) {
        this.baseUrlTonder = baseUrlTonder;
        this.signal = signal;
        this.publicApiKeyTonder = publicApiKeyTonder;
    }
    getOpenpayDeviceSessionID(merchant_id, public_key) {
        return __awaiter(this, void 0, void 0, function* () {
            let openpay = yield window.OpenPay;
            openpay.setId(merchant_id);
            openpay.setApiKey(public_key);
            openpay.setSandboxMode(true);
            var response = yield openpay.deviceData.setup({ signal: this.signal });
            return response;
        });
    }
    getBusiness() {
        return __awaiter(this, void 0, void 0, function* () {
            const getBusiness = yield fetch(`${this.baseUrlTonder}/api/v1/payments/business/${this.publicApiKeyTonder}`, {
                headers: {
                    Authorization: `Token ${this.publicApiKeyTonder}`,
                },
                signal: this.signal,
            });
            const response = yield getBusiness.json();
            return response;
        });
    }
    customerRegister(email) {
        return __awaiter(this, void 0, void 0, function* () {
            const url = `${this.baseUrlTonder}/api/v1/customer/`;
            const data = { email: email };
            const response = yield fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Token ${this.publicApiKeyTonder}`,
                },
                signal: this.signal,
                body: JSON.stringify(data),
            });
            if (response.status === 201) {
                const jsonResponse = yield response.json();
                return jsonResponse;
            }
            else {
                throw new Error(`Error: ${response.statusText}`);
            }
        });
    }
    createOrder(orderItems) {
        return __awaiter(this, void 0, void 0, function* () {
            const url = `${this.baseUrlTonder}/api/v1/orders/`;
            const data = orderItems;
            const response = yield fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Token ${this.publicApiKeyTonder}`,
                },
                body: JSON.stringify(data),
            });
            if (response.status === 201) {
                const jsonResponse = yield response.json();
                return jsonResponse;
            }
            else {
                throw new Error(`Error: ${response.statusText}`);
            }
        });
    }
    createPayment(paymentItems) {
        return __awaiter(this, void 0, void 0, function* () {
            const url = `${this.baseUrlTonder}/api/v1/business/${paymentItems.business_pk}/payments/`;
            const data = paymentItems;
            const response = yield fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Token ${this.publicApiKeyTonder}`,
                },
                body: JSON.stringify(data),
            });
            if (response.status >= 200 && response.status <= 299) {
                const jsonResponse = yield response.json();
                return jsonResponse;
            }
            else {
                throw new Error(`Error: ${response.statusText}`);
            }
        });
    }
    startCheckoutRouter(routerItems) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const url = `${this.baseUrlTonder}/api/v1/checkout-router/`;
                const data = routerItems;
                const response = yield fetch(url, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Token ${this.publicApiKeyTonder}`,
                    },
                    body: JSON.stringify(data),
                });
                if (response.status >= 200 && response.status <= 299) {
                    const jsonResponse = yield response.json();
                    return jsonResponse;
                }
                else {
                    throw new Error("Failed to start checkout router");
                }
            }
            catch (error) {
                throw error;
            }
        });
    }
    getSkyflowTokens({ vault_id, vault_url, data }) {
        return __awaiter(this, void 0, void 0, function* () {
            const skyflow = skyflow_js_1.default.init({
                vaultID: vault_id,
                vaultURL: vault_url,
                getBearerToken: () => __awaiter(this, void 0, void 0, function* () { return yield this.getVaultToken(); }),
                options: {
                    logLevel: skyflow_js_1.default.LogLevel.ERROR,
                    env: skyflow_js_1.default.Env.DEV,
                },
            });
            const collectContainer = skyflow.container(skyflow_js_1.default.ContainerType.COLLECT);
            const fields = yield Promise.all(Object.keys(data).map((key) => __awaiter(this, void 0, void 0, function* () {
                const cardHolderNameElement = yield collectContainer.create({
                    table: "cards",
                    column: key,
                    type: skyflow_js_1.default.ElementType.INPUT_FIELD
                });
                return { element: cardHolderNameElement, key: key };
            })));
            const fieldPromises = fields.map((field) => {
                return new Promise((resolve, reject) => {
                    var _a;
                    const div = document.createElement("div");
                    div.hidden = true;
                    div.id = `id-${field.key}`;
                    (_a = document.querySelector(`body`)) === null || _a === void 0 ? void 0 : _a.appendChild(div);
                    setTimeout(() => {
                        field.element.mount(`#id-${field.key}`);
                        setInterval(() => {
                            if (field.element.isMounted()) {
                                const value = data[field.key];
                                field.element.update({ value: value });
                                return resolve(field.element.isMounted());
                            }
                        }, 120);
                    }, 120);
                });
            });
            const result = yield Promise.all(fieldPromises);
            const mountFail = result.find((item) => !item);
            if (mountFail) {
                return { error: "Ocurrió un error al montar los campos de la tarjeta" };
            }
            else {
                try {
                    const collectResponseSkyflowTonder = yield collectContainer.collect();
                    return collectResponseSkyflowTonder["records"][0]["fields"];
                }
                catch (error) {
                    console.error("Por favor, verifica todos los campos de tu tarjeta");
                    return { error: "Por favor, verifica todos los campos de tu tarjeta" };
                }
            }
        });
    }
    getVaultToken() {
        return __awaiter(this, void 0, void 0, function* () {
            const response = yield fetch(`${this.baseUrlTonder}/api/v1/vault-token/`, {
                method: 'GET',
                headers: {
                    'Authorization': `Token ${this.publicApiKeyTonder}`
                },
                signal: this.signal,
            });
            if (response.ok) {
                const responseBody = yield response.json();
                return responseBody.token;
            }
            else {
                throw new Error('Failed to retrieve bearer token');
            }
        });
    }
    getCustomerCards(customerToken, query) {
        return __awaiter(this, void 0, void 0, function* () {
            const response = yield fetch(`${this.baseUrlTonder}/api/v1/cards/${query}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Token ${customerToken}`
                },
                signal: this.signal,
            });
            const jsonResponse = yield response.json();
            console.log("jsonResponse: ", jsonResponse);
            return jsonResponse;
        });
    }
}
exports.LiteCheckout = LiteCheckout;
//# sourceMappingURL=liteCheckout.js.map