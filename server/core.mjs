import { createHash, randomUUID, timingSafeEqual } from 'node:crypto';
import { ServiceError } from './store.mjs';
export const hash=key=>createHash('sha256').update(key).digest('hex');
export function snapshot(row,now=Date.now()) {const remaining=row.running?Math.max(0,row.endAt-now):row.remainingMs;const {adminHash,...safe}=row;return {...safe,running:row.running&&remaining>0,remainingMs:remaining,serverNow:now};}
export function validDuration(value){if(!Number.isInteger(value)||value<1000||value>359999000)throw new ServiceError('1초부터 99시간 59분 59초까지 설정할 수 있습니다.',400);return value;}
export function configureTitle(value){return typeof value==='string'?value.trim().slice(0,60)||'새 타이머':'새 타이머';}
export async function createTimer(storage,body,now=Date.now()){
 const duration=validDuration(body?.durationMs);const key=randomUUID()+randomUUID();const id=randomUUID();
 const row={id,adminHash:hash(key),title:configureTitle(body.title),durationMs:duration,remainingMs:duration,endAt:null,running:false,revision:0};
 if(!await storage.create(id,JSON.stringify(row)))throw new ServiceError('타이머 생성에 실패했습니다. 다시 시도해 주세요.',503);
 return {timer:snapshot(row,now),adminKey:key};
}
export async function readTimer(storage,id,now=Date.now()) {const raw=await storage.get(id);if(!raw)throw new ServiceError('타이머를 찾을 수 없습니다. 링크를 확인해 주세요.',404);return snapshot(JSON.parse(raw),now);}
export async function updateTimer(storage,id,key,body,now=Date.now()) {
 const raw=await storage.get(id);if(!raw)throw new ServiceError('타이머를 찾을 수 없습니다.',404);const row=JSON.parse(raw);
 if(typeof key!=='string'||key.length>200||!timingSafeEqual(Buffer.from(hash(key)),Buffer.from(row.adminHash)))throw new ServiceError('관리자 권한이 없습니다. 원래 관리자 링크로 접속해 주세요.',403);
 if(body?.revision!==row.revision)throw new ServiceError('다른 화면에서 변경되었습니다. 최신 상태를 확인하고 다시 시도해 주세요.',409);
 const next={...row};const remaining=row.running?Math.max(0,row.endAt-now):row.remainingMs;
 switch(body.action){
  case 'start':if(!row.running||remaining<=0){next.remainingMs=remaining>0?remaining:row.durationMs;next.endAt=now+next.remainingMs;next.running=true;}break;
  case 'pause':next.remainingMs=remaining;next.endAt=null;next.running=false;break;
  case 'reset':next.remainingMs=row.durationMs;next.endAt=null;next.running=false;break;
  case 'configure':next.durationMs=validDuration(body.durationMs);next.remainingMs=next.durationMs;next.endAt=null;next.running=false;next.title=configureTitle(body.title);break;
  default:throw new ServiceError('올바르지 않은 명령입니다.',400);
 }
 next.revision++;
 if(!await storage.cas(id,raw,JSON.stringify(next)))throw new ServiceError('동시에 변경되었습니다. 최신 상태에서 다시 시도해 주세요.',409);
 return snapshot(next,now);
}
