// Only one allowlisted setting is sent; never print the Auth configuration or token.
const token=process.env.SUPABASE_ACCESS_TOKEN;
const project=new URL(process.env.SUPABASE_URL??process.env.EXPO_PUBLIC_SUPABASE_URL??'https://example.supabase.co').hostname.split('.')[0];
if(!token||project==='example')throw new Error('SUPABASE_ACCESS_TOKEN and the production Supabase URL are required.');
const url=`https://api.supabase.com/v1/projects/${encodeURIComponent(project)}/config/auth`;
async function request(method,body){
 const response=await fetch(url,{method,headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(20000)});
 if(!response.ok)throw new Error(`Auth security configuration failed (HTTP ${response.status}). Check project plan and token permissions.`);
 return response.json();
}
const before=await request('GET');
if(process.argv.includes('--apply')&&!before.password_hibp_enabled)await request('PATCH',{password_hibp_enabled:true});
const enabled=(await request('GET')).password_hibp_enabled===true;
console.log(JSON.stringify({project,password_hibp_enabled:enabled,mode:process.argv.includes('--apply')?'apply':'check'}));
if(process.argv.includes('--apply')&&!enabled)throw new Error('Leaked password protection is still disabled.');
