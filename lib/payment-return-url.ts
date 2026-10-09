export function getPaymentSuccessUrl(
  origin: string,
  orderId: number,
  native: boolean,
) {
  if (native) {
    return `${origin}/api/checkout/callback?order_id=${orderId}&session_id={CHECKOUT_SESSION_ID}`;
  }

  return `${origin}/checkout/success?order_id=${orderId}&session_id={CHECKOUT_SESSION_ID}`;
}
