import { verifyRouteDistance } from "./route-distance";
import type { PoolClient } from "pg";
import { query, getClient } from "@/lib/db/server";
import { deliveryPayCents, localDate, monthlyBonusCents, monthPeriod, weekPeriod, weekStart, RIDER_RATE_VERSION } from "./calculation";

interface EarningRow {
  delivery_id:number;
  driver_id:number;
  completed_at:Date|null;
  distance_meters:number|null;
  amount_cents:number|null;
  tracking_number:string;
}
export class EarningsError extends Error {}
export async function recordCompletion(client: PoolClient, deliveryId: number, driverId: number, meters: number | null) {
  // Serialize completions, approvals and payout recording for this driver.
  await client.query("SELECT pg_advisory_xact_lock(712,$1)",[driverId]);
  await client.query(`INSERT INTO driver_delivery_earnings(delivery_id,driver_id,completed_at,distance_meters,amount_cents,rate_version,distance_source)
    VALUES($1,$2,clock_timestamp(),$3,$4,$5,$6) ON CONFLICT(delivery_id) DO NOTHING`,
    [deliveryId,driverId,meters,deliveryPayCents(meters),RIDER_RATE_VERSION,meters===null?null:"google_routes"]);
}

export async function earningsReport(monday: string, month: string, driverUserId?: number) {
  const period=weekPeriod(monday), monthly=monthPeriod(month);
  const drivers=await query(`SELECT dr.id,u.full_name FROM drivers dr JOIN users u ON u.id=dr.user_id
    WHERE ($1::integer IS NULL OR dr.user_id=$1) ORDER BY u.full_name`,[driverUserId??null]);
  const rows=await query<EarningRow>(`SELECT e.*,d.tracking_number FROM driver_delivery_earnings e
    JOIN deliveries d ON d.id=e.delivery_id JOIN drivers dr ON dr.id=e.driver_id
    WHERE ($3::integer IS NULL OR dr.user_id=$3)
      AND ((e.completed_at >= $1 AND e.completed_at < $2) OR e.completed_at IS NULL)
    ORDER BY e.completed_at DESC NULLS FIRST,e.delivery_id`,[period.from,period.until,driverUserId??null]);
  const bonuses=await query(`SELECT e.driver_id,COUNT(*)::integer AS count FROM driver_delivery_earnings e
    JOIN drivers dr ON dr.id=e.driver_id WHERE e.completed_at >= $1 AND e.completed_at < $2
      AND ($3::integer IS NULL OR dr.user_id=$3) GROUP BY e.driver_id`,[monthly.from,monthly.until,driverUserId??null]);
  const payments=await query(`SELECT p.driver_id,p.amount_cents,p.paid_at,p.reference FROM driver_weekly_payouts p
    JOIN drivers dr ON dr.id=p.driver_id WHERE p.week_start=$1 AND ($2::integer IS NULL OR dr.user_id=$2)`,[monday,driverUserId??null]);
  return {period,month, currentWeek:weekStart(), canRecordPayment:localDate()>=period.payDate,
    drivers:drivers.rows.map(driver=>{
      const deliveries=rows.rows.filter(row=>row.driver_id===driver.id).map(row=>({...row,amount_cents:row.amount_cents===null?null:Number(row.amount_cents)}));
      const dated=deliveries.filter(row=>row.completed_at!==null);
      const totalCents=dated.reduce((sum,row)=>sum+(row.amount_cents??0),0);
      const payment=payments.rows.find(row=>row.driver_id===driver.id);
      const monthlyCount=bonuses.rows.find(row=>row.driver_id===driver.id)?.count??0;
      return {...driver, deliveries, completedCount:dated.length,
        distanceMeters:dated.reduce((sum,row)=>sum+(row.distance_meters??0),0),
        pendingCount:deliveries.filter(row=>row.amount_cents===null||row.completed_at===null).length,
        totalCents,paidCents:payment?Number(payment.amount_cents):0,
        owedCents:Math.max(0,totalCents-(payment?Number(payment.amount_cents):0)),
        payment:payment??null,monthlyCount,monthlyBonusCents:monthlyBonusCents(monthlyCount)};
    })};
}

