import { useCallback,useState } from "react";
import { AppState } from "react-native";
import { useFocusEffect } from "expo-router";
import MapView,{Marker} from "react-native-maps";
import type { LiveDeliveryLocation } from "@ezygo/contracts";
import { useAuth } from "../../lib/auth/provider";
import { Card,Notice,Action } from "./UI";
export function LiveDeliveryMap({id, status}:{id:number;status:string}) {
 const {controller,user,phase}=useAuth();
 const [data,setData]=useState<LiveDeliveryLocation|null>(null);
 const [error,setError]=useState(false); const [retry,setRetry]=useState(0);
 const enabled=["assigned","picked_up","in_transit"].includes(status);
 useFocusEffect(useCallback(()=>{
   setData(null); if(!enabled || phase!=="authenticated" || user?.role!=="customer")return;
   let active=true,busy=false,version=0;
   async function refresh(){if(busy || AppState.currentState!=="active")return;busy=true;const run=version;
     try{const value=await controller.request<LiveDeliveryLocation>(`/api/deliveries/${id}/location`);if(active && run===version){setData(value);setError(false);}}
     catch{if(active){setData(null);setError(true);}}finally{busy=false;}}
   void refresh();const timer=setInterval(()=>void refresh(),15000);
   const listener=AppState.addEventListener("change",state=>{version++;setData(null);if(state==="active")void refresh();});
   return()=>{active=false;clearInterval(timer);listener.remove();};
 },[id,enabled,phase,user?.id,user?.role,controller,retry]));
 if(!enabled)return null;
 const point=data?.location;
 const center=point??data?.pickup??data?.dropoff;
 return <Card><Notice message={error ? "Live location unavailable." : point ? `${point.stale ? "Last known position · may be stale" : "Driver location"} · ${new Date(point.recorded_at).toLocaleTimeString()}` : "Waiting for the driver to share a recent location."} />
 {center ? <MapView style={{height:240,width:"100%"}} region={{...center,latitudeDelta:0.045,longitudeDelta:0.045}} accessibilityLabel="Delivery map">
 {data?.pickup ? <Marker coordinate={data.pickup} title="Pickup" pinColor="green" />:null}
 {data?.dropoff ? <Marker coordinate={data.dropoff} title="Destination" pinColor="blue" />:null}
 {point ? <Marker coordinate={point} title={point.stale ? "Driver · stale position" : "Driver"} />:null}
 </MapView>:null}{error ? <Action label="Retry location" secondary onPress={()=>setRetry(n=>n+1)} />:null}</Card>;
}
