/**
 * Script: upload_exercise_videos.cjs
 * 
 * Purpose:
 * Recursively scans the local 'Storage' directory for exercise videos (.mp4, .webm, .mov),
 * matches them against existing exercises in Supabase, uploads matching videos to Cloudflare R2,
 * and updates each exercise's 'video_url' in Supabase.
 * 
 * Usage:
 *   node scripts/upload_exercise_videos.cjs            # Performs upload and updates DB
 *   node scripts/upload_exercise_videos.cjs --dry-run  # Previews matches without uploading
 *   node scripts/upload_exercise_videos.cjs --force    # Overwrites exercises that already have video_url
 */

const fs = require('fs');
const path = require('path');

// Resolve packages from admin-panel/node_modules if needed
function resolvePkg(name) {
  try {
    return require(name);
  } catch (e) {
    const adminPath = path.join(__dirname, '..', 'admin-panel', 'node_modules', name);
    return require(adminPath);
  }
}

const { createClient } = resolvePkg('@supabase/supabase-js');
const { S3Client, PutObjectCommand } = resolvePkg('@aws-sdk/client-s3');

// Load environment from admin-panel/.env.local
const envPath = path.join(__dirname, '..', 'admin-panel', '.env.local');
if (!fs.existsSync(envPath)) {
  console.error('Error: admin-panel/.env.local not found at:', envPath);
  process.exit(1);
}

const envText = fs.readFileSync(envPath, 'utf-8');
const env = {};
envText.split('\n').forEach(line => {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('#')) {
    const [k, ...v] = trimmed.split('=');
    env[k.trim()] = v.join('=').trim();
  }
});

const isDryRun = process.argv.includes('--dry-run');
const isForce = process.argv.includes('--force');

// Validate credentials
if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Error: Missing Supabase credentials in admin-panel/.env.local');
  process.exit(1);
}
if (!env.R2_ACCOUNT_ID || !env.R2_ACCESS_KEY_ID || !env.R2_SECRET_ACCESS_KEY || !env.R2_BUCKET_NAME || !env.R2_PUBLIC_URL) {
  console.error('Error: Missing R2 storage credentials in admin-panel/.env.local');
  process.exit(1);
}

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const s3Client = new S3Client({
  region: 'auto',
  endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
  },
});

// Helper: Normalize string for comparison
function clean(str) {
  return str.toLowerCase().replace(/[^a-z0-9]/g, '');
}

// Helper: Recursively find all videos in a directory
function findVideos(dir) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      results = results.concat(findVideos(fullPath));
    } else {
      const ext = path.extname(file).toLowerCase();
      if (['.mp4', '.webm', '.mov'].includes(ext)) {
        const baseName = path.basename(file, ext);
        results.push({
          fullPath,
          fileName: file,
          baseName,
          ext: ext.slice(1),
          size: stat.size,
          isFemale: /_female/i.test(baseName),
          cleanName: clean(baseName.replace(/_female|_male/gi, '')),
        });
      }
    }
  }
  return results;
}

// MIME types
const MIME_TYPES = {
  mp4: 'video/mp4',
  webm: 'video/webm',
  mov: 'video/quicktime',
};

async function main() {
  console.log('=== GoFit Exercise Video Uploader ===');
  console.log('Mode:', isDryRun ? 'DRY RUN (preview only)' : 'LIVE (upload & update)');
  if (isForce) console.log('Force overwrite: YES');
  console.log('');

  // 1. Fetch exercises from Supabase
  console.log('Fetching exercises from Supabase...');
  const { data: exercises, error: dbError } = await supabase
    .from('exercises')
    .select('id, name, video_url')
    .order('name');

  if (dbError) {
    console.error('Failed to fetch exercises from database:', dbError);
    process.exit(1);
  }

  console.log(`Found ${exercises.length} exercises in Supabase.`);

  // 2. Scan Storage folder
  const storageDir = path.join(__dirname, '..', 'Storage');
  console.log(`Scanning videos in: ${storageDir}...`);
  const videos = findVideos(storageDir);
  console.log(`Found ${videos.length} video files in Storage.`);
  console.log('');

  // 3. Match videos to exercises
  const matches = [];
  const unmatchedExercises = [];

  for (const exercise of exercises) {
    if (exercise.video_url && !isForce) {
      // Already has a video
      continue;
    }

    const exClean = clean(exercise.name);

    // Candidates matching clean name
    const candidates = videos.filter(v => v.cleanName === exClean);

    if (candidates.length > 0) {
      // Prefer non-female if available, else pick female
      const chosen = candidates.find(c => !c.isFemale) || candidates[0];
      matches.push({
        exercise,
        video: chosen,
      });
    } else {
      unmatchedExercises.push(exercise);
    }
  }

  console.log(`Matches found: ${matches.length} exercises can be updated.`);
  console.log(`Exercises already with video (or unmatched): ${exercises.length - matches.length}`);
  console.log('');

  if (matches.length === 0) {
    console.log('No matches to process.');
    return;
  }

  console.log('--- Matched List ---');
  for (const m of matches) {
    console.log(`✓ "${m.exercise.name}"  <--  ${m.video.fileName} (${(m.video.size / 1024 / 1024).toFixed(2)} MB)`);
  }
  console.log('');

  if (isDryRun) {
    console.log('DRY RUN complete. No files were uploaded or updated.');
    console.log('Run without --dry-run to upload and apply changes.');
    return;
  }

  // 4. Upload and update
  console.log('Starting upload to Cloudflare R2...');
  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < matches.length; i++) {
    const { exercise, video } = matches[i];
    const progress = `[${i + 1}/${matches.length}]`;
    console.log(`${progress} Uploading video for: "${exercise.name}" (${video.fileName})...`);

    try {
      const fileBuffer = fs.readFileSync(video.fullPath);
      const ext = video.ext;
      const key = `exercises/videos/${exercise.id}.${ext}`;
      const contentType = MIME_TYPES[ext] || 'video/mp4';

      // Upload to R2
      await s3Client.send(new PutObjectCommand({
        Bucket: env.R2_BUCKET_NAME,
        Key: key,
        Body: fileBuffer,
        ContentType: contentType,
      }));

      const publicUrl = `${env.R2_PUBLIC_URL.replace(/\/$/, '')}/${key}`;

      // Update Supabase
      const { error: updateError } = await supabase
        .from('exercises')
        .update({ video_url: publicUrl })
        .eq('id', exercise.id);

      if (updateError) {
        console.error(`  ✕ DB update error for ${exercise.name}:`, updateError.message);
        failCount++;
      } else {
        console.log(`  ✓ Done! Public URL: ${publicUrl}`);
        successCount++;
      }
    } catch (uploadErr) {
      console.error(`  ✕ Upload failed for ${exercise.name}:`, uploadErr.message);
      failCount++;
    }
  }

  console.log('');
  console.log('=== Upload Summary ===');
  console.log(`Successfully updated: ${successCount} exercises`);
  if (failCount > 0) {
    console.log(`Failed: ${failCount} exercises`);
  }
  console.log('All done!');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
