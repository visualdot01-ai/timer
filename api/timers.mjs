import { store, ServiceError } from '../server/store.mjs';
import { createTimer } from '../server/core.mjs';
import { respond,failure,sameSite,payload,ipHash } from '../server/http.mjs';
export default async function handler(req,res){try{if(req.method!=='POST'){res.setHeader('Allow','POST');return respond(res,{error:'POST만 사용할 수 있습니다.'},405);}sameSite(req);const body=payload(req);if(!await store.limit(ipHash(req)))throw new ServiceError('잠시 후 새 타이머를 만들어 주세요.',429);return respond(res,await createTimer(store,body),201);}catch(error){failure(res,error);}}
