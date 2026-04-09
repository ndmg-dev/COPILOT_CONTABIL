-- ============================================================================
-- 009 — Office Logos Bucket Configuration
-- Creates a storage bucket for organizations to upload their logos.
-- ============================================================================

-- Create the office_logos storage bucket (if it doesn't exist)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('office_logos', 'office_logos', true)
ON CONFLICT (id) DO NOTHING;

-- Policies for public reading
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'office_logos' );

-- Policies for organizations to upload/update their own logos
CREATE POLICY "Authenticated Upload"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'office_logos' 
    AND auth.role() = 'authenticated'
);

CREATE POLICY "Authenticated Update"
ON storage.objects FOR UPDATE
USING (
    bucket_id = 'office_logos' 
    AND auth.role() = 'authenticated'
);

CREATE POLICY "Authenticated Delete"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'office_logos' 
    AND auth.role() = 'authenticated'
);
