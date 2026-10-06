"use client";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, RefreshCw } from "lucide-react";
import { distanceLabel, localDate, money, shiftDate, weekStart } from "@/lib/earnings/calculation";
import { useTimedMessage } from "@/components/ui/useTimedMessage";
import "./earnings.css";

type Earning = {delivery_id:number;tracking_number:string;completed_at:string|null;distance_meters:number|null;amount_cents:number|null;distance_source:string|null};
type Driver = {id:number;full_name:string;completedCount:number;distanceMeters:number;pendingCount:number;totalCents:number;owedCents:number;paidCents:number;monthlyCount:number;monthlyBonusCents:number;payment:{paid_at:string;reference:string}|null;deliveries:Earning[]};
type Report = {period:{start:string;end:string;payDate:string};month:string;currentWeek:string;canRecordPayment:boolean;drivers:Driver[]};
const dateLabel=(value:string)=>new Date(`${value}T12:00:00+02:00`).toLocaleDateString("en-ZA",{day:"numeric",month:"short",year:"numeric"});

function ReviewForm({earning,onSave,busy}:{earning:Earning;onSave:(body:unknown)=>Promise<boolean>;busy:boolean}) {
  const [km,setKm]=useState(earning.distance_meters===null?"":String(earning.distance_meters/1000));
  const [amount,setAmount]=useState("");const [note,setNote]=useState("");const [completed,setCompleted]=useState("");
  return <form className="earning-review" onSubmit={async event=>{
    event.preventDefault();
    await onSave({action:"approve",deliveryId:earning.delivery_id,meters:Math.round(Number(km)*1000),
      ...(Number(km)>30?{amountCents:Math.round(Number(amount)*100)}:{}),
      ...(!earning.completed_at?{completedAt:`${completed}:00+02:00`}:{}),note});
  }}>
    <button type="button" className="btn-outline" disabled={busy} onClick={()=>void onSave({action:"route",deliveryId:earning.delivery_id})}>Calculate road distance</button>
    <label>Verified collection-to-delivery distance (km)<input className="input" type="number" min="0" max="2000" step="0.001" value={km} onChange={e=>setKm(e.target.value)} required /></label>
    {Number(km)>30&&<label>Approved rider pay (R)<input className="input" type="number" min="32" max="100000" step="0.01" value={amount} onChange={e=>setAmount(e.target.value)} required /></label>}
    {!earning.completed_at&&<label>Verified completion time (South Africa)<input className="input" type="datetime-local" value={completed} onChange={e=>setCompleted(e.target.value)} required /></label>}
    <label>Verification note<input className="input" minLength={5} maxLength={1000} value={note} onChange={e=>setNote(e.target.value)} placeholder="Route checked against delivery record" required /></label>
    <button className="btn-primary" disabled={busy}>Approve earnings</button>
  </form>;
}

function PaymentForm({driver,week,onSave,busy}:{driver:Driver;week:string;onSave:(body:unknown)=>Promise<boolean>;busy:boolean}) {
  const [reference,setReference]=useState("");
  return <details className="earning-payment"><summary>Record payment of {money(driver.owedCents)}</summary>
    <form onSubmit={async event=>{event.preventDefault();await onSave({action:"paid",driverId:driver.id,week,reference,expectedAmountCents:driver.owedCents});}}>
      <label>Bank payment reference<input className="input" value={reference} onChange={e=>setReference(e.target.value)} minLength={3} maxLength={200} required /></label>
      <label className="earning-confirm"><input type="checkbox" required />I have paid {money(driver.owedCents)} to this driver.</label>
      <button className="btn-primary" disabled={busy}>Save payment record</button>
    </form>
  </details>;
}

