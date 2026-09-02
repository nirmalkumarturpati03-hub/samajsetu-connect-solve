# Media Upload Feature Implementation

## Overview

The SamajSetu application now supports media evidence uploads when reporting community problems. Users can capture or upload images, videos, and audio files to strengthen their problem reports.

## Features

### 1. **Camera Capture**

- **Photo Capture**: Capture photos directly from the device's camera using the built-in camera interface
- **Video Recording**: Record video evidence from the device camera
- **Audio Recording**: Record audio testimonies or documentation

### 2. **File Upload**

- Upload existing image files (JPEG, PNG, WebP)
- Upload video files (MP4)
- Upload audio files (WebM, MPEG)

### 3. **Media Preview**

- Visual preview of attached images
- Video and audio indicators for non-image media
- File names and upload status displayed

### 4. **Upload Progress**

- Real-time upload progress indicators
- Upload status tracking for each media file
- Error handling and user feedback

## Technical Implementation

### New Files Created

- `src/components/MediaUpload.tsx` - Main media upload component with camera and file upload functionality

### Modified Files

- `src/routes/index.tsx` - Updated Report component to include media upload workflow

### Database Integration

The implementation uses the existing `evidence` table in Supabase:

```sql
CREATE TABLE public.evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  mime_type text NOT NULL CHECK (mime_type IN ('image/jpeg','image/png','image/webp','video/mp4','audio/webm','audio/mpeg','application/pdf')),
  size_bytes integer NOT NULL CHECK (size_bytes > 0 AND size_bytes <= 26214400),
  created_at timestamptz NOT NULL DEFAULT now()
);
```

### Storage Configuration

The media files are stored in Supabase Storage under the `evidence` bucket with the following structure:

```
evidence/
├── {reportId}/
│   ├── {timestamp}-{randomId}.jpg
│   ├── {timestamp}-{randomId}.mp4
│   └── {timestamp}-{randomId}.webm
```

## User Workflow

1. **Submit Report**: User fills in the problem description and location details
2. **Media Upload Screen**: After initial submission, user is taken to a media upload screen
3. **Add Evidence**: User can:
   - Capture photo from camera
   - Record video from camera
   - Record audio from device mic
   - Upload existing files from device
4. **Preview and Upload**: User can see a preview of all attached media and upload them
5. **Submit Report**: User confirms and submits the report with all evidence

## Supported Media Formats

### Images

- JPEG (image/jpeg)
- PNG (image/png)
- WebP (image/webp)

### Videos

- MP4 (video/mp4)

### Audio

- WebM (audio/webm)
- MPEG (audio/mpeg)

### Maximum File Size

- 25MB per file (26,214,400 bytes)

## API References

### MediaUpload Component Props

```typescript
interface MediaUploadProps {
  reportId?: string; // ID of the report to attach media to
  onMediaAdded?: (path: string, mimeType: string) => void; // Callback when media is uploaded
  onError?: (error: string) => void; // Error handling callback
}
```

## Required Setup

### Supabase Storage Bucket

Create a storage bucket named `evidence` with the following settings:

- **Bucket name**: evidence
- **Visibility**: Private
- **File size limit**: 25MB

### Row Level Security (RLS) Policies

Ensure the following policies are set for the storage bucket:

```sql
-- Allow users to upload evidence for their own reports
CREATE POLICY "authenticated evidence upload"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'evidence' AND
  EXISTS (
    SELECT 1 FROM public.reports r
    WHERE r.id = (storage.foldername(name))[1]::uuid
    AND r.reporter_id = auth.uid()
  )
);

-- Allow users to view evidence from their own reports
CREATE POLICY "evidence owner read"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'evidence' AND
  EXISTS (
    SELECT 1 FROM public.reports r
    WHERE r.id = (storage.foldername(name))[1]::uuid
    AND r.reporter_id = auth.uid()
  )
);

-- Allow admins to access all evidence
CREATE POLICY "admin evidence access"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'evidence' AND
  (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'government', 'university_admin')
);
```

## Browser Compatibility

### Camera/MediaRecorder Support

- Chrome/Edge 49+
- Firefox 25+
- Safari 14.1+
- Mobile browsers (Chrome, Firefox, Safari iOS)

## Error Handling

The component handles the following errors:

- Camera/microphone access denied
- File too large (>25MB)
- Network upload failures
- Invalid file types
- Storage quota exceeded

## Future Enhancements

Potential improvements for future versions:

1. Image compression before upload
2. Video quality selection
3. Image cropping/editing tools
4. Audio waveform visualization
5. Media gallery view in report details
6. Bulk media download for admin review
7. Media annotation tools
8. OCR for document scanning
9. Real-time streaming for live incident reporting
10. Integration with third-party cloud storage services

## Testing Checklist

- [ ] Test photo capture on multiple device types
- [ ] Test video recording on mobile and desktop
- [ ] Test audio recording functionality
- [ ] Test file upload with various file types
- [ ] Verify file size limit enforcement
- [ ] Test upload progress tracking
- [ ] Verify error messages display correctly
- [ ] Test on different browsers
- [ ] Test offline behavior
- [ ] Verify evidence records created in database
- [ ] Test storage path structure
- [ ] Verify RLS policies allow correct access
