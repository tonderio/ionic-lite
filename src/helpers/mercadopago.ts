export function injectMercadoPagoSecurity() {
    try {
        const script = document.createElement('script');
        script.src = "https://www.mercadopago.com/v2/security.js";
        script.setAttribute('view', '');
        script.onload = () => {
            console.log("Mercado Pago script loaded successfully.");
        };
        script.onerror = (error) => {
            console.error("Error loading Mercado Pago script:", error);
        };
        document.head.appendChild(script);
    } catch (error) {
        console.error("Error attempting to inject Mercado Pago script:", error);
    }
}