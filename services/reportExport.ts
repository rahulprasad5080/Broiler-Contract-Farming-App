import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";

type ReportExportFormat = "pdf" | "excel";

type SaveAndShareReportOptions = {
  response: Response;
  fallbackFileName: string;
  format: ReportExportFormat;
  dialogTitle?: string;
};

type SaveAndShareReportResult = {
  uri: string;
  shared: boolean;
  fileName: string;
};

const MIME_BY_FORMAT: Record<ReportExportFormat, string> = {
  pdf: "application/pdf",
  excel: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[\\/:*?"<>|]+/g, "-").replace(/\s+/g, "-");
}

function getFileNameFromHeaders(response: Response) {
  const disposition = response.headers.get("content-disposition");
  if (!disposition) return null;

  const utfMatch = /filename\*=UTF-8''([^;]+)/i.exec(disposition);
  if (utfMatch?.[1]) {
    return decodeURIComponent(utfMatch[1].replace(/"/g, ""));
  }

  const match = /filename="?([^";]+)"?/i.exec(disposition);
  return match?.[1] ?? null;
}

function arrayBufferToBase64(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = "";

  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return globalThis.btoa(binary);
}

export async function saveAndShareReport({
  response,
  fallbackFileName,
  format,
  dialogTitle,
}: SaveAndShareReportOptions): Promise<SaveAndShareReportResult> {
  if (!response.ok) {
    throw new Error(`Report export failed (${response.status}).`);
  }

  const cacheDirectory = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
  if (!cacheDirectory) {
    throw new Error("File storage is not available on this device.");
  }

  const headerFileName = getFileNameFromHeaders(response);
  const fileName = sanitizeFileName(headerFileName || fallbackFileName);
  const uri = `${cacheDirectory}${fileName}`;
  const base64 = arrayBufferToBase64(await response.arrayBuffer());

  await FileSystem.writeAsStringAsync(uri, base64, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(uri, {
      mimeType: response.headers.get("content-type") || MIME_BY_FORMAT[format],
      dialogTitle: dialogTitle ?? "Share report",
    });
  }

  return {
    uri,
    shared: canShare,
    fileName,
  };
}
