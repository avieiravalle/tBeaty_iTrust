//! THIS IS A SIMPLIFIED PIX QR CODE PAYLOAD GENERATOR (BR CODE)
//! For production use, consider a more robust library or payment gateway integration.

// Function to format value to two decimal places, as required by Pix spec
const formatValue = (value: number): string => {
  const formatted = value.toFixed(2);
  // The amount field has a max length of 99, with value having max 13 chars.
  return formatted.length > 13 ? '0.00' : formatted;
};

// Function to format text, limiting length and removing special characters
const formatText = (text: string, maxLength: number): string => {
  const normalized = text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-zA-Z0-9 ]/g, '') // Remove non-alphanumeric characters, except spaces
    .trim();
  return normalized.substring(0, maxLength);
};

const getId = (id: string, maxLength: number = 25): string => {
  return id.replace(/[^a-zA-Z0-9]/g, '').substring(0, maxLength) || '***';
};

const getValue = (id: string, value: string): string => {
  const length = value.length.toString().padStart(2, '0');
  return id + length + value;
};

/**
 * Generates a Pix payload (BR Code) for a static QR code.
 * @param pixKey - The Pix key (CPF, CNPJ, email, phone, or random).
 * @param beneficiaryName - The name of the recipient.
 * @param beneficiaryCity - The city of the recipient.
 * @param amount - The transaction amount.
 * @param txid - The transaction ID (optional, defaults to '***').
 * @returns The BR Code string.
 */
export const generatePixPayload = (
  pixKey: string,
  beneficiaryName: string,
  beneficiaryCity: string,
  amount: number,
  txid: string = '***'
): string => {
  const payload = [
    getValue('00', '01'), // Payload Format Indicator
    getValue('26', getValue('00', 'BR.GOV.BCB.PIX') + getValue('01', pixKey)), // Merchant Account Information
    getValue('52', '0000'), // Merchant Category Code
    getValue('53', '986'), // Transaction Currency (BRL)
    getValue('54', formatValue(amount)), // Transaction Amount
    getValue('58', 'BR'), // Country Code
    getValue('59', formatText(beneficiaryName, 25)), // Beneficiary Name
    getValue('60', formatText(beneficiaryCity, 15)), // Beneficiary City
    getValue('62', getValue('05', getId(txid))), // Transaction ID
  ].join('');

  const payloadWithCrc = payload + '6304';
  let crc = 0xFFFF;
  for (const char of payloadWithCrc) {
    crc ^= (char.charCodeAt(0) & 0xFF) << 8;
    for (let i = 0; i < 8; i++) {
      crc = (crc & 0x8000) ? (crc << 1) ^ 0x1021 : crc << 1;
    }
  }
  const crcString = ('0000' + (crc & 0xFFFF).toString(16).toUpperCase()).slice(-4);

  return payloadWithCrc + crcString;
};