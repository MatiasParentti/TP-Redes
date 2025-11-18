import CryptoJS from "crypto-js";

const secretKey = process.env.AES_SECRET || "clave-secreta-256bits";

export const encrypt = (text) => {
  return CryptoJS.AES.encrypt(text, secretKey).toString();
};

export const decrypt = (cipherText) => {
  if (!cipherText || typeof cipherText !== "string") return null;
  
  try {
    const bytes = CryptoJS.AES.decrypt(cipherText, secretKey);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    return decrypted && decrypted.length > 0 ? decrypted : null;
  } catch (e) {
    return null;
  }
};

export default { encrypt, decrypt };
