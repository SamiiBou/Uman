export function encodeVoucher(v?: {
  to: string;
  amount: string;   // déjà stringifié
  nonce: string;
  deadline: string;
}) {
  if (!v) {
    throw new Error("encodeVoucher → voucher manquant ou indéfini");
  }
  return [v.to, v.amount, v.nonce, v.deadline];
}
