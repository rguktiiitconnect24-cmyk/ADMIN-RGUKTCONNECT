import { registerPlugin } from '@capacitor/core';

/**
 * NativeFileService: Bridge to the Android 'FileDownload' Plugin.
 * Handles specialized file saving to system-level 'Downloads' folder.
 */
export const FileDownload = registerPlugin('FileDownload');

export const nativeFileService = {
  /**
   * Save a PDF base64 string to the native 'Downloads' folder.
   * @param {string} filename - The name of the file to save (e.g., 'profile.pdf')
   * @param {string} base64Data - The raw base64 encoded PDF content (without prefix)
   */
  async savePdfToDownloads(filename, base64Data) {
    try {
      console.log('Native PDF Download - Triggering savePdf...');
      const result = await FileDownload.savePdf({
        base64: base64Data,
        filename: filename
      });
      return result;
    } catch (e) {
      console.error('Native PDF Download failed:', e);
      throw new Error(e.message || 'Failed to save file to Downloads folder.');
    }
  }
};
