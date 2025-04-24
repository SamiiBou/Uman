// utils/encodeVoucher.ts
export function encodeVoucher(v: {
    to: string;
    amount: string;   // déjà stringifié
    nonce: string;
    deadline: string;
  }) {
    return [v.to, v.amount, v.nonce, v.deadline];
  }
  