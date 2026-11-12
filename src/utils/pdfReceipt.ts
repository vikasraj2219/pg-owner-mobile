import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { NILAAYA_LOGO_WHITE_BASE64 } from './nilaayaLogoBase64';

const esc = (v: string) =>
  String(v || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

export interface ReceiptShareData {
  receiptNo: string;
  tenantName: string;
  bedNo: string;
  amountPaise: number;
  date: string;
  property: string;
  propertyAddress?: string;
  forMonth?: string;
  paymentMethod?: string;
  transactionRef?: string;
}

export const generateReceiptHtml = (r: ReceiptShareData): string => {
  const methodLabel = r.paymentMethod ? r.paymentMethod.toUpperCase() : 'UPI';
  const amountFormatted = `₹${Math.round(r.amountPaise / 100).toLocaleString('en-IN')}`;
  const forLabel = r.forMonth || 'Rent Payment';
  const addressLabel = r.propertyAddress || 'PG Living & Co-living';
  const bedLabel = r.bedNo && r.bedNo.trim() !== 'Bed' ? r.bedNo : '201 · Bed 201-A';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Receipt ${esc(r.receiptNo)}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      padding: 32px 16px;
      color: #0F172A;
      background-color: #F8FAFC;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
    }
    .receipt-card {
      width: 100%;
      max-width: 440px;
      background: #FFFFFF;
      border: 1px solid #E2E8F0;
      border-radius: 28px;
      padding: 28px 24px;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05);
    }
    .header {
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .logo-squircle {
      width: 48px;
      height: 48px;
      border-radius: 14px;
      background-color: #0A6C50;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .prop-info {
      flex: 1;
    }
    .prop-name {
      font-size: 18px;
      font-weight: 900;
      color: #0F172A;
      line-height: 1.2;
    }
    .prop-address {
      font-size: 12px;
      font-weight: 600;
      color: #64748B;
      margin-top: 2px;
    }
    .accent-bar {
      height: 3px;
      background-color: #0A6C50;
      border-radius: 2px;
      margin: 18px 0 20px 0;
    }
    .title {
      font-size: 18px;
      font-weight: 800;
      color: #0F172A;
      text-align: center;
      letter-spacing: -0.2px;
    }
    .badge-container {
      text-align: center;
      margin-top: 8px;
      margin-bottom: 22px;
    }
    .paid-badge {
      display: inline-block;
      background-color: #E8F5EE;
      color: #0A6C50;
      border: 1px solid #A7F3D0;
      font-weight: 800;
      font-size: 11px;
      padding: 4px 14px;
      border-radius: 9999px;
      letter-spacing: 0.6px;
    }
    .table {
      width: 100%;
      margin-bottom: 20px;
    }
    .row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 11px 0;
      border-bottom: 1px dashed #E2E8F0;
      font-size: 13px;
    }
    .label {
      color: #64748B;
      font-weight: 600;
    }
    .value {
      font-weight: 800;
      color: #0F172A;
      text-align: right;
    }
    .total-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 0 8px 0;
    }
    .total-label {
      font-size: 15px;
      font-weight: 700;
      color: #334155;
    }
    .total-amount {
      font-size: 28px;
      font-weight: 900;
      color: #0A6C50;
      letter-spacing: -0.5px;
    }
    .footer {
      text-align: center;
      margin-top: 24px;
      font-size: 11px;
      font-weight: 500;
      color: #94A3B8;
      line-height: 1.4;
    }
  </style>
</head>
<body>
  <div class="receipt-card">
    <div class="header">
      <div class="logo-squircle">
        <img src="${NILAAYA_LOGO_WHITE_BASE64}" width="30" height="30" style="object-fit: contain;" alt="Nilaaya" />
      </div>
      <div class="prop-info">
        <h1 class="prop-name">${esc(r.property)}</h1>
        <p class="prop-address">${esc(addressLabel)}</p>
      </div>
    </div>

    <div class="accent-bar"></div>

    <h2 class="title">Rent Payment Receipt</h2>

    <div class="badge-container">
      <span class="paid-badge">PAID</span>
    </div>

    <div class="table">
      <div class="row">
        <span class="label">Receipt no.</span>
        <span class="value">${esc(r.receiptNo)}</span>
      </div>
      <div class="row">
        <span class="label">Date</span>
        <span class="value">${esc(r.date)}</span>
      </div>
      <div class="row">
        <span class="label">Tenant</span>
        <span class="value">${esc(r.tenantName)}</span>
      </div>
      <div class="row">
        <span class="label">Room &amp; bed</span>
        <span class="value">${esc(bedLabel)}</span>
      </div>
      <div class="row">
        <span class="label">For</span>
        <span class="value">${esc(forLabel)}</span>
      </div>
      <div class="row">
        <span class="label">Method</span>
        <span class="value">${esc(methodLabel)}</span>
      </div>
      ${
        r.transactionRef
          ? `<div class="row">
              <span class="label">Transaction Ref</span>
              <span class="value">${esc(r.transactionRef)}</span>
            </div>`
          : ''
      }
    </div>

    <div class="total-row">
      <span class="total-label">Amount received</span>
      <span class="total-amount">${amountFormatted}</span>
    </div>

    <div class="footer">
      Computer generated receipt. No signature required.
    </div>
  </div>
</body>
</html>`;
};

export const generateAndShareReceipt = async (r: ReceiptShareData): Promise<void> => {
  const html = generateReceiptHtml(r);

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

export const printReceiptPdf = async (r: ReceiptShareData): Promise<void> => {
  const html = generateReceiptHtml(r);
  try {
    await Print.printAsync({ html });
  } catch (error) {
    console.warn('PDF Print error:', error);
  }
};
