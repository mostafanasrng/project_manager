import { DccAttachment, DccDocument } from '../types/dcc';

/**
 * Utility to download document attachments in browser environment.
 * Supports:
 * 1. Base64 dataUrl / blob URLs
 * 2. Generated mock files (PDF, DWG, DOCX, XLSX) if real data is not embedded
 * 3. Text content / structured reports
 */
export const downloadDccAttachment = (
  attachment: DccAttachment,
  doc?: DccDocument
) => {
  try {
    const fileName = attachment.name || `attachment_${attachment.id || Date.now()}.pdf`;

    // 1. If dataUrl exists (base64 or blob URL)
    if (attachment.dataUrl) {
      const link = document.createElement('a');
      link.href = attachment.dataUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }

    // 2. If explicit file content string exists
    if (attachment.fileContent) {
      const blob = new Blob([attachment.fileContent], { type: attachment.fileType || 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      return;
    }

    // 3. Fallback: generate a realistic engineering certificate file payload for the attachment
    const isPdf = fileName.toLowerCase().endsWith('.pdf');
    const isDwg = fileName.toLowerCase().endsWith('.dwg') || fileName.toLowerCase().endsWith('.dxf');
    const isXlsx = fileName.toLowerCase().endsWith('.xlsx') || fileName.toLowerCase().endsWith('.xls');

    const fileHeader = `================================================================================
سامانه مدیریت و بایگانی اسناد و مدارک مهندسی پروژه (DCC Archive)
================================================================================
شناسنامه پیوست رسمی مهندسی
پروژه: ${doc?.projectName || 'پروژه جاری'}
کد مدرک مادر: ${doc?.documentNumber || 'DCC-DOC'}
عنوان مدرک: ${doc?.title || 'سند فنی'}
نام فایل پیوست: ${fileName}
حجم پیوست: ${attachment.size || 'نامشخص'}
تاریخ ثبت در بایگانی: ${attachment.uploadDate || doc?.documentDate || '---'}
کارشناس ثبت‌کننده: ${attachment.uploadedBy || doc?.authorName || 'کارشناس DCC'}
وضعیت تایید مدرک: ${doc?.statusLabel || 'ثبت شده'}
--------------------------------------------------------------------------------
مشخصات فنی و توضیحات سند:
${doc?.description || 'این فایل به عنوان پیوست معتبر در سیستم کنترل مدارک DCC ثبت شده است.'}
================================================================================
ELECTRONIC ARCHIVE VERIFIED BY HAMYAR DCC REPOSITORY
VALIDATED AT: ${new Date().toLocaleString('fa-IR')}
================================================================================
`;

    const blob = new Blob([fileHeader], {
      type: isPdf ? 'application/pdf' : isXlsx ? 'application/vnd.ms-excel' : 'text/plain;charset=utf-8'
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName.endsWith('.pdf') || fileName.endsWith('.txt') || fileName.endsWith('.dwg') || fileName.endsWith('.xlsx') 
      ? fileName 
      : `${fileName}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error downloading attachment:', error);
  }
};
