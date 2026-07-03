import React, { useState, useEffect, useRef } from "react";
import { 
  Camera, 
  MapPin, 
  Download, 
  Save, 
  CheckCircle2, 
  AlertCircle, 
  FileEdit, 
  Info,
  Calendar,
  Compass,
  ArrowRight,
  Sparkles,
  Upload,
  RefreshCw,
  Map as MapIcon
} from "lucide-react";
import MapPicker from "./MapPicker";
import { 
  ExifMetadata, 
  loadExifFromDataUrl, 
  saveExifToDataUrl, 
  convertToJpegDataUrl 
} from "../lib/exifUtils";

interface QueuedFile {
  id: string;
  name: string;
  file: File;
  size: number;
  type: string;
  previewUrl: string;
  // We can attach customized base64 data to allow in-browser EXIF updates
  exifDataUrl?: string; 
  exifMetadata?: ExifMetadata;
}

interface ExifEditorProps {
  queuedFiles: QueuedFile[];
  onUpdateQueuedFile: (id: string, updatedExifDataUrl: string, metadata: ExifMetadata, customName?: string) => void;
  isAuthenticated: boolean;
  checkLimitAndIncrement: (count: number) => boolean;
}

export default function ExifEditor({ 
  queuedFiles, 
  onUpdateQueuedFile,
  isAuthenticated,
  checkLimitAndIncrement
}: ExifEditorProps) {
  const [selectedFileId, setSelectedFileId] = useState<string>("");
  const [currentImageSrc, setCurrentImageSrc] = useState<string>("");
  const [originalName, setOriginalName] = useState<string>("");
  const [customFileName, setCustomFileName] = useState("");
  
  // Exif state
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [software, setSoftware] = useState("");
  const [artist, setArtist] = useState("");
  const [copyright, setCopyright] = useState("");
  const [dateTime, setDateTime] = useState(""); // ISO datetime format for native input
  const [description, setDescription] = useState("");
  const [title, setTitle] = useState("");
  const [tags, setTags] = useState("");
  const [enableGps, setEnableGps] = useState(false);
  const [gpsLat, setGpsLat] = useState(37.7749);
  const [gpsLng, setGpsLng] = useState(-122.4194);
  const [gpsAlt, setGpsAlt] = useState(0);

  // UI state
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper formatting dates
  const isoToExifDate = (isoString: string): string => {
    if (!isoString) return "";
    const parts = isoString.split("T");
    if (parts.length < 2) return "";
    const date = parts[0].replace(/-/g, ":");
    let time = parts[1];
    if (time.length === 5) time += ":00";
    return `${date} ${time}`;
  };

  const exifToIsoDate = (exifString: string): string => {
    if (!exifString) return "";
    const parts = exifString.split(" ");
    if (parts.length < 2) return "";
    const date = parts[0].replace(/:/g, "-");
    const time = parts[1].substring(0, 5); // hh:mm
    return `${date}T${time}`;
  };

  // Handle file selection from state/dropdown
  useEffect(() => {
    if (selectedFileId) {
      const selected = queuedFiles.find(f => f.id === selectedFileId);
      if (selected) {
        setOriginalName(selected.name);
        loadSelectedImage(selected);
      }
    } else if (queuedFiles.length > 0 && !selectedFileId) {
      // Auto select first file in queue if available
      setSelectedFileId(queuedFiles[0].id);
    }
  }, [selectedFileId, queuedFiles]);

  const loadSelectedImage = async (queuedFile: QueuedFile) => {
    setLoading(true);
    setStatusMsg(null);
    try {
      let jpegUrl = queuedFile.exifDataUrl;
      
      // If it doesn't have an exif data URL yet, convert it to JPEG Data URL
      if (!jpegUrl) {
        jpegUrl = await convertToJpegDataUrl(queuedFile.file);
      }

      setCurrentImageSrc(jpegUrl);
      
      // Extract metadata
      const meta = queuedFile.exifMetadata || loadExifFromDataUrl(jpegUrl);
      
      // Populate fields
      setMake(meta.make);
      setModel(meta.model);
      setSoftware(meta.software || "Bulk Image Converter & GEO Tagger");
      setArtist(meta.artist);
      setCopyright(meta.copyright);
      setDateTime(exifToIsoDate(meta.dateTime));
      setDescription(meta.description);
      setTitle(meta.title || "");
      setTags(meta.tags || "");
      setEnableGps(meta.enableGps);
      setGpsLat(meta.gpsLat);
      setGpsLng(meta.gpsLng);
      setGpsAlt(meta.gpsAlt);

      // Extract file name without extension
      const baseName = queuedFile.name.substring(0, queuedFile.name.lastIndexOf(".")) || queuedFile.name;
      setCustomFileName(baseName);

      setHasUnsavedChanges(false);
    } catch (err: any) {
      console.error(err);
      setStatusMsg({ type: "error", text: "Failed to load EXIF data: " + err.message });
    } finally {
      setLoading(false);
    }
  };

  // Handle direct file drag/drop upload specifically for EXIF editing
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      loadDirectFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      loadDirectFile(e.target.files[0]);
    }
  };

  const loadDirectFile = async (file: File) => {
    setLoading(true);
    setStatusMsg(null);
    try {
      setOriginalName(file.name);
      setSelectedFileId(""); // Not a queued file
      const jpegUrl = await convertToJpegDataUrl(file);
      setCurrentImageSrc(jpegUrl);

      const meta = loadExifFromDataUrl(jpegUrl);
      setMake(meta.make);
      setModel(meta.model);
      setSoftware(meta.software || "Bulk Image Converter & GEO Tagger");
      setArtist(meta.artist);
      setCopyright(meta.copyright);
      setDateTime(exifToIsoDate(meta.dateTime));
      setDescription(meta.description);
      setTitle(meta.title || "");
      setTags(meta.tags || "");
      setEnableGps(meta.enableGps);
      setGpsLat(meta.gpsLat);
      setGpsLng(meta.gpsLng);
      setGpsAlt(meta.gpsAlt);

      const baseName = file.name.substring(0, file.name.lastIndexOf(".")) || file.name;
      setCustomFileName(baseName);

      setHasUnsavedChanges(false);
    } catch (err: any) {
      console.error(err);
      setStatusMsg({ type: "error", text: "Could not load image file: " + err.message });
    } finally {
      setLoading(false);
    }
  };

  // Save changes onto the base64 Jpeg source
  const handleSaveExif = () => {
    if (!currentImageSrc) return;
    setStatusMsg(null);
    try {
      const meta: ExifMetadata = {
        make,
        model,
        software,
        artist,
        copyright,
        dateTime: isoToExifDate(dateTime),
        description,
        title,
        tags,
        gpsLat,
        gpsLng,
        gpsAlt,
        enableGps
      };

      const newJpegUrl = saveExifToDataUrl(currentImageSrc, meta);
      setCurrentImageSrc(newJpegUrl);
      setHasUnsavedChanges(false);
      setStatusMsg({ type: "success", text: "EXIF metadata written into image headers successfully!" });

      // If editing a queued file, update parent state
      if (selectedFileId) {
        onUpdateQueuedFile(selectedFileId, newJpegUrl, meta, customFileName);
      }
    } catch (err: any) {
      console.error(err);
      setStatusMsg({ type: "error", text: err.message });
    }
  };

  // Download the currently edited image
  const handleDownload = () => {
    if (!currentImageSrc) return;
    
    // Check usage limits for guests
    if (!checkLimitAndIncrement(1)) {
      return;
    }

    const baseName = originalName.substring(0, originalName.lastIndexOf(".")) || originalName;
    const downloadName = `${customFileName || baseName}.jpg`;

    const link = document.createElement("a");
    link.href = currentImageSrc;
    link.download = downloadName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Target Selector Bar */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center bg-[#1a1a1e] border border-[#202024] p-4 rounded-xl">
        <div className="md:col-span-6">
          <label className="block text-[11px] font-bold text-[#8a8a93] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <FileEdit className="w-3.5 h-3.5 text-[#00f0ff]" />
            Select Image to Edit EXIF
          </label>
          <select
            value={selectedFileId}
            onChange={(e) => setSelectedFileId(e.target.value)}
            className="w-full bg-[#1e1e24] border border-[#323238] rounded-md text-xs text-[#e1e1e6] py-2 px-3 focus:outline-none focus:ring-1 focus:ring-[#00f0ff]"
          >
            <option value="">-- Choose from Queued Images --</option>
            {queuedFiles.map(f => (
              <option key={f.id} value={f.id}>{f.name} ({f.exifMetadata ? "Metadata Edited" : "Original"})</option>
            ))}
          </select>
        </div>
        <div className="md:col-span-1 flex justify-center text-[#8a8a93] text-xs font-semibold">
          OR
        </div>
        <div className="md:col-span-5">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full flex items-center justify-center gap-2 bg-[#202024] hover:bg-[#2a2a30] border border-[#323238] text-xs text-white py-2 px-4 rounded-md transition-all cursor-pointer font-semibold"
          >
            <Upload className="w-4 h-4 text-[#00f0ff]" />
            Browse New Image File
          </button>
        </div>
      </div>

      {currentImageSrc ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Metadata Fields Form (Left Panel) */}
          <div className="lg:col-span-6 flex flex-col gap-4 bg-[#1a1a1e]/40 border border-[#202024] rounded-xl p-5 shadow-inner">
            <div className="flex items-center gap-2 border-b border-[#202024] pb-2 mb-2">
              <Camera className="w-4.5 h-4.5 text-[#00f0ff]" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-white">File Name & Metadata Core</h3>
            </div>

            {/* Renaming & Tagging Section */}
            <div className="bg-[#121214] border border-[#202024] p-4 rounded-xl flex flex-col gap-3.5 mb-2 shadow-inner">
              <div>
                <label className="block text-[10px] font-bold text-[#00f0ff] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#00f0ff]" />
                  Custom File Name (Rename Output)
                </label>
                <input
                  type="text"
                  value={customFileName}
                  onChange={(e) => { setCustomFileName(e.target.value); setHasUnsavedChanges(true); }}
                  placeholder="e.g. trust-it-gallery example"
                  className="w-full bg-[#1e1e24] border border-[#323238] rounded-md text-xs text-[#e1e1e6] py-2 px-3 focus:outline-none focus:ring-1 focus:ring-[#00f0ff] font-medium"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-semibold text-[#8a8a93] uppercase tracking-wide mb-1 flex items-center gap-1">
                    <FileEdit className="w-3 h-3 text-[#8a8a93]" />
                    Image Title (EXIF)
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => { setTitle(e.target.value); setHasUnsavedChanges(true); }}
                    placeholder="e.g. Gallery Masterpiece"
                    className="w-full bg-[#1e1e24] border border-[#323238] rounded-md text-xs text-[#e1e1e6] py-2 px-3 focus:outline-none focus:ring-1 focus:ring-[#00f0ff]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-[#8a8a93] uppercase tracking-wide mb-1 flex items-center gap-1">
                    <Info className="w-3 h-3 text-[#8a8a93]" />
                    Tags / Keywords (EXIF)
                  </label>
                  <input
                    type="text"
                    value={tags}
                    onChange={(e) => { setTags(e.target.value); setHasUnsavedChanges(true); }}
                    placeholder="e.g. art, exhibition, gallery"
                    className="w-full bg-[#1e1e24] border border-[#323238] rounded-md text-xs text-[#e1e1e6] py-2 px-3 focus:outline-none focus:ring-1 focus:ring-[#00f0ff]"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-semibold text-[#8a8a93] uppercase tracking-wide mb-1">Camera Maker</label>
                <input
                  type="text"
                  value={make}
                  onChange={(e) => { setMake(e.target.value); setHasUnsavedChanges(true); }}
                  placeholder="e.g. Apple, Canon, Sony"
                  className="w-full bg-[#1e1e24] border border-[#323238] rounded-md text-xs text-[#e1e1e6] py-2 px-3 focus:outline-none focus:ring-1 focus:ring-[#00f0ff]"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-[#8a8a93] uppercase tracking-wide mb-1">Camera Model</label>
                <input
                  type="text"
                  value={model}
                  onChange={(e) => { setModel(e.target.value); setHasUnsavedChanges(true); }}
                  placeholder="e.g. iPhone 15, EOS R5"
                  className="w-full bg-[#1e1e24] border border-[#323238] rounded-md text-xs text-[#e1e1e6] py-2 px-3 focus:outline-none focus:ring-1 focus:ring-[#00f0ff]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-semibold text-[#8a8a93] uppercase tracking-wide mb-1">Artist / Photographer</label>
                <input
                  type="text"
                  value={artist}
                  onChange={(e) => { setArtist(e.target.value); setHasUnsavedChanges(true); }}
                  placeholder="Photographer name"
                  className="w-full bg-[#1e1e24] border border-[#323238] rounded-md text-xs text-[#e1e1e6] py-2 px-3 focus:outline-none focus:ring-1 focus:ring-[#00f0ff]"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-[#8a8a93] uppercase tracking-wide mb-1">Copyright</label>
                <input
                  type="text"
                  value={copyright}
                  onChange={(e) => { setCopyright(e.target.value); setHasUnsavedChanges(true); }}
                  placeholder="Copyright notice"
                  className="w-full bg-[#1e1e24] border border-[#323238] rounded-md text-xs text-[#e1e1e6] py-2 px-3 focus:outline-none focus:ring-1 focus:ring-[#00f0ff]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-semibold text-[#8a8a93] uppercase tracking-wide mb-1">Capture Date & Time</label>
                <div className="relative">
                  <input
                    type="datetime-local"
                    value={dateTime}
                    onChange={(e) => { setDateTime(e.target.value); setHasUnsavedChanges(true); }}
                    className="w-full bg-[#1e1e24] border border-[#323238] rounded-md text-xs text-[#e1e1e6] py-2 px-3 focus:outline-none focus:ring-1 focus:ring-[#00f0ff] select-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-[#8a8a93] uppercase tracking-wide mb-1">Software Tag</label>
                <input
                  type="text"
                  value={software}
                  onChange={(e) => { setSoftware(e.target.value); setHasUnsavedChanges(true); }}
                  className="w-full bg-[#1e1e24] border border-[#323238] rounded-md text-xs text-[#e1e1e6] py-2 px-3 focus:outline-none focus:ring-1 focus:ring-[#00f0ff]"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-[#8a8a93] uppercase tracking-wide mb-1">Image Description / Caption</label>
              <textarea
                value={description}
                onChange={(e) => { setDescription(e.target.value); setHasUnsavedChanges(true); }}
                placeholder="Write description or ALT text tag..."
                rows={2}
                className="w-full bg-[#1e1e24] border border-[#323238] rounded-md text-xs text-[#e1e1e6] py-2 px-3 focus:outline-none focus:ring-1 focus:ring-[#00f0ff] resize-none"
              />
            </div>

            {/* Actions Bar inside Form */}
            <div className="flex flex-col gap-3 mt-4 border-t border-[#202024] pt-4">
              {statusMsg && (
                <div className={`flex items-start gap-2 p-2.5 rounded text-xs leading-normal ${
                  statusMsg.type === "success" 
                    ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400" 
                    : "bg-red-500/10 border border-red-500/20 text-red-400"
                }`}>
                  {statusMsg.type === "success" ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  )}
                  <span>{statusMsg.text}</span>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={handleSaveExif}
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-[#00f0ff] hover:bg-[#33f3ff] text-black font-bold text-xs py-2.5 px-4 rounded-md transition-all cursor-pointer shadow-md shadow-[#00f0ff]/10"
                >
                  {loading ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Save className="w-3.5 h-3.5" />
                  )}
                  Save EXIF to Image
                </button>
                <button
                  onClick={handleDownload}
                  disabled={hasUnsavedChanges}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-[#202024] disabled:bg-[#151518] disabled:border-[#1d1d20] hover:bg-[#2a2a30] text-white disabled:text-[#8a8a93] border border-[#323238] font-bold text-xs py-2.5 px-4 rounded-md transition-all cursor-pointer"
                  title={hasUnsavedChanges ? "Save EXIF changes first to download" : "Download EXIF injected image"}
                >
                  <Download className="w-3.5 h-3.5 text-[#00f0ff]" />
                  Download Image
                </button>
              </div>

              {hasUnsavedChanges && (
                <p className="text-[10px] text-[#fca311] italic text-center">
                  ⚠️ You have unsaved EXIF changes. Press 'Save EXIF to Image' to commit them before downloading.
                </p>
              )}
            </div>
          </div>

          {/* GEO-Tagging & Map Picker (Right Panel) */}
          <div className="lg:col-span-6 flex flex-col gap-4 bg-[#1a1a1e]/40 border border-[#202024] rounded-xl p-5 shadow-inner h-full">
            <div className="flex items-center justify-between border-b border-[#202024] pb-2 mb-2">
              <div className="flex items-center gap-2">
                <Compass className="w-4.5 h-4.5 text-[#00f0ff]" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-white">GEO Tagging / GPS Location</h3>
              </div>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={enableGps}
                  onChange={(e) => { setEnableGps(e.target.checked); setHasUnsavedChanges(true); }}
                  className="rounded text-[#00f0ff] focus:ring-[#00f0ff] bg-[#121214] border-[#323238] w-3.5 h-3.5 cursor-pointer"
                />
                <span className="text-[11px] font-semibold text-[#00f0ff]">Enable GPS</span>
              </label>
            </div>

            {enableGps ? (
              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-semibold text-[#8a8a93] uppercase tracking-wide mb-1">Latitude</label>
                    <input
                      type="number"
                      step="any"
                      min="-90"
                      max="90"
                      value={gpsLat}
                      onChange={(e) => { 
                        setGpsLat(parseFloat(e.target.value) || 0); 
                        setHasUnsavedChanges(true); 
                      }}
                      className="w-full bg-[#1e1e24] border border-[#323238] rounded-md text-xs text-[#e1e1e6] py-2 px-3 focus:outline-none focus:ring-1 focus:ring-[#00f0ff]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-[#8a8a93] uppercase tracking-wide mb-1">Longitude</label>
                    <input
                      type="number"
                      step="any"
                      min="-180"
                      max="180"
                      value={gpsLng}
                      onChange={(e) => { 
                        setGpsLng(parseFloat(e.target.value) || 0); 
                        setHasUnsavedChanges(true); 
                      }}
                      className="w-full bg-[#1e1e24] border border-[#323238] rounded-md text-xs text-[#e1e1e6] py-2 px-3 focus:outline-none focus:ring-1 focus:ring-[#00f0ff]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-[#8a8a93] uppercase tracking-wide mb-1">Altitude (m)</label>
                    <input
                      type="number"
                      step="any"
                      value={gpsAlt}
                      onChange={(e) => { 
                        setGpsAlt(parseFloat(e.target.value) || 0); 
                        setHasUnsavedChanges(true); 
                      }}
                      className="w-full bg-[#1e1e24] border border-[#323238] rounded-md text-xs text-[#e1e1e6] py-2 px-3 focus:outline-none focus:ring-1 focus:ring-[#00f0ff]"
                    />
                  </div>
                </div>

                {/* Map Component */}
                <div className="border border-[#202024] p-1.5 rounded-lg bg-[#121214]">
                  <MapPicker 
                    lat={gpsLat} 
                    lng={gpsLng} 
                    onChange={(newLat, newLng) => { 
                      setGpsLat(newLat); 
                      setGpsLng(newLng); 
                      setHasUnsavedChanges(true); 
                    }} 
                  />
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center gap-2.5 py-12 px-6 text-center border border-dashed border-[#323238] rounded-lg bg-[#121214]">
                <MapIcon className="w-10 h-10 text-[#8a8a93] opacity-30" />
                <div>
                  <p className="text-xs font-bold text-[#e1e1e6]">GPS Tagging is currently Disabled</p>
                  <p className="text-[11px] text-[#8a8a93] mt-1 max-w-xs leading-relaxed">
                    Check the 'Enable GPS' box at the top right to locate coordinates on the map and write geo-location EXIF headers.
                  </p>
                </div>
              </div>
            )}

            {/* Image Preview Thumbnail */}
            <div className="mt-auto border-t border-[#202024] pt-4 flex items-center gap-3">
              <img 
                src={currentImageSrc} 
                alt="preview" 
                className="w-14 h-14 object-cover rounded border border-[#323238] bg-[#121214]" 
              />
              <div>
                <p className="text-xs font-bold text-white truncate max-w-[200px]">{originalName}</p>
                <span className="text-[10px] text-[#00f0ff] font-mono bg-[#00f0ff]/10 px-2 py-0.5 rounded border border-[#00f0ff]/20 font-bold inline-block mt-1">
                  JPEG Render Host
                </span>
              </div>
            </div>
          </div>

        </div>
      ) : (
        /* Empty State */
        <div 
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-16 flex flex-col items-center justify-center text-center cursor-pointer transition-all min-h-[350px] ${
            dragActive 
              ? "border-[#00f0ff] bg-[#1c262e] text-[#00f0ff]" 
              : "border-[#323238] bg-[#1a1a1e]/50 hover:border-[#44444c] hover:bg-[#1f1f24]"
          }`}
        >
          <Camera className={`w-14 h-14 mb-4 transition-transform ${dragActive ? "scale-110 text-[#00f0ff]" : "text-[#8a8a93]"}`} />
          <h3 className="text-sm font-bold text-white tracking-wider uppercase mb-1">Load an Image to Edit EXIF</h3>
          <p className="text-xs text-[#8a8a93] max-w-xs mb-6">
            Choose an image from the converter queue above, or drag and drop / browse any image file right here to inspect, update, and download EXIF/GEO markers!
          </p>
          <button
            onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
            className="flex items-center gap-2 bg-[#00f0ff]/10 border border-[#00f0ff]/30 text-[#00f0ff] font-semibold text-xs py-2 px-5 rounded-md hover:bg-[#00f0ff]/20 transition-all cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            Browse Image File
          </button>
        </div>
      )}
    </div>
  );
}