export default function EarningsPanel({admin=false}:{admin?:boolean}) {
  const [week,setWeek]=useState(()=>admin?shiftDate(weekStart(),-7):weekStart());
  const [month,setMonth]=useState(()=>localDate().slice(0,7));
  const [report,setReport]=useState<Report|null>(null);const [error,setError]=useState("");
  const [loading,setLoading]=useState(true);const [busy,setBusy]=useState(false);
  const [message,setMessage]=useTimedMessage("", "", 5000);
  const endpoint=admin?"/api/admin/earnings":"/api/driver/earnings";
  const load=useCallback(async(signal?:AbortSignal)=>{
    setLoading(true);setError("");
    try {
      const response=await fetch(`${endpoint}?week=${week}&month=${month}`,{cache:"no-store",signal});const data=await response.json();
      if(!response.ok)throw new Error(data.message||"Unable to load earnings");
      if(!signal?.aborted)setReport(data.data);
    }catch(err){if(!signal?.aborted){setReport(null);setError(err instanceof Error?err.message:"Unable to load earnings");}}
    finally{if(!signal?.aborted)setLoading(false);}
  },[endpoint,week,month]);
  useEffect(()=>{const controller=new AbortController();void load(controller.signal);return()=>controller.abort();},[load]);
  async function save(body:unknown) {
    setBusy(true);setError("");
    try {const response=await fetch(endpoint,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});const data=await response.json();if(!response.ok)throw new Error(data.message||"Unable to save earnings");setMessage(data.message);await load();return true;}
    catch(err){setError(err instanceof Error?err.message:"Unable to save earnings");return false;}finally{setBusy(false);}
  }
  return <section className="earnings-panel" aria-label={admin?"Weekly driver payouts":"Your earnings"} aria-busy={loading}>
    <header className="earnings-heading"><h2>{admin?"Weekly driver payouts":"Your earnings"}</h2><button className="btn-outline" disabled={loading||busy} onClick={()=>void load()} aria-label="Refresh earnings"><RefreshCw size={16}/></button></header>
    <div className="earnings-controls">
      <button className="btn-outline" disabled={busy} onClick={()=>setWeek(shiftDate(week,-7))} aria-label="Previous week"><ArrowLeft size={16}/></button>
      <label>Week starting Monday<input className="input" type="date" value={week} disabled={busy} onChange={event=>{if(event.target.value)setWeek(weekStart(new Date(`${event.target.value}T12:00:00+02:00`)));}}/></label>
      <button className="btn-outline" disabled={busy||week>=weekStart()} onClick={()=>setWeek(shiftDate(week,7))} aria-label="Next week"><ArrowRight size={16}/></button>
      <label>Bonus month<input className="input" type="month" value={month} disabled={busy} onChange={event=>{if(event.target.value)setMonth(event.target.value);}}/></label>
    </div>
    {message&&<p role="status" className="earnings-success">{message}</p>}
    {error&&<p role="alert" className="earnings-warning">{error}</p>}
    {loading?<p role="status">Loading earnings…</p>:report&&<>
      <p className="earnings-period">{dateLabel(report.period.start)} to {dateLabel(report.period.end)} · Payment due Monday, {dateLabel(report.period.payDate)} · South African time</p>
      {report.drivers.length===0&&<p>No driver records available.</p>}
      <div className="earnings-drivers">{report.drivers.map(driver=><article className="earning-driver" key={driver.id}>
        {admin&&<h3>{driver.full_name}</h3>}
        <dl className="earning-totals">
          <div><dt>{driver.pendingCount?"Confirmed amount owed":"Amount owed"}</dt><dd>{money(driver.owedCents)}</dd></div>
          <div><dt>Completed deliveries</dt><dd>{driver.completedCount}</dd></div>
          <div><dt>Verified delivery distance</dt><dd>{distanceLabel(driver.distanceMeters)}</dd></div>
        </dl>
        {driver.pendingCount>0&&<p className="earnings-warning">{driver.pendingCount} {driver.pendingCount===1?"delivery needs":"deliveries need"} distance, rate or completion verification. The amount above excludes unresolved pay.</p>}
        {driver.payment&&<p className="earnings-success">Paid {money(driver.paidCents)} · {new Date(driver.payment.paid_at).toLocaleDateString("en-ZA",{timeZone:"Africa/Johannesburg"})} · Reference: {driver.payment.reference}</p>}
        <div className="earning-bonus"><span>Monthly performance bonus · {report.month}</span><strong>{money(driver.monthlyBonusCents)}</strong><small>{driver.monthlyCount} completed deliveries. Shown separately from weekly pay{report.month===localDate().slice(0,7)?"; month still in progress":""}.</small></div>
        <details className="earning-breakdown"><summary>Delivery breakdown ({driver.deliveries.length})</summary>
          {driver.deliveries.length===0?<p>No completed deliveries in this week.</p>:<ul>{driver.deliveries.map(earning=><li key={earning.delivery_id}>
            <div className="earning-line"><strong>{earning.tracking_number}</strong><span>{distanceLabel(earning.distance_meters)}</span><strong>{earning.amount_cents===null?"Awaiting approval":money(earning.amount_cents)}</strong></div>
            <p>{earning.completed_at?new Date(earning.completed_at).toLocaleString("en-ZA",{timeZone:"Africa/Johannesburg"}):"Completion date needs verification; not included in the weekly total"}</p>
            {admin&&!driver.payment&&earning.amount_cents===null&&<ReviewForm earning={earning} busy={busy} onSave={save}/>}
          </li>)}</ul>}
        </details>
        {admin&&!driver.payment&&driver.completedCount>0&&driver.pendingCount===0&&report.canRecordPayment&&<PaymentForm driver={driver} week={week} busy={busy} onSave={save}/>}
      </article>)}</div>
    </>}
  </section>;
}
