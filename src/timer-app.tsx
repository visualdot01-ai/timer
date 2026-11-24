"use client";
import { useState, useEffect, useRef } from "react";
import { Timer, Play, Pause, RotateCcw, Maximize, Minimize, Link as LinkIcon, Copy, Check, Radio, ShieldCheck, Eye, Plus, X, LoaderCircle } from "lucide-react";
type Snapshot={id:string;title:string;durationMs:number;remainingMs:number;endAt:number|null;running:boolean;revision:number;serverNow:number};
const two=(n:number)=>String(n).padStart(2,"0");
function Clock({ms}:{ms:number}){const s=Math.max(0,Math.ceil(ms/1000));return <><span>{two(Math.floor(s/3600))}</span><i>:</i><span>{two(Math.floor(s/60)%60)}</span><i>:</i><span>{two(s%60)}</span></>;}
export default function TimerApp({mode,id}:{mode:"create"|"admin"|"view";id?:string}) {
 const [data,setData]=useState<Snapshot|null>(null);const [remaining,setRemaining]=useState(600000);
 const [title,setTitle]=useState("행사 타이머");const [hours,setHours]=useState("00");const [minutes,setMinutes]=useState("10");const [seconds,setSeconds]=useState("00");
 const [busy,setBusy]=useState(false);const [error,setError]=useState("");const [connected,setConnected]=useState(false);const [key,setKey]=useState("");const [ready,setReady]=useState(false);const [copied,setCopied]=useState("");const [full,setFull]=useState(false);const [confirmReset,setConfirmReset]=useState(false);
 const anchor=useRef({time:performance.now(),ms:600000,running:false});const lastRevision=useRef(-1);const initialized=useRef(false);const lastSuccess=useRef(0);const requestSequence=useRef(0);const acceptedSequence=useRef(0);
 const isAdmin=mode==="admin";const isCreate=mode==="create";
 function accept(next:Snapshot,start:number,sequence:number){
  if(next.revision<lastRevision.current||sequence<acceptedSequence.current)return;
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
 useEffect(()=>{const change=()=>setFull(!!document.fullscreenElement);document.addEventListener("fullscreenchange",change);return()=>document.removeEventListener("fullscreenchange",change);},[]);
 function duration(){return (Number(hours)*3600+Number(minutes)*60+Number(seconds))*1000;}
 function preset(n:number){setHours("00");setMinutes(two(n));setSeconds("00");if(isCreate)setRemaining(n*60000);}
 async function create(){setBusy(true);setError("");try{const res=await fetch("/api/timers",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({title,durationMs:duration()})});const value=await res.json();if(!res.ok)throw Error(value.error);location.assign("/admin/"+value.timer.id+"#key="+value.adminKey);}catch(e){setError(e instanceof Error?e.message:"다시 시도해 주세요.");setBusy(false);}}
 async function command(action:string){if(!data||busy)return;setBusy(true);setError("");try{const start=performance.now();const seq=++requestSequence.current;const res=await fetch("/api/timers/"+id,{method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+key},body:JSON.stringify({action,revision:data.revision,...(action==="configure"?{title,durationMs:duration()}: {})})});const value=await res.json();if(!res.ok)throw Error(value.error);accept(value,start,seq);}catch(e){setError(e instanceof Error?e.message:"변경에 실패했습니다.");}finally{setBusy(false);setConfirmReset(false);}}
 async function copy(kind:"view"|"admin"){const url=location.origin+"/"+(kind==="view"?"view/":"admin/")+id+(kind==="admin"?"#key="+key:"");try{await navigator.clipboard.writeText(url);setCopied(kind);setTimeout(()=>setCopied(""),2000);}catch{setError("링크를 복사하지 못했습니다. 아래 주소를 선택해 복사해 주세요.");}}
 async function fullscreen(){try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{setError("이 브라우저에서는 전체화면이 지원되지 않습니다.");}}
 const running=!!data?.running&&remaining>0;const ended=!!data&&remaining<=0;const warning=!!data&&remaining>0&&remaining<=60000;const percent=data?Math.min(100,Math.max(0,remaining/data.durationMs*100)):100;
 const status=isCreate?"준비된 시간":!data?"불러오는 중":ended?"시간 종료":running?"진행 중":data.remainingMs<data.durationMs?"일시정지":"시작 대기";
 return <div className={`app ${mode} ${full?"is-full":""}`}>
  <header className="topbar"><a className="brand" href="/" aria-label="KUDA TIMER 홈"><span className="brand-icon"><Timer size={21}/></span><b>KUDA<span> TIMER</span></b></a><div className="top-right"><span className="mode-badge">{isAdmin?<ShieldCheck size={14}/>:mode==="view"?<Eye size={14}/>:<Radio size={14}/>} {isAdmin?"관리자 모드":mode==="view"?"이용자 모드":"라이브 타이머"}</span>{!isCreate&&<button className="icon-button" title={full?"전체화면 종료":"전체화면"} aria-label={full?"전체화면 종료":"전체화면"} onClick={fullscreen}>{full?<Minimize size={19}/>:<Maximize size={19}/>}</button>}</div></header>
  <main>
   <div className="page-heading"><div><div className="eyebrow">ONE CLOCK. EVERY SCREEN.</div><h1>{isCreate?<>함께 보는 시간,<br/>한 곳에서 컨트롤.</>:isAdmin?"타이머 컨트롤":data?.title||"라이브 타이머"}</h1><p>{isCreate?"링크 하나로 연결되는 모두의 타이머.":isAdmin?"설정부터 공유까지, 여기서 한 번에 제어하세요.":"관리자가 설정한 시간이 실시간으로 표시됩니다."}</p></div>{!isCreate&&<div className={`connection ${connected?"online":""}`}><span/>{connected?"실시간 연결됨":"연결 확인 중"}</div>}</div>
   {error&&<div className="error" role="alert"><span>{error}</span><button aria-label="알림 닫기" onClick={()=>setError("")}><X size={17}/></button></div>}
   {ready&&isAdmin&&!key&&<div className="error">관리자 키가 없는 링크입니다. 권한이 포함된 원래 관리자 링크로 접속해 주세요. <a href={"/view/"+id}>보기 전용 화면 열기</a></div>}
   <div className="workspace">
    <section className={`clock-panel ${warning?"warning":""} ${ended?"ended":""}`} aria-label="타이머">
     <div className="clock-top"><span className="panel-label">{isCreate?"TIMER PREVIEW":data?.title||"LIVE TIMER"}</span><span className={`status ${running?"running":""}`}>{running&&<span/>}{status}</span></div>
     <div className="clock-center"><p className="time-caption">{ended?"설정한 시간이 모두 지났습니다":"남은 시간"}</p><div className="digits" role="timer" aria-label={!isCreate&&!data?"불러오는 중":`남은 시간 ${Math.ceil(remaining/1000)}초`}>{!isCreate&&!data?<><span>--</span><i>:</i><span>--</span><i>:</i><span>--</span></>:<Clock ms={isCreate?duration():remaining}/>}</div><div className="digit-labels"><span>HOURS</span><span>MINUTES</span><span>SECONDS</span></div></div>
     <div className="clock-bottom"><div className="progress-meta"><span>{ended?"완료":running?"시간이 흐르고 있습니다":isCreate?"타이머를 만들면 공유할 수 있어요":data&&data.remainingMs<data.durationMs?"일시정지 상태입니다":"시작할 준비가 되었습니다"}</span><span>{data?`전체 ${Math.floor(data.durationMs/60000)}분 ${Math.floor(data.durationMs/1000)%60}초`:"READY"}</span></div><div className="progress-track"><span style={{width:percent+"%"}}/></div></div>
     {isAdmin&&<div className="playback"><button className={`primary ${running?"pause":""}`} disabled={busy||!key||!data||!connected} onClick={()=>command(running?"pause":"start")}>{busy?<LoaderCircle className="spin" size={19}/>:running?<Pause size={19}/>:<Play size={19} fill="currentColor"/>}{running?"일시정지":ended?"다시 시작":"시작"}</button><button className="reset" disabled={busy||!key||!data||!connected} onClick={()=>setConfirmReset(true)}><RotateCcw size={18}/>리셋</button></div>}
    </section>
    {mode!=="view"&&<aside className="side-panel"><div className="section-title"><span className="small-icon"><Timer size={19}/></span><div><h2>시간 설정</h2><p>{isCreate?"타이머의 이름과 시간을 정해주세요.":"시간을 적용하면 대기 상태로 바뀝니다."}</p></div></div>
     <label className="field-label" htmlFor="timer-title">타이머 이름</label><input id="timer-title" className="title-input" maxLength={60} value={title} onChange={e=>setTitle(e.target.value)} placeholder="예: 발표 시간"/>
     <div className="field-label duration-label">카운트다운 시간</div><div className="time-inputs">{[[hours,setHours,"시",99],[minutes,setMinutes,"분",59],[seconds,setSeconds,"초",59]].map(([value,setter,label,max])=><label key={String(label)}><input aria-label={String(label)} type="number" min="0" max={Number(max)} inputMode="numeric" value={String(value)} onChange={e=>{const raw=e.target.value;if(raw===""){(setter as (s:string)=>void)("");return;}(setter as (s:string)=>void)(String(Math.max(0,Math.min(Number(max),Math.floor(Number(raw)||0)))));}} onBlur={()=>{(setter as (s:string)=>void)(two(Number(value)||0));}}/><span>{String(label)}</span></label>)}</div>
     <div className="presets">{[5,10,15,30].map(n=><button key={n} className={duration()===n*60000?"selected":""} onClick={()=>preset(n)}>{n}분</button>)}</div>
     <button className={isCreate?"primary create-button":"apply-button"} disabled={busy||duration()<1000||(!isCreate&&(!key||!data||!connected))} onClick={()=>isCreate?create():command("configure")}>{busy?<LoaderCircle size={18} className="spin"/>:isCreate?<Plus size={18}/>:<Check size={18}/>} {isCreate?"타이머 만들기":"시간 적용"}</button>
     <div className="side-note">{isCreate?"설치 없이, 어떤 기기에서든 접속할 수 있어요.":"시작 · 일시정지 · 리셋은 모든 화면에 반영됩니다."}</div>
    </aside>}
   </div>
   {isAdmin&&id&&<section className="share-section"><div className="share-heading"><span className="small-icon"><LinkIcon size={20}/></span><div><h2>화면 공유</h2><p>이용자에게 보기 전용 링크를 전달하세요.</p></div></div><div className="share-links"><div className="share-row"><span className="link-label"><Eye size={16}/>이용자 링크</span><input aria-label="이용자 링크" readOnly value={typeof window!=="undefined"?location.origin+"/view/"+id:""} onFocus={e=>e.target.select()}/><button className="copy-button" onClick={()=>copy("view")}>{copied==="view"?<Check size={16}/>:<Copy size={16}/>}<span>{copied==="view"?"복사됨":"복사"}</span></button><a className="open-link" href={"/view/"+id} target="_blank" rel="noopener noreferrer">열기</a></div>{key&&<div className="admin-link-row"><span><ShieldCheck size={15}/>관리자 링크는 조작 권한을 포함합니다. 따로 보관하세요.</span><button onClick={()=>copy("admin")}>{copied==="admin"?<Check size={14}/>:<Copy size={14}/>}관리자 링크 {copied==="admin"?"복사됨":"복사"}</button></div>}</div></section>}
   {isCreate&&<div className="feature-line"><span><ShieldCheck size={17}/>관리자만 조작</span><span><Radio size={17}/>기기 간 시간 동기화</span><span><Eye size={17}/>이용자는 보기만</span></div>}
   {mode==="view"&&<p className="viewer-note"><Eye size={16}/>보기 전용 화면 · 제어는 관리자에게 문의하세요.</p>}
  </main><footer><span>KUDA TIMER</span><span>같은 시간, 같은 순간.</span></footer>
  {confirmReset&&<div className="modal-backdrop"><div className="modal" role="dialog" aria-modal="true" aria-labelledby="reset-heading"><RotateCcw size={28}/><h2 id="reset-heading">타이머를 리셋할까요?</h2><p>설정한 시간으로 돌아가고 진행이 멈춥니다.</p><div><button className="reset" onClick={()=>setConfirmReset(false)}>취소</button><button className="primary" disabled={busy} onClick={()=>command("reset")}>리셋하기</button></div></div></div>}
 </div>;
}
