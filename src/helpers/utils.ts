export async function addScripts() {
  try {
    const skyflowScript = document.createElement("script");
    skyflowScript.src = "https://js.skyflow.com/v1/index.js";
    await new Promise((resolve, reject) => {
      skyflowScript.onload = resolve;
      skyflowScript.onerror = reject;
      document.head.appendChild(skyflowScript);
    });

    const openPay1Script = document.createElement("script");
    openPay1Script.src = "https://openpay.s3.amazonaws.com/openpay.v1.min.js";
    await new Promise((resolve, reject) => {
      openPay1Script.onload = resolve;
      openPay1Script.onerror = reject;
      document.head.appendChild(openPay1Script);
    });

    const openPay2Script = document.createElement("script");
    openPay2Script.src = "https://openpay.s3.amazonaws.com/openpay-data.v1.min.js";
    await new Promise((resolve, reject) => {
      openPay2Script.onload = resolve;
      openPay2Script.onerror = reject;
      document.head.appendChild(openPay2Script);
    });

  } catch (error) {
    console.error("Error loading scripts", error);
  }
}

export function toCurrency(value: string | number) {
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

export function showError(message: string) {
  var msgErrorDiv: any = document.getElementById("msgError");
  msgErrorDiv.classList.add("error-container");
  msgErrorDiv.innerHTML = message;
  setTimeout(function () {
    try {
      const selector: any = document.querySelector("#tonderPayButton")
      selector.disabled = false;
    } catch (error) {}
    msgErrorDiv.classList.remove("error-container");
    msgErrorDiv.innerHTML = "";
  }, 3000);
}

export const createObserver = ({ target }: { target: string }): Promise<any> => {

  return new Promise((resolve, reject) => {

    let hasChanged = false;

    // Select the node that will be observed for mutations
    const targetNode: any = document.querySelector(target);

    // Options for the observer (which mutations to observe)
    const config = { attributes: true, childList: true, subtree: true };

    // Callback function to execute when mutations are observed
    const callback = (mutationList: any, observer: MutationObserver) => {
      for (const mutation of mutationList) {
        if (mutation.type === "childList") {
          hasChanged = true;
          resolve(mutation)
        }
      }
    };

    // Create an observer instance linked to the callback function
    const observer = new MutationObserver(callback);

    // Start observing the target node for configured mutations
    observer.observe(targetNode, config);

    window.setTimeout(()=>{
      if (!hasChanged) {
        reject("Mounting error");
      }
    }, 5000);
    
  })

} 
