import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth/session";
import { successResponse, errorResponse, forbiddenResponse, unauthorizedResponse, serverErrorResponse } from "@/lib/api/response";
import { earningsReport } from "@/lib/earnings/service";
import { localDate, weekStart, weekPeriod, monthPeriod } from "@/lib/earnings/calculation";
export async function GET(req: NextRequest) {
  const session=await getSession();if(!session)return unauthorizedResponse();if(session.role!=="driver")return forbiddenResponse();
  const week=req.nextUrl.searchParams.get("week")??weekStart();
  const month=req.nextUrl.searchParams.get("month")??localDate().slice(0,7);
  try {weekPeriod(week);monthPeriod(month);}catch{return errorResponse("Choose a valid Monday and month");}
  try {return successResponse("Your earnings",await earningsReport(week,month,session.userId));}
  catch(error){console.error("[Driver earnings]",error);return serverErrorResponse();}
}
