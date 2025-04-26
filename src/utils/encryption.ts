import CryptoJS from 'crypto-js';

// In a real application, this key would be derived from a more secure source
// like an end-to-end encryption handshake between users
// For simplicity, we're using a fixed key
const DEFAULT_KEY = 'secure-chat-encryption-key';

export const getEncryptionKey = (): string => {
  // For a more secure approach, we could use:
  // 1. A per-user key derived from their password
  // 2. A per-conversation key negotiated between users
  // 3. A key rotation mechanism
  
  // For this demo, we'll use a combination of the default key and user information
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  
  if (user._id) {
    return `${DEFAULT_KEY}-${user._id}`;
  }
  
  return DEFAULT_KEY;
};

export const encryptMessage = (message: string): string => {
  const key = getEncryptionKey();
  return CryptoJS.AES.encrypt(message, key).toString();
};

export const decryptMessage = (encryptedMessage: string): string => {
  try {
    const key = getEncryptionKey();
    const bytes = CryptoJS.AES.decrypt(encryptedMessage, key);
    return bytes.toString(CryptoJS.enc.Utf8);
  } catch (error) {
    console.error('Decryption error:', error);
    return '[Encrypted message]';
  }
};