# GoFit Email Template Setup Instructions

## How to Add Your Logo to the Email Template

1. **Host your logo image:**
   - Upload your `logo.png` to a publicly accessible URL (e.g., Supabase Storage, Cloudinary, AWS S3, or your own server)
   - Make sure the URL is accessible without authentication

2. **Update the template:**
   - In the email template, find: `https://your-domain.com/logo.png`
   - Replace it with your actual hosted logo URL
   - Example: `https://your-project.supabase.co/storage/v1/object/public/logos/logo.png`

3. **Recommended logo specifications:**
   - Format: PNG with transparent background (or white background)
   - Size: 200-300px width (height will scale automatically)
   - File size: Keep under 100KB for faster email loading

## Alternative: Using Supabase Storage

If you want to use Supabase Storage for your logo:

1. Go to Supabase Dashboard → Storage
2. Create a bucket called `public` (if it doesn't exist)
3. Upload your `logo.png` to the bucket
4. Make the file public
5. Copy the public URL (format: `https://[project-ref].supabase.co/storage/v1/object/public/[bucket]/logo.png`)
6. Replace `YOUR_LOGO_URL` in the template with this URL

## Testing

After updating the template:
1. Request a password reset
2. Check your email
3. Verify the logo displays correctly
4. If the logo doesn't show, check:
   - The URL is publicly accessible
   - The image format is supported (PNG, JPG, GIF)
   - Email client allows images (some clients block images by default)



