import { ShelbyNodeClient } from '@shelby-protocol/sdk/node';
import { Account, Ed25519PrivateKey, Network } from '@aptos-labs/ts-sdk';

// Shelby client configuration
export const shelbyConfig = {
  apiKey: process.env.REACT_APP_SHELBY_API_KEY || 'AG-MR5SFEFY8BSVMEMVG9YETVQBZJJ2QYEPF',
  network: Network.SHELBYNET,
  rpcUrl: 'https://api.shelbynet.shelby.xyz/shelby',
  faucetUrls: {
    aptos: 'https://docs.shelby.xyz/apis/faucet/aptos',
    shelby: 'https://docs.shelby.xyz/apis/faucet/shelbyusd'
  }
};

// Initialize Shelby client
export const shelbyClient = new ShelbyNodeClient({
  network: shelbyConfig.network,
  apiKey: shelbyConfig.apiKey,
});

// Create account signer from private key
export function createSigner(privateKey) {
  return Account.fromPrivateKey({
    privateKey: new Ed25519PrivateKey(privateKey),
  });
}

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

// Upload file to Shelby
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
    
    return {
      id: blobName,
      url: `https://shelby.storage/${signer.accountAddress}/${blobName}`,
      hash: result.blobCommitments?.blob_merkle_root || 'unknown',
      size: file.size,
      metadata: {
        originalName: file.name,
        mimeType: file.type,
        uploadedAt: new Date().toISOString(),
        expirationDate: new Date(Date.now() + expirationDays * 24 * 60 * 60 * 1000).toISOString()
      }
    };
  } catch (error) {
    console.error('Shelby upload error:', error);
    throw error;
  }
}
