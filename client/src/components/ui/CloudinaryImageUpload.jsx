import { useState, useCallback, useRef, useEffect } from 'react';
import { Upload, X, Loader2 } from 'lucide-react';
import { cn } from '../../utils/cn';
import { API_BASE_URL } from '../../constants';

const API_BASE = API_BASE_URL;

export function CloudinaryImageUpload({
  value,
  onChange,
  label = 'Profile Photo',
  helperText = 'Upload a professional photo (max 5MB)',
  className,
  required = false,
}) {
  const [preview, setPreview] = useState(value);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);
  const dropzoneRef = useRef(null);

  useEffect(() => {
    setPreview(value || '');
  }, [value]);

  const uploadToServer = useCallback(async (file) => {
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB');
      return;
    }

    setUploading(true);
    setError('');
    setProgress(0);

    const localPreview = URL.createObjectURL(file);
    setPreview(localPreview);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          setProgress(Math.round((e.loaded / e.total) * 100));
        }
      });

      const response = await new Promise((resolve, reject) => {
        xhr.open('POST', `${API_BASE}/freelancers/upload/upload`);
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(JSON.parse(xhr.responseText));
          } else {
            const err = JSON.parse(xhr.responseText);
            reject(new Error(err.message || 'Upload failed'));
          }
        };
        xhr.onerror = () => reject(new Error('Network error'));
        xhr.send(formData);
      });

      URL.revokeObjectURL(localPreview);
      const imageUrl = response.data.url;
      setPreview(imageUrl);
      onChange(imageUrl);
      setProgress(100);
    } catch (err) {
      URL.revokeObjectURL(localPreview);
      setPreview('');
      setError(err.message || 'Failed to upload image. Please try again.');
    } finally {
      setUploading(false);
      setTimeout(() => setProgress(0), 1000);
    }
  }, [onChange]);

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) uploadToServer(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    dropzoneRef.current?.classList.add('ring-2', 'ring-primary-900');
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    dropzoneRef.current?.classList.remove('ring-2', 'ring-primary-900');
  };

  const handleDrop = (e) => {
    e.preventDefault();
    dropzoneRef.current?.classList.remove('ring-2', 'ring-primary-900');
    const file = e.dataTransfer.files?.[0];
    if (file) uploadToServer(file);
  };

  const removeImage = () => {
    setPreview('');
    onChange('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className={cn('space-y-2', className)}>
      <label className="block text-sm font-medium text-zinc-700 flex items-center gap-1">
        {label}
        {required && <span className="text-red-500">*</span>}
      </label>

      <div
        ref={dropzoneRef}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          'relative rounded-2xl border-2 border-dashed transition-all duration-300 group overflow-hidden',
          preview
            ? 'border-transparent bg-zinc-50'
            : 'border-zinc-200 hover:border-primary-900/50 hover:bg-primary-50 hover:shadow-sm',
          'cursor-pointer'
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          disabled={uploading}
          aria-label="Upload profile photo"
        />

        {preview ? (
          <div className="relative h-44 sm:h-52 bg-white flex items-center justify-center p-2">
            <img
              src={preview}
              alt="Preview"
              className="w-full h-full object-contain rounded-xl transition-transform duration-300 group-hover:scale-[1.02]"
            />
            {uploading && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-xl">
                <div className="text-center text-white">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                  <p className="text-sm font-medium">Uploading... {progress}%</p>
                  <div className="w-48 mx-auto mt-2 h-1.5 bg-white/20 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-white rounded-full transition-all duration-200"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              </div>
            )}
            {!uploading && (
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); removeImage(); }}
                className="absolute top-2 right-2 p-1.5 bg-red-500/90 text-white rounded-full hover:bg-red-600 transition-colors shadow-lg"
                aria-label="Remove image"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        ) : (
          <div className="flex h-44 flex-col items-center justify-center p-6 text-center sm:h-52 transition-colors duration-300 group-hover:bg-primary-50/50">
            <div className={cn(
              'w-16 h-16 rounded-2xl flex items-center justify-center mb-4 transition-all duration-300 transform group-hover:-translate-y-1 group-hover:scale-105',
              uploading ? 'bg-primary-100 shadow-inner' : 'bg-zinc-100 shadow-sm group-hover:bg-white group-hover:shadow-md'
            )}>
              {uploading ? (
                <Loader2 className="h-8 w-8 text-primary-900 animate-spin" />
              ) : (
                <Upload className="h-8 w-8 text-zinc-400 group-hover:text-primary-600 transition-colors duration-300" />
              )}
            </div>
            <p className="text-zinc-600 font-medium text-sm sm:text-base group-hover:text-primary-900 transition-colors">
              <span className="text-primary-900 font-bold underline decoration-primary-900/30 underline-offset-4">Click to upload</span> or drag and drop
            </p>
            <p className="text-xs text-zinc-400 mt-2 font-medium">JPG, PNG, WebP up to 5MB</p>
          </div>
        )}

        {error && (
          <div className="absolute bottom-full left-0 right-0 mb-2 px-3 py-1.5 bg-red-500 text-white text-xs rounded-lg text-center">
            {error}
          </div>
        )}
      </div>

      {helperText && !error && (
        <p className="text-xs text-zinc-500">{helperText}</p>
      )}
    </div>
  );
}

export default CloudinaryImageUpload;
