import { Linking, Alert } from 'react-native';

export const sendRentReminder = async (
  phone: string,
  name: string,
  bed: string,
  amountPaise: number,
  upiVpa: string,
): Promise<void> => {
  const amount = (amountPaise / 100).toFixed(2);
  const message =
    `Hello ${name},\n\nYour rent for Bed ${bed} is ₹${amount}.\n\n` +
    `Please pay via UPI to: ${upiVpa}\n\nThank you!`;

  const cleanPhone = phone.replace(/\D/g, '');
  const url = `https://wa.me/91${cleanPhone}?text=${encodeURIComponent(message)}`;

  try {
    await Linking.openURL(url);
  } catch (_err) {
    Alert.alert('Error', 'Could not open WhatsApp. Please verify WhatsApp is installed.');
  }
};
