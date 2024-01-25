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
