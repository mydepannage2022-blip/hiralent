// Simple script to check /candidates/assessments/history on the configured backend
const axios = require('axios');

function trimTrailingSlash(s){ return (s||'').replace(/\/\/+$/, ''); }
function resolveBaseUrl(){
  const raw = trimTrailingSlash(process.env.NEXT_PUBLIC_BASE_URL) || 'http://localhost:5000';
  const hasVersion = /\/api\/v\d+$/i.test(raw);
  return hasVersion ? raw : `${raw}/api/v1`;
}

(async ()=>{
  const base = resolveBaseUrl();
  const url = `${base}/candidates/assessments/history`;
  console.log('Calling', url);
  try{
    const res = await axios.get(url, { withCredentials: true, timeout: 5000 });
    console.log('Status:', res.status);
    console.log('Data:', res.data);
  }catch(err){
    if (err.response){
      console.log('Response status:', err.response.status);
      console.log('Response data:', err.response.data);
    } else {
      console.log('Error:', err.message);
    }
    process.exit(1);
  }
})();
