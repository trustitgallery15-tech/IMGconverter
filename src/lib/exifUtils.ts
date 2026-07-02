import piexif from "piexifjs";

export interface ExifMetadata {
  make: string;
  model: string;
  software: string;
  artist: string;
  copyright: string;
  dateTime: string;
  description: string;
  title: string;
  tags: string;
  gpsLat: number;
  gpsLng: number;
  gpsAlt: number;
  enableGps: boolean;
}

// Helper to convert a string to UCS-2 / UTF-16LE byte array for Microsoft tags
export function stringToUCS2Bytes(str: string): number[] {
  const bytes: number[] = [];
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    bytes.push(code & 0xff, (code >> 8) & 0xff);
  }
  // Null terminator
  bytes.push(0, 0);
  return bytes;
}

// Helper to convert UCS-2 / UTF-16LE byte array or binary string to standard string
export function ucs2BytesToString(bytes: any): string {
  if (!bytes) return "";
  let arr: number[] = [];
  if (Array.isArray(bytes)) {
    arr = bytes;
  } else if (typeof bytes === "string") {
    for (let i = 0; i < bytes.length; i++) {
      arr.push(bytes.charCodeAt(i));
    }
  } else {
    return "";
  }
  
  let str = "";
  for (let i = 0; i < arr.length - 1; i += 2) {
    const code = arr[i] | (arr[i + 1] << 8);
    if (code === 0) break; // null-terminated
    str += String.fromCharCode(code);
  }
  return str;
}

// Convert decimal degrees to Degrees, Minutes, Seconds (DMS)
export function decimalToDMS(val: number): { d: number; m: number; s: number } {
  const absVal = Math.abs(val);
  const d = Math.floor(absVal);
  const m = Math.floor((absVal - d) * 60);
  const s = Math.round((absVal - d - m / 60) * 3600 * 100) / 100;
  return { d, m, s };
}

// Parse DMS rational array to decimal float
export function parseDMS(ref: string, val: any[]): number {
  if (!val || val.length < 3) return 0;
  
  // Safe helper to evaluate fraction array [numerator, denominator]
  const parseFraction = (f: any) => {
    if (Array.isArray(f)) {
      return f[1] !== 0 ? f[0] / f[1] : f[0];
    }
    return Number(f) || 0;
  };

  const d = parseFraction(val[0]);
  const m = parseFraction(val[1]);
  const s = parseFraction(val[2]);

  let decimal = d + m / 60 + s / 3600;
  if (ref === "S" || ref === "W") {
    decimal = -decimal;
  }
  return Number(decimal.toFixed(6));
}

// Read EXIF tags from a data URL (JPEG/WebP)
export function loadExifFromDataUrl(dataUrl: string): ExifMetadata {
  const defaultMeta: ExifMetadata = {
    make: "",
    model: "",
    software: "",
    artist: "",
    copyright: "",
    dateTime: "",
    description: "",
    title: "",
    tags: "",
    gpsLat: 37.7749,
    gpsLng: -122.4194,
    gpsAlt: 0,
    enableGps: false,
  };

  // Only JPEG can contain standard EXIF parsed by piexifjs
  if (!dataUrl.startsWith("data:image/jpeg") && !dataUrl.startsWith("data:image/jpg")) {
    return defaultMeta;
  }

  try {
    const exifObj = piexif.load(dataUrl);
    
    const zeroth = exifObj["0th"] || {};
    const exif = exifObj["Exif"] || {};
    const gps = exifObj["GPS"] || {};

    const meta: ExifMetadata = { ...defaultMeta };

    meta.make = zeroth[piexif.ImageIFD.Make] || "";
    meta.model = zeroth[piexif.ImageIFD.Model] || "";
    meta.software = zeroth[piexif.ImageIFD.Software] || "";
    meta.artist = zeroth[piexif.ImageIFD.Artist] || "";
    meta.copyright = zeroth[piexif.ImageIFD.Copyright] || "";
    meta.dateTime = zeroth[piexif.ImageIFD.DateTime] || "";
    meta.description = zeroth[piexif.ImageIFD.ImageDescription] || "";
    meta.title = ucs2BytesToString(zeroth[40091]) || zeroth[piexif.ImageIFD.ImageDescription] || "";
    meta.tags = ucs2BytesToString(zeroth[40094]) || "";

    // Parse GPS tags if present
    if (gps[piexif.GPSIFD.GPSLatitude] && gps[piexif.GPSIFD.GPSLatitudeRef]) {
      meta.gpsLat = parseDMS(gps[piexif.GPSIFD.GPSLatitudeRef], gps[piexif.GPSIFD.GPSLatitude]);
      meta.enableGps = true;
    }
    if (gps[piexif.GPSIFD.GPSLongitude] && gps[piexif.GPSIFD.GPSLongitudeRef]) {
      meta.gpsLng = parseDMS(gps[piexif.GPSIFD.GPSLongitudeRef], gps[piexif.GPSIFD.GPSLongitude]);
      meta.enableGps = true;
    }
    if (gps[piexif.GPSIFD.GPSAltitude]) {
      const altVal = gps[piexif.GPSIFD.GPSAltitude];
      const altRef = gps[piexif.GPSIFD.GPSAltitudeRef] || 0;
      
      const parseFraction = (f: any) => {
        if (Array.isArray(f)) return f[1] !== 0 ? f[0] / f[1] : f[0];
        return Number(f) || 0;
      };

      let alt = parseFraction(altVal);
      if (altRef === 1) alt = -alt;
      meta.gpsAlt = Number(alt.toFixed(1));
    }

    return meta;
  } catch (err) {
    console.warn("Could not read EXIF or no EXIF present:", err);
    return defaultMeta;
  }
}

