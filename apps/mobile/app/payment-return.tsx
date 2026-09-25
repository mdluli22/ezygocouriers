import { Redirect, useLocalSearchParams } from "expo-router";
import { parsePaymentLink, PAYMENT_RETURN_URL } from "../lib/payment-links";
import { Page, Notice, Action } from "../components/customer/UI";
import { router } from "expo-router";
export default function PaymentReturn() {
  const params = useLocalSearchParams();
  try {
    if (Object.keys(params).some(key => key !== "token") || typeof params.token !== "string") throw new Error("Invalid return");
    const token = parsePaymentLink(`${PAYMENT_RETURN_URL}?token=${encodeURIComponent(params.token)}`);
    return <Redirect href={{ pathname: "/payment", params: { token } }} />;
  } catch {
    return <Page><Notice message="This payment return link is invalid. Open your delivery to check its payment status." error /><Action label="View deliveries" onPress={() => router.replace("/dashboard")} /></Page>;
  }
}
