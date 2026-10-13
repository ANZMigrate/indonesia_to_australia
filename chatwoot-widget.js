/* Load Chatwoot only when the Website Inbox token is configured. */
(() => {
  const baseUrl='https://c.anzmigrate.com';
  async function start() {
    try {
      const result=await fetch('/api/chat-config',{headers:{Accept:'application/json'},cache:'no-store'});
      if (!result.ok) return;
      const config=await result.json();
      if (config.enabled !== true || config.baseUrl !== baseUrl ||
          typeof config.websiteToken !== 'string' || !config.websiteToken) return;
      if (document.getElementById('site-chatwoot-sdk')) return;
      window.chatwootSettings={
        hideMessageBubble:false,
        position:'right',
        locale:'en',
        useBrowserLanguage:true,
        type:'standard'
      };
      const sdk=document.createElement('script');
      sdk.id='site-chatwoot-sdk';
      sdk.src=baseUrl+'/packs/js/sdk.js';
      sdk.async=true;
      sdk.onload=()=>{
        if (window.chatwootSDK && typeof window.chatwootSDK.run==='function') {
          window.chatwootSDK.run({websiteToken:config.websiteToken,baseUrl});
        }
      };
      document.head.appendChild(sdk);
    } catch {
      // Chat must not interrupt page navigation or the enquiry form.
    }
  }
  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