// Write EXIF tags into a JPEG data URL
export function saveExifToDataUrl(dataUrl: string, metadata: ExifMetadata): string {
  if (!dataUrl.startsWith("data:image/jpeg") && !dataUrl.startsWith("data:image/jpg")) {
    throw new Error("EXIF metadata injection is only fully supported for JPEG images in browser-side rendering.");
  }

  let exifObj: any = { "0th": {}, "Exif": {}, "GPS": {} };
  
  try {
    exifObj = piexif.load(dataUrl);
  } catch (err) {
    // If none exists, we write to a clean object
    exifObj = { "0th": {}, "Exif": {}, "GPS": {} };
  }

  // Assign 0th tags
  exifObj["0th"][piexif.ImageIFD.Make] = metadata.make || "";
  exifObj["0th"][piexif.ImageIFD.Model] = metadata.model || "";
  exifObj["0th"][piexif.ImageIFD.Software] = metadata.software || "Bulk Image Converter & GEO Tagger";
  exifObj["0th"][piexif.ImageIFD.Artist] = metadata.artist || "";
  exifObj["0th"][piexif.ImageIFD.Copyright] = metadata.copyright || "";
  exifObj["0th"][piexif.ImageIFD.ImageDescription] = metadata.description || "";
  
  if (metadata.title) {
    exifObj["0th"][40091] = stringToUCS2Bytes(metadata.title);
  } else {
    delete exifObj["0th"][40091];
  }
  
  if (metadata.tags) {
    exifObj["0th"][40094] = stringToUCS2Bytes(metadata.tags);
  } else {
    delete exifObj["0th"][40094];
  }
  
  if (metadata.dateTime) {
    exifObj["0th"][piexif.ImageIFD.DateTime] = metadata.dateTime;
    exifObj["Exif"][piexif.ExifIFD.DateTimeOriginal] = metadata.dateTime;
    exifObj["Exif"][piexif.ExifIFD.DateTimeDigitized] = metadata.dateTime;
  }

  // Handle GPS
  if (metadata.enableGps) {
    const latDMS = decimalToDMS(metadata.gpsLat);
    const lngDMS = decimalToDMS(metadata.gpsLng);

    const latRef = metadata.gpsLat >= 0 ? "N" : "S";
    const lngRef = metadata.gpsLng >= 0 ? "E" : "W";

    exifObj["GPS"][piexif.GPSIFD.GPSLatitudeRef] = latRef;
    exifObj["GPS"][piexif.GPSIFD.GPSLatitude] = [
      [latDMS.d, 1],
      [latDMS.m, 1],
      [Math.round(latDMS.s * 100), 100],
    ];

    exifObj["GPS"][piexif.GPSIFD.GPSLongitudeRef] = lngRef;
    exifObj["GPS"][piexif.GPSIFD.GPSLongitude] = [
      [lngDMS.d, 1],
      [lngDMS.m, 1],
      [Math.round(lngDMS.s * 100), 100],
    ];

    const altRef = metadata.gpsAlt >= 0 ? 0 : 1;
    exifObj["GPS"][piexif.GPSIFD.GPSAltitudeRef] = altRef;
    exifObj["GPS"][piexif.GPSIFD.GPSAltitude] = [
      [Math.round(Math.abs(metadata.gpsAlt) * 100), 100],
    ];
  } else {
    // Safely remove GPS fields
    delete exifObj["GPS"][piexif.GPSIFD.GPSLatitudeRef];
    delete exifObj["GPS"][piexif.GPSIFD.GPSLatitude];
    delete exifObj["GPS"][piexif.GPSIFD.GPSLongitudeRef];
    delete exifObj["GPS"][piexif.GPSIFD.GPSLongitude];
    delete exifObj["GPS"][piexif.GPSIFD.GPSAltitudeRef];
    delete exifObj["GPS"][piexif.GPSIFD.GPSAltitude];
  }

  try {
    const exifBytes = piexif.dump(exifObj);
    return piexif.insert(exifBytes, dataUrl);
  } catch (err) {
    console.error("Failed to dump or insert EXIF:", err);
    throw new Error("Unable to save EXIF. Please ensure fields are valid and format is correct.");
  }
}

// Convert an uploaded file or URL into a JPEG Data URL
export function convertToJpegDataUrl(file: File | string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Could not create 2D canvas context."));
        return;
      }
      // Draw white background for transparency flattening
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL("image/jpeg", 0.95));
    };
    img.onerror = () => reject(new Error("Failed to load image."));
    
    if (file instanceof File) {
      img.src = URL.createObjectURL(file);
    } else {
      img.src = file;
    }
  });
}
