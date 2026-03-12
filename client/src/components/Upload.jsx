import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, File, X, Check, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { fileValidation } from '../lib/fileValidation';

export function FileUpload({ onUpload }) {
  const onDrop = useCallback(acceptedFiles => {
    if (acceptedFiles?.length > 0) {
      onUpload(acceptedFiles);
    }
  }, [onUpload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    maxFiles: 5,
    maxSize: fileValidation.maxSize,
    accept: fileValidation.allowedTypes.reduce((acc, type) => {
      acc[type] = [];
      return acc;
    }, {}),
    validator: (file) => {
      const errors = [];
      if (file.size > fileValidation.maxSize) {
        errors.push('File size exceeds 10MB limit');
      }
      if (!fileValidation.allowedTypes.includes(file.type)) {
        errors.push('File type not supported');
      }
      return errors.length > 0 ? { code: 'file-invalid', message: errors.join(', ') } : null;
    }
  });

  return (
    <div className="w-full max-w-2xl mx-auto mb-12">
      <div
        {...getRootProps()}
        className={cn(
          "relative group cursor-pointer flex flex-col items-center justify-center w-full h-64 rounded-3xl border-2 border-dashed transition-all duration-300 ease-in-out bg-white",
          isDragActive 
            ? "border-shelby-500 bg-shelby-50 scale-[1.02] shadow-xl shadow-shelby-100/50" 
            : "border-slate-200 hover:border-shelby-400 hover:bg-slate-50 hover:shadow-lg hover:shadow-slate-100/50"
        )}
      >
        <input {...getInputProps()} />
        
        <div className="flex flex-col items-center gap-4 text-center p-6">
          <div className={cn(
            "p-4 rounded-full transition-colors duration-300",
            isDragActive ? "bg-shelby-100 text-shelby-600" : "bg-slate-100 text-slate-400 group-hover:bg-shelby-50 group-hover:text-shelby-500"
          )}>
            <Upload size={32} />
          </div>
          <div>
            <p className="text-lg font-semibold text-slate-700">
              {isDragActive ? "Drop files here" : "Click to upload or drag and drop"}
            </p>
            <p className="text-sm text-slate-400 mt-1">
              Supported files: Images, PDF, Docs (Max 10MB)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function UploadProgress({ file, progress, status, error }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 mb-3 flex items-center gap-4"
    >
      <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
        <File size={20} />
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-center mb-1">
          <p className="font-medium text-sm text-slate-700 truncate">{file.name}</p>
          <span className="text-xs text-slate-400">
            {status === 'completed' ? 'Completed' : status === 'error' ? 'Failed' : `${Math.round(progress)}%`}
          </span>
        </div>
        
        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
          <motion.div 
            className={cn(
              "h-full rounded-full transition-all duration-300",
              status === 'error' ? "bg-red-500" : "bg-shelby-500"
            )}
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
          />
        </div>
        {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
      </div>

      <div className="shrink-0">
        {status === 'uploading' && <Loader2 size={18} className="animate-spin text-shelby-500" />}
        {status === 'completed' && <Check size={18} className="text-green-500" />}
        {status === 'error' && <X size={18} className="text-red-500" />}
      </div>
    </motion.div>
  );
}
