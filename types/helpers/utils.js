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
exports.createObserver = exports.showError = exports.toCurrency = exports.addScripts = void 0;
function addScripts() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const skyflowScript = document.createElement("script");
            skyflowScript.src = "https://js.skyflow.com/v1/index.js";
            yield new Promise((resolve, reject) => {
                skyflowScript.onload = resolve;
                skyflowScript.onerror = reject;
                document.head.appendChild(skyflowScript);
            });
            const openPay1Script = document.createElement("script");
            openPay1Script.src = "https://openpay.s3.amazonaws.com/openpay.v1.min.js";
            yield new Promise((resolve, reject) => {
                openPay1Script.onload = resolve;
                openPay1Script.onerror = reject;
                document.head.appendChild(openPay1Script);
            });
            const openPay2Script = document.createElement("script");
            openPay2Script.src = "https://openpay.s3.amazonaws.com/openpay-data.v1.min.js";
            yield new Promise((resolve, reject) => {
                openPay2Script.onload = resolve;
                openPay2Script.onerror = reject;
                document.head.appendChild(openPay2Script);
            });
        }
        catch (error) {
            console.error("Error loading scripts", error);
        }
    });
}
exports.addScripts = addScripts;
function toCurrency(value) {
    if (typeof value === "string" && isNaN(parseFloat(value))) {
        return value;
    }
    var formatter = new Intl.NumberFormat("es-MX", {
        style: "currency",
        currency: "MXN",
        minimumFractionDigits: 2
    });
    return typeof value === "number" && formatter.format(value);
}
exports.toCurrency = toCurrency;
function showError(message) {
    var msgErrorDiv = document.getElementById("msgError");
    msgErrorDiv.classList.add("error-container");
    msgErrorDiv.innerHTML = message;
    setTimeout(function () {
        try {
            const selector = document.querySelector("#tonderPayButton");
            selector.disabled = false;
        }
        catch (error) { }
        msgErrorDiv.classList.remove("error-container");
        msgErrorDiv.innerHTML = "";
    }, 3000);
}
exports.showError = showError;
const createObserver = ({ target }) => {
    return new Promise((resolve, reject) => {
        let hasChanged = false;
        const targetNode = document.querySelector(target);
        const config = { attributes: true, childList: true, subtree: true };
        const callback = (mutationList, observer) => {
            for (const mutation of mutationList) {
                if (mutation.type === "childList") {
                    hasChanged = true;
                    resolve(mutation);
                }
            }
        };
        const observer = new MutationObserver(callback);
        observer.observe(targetNode, config);
        window.setTimeout(() => {
            if (!hasChanged) {
                reject("Mounting error");
            }
        }, 5000);
    });
};
exports.createObserver = createObserver;
//# sourceMappingURL=utils.js.map