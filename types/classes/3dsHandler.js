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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ThreeDSHandler = void 0;
class ThreeDSHandler {
    constructor({ payload = null, apiKey, baseUrl, successUrl }) {
        this.baseUrl = baseUrl,
            this.apiKey = apiKey,
            this.payload = payload,
            this.successUrl = successUrl;
    }
    saveVerifyTransactionUrl() {
        var _a, _b, _c;
        const url = (_c = (_b = (_a = this.payload) === null || _a === void 0 ? void 0 : _a.next_action) === null || _b === void 0 ? void 0 : _b.redirect_to_url) === null || _c === void 0 ? void 0 : _c.verify_transaction_status_url;
        if (url) {
            localStorage.setItem("verify_transaction_status_url", url);
        }
    }
    removeVerifyTransactionUrl() {
        localStorage.removeItem("verify_transaction_status_url");
    }
    getVerifyTransactionUrl() {
        return localStorage.getItem("verify_transaction_status_url");
    }
    redirectTo3DS() {
        var _a, _b, _c;
        const url = (_c = (_b = (_a = this.payload) === null || _a === void 0 ? void 0 : _a.next_action) === null || _b === void 0 ? void 0 : _b.redirect_to_url) === null || _c === void 0 ? void 0 : _c.url;
        if (url) {
            this.saveVerifyTransactionUrl();
            window.location = url;
            return true;
        }
        else {
            console.log('No redirection found');
            return false;
        }
    }
    getURLParameters() {
        const parameters = {};
        const urlParams = new URLSearchParams(window.location.search);
        for (const [key, value] of urlParams) {
            parameters[key] = value;
        }
        return parameters;
    }
    verifyTransactionStatus() {
        return __awaiter(this, void 0, void 0, function* () {
            const verifyUrl = this.getVerifyTransactionUrl();
            if (verifyUrl) {
                const url = `${this.baseUrl}${verifyUrl}`;
                try {
                    const response = yield fetch(url, {
                        method: "GET",
                        headers: {
                            "Content-Type": "application/json",
                            Authorization: `Token ${this.apiKey}`,
                        },
                    });
                    if (response.status === 200) {
                        this.removeVerifyTransactionUrl();
                        window.location = this.successUrl;
                        console.log('La transacción se verificó con éxito.');
                        return response;
                    }
                    else {
                        console.error('La verificación de la transacción falló.');
                        return null;
                    }
                }
                catch (error) {
                    console.error('Error al verificar la transacción:', error);
                    return error;
                }
            }
            else {
                console.log('No verify_transaction_status_url found');
                return null;
            }
        });
    }
}
exports.ThreeDSHandler = ThreeDSHandler;
//# sourceMappingURL=3dsHandler.js.map