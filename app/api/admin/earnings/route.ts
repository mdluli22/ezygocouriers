import { NextRequest } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { successResponse, errorResponse, forbiddenResponse, unauthorizedResponse, serverErrorResponse } from "@/lib/api/response";
import { parseJsonRequest } from "@/lib/api/validation";
import { refreshEarningDistance, approveEarning, earningsReport, EarningsError, recordWeeklyPayment } from "@/lib/earnings/service";
import { localDate, shiftDate, weekStart, weekPeriod, monthPeriod } from "@/lib/earnings/calculation";
const actionSchema=z.discriminatedUnion("action",[
  z.object({action:z.literal("route"),deliveryId:z.number().int().positive()}),
  z.object({action:z.literal("approve"),deliveryId:z.number().int().positive(),meters:z.number().int().min(0).max(2000000),amountCents:z.number().int().min(3200).max(10000000).optional(),completedAt:z.iso.datetime({offset:true}).optional(),note:z.string().trim().min(5).max(1000)}),
  z.object({action:z.literal("paid"),expectedAmountCents:z.number().int().nonnegative(),driverId:z.number().int().positive(),week:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),reference:z.string().trim().min(3).max(200)}),
]);
export async function GET(req: NextRequest) {
  const session=await getSession(); if(!session)return unauthorizedResponse();if(session.role!=="admin")return forbiddenResponse();
  const week=req.nextUrl.searchParams.get("week")??shiftDate(weekStart(),-7);
  const month=req.nextUrl.searchParams.get("month")??localDate().slice(0,7);
  try {weekPeriod(week);monthPeriod(month);} catch {return errorResponse("Choose a valid Monday and month");}
  try {return successResponse("Weekly driver earnings",await earningsReport(week,month));}
  catch(error){console.error("[Admin earnings]",error);return serverErrorResponse();}
}
export async function POST(req: NextRequest) {
  const session=await getSession();if(!session)return unauthorizedResponse();if(session.role!=="admin")return forbiddenResponse();
  const parsed=await parseJsonRequest(req,actionSchema);if(!parsed.success)return parsed.response;
  try {
    const data=parsed.data;
    if(data.action==="approve") await approveEarning(data,session.userId);
    else if(data.action==="route") await refreshEarningDistance(data.deliveryId);
    else {
      try {weekPeriod(data.week);}catch{return errorResponse("Select a Monday");}
      await recordWeeklyPayment(data.driverId,data.week,data.reference,session.userId,data.expectedAmountCents);
    }
    return successResponse(data.action==="paid"?"Payment recorded":data.action==="route"?"Road distance verified":"Delivery earnings approved");
  }catch(error){if(error instanceof EarningsError)return errorResponse(error.message,undefined,409);console.error("[Admin earnings update]",error);return serverErrorResponse();}
}
