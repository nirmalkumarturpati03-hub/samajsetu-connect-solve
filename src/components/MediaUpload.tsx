import { useState, useRef, useEffect } from "react";
import {
  Camera,
  Mic,
  Upload,
  X,
  Play,
  Volume2,
  Image as ImageIcon,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";

interface MediaFile {
  id: string;
  file: File;
  preview: string;
  type: "image" | "video" | "audio";
  uploadedPath?: string;
}

interface MediaUploadProps {
  reportId?: string;
  onMediaAdded?: (path: string, mimeType: string) => void;
  onError?: (error: string) => void;
}

export function MediaUpload({ reportId, onMediaAdded, onError }: MediaUploadProps) {
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingType, setRecordingType] = useState<"photo" | "video" | "audio" | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [previewMedia, setPreviewMedia] = useState<MediaFile | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  // Initialize camera stream
  useEffect(() => {
    if (!isCameraOpen) return;

    const initializeCamera = async () => {
      try {
        // Only request video for camera - audio will be separate if needed
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          streamRef.current = stream;
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unable to access camera";
        onError?.(message);
      }
    };

    initializeCamera();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [isCameraOpen, onError]);

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const context = canvasRef.current.getContext("2d");
    if (!context) return;

    canvasRef.current.width = videoRef.current.videoWidth;
    canvasRef.current.height = videoRef.current.videoHeight;
    // Mirror the image to match the camera preview
    context.translate(canvasRef.current.width, 0);
    context.scale(-1, 1);
    context.drawImage(videoRef.current, 0, 0);

    canvasRef.current.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], `photo-${Date.now()}.jpg`, { type: "image/jpeg" });
        const preview = canvasRef.current!.toDataURL();
        addMediaFile(file, preview, "image");
      },
      "image/jpeg",
      0.95,
    );
  };

  const startRecording = async (type: "video" | "audio") => {
    if (!streamRef.current && type === "video") {
      onError?.("Camera stream not available");
      return;
    }

    try {
      chunksRef.current = [];
      let mediaStream: MediaStream;

      if (type === "video" && streamRef.current) {
        mediaStream = streamRef.current;
      } else if (type === "audio") {
        mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } else {
        return;
      }

      const mimeType = type === "video" ? "video/mp4" : "audio/webm";

      // Find the best supported MIME type for the MediaRecorder
      let selectedMimeType = mimeType;
      if (type === "video") {
        // Try common video MIME types in order of preference
        const videoMimeTypes = [
          "video/mp4",
          "video/webm;codecs=vp9,opus",
          "video/webm;codecs=vp8,opus",
          "video/webm;codecs=h264,opus",
          "video/webm",
        ];
        selectedMimeType =
          videoMimeTypes.find((mime) => MediaRecorder.isTypeSupported(mime)) || mimeType;
      } else {
        // Try common audio MIME types
        const audioMimeTypes = ["audio/webm", "audio/webm;codecs=opus", "audio/mpeg", "audio/mp4"];
        selectedMimeType =
          audioMimeTypes.find((mime) => MediaRecorder.isTypeSupported(mime)) || mimeType;
      }

      const mediaRecorder = new MediaRecorder(mediaStream, {
        mimeType: selectedMimeType,
      });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: selectedMimeType,
        });
        const file = new File(
          [blob],
          `${type}-${Date.now()}.${type === "video" ? "mp4" : "webm"}`,
          { type: selectedMimeType },
        );

        let preview = "";
        if (type === "video" && videoRef.current) {
          preview = videoRef.current.currentTime.toString();
        }

        addMediaFile(file, preview, type);

        // Stop all tracks for audio recording
        if (type === "audio") {
          mediaStream.getTracks().forEach((track) => track.stop());
        }
      };

      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
      setRecordingType(type);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to start recording";
      onError?.(message);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setRecordingType(null);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach((file) => {
      const type = file.type.startsWith("image/")
        ? "image"
        : file.type.startsWith("video/")
          ? "video"
          : "audio";

      let preview = "";
      if (type === "image") {
        const reader = new FileReader();
        reader.onload = (event) => {
          preview = event.target?.result as string;
          addMediaFile(file, preview, type);
        };
        reader.readAsDataURL(file);
      } else {
        addMediaFile(file, preview, type);
      }
    });

    // Reset input
    e.target.value = "";
  };

  const addMediaFile = (file: File, preview: string, type: "image" | "video" | "audio") => {
    // Validate file size (25MB max)
    if (file.size > 26214400) {
      onError?.("File size exceeds 25MB limit");
      return;
    }

    const id = `media-${Date.now()}`;
    setMediaFiles((prev) => [...prev, { id, file, preview, type }]);
  };

  const removeMedia = (id: string) => {
    setMediaFiles((prev) => prev.filter((m) => m.id !== id));
  };

  const uploadAllMedia = async () => {
    if (mediaFiles.length === 0 || !reportId || !supabase) return;

    setUploading(true);
    let uploadedCount = 0;

    try {
      // Get current authenticated user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error("User not authenticated");
      }

      for (const media of mediaFiles) {
        if (media.uploadedPath) continue; // Already uploaded

        try {
          setUploadProgress((prev) => ({ ...prev, [media.id]: 0 }));

          const mimeType = media.file.type;
          const fileExtension =
            media.file.name.split(".").pop() ||
            (media.type === "image" ? "jpg" : media.type === "video" ? "mp4" : "webm");
          // Storage path must start with user ID per storage policy
          const storagePath = `${user.id}/${reportId}/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExtension}`;

          // Upload to Supabase Storage
          const { error: uploadError } = await supabase.storage
            .from("evidence")
            .upload(storagePath, media.file, {
              contentType: mimeType,
              cacheControl: "3600",
              upsert: false,
            });

          if (uploadError) throw uploadError;

          // Create evidence record
          const { error: dbError } = await supabase.from("evidence").insert({
            report_id: reportId,
            storage_path: storagePath,
            mime_type: mimeType,
            size_bytes: media.file.size,
          });

          if (dbError) throw dbError;

          setMediaFiles((prev) =>
            prev.map((m) => (m.id === media.id ? { ...m, uploadedPath: storagePath } : m)),
          );

          onMediaAdded?.(storagePath, mimeType);
          uploadedCount++;
          setUploadProgress((prev) => ({ ...prev, [media.id]: 100 }));
        } catch (err) {
          const message = err instanceof Error ? err.message : "Upload failed";
          onError?.(message);
        }
      }

      setUploading(false);

      if (uploadedCount > 0) {
        // Clear uploaded files
        setTimeout(() => {
          setMediaFiles((prev) => prev.filter((m) => !m.uploadedPath));
        }, 2000);
      }
    } catch (err) {
      setUploading(false);
      const message = err instanceof Error ? err.message : "Upload failed";
      onError?.(message);
    }
  };

  return (
    <div className="space-y-4">
      {/* Camera Section */}
      {!isCameraOpen ? (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => {
              setRecordingType("photo");
              setIsCameraOpen(true);
            }}
            className="flex items-center gap-2 rounded-lg border border-input px-3 py-2 text-sm font-medium hover:bg-surface"
          >
            <Camera size={16} /> Capture photo
          </button>
          <button
            onClick={() => {
              setRecordingType("video");
              setIsCameraOpen(true);
            }}
            className="flex items-center gap-2 rounded-lg border border-input px-3 py-2 text-sm font-medium hover:bg-surface"
          >
            <Camera size={16} /> Record video
          </button>
          <button
            onClick={() => {
              setRecordingType("audio");
              setIsCameraOpen(true);
            }}
            className="flex items-center gap-2 rounded-lg border border-input px-3 py-2 text-sm font-medium hover:bg-surface"
          >
            <Mic size={16} /> Record audio
          </button>
        </div>
      ) : (
        <div className="rounded-lg border border-input bg-surface p-4">
          {recordingType !== "audio" && (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full rounded-lg bg-black"
              style={{ transform: "scaleX(-1)" }}
            />
          )}

          <canvas ref={canvasRef} className="hidden" />

          <div className="mt-3 flex flex-wrap gap-2">
            {recordingType === "photo" && (
              <button
                onClick={capturePhoto}
                className="flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-bold text-primary-foreground"
              >
                <Camera size={16} /> Capture
              </button>
            )}

            {(recordingType === "video" || recordingType === "audio") && (
              <>
                {!isRecording ? (
                  <button
                    onClick={() => startRecording(recordingType)}
                    className="flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-bold text-primary-foreground"
                  >
                    {recordingType === "video" ? <Camera size={16} /> : <Mic size={16} />}
                    Start recording
                  </button>
                ) : (
                  <button
                    onClick={stopRecording}
                    className="flex items-center gap-2 rounded-lg bg-destructive px-3 py-2 text-sm font-bold text-primary-foreground"
                  >
                    Stop recording
                  </button>
                )}
              </>
            )}

            {/* Mode switcher buttons */}
            {recordingType !== "photo" && (
              <button
                onClick={() => setRecordingType("photo")}
                className="flex items-center gap-2 rounded-lg border border-input px-3 py-2 text-sm font-medium hover:bg-surface"
              >
                <Camera size={16} /> Capture photo
              </button>
            )}
            
            {recordingType !== "video" && (
              <button
                onClick={() => {
                  if (!isRecording) setRecordingType("video");
                }}
                className="flex items-center gap-2 rounded-lg border border-input px-3 py-2 text-sm font-medium hover:bg-surface disabled:opacity-50"
                disabled={isRecording}
              >
                <Camera size={16} /> Record video
              </button>
            )}
            
            {recordingType !== "audio" && (
              <button
                onClick={() => {
                  if (!isRecording) setRecordingType("audio");
                }}
                className="flex items-center gap-2 rounded-lg border border-input px-3 py-2 text-sm font-medium hover:bg-surface disabled:opacity-50"
                disabled={isRecording}
              >
                <Mic size={16} /> Record audio
              </button>
            )}

            <button
              onClick={() => {
                setIsCameraOpen(false);
                setRecordingType(null);
                setIsRecording(false);
              }}
              className="rounded-lg border border-input px-3 py-2 text-sm font-medium hover:bg-surface"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* File Upload */}
      <label className="flex items-center gap-2 rounded-lg border-2 border-dashed border-input px-4 py-3 cursor-pointer hover:border-primary hover:bg-primary-soft transition">
        <Upload size={18} className="text-primary" />
        <span className="text-sm font-medium">Upload files</span>
        <input
          type="file"
          multiple
          accept="image/*,video/*,audio/*"
          onChange={handleFileInput}
          className="hidden"
        />
      </label>

      {/* Media Preview */}
      {mediaFiles.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-bold">
            Attached media ({mediaFiles.filter((m) => !m.uploadedPath).length})
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {mediaFiles.map((media) => (
              <div
                key={media.id}
                className="relative rounded-lg border border-input bg-surface p-3 cursor-pointer hover:border-primary hover:shadow-md transition"
                onClick={() => setPreviewMedia(media)}
              >
                {media.type === "image" && media.preview && (
                  <img
                    src={media.preview}
                    alt="Preview"
                    className="w-full rounded h-32 object-cover"
                  />
                )}

                {media.type === "video" && (
                  <div className="relative h-32 w-full rounded bg-black flex items-center justify-center">
                    <Play size={32} className="text-white" />
                  </div>
                )}

                {media.type === "audio" && (
                  <div className="flex h-32 w-full items-center justify-center rounded bg-surface-dark">
                    <Volume2 size={32} className="text-primary" />
                  </div>
                )}

                <div className="absolute top-2 right-2 space-x-1 flex">
                  {media.uploadedPath ? (
                    <div className="flex items-center gap-1 rounded bg-emerald-500 px-2 py-1 text-xs font-bold text-white">
                      <CheckCircle2 size={12} /> Uploaded
                    </div>
                  ) : uploadProgress[media.id] ? (
                    <div className="rounded bg-primary px-2 py-1 text-xs font-bold text-primary-foreground">
                      {uploadProgress[media.id]}%
                    </div>
                  ) : null}
                  {!media.uploadedPath && (
                    <button
                      onClick={() => removeMedia(media.id)}
                      className="rounded bg-destructive p-1 text-white hover:bg-destructive/80"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                <p className="mt-2 truncate text-xs text-muted-foreground">{media.file.name}</p>
              </div>
            ))}
          </div>

          {mediaFiles.some((m) => !m.uploadedPath) && (
            <button
              onClick={uploadAllMedia}
              disabled={uploading || mediaFiles.every((m) => m.uploadedPath)}
              className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
            >
              {uploading ? "Uploading..." : "Upload media"}
            </button>
          )}
        </div>
      )}

      {/* Preview Modal */}
      {previewMedia && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
          onClick={() => setPreviewMedia(null)}
        >
          <div
            className="relative max-w-2xl max-h-[80vh] bg-black rounded-lg overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={() => setPreviewMedia(null)}
              className="absolute top-2 right-2 z-10 rounded-lg bg-destructive p-2 text-white hover:bg-destructive/80"
            >
              <X size={20} />
            </button>

            {/* Image Preview */}
            {previewMedia.type === "image" && previewMedia.preview && (
              <img
                src={previewMedia.preview}
                alt="Preview"
                className="w-full h-full object-contain"
              />
            )}

            {/* Video Preview */}
            {previewMedia.type === "video" && (
              <div className="w-full h-full flex items-center justify-center bg-black">
                <video
                  src={URL.createObjectURL(previewMedia.file)}
                  controls
                  autoPlay
                  className="max-w-full max-h-full"
                />
              </div>
            )}

            {/* Audio Preview */}
            {previewMedia.type === "audio" && (
              <div className="w-full px-8 py-16 flex flex-col items-center justify-center bg-black min-w-96">
                <Volume2 size={64} className="text-primary mb-6" />
                <p className="text-white text-center mb-6 max-w-xs truncate">
                  {previewMedia.file.name}
                </p>
                <audio
                  src={URL.createObjectURL(previewMedia.file)}
                  controls
                  autoPlay
                  className="w-full"
                />
              </div>
            )}

            {/* File Info */}
            <div className="bg-surface px-4 py-3 text-xs text-muted-foreground border-t border-input">
              <p>
                <strong>{previewMedia.file.name}</strong> (
                {(previewMedia.file.size / 1024).toFixed(2)} KB)
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Info */}
      <div className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
        <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
        <p>
          Maximum file size: 25MB per file. Supported formats: JPEG, PNG, WebP, MP4, WebM, MPEG
          audio.
        </p>
      </div>
    </div>
  );
}
