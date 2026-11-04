import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

const esc = (v: string) =>
  v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export interface ReceiptShareData {
  receiptNo: string;
  tenantName: string;
  bedNo: string;
  amountPaise: number;
  date: string;
  property: string;
  paymentMethod?: string;
  transactionRef?: string;
}

export const generateAndShareReceipt = async (r: ReceiptShareData): Promise<void> => {
  const methodLabel = r.paymentMethod ? r.paymentMethod.toUpperCase() : 'UPI';
  const amountFormatted = `₹${(r.amountPaise / 100).toFixed(2)}`;

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; padding: 24px; color: #0f172a; background-color: #ffffff; }
    .card { max-width: 520px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 16px; padding: 24px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
    .header { text-align: center; border-bottom: 2px solid #f1f5f9; padding-bottom: 18px; }
    .prop-name { font-size: 22px; font-weight: 800; color: #0a6c50; margin: 0; }
    .sub-title { font-size: 13px; font-weight: 600; color: #64748b; margin-top: 4px; text-transform: uppercase; letter-spacing: 0.5px; }
    .badge { display: inline-block; background-color: #dcfce7; color: #15803d; padding: 6px 16px; border-radius: 9999px; font-weight: 700; font-size: 13px; margin-top: 12px; }
    .content { margin-top: 24px; }
    .row { display: flex; justify-content: space-between; margin: 12px 0; border-bottom: 1px dashed #e2e8f0; padding-bottom: 8px; font-size: 14px; }
    .label { color: #64748b; font-weight: 500; }
    .val { font-weight: 700; color: #1e293b; text-align: right; }
    .total-box { margin-top: 20px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; display: flex; justify-content: space-between; align-items: center; }
    .total-label { font-size: 15px; font-weight: 700; color: #334155; }
    .total-amount { font-size: 22px; font-weight: 800; color: #0a6c50; }
    .footer { text-align: center; margin-top: 32px; font-size: 12px; color: #94a3b8; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1 class="prop-name">${esc(r.property)}</h1>
      <p class="sub-title">Rent Payment Receipt</p>
      <span class="badge">PAID · CONFIRMED</span>
    </div>
    <div class="content">
      <div class="row">
        <span class="label">Receipt No:</span>
        <span class="val">${esc(r.receiptNo)}</span>
      </div>
      <div class="row">
        <span class="label">Date:</span>
        <span class="val">${esc(r.date)}</span>
      </div>
      <div class="row">
        <span class="label">Tenant Name:</span>
        <span class="val">${esc(r.tenantName)}</span>
      </div>
      <div class="row">
        <span class="label">Room & Bed:</span>
        <span class="val">${esc(r.bedNo)}</span>
      </div>
      <div class="row">
        <span class="label">Payment Mode:</span>
        <span class="val">${esc(methodLabel)}</span>
      </div>
      ${
        r.transactionRef
          ? `<div class="row">
              <span class="label">Transaction Ref:</span>
              <span class="val">${esc(r.transactionRef)}</span>
            </div>`
          : ''
      }
      <div class="total-box">
        <span class="total-label">Amount Received</span>
        <span class="total-amount">${amountFormatted}</span>
      </div>
    </div>
    <div class="footer">
      <p>Thank you for your payment!</p>
      <p style="font-size: 11px; margin-top: 4px;">Computer-generated receipt · Nilaaya PG Management System</p>
    </div>
  </div>
</body>
</html>`;

  try {
    const { uri } = await Print.printToFileAsync({ html });
    const isAvailable = await Sharing.isAvailableAsync();
    if (isAvailable) {
      await Sharing.shareAsync(uri, {
        UTI: '.pdf',
        mimeType: 'application/pdf',
        dialogTitle: `Payment Receipt ${r.receiptNo}`,
      });
    }
  } catch (error) {
    console.warn('PDF Receipt generation error:', error);
  }
};
