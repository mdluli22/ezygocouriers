"use client";
import { useEffect,useState } from "react";
interface Review {id:number;status:string;amount:string;currency:string;refund_reference:string|null}
export default function DeliveryRecovery({deliveryId,canResend}:{deliveryId:number;canResend:boolean}) {
  const [reviews,setReviews]=useState<Review[]>([]),[message,setMessage]=useState(""),[busy,setBusy]=useState(false);
  useEffect(()=>{const controller=new AbortController();fetch(`/api/deliveries/${deliveryId}/recovery`,{signal:controller.signal,cache:"no-store"}).then(r=>r.json()).then(d=>{if(d.success)setReviews(d.data.reviews);}).catch(()=>{});return()=>controller.abort();},[deliveryId]);
  async function resend(){setBusy(true);try{const r=await fetch(`/api/deliveries/${deliveryId}/recovery`,{method:"POST"});const d=await r.json();setMessage(d.message || "Unable to request a new PIN.");}catch{setMessage("Unable to connect. Please try again.");}finally{setBusy(false);}}
  if(!canResend&&!reviews.length)return null;
  return <section className="tracking-panel space-y-3"><h2>Payment and handover support</h2>
    {reviews.map(r=><p key={r.id}>{r.status==="pending"?"Payment under review. A refund has not been confirmed.":r.status==="refunded"?`Refund recorded${r.refund_reference?` (${r.refund_reference})`:""}. Bank processing times may apply.`:"Payment review completed. Contact support for details."} {r.currency} {Number(r.amount).toFixed(2)}</p>)}
    {canResend&&<button className="tracking-primary-button" disabled={busy} onClick={()=>void resend()}>{busy?"Requesting PIN…":"Send a new PIN to the recipient"}</button>}
    {message&&<p role="status">{message}</p>}
  </section>;
}
