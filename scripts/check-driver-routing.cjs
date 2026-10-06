// Check server Routes access using public Cape Town landmarks, not customer data.
require('@next/env').loadEnvConfig(process.cwd());
const {readFileSync}=require('node:fs');const ts=require('typescript');
const source=ts.transpileModule(readFileSync('lib/earnings/route-distance.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
const moduleResult={exports:{}};
const originalFetch=global.fetch;
global.fetch=async(...args)=>{const response=await originalFetch(...args);if(!response.ok){const data=await response.clone().json().catch(()=>({}));console.error('Google API diagnostic:',{status:data.error?.status,reasons:data.error?.details?.map(detail=>detail.reason).filter(Boolean)});}return response;};
const query=async(sql,args)=>sql.startsWith('SELECT')?{rows:[{route_distance_meters:null,plat:-33.9289,plng:18.4175,dlat:-33.9036,dlng:18.4200,pickup:'Company Gardens, Cape Town',dropoff:'V&A Waterfront, Cape Town'}]}:{rows:[{route_distance_meters:args[1]}]};
new Function('require','module','exports',source)(()=>({query}),moduleResult,moduleResult.exports);
(async()=>{const distance=await moduleResult.exports.verifyRouteDistance(0);if(distance===null){console.error('Routes API check failed; no customer records changed.');process.exitCode=1;}else console.log('Routes API verified: public-landmark road distance '+distance+' metres. No customer records changed.');})();
