export const getBrowserInfo = () => {
  const browserInfo = {
    javascript_enabled: true,  // Assumed since JavaScript is running
    time_zone: new Date().getTimezoneOffset(),
    language: navigator.language || 'en-US', // Fallback to 'en-US'
    color_depth: window.screen ? window.screen.colorDepth : null,
    screen_width: window.screen ? window.screen.width * window.devicePixelRatio || window.screen.width : null,
    screen_height: window.screen ? window.screen.height * window.devicePixelRatio || window.screen.height : null,
    user_agent: navigator.userAgent,
  };
  return browserInfo;
}

export const getBusinessId = (merchantData: any) =>{
  return merchantData && "business" in merchantData ? merchantData?.business?.pk:""
}