"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createObserver = void 0;
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