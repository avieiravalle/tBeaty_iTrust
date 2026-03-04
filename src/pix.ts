// src/pix.ts

// Função para formatar o valor com duas casas decimais
const formatValue = (value: number): string => {
  return value.toFixed(2);
};

// Função para gerar o payload do Pix
export const generatePixPayload = (
  pixKey: string,
  merchantName: string,
  merchantCity: string,
  amount: number,
  txid: string = '***' // Transação sem ID definido por padrão
): string => {
  const payloadFormatIndicator = '000201';
  const merchantAccountInformation = [
    '26', // ID: Merchant Account Information
    (
      '0014BR.GOV.BCB.PIX' + // GUI
      `01${pixKey.length.toString().padStart(2, '0')}${pixKey}` // Chave Pix
    ).length.toString().padStart(2, '0'),
    '0014BR.GOV.BCB.PIX' +
    `01${pixKey.length.toString().padStart(2, '0')}${pixKey}`
  ].join('');

  const merchantCategoryCode = '52040000'; // Categoria do comerciante (0000 para não especificado)
  const transactionCurrency = '5303986'; // Moeda (986 para BRL)
  const transactionAmount = `54${formatValue(amount).length.toString().padStart(2, '0')}${formatValue(amount)}`;
  const countryCode = '5802BR';
  const merchantNameFormatted = `59${merchantName.length.toString().padStart(2, '0')}${merchantName}`;
  const merchantCityFormatted = `60${merchantCity.length.toString().padStart(2, '0')}${merchantCity}`;
  
  const additionalDataField = [
    '62', // ID: Additional Data Field Template
    (
      `05${txid.length.toString().padStart(2, '0')}${txid}`
    ).length.toString().padStart(2, '0'),
    `05${txid.length.toString().padStart(2, '0')}${txid}`
  ].join('');

  let payload = [
    payloadFormatIndicator,
    merchantAccountInformation,
    merchantCategoryCode,
    transactionCurrency,
    transactionAmount,
    countryCode,
    merchantNameFormatted,
    merchantCityFormatted,
    additionalDataField
  ].join('');

  payload += '6304'; // CRC16 ID

  // Calcula o CRC16
  const crc16 = (data: string): number => {
    let crc = 0xFFFF;
    for (let i = 0; i < data.length; i++) {
      crc ^= data.charCodeAt(i) << 8;
      for (let j = 0; j < 8; j++) {
        crc = (crc & 0x8000) ? (crc << 1) ^ 0x1021 : crc << 1;
      }
    }
    return crc & 0xFFFF;
  };

  const crcResult = crc16(payload).toString(16).toUpperCase().padStart(4, '0');

  return payload + crcResult;
};