/* Public Chatwoot Website Inbox embed identifier; never disclose SMTP secrets. */
export default function handler(req,res) {
  res.setHeader('Cache-Control','no-store');
  res.setHeader('Content-Type','application/json; charset=utf-8');
  if (req.method !== 'GET') {
    res.setHeader('Allow','GET');
    return res.status(405).json({enabled:false});
  }
  const token=String(process.env.CHATWOOT_WEBSITE_TOKEN||'').trim();
  if (!token || token.length>200 || !/^[A-Za-z0-9_-]+$/.test(token)) {
    return res.status(200).json({enabled:false});
  }
  return res.status(200).json({
    enabled:true,
    baseUrl:'https://c.anzmigrate.com',
    websiteToken:token
  });
}
