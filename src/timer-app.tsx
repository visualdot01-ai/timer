"use client";
import { useState, useEffect, useRef } from "react";
type Snapshot={id:string;title:string;durationMs:number;remainingMs:number;endAt:number|null;running:boolean;revision:number;serverNow:number};
const two=(n:number)=>String(n).padStart(2,"0");
export default function TimerApp({mode,id}:{mode:"create"|"admin"|"view";id?:string}) {
 const [data,setData]=useState<Snapshot|null>(null);const [remaining,setRemaining]=useState(600000);
 const [title,setTitle]=useState("행사 타이머");const [hours,setHours]=useState("00");const [minutes,setMinutes]=useState("10");const [seconds,setSeconds]=useState("00");
 const [busy,setBusy]=useState(false);const [error,setError]=useState("");const [connected,setConnected]=useState(false);const [key,setKey]=useState("");const [ready,setReady]=useState(false);const [copied,setCopied]=useState("");
 const [settingsOpen,setSettingsOpen]=useState(false);
 const settingsDialog=useRef<HTMLDialogElement>(null);
 const settingsButton=useRef<HTMLButtonElement>(null);
 useEffect(()=>{if(settingsOpen&&!settingsDialog.current?.open)settingsDialog.current?.showModal();else if(!settingsOpen&&settingsDialog.current?.open)settingsDialog.current?.close();},[settingsOpen]);
 function openSettings(){if(data){const total=Math.floor(data.durationMs/1000);setHours(two(Math.floor(total/3600)));setMinutes(two(Math.floor(total/60)%60));setSeconds(two(total%60));}setError("");setSettingsOpen(true);}
 function closeSettings(){setSettingsOpen(false);settingsButton.current?.focus();}
 const anchor=useRef({time:performance.now(),ms:600000,running:false});const lastRevision=useRef(-1);const initialized=useRef(false);const lastSuccess=useRef(0);const requestSequence=useRef(0);const acceptedSequence=useRef(0);
 const isAdmin=mode==="admin";const isCreate=mode==="create";
 function accept(next:Snapshot,start:number,sequence:number){
  if(next.revision<lastRevision.current||(next.revision===lastRevision.current&&sequence<acceptedSequence.current))return;
  acceptedSequence.current=sequence;lastRevision.current=next.revision;
  const transit=(performance.now()-start)/2;
  const ms=next.running?Math.max(0,(next.endAt??next.serverNow)-next.serverNow-transit):next.remainingMs;
  anchor.current={time:performance.now(),ms,running:next.running};setData(next);setRemaining(ms);setConnected(true);lastSuccess.current=performance.now();
  if(!initialized.current){setTitle(next.title);setHours(two(Math.floor(next.durationMs/3600000)));setMinutes(two(Math.floor(next.durationMs/60000)%60));setSeconds(two(Math.floor(next.durationMs/1000)%60));initialized.current=true;}
 }
 useEffect(()=>{if(!isAdmin){setReady(true);return;}const fragment=new URLSearchParams(location.hash.slice(1)).get("key");let saved="";try{saved=sessionStorage.getItem("timer-admin:"+id)||"";if(fragment)sessionStorage.setItem("timer-admin:"+id,fragment);}catch{}setKey(fragment||saved);setReady(true);},[id,isAdmin]);
 useEffect(()=>{
  if(!id)return;let active=true;let controller:AbortController|null=null;
  async function poll(){controller=new AbortController();const timeout=setTimeout(()=>controller?.abort(),7000);const start=performance.now();const seq=++requestSequence.current;
   try{const res=await fetch("/api/timers/"+id,{cache:"no-store",signal:controller.signal});const value=await res.json();if(!res.ok)throw Error(value.error);if(active){if(lastRevision.current<0)setError("");accept(value,start,seq);}}
   catch(e){if(active){setConnected(false);if(lastRevision.current<0)setError(e instanceof Error?e.message:"연결을 확인해 주세요.");}}
   finally{clearTimeout(timeout);if(active)timer=setTimeout(poll,1000);}}
  let timer:ReturnType<typeof setTimeout>;void poll();return()=>{active=false;clearTimeout(timer);controller?.abort();};
 },[id]);
 useEffect(()=>{const timer=setInterval(()=>{const a=anchor.current;if(a.running)setRemaining(Math.max(0,a.ms-(performance.now()-a.time)));if(lastSuccess.current&&performance.now()-lastSuccess.current>5000)setConnected(false);},100);return()=>clearInterval(timer);},[]);
 function duration(){return (Number(hours)*3600+Number(minutes)*60+Number(seconds))*1000;}

 async function create(start=false){setBusy(true);setError("");try{const res=await fetch("/api/timers",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({title,durationMs:duration()})});const value=await res.json();if(!res.ok)throw Error(value.error);if(start){try{await fetch("/api/timers/"+value.timer.id,{method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+value.adminKey},body:JSON.stringify({action:"start",revision:value.timer.revision})});}catch{}}location.assign("/admin/"+value.timer.id+"#key="+value.adminKey);}catch(e){setError(e instanceof Error?e.message:"다시 시도해 주세요.");setBusy(false);}}
 async function command(action:string){if(!data||busy)return;setBusy(true);setError("");try{const start=performance.now();const seq=++requestSequence.current;const res=await fetch("/api/timers/"+id,{method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+key},body:JSON.stringify({action,revision:data.revision,...(action==="configure"?{title,durationMs:duration()}: {})})});const value=await res.json();if(!res.ok)throw Error(value.error);accept(value,start,seq);if(action==="configure")setSettingsOpen(false);}catch(e){setError(e instanceof Error?e.message:"변경에 실패했습니다.");}finally{setBusy(false);}}
 async function copy(kind:"view"|"admin"){const url=location.origin+"/"+(kind==="view"?"view/":"admin/")+id+(kind==="admin"?"#key="+key:"");try{await navigator.clipboard.writeText(url);setCopied(kind);setTimeout(()=>setCopied(""),2000);}catch{setError("링크를 복사하지 못했습니다. 다시 시도해 주세요.");}}

 const running=!!data?.running&&remaining>0;

 const allowed=isCreate||(!!key&&!!data&&connected);
 const total=Math.max(0,Math.ceil((isCreate?duration():remaining)/1000));
 const display=!isCreate&&!data?"--:--:--":`${two(Math.floor(total/3600))}:${two(Math.floor(total/60)%60)}:${two(total%60)}`;
 return <main className={`timer-screen ${mode}`}>
  <div className="timer-content">
   <div className="time" role="timer" aria-label={!isCreate&&!data?"시간 불러오는 중":`남은 시간 ${display}`} data-disconnected={!isCreate&&!connected} title={!isCreate&&!connected?"연결 확인 중":undefined}>{display}</div>
   {mode!=="view"&&<div className="controls" aria-label="타이머 제어">
    <button type="button" ref={settingsButton} onClick={openSettings} disabled={busy}>설정</button>
    <button type="button" className="start" onClick={()=>isCreate?create(true):command("start")} disabled={busy||!allowed||running}>시작</button>
    <button type="button" onClick={()=>command("pause")} disabled={busy||!allowed||!running}>멈춤</button>
   </div>}
  </div>
  {mode!=="view"&&error&&!settingsOpen&&<div className="message" role="alert">{error}</div>}
  {mode!=="view"&&<dialog ref={settingsDialog} className="settings" aria-labelledby="settings-title" onCancel={()=>setSettingsOpen(false)} onClose={()=>setSettingsOpen(false)}>
   <div className="settings-heading"><h1 id="settings-title">시간 설정</h1><button type="button" className="close" aria-label="설정 닫기" onClick={closeSettings}>×</button></div>
   <form onSubmit={event=>{event.preventDefault();if(isCreate)void create();else void command("configure");}}>
    <div className="duration-fields">{[[hours,setHours,"시",99],[minutes,setMinutes,"분",59],[seconds,setSeconds,"초",59]].map(([value,setter,label,max])=><label key={String(label)}>
     <input aria-label={String(label)} type="number" min="0" max={Number(max)} step="1" inputMode="numeric" value={String(value)} onChange={event=>{const raw=event.target.value;(setter as (s:string)=>void)(raw===""?"":String(Math.max(0,Math.min(Number(max),Math.floor(Number(raw)||0)))));}} onBlur={()=>{(setter as (s:string)=>void)(two(Number(value)||0));}}/>
     <span>{String(label)}</span>
    </label>)}</div>
    {error&&<p className="settings-error" role="alert">{error}</p>}
    {ready&&isAdmin&&!key&&<p className="settings-error" role="alert">관리자 링크로 접속해 주세요.</p>}
    <button type="submit" className="apply" disabled={busy||duration()<1000||!allowed}>{busy?"적용 중…":"적용"}</button>
   </form>
   {id&&<button type="button" className="share" onClick={()=>copy("view")}>{copied==="view"?"복사됨":"이용자 링크 복사"}</button>}
  </dialog>}
 </main>;
}
