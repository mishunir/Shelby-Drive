// Mock Shelby client for browser compatibility
// Since Node SDK doesn't work in browser environment

class MockShelbyClient {
  constructor(config) {
    this.config = config;
  }

  async upload({ blobData, signer, blobName, expirationMicros }) {
    // Simulate upload process
    return new Promise((resolve, reject) => {
      let progress = 0;
      const interval = setInterval(() => {
        progress += Math.random() * 20;
        
        if (progress >= 100) {
          clearInterval(interval);
          
          // Simulate successful upload
          resolve({
            blobCommitments: {
              blob_merkle_root: 'Qm' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
              raw_data_size: blobData.length
            }
          });
        }
      }, 300);
    });
  }
}

// Shelby client configuration with real CLI account
export const shelbyConfig = {
  apiKey: process.env.REACT_APP_SHELBY_API_KEY || 'AG-MR5SFEFY8BSVMEMVG9YETVQBZJJ2QYEPF',
  network: 'shelbynet',
  rpcUrl: 'https://api.shelbynet.shelby.xyz/shelby',
  faucetUrls: {
    aptos: 'https://docs.shelby.xyz/apis/faucet/aptos',
    shelby: 'https://docs.shelby.xyz/apis/faucet/shelbyusd'
  },
  // Real CLI account for testing
  cliAccount: {
    address: '0xef01c52137cc2685575ae550d29ae5abcf3b86813cc9232761e1ed3e453f98c3',
    name: 'alice'
  }
};

// Initialize mock client for browser
export const shelbyClient = new MockShelbyClient({
  apiKey: shelbyConfig.apiKey,
  network: shelbyConfig.network,
});

// File validation rules
export const fileValidation = {
  maxSize: 10 * 1024 * 1024, // 10MB
  allowedTypes: [
    'image/jpeg',
    'image/png', 
    'image/gif',
    'image/webp',
    'application/pdf',
    'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ],
};

// Utility function to validate file
export function validateFile(file) {
  const errors = [];
  
  if (file.size > fileValidation.maxSize) {
    errors.push(`File size exceeds ${fileValidation.maxSize / 1024 / 1024}MB limit`);
  }
  
  if (!fileValidation.allowedTypes.includes(file.type)) {
    errors.push(`File type ${file.type} is not supported`);
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

// Format file size for display
export function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Upload file to Shelby (mock for browser)
export async function uploadToShelby(file, signer, blobName, expirationDays = 7) {
  try {
    const fileBuffer = await file.arrayBuffer();
    const expirationMicros = Date.now() * 1000 + (expirationDays * 24 * 60 * 60 * 1_000_000);
    
    const result = await shelbyClient.upload({
      blobData: new Uint8Array(fileBuffer),
      signer,
      blobName,
      expirationMicros,
    });
    
    // Use real CLI account address for URL
    const accountAddress = signer.accountAddress || shelbyConfig.cliAccount.address;
    
    return {
      id: blobName,
      url: `https://shelby.storage/${accountAddress}/${blobName}`,
      hash: result.blobCommitments?.blob_merkle_root || 'unknown',
      size: file.size,
      metadata: {
        originalName: file.name,
        mimeType: file.type,
        uploadedAt: new Date().toISOString(),
        expirationDate: new Date(Date.now() + expirationDays * 24 * 60 * 60 * 1000).toISOString(),
        accountAddress: accountAddress,
        network: shelbyConfig.network
      }
    };
  } catch (error) {
    console.error('Shelby upload error:', error);
    throw error;
  }
}
