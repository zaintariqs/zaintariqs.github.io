// Mock bank verification service for testing
// This will be replaced with real banking API integration

interface BankVerificationResult {
  success: boolean;
  accountHolderName?: string;
  bankName?: string;
  error?: string;
}

// Mock database of IBANs for testing
const mockAccounts: Record<string, { name: string; bank: string }> = {
  "PK36ABCD0000001234567890": { name: "Muhammad Ahmed Khan", bank: "HBL" },
  "PK12HABB0000001234567890": { name: "Fatima Zahra", bank: "HBL" },
  "PK45UNIL0000001234567890": { name: "Ali Raza", bank: "UBL" },
  "PK78MUCB0000001234567890": { name: "Ayesha Siddiqui", bank: "MCB" },
  "PK23ALFH0000001234567890": { name: "Hassan Mahmood", bank: "Bank Alfalah" },
};

// Generate a random name for testing
const generateMockName = (): string => {
  const firstNames = ["Muhammad", "Ahmed", "Ali", "Hassan", "Usman", "Fatima", "Ayesha", "Sara", "Zainab", "Maryam"];
  const lastNames = ["Khan", "Ahmed", "Ali", "Hassan", "Malik", "Hussain", "Raza", "Siddiqui", "Sheikh", "Mahmood"];
  
  const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
  const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
  
  return `${firstName} ${lastName}`;
};

// Extract bank code from IBAN (characters 5-8)
const getBankFromIBAN = (iban: string): string => {
  const bankCode = iban.substring(4, 8).toUpperCase();
  
  const bankMapping: Record<string, string> = {
    "HABB": "HBL (Habib Bank Limited)",
    "UNIL": "UBL (United Bank Limited)",
    "MUCB": "MCB (Muslim Commercial Bank)",
    "ALFH": "Bank Alfalah",
    "MEZN": "Meezan Bank",
    "FAYS": "Faysal Bank",
    "JSBL": "JS Bank",
    "SUMB": "Summit Bank",
    "ABCD": "Allied Bank",
  };
  
  return bankMapping[bankCode] || "Unknown Bank";
};

// Validate Pakistani IBAN format
const validatePakistaniIBAN = (iban: string): boolean => {
  // Pakistani IBAN: PK + 2 check digits + 4 bank code + 16 account number = 24 chars
  const ibanRegex = /^PK\d{2}[A-Z]{4}\d{16}$/;
  return ibanRegex.test(iban);
};

// Mock verification function with simulated API delay
export const verifyIBAN = async (iban: string): Promise<BankVerificationResult> => {
  // Simulate API delay (500-1500ms)
  await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));
  
  // Remove spaces and convert to uppercase
  const cleanIBAN = iban.replace(/\s/g, "").toUpperCase();
  
  // Validate format
  if (!validatePakistaniIBAN(cleanIBAN)) {
    return {
      success: false,
      error: "Invalid IBAN format. Pakistani IBAN should be 24 characters (e.g., PK36ABCD0000001234567890)",
    };
  }
  
  // Check if IBAN exists in mock database
  if (mockAccounts[cleanIBAN]) {
    const account = mockAccounts[cleanIBAN];
    return {
      success: true,
      accountHolderName: account.name,
      bankName: account.bank,
    };
  }
  
  // For testing: 10% chance of "account not found" error
  if (Math.random() < 0.1) {
    return {
      success: false,
      error: "Account not found. Please verify your IBAN number.",
    };
  }
  
  // Generate mock account holder name
  const bankName = getBankFromIBAN(cleanIBAN);
  return {
    success: true,
    accountHolderName: generateMockName(),
    bankName: bankName,
  };
};

// Format IBAN with spaces for display (PK36 ABCD 0000 0012 3456 7890)
export const formatIBAN = (iban: string): string => {
  const clean = iban.replace(/\s/g, "").toUpperCase();
  return clean.replace(/(.{4})/g, "$1 ").trim();
};
