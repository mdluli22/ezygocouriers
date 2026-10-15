"use client";
import { useCallback, useEffect, useState } from "react";
interface Review {id:number;tracking_number:string;reason:string;amount:string;currency:string;status:string;refund_reference:string|null}
interface Job {id:number;tracking_number:string|null;kind:string;status:string;attempts:number}
async function fetchOperations(signal?: AbortSignal): Promise<{reviews:Review[];notifications:Job[]}> {
  const response=await fetch("/api/admin/payments",{cache:"no-store",signal});
  const result=await response.json();
  if(!response.ok)throw new Error(result.message || "Unable to load payment operations.");
  return result.data;
}
export default function PaymentOperations() {
  const [reviews,setReviews]=useState<Review[]>([]),[jobs,setJobs]=useState<Job[]>([]);
  const [error,setError]=useState(""),[busy,setBusy]=useState(false),[loading,setLoading]=useState(true);
  const [notes,setNotes]=useState<Record<number,string>>({}),[references,setReferences]=useState<Record<number,string>>({});
  const load=useCallback(async()=>{
    try { const data=await fetchOperations();setReviews(data.reviews);setJobs(data.notifications); }
    catch(e){setError(e instanceof Error?e.message:"Unable to load payment operations.");}finally{setLoading(false);}
  },[]);
  useEffect(()=>{
    const controller=new AbortController();
    fetchOperations(controller.signal)
      .then(data=>{setReviews(data.reviews);setJobs(data.notifications);})
      .catch(error=>{if(!controller.signal.aborted)setError(error instanceof Error?error.message:"Unable to load payment operations.");})
      .finally(()=>{if(!controller.signal.aborted)setLoading(false);});
    return()=>controller.abort();
  },[]);
  async function update(body:unknown) {
    setBusy(true);setError("");
    try {const r=await fetch("/api/admin/payments",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});const d=await r.json();if(!r.ok)throw new Error(d.message || "Update failed.");await load();}
    catch(e){setError(e instanceof Error?e.message:"Update failed.");}finally{setBusy(false);}
  }
  return <main className="space-y-6"><h1 className="text-3xl font-bold">Payment reviews</h1>
    <p>Review cancellations and late payments. Record refunds here after completing them with the payment provider.</p>
    {error&&<p role="alert">{error}</p>}{loading&&<p role="status">Loading payment reviews…</p>}
    {!loading&&!reviews.length&&<p>No payment reviews.</p>}
    {reviews.map(r=><section key={r.id} className="p-4 rounded-xl border space-y-3" style={{borderColor:"var(--color-border)"}}>
      <h2 className="font-bold">{r.tracking_number} · {r.currency} {Number(r.amount).toFixed(2)}</h2><p>{r.reason}</p><p>Status: {r.status}{r.refund_reference?` · Reference: ${r.refund_reference}`:""}</p>
      {r.status==="pending"&&<><label className="block">Resolution note<textarea className="input" minLength={10} maxLength={1000} value={notes[r.id]||""} onChange={e=>setNotes({...notes,[r.id]:e.target.value})}/></label>
        <label className="block">Provider refund reference<input className="input" maxLength={200} value={references[r.id]||""} onChange={e=>setReferences({...references,[r.id]:e.target.value})}/></label>
        <div className="flex flex-wrap gap-3"><button className="btn-primary" disabled={busy||!(references[r.id]||"").trim()||(notes[r.id]||"").trim().length<10} onClick={()=>void update({action:"resolve",id:r.id,status:"refunded",note:notes[r.id],reference:references[r.id]})}>Record completed refund</button>
        <button className="btn-outline" disabled={busy||(notes[r.id]||"").trim().length<10} onClick={()=>void update({action:"resolve",id:r.id,status:"resolved",note:notes[r.id]})}>Resolve without refund</button></div></>}
    </section>)}
    <h2 className="text-2xl font-bold">Notification recovery</h2>{!loading&&!jobs.length&&<p>No notification failures.</p>}
    {jobs.map(j=><section key={j.id} className="p-4 border rounded-xl"><h3>{j.tracking_number||"Push notification"}</h3><p>{j.kind.replaceAll("_"," ")} · {j.status} · {j.attempts} attempts</p>{j.status==="failed"&&<button className="btn-outline" disabled={busy} onClick={()=>void update({action:"retry_notification",id:j.id})}>Retry notification</button>}</section>)}
  </main>;
}
