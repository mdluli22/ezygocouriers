import { useState } from "react";
import { useAuth } from "../../lib/auth/provider";
import { useResource } from "../../lib/use-resource";
import { dutyStatus,setDuty } from "../../lib/driver/duty";
import { Card,Notice,Action } from "../customer/UI";
export function DutyPanel() {
 const {user}=useAuth(); const {data,refresh}=useResource(dutyStatus);
 const [message,setMessage]=useState(""); const [busy,setBusy]=useState(false);
 async function change(on:boolean) { if(!user)return;setBusy(true);try{await setDuty(user.id,on);setMessage("");await refresh();}catch{setMessage(on ? "Could not go on duty. Retry when connected." : "Sharing stopped on this device. Off-duty status will sync when connected.");}finally{setBusy(false);} }
 return <Card><Notice message={message || (data ? data.on_duty ? "On duty · available for assignments" : "Off duty · location sharing stopped" : "Checking duty status…")} /><Action label="Go on duty" disabled={busy} onPress={()=>void change(true)} /><Action label="Go off duty" secondary disabled={busy} onPress={()=>void change(false)} /></Card>;
}
