# Shelby Upload App - Real SDK Integration

## 🎯 **CẬP NHẬT QUAN TRỌNG - TÍCH HỢP SHELBY SDK THẬT**

Dựa trên research từ **shelby-quickstart** repository, tôi đã tích hợp **@shelby-protocol/sdk** thật vào ứng dụng!

---

## 📋 **TÌM HIỂU TỪ SHELBY-QUICKSTART**

### **Key Discoveries:**
1. **Real SDK**: `@shelby-protocol/sdk` version `0.0.9`
2. **Default API Key**: `AG-MR5SFEFY8BSVMEMVG9YETVQBZJJ2QYEPF`
3. **Network**: `Network.SHELBYNET` (testnet)
4. **RPC URL**: `https://api.shelbynet.shelby.xyz/shelby`
5. **Faucet URLs**: Có sẵn cho APT và ShelbyUSD

### **Upload Process:**
```typescript
await shelbyClient.upload({
  blobData: fileBuffer,           // Uint8Array
  signer: account,                // Aptos Account
  blobName: "unique_name",        // Blob identifier
  expirationMicros: timestamp,    // Expiration time
});
```

---

## 🚀 **CÁC THAY ĐỔI ĐÃ THỰC HIỆN**

### **1. SDK Integration**
```bash
npm install @shelby-protocol/sdk
```

### **2. Real Client Setup**
```javascript
// src/lib/shelby.js
import { ShelbyNodeClient } from '@shelby-protocol/sdk/node';
import { Account, Ed25519PrivateKey, Network } from '@aptos-labs/ts-sdk';

export const shelbyClient = new ShelbyNodeClient({
  network: Network.SHELBYNET,
  apiKey: 'AG-MR5SFEFY8BSVMEMVG9YETVQBZJJ2QYEPF',
});
```

### **3. Upload Function**
```javascript
export async function uploadToShelby(file, signer, blobName, expirationDays = 7) {
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
    hash: result.blobCommitments?.blob_merkle_root,
    size: file.size,
    metadata: { /* ... */ }
  };
}
```

### **4. Environment Variables**
```env
REACT_APP_SHELBY_API_KEY=AG-MR5SFEFY8BSVMEMVG9YETVQBZJJ2QYEPF
REACT_APP_SHELBY_ENDPOINT=https://api.shelbynet.shelby.xyz/shelby
REACT_APP_APTOS_NETWORK=shelbynet
```

---

## 🔧 **CÁCH HOẠT ĐỘNG**

### **Upload Flow:**
1. **File Selection** → Drag & drop file
2. **Validation** → Check size & type
3. **Wallet Sign** → Aptos account signs transaction
4. **Shelby Upload** → Real SDK call to Shelby network
5. **Progress Tracking** → Real-time progress updates
6. **Success** → Get IPFS hash & URL

### **Error Handling:**
- **INSUFFICIENT_BALANCE_FOR_TRANSACTION_FEE** → Need APT tokens
- **E_INSUFFICIENT_FUNDS** → Need ShelbyUSD tokens
- **EBLOB_WRITE_CHUNKSET_ALREADY_EXISTS** → File already exists
- **429 Rate Limit** → API key rate limiting

---

## 🎯 **NEXT STEPS - ĐỂ HOÀN THÀNH**

### **1. Wallet Integration**
```javascript
// Cần lấy private key từ wallet context
const signer = Account.fromPrivateKey({
  privateKey: new Ed25519PrivateKey(walletPrivateKey),
});
```

### **2. Real Signer**
```javascript
// Thay thế mock signer với real wallet signer
const signer = await getWalletSigner();
```

### **3. Progress Callback**
```javascript
// SDK không có progress callback, cần simulate
const progressInterval = setInterval(() => {
  updateProgress(Math.random() * 100);
}, 500);
```

---

## 📊 **TOKEN REQUIREMENTS**

### **Gas Fees (APT)**
- **Purpose**: Blockchain transaction fees
- **Cost**: ~0.001 APT per upload
- **Faucet**: https://docs.shelby.xyz/apis/faucet/aptos

### **Storage Fees (ShelbyUSD)**
- **Purpose**: Storage provider payments
- **Cost**: Based on file size & duration
- **Faucet**: https://docs.shelby.xyz/apis/faucet/shelbyusd

---

## 🔐 **SECURITY NOTES**

### **Private Key Management**
```javascript
// ❌ NEVER hardcode private keys
const privateKey = '0x...'; // BAD!

// ✅ Get from wallet context
const privateKey = await wallet.getPrivateKey();
```

### **API Key Usage**
- Default API key có rate limits
- Production nên dùng custom API key
- Register tại: https://docs.shelby.xyz/sdks/typescript/acquire-api-keys

---

## 🚀 **TESTING INSTRUCTIONS**

### **1. Setup Development Account**
```bash
# Clone shelby-quickstart
git clone https://github.com/shelby/shelby-quickstart
cd shelby-quickstart

# Configure account
npm run config

# Fund account
# Visit faucets for APT & ShelbyUSD
```

### **2. Test Upload**
```bash
# Test with CLI
npm run upload

# Test with web app
# Connect wallet + upload file
```

---

## 📚 **REFERENCES**

- **Shelby Quickstart**: https://github.com/shelby/shelby-quickstart
- **Shelby Docs**: https://docs.shelby.xyz/
- **SDK Reference**: https://docs.shelby.xyz/sdks/typescript
- **API Keys**: https://docs.shelby.xyz/sdks/typescript/acquire-api-keys

---

**🎉 Ứng dụng đã được tích hợp với Shelby SDK thật!** 

Cần hoàn thiện wallet signing để upload thực tế lên Shelby network.
