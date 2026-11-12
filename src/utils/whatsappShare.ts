import { NativeModules, Platform } from 'react-native';
import * as Sharing from 'expo-sharing';

interface WhatsAppShareNativeModule {
  shareImageWithMessage: (
    filePath: string,
    message: string,
    phone: string | null,
  ) => Promise<boolean>;
}

const { WhatsAppShare } = NativeModules as {
  WhatsAppShare?: WhatsAppShareNativeModule;
};

export async function sharePaymentCardToWhatsApp(options: {
  imageUri: string;
  message: string;
  phone?: string;
}): Promise<void> {
  const { imageUri, message, phone } = options;

  if (Platform.OS === 'android' && WhatsAppShare?.shareImageWithMessage) {
    try {
      await WhatsAppShare.shareImageWithMessage(imageUri, message, phone || null);
      return;
    } catch (err) {
      console.warn('Native WhatsAppShare failed, falling back to Sharing.shareAsync:', err);
    }
  }

  // Fallback to standard sharing if native module is not ready
  const isAvailable = await Sharing.isAvailableAsync();
  if (isAvailable) {
    await Sharing.shareAsync(imageUri, {
      mimeType: 'image/png',
      dialogTitle: 'Share Payment Pass',
    });
  }
}
