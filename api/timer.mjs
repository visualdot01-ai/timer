import { store } from '../server/store.mjs';
import { readTimer,updateTimer } from '../server/core.mjs';
import { respond,failure,sameSite,payload,timerId } from '../server/http.mjs';
export default async function handler(req,res){try{const id=timerId(req);if(req.method==='GET')return respond(res,await readTimer(store,id));if(req.method==='POST'){sameSite(req);const key=String(req.headers.authorization||'').replace(/^Bearer /,'');return respond(res,await updateTimer(store,id,key,payload(req)));}res.setHeader('Allow','GET, POST');return respond(res,{error:'지원하지 않는 요청입니다.'},405);}catch(error){failure(res,error);}}