export async function approveEarning(input:{deliveryId:number;meters:number;amountCents?:number;completedAt?:string;note:string},adminId:number) {
  const client=await getClient();
  try {
    await client.query("BEGIN");
    const identity=await client.query("SELECT driver_id FROM driver_delivery_earnings WHERE delivery_id=$1",[input.deliveryId]);
    if(!identity.rows[0]) throw new EarningsError("Completed delivery earnings not found");
    const driverId=identity.rows[0].driver_id;
    await client.query("SELECT pg_advisory_xact_lock(712,$1)",[driverId]);
    const current=await client.query("SELECT * FROM driver_delivery_earnings WHERE delivery_id=$1 FOR UPDATE",[input.deliveryId]);
    const previous=current.rows[0];
    // Established completion timestamps cannot be moved into another payout period.
    const completedAt=previous.completed_at??input.completedAt;
    if(!completedAt||!Number.isFinite(new Date(completedAt).getTime())||new Date(completedAt)>new Date()) throw new EarningsError("A valid completion time is required");
    const monday=weekStart(new Date(completedAt));
    const paid=await client.query("SELECT id FROM driver_weekly_payouts WHERE driver_id=$1 AND week_start=$2",[driverId,monday]);
    if(paid.rowCount) throw new EarningsError("This week is already paid; earnings are locked");
    const amount=deliveryPayCents(input.meters)??input.amountCents;
    if(amount===undefined||!Number.isSafeInteger(amount)||amount<3200) throw new EarningsError("Deliveries over 30 km need an approved amount of at least R32");
    const updated=await client.query(`UPDATE driver_delivery_earnings SET distance_meters=$2,amount_cents=$3,
      completed_at=$4,distance_source='admin_verified',approved_by=$5,approval_note=$6,approved_at=NOW()
      WHERE delivery_id=$1 RETURNING *`,[input.deliveryId,input.meters,amount,completedAt,adminId,input.note]);
    await client.query(`INSERT INTO driver_earning_audit(delivery_id,admin_id,previous_value,new_value,note) VALUES($1,$2,$3,$4,$5)`,[input.deliveryId,adminId,JSON.stringify(previous),JSON.stringify(updated.rows[0]),input.note]);
    await client.query("COMMIT");
  } catch(error) {await client.query("ROLLBACK");throw error;} finally {client.release();}
}

/** Records an already-made bank payment. Does not initiate a money transfer. */
export async function recordWeeklyPayment(driverId:number,monday:string,reference:string,adminId:number,expectedAmountCents:number) {
  const period=weekPeriod(monday);
  if(localDate()<period.payDate) throw new EarningsError("The week must close before payment can be recorded on Monday");
  const client=await getClient();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(712,$1)",[driverId]);
    const result=await client.query(`SELECT * FROM driver_delivery_earnings WHERE driver_id=$1
      AND ((completed_at >= $2 AND completed_at < $3) OR completed_at IS NULL) FOR UPDATE`,[driverId,period.from,period.until]);
    if(!result.rows.length) throw new EarningsError("There are no completed deliveries for this week");
    if(result.rows.some(row=>row.completed_at===null||row.amount_cents===null)) throw new EarningsError("Resolve pending distance and completion reviews before recording payment");
    const amount=result.rows.reduce((sum,row)=>sum+Number(row.amount_cents),0);
    if(amount!==expectedAmountCents) throw new EarningsError("Earnings changed since you opened this statement. Refresh and check the payment amount.");
    const saved=await client.query(`INSERT INTO driver_weekly_payouts(driver_id,week_start,amount_cents,delivery_count,recorded_by,reference)
      VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(driver_id,week_start) DO NOTHING RETURNING id`,[driverId,monday,amount,result.rows.length,adminId,reference]);
    if(!saved.rowCount) throw new EarningsError("Payment for this week has already been recorded");
    await client.query("COMMIT");
  } catch(error) {await client.query("ROLLBACK");throw error;} finally {client.release();}
}

export async function refreshEarningDistance(deliveryId:number) {
  if(!process.env.GOOGLE_ROUTES_API_KEY) throw new EarningsError("Configure GOOGLE_ROUTES_API_KEY to calculate road distance automatically");
  const identity=await query("SELECT driver_id FROM driver_delivery_earnings WHERE delivery_id=$1",[deliveryId]);
  if(!identity.rows[0]) throw new EarningsError("Completed delivery earnings not found");
  const meters=await verifyRouteDistance(deliveryId);
  if(meters===null)throw new EarningsError("Road distance could not be verified. Check Routes API access or enter a verified distance.");
  const client=await getClient();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(712,$1)",[identity.rows[0].driver_id]);
    const current=await client.query("SELECT * FROM driver_delivery_earnings WHERE delivery_id=$1 FOR UPDATE",[deliveryId]);
    const earning=current.rows[0];
    if(earning.amount_cents!==null) throw new EarningsError("This delivery already has confirmed earnings");
    if(earning.completed_at) {
      const paid=await client.query("SELECT id FROM driver_weekly_payouts WHERE driver_id=$1 AND week_start=$2",[earning.driver_id,weekStart(new Date(earning.completed_at))]);
      if(paid.rowCount)throw new EarningsError("This week is already paid");
    }
    await client.query(`UPDATE driver_delivery_earnings SET distance_meters=$2,distance_source='google_routes',amount_cents=$3 WHERE delivery_id=$1`,[deliveryId,meters,earning.completed_at?deliveryPayCents(meters):null]);
    await client.query("COMMIT");
  }catch(error){await client.query("ROLLBACK");throw error;}finally{client.release();}
}
