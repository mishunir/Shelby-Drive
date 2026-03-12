# Shelby Upload App - Wallet Integration

## 🎯 **TÍNH NĂNG MỚI ĐÃ THÊM**

### ✅ **Wallet Connection**
- **Aptos Wallet Support**: Petra, Pontem, Martian wallets
- **Social Login**: Aptos Connect (Google login)
- **Balance Display**: APT và ShelbyUSD tokens
- **Faucet Integration**: Lấy test tokens dễ dàng

### ✅ **Authentication Flow**
1. **Connect Wallet** → Chọn ví Aptos
2. **Get Tokens** → Request APT & ShelbyUSD từ faucet
3. **Upload Files** → Sử dụng wallet đã xác thực
4. **Track Progress** → Real-time upload với blockchain

---

## 🚀 **CÁCH SỬ DỤNG**

### **Step 1: Cài Aptos Wallet**
```bash
# Install Petra Wallet (khuyến nghị)
# Chrome Extension: https://petra.app/
```

### **Step 2: Connect Wallet**
1. Click "Connect Wallet" button
2. Chọn ví (Petra, Pontem, Martian)
3. Approve connection trong wallet

### **Step 3: Get Test Tokens**
1. Click vào wallet dropdown
2. Click "Get Test Tokens"
3. Tokens sẽ được gửi vào wallet của bạn

### **Step 4: Upload Files**
- Kéo thả file vào upload area
- Xem progress real-time
- Nhận IPFS hash và URL

---

## 🔧 **CẤU HÌNH**

### **Environment Variables**
```env
REACT_APP_SHELBY_API_KEY=your_api_key_here
REACT_APP_SHELBY_ENDPOINT=https://api.shelby.xyz
```

### **Network Configuration**
- **Shelbynet**: Testnet cho development
- **RPC**: `https://api.shelbynet.aptoslabs.com`
- **Faucet**: `https://faucet.shelbynet.shelby.xyz/`

---

## 📱 **UI/UX Features**

### **Wallet Connection**
- **Visual Status**: Green dot khi connected
- **Address Display**: Shortened address với copy button
- **Balance Info**: APT và ShelbyUSD balances
- **Quick Actions**: Explorer link, disconnect

### **Upload Flow**
- **Wallet Required**: Chỉ upload khi đã connect wallet
- **Clear Instructions**: Hướng dẫn step-by-step cho new users
- **Error Handling**: Hiển thị lỗi rõ ràng
- **Progress Tracking**: Real-time progress với animation

### **Token Management**
- **Faucet Integration**: One-click test tokens
- **Balance Display**: Real-time balance updates
- **Token Requirements**: Hiển thị tokens cần thiết

---

## 🛠 **Technical Implementation**

### **Wallet Context**
```javascript
// src/contexts/WalletContext.jsx
- Aptos SDK integration
- Balance fetching
- Faucet requests
- Transaction signing
```

### **Wallet Component**
```javascript
// src/components/WalletConnect.jsx
- Connection UI
- Balance display
- Dropdown menu
- Faucet integration
```

### **App Integration**
```javascript
// src/App.jsx
- Wallet requirement check
- Conditional rendering
- Upload flow with wallet
```

---

## 🎯 **User Journey**

### **New User Flow**
1. **Landing** → "Connect Your Wallet" screen
2. **Wallet Setup** → Install & connect Petra wallet
3. **Token Setup** → Get test tokens from faucet
4. **First Upload** → Upload file với progress tracking
5. **Success** → View uploaded files với IPFS hash

### **Returning User Flow**
1. **Auto-connect** → Wallet remembered
2. **Balance Check** → Verify tokens
3. **Upload** → Direct file upload
4. **Manage** → View/download previous uploads

---

## 🔐 **Security Features**

### **Wallet Security**
- **Self-custodial**: User controls private keys
- **Signature Required**: Mọi transaction cần signature
- **Network Isolation**: Testnet separation

### **Data Security**
- **Erasure Coding**: 16 chunks, need 10 to recover
- **Decentralized Storage**: Distributed across providers
- **On-chain Metadata**: Immutable file records

---

## 📊 **Token Economics**

### **Gas Fees (APT)**
- **Purpose**: Blockchain transaction fees
- **Cost**: ~0.001 APT per upload
- **Source**: Testnet faucet

### **Storage Fees (ShelbyUSD)**
- **Purpose**: Storage provider payments
- **Cost**: Based on file size & duration
- **Source**: Testnet faucet

---

## 🚀 **Next Steps**

### **Production Ready**
1. **Mainnet Integration**: Switch to mainnet network
2. **Real Tokens**: Use actual APT & ShelbyUSD
3. **Enhanced Security**: Multi-sig, recovery options

### **Advanced Features**
1. **Batch Upload**: Multiple files simultaneously
2. **File Sharing**: Permission-based sharing
3. **Smart Contracts**: Automated storage policies

---

## 📚 **Documentation**

- **Shelby Docs**: https://docs.shelby.xyz/
- **Aptos Docs**: https://aptos.dev/
- **Petra Wallet**: https://petra.app/
- **Wallet Adapter**: https://github.com/aptos-labs/aptos-wallet-adapter

---

**Ready to test?** Open the app and connect your wallet! 🎉
