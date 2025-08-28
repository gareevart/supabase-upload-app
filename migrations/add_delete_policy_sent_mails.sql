-- Add DELETE policy for sent_mails table
CREATE POLICY "Admin and editors can delete broadcasts"
  ON public.sent_mails
  FOR DELETE
  USING (
    auth.uid() IN (
      SELECT id FROM public.profiles
      WHERE role IN ('admin', 'editor')
    )
  );