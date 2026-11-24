import { hash } from './core.mjs';
import { ServiceError } from './store.mjs';
export function respond(res,value,status=200){res.setHeader('Cache-Control','no-store, max-age=0');res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Referrer-Policy','no-referrer');res.statusCode=status;res.end(JSON.stringify(value));}
export function failure(res,error){respond(res,{error:error instanceof ServiceError?error.message:'서버와 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.'},error instanceof ServiceError?error.status:503);}
export function sameSite(req){if(req.headers['sec-fetch-site']==='cross-site')throw new ServiceError('허용되지 않은 요청입니다.',403);}
export function payload(req){let body;try{body=typeof req.body==='string'?JSON.parse(req.body):req.body;}catch{throw new ServiceError('요청 형식이 올바르지 않습니다.',400);}if(!body||Array.isArray(body)||typeof body!=='object')throw new ServiceError('요청 내용을 확인해 주세요.',400);if(JSON.stringify(body).length>2048)throw new ServiceError('요청이 너무 큽니다.',413);return body;}
export function timerId(req){const url=new URL(req.url,'https://localhost');const id=req.query?.id||url.searchParams.get('id');if(typeof id!=='string'||!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(id))throw new ServiceError('타이머 링크를 확인해 주세요.',400);return id;}
export function ipHash(req){return hash(String(req.headers['x-real-ip']||req.headers['x-forwarded-for']||'anonymous').split(',')[0].trim());}
