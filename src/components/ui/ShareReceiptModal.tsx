/**
 * Share Receipt Modal
 * Beautiful modal for sharing receipts via WhatsApp, SMS, Email, etc.
 */

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, MessageCircle, Mail, Send, Copy, Download, Share2, Loader2, Printer, Image as ImageIcon } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { smsService } from '../../services/smsService';
import whatsappService from '../../services/whatsappService';
import SuccessModal from './SuccessModal';
import { useSuccessModal } from '../../hooks/useSuccessModal';
import { SuccessIcons } from './SuccessModalIcons';
import { useBusinessInfo } from '../../hooks/useBusinessInfo';
import { formatContactForInvoice } from '../../utils/formatPhoneForInvoice';
import { supabase } from '../../lib/supabaseClient';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface ShareReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPrintReceipt?: () => void;
  receiptData: {
    id?: string; // Sale ID for tracking
    receiptNumber: string;
    amount: number;
    subtotal?: number;
    tax?: number;
    discount?: number;
    paymentMethod?: string | { name: string; description?: string; icon?: string };
    customerName?: string;
    customerPhone?: string;
    customerEmail?: string;
    customerCity?: string;
    customerTag?: string;
    sellerName?: string;
    items?: Array<{ 
      productName: string; 
      variantName?: string;
      quantity: number; 
      unitPrice: number;
      totalPrice: number;
      image?: string;
      itemType?: 'product' | 'spare-part';
      partNumber?: string;
      selectedSerialNumbers?: Array<{ 
        id?: string; 
        serial_number?: string; 
        imei?: string; 
        mac_address?: string;
      }>;
      attributes?: Record<string, any>;
    }>;
  };
}

type PageSize = 'a4' | 'letter' | 'a5' | 'legal';

interface LayoutConfig {
  pageSize: PageSize;
  orientation: 'portrait' | 'landscape';
  margin: number;
  fontSize: {
    header: number;
    title: number;
    body: number;
    small: number;
  };
  spacing: {
    section: number;
    item: number;
    line: number;
  };
  logoSize: number;
  imageSize: number;
}

// Helper function to convert image to base64 to avoid CORS issues
const convertImageToBase64 = async (imageUrl: string): Promise<string | null> => {
  try {
    // If already a data URL, return as is
    if (imageUrl.startsWith('data:') || imageUrl.startsWith('blob:')) {
      return imageUrl;
    }

    // First, try to fetch directly (may fail with CORS)
    try {
      const response = await fetch(imageUrl, {
        mode: 'cors',
        cache: 'no-cache',
      });
      
      if (response.ok) {
        const blob = await response.blob();
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            resolve(reader.result as string);
          };
          reader.onerror = () => {
            resolve(null);
          };
          reader.readAsDataURL(blob);
        });
      }
    } catch (fetchError) {
      // Silently handle CORS errors - will try proxy services
      // Only log if it's not a CORS error (network issue, etc.)
      if (!(fetchError instanceof TypeError && fetchError.message.includes('Failed to fetch'))) {
        // Silent - CORS errors are expected for external domains
      }
    }

    // Fallback: Try multiple CORS proxy services
    const proxyServices = [
      `https://corsproxy.io/?${encodeURIComponent(imageUrl)}`,
      `https://api.allorigins.win/raw?url=${encodeURIComponent(imageUrl)}`,
      `https://cors-anywhere.herokuapp.com/${imageUrl}`,
    ];
    
    for (const proxyUrl of proxyServices) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout per proxy
        
        const response = await fetch(proxyUrl, {
          cache: 'no-cache',
          signal: controller.signal,
          mode: 'cors',
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          const blob = await response.blob();
          // Verify it's actually an image
          if (blob.type.startsWith('image/')) {
            return new Promise((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => {
                resolve(reader.result as string);
              };
              reader.onerror = () => {
                resolve(null);
              };
              reader.readAsDataURL(blob);
            });
          }
        }
      } catch (proxyError) {
        // Try next proxy service
        continue;
      }
    }
    
    // All proxy services failed - will try canvas approach

    // Last resort: try canvas approach (will fail if CORS headers not present)
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      const timeout = setTimeout(() => {
        resolve(null);
      }, 10000);
      
      img.onload = () => {
        clearTimeout(timeout);
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            resolve(canvas.toDataURL('image/png'));
          } else {
            resolve(null);
          }
        } catch (e) {
          console.warn(`Canvas conversion failed for: ${imageUrl.substring(0, 60)}...`, e);
          resolve(null);
        }
      };
      img.onerror = () => {
        clearTimeout(timeout);
        console.warn(`Image load failed for base64 conversion: ${imageUrl.substring(0, 60)}...`);
        resolve(null);
      };
      img.src = imageUrl;
    });
  } catch (error) {
    console.warn(`Error converting image to base64: ${imageUrl.substring(0, 60)}...`, error);
    return null;
  }
};

