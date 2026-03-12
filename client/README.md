# Shelby Upload App

A modern, user-friendly file upload application built with React and Shelby Protocol SDK.

## Features

- **Drag & Drop Upload**: Intuitive file upload with visual feedback
- **Progress Tracking**: Real-time upload progress with animations
- **File Validation**: Automatic validation of file types and sizes
- **Error Handling**: Graceful error handling with user-friendly messages
- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **Modern UI**: Clean, professional interface using Tailwind CSS

## Quick Start

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Set up environment variables**:
   Create a `.env` file in the root directory:
   ```env
   REACT_APP_SHELBY_API_KEY=your_api_key_here
   REACT_APP_SHELBY_ENDPOINT=https://api.shelby.xyz
   ```

3. **Run the development server**:
   ```bash
   npm run dev
   ```

4. **Open your browser** and navigate to `http://localhost:5173`

## File Support

- **Images**: JPEG, PNG, GIF, WebP
- **Documents**: PDF, DOC, DOCX, XLS, XLSX
- **Text**: TXT
- **Maximum file size**: 10MB per file
- **Maximum files per upload**: 5 files

## Technology Stack

- **React 18** - Modern React with hooks
- **Vite** - Fast development build tool
- **Tailwind CSS** - Utility-first CSS framework
- **Framer Motion** - Smooth animations
- **React Dropzone** - Drag & drop functionality
- **Shelby Protocol SDK** - Decentralized storage

## Project Structure

```
client/
├── src/
│   ├── components/
│   │   ├── Layout.jsx       # Header and footer
│   │   ├── Upload.jsx       # Drag & drop upload area
│   │   └── FileList.jsx     # Uploaded files list
│   ├── lib/
│   │   ├── utils.js         # Utility functions
│   │   └── shelby.js        # Shelby SDK configuration
│   ├── App.jsx              # Main application component
│   ├── main.jsx             # Entry point
│   └── index.css            # Global styles
├── public/                  # Static assets
└── package.json            # Dependencies and scripts
```

## Usage

1. **Upload Files**: Drag and drop files onto the upload area or click to browse
2. **Monitor Progress**: Watch real-time progress bars for each file
3. **View Results**: Access uploaded files with copyable links and IPFS hashes
4. **Error Handling**: Clear error messages for invalid files or upload failures

## Configuration

The app can be configured through environment variables:

- `REACT_APP_SHELBY_API_KEY`: Your Shelby Protocol API key
- `REACT_APP_SHELBY_ENDPOINT`: Shelby API endpoint (default: https://api.shelby.xyz)

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

### Customization

- **File validation**: Edit `src/lib/shelby.js` to modify allowed file types and sizes
- **UI styling**: Customize colors and components in `src/components/`
- **API configuration**: Modify Shelby client settings in `src/lib/shelby.js`

## License

MIT License - see LICENSE file for details
