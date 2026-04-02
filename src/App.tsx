import React, { useState, useRef } from 'react';
import { GoogleGenAI } from "@google/genai";
import { motion, AnimatePresence } from "motion/react";
import { Upload, Image as ImageIcon, Trash2, Download, Loader2, Sparkles, AlertCircle } from 'lucide-react';

// Initialize Gemini AI
const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export default function App() {
  const [image, setImage] = useState<string | null>(null);
  const [imageMimeType, setImageMimeType] = useState<string>('image/png');
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg'];
      if (!allowedTypes.includes(file.type)) {
        setError('Please upload a PNG or JPEG image.');
        return;
      }
      setError(null);
      setImageMimeType(file.type);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
        setProcessedImage(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeWatermark = async () => {
    if (!image) return;

    setIsProcessing(true);
    setError(null);

    try {
      const base64Data = image.split(',')[1];
      const response = await genAI.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [
            {
              inlineData: {
                data: base64Data,
                mimeType: imageMimeType,
              },
            },
            {
              text: 'Remove the watermark from this image. Reconstruct the background and details naturally to make it look like the original image without any watermark. Maintain the original resolution and quality.',
            },
          ],
        },
      });

      let foundImage = false;
      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          setProcessedImage(`data:${imageMimeType};base64,${part.inlineData.data}`);
          foundImage = true;
          break;
        }
      }

      if (!foundImage) {
        throw new Error('No processed image was returned by the AI.');
      }
    } catch (err: any) {
      console.error('Error removing watermark:', err);
      setError(err.message || 'Failed to process image. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadImage = () => {
    if (!processedImage) return;
    const extension = imageMimeType === 'image/png' ? 'png' : 'jpg';
    const link = document.createElement('a');
    link.href = processedImage;
    link.download = `nlm-result.${extension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const reset = () => {
    setImage(null);
    setProcessedImage(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 font-sans selection:bg-blue-100">
      {/* Header */}
      <header className="border-b border-neutral-200 bg-white/80 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white">
              <Sparkles size={20} />
            </div>
            <h1 className="text-xl font-bold tracking-tight">NLM</h1>
          </div>
          <div className="text-sm text-neutral-500 font-medium hidden sm:block">
            AI-Powered Image Watermark Removal
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-extrabold mb-4 tracking-tight text-neutral-900">
            Clean your images in seconds
          </h2>
          <p className="text-lg text-neutral-600 max-w-2xl mx-auto">
            Upload a PNG or JPEG image with a watermark, and our AI will naturally reconstruct the hidden details.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          {/* Upload Section */}
          <section className="space-y-6">
            <div 
              className={`relative group border-2 border-dashed rounded-2xl transition-all duration-300 ${
                image ? 'border-neutral-200 bg-white' : 'border-neutral-300 hover:border-blue-400 bg-neutral-100/50 hover:bg-blue-50/30'
              }`}
            >
              {!image ? (
                <label className="flex flex-col items-center justify-center py-24 cursor-pointer">
                  <div className="w-16 h-16 bg-white rounded-2xl shadow-sm border border-neutral-200 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                    <Upload className="text-blue-600" size={28} />
                  </div>
                  <span className="text-lg font-semibold text-neutral-800">Drop your image here</span>
                  <span className="text-sm text-neutral-500 mt-1">PNG, JPG, or JPEG</span>
                  <input 
                    type="file" 
                    className="hidden" 
                    accept="image/png, image/jpeg, image/jpg" 
                    onChange={handleFileChange}
                    ref={fileInputRef}
                  />
                </label>
              ) : (
                <div className="p-4">
                  <div className="relative rounded-xl overflow-hidden bg-neutral-200 aspect-square flex items-center justify-center">
                    <img 
                      src={image} 
                      alt="Original" 
                      className="max-w-full max-h-full object-contain"
                      referrerPolicy="no-referrer"
                    />
                    <button 
                      onClick={reset}
                      className="absolute top-4 right-4 p-2 bg-white/90 hover:bg-red-50 text-neutral-600 hover:text-red-600 rounded-full shadow-lg transition-colors"
                      title="Remove image"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-neutral-500">
                      <ImageIcon size={16} />
                      <span>Original Image</span>
                    </div>
                    {!processedImage && !isProcessing && (
                      <button 
                        onClick={removeWatermark}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-semibold shadow-md hover:shadow-lg transition-all flex items-center gap-2"
                      >
                        <Sparkles size={18} />
                        Remove Watermark
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {error && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3 text-red-700"
              >
                <AlertCircle className="shrink-0 mt-0.5" size={18} />
                <p className="text-sm font-medium">{error}</p>
              </motion.div>
            )}
          </section>

          {/* Result Section */}
          <section className="space-y-6">
            <div className="bg-white border border-neutral-200 rounded-2xl p-4 min-h-[400px] flex flex-col">
              <div className="flex-1 relative rounded-xl overflow-hidden bg-neutral-50 flex items-center justify-center border border-neutral-100">
                <AnimatePresence mode="wait">
                  {isProcessing ? (
                    <motion.div 
                      key="loader"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex flex-col items-center gap-4"
                    >
                      <Loader2 className="text-blue-600 animate-spin" size={48} />
                      <div className="text-center">
                        <p className="font-semibold text-neutral-800">AI is working its magic...</p>
                        <p className="text-sm text-neutral-500 mt-1">Reconstructing details and removing marks</p>
                      </div>
                    </motion.div>
                  ) : processedImage ? (
                    <motion.img 
                      key="result"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      src={processedImage} 
                      alt="Processed" 
                      className="max-w-full max-h-full object-contain"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div key="placeholder" className="text-center text-neutral-400 p-8">
                      <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Sparkles size={24} />
                      </div>
                      <p className="font-medium">The result will appear here</p>
                      <p className="text-sm mt-1">Process an image to see the AI result</p>
                    </div>
                  )}
                </AnimatePresence>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-neutral-500">
                  <Sparkles size={16} className="text-blue-500" />
                  <span>AI Result</span>
                </div>
                {processedImage && !isProcessing && (
                  <button 
                    onClick={downloadImage}
                    className="bg-neutral-900 hover:bg-neutral-800 text-white px-6 py-2.5 rounded-xl font-semibold shadow-md hover:shadow-lg transition-all flex items-center gap-2"
                  >
                    <Download size={18} />
                    Download Image
                  </button>
                )}
              </div>
            </div>
          </section>
        </div>

        {/* Features */}
        <section className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-6 rounded-2xl bg-white border border-neutral-200 shadow-sm">
            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600 mb-4">
              <Sparkles size={20} />
            </div>
            <h3 className="text-lg font-bold mb-2">AI Reconstruction</h3>
            <p className="text-neutral-600 text-sm leading-relaxed">
              Our advanced AI doesn't just blur; it intelligently reconstructs what's behind the watermark.
            </p>
          </div>
          <div className="p-6 rounded-2xl bg-white border border-neutral-200 shadow-sm">
            <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center text-green-600 mb-4">
              <ImageIcon size={20} />
            </div>
            <h3 className="text-lg font-bold mb-2">Multi-Format Support</h3>
            <p className="text-neutral-600 text-sm leading-relaxed">
              Optimized for PNG and JPEG images to maintain clarity and edge sharpness across formats.
            </p>
          </div>
          <div className="p-6 rounded-2xl bg-white border border-neutral-200 shadow-sm">
            <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center text-purple-600 mb-4">
              <Download size={20} />
            </div>
            <h3 className="text-lg font-bold mb-2">Free Downloads</h3>
            <p className="text-neutral-600 text-sm leading-relaxed">
              Process as many images as you need and download them in full resolution instantly.
            </p>
          </div>
        </section>
      </main>

      <footer className="mt-24 border-t border-neutral-200 py-12 bg-white">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center text-white">
              <Sparkles size={14} />
            </div>
            <span className="font-bold tracking-tight">NLM</span>
          </div>
          <p className="text-neutral-500 text-sm">
            Built with Google Gemini AI. For demonstration purposes only.
          </p>
        </div>
      </footer>
    </div>
  );
}