const ShareReceiptModal: React.FC<ShareReceiptModalProps> = ({
  isOpen,
  onClose,
  onPrintReceipt,
  receiptData,
}) => {
  const [isSending, setIsSending] = useState(false);
  const [sendingMethod, setSendingMethod] = useState<string>('');
  const [pageSize, setPageSize] = useState<PageSize>('a4');
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [convertedImages, setConvertedImages] = useState<Map<string, string>>(new Map());
  const [isGeneratingPNG, setIsGeneratingPNG] = useState(false);
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());
  const successModal = useSuccessModal();
  const { businessInfo } = useBusinessInfo();
  const receiptPreviewRef = useRef<HTMLDivElement | null>(null);

  // Convert cross-origin images to base64 when modal opens
  useEffect(() => {
    if (isOpen) {
      // Reset failed images when modal opens
      setFailedImages(new Set());
      
      const convertImages = async () => {
        const imageMap = new Map<string, string>();
        const imagePromises: Promise<void>[] = [];

        // Convert product images
        if (receiptData?.items) {
          receiptData.items
            .filter(item => item.image && !item.image.startsWith('data:') && !item.image.startsWith('blob:'))
            .forEach((item) => {
              if (!item.image) return;
              
              imagePromises.push(
                (async () => {
                  try {
                    const url = new URL(item.image);
                    const currentOrigin = window.location.origin;
                    // Only convert if cross-origin
                    if (url.origin !== currentOrigin) {
                      console.log(`🔄 Pre-converting cross-origin image: ${item.image.substring(0, 60)}...`);
                      const base64 = await convertImageToBase64(item.image);
                      if (base64) {
                        imageMap.set(item.image, base64);
                        console.log(`✅ Image pre-converted to base64`);
                      }
                    }
                  } catch (error) {
                    // If URL parsing fails, try to convert anyway
                    console.warn(`Error parsing image URL, attempting conversion: ${item.image.substring(0, 60)}...`, error);
                    const base64 = await convertImageToBase64(item.image);
                    if (base64) {
                      imageMap.set(item.image, base64);
                    }
                  }
                })()
              );
            });
        }

        // Convert business logo
        if (businessInfo.logo && !businessInfo.logo.startsWith('data:') && !businessInfo.logo.startsWith('blob:')) {
          imagePromises.push(
            (async () => {
              try {
                const url = new URL(businessInfo.logo);
                const currentOrigin = window.location.origin;
                // Only convert if cross-origin
                if (url.origin !== currentOrigin) {
                  console.log(`🔄 Pre-converting cross-origin logo: ${businessInfo.logo.substring(0, 60)}...`);
                  const base64 = await convertImageToBase64(businessInfo.logo);
                  if (base64) {
                    imageMap.set(businessInfo.logo, base64);
                    console.log(`✅ Logo pre-converted to base64`);
                  }
                }
              } catch (error) {
                // If URL parsing fails, try to convert anyway
                console.warn(`Error parsing logo URL, attempting conversion: ${businessInfo.logo.substring(0, 60)}...`, error);
                const base64 = await convertImageToBase64(businessInfo.logo);
                if (base64) {
                  imageMap.set(businessInfo.logo, base64);
                }
              }
            })()
          );
        }

        await Promise.all(imagePromises);
        setConvertedImages(imageMap);
      };

      convertImages();
    }
  }, [isOpen, receiptData, businessInfo.logo]);

  // Debug: Log receipt data to help troubleshoot QR code
  useEffect(() => {
    if (isOpen && receiptData) {
      console.log('📋 Receipt Data:', {
        id: receiptData.id,
        receiptNumber: receiptData.receiptNumber,
        hasId: !!receiptData.id,
        idType: typeof receiptData.id,
        idValue: receiptData.id,
      });
    }
  }, [isOpen, receiptData]);

  if (!isOpen) return null;

  // Get layout configuration based on page size and orientation
  const getLayoutConfig = (size: PageSize, orient: 'portrait' | 'landscape' = 'portrait'): LayoutConfig => {
    // For landscape, adjust margins and spacing
    const isLandscape = orient === 'landscape';
    
    const configs: Record<PageSize, LayoutConfig> = {
      a4: {
        pageSize: 'a4',
        orientation: orient,
        margin: isLandscape ? 10 : 8,
        fontSize: {
          header: isLandscape ? 12 : 10,
          title: isLandscape ? 9 : 8,
          body: isLandscape ? 7 : 6,
          small: isLandscape ? 5 : 4,
        },
        spacing: {
          section: isLandscape ? 4 : 3,
          item: isLandscape ? 3 : 2.5,
          line: isLandscape ? 3.5 : 3,
        },
        logoSize: isLandscape ? 35 : 30,
        imageSize: isLandscape ? 24 : 20,
      },
      letter: {
        pageSize: 'letter',
        orientation: 'portrait',
        margin: 8,
        fontSize: {
          header: 10,
          title: 8,
          body: 6,
          small: 4,
        },
        spacing: {
          section: 3,
          item: 2.5,
          line: 3,
        },
        logoSize: 15,
        imageSize: 20,
      },
      a5: {
        pageSize: 'a5',
        orientation: 'portrait',
        margin: 6,
        fontSize: {
          header: 8,
          title: 7,
          body: 5,
          small: 3.5,
        },
        spacing: {
          section: 2,
          item: 2,
          line: 2.5,
        },
        logoSize: 12,
        imageSize: 16,
      },
      legal: {
        pageSize: 'legal',
        orientation: 'portrait',
        margin: 10,
        fontSize: {
          header: 12,
          title: 9,
          body: 7,
          small: 5,
        },
        spacing: {
          section: 4,
          item: 3,
          line: 3.5,
        },
        logoSize: 18,
        imageSize: 24,
      },
    };
    return configs[size];
  };

  // Format money helper
  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('en-TZ', {
      style: 'currency',
      currency: 'TZS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const handlePrint = () => {
    // Add print styles to hide everything except receipt preview
    const printStyle = document.createElement('style');
    printStyle.id = 'receipt-print-styles';
    printStyle.textContent = `
      @media print {
        body * {
          visibility: hidden;
        }
        [data-receipt-preview],
        [data-receipt-preview] * {
          visibility: visible;
        }
        [data-receipt-preview] {
          position: absolute;
          left: 0;
          top: 0;
          width: 100%;
          background: white;
          padding: 0;
          margin: 0;
          border: none;
          box-shadow: none;
        }
        @page {
          size: ${pageSize} ${orientation};
          margin: 0;
        }
      }
    `;
    document.head.appendChild(printStyle);

    // Trigger print
    window.print();

    // Remove print styles after printing
    setTimeout(() => {
      const style = document.getElementById('receipt-print-styles');
      if (style) {
        style.remove();
      }
    }, 1000);
  };

  // Helper function to convert all cross-origin images to base64
  const convertImagesToBase64 = async (element: HTMLElement): Promise<void> => {
    const images = element.querySelectorAll('img');
    console.log(`🔄 Found ${images.length} images to convert for PDF...`);
    
    const imagePromises = Array.from(images).map(async (img, index) => {
      let src = img.src;
      
      // Skip if already base64 or blob and properly loaded
      if ((src.startsWith('data:') || src.startsWith('blob:')) && img.complete && img.naturalWidth > 0) {
        console.log(`✅ Image ${index + 1} already base64/blob and loaded (${img.naturalWidth}x${img.naturalHeight}), skipping conversion`);
        return;
      }

      // Get original src from data attribute or current src
      const originalSrc = img.getAttribute('data-original-src') || img.getAttribute('src') || src;
      
      // If current src is already base64 but not loaded, wait for it
      if (src.startsWith('data:') || src.startsWith('blob:')) {
        return new Promise<void>((resolve) => {
          if (img.complete && img.naturalWidth > 0) {
            resolve();
            return;
          }
          const timeout = setTimeout(() => resolve(), 5000);
          img.onload = () => {
            clearTimeout(timeout);
            console.log(`✅ Image ${index + 1} base64 image loaded`);
            resolve();
          };
          img.onerror = () => {
            clearTimeout(timeout);
            console.warn(`⚠️ Image ${index + 1} base64 image failed to load`);
            resolve();
          };
        });
      }
      
      try {
        // Convert ALL images to base64 to ensure they work in PDF
        console.log(`🔄 Converting image ${index + 1} to base64: ${originalSrc.substring(0, 60)}...`);
        const base64 = await convertImageToBase64(originalSrc);
        
        if (base64) {
          // Set the base64 as src and wait for it to load
          return new Promise<void>((resolve) => {
            const timeout = setTimeout(() => {
              if (img.complete && img.naturalWidth > 0) {
                console.log(`✅ Image ${index + 1} loaded after timeout`);
              } else {
                console.warn(`⏱️ Image ${index + 1} conversion timeout`);
              }
              resolve();
            }, 10000); // 10 second timeout
            
            img.onload = () => {
              clearTimeout(timeout);
              if (img.naturalWidth > 0 && img.naturalHeight > 0) {
                console.log(`✅ Image ${index + 1} converted and loaded successfully (${img.naturalWidth}x${img.naturalHeight})`);
              } else {
                console.warn(`⚠️ Image ${index + 1} loaded but has zero dimensions`);
              }
              resolve();
            };
            img.onerror = () => {
              clearTimeout(timeout);
              console.warn(`⚠️ Image ${index + 1} failed to load after conversion`);
              resolve(); // Continue even if it fails
            };
            
            // Set the base64 src
            img.src = base64;
            img.setAttribute('data-original-src', originalSrc); // Store original for reference
            
            // If already complete, resolve immediately
            if (img.complete) {
              clearTimeout(timeout);
              resolve();
            }
          });
        } else {
          console.warn(`⚠️ Failed to convert image ${index + 1}, will try with html2canvas: ${originalSrc.substring(0, 60)}...`);
        }
      } catch (error) {
        // If URL parsing fails, try to convert anyway
        console.warn(`Error parsing image URL ${index + 1}, attempting conversion: ${originalSrc.substring(0, 60)}...`, error);
        const base64 = await convertImageToBase64(originalSrc);
        if (base64) {
          return new Promise<void>((resolve) => {
            const timeout = setTimeout(() => resolve(), 10000);
            img.onload = () => {
              clearTimeout(timeout);
              resolve();
            };
            img.onerror = () => {
              clearTimeout(timeout);
              resolve();
            };
            img.src = base64;
            if (img.complete) {
              clearTimeout(timeout);
              resolve();
            }
          });
        }
      }
    });

    await Promise.all(imagePromises);
    console.log('✅ All images converted and loaded');
  };

  // Unified function to generate PDF that matches preview exactly (100% match)
  const generatePDF = async (forUpload: boolean = false): Promise<{ blob: Blob; url?: string } | null> => {
    try {
      // Get the receipt preview element and its container
      const receiptPreview = document.querySelector('[data-receipt-preview]') as HTMLElement;
      const previewContainer = receiptPreview?.parentElement; // The container with background
      
      if (!receiptPreview) {
        toast.error('Receipt preview not found');
        return null;
      }

      // Convert ALL images to base64 to avoid CORS issues and ensure they render in PDF
      console.log('🔄 Converting all images to base64 for PDF...');
      await convertImagesToBase64(receiptPreview);
      console.log('✅ Image conversion complete');

      // Wait for all images to fully load after conversion
      const images = receiptPreview.querySelectorAll('img');
      console.log(`📸 Verifying ${images.length} images are loaded for PDF...`);
      
      const imagePromises = Array.from(images).map((img, index) => {
        // Check if image is already loaded
        if (img.complete && img.naturalWidth > 0 && img.naturalHeight > 0) {
          console.log(`✅ Image ${index + 1} already loaded (${img.naturalWidth}x${img.naturalHeight}):`, img.src.substring(0, 50));
          return Promise.resolve();
        }
        
        // Wait for image to load
        return new Promise<void>((resolve) => {
          const timeout = setTimeout(() => {
            if (img.complete && img.naturalWidth > 0) {
              console.log(`✅ Image ${index + 1} loaded after timeout:`, img.src.substring(0, 50));
            } else {
              console.warn(`⏱️ Image ${index + 1} load timeout:`, img.src.substring(0, 50));
            }
            resolve(); // Continue even if timeout
          }, 10000); // Increased timeout to 10 seconds
          
          img.onload = () => {
            clearTimeout(timeout);
            if (img.naturalWidth > 0 && img.naturalHeight > 0) {
              console.log(`✅ Image ${index + 1} loaded successfully (${img.naturalWidth}x${img.naturalHeight}):`, img.src.substring(0, 50));
            } else {
              console.warn(`⚠️ Image ${index + 1} loaded but has zero dimensions`);
            }
            resolve();
          };
          
          img.onerror = () => {
            clearTimeout(timeout);
            console.warn(`❌ Image ${index + 1} failed to load:`, img.src.substring(0, 50));
            resolve(); // Continue even if image fails
          };
          
          // If image is already complete, resolve immediately
          if (img.complete) {
            clearTimeout(timeout);
            resolve();
          }
        });
      });

      // Wait for all images to load
      await Promise.all(imagePromises);
      console.log('✅ All images verified, capturing preview...');
      
      // Additional delay to ensure all rendering is complete
      await new Promise(resolve => setTimeout(resolve, 500));

      // Get layout configuration for selected page size and orientation
      const layout = getLayoutConfig(pageSize, orientation);
      
      // Get computed styles to get exact dimensions and background
      const previewStyle = window.getComputedStyle(receiptPreview);
      const containerStyle = previewContainer ? window.getComputedStyle(previewContainer) : null;
      
      // Get exact dimensions from the preview element
      const previewRect = receiptPreview.getBoundingClientRect();
      const containerRect = previewContainer?.getBoundingClientRect();
      
      console.log('📐 Preview dimensions:', {
        previewWidth: receiptPreview.scrollWidth,
        previewHeight: receiptPreview.scrollHeight,
        previewOffsetWidth: receiptPreview.offsetWidth,
        previewOffsetHeight: receiptPreview.offsetHeight,
        previewRect: {
          width: previewRect.width,
          height: previewRect.height,
          top: previewRect.top,
          left: previewRect.left
        },
        containerRect: containerRect ? {
          width: containerRect.width,
          height: containerRect.height
        } : null
      });
      
      // Capture the preview element with exact dimensions
      console.log('📷 Capturing preview with html2canvas (100% match)...');
      
      // Capture with EXACT dimensions and styling (100% match to preview)
      const canvas = await html2canvas(receiptPreview, {
        scale: 3, // Higher quality for PDF (3x for crisp rendering)
        useCORS: false, // Set to false to allow tainted canvas (images may not be perfect but will render)
        allowTaint: true, // Allow tainted canvas - this allows cross-origin images to render
        logging: false,
        backgroundColor: '#f9fafb', // Match the gradient background color exactly (#f9fafb = gray-50)
        width: receiptPreview.scrollWidth,
        height: receiptPreview.scrollHeight,
        windowWidth: receiptPreview.scrollWidth,
        windowHeight: receiptPreview.scrollHeight,
        imageTimeout: 20000, // Wait longer for images to load
        removeContainer: false,
        x: 0,
        y: 0,
        foreignObjectRendering: false, // Disable to avoid issues with cross-origin images
        onclone: (clonedDoc) => {
          // Ensure all styles are preserved in the cloned document - 100% EXACT match
          const clonedPreview = clonedDoc.querySelector('[data-receipt-preview]') as HTMLElement;
          if (clonedPreview) {
            // Force preserve ALL computed styles exactly as they appear in preview
            const styles = [
              'transform', 'willChange', 'boxSizing', 'padding', 'margin', 
              'border', 'borderRadius', 'backgroundColor', 'boxShadow',
              'width', 'height', 'display', 'flexDirection', 'alignItems',
              'justifyContent', 'gap', 'fontSize', 'fontFamily', 'color',
              'lineHeight', 'letterSpacing', 'textAlign', 'overflow'
            ];
            
            styles.forEach(prop => {
              const value = previewStyle.getPropertyValue(prop);
              if (value) {
                clonedPreview.style.setProperty(prop, value, 'important');
              }
            });
            
            // Ensure exact dimensions
            clonedPreview.style.width = `${receiptPreview.scrollWidth}px`;
            clonedPreview.style.height = `${receiptPreview.scrollHeight}px`;
            clonedPreview.style.minWidth = `${receiptPreview.scrollWidth}px`;
            clonedPreview.style.minHeight = `${receiptPreview.scrollHeight}px`;
          }
        }
      });

      // Convert canvas to image
      const imgData = canvas.toDataURL('image/png', 1.0);
      console.log('✅ Canvas captured, generating PDF (100% match)...');
      
      // Create PDF with EXACT dimensions matching preview
      const doc = new jsPDF(layout.orientation, 'mm', layout.pageSize);
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      
      // Set PDF background to match preview background EXACTLY (#f9fafb = gray-50)
      doc.setFillColor(249, 250, 251); // #f9fafb in RGB - exact match
      doc.rect(0, 0, pageWidth, pageHeight, 'F');
      
      // Calculate margins to match preview EXACTLY (p-6 = 24px = ~6.35mm at 96 DPI)
      // Get actual padding from computed styles
      const paddingTop = parseFloat(previewStyle.paddingTop) || 0;
      const paddingBottom = parseFloat(previewStyle.paddingBottom) || 0;
      const paddingLeft = parseFloat(previewStyle.paddingLeft) || 0;
      const paddingRight = parseFloat(previewStyle.paddingRight) || 0;
      
      // Container padding (p-6 = 24px = 6.35mm)
      const containerPaddingMm = 6.35; // 24px in mm
      
      // Calculate exact dimensions in mm
      const scaleFactor = 3; // html2canvas scale
      const pxToMm = 25.4 / 96; // Convert pixels to mm at 96 DPI
      
      // Actual preview dimensions in mm (accounting for scale factor)
      const previewWidthMm = (canvas.width / scaleFactor) * pxToMm;
      const previewHeightMm = (canvas.height / scaleFactor) * pxToMm;
      
      // Available space accounting for container padding
      const availableWidth = pageWidth - (containerPaddingMm * 2);
      const availableHeight = pageHeight - (containerPaddingMm * 2);
      
      console.log('📐 Exact dimension calculations:', {
        pageWidth: pageWidth.toFixed(2),
        pageHeight: pageHeight.toFixed(2),
        containerPaddingMm: containerPaddingMm.toFixed(2),
        availableWidth: availableWidth.toFixed(2),
        availableHeight: availableHeight.toFixed(2),
        previewWidthMm: previewWidthMm.toFixed(2),
        previewHeightMm: previewHeightMm.toFixed(2),
        canvasWidth: canvas.width,
        canvasHeight: canvas.height,
        scaleFactor: scaleFactor
      });
      
      // Scale to fit within available space while maintaining aspect ratio
      // Try to use 1:1 scale (100% match) if preview fits, otherwise scale down proportionally
      const widthScale = availableWidth / previewWidthMm;
      const heightScale = availableHeight / previewHeightMm;
      const scale = Math.min(widthScale, heightScale, 1); // Don't scale up, only down if needed
      
      // Use exact preview dimensions scaled proportionally
      let finalWidth = previewWidthMm * scale;
      let finalHeight = previewHeightMm * scale;
      
      // Center with EXACT margins matching preview (100% match)
      // This ensures the receipt appears in the PDF exactly as it appears in the preview
      const xOffset = containerPaddingMm + (availableWidth - finalWidth) / 2;
      const yOffset = containerPaddingMm + (availableHeight - finalHeight) / 2;
      
      // Log for debugging to ensure 100% match
      console.log('✅ PDF will match preview 100%:', {
        scale: scale === 1 ? '1:1 (100% match)' : `${(scale * 100).toFixed(1)}%`,
        previewSize: `${previewWidthMm.toFixed(2)}mm × ${previewHeightMm.toFixed(2)}mm`,
        finalSize: `${finalWidth.toFixed(2)}mm × ${finalHeight.toFixed(2)}mm`,
        margins: `${containerPaddingMm.toFixed(2)}mm on all sides`,
        background: '#f9fafb (exact match)'
      });
      
      console.log('📏 Final PDF dimensions (100% match):', {
        finalWidth: finalWidth.toFixed(2),
        finalHeight: finalHeight.toFixed(2),
        scale: scale.toFixed(3),
        xOffset: xOffset.toFixed(2),
        yOffset: yOffset.toFixed(2),
        containerPaddingMm: containerPaddingMm.toFixed(2),
        availableWidth: availableWidth.toFixed(2),
        availableHeight: availableHeight.toFixed(2),
        pages: Math.ceil(finalHeight / availableHeight)
      });
      
      // Add image to PDF - handle multi-page if needed (100% exact match)
      if (finalHeight <= availableHeight) {
        // Single page - add image with EXACT calculated offset matching preview
        doc.addImage(imgData, 'PNG', xOffset, yOffset, finalWidth, finalHeight, undefined, 'FAST');
      } else {
        // Multi-page - split image across pages with EXACT margins
        let currentY = 0;
        let sourceY = 0;
        let pageNumber = 0;
        
        while (currentY < finalHeight) {
          const remainingHeight = finalHeight - currentY;
          const pageImgHeight = Math.min(availableHeight, remainingHeight);
          const sourceHeight = (pageImgHeight / finalHeight) * canvas.height;
          
          // Create a canvas for this page section
          const pageCanvas = document.createElement('canvas');
          pageCanvas.width = canvas.width;
          pageCanvas.height = sourceHeight;
          const ctx = pageCanvas.getContext('2d');
          
          if (ctx) {
            // Draw the section of the original canvas
            ctx.drawImage(canvas, 0, sourceY, canvas.width, sourceHeight, 0, 0, canvas.width, sourceHeight);
            const pageImgData = pageCanvas.toDataURL('image/png', 1.0);
            
            // Calculate Y offset for this page (first page uses yOffset, subsequent pages use margin)
            const pageYOffset = pageNumber === 0 ? yOffset : containerPaddingMm;
            
            // Add to PDF with EXACT x offset for centering and margin (100% match)
            doc.addImage(pageImgData, 'PNG', xOffset, pageYOffset, finalWidth, pageImgHeight, undefined, 'FAST');
          }
          
          sourceY += sourceHeight;
          currentY += pageImgHeight;
          pageNumber++;
          
          // Add new page if there's more content
          if (currentY < finalHeight) {
            doc.addPage();
            // Fill background on new page with EXACT same color (#f9fafb)
            doc.setFillColor(249, 250, 251);
            doc.rect(0, 0, pageWidth, pageHeight, 'F');
          }
        }
      }
      
      // Generate PDF blob
      const pdfBlob = doc.output('blob');
      
      // Calculate and log PDF file size
      const pdfSizeBytes = pdfBlob.size;
      const pdfSizeKB = (pdfSizeBytes / 1024).toFixed(2);
      const pdfSizeMB = (pdfSizeBytes / (1024 * 1024)).toFixed(2);
      
      console.log('📄 PDF Generated:', {
        size: `${pdfSizeMB} MB (${pdfSizeKB} KB)`,
        bytes: pdfSizeBytes,
        pages: doc.internal.pages.length,
        quality: 'High (scale: 3x)'
      });
      
      if (!forUpload) {
        // For download, just return the blob
        return { blob: pdfBlob };
      }
      
      // For upload (WhatsApp), upload to storage and return URL
      const pdfFile = new File([pdfBlob], `receipt-${receiptData.receiptNumber}.pdf`, { type: 'application/pdf' });
      
      // Upload to Supabase storage
      const timestamp = Date.now();
      // ✅ FIX: Supabase storage requires a path (with directory), not just filename
      const receiptNumber = receiptData.receiptNumber || `RECEIPT-${timestamp}`;
      const filePath = `receipts/${timestamp}-${receiptNumber}.pdf`;
      
      // Validate filePath is not empty
      if (!filePath || filePath.trim() === '') {
        throw new Error('File path is required for upload');
      }
      
      console.log('📤 Uploading PDF to storage...');
      console.log('   File path:', filePath);
      
      // Try whatsapp-media bucket first (most common)
      let uploadError = null;
      let bucketName = 'whatsapp-media';
      let { data, error } = await supabase.storage
        .from(bucketName)
        .upload(filePath, pdfFile, {
          cacheControl: '3600',
          upsert: false
        });

      // If whatsapp-media fails, try receipts bucket
      if (error) {
        console.warn('⚠️ whatsapp-media bucket failed, trying receipts bucket...', error.message);
        uploadError = error;
        bucketName = 'receipts';
        const result = await supabase.storage
          .from(bucketName)
          .upload(filePath, pdfFile, {
            cacheControl: '3600',
            upsert: false
          });
        data = result.data;
        error = result.error;
      }

      // If both fail, try public-files as last resort
      if (error) {
        console.warn('⚠️ receipts bucket failed, trying public-files bucket...', error.message);
        uploadError = error;
        bucketName = 'public-files';
        const result = await supabase.storage
          .from(bucketName)
          .upload(filePath, pdfFile, {
            cacheControl: '3600',
            upsert: false
          });
        data = result.data;
        error = result.error;
      }

      if (error) {
        // Fallback: Try local upload endpoint if Supabase storage fails
        console.warn('⚠️ All Supabase buckets failed, trying local upload endpoint...');
        try {
          const { uploadMedia } = await import('../../lib/whatsappMediaStorage');
          const uploadResult = await uploadMedia(pdfFile);
          
          if (uploadResult.success && uploadResult.url) {
            console.log('✅ PDF uploaded via local endpoint:', uploadResult.url);
            return { blob: pdfBlob, url: uploadResult.url };
          }
        } catch (localError: any) {
          console.error('❌ Local upload also failed:', localError);
        }
        
        throw new Error(`Failed to upload PDF to any bucket. Last error: ${error.message}. Please ensure at least one of these buckets exists: whatsapp-media, receipts, or public-files`);
      }

      // Get public URL (use the path that was successfully uploaded)
      const { data: urlData } = supabase.storage
        .from(bucketName)
        .getPublicUrl(filePath);

      console.log(`✅ PDF uploaded successfully to ${bucketName}:`, urlData.publicUrl);
      return { blob: pdfBlob, url: urlData.publicUrl };
    } catch (error) {
      console.error('Error generating/uploading PDF:', error);
      throw error;
    }
  };

  // Helper function to generate PDF and upload to storage (for WhatsApp)
  const generateAndUploadPDF = async (): Promise<string | null> => {
    const result = await generatePDF(true);
    return result?.url || null;
  };

  // Function to generate PNG image from receipt preview
  const generatePNG = async (forUpload: boolean = false): Promise<{ blob: Blob; url?: string } | null> => {
    setIsGeneratingPNG(true);
    let clonedElement: HTMLElement | null = null;
    try {
      // Helper function to get the receipt preview element with retries
      const getReceiptPreview = (): HTMLElement | null => {
        // First try the ref
        if (receiptPreviewRef.current && receiptPreviewRef.current.isConnected) {
          return receiptPreviewRef.current;
        }
        // Fallback to querySelector
        const element = document.querySelector('[data-receipt-preview]') as HTMLElement;
        if (element && element.isConnected) {
          receiptPreviewRef.current = element;
          return element;
        }
        return null;
      };

      // Get the receipt preview element with retries
      let receiptPreview = getReceiptPreview();
      if (!receiptPreview) {
        // Wait a bit and try again (in case of timing issues)
        await new Promise(resolve => setTimeout(resolve, 100));
        receiptPreview = getReceiptPreview();
        if (!receiptPreview) {
          // One more retry with longer delay
          await new Promise(resolve => setTimeout(resolve, 200));
          receiptPreview = getReceiptPreview();
          if (!receiptPreview) {
            throw new Error('Receipt preview element is no longer in the DOM');
          }
        }
      }

      // Verify modal is still open and element is still connected
      if (!isOpen || !receiptPreview.isConnected) {
        throw new Error('Receipt preview element is no longer in the DOM');
      }

      // Store element dimensions and clone early to use later even if element is removed
      const previewRect = receiptPreview.getBoundingClientRect();
      const previewWidth = Math.max(receiptPreview.scrollWidth, receiptPreview.offsetWidth, previewRect.width, 800);
      const previewHeight = Math.max(receiptPreview.scrollHeight, receiptPreview.offsetHeight, previewRect.height, 600);
      
      if (previewWidth === 0 || previewHeight === 0) {
        throw new Error('Receipt preview has invalid dimensions');
      }

      // Clone the element early to preserve it even if original is removed
      const clonedElement = receiptPreview.cloneNode(true) as HTMLElement;
      clonedElement.setAttribute('data-receipt-preview-clone', 'true');
      clonedElement.style.position = 'absolute';
      clonedElement.style.left = '-9999px';
      clonedElement.style.top = '0';
      clonedElement.style.width = `${previewWidth}px`;
      clonedElement.style.height = `${previewHeight}px`;
      clonedElement.style.visibility = 'hidden';
      clonedElement.style.pointerEvents = 'none';
      document.body.appendChild(clonedElement);

      // Convert cross-origin images to base64 to avoid CORS issues
      console.log('🔄 Converting images to base64 for PNG...');
      await convertImagesToBase64(receiptPreview);
      
      // Also convert images in cloned element
      await convertImagesToBase64(clonedElement);
      console.log('✅ Image conversion complete');

      // Wait for all images to load
      const images = receiptPreview.querySelectorAll('img');
      console.log(`📸 Found ${images.length} images to load for PNG...`);
      
      const imagePromises = Array.from(images).map((img, index) => {
        if (img.complete && img.naturalWidth > 0 && img.naturalHeight > 0) {
          console.log(`✅ Image ${index + 1} already loaded:`, img.src.substring(0, 50));
          return Promise.resolve();
        }
        
        return new Promise<void>((resolve) => {
          const timeout = setTimeout(() => {
            if (img.complete && img.naturalWidth > 0) {
              console.log(`✅ Image ${index + 1} loaded after timeout`);
            } else {
              console.warn(`⏱️ Image ${index + 1} load timeout`);
            }
            resolve();
          }, 10000);
          
          img.onload = () => {
            clearTimeout(timeout);
            if (img.naturalWidth > 0 && img.naturalHeight > 0) {
              console.log(`✅ Image ${index + 1} loaded successfully (${img.naturalWidth}x${img.naturalHeight})`);
            }
            resolve();
          };
          
          img.onerror = () => {
            clearTimeout(timeout);
            console.warn(`❌ Image ${index + 1} failed to load`);
            resolve();
          };
          
          if (img.complete) {
            clearTimeout(timeout);
            resolve();
          }
        });
      });

      await Promise.all(imagePromises);
      console.log('✅ All images verified, capturing PNG...');
      
      // Wait for rendering to complete
      await new Promise(resolve => setTimeout(resolve, 500));

      // Capture the preview as canvas
      console.log('📷 Capturing preview as PNG...');
      
      // Re-check element is still in DOM and modal is open
      receiptPreview = getReceiptPreview();
      if (!receiptPreview) {
        throw new Error('Receipt preview element is no longer in the DOM');
      }
      
      if (!isOpen) {
        throw new Error('Receipt modal was closed during PNG generation');
      }
      
      // Ensure element is visible and scrolled into view
      receiptPreview.scrollIntoView({ behavior: 'instant', block: 'start' });
      
      // Wait a bit for any layout changes
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Get computed styles before cloning
      const previewStyle = window.getComputedStyle(receiptPreview);
      // Recalculate dimensions (previewWidth and previewHeight already declared above)
      const currentPreviewWidth = Math.max(receiptPreview.scrollWidth, receiptPreview.offsetWidth, 800);
      const currentPreviewHeight = Math.max(receiptPreview.scrollHeight, receiptPreview.offsetHeight, 600);
      
      if (currentPreviewWidth === 0 || currentPreviewHeight === 0) {
        throw new Error(`Receipt preview has invalid dimensions: ${currentPreviewWidth}x${currentPreviewHeight}. Please ensure the receipt is visible.`);
      }
      
      console.log(`📐 Preview dimensions: ${currentPreviewWidth}x${currentPreviewHeight}`);
      
      // Verify element is actually visible
      const rect = receiptPreview.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) {
        throw new Error('Receipt preview element has zero size. Please ensure it is visible on screen.');
      }
      
      // Final check before html2canvas
      receiptPreview = getReceiptPreview();
      if (!receiptPreview) {
        throw new Error('Receipt preview element disappeared before capture');
      }
      
      if (!isOpen) {
        throw new Error('Receipt modal was closed before capture');
      }

      let canvas: HTMLCanvasElement;
      try {
        // Try with simplified configuration first
        const html2canvasOptions: any = {
          scale: 2, // Reduced from 3 for better compatibility
          useCORS: true, // Changed to true for better image handling
          allowTaint: false, // Changed to false when useCORS is true
          logging: false,
          backgroundColor: '#ffffff',
          width: currentPreviewWidth,
          height: currentPreviewHeight,
          imageTimeout: 30000, // Increased timeout
          removeContainer: false,
        };

        // Only add onclone if element is found
        html2canvasOptions.onclone = (clonedDoc: Document, element: Element | null) => {
          try {
            // Use the element parameter directly if available
            if (element && element instanceof HTMLElement) {
              const clonedPreview = element as HTMLElement;
              // Ensure dimensions are preserved
              clonedPreview.style.width = `${currentPreviewWidth}px`;
              clonedPreview.style.height = `${currentPreviewHeight}px`;
              clonedPreview.style.minWidth = `${currentPreviewWidth}px`;
              clonedPreview.style.minHeight = `${currentPreviewHeight}px`;
            }
          } catch (error) {
            console.warn('Error in onclone callback (non-critical):', error);
            // Continue - this is not critical
          }
        };

        console.log('📸 Starting html2canvas with options:', {
          scale: html2canvasOptions.scale,
          width: currentPreviewWidth,
          height: currentPreviewHeight,
        });

        // Final verification before html2canvas call - with retry
        let attempts = 0;
        const maxAttempts = 3;
        while (attempts < maxAttempts) {
          receiptPreview = getReceiptPreview();
          if (receiptPreview && receiptPreview.isConnected && isOpen) {
            break;
          }
          if (attempts < maxAttempts - 1) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
          attempts++;
        }
        
        if (!receiptPreview || !receiptPreview.isConnected || !isOpen) {
          throw new Error('Receipt preview element is no longer in the DOM');
        }
        
        if (!isOpen) {
          throw new Error('Receipt modal was closed before html2canvas could capture');
        }

        canvas = await html2canvas(receiptPreview, html2canvasOptions);
        
        if (!canvas || canvas.width === 0 || canvas.height === 0) {
          throw new Error('Canvas generation failed: invalid dimensions');
        }
        
        console.log('✅ Canvas generated successfully:', {
          width: canvas.width,
          height: canvas.height
        });
      } catch (html2canvasError: any) {
        console.error('html2canvas error details:', {
          message: html2canvasError?.message,
          stack: html2canvasError?.stack,
          name: html2canvasError?.name
        });
        
        // Try with even simpler configuration as fallback
        try {
          console.log('🔄 Retrying with minimal configuration...');
          
          // Use cloned element if original is not available
          let elementToCapture = receiptPreview;
          receiptPreview = getReceiptPreview();
          
          if (!receiptPreview || !receiptPreview.isConnected || !isOpen) {
            console.warn('⚠️ Using cloned element for fallback capture');
            elementToCapture = clonedElement;
          } else {
            elementToCapture = receiptPreview;
          }
          
          canvas = await html2canvas(elementToCapture, {
            scale: 1,
            useCORS: true,
            allowTaint: false,
            backgroundColor: '#ffffff',
            logging: true, // Enable logging for debugging
          });
          
          if (!canvas || canvas.width === 0 || canvas.height === 0) {
            throw new Error('Fallback canvas generation also failed');
          }
          
          console.log('✅ Fallback canvas generation succeeded');
        } catch (fallbackError: any) {
          const errorMessage = html2canvasError?.message || fallbackError?.message || 'Unknown error';
          console.error('Both html2canvas attempts failed:', {
            first: html2canvasError?.message,
            fallback: fallbackError?.message
          });
          
          // Provide more specific error message
          if (errorMessage.includes('no longer in the DOM') || errorMessage.includes('not found')) {
            throw new Error('Receipt preview is not available. Please close and reopen the receipt modal.');
          }
          
          throw new Error(`Failed to capture receipt preview: ${errorMessage}. The receipt preview may not be fully rendered. Please wait a moment and try again.`);
        }
      }

      // Convert canvas to PNG blob
      const pngBlob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((blob) => {
          if (blob) {
            console.log('✅ PNG generated successfully:', {
              size: `${(blob.size / (1024 * 1024)).toFixed(2)} MB`,
              dimensions: `${canvas.width}x${canvas.height}`
            });
            resolve(blob);
          } else {
            console.error('Failed to generate PNG blob');
            resolve(null);
          }
        }, 'image/png', 1.0); // Maximum quality
      });

      if (!pngBlob) {
        return null;
      }

      if (!forUpload) {
        // For download, just return the blob
        return { blob: pngBlob };
      }

      // For upload (WhatsApp), upload to storage and return URL
      const receiptNumber = receiptData.receiptNumber || `RECEIPT-${Date.now()}`;
      const pngFile = new File([pngBlob], `receipt-${receiptNumber}.png`, { type: 'image/png' });
      
      // Upload to Supabase storage
      const timestamp = Date.now();
      // ✅ FIX: Supabase storage requires a path (with directory), not just filename
      const filePath = `receipts/${timestamp}-${receiptNumber}.png`;
      
      // Validate filePath is not empty
      if (!filePath || filePath.trim() === '') {
        throw new Error('File path is required for upload');
      }
      
      console.log('📤 Uploading PNG to storage...');
      console.log('   File path:', filePath);
      
      // Try whatsapp-media bucket first (most common)
      let uploadError = null;
      let bucketName = 'whatsapp-media';
      let { data, error } = await supabase.storage
        .from(bucketName)
        .upload(filePath, pngFile, {
          cacheControl: '3600',
          upsert: false
        });

      // If whatsapp-media fails, try receipts bucket
      if (error) {
        console.warn('⚠️ whatsapp-media bucket failed, trying receipts bucket...', error.message);
        uploadError = error;
        bucketName = 'receipts';
        const result = await supabase.storage
          .from(bucketName)
          .upload(filePath, pngFile, {
            cacheControl: '3600',
            upsert: false
          });
        data = result.data;
        error = result.error;
      }

      // If both fail, try public-files as last resort
      if (error) {
        console.warn('⚠️ receipts bucket failed, trying public-files bucket...', error.message);
        uploadError = error;
        bucketName = 'public-files';
        const result = await supabase.storage
          .from(bucketName)
          .upload(filePath, pngFile, {
            cacheControl: '3600',
            upsert: false
          });
        data = result.data;
        error = result.error;
      }

      if (error) {
        // Fallback: Try local upload endpoint if Supabase storage fails
        console.warn('⚠️ All Supabase buckets failed, trying local upload endpoint...');
        try {
          const { uploadMedia } = await import('../../lib/whatsappMediaStorage');
          const uploadResult = await uploadMedia(pngFile);
          
          if (uploadResult.success && uploadResult.url) {
            console.log('✅ PNG uploaded via local endpoint:', uploadResult.url);
            return { blob: pngBlob, url: uploadResult.url };
          }
        } catch (localError: any) {
          console.error('❌ Local upload also failed:', localError);
        }
        
        throw new Error(`Failed to upload PNG to any bucket. Last error: ${error.message}. Please ensure at least one of these buckets exists: whatsapp-media, receipts, or public-files`);
      }

      // Get public URL (use the path that was successfully uploaded)
      const { data: urlData } = supabase.storage
        .from(bucketName)
        .getPublicUrl(filePath);

      console.log(`✅ PNG uploaded successfully to ${bucketName}:`, urlData.publicUrl);
      return { blob: pngBlob, url: urlData.publicUrl };
    } catch (error: any) {
      const errorMessage = error?.message || 'Unknown error occurred';
      console.error('Error generating/uploading PNG:', {
        message: errorMessage,
        error: error,
        stack: error?.stack
      });
      
      // Provide more user-friendly error messages
      if (errorMessage.includes('not found') || errorMessage.includes('no longer in the DOM')) {
        throw new Error('Receipt preview is not available. Please close and reopen the receipt modal.');
      } else if (errorMessage.includes('invalid dimensions') || errorMessage.includes('zero size')) {
        throw new Error('Receipt preview is not visible. Please ensure the receipt is fully displayed on screen.');
      } else if (errorMessage.includes('Failed to capture')) {
        throw error; // Already user-friendly
      } else {
        throw new Error(`Failed to generate PNG: ${errorMessage}. Please try again or use PDF download instead.`);
      }
    } finally {
      setIsGeneratingPNG(false);
      // Clean up cloned element if it still exists
      try {
        if (clonedElement && clonedElement.parentNode) {
          clonedElement.parentNode.removeChild(clonedElement);
        }
        // Also clean up any orphaned cloned elements
        const orphanedClones = document.querySelectorAll('[data-receipt-preview-clone]');
        orphanedClones.forEach((el) => {
          if (el.parentNode) {
            el.parentNode.removeChild(el);
          }
        });
      } catch (cleanupError) {
        console.warn('Error cleaning up cloned element:', cleanupError);
      }
    }
  };

  // Helper function to generate PNG and upload to storage (for WhatsApp)
  const generateAndUploadPNG = async (): Promise<string | null> => {
    const result = await generatePNG(true);
    return result?.url || null;
  };

  const generateReceiptText = () => {
    const lines = [
      `🧾 *Receipt #${receiptData.receiptNumber}*`,
      '',
    ];

    // Simple greeting
    if (receiptData.customerName) {
      lines.push(`Hello ${receiptData.customerName}! 👋`);
    } else {
      lines.push('Hello! 👋');
    }
    lines.push('');

    // Business name
    lines.push(`*${businessInfo.name}*`);
    lines.push('');

    // Summary of items
    if (receiptData.items && receiptData.items.length > 0) {
      const totalItems = receiptData.items.reduce((sum, item) => sum + item.quantity, 0);
      lines.push(`📦 *${totalItems} item${totalItems > 1 ? 's' : ''}* purchased`);
      
      // Show first few items (max 3)
      const itemsToShow = receiptData.items.slice(0, 3);
      itemsToShow.forEach((item) => {
        const productName = item.variantName && item.variantName !== 'Default' 
          ? `${item.productName} - ${item.variantName}`
          : item.productName;
        lines.push(`   • ${productName}${item.quantity > 1 ? ` (x${item.quantity})` : ''}`);
      });
      
      if (receiptData.items.length > 3) {
        lines.push(`   ... and ${receiptData.items.length - 3} more item${receiptData.items.length - 3 > 1 ? 's' : ''}`);
      }
    }

    lines.push('');
    lines.push(`💰 *Total: ${receiptData.amount.toLocaleString()} TZS*`);
    lines.push('');

    // Encourage opening PDF
    lines.push('📄 *View the attached PDF receipt for:*');
    lines.push('   • Complete item details');
    lines.push('   • Serial numbers & specifications');
    lines.push('   • Payment information');
    lines.push('   • Business contact details');
    lines.push('');

    lines.push('✨ Thank you for your purchase!');

    return lines.join('\n');
  };

  const generateReceiptHTML = () => {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Receipt #${receiptData.receiptNumber}</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 400px; margin: 20px auto; padding: 20px; }
    .business-header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 15px; }
    .business-logo { max-height: 60px; margin-bottom: 10px; }
    .business-name { font-size: 1.5em; font-weight: bold; color: #333; margin: 10px 0; }
    .business-info { font-size: 0.9em; color: #666; }
    h1 { text-align: center; color: #333; }
    .receipt-info { margin: 20px 0; }
    .items { margin: 20px 0; border-top: 2px dashed #ccc; border-bottom: 2px dashed #ccc; padding: 10px 0; }
    .item { margin: 5px 0; }
    .total { font-size: 1.2em; font-weight: bold; text-align: right; margin-top: 10px; }
  </style>
</head>
<body>
  <div class="business-header">
    ${businessInfo.logo ? `<img src="${businessInfo.logo}" alt="${businessInfo.name}" class="business-logo" />` : ''}
    <div class="business-name">${businessInfo.name}</div>
    ${businessInfo.address ? `<div class="business-info">${businessInfo.address}</div>` : ''}
    ${businessInfo.phone ? businessInfo.phone.split(',').map((p: string) => `<div class="business-info">${p.trim()}</div>`).join('') : ''}
  </div>
  ${receiptData.customerName ? `<div style="text-align: center; margin: 15px 0; font-size: 1.1em; color: #333;">Hello, ${receiptData.customerName}!</div>` : '<div style="text-align: center; margin: 15px 0; font-size: 1.1em; color: #333;">Hello, valued customer!</div>'}
  <h1>RECEIPT</h1>
  <div class="receipt-info">
    <div>Receipt #: ${receiptData.receiptNumber}</div>
    <div>Date: ${new Date().toLocaleDateString()}</div>
    <div>Time: ${new Date().toLocaleTimeString()}</div>
    ${receiptData.customerName ? `<div>Customer: ${receiptData.customerName}</div>` : ''}
  </div>
  <div class="items">
    <h3>Items:</h3>
    ${receiptData.items?.map(item => {
      let productName = item.variantName && item.variantName !== 'Default' 
        ? `${item.productName} - ${item.variantName}`
        : item.productName;
      
      // Add spare part identification
      if (item.itemType === 'spare-part') {
        productName = `🔧 ${productName} [Spare Part]`;
        if (item.partNumber) {
          productName += ` (Part: ${item.partNumber})`;
        }
      }
      
      let itemHtml = `
      <div class="item">
        <div style="font-weight: bold;">${productName} (x${item.quantity}) - ${item.totalPrice.toLocaleString()} TZS</div>`;
      
      // Add part number for spare parts
      if (item.itemType === 'spare-part' && item.partNumber) {
        itemHtml += `<div style="font-size: 0.85em; color: #666; margin-top: 2px; font-family: monospace;">Part Number: ${item.partNumber}</div>`;
      }
      
      
      if (item.selectedSerialNumbers && item.selectedSerialNumbers.length > 0) {
        item.selectedSerialNumbers.forEach((serial: any) => {
          const serialInfo: string[] = [];
          if (serial.serial_number) serialInfo.push(`S/N: ${serial.serial_number}`);
          if (serial.imei) serialInfo.push(`IMEI: ${serial.imei}`);
          if (serial.mac_address) serialInfo.push(`MAC: ${serial.mac_address}`);
          if (serialInfo.length > 0) {
            itemHtml += `<div style="font-size: 0.85em; color: #666; margin-top: 2px; font-family: monospace;">${serialInfo.join(' | ')}</div>`;
          }
        });
      }
      
      if (item.attributes && Object.keys(item.attributes).length > 0) {
        const excludedFields = [
          'id', 'created_at', 'updated_at', 'added_at', 
          'variant_id', 'product_id', 'imei', 'serial_number',
          'is_legacy', 'is_imei_child', 'notes', 
          'parent_variant_name', 'data_source', 'created_without_po'
        ];
        Object.entries(item.attributes).forEach(([key, value]) => {
          if (!excludedFields.includes(key) && value) {
            const keyLabel = key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
            itemHtml += `<div style="font-size: 0.9em; color: #666; margin-top: 2px;">${keyLabel}: ${value}</div>`;
          }
        });
      }
      
      itemHtml += `</div>`;
      return itemHtml;
    }).join('') || ''}
  </div>
  <div class="total">TOTAL: ${receiptData.amount.toLocaleString()} TZS</div>
  <p style="text-align: center; margin-top: 20px; color: #666;">Thank you for your business!</p>
</body>
</html>
    `;
  };

  const shareOptions = [
    {
      name: 'WhatsApp',
      icon: MessageCircle,
      color: '#25D366',
      onClick: async () => {
        const phone = receiptData.customerPhone || '';
        
        if (!phone) {
          toast.error('No customer phone number available');
          return;
        }

        // Clean phone number (remove spaces, dashes, etc.)
        const cleanPhone = phone.replace(/[^0-9+]/g, '');
        
        setIsSending(true);
        setSendingMethod('WhatsApp');
        
        try {
          console.log('📱 Generating PDF receipt...');
          
          // Generate PDF and upload to storage
          const pdfUrl = await generateAndUploadPDF();
          
          if (!pdfUrl) {
            toast.error('Failed to generate PDF receipt');
            setIsSending(false);
            setSendingMethod('');
            return;
          }
          
          console.log('📤 Sending receipt PDF via WhatsApp API to:', cleanPhone);
          
          // Generate receipt text for caption
          const text = generateReceiptText();
          const caption = `🧾 Receipt #${receiptData.receiptNumber}\n\n${text}`;
          
          // Send PDF as document via WhatsApp API
          // Note: For documents, the caption is passed as the message parameter
          const result = await whatsappService.sendMessage(cleanPhone, caption, {
            message_type: 'document',
            media_url: pdfUrl,
            caption: caption
          });
          
          if (result.success) {
            // Show success modal
            successModal.show(
              `Receipt PDF sent successfully to ${phone} via WhatsApp!`,
              {
                title: 'WhatsApp Sent! ✅',
                icon: SuccessIcons.messageSent,
                autoCloseDelay: 3000,
              }
            );
            
            // Close share modal after short delay
            setTimeout(() => {
              onClose();
            }, 500);
          } else {
            toast.error(result.error || 'Failed to send WhatsApp message');
          }
        } catch (error) {
          console.error('Error sending WhatsApp:', error);
          toast.error('Failed to send WhatsApp. Please try again.');
        } finally {
          setIsSending(false);
          setSendingMethod('');
        }
      },
    },
    {
      name: 'SMS',
      icon: Send,
      color: '#0088cc',
      onClick: async () => {
        const text = generateReceiptText();
        const phone = receiptData.customerPhone;
        
        if (!phone) {
          toast.error('No customer phone number available');
          return;
        }

        // Clean phone number (remove spaces, dashes, etc.)
        const cleanPhone = phone.replace(/[^0-9+]/g, '');
        
        setIsSending(true);
        setSendingMethod('SMS');
        
        try {
          console.log('📱 Sending receipt via SMS to:', cleanPhone);
          
          // Use in-app SMS service
          // Use smart routing: WhatsApp first, SMS fallback
          const { smartNotificationService } = await import('../../services/smartNotificationService');
          const result = await smartNotificationService.sendNotification(cleanPhone, text);
          
          if (result.success) {
            const method = result.method === 'whatsapp' ? 'WhatsApp' : 'SMS';
            // Show success modal
            successModal.show(
              `Receipt sent successfully to ${phone} via ${method}!`,
              {
                title: `${method} Sent! ✅`,
                icon: SuccessIcons.messageSent,
                autoCloseDelay: 3000,
              }
            );
            
            // Close share modal after short delay
            setTimeout(() => {
              onClose();
            }, 500);
          } else {
            toast.error(result.error || `Failed to send message`);
          }
        } catch (error) {
          console.error('Error sending SMS:', error);
          toast.error('Failed to send SMS. Please try again.');
        } finally {
          setIsSending(false);
          setSendingMethod('');
        }
      },
    },
    {
      name: 'Email',
      icon: Mail,
      color: '#EA4335',
      onClick: () => {
        const subject = `Receipt #${receiptData.receiptNumber}`;
        const body = generateReceiptText();
        const email = receiptData.customerEmail || '';
        const mailtoUrl = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        window.location.href = mailtoUrl;
      },
    },
    {
      name: 'Print',
      icon: Printer,
      color: '#F59E0B',
      onClick: () => {
        handlePrint();
      },
    },
    {
      name: 'Download',
      icon: Download,
      color: '#8B5CF6',
      onClick: async () => {
        try {
          setIsSending(true);
          setSendingMethod('Download');
          
          // Use unified PDF generation function
          const result = await generatePDF(false);
          
          if (result && result.blob) {
            // Create download link
            const url = URL.createObjectURL(result.blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `receipt-${receiptData.receiptNumber}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            
            toast.success('Receipt downloaded as PDF');
          } else {
            toast.error('Failed to generate PDF');
          }
          
          setIsSending(false);
          setSendingMethod('');
        } catch (error) {
          console.error('Error generating PDF:', error);
          toast.error('Failed to generate PDF. Please try again.');
          setIsSending(false);
          setSendingMethod('');
        }
      },
    },
    {
      name: 'Download PNG',
      icon: ImageIcon,
      color: '#06B6D4',
      onClick: async () => {
        try {
          setIsSending(true);
          setSendingMethod('Download PNG');
          
          console.log('📸 Generating PNG image...');
          const result = await generatePNG(false);
          
          if (result && result.blob) {
            // Create download link
            const url = URL.createObjectURL(result.blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `receipt-${receiptData.receiptNumber}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            
            toast.success('Receipt downloaded as PNG');
          } else {
            toast.error('Failed to generate PNG');
          }
          
          setIsSending(false);
          setSendingMethod('');
        } catch (error: any) {
          console.error('Error generating PNG:', error);
          const errorMessage = error?.message || 'Unknown error';
          toast.error(errorMessage.length > 100 ? 'Failed to generate PNG. Please try again.' : errorMessage);
          setIsSending(false);
          setSendingMethod('');
        }
      },
    },
    {
      name: 'Share',
      icon: Share2,
      color: '#10B981',
      onClick: async () => {
        const text = generateReceiptText();
        if (navigator.share) {
          try {
            await navigator.share({
              title: `Receipt #${receiptData.receiptNumber}`,
              text: text,
            });
          } catch (error) {
            console.log('Share cancelled or failed:', error);
          }
        } else {
          alert('Share feature not supported in this browser. Please use WhatsApp, SMS, or Email buttons instead.');
        }
      },
    },
  ];

  return createPortal(
    <div>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
        .animate-slideUp {
          animation: slideUp 0.3s ease-out;
        }
      `}</style>
      <div
        className="fixed inset-0 z-[100001] flex items-center justify-center bg-black/40 animate-fadeIn"
        onClick={() => {
          if (!isGeneratingPNG && !isSending) {
            onClose();
          } else {
            toast.info('Please wait for the operation to complete before closing');
          }
        }}
      >
      <div
        className={`bg-white rounded-2xl w-full shadow-2xl overflow-hidden relative animate-slideUp max-h-[90vh] flex flex-col ${
          pageSize === 'a4' && orientation === 'landscape' ? 'max-w-6xl' : 'max-w-2xl'
        }`}
        onClick={(e) => e.stopPropagation()}
        style={{
          margin: 'auto', // Center the entire modal
        }}
      >
        {/* Close button */}
        <button
          onClick={() => {
          if (!isGeneratingPNG && !isSending) {
            onClose();
          } else {
            toast.info('Please wait for the operation to complete before closing');
          }
        }}
          className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors shadow-lg z-10"
        >
          <X className="w-5 h-5" strokeWidth={2} />
        </button>

        {/* Header Section */}
        <div className="p-6 text-center bg-gradient-to-br from-green-50 to-emerald-50 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900 mb-1">
            Receipt Preview
          </h2>
          <p className="text-sm text-gray-600 mb-2">
            Receipt #{receiptData.receiptNumber}
          </p>
          
          {/* Current Settings Indicator */}
          {pageSize === 'a4' && (
            <div className="mb-4">
              <span className="inline-flex items-center gap-2 px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">
                {orientation === 'portrait' ? '📄 Portrait Mode' : '📄 Landscape Mode'}
                <span className="text-green-600">•</span>
                <span>A4 Format</span>
              </span>
            </div>
          )}
          
          {/* Page Size and Orientation Selectors */}
          <div className="flex items-center justify-center gap-4 mt-2 flex-wrap">
            <div className="flex items-center gap-3">
              <label className="text-sm font-semibold text-gray-700">Page Size:</label>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(e.target.value as PageSize)}
                className="px-4 py-2 border border-gray-300 rounded-lg bg-white text-sm font-medium text-gray-700 hover:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors"
              >
                <option value="a4">A4 (210 × 297 mm)</option>
                <option value="letter">Letter (8.5 × 11 in)</option>
                <option value="a5">A5 (148 × 210 mm)</option>
                <option value="legal">Legal (8.5 × 14 in)</option>
              </select>
            </div>
            
            {/* Orientation Selector - Only show for A4 */}
            {pageSize === 'a4' && (
              <div className="flex items-center gap-3">
                <label className="text-sm font-semibold text-gray-700">Orientation:</label>
                <select
                  value={orientation}
                  onChange={(e) => {
                    const newOrientation = e.target.value as 'portrait' | 'landscape';
                    setOrientation(newOrientation);
                    console.log('Orientation changed to:', newOrientation);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg bg-white text-sm font-medium text-gray-700 hover:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors"
                >
                  <option value="portrait">Portrait (Vertical)</option>
                  <option value="landscape">Landscape (Horizontal)</option>
                </select>
                <span className="text-xs text-gray-500">
                  {orientation === 'portrait' ? '📄 Vertical' : '📄 Horizontal'}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Receipt Preview Section - Matching Existing UI Design */}
        <div className="flex-1 overflow-y-auto p-6 bg-gradient-to-br from-gray-100 via-gray-50 to-gray-100 flex items-center justify-center" style={{ minHeight: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div 
            ref={receiptPreviewRef}
            data-receipt-preview
            className={`bg-white rounded-3xl border-4 border-gray-300 shadow-2xl mx-auto my-auto p-8 transition-all duration-300 ${
              pageSize === 'a5' ? 'max-w-md' : 
              pageSize === 'legal' ? 'max-w-3xl' : 
              pageSize === 'a4' && orientation === 'landscape' ? 'w-full max-w-full' :
              'max-w-2xl'
            }`}
            style={{
              boxShadow: '0 20px 60px -15px rgba(0, 0, 0, 0.3), 0 10px 30px -10px rgba(0, 0, 0, 0.2)',
              margin: 'auto', // Center both horizontally and vertically
              alignSelf: 'center', // Additional vertical centering
            }}
            style={{
              ...(pageSize === 'a4' && orientation === 'landscape' 
                ? {
                    aspectRatio: '297/210',
                    minHeight: 'auto'
                  }
                : pageSize === 'a4' && orientation === 'portrait'
                ? {
                    aspectRatio: '210/297'
                  }
                : {}),
              backgroundColor: '#ffffff',
            }}
          >
            {/* Receipt Number - Prominently Displayed */}
            <div className={`mb-4 pb-3 border-b-2 border-gray-300 ${pageSize === 'a4' && orientation === 'landscape' ? 'mb-3 pb-2' : ''}`}>
              <div className="flex items-center justify-between">
                <div>
                  <span className={`text-gray-500 font-medium ${pageSize === 'a4' && orientation === 'landscape' ? 'text-xs' : 'text-sm'}`}>Receipt Number:</span>
                  <h1 className={`font-extrabold text-gray-900 ${pageSize === 'a4' && orientation === 'landscape' ? 'text-xl' : 'text-2xl'}`}>
                    #{receiptData.receiptNumber}
                  </h1>
                </div>
                <div className="text-right">
                  <span className={`text-gray-500 font-medium ${pageSize === 'a4' && orientation === 'landscape' ? 'text-xs' : 'text-sm'}`}>
                    {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                  <div className={`text-gray-600 ${pageSize === 'a4' && orientation === 'landscape' ? 'text-xs' : 'text-sm'}`}>
                    {new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </div>
                </div>
              </div>
            </div>

            {/* Logo and Business Info Section - Logo on Left */}
            <div className={`flex items-start gap-4 ${pageSize === 'a4' && orientation === 'landscape' ? 'mb-4' : 'mb-6'}`}>
              {/* Logo - Left Side, No Container */}
              {businessInfo.logo ? (
                <img 
                  src={convertedImages.get(businessInfo.logo) || businessInfo.logo}
                  data-original-src={businessInfo.logo}
                  crossOrigin="anonymous"
                  referrerPolicy="no-referrer-when-downgrade"
                  alt={businessInfo.name}
                  className={`object-contain flex-shrink-0 ${pageSize === 'a4' && orientation === 'landscape' ? 'h-32' : 'h-36'}`}
                  loading="eager"
                  onLoad={() => {
                    if (process.env.NODE_ENV === 'development') {
                      console.log('✅ Logo loaded successfully in receipt preview');
                    }
                  }}
                  onError={(e) => {
                    console.error('❌ Logo failed to load:', businessInfo.logo?.substring(0, 50));
                    // Hide logo and show text fallback
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ) : (
                <div className={`font-bold text-gray-900 uppercase tracking-wide flex-shrink-0 ${pageSize === 'a4' && orientation === 'landscape' ? 'text-5xl' : 'text-6xl'}`}>
                  {businessInfo.name}
                </div>
              )}

              {/* Business Information Section - No Container */}
              <div className="flex-1">
                {(() => {
                  // Use sale ID if available, otherwise use receipt number as fallback for QR code
                  const qrData = (receiptData.id && receiptData.id.trim() !== '') 
                    ? receiptData.id 
                    : receiptData.receiptNumber;
                  const hasQrData = qrData && qrData.trim() !== '';
                  const hasCustomerInfo = receiptData.customerName || receiptData.customerPhone || receiptData.customerEmail || receiptData.customerCity || receiptData.customerTag || receiptData.id;
                  
                  // Determine grid columns: QR code + business info (customer info will be below)
                  // In both landscape and portrait, use grid layout to keep QR code on right
                  let gridCols = 'grid-cols-1';
                  if (hasQrData) {
                    gridCols = 'grid-cols-2';
                  }
                  
                  return (
                    <>
                      <div className={`grid gap-4 ${gridCols}`}>
                      {/* Business Information */}
                      <div>
                    {/* Business Name - Bold */}
                    <h2 className={`font-bold text-gray-900 uppercase mb-0 ${pageSize === 'a4' && orientation === 'landscape' ? 'text-2xl' : 'text-3xl'}`}>
                      {businessInfo.name}
                    </h2>
                    
                    <div className="space-y-2 mt-2">
                    {businessInfo.address && (
                      <div className="flex items-start gap-2">
                        <span className={`text-gray-500 mt-0.5 flex-shrink-0 ${pageSize === 'a4' && orientation === 'landscape' ? 'text-xs' : 'text-sm'}`}>📍</span>
                        <span className={`text-gray-700 ${pageSize === 'a4' && orientation === 'landscape' ? 'text-xs' : 'text-sm'}`}>{businessInfo.address}</span>
                      </div>
                    )}
                    {businessInfo.phone && (() => {
                      // Format phone numbers properly using utility
                      const phoneString = typeof businessInfo.phone === 'string' 
                        ? businessInfo.phone 
                        : JSON.stringify(businessInfo.phone);
                      const formattedPhones = formatContactForInvoice(phoneString);
                      
                      return formattedPhones ? (
                        <div className="flex items-center gap-2">
                          <span className={`text-gray-500 ${pageSize === 'a4' && orientation === 'landscape' ? 'text-xs' : 'text-sm'}`}>📞</span>
                          <span className={`text-gray-700 font-medium ${pageSize === 'a4' && orientation === 'landscape' ? 'text-xs' : 'text-sm'}`}>
                            {formattedPhones}
                          </span>
                        </div>
                      ) : null;
                    })()}
                    {businessInfo.email && (
                      <div className="flex items-center gap-2">
                        <span className={`text-gray-500 ${pageSize === 'a4' && orientation === 'landscape' ? 'text-xs' : 'text-sm'}`}>✉️</span>
                        <span className={`text-gray-700 ${pageSize === 'a4' && orientation === 'landscape' ? 'text-xs' : 'text-sm'}`}>{businessInfo.email}</span>
                      </div>
                    )}
                    {businessInfo.website && (
                      <div className="flex items-center gap-2">
                        <span className={`text-gray-500 ${pageSize === 'a4' && orientation === 'landscape' ? 'text-xs' : 'text-sm'}`}>🌐</span>
                        <span className={`text-gray-700 ${pageSize === 'a4' && orientation === 'landscape' ? 'text-xs' : 'text-sm'}`}>{businessInfo.website}</span>
                      </div>
                    )}
                    </div>

                    {/* Social Media Handles */}
                    {(businessInfo.instagram || businessInfo.tiktok || businessInfo.whatsapp) && (
                      <div className="space-y-2 mt-2">
                        <div className={`font-semibold text-gray-600 mb-1 ${pageSize === 'a4' && orientation === 'landscape' ? 'text-xs' : 'text-sm'}`}>Follow Us</div>
                        <div className="flex flex-wrap gap-2">
                          {businessInfo.instagram && (
                            <div className="flex items-center gap-1.5 px-2 py-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg text-xs font-medium">
                              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                              </svg>
                              <span>@{businessInfo.instagram.replace('@', '').replace('https://instagram.com/', '').replace('https://www.instagram.com/', '')}</span>
                            </div>
                          )}
                          {businessInfo.tiktok && (
                            <div className="flex items-center gap-1.5 px-2 py-1 bg-gray-900 text-white rounded-lg text-xs font-medium">
                              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                              </svg>
                              <span>@{businessInfo.tiktok.replace('@', '').replace('https://tiktok.com/@', '').replace('https://www.tiktok.com/@', '')}</span>
                            </div>
                          )}
                          {businessInfo.whatsapp && (
                            <div className="flex items-center gap-1.5 px-2 py-1 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg text-xs font-medium">
                              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                              </svg>
                              <span>{businessInfo.whatsapp.replace(/[^0-9+]/g, '')}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* QR Code - Right Side of Business Info (Generated from Sale ID or Receipt Number) */}
                  {hasQrData && (
                    <div className="flex flex-col items-center justify-center">
                      <img 
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrData)}`}
                        alt="Sale Tracking QR Code"
                        className={`border-2 border-gray-300 rounded-lg bg-white p-2 ${
                          pageSize === 'a4' && orientation === 'landscape' ? 'w-24 h-24' : 'w-28 h-28'
                        }`}
                        onError={(e) => {
                          console.error('❌ QR code failed to load for:', qrData);
                          e.currentTarget.style.display = 'none';
                        }}
                        onLoad={() => {
                          if (process.env.NODE_ENV === 'development') {
                            console.log('✅ QR code loaded successfully for:', qrData);
                          }
                        }}
                      />
                    </div>
                  )}
                    </div>

                  {/* Customer Info - Below Business Information */}
                  {(receiptData.customerName || receiptData.customerPhone || receiptData.customerEmail || receiptData.customerCity || receiptData.customerTag || receiptData.id) && (
                    <div className={`border-t-2 border-dashed border-gray-300 ${pageSize === 'a4' && orientation === 'landscape' ? 'mt-4 pt-4' : 'mt-3 pt-3'}`}>
                      {/* Bill To Label */}
                      <div className={`mb-2 ${pageSize === 'a4' && orientation === 'landscape' ? 'mb-3' : ''}`}>
                        <span className={`font-bold text-gray-600 uppercase ${pageSize === 'a4' && orientation === 'landscape' ? 'text-sm' : 'text-xs'}`}>
                          Bill To:
                        </span>
                      </div>
                      {/* Customer Name - Minimal in Portrait */}
                      {receiptData.customerName && (
                        <h3 className={`font-semibold text-gray-700 uppercase mb-0 ${pageSize === 'a4' && orientation === 'landscape' ? 'text-2xl mb-2' : 'text-base mb-1'}`}>
                          {receiptData.customerName}
                        </h3>
                      )}
                      
                      <div className={`grid ${pageSize === 'a4' && orientation === 'landscape' ? 'grid-cols-2 gap-2 mt-2' : 'grid-cols-2 gap-x-3 gap-y-1 mt-1'}`}>
                        {receiptData.customerPhone && (
                          <div className={`flex items-center ${pageSize === 'a4' && orientation === 'landscape' ? 'gap-2 justify-start' : 'gap-1.5 justify-start'}`}>
                            <span className={`text-gray-500 ${pageSize === 'a4' && orientation === 'landscape' ? 'text-xs' : 'text-xs'}`}>📞</span>
                            <span className={`text-gray-700 font-medium ${pageSize === 'a4' && orientation === 'landscape' ? 'text-xs' : 'text-xs'}`}>{receiptData.customerPhone}</span>
                          </div>
                        )}
                        {receiptData.customerEmail && (
                          <div className={`flex items-center ${pageSize === 'a4' && orientation === 'landscape' ? 'gap-2 justify-start' : 'gap-1.5 justify-start'}`}>
                            <span className={`text-gray-500 ${pageSize === 'a4' && orientation === 'landscape' ? 'text-xs' : 'text-xs'}`}>✉️</span>
                            <span className={`text-gray-700 ${pageSize === 'a4' && orientation === 'landscape' ? 'text-xs' : 'text-xs'}`}>{receiptData.customerEmail}</span>
                          </div>
                        )}
                        {receiptData.customerCity && (
                          <div className={`flex items-center ${pageSize === 'a4' && orientation === 'landscape' ? 'gap-2 justify-start' : 'gap-1.5 justify-start'}`}>
                            <span className={`text-gray-500 ${pageSize === 'a4' && orientation === 'landscape' ? 'text-xs' : 'text-xs'}`}>📍</span>
                            <span className={`text-gray-700 ${pageSize === 'a4' && orientation === 'landscape' ? 'text-xs' : 'text-xs'}`}>{receiptData.customerCity}</span>
                          </div>
                        )}
                        {receiptData.customerTag && (
                          <div className={`flex items-center ${pageSize === 'a4' && orientation === 'landscape' ? 'gap-2 justify-end' : 'gap-1.5 justify-start'}`}>
                            <span className={`inline-flex items-center rounded text-xs font-medium ${
                              receiptData.customerTag.toLowerCase() === 'vip' 
                                ? 'bg-purple-100 text-purple-700' 
                                : receiptData.customerTag.toLowerCase() === 'new'
                                ? 'bg-blue-100 text-blue-700'
                                : receiptData.customerTag.toLowerCase() === 'complainer'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-gray-100 text-gray-700'
                            } ${pageSize === 'a4' && orientation === 'landscape' ? 'text-[10px] px-1.5 py-0.5' : 'text-[10px] px-1.5 py-0.5'}`}>
                              {receiptData.customerTag.toUpperCase()}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                    </>
                  );
                })()}
              </div>
            </div>

            {/* Dashed Separator */}
            <div className={`border-t border-dashed border-gray-300 ${pageSize === 'a4' && orientation === 'landscape' ? 'my-3' : 'my-6'}`}></div>

            {/* Items Section - Optimized for Landscape */}
            <div 
              className={`${pageSize === 'a4' && orientation === 'landscape' ? 'mb-2' : 'mb-4'} ${
                pageSize === 'a4' && orientation === 'landscape' 
                  ? receiptData.items && receiptData.items.length === 1
                    ? 'space-y-2' // Single item: full width
                    : 'grid grid-cols-2 gap-2' // Multiple items: 2 columns
                  : 'space-y-3' // Portrait: single column
              }`}
            >
              {receiptData.items && receiptData.items.length > 0 ? (
                receiptData.items.map((item, index) => {
                  const productName = item.variantName && item.variantName !== 'Default' 
                    ? `${item.productName} - ${item.variantName}`
                    : item.productName;
                  
                  const isSingleItem = receiptData.items && receiptData.items.length === 1;
                  const isLandscape = pageSize === 'a4' && orientation === 'landscape';
                  
                  return (
                    <div 
                      key={index} 
                      className="border-2 border-gray-200 rounded-2xl bg-white shadow-sm hover:border-gray-300 hover:shadow-md transition-all duration-300"
                    >
                      {/* Item Header - Compact for Landscape */}
                      <div className={`${isLandscape && !isSingleItem ? 'p-2' : 'p-3'}`}>
                        <div className={`flex items-start ${isLandscape && !isSingleItem ? 'flex-col gap-1 mb-1' : 'gap-2 mb-2'}`}>
                          {/* Product Image - Compact for Landscape */}
                          <div className="flex-shrink-0">
                            {item.image && !failedImages.has(item.image) ? (
                              <img 
                                src={convertedImages.get(item.image) || item.image} 
                                alt={productName}
                                data-original-src={item.image}
                                className={`object-cover rounded-lg ${
                                  isLandscape && !isSingleItem 
                                    ? 'w-full h-20' 
                                    : isLandscape && isSingleItem
                                    ? 'w-28 h-28'
                                    : 'w-32 h-32'
                                }`}
                                loading="eager"
                                crossOrigin="anonymous"
                                referrerPolicy="no-referrer-when-downgrade"
                                onLoad={() => {
                                  if (process.env.NODE_ENV === 'development') {
                                    console.log('✅ Product image loaded:', item.image?.substring(0, 50));
                                  }
                                }}
                                onError={(e) => {
                                  // Mark image as failed and update state to show placeholder
                                  if (item.image) {
                                    setFailedImages(prev => new Set(prev).add(item.image!));
                                  }
                                  // Hide the failed image
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                            ) : (
                              <div className={`bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center ${
                                isLandscape && !isSingleItem 
                                  ? 'w-full h-20' 
                                  : isLandscape && isSingleItem
                                  ? 'w-28 h-28'
                                  : 'w-32 h-32'
                              }`}>
                                <span className="text-lg text-gray-400 mb-1">📦</span>
                                <span className="text-xs text-gray-500 font-medium">No Image</span>
                              </div>
                            )}
          </div>
          
                          {/* Product Info - Compact for Landscape */}
                          <div className="flex-1">
                            <div className={`flex items-center ${isLandscape && !isSingleItem ? 'flex-col items-start gap-0.5 mb-0.5' : 'gap-2 mb-1'}`}>
                              <h4 className={`font-bold text-gray-900 ${
                                isLandscape && !isSingleItem ? 'text-xs' : 'text-lg'
                              }`}>{productName}</h4>
                              <span className={`inline-flex items-center gap-1 rounded-full font-bold bg-green-500 text-white shadow-sm ${
                                isLandscape && !isSingleItem ? 'px-1.5 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs'
                              }`}>
                                Qty: {item.quantity}
                              </span>
                            </div>
                            
                            {/* Unit Price - Compact */}
                            <div className={isLandscape && !isSingleItem ? 'mb-0.5' : 'mb-1'}>
                              <span className={`text-gray-600 ${isLandscape && !isSingleItem ? 'text-xs' : 'text-sm'}`}>Unit: </span>
                              <span className={`font-semibold text-gray-900 ${isLandscape && !isSingleItem ? 'text-xs' : 'text-sm'}`}>{formatMoney(item.unitPrice)}</span>
                            </div>
                            
                            {/* Specifications - Ultra Compact for Landscape */}
                            {item.attributes && Object.keys(item.attributes).length > 0 && (() => {
                              const specs: Array<{ key: string; label: string; value: string }> = [];
                              
                              Object.entries(item.attributes).forEach(([key, value]) => {
                                // Exclude internal/system fields
                                const excludedFields = [
                                  'id', 'created_at', 'updated_at', 'added_at', 
                                  'variant_id', 'product_id', 'imei', 'serial_number',
                                  'is_legacy', 'is_imei_child', 'notes', 
                                  'parent_variant_name', 'data_source', 'created_without_po'
                                ];
                                if (excludedFields.includes(key)) return;
                                if (!value || value === '' || value === null || value === undefined) return;
                                
                                if (key === 'specification') {
                                  try {
                                    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
                                    if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
                                      Object.entries(parsed).forEach(([specKey, specValue]) => {
                                        // Also exclude these fields from nested specification object
                                        if (excludedFields.includes(specKey)) return;
                                        if (!specValue || specValue === '' || specValue === null) return;
                                        const keyLabel = specKey.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
                                        specs.push({ key: `${key}-${specKey}`, label: keyLabel, value: String(specValue) });
                                      });
                                    }
                                  } catch {
                                    // Skip invalid specification
                                  }
                                } else {
                                  if (typeof value === 'object' && value !== null) return;
                                  const keyLabel = key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
                                  specs.push({ key, label: keyLabel, value: String(value) });
                                }
                              });
                              
                              if (specs.length === 0) return null;
                              
                              return (
                                <div className={`flex flex-wrap ${isLandscape && !isSingleItem ? 'gap-0.5 mt-0.5' : 'gap-1 mt-1'}`}>
                                  {specs.map((spec) => (
                                    <div 
                                      key={spec.key} 
                                      className={`inline-flex items-center bg-gray-50 rounded border border-gray-200 ${
                                        isLandscape && !isSingleItem 
                                          ? 'gap-0.5 px-1 py-0.5' 
                                          : 'gap-1.5 px-2 py-1'
                                      }`}
                                    >
                                      <span className={`font-semibold text-gray-600 ${
                                        isLandscape && !isSingleItem ? 'text-[9px]' : 'text-[10px]'
                                      }`}>{spec.label}:</span>
                                      <span className={`text-gray-900 font-medium ${
                                        isLandscape && !isSingleItem ? 'text-[9px]' : 'text-[10px]'
                                      }`}>{spec.value}</span>
                                    </div>
                                  ))}
                                </div>
                              );
                            })()}
                          </div>
                        </div>
                        
                        {/* Serial Numbers Section - Compact for Landscape */}
                        {item.selectedSerialNumbers && item.selectedSerialNumbers.length > 0 && (
                          <div className={`bg-gray-50 rounded-lg border border-gray-200 ${isLandscape && !isSingleItem ? 'p-1 mt-1' : 'p-2 mt-2'}`}>
                            {item.selectedSerialNumbers.map((serial: any, sIndex: number) => {
                              const serialInfo: string[] = [];
                              if (serial.serial_number) serialInfo.push(`S/N: ${serial.serial_number}`);
                              if (serial.imei) serialInfo.push(`IMEI: ${serial.imei}`);
                              if (serial.mac_address) serialInfo.push(`MAC: ${serial.mac_address}`);
                              return serialInfo.length > 0 ? (
                                <div key={sIndex} className={`text-gray-600 ${isLandscape && !isSingleItem ? 'text-xs mb-0.5' : 'text-sm mb-1'}`}>
                                  <span className="font-semibold text-gray-700">Serial: </span>
                                  <span className="font-mono">{serialInfo.join(' | ')}</span>
                                </div>
                              ) : null;
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-gray-500 text-center py-8">No items</p>
              )}
            </div>

            {/* Separator Above Summary */}
            <div className={`border-t border-dashed border-gray-300 ${pageSize === 'a4' && orientation === 'landscape' ? 'my-3' : 'my-6'}`}></div>

            {/* Summary Section - Below Items, Left Side */}
            <div className="w-full">
              <div className="w-full">
                <h3 className={`font-bold text-gray-900 mb-3 ${
                  pageSize === 'a4' && orientation === 'landscape' ? 'text-sm' : 'text-base'
                }`}>SUMMARY</h3>
                <div className={`space-y-2 ${pageSize === 'a4' && orientation === 'landscape' ? 'text-sm' : 'text-base'}`}>
                        {/* Receipt Information */}
                        {receiptData.sellerName && (
                          <div className="space-y-1">
                            <div className="text-gray-600 text-xs">
                              <p><span className="font-semibold">Seller:</span> {receiptData.sellerName}</p>
                            </div>
                          </div>
                        )}

                        {/* Separator */}
                        <div className="border-t border-gray-300 my-2"></div>

                        {/* Pricing Details */}
                        {receiptData.items && receiptData.items.length > 0 && (
                          <div className="flex justify-between items-center text-gray-700">
                            <span>Subtotal</span>
                            <span className="font-semibold">{formatMoney(receiptData.subtotal || receiptData.items.reduce((sum, item) => sum + item.totalPrice, 0))}</span>
                          </div>
                        )}
                        
                        {/* Tax Information */}
                        {receiptData.tax !== undefined && receiptData.tax > 0 && (
                          <div className="flex justify-between items-center text-gray-700">
                            <span>Tax (VAT)</span>
                            <span className="font-semibold">{formatMoney(receiptData.tax)}</span>
                          </div>
                        )}
                        
                        {/* Discount Information */}
                        {receiptData.discount !== undefined && receiptData.discount > 0 && (
                          <div className="flex justify-between items-center text-green-700">
                            <span>Discount</span>
                            <span className="font-semibold">-{formatMoney(receiptData.discount)}</span>
                          </div>
                        )}
                        
                        <div className="flex justify-between items-center text-gray-700">
                          <span>Delivery</span>
                          <span className="font-semibold">TSh 0</span>
                        </div>
                        
                        {/* Payment Method */}
                        {receiptData.paymentMethod && (
                          <>
                            <div className="border-t border-gray-300 my-2"></div>
                            <div className="flex justify-between items-center text-gray-700">
                              <span className="font-medium">Payment Method:</span>
                              <span className="font-semibold">
                                {typeof receiptData.paymentMethod === 'string' 
                                  ? receiptData.paymentMethod 
                                  : receiptData.paymentMethod.name || 'N/A'}
                              </span>
                            </div>
                          </>
                        )}
                        
                        {/* Separator Line */}
                        <div className="border-t-2 border-gray-400 my-3"></div>
                        
                        {/* Total Amount - Bold and Large */}
                        <div className="flex justify-between items-center bg-gray-50 -mx-2 px-2 py-2 rounded-lg">
                          <span className={`font-extrabold text-gray-900 ${pageSize === 'a4' && orientation === 'landscape' ? 'text-xl' : 'text-2xl'}`}>Total Amount</span>
                          <span className={`font-extrabold text-gray-900 ${pageSize === 'a4' && orientation === 'landscape' ? 'text-xl' : 'text-2xl'}`}>{formatMoney(receiptData.amount)}</span>
                        </div>
                </div>
              </div>
            </div>

            {/* Social Media Handles - Compact for Landscape */}
            {(businessInfo.instagram || businessInfo.tiktok || businessInfo.whatsapp) && (
              <div className={`bg-gray-50 rounded-xl border-2 border-gray-200 ${pageSize === 'a4' && orientation === 'landscape' ? 'p-3 mb-2' : 'p-6 mb-6'}`}>
                <h4 className={`font-bold text-gray-900 flex items-center gap-2 ${
                  pageSize === 'a4' && orientation === 'landscape' ? 'text-xs mb-2' : 'text-sm mb-4'
                }`}>
                  <div className="w-6 h-6 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center shadow-sm">
                    <Share2 className="w-3.5 h-3.5 text-white" />
                  </div>
                  Follow Us
                </h4>
                <div className="flex flex-wrap gap-3">
                  {businessInfo.instagram && (
                    <a
                      href={`https://instagram.com/${businessInfo.instagram.replace('@', '').replace('https://instagram.com/', '').replace('https://www.instagram.com/', '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl text-sm font-semibold hover:from-purple-600 hover:to-pink-600 transition-all shadow-sm hover:shadow-md"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                      </svg>
                      @{businessInfo.instagram.replace('@', '').replace('https://instagram.com/', '').replace('https://www.instagram.com/', '')}
                    </a>
                  )}
                  {businessInfo.tiktok && (
                    <a
                      href={`https://tiktok.com/@${businessInfo.tiktok.replace('@', '').replace('https://tiktok.com/@', '').replace('https://www.tiktok.com/@', '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`inline-flex items-center gap-2 bg-gray-900 text-white rounded-lg font-semibold hover:bg-gray-800 transition-all shadow-sm hover:shadow-md ${
                        pageSize === 'a4' && orientation === 'landscape' ? 'px-2 py-1 text-xs' : 'px-4 py-2.5 text-sm'
                      }`}
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                      </svg>
                      @{businessInfo.tiktok.replace('@', '').replace('https://tiktok.com/@', '').replace('https://www.tiktok.com/@', '')}
                    </a>
                  )}
                  {businessInfo.whatsapp && (
                    <a
                      href={`https://wa.me/${businessInfo.whatsapp.replace(/[^0-9]/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`inline-flex items-center gap-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg font-semibold hover:from-green-600 hover:to-green-700 transition-all shadow-sm hover:shadow-md ${
                        pageSize === 'a4' && orientation === 'landscape' ? 'px-2 py-1 text-xs' : 'px-4 py-2.5 text-sm'
                      }`}
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                      </svg>
                      {businessInfo.whatsapp.replace(/[^0-9+]/g, '')}
                    </a>
                  )}
                </div>
              </div>
            )}

          </div>
        </div>

        {/* Loading Overlay */}
        {isSending && (
          <div className="absolute inset-0 bg-white/95 rounded-2xl flex flex-col items-center justify-center z-10">
            <Loader2
              size={48}
              color="#0088cc"
              className="animate-spin"
            />
            <p className="mt-4 text-base font-semibold text-gray-700">
              Sending {sendingMethod}...
            </p>
            <p className="mt-2 text-sm text-gray-500">
              Please wait
            </p>
            <style>{`
              @keyframes spin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
              }
              .animate-spin {
                animation: spin 1s linear infinite;
              }
            `}</style>
          </div>
        )}

        {/* Action Buttons Section */}
        <div className="p-6 bg-white border-t border-gray-200">
          <h3 className="text-lg font-bold text-gray-900 mb-4 text-center">
            Share Options
          </h3>
          <div 
            className="grid grid-cols-3 gap-3"
            style={{
              opacity: isSending ? 0.5 : 1,
              pointerEvents: isSending ? 'none' : 'auto',
            }}
          >
            {shareOptions.map((option, index) => {
              const Icon = option.icon;
              const isSMSOption = option.name === 'SMS';
              const isWhatsAppOption = option.name === 'WhatsApp';
              
              return (
                <button
                  key={index}
                  onClick={() => {
                    if (isSMSOption || isWhatsAppOption) {
                      // SMS and WhatsApp are async, handled in onClick
                      option.onClick();
                    } else {
                      // Other options are sync
                      option.onClick();
                      setTimeout(() => onClose(), 500);
                    }
                  }}
                  disabled={isSending}
                  className="flex flex-col items-center justify-center p-5 border-2 border-gray-200 rounded-xl bg-white cursor-pointer transition-all hover:-translate-y-1 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
                  style={{
                    opacity: isSending ? 0.6 : 1,
                  }}
                  onMouseEnter={(e) => {
                    if (!isSending) {
                      e.currentTarget.style.borderColor = option.color;
                      e.currentTarget.style.background = `${option.color}08`;
                      e.currentTarget.style.boxShadow = `0 8px 16px ${option.color}20`;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSending) {
                      e.currentTarget.style.borderColor = '#e5e7eb';
                      e.currentTarget.style.background = '#fff';
                    }
                  }}
                >
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center mb-2"
                    style={{
                      background: `${option.color}15`,
                    }}
                  >
                    <Icon size={24} color={option.color} strokeWidth={2} />
                  </div>
                  <span className="text-sm font-semibold text-gray-700">
                    {option.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
      </div>
      <SuccessModal {...successModal.props} />
    </div>,
    document.body
  );
};

export default ShareReceiptModal;

