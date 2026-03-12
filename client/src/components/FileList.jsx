import React from 'react';
import { ExternalLink, Copy, Check } from 'lucide-react';
import { motion } from 'framer-motion';

export function FileList({ files }) {
  const [copiedId, setCopiedId] = React.useState(null);

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (files.length === 0) return null;

  return (
    <div className="w-full max-w-2xl mx-auto">
      <h3 className="text-lg font-semibold text-slate-800 mb-4 px-1">Uploaded Files</h3>
      <div className="space-y-3">
        {files.map((file) => (
          <motion.div
            key={file.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="group bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h4 className="font-medium text-slate-800 truncate">{file.name}</h4>
                <div className="flex items-center gap-2 mt-1">
                  <span className="px-2 py-0.5 rounded-full bg-slate-100 text-xs text-slate-600 font-medium">
                    {file.size}
                  </span>
                  <span className="text-xs text-slate-400">•</span>
                  <span className="text-xs text-slate-400">{file.date}</span>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => copyToClipboard(file.url, file.id)}
                  className="p-2 rounded-lg text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-colors"
                  title="Copy Link"
                >
                  {copiedId === file.id ? <Check size={18} className="text-green-500" /> : <Copy size={18} />}
                </button>
                <a
                  href={file.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-lg text-slate-400 hover:bg-slate-50 hover:text-shelby-600 transition-colors"
                  title="Open"
                >
                  <ExternalLink size={18} />
                </a>
              </div>
            </div>
            
            <div className="mt-3 flex items-center gap-2 text-xs bg-slate-50 p-2 rounded border border-slate-100">
              <span className="text-slate-400 shrink-0">IPFS Hash:</span>
              <code className="font-mono text-slate-600 truncate select-all">{file.hash}</code>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
