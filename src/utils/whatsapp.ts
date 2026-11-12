import { Linking, Alert } from 'react-native';

export type ReminderType = 'pre_reminder' | 'due_today' | 'overdue';

export interface ReminderMessageOptions {
  name: string;
  bed: string;
  amountFormatted: string;
  dueDateFormatted?: string;
  daysRemaining?: number;
  overdueDays?: number;
  upiVpa: string;
  upiPayload?: string;
  propertyName?: string;
  type?: ReminderType;
}

export function buildReminderMessage(opts: ReminderMessageOptions): string {
  const firstName = opts.name.split(' ')[0] || 'there';
  const prop = opts.propertyName || 'PG Living';
  const upiLink = opts.upiPayload ? `\n\n🔗 Instant UPI Payment Link:\n${opts.upiPayload}` : '';

  if (opts.type === 'pre_reminder') {
    const daysText =
      opts.daysRemaining !== undefined && opts.daysRemaining > 0
        ? `in ${opts.daysRemaining} day${opts.daysRemaining > 1 ? 's' : ''}`
        : 'in 2 days';
    const dueOn = opts.dueDateFormatted ? ` (${opts.dueDateFormatted})` : '';

    return (
      `Hey ${firstName},\n` +
      `Your rent reminder for ${prop} is here!\n\n` +
      `✅ Property: ${prop}\n` +
      `✅ Bed: ${opts.bed}\n` +
      `✅ Rent Amount: ${opts.amountFormatted}\n` +
      `✅ Due Date: Due ${daysText}${dueOn}\n` +
      `✅ Pay via UPI: ${opts.upiVpa}` +
      `${upiLink}\n\n` +
      `Payment Reminder: Scan the QR code in the image above with any UPI app (GPay, PhonePe, Paytm), or tap the instant payment link above to pay directly.\n\n` +
      `Thank you!`
    );
  }

  if (opts.type === 'due_today') {
    return (
      `Hey ${firstName},\n` +
      `Your rent reminder for ${prop} is here!\n\n` +
      `✅ Property: ${prop}\n` +
      `✅ Bed: ${opts.bed}\n` +
      `✅ Rent Amount: ${opts.amountFormatted}\n` +
      `✅ Due Status: Due Today\n` +
      `✅ Pay via UPI: ${opts.upiVpa}` +
      `${upiLink}\n\n` +
      `Payment Reminder: Scan the QR code in the image above with any UPI app (GPay, PhonePe, Paytm), or tap the instant payment link above to pay directly.\n\n` +
      `Thank you!`
    );
  }

  // overdue default
  const overdueText =
    opts.overdueDays !== undefined && opts.overdueDays > 0
      ? `${opts.overdueDays} days overdue`
      : 'Rent Due';
  const dueOn = opts.dueDateFormatted ? ` (${opts.dueDateFormatted})` : '';

  return (
    `Hey ${firstName},\n` +
    `Your rent reminder for ${prop} is here!\n\n` +
    `✅ Property: ${prop}\n` +
    `✅ Bed: ${opts.bed}\n` +
    `✅ Rent Amount: ${opts.amountFormatted}\n` +
    `✅ Due Status: ${overdueText}${dueOn}\n` +
    `✅ Pay via UPI: ${opts.upiVpa}` +
    `${upiLink}\n\n` +
    `Payment Reminder: Scan the QR code in the image above with any UPI app (GPay, PhonePe, Paytm), or tap the instant payment link above to pay directly.\n\n` +
    `Thank you!`
  );
}

export const sendRentReminder = async (
  phone: string,
  name: string,
  bed: string,
  amountPaise: number,
  upiVpa: string,
  upiPayload?: string,
): Promise<void> => {
  const formattedAmount = `₹${Math.round(amountPaise / 100).toLocaleString('en-IN')}`;
  const upiLink = upiPayload ? `\n\nInstant UPI Link:\n${upiPayload}` : '';
  const message =
    `Hello ${name},\n\nYour rent for Bed ${bed} is ${formattedAmount}.\n\n` +
    `Please pay via UPI to: ${upiVpa}${upiLink}\n\nThank you!`;

  const cleanPhone = phone.replace(/\D/g, '');
  const url = `https://wa.me/91${cleanPhone}?text=${encodeURIComponent(message)}`;

  try {
    await Linking.openURL(url);
  } catch (_err) {
    Alert.alert('Error', 'Could not open WhatsApp. Please verify WhatsApp is installed.');
  }
};

export const openWhatsApp = async (phone: string, text?: string): Promise<void> => {
  const cleanPhone = phone.replace(/\D/g, '');
  const url = `https://wa.me/91${cleanPhone}${text ? `?text=${encodeURIComponent(text)}` : ''}`;

  try {
    await Linking.openURL(url);
  } catch (_err) {
    Alert.alert('Error', 'Could not open WhatsApp. Please verify WhatsApp is installed.');
  }
};
