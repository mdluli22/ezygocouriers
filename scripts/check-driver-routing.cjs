// Exercise the real IPv4 Routes transport with public landmarks; no customer writes.
require('@next/env').loadEnvConfig(process.cwd());
const {readFileSync}=require('node:fs');
const {resolve,dirname}=require('node:path');
const ts=require('typescript');
const query=async(sql,args)=>sql.startsWith('SELECT')?{rows:[{route_distance_meters:null,plat:-33.9289,plng:18.4175,dlat:-33.9036,dlng:18.4200,pickup:'Company Gardens, Cape Town',dropoff:'V&A Waterfront, Cape Town'}]}:{rows:[{route_distance_meters:args[1]}]};

function load(file) {
  const filename=resolve(file),module={exports:{}};
  const source=ts.transpileModule(readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
  new Function('require','module','exports',source)(name=>name==='@/lib/db/server'?{query}:name.startsWith('.')?load(resolve(dirname(filename),name+'.ts')):require(name),module,module.exports);
  return module.exports;
}
(async()=>{
  const distance=await load('lib/earnings/route-distance.ts').verifyRouteDistance(0);
  if(distance===null){console.error('Routes API check failed; no customer records changed.');process.exitCode=1;}
  else console.log('Routes API verified over IPv4: public-landmark road distance '+distance+' metres. No customer records changed.');
})();
