export class ServiceError extends Error {constructor(message,status=500){super(message);this.status=status;}}
export async function redis(command){
 const url=process.env.UPSTASH_REDIS_REST_URL||process.env.KV_REST_API_URL;
 const token=process.env.UPSTASH_REDIS_REST_TOKEN||process.env.KV_REST_API_TOKEN;
 if(!url||!token)throw new ServiceError('공용 저장소 연결이 필요합니다. 관리자가 Redis 환경변수를 설정한 뒤 다시 배포해 주세요.',503);
 const response=await fetch(url.replace(/\/$/,''),{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(command),signal:AbortSignal.timeout(6500),cache:'no-store'});
 const body=await response.json();if(!response.ok||body.error)throw new ServiceError('공용 저장소에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.',503);
 return body.result;
}
export const compareAndSetScript="if redis.call('GET',KEYS[1]) == ARGV[1] then redis.call('SET',KEYS[1],ARGV[2]); return 1 else return 0 end";
const prefix='kuda-timer:v1:';
export const store={
 async get(id){return await redis(['GET',prefix+id]);},
 async create(id,value){return await redis(['SET',prefix+id,value,'NX'])==='OK';},
 async cas(id,oldValue,value){return await redis(['EVAL',compareAndSetScript,'1',prefix+id,oldValue,value])===1;},
 async limit(ip){const script="local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('EXPIRE',KEYS[1],3600) end; return n";return await redis(['EVAL',script,'1',prefix+'rate:'+ip])<=30;}
};
