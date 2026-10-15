import { distanceLabel, money } from "@/lib/earnings/calculation";
export interface DeliveryEarningsData {
  status:string;
  distance_meters:number|null;
  earning_cents:number|null;
  estimated_earning_cents:number|null;
}
export default function DeliveryEarnings({delivery}:{delivery:DeliveryEarningsData}) {
  const completed=delivery.status==="delivered";
  const closed=delivery.status==="cancelled"||delivery.status==="failed";
  const cents=completed?delivery.earning_cents:delivery.estimated_earning_cents;
  return <div className="delivery-earnings"><span>Collection to delivery: {distanceLabel(delivery.distance_meters??null)}</span><strong>{closed?"No completed-delivery pay":cents==null?"Rider pay awaiting verification / approval":`${completed?"Earned":"Pay on completion"}: ${money(cents)}`}</strong></div>;
}
