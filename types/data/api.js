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
exports.getVaultToken = exports.getSkyflowTokens = exports.startCheckoutRouter = exports.createPayment = exports.createOrder = exports.customerRegister = exports.getBusiness = exports.getOpenpayDeviceSessionID = void 0;
const skyflow_js_1 = __importDefault(require("skyflow-js"));
function getOpenpayDeviceSessionID(merchant_id, public_key, signal) {
    return __awaiter(this, void 0, void 0, function* () {
        let openpay = yield window.OpenPay;
        openpay.setId(merchant_id);
        openpay.setApiKey(public_key);
        openpay.setSandboxMode(true);
        var response = yield openpay.deviceData.setup({ signal });
        return response;
    });
}
exports.getOpenpayDeviceSessionID = getOpenpayDeviceSessionID;
function getBusiness(baseUrlTonder, signal, apiKeyTonder) {
    return __awaiter(this, void 0, void 0, function* () {
        const getBusiness = yield fetch(`${baseUrlTonder}/api/v1/payments/business/${apiKeyTonder}`, {
            headers: {
                Authorization: `Token ${apiKeyTonder}`,
            },
            signal: signal,
        });
        const response = yield getBusiness.json();
        return response;
    });
}
exports.getBusiness = getBusiness;
function customerRegister(baseUrlTonder, email, signal, apiKeyTonder) {
    return __awaiter(this, void 0, void 0, function* () {
        const url = `${baseUrlTonder}/api/v1/customer/`;
        const data = { email: email };
        const response = yield fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Token ${apiKeyTonder}`,
            },
            signal: signal,
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
exports.customerRegister = customerRegister;
function createOrder(baseUrlTonder, orderItems, apiKeyTonder) {
    return __awaiter(this, void 0, void 0, function* () {
        const url = `${baseUrlTonder}/api/v1/orders/`;
        const data = orderItems;
        const response = yield fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Token ${apiKeyTonder}`,
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
exports.createOrder = createOrder;
function createPayment(baseUrlTonder, paymentItems, apiKeyTonder) {
    return __awaiter(this, void 0, void 0, function* () {
        const url = `${baseUrlTonder}/api/v1/business/${paymentItems.business_pk}/payments/`;
        const data = paymentItems;
        const response = yield fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Token ${apiKeyTonder}`,
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
exports.createPayment = createPayment;
function startCheckoutRouter(baseUrlTonder, routerItems, apiKeyTonder) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const url = `${baseUrlTonder}/api/v1/checkout-router/`;
            const data = routerItems;
            const response = yield fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Token ${apiKeyTonder}`,
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
exports.startCheckoutRouter = startCheckoutRouter;
function getSkyflowTokens({ baseUrl, apiKey, vault_id, vault_url, signal, data }) {
    return __awaiter(this, void 0, void 0, function* () {
        const skyflow = skyflow_js_1.default.init({
            vaultID: vault_id,
            vaultURL: vault_url,
            getBearerToken: () => __awaiter(this, void 0, void 0, function* () { return yield getVaultToken({ baseUrl, apiKey, signal }); }),
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
exports.getSkyflowTokens = getSkyflowTokens;
function getVaultToken({ baseUrl, apiKey, signal }) {
    return __awaiter(this, void 0, void 0, function* () {
        const response = yield fetch(`${baseUrl}/api/v1/vault-token/`, {
            method: 'GET',
            headers: {
                'Authorization': `Token ${apiKey}`
            },
            signal: signal,
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
exports.getVaultToken = getVaultToken;
//# sourceMappingURL=api.js.map