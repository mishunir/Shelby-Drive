# Shelby CLI Setup & Real Integration Guide

## 🎯 **ĐÃ CÀI ĐẶT THÀNH CÔNG SHELBY CLI!**

Tôi đã cài đặt và cấu hình Shelby CLI để tích hợp với ứng dụng web:

---

## 🛠️ **CLI Installation:**

### **1. Install Shelby CLI**
```bash
npm i -g @shelby-protocol/cli
```

### **2. Initialize Configuration**
```bash
shelby init
```

### **3. Check Account**
```bash
shelby account list
```

### **4. Get Faucet URL**
```bash
shelby faucet --no-open
```

---

## 📊 **Current Configuration:**

### **Account Details:**
- **Name**: alice (default)
- **Address**: `0xef01c52137cc2685575ae550d29ae5abcf3b86813cc9232761e1ed3e453f98c3`
- **Private Key**: `ed25519-priv-0xbd53a...`

### **Network Configuration:**
- **Context**: shelbynet (default)
- **Aptos Fullnode**: `https://api.shelbynet.shelby.xyz/v1`
- **Aptos Faucet**: `https://faucet.shelbynet.shelby.xyz`
- **Shelby RPC**: `https://api.shelbynet.shelby.xyz/shelby`

---

## 🚀 **Real Integration Strategy:**

### **Option 1: Backend Proxy**
```javascript
// Backend server with Shelby CLI
app.post('/upload', async (req, res) => {
  const { file, accountAddress } = req.body;
  
  // Use shelby CLI commands
  const result = await exec(`shelby upload ${file} --account ${accountAddress}`);
  
  res.json(result);
});
```

### **Option 2: Direct SDK Integration**
```javascript
// Use real account from CLI in browser
const cliAccount = {
  address: '0xef01c52137cc2685575ae550d29ae5abcf3b86813cc9232761e1ed3e453f98c3',
  privateKey: 'ed25519-priv-0xbd53a...'
};

// Use with Shelby SDK
const signer = Account.fromPrivateKey({
  privateKey: new Ed25519PrivateKey(cliAccount.privateKey),
});
```

---

## 🔧 **Faucet URLs:**

### **ShelbyUSD Faucet:**
```
https://docs.shelby.xyz/apis/faucet/shelbyusd?address=0xef01c52137cc2685575ae550d29ae5abcf3b86813cc9232761e1ed3e453f98c3&network=shelbynet
```

### **APT Faucet:**
```
https://docs.shelby.xyz/apis/faucet/aptos?address=0xef01c52137cc2685575ae550d29ae5abcf3b86813cc9232761e1ed3e453f98c3
```

---

## 📋 **Next Steps for Real Integration:**

### **1. Fund Account**
1. Visit ShelbyUSD faucet URL
2. Request test tokens
3. Visit APT faucet URL
4. Request gas tokens

### **2. Test CLI Upload**
```bash
# Create test file
echo "Hello Shelby!" > test.txt

# Upload with CLI
shelby upload test.txt --name test-blob

# List blobs
shelby blob list
```

### **3. Integrate with Web App**
```javascript
// Use CLI account in web app
const realAccount = {
  address: '0xef01c52137cc2685575ae550d29ae5abcf3b86813cc9232761e1ed3e453f98c3',
  privateKey: process.env.SHELBY_PRIVATE_KEY // From env vars
};
```

---

## 🎯 **Petra Wallet Setup:**

### **Network Configuration:**
- **Network Name**: shelbynet
- **RPC URL**: `https://api.shelbynet.shelby.xyz/v1`
- **Faucet URL**: `https://faucet.shelbynet.shelby.xyz`
- **Indexer URL**: `https://api.shelbynet.shelby.xyz/v1/graphql`

### **Steps:**
1. Open Petra wallet extension
2. Click gear icon (⚙️) for Settings
3. Navigate to Network section
4. Click "Add network"
5. Enter Shelby network details
6. Switch to shelbynet network

---

## 🔐 **Security Considerations:**

### **Private Key Management:**
```javascript
// ❌ NEVER hardcode private keys
const privateKey = 'ed25519-priv-0xbd53a...';

// ✅ Use environment variables
const privateKey = process.env.SHELBY_PRIVATE_KEY;

// ✅ Or use wallet signing
const signer = await wallet.signTransaction(transaction);
```

### **API Key Usage:**
- Get custom API key: https://docs.shelby.xyz/sdks/typescript/acquire-api-keys
- Replace default key to avoid rate limits

---

## 📱 **Testing Real Integration:**

### **1. CLI Testing**
```bash
# Fund account
shelby faucet

# Upload file
shelby upload test.txt --name my-blob

# Verify upload
shelby blob list
```

### **2. Web App Testing**
```javascript
// Use CLI account for testing
const testAccount = {
  address: '0xef01c52137cc2685575ae550d29ae5abcf3b86813cc9232761e1ed3e453f98c3',
  // Use wallet signing for production
};
```

---

## 🎉 **Summary:**

✅ **Shelby CLI installed** (version 0.0.18)  
✅ **Account configured** (alice@shelbynet)  
✅ **Faucet URLs generated**  
✅ **Network details documented**  
✅ **Integration strategy planned**  

**Ready for real Shelby Protocol integration!**
