import CryptoJS from "crypto-js";

const secretKey = process.env.AES_SECRET || "clave-secreta-256bits";

//cifrar texto plano con AES
export const encrypt = (text) => {
  return CryptoJS.AES.encrypt(text, secretKey).toString();
};

//descifrar texto con AES
export const decrypt = (cipherText) => {
  if (typeof cipherText !== "string" || !cipherText) return null;

  try {
    const bytes = CryptoJS.AES.decrypt(cipherText, secretKey);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    return decrypted || null;
  } catch {
    return null;
  }
};

export default { encrypt, decrypt };
