-- Make the study-materials bucket public so avatars and resumes are accessible
UPDATE storage.buckets 
SET public = true 
WHERE id = 'study-materials';