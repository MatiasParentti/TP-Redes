import CryptoJS from "crypto-js";

const secretKey = process.env.AES_SECRET || "clave-secreta-256bits";

export const encrypt = (text) => {
  return CryptoJS.AES.encrypt(text, secretKey).toString();
};

export const decrypt = (cipherText) => {
  try {
    const bytes = CryptoJS.AES.decrypt(cipherText, secretKey);
    return bytes.toString(CryptoJS.enc.Utf8);
  } catch (e) {
    return null;
  }
};

export default { encrypt, decrypt };
