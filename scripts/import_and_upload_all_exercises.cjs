/**
 * Script: import_and_upload_all_exercises.cjs
 * 
 * Purpose:
 * 1. Safely uploads local exercise videos to Cloudflare R2 under the 10 GB free tier.
 * 2. Updates the existing exercises in Supabase with their matching videos (including Bicep Curl & Bench Press).
 * 3. Adds all new unique exercises from the video collection into Supabase with their R2 video URLs.
 * 
 * Safety:
 * - Hard ceiling of 5 GB (well below Cloudflare R2's 10 GB free tier limit).
 * - Deduplicates male/female variants to only upload 1 optimal video per unique exercise (~1.15 GB total).
 * 
 * Usage:
 *   node scripts/import_and_upload_all_exercises.cjs --dry-run   # Preview without uploading
 *   node scripts/import_and_upload_all_exercises.cjs             # Perform upload and database sync
 */

const fs = require('fs');
const path = require('path');

// Resolve packages from admin-panel/node_modules
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

// Strict safety limit: 5 GB maximum upload (half of the 10 GB free tier)
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024 * 1024;

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

// Category-based images
const CATEGORY_IMAGES = {
  Abdominals: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=800&fit=crop&q=80',
  Shoulders: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&h=800&fit=crop&q=80',
  Cardio: 'https://images.unsplash.com/photo-1538805060514-97d9cc17730c?w=800&h=800&fit=crop&q=80',
  Legs: 'https://images.unsplash.com/photo-1549060279-7e168fcee0c2?w=800&h=800&fit=crop&q=80',
  Arms: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=800&h=800&fit=crop&q=80',
  Chest: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=800&fit=crop&q=80',
  Back: 'https://images.unsplash.com/photo-1549060279-7e168fcee0c2?w=800&h=800&fit=crop&q=80',
};

const CATEGORY_MUSCLE_GROUPS = {
  Abdominals: ['Abdominals', 'Core', 'Obliques'],
  Shoulders: ['Shoulders', 'Deltoids', 'Traps'],
  Cardio: ['Full Body', 'Cardio', 'Endurance'],
  Legs: ['Quadriceps', 'Hamstrings', 'Glutes', 'Calves'],
  Arms: ['Biceps', 'Triceps', 'Forearms'],
  Chest: ['Chest', 'Pectorals'],
  Back: ['Back', 'Lats', 'Rhomboids'],
};

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function findVideos(dir) {
  let list = [];
  if (!fs.existsSync(dir)) return list;
  fs.readdirSync(dir).forEach(file => {
    const full = path.join(dir, file);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      list = list.concat(findVideos(full));
    } else if (file.endsWith('.mp4') || file.endsWith('.webm') || file.endsWith('.mov')) {
      const parentDir = path.basename(path.dirname(full));
      list.push({ path: full, file, parentDir, size: stat.size });
    }
  });
  return list;
}

async function main() {
  console.log('====================================================');
  console.log('      GoFit Full Exercise & Video Importer');
  console.log('====================================================');
  console.log('Mode:', isDryRun ? '🔍 DRY RUN (Preview only)' : '🚀 LIVE (Upload to R2 & Sync DB)');
  console.log(`Safety Limit: ${(MAX_UPLOAD_BYTES / (1024 * 1024 * 1024)).toFixed(1)} GB (Free tier is 10 GB)`);
  console.log('');

  // 1. Fetch existing exercises from DB
  const { data: existingExercises, error: fetchErr } = await supabase
    .from('exercises')
    .select('*');
  if (fetchErr) {
    console.error('Error fetching existing exercises:', fetchErr);
    process.exit(1);
  }
  console.log(`Currently ${existingExercises.length} exercises in Supabase.`);

  // 2. Scan Storage folder
  const storageDir = path.join(__dirname, '..', 'Storage');
  const allVideos = findVideos(storageDir);
  console.log(`Found ${allVideos.length} video files in ${storageDir}.`);

  // 3. Map special root files for existing exercises
  const specialFiles = {
    'Bicep Curl': allVideos.find(v => v.file === '4K.mp4'),
    'Bench Press': allVideos.find(v => v.file === 'Full HD.mp4'),
  };

  // 4. Build unique exercises catalog from videos
  const exerciseMap = new Map(); // key: lowercased name -> { name, category, video }

  allVideos.forEach(v => {
    if (v.file === '4K.mp4' || v.file === 'Full HD.mp4') return;
    const base = path.basename(v.file, path.extname(v.file));
    const cleanTitle = base
      .replace(/_female/gi, '')
      .replace(/_male/gi, '')
      .replace(/ female$/gi, '')
      .replace(/ male$/gi, '')
      .trim();

    const lowerKey = cleanTitle.toLowerCase();
    const rawCategory = v.parentDir === 'Calisthenics-Cardio-Plyo-Functional' ? 'Cardio' : v.parentDir;
    const category = ['Abdominals', 'Shoulders', 'Cardio', 'Legs'].includes(rawCategory) ? rawCategory : 'Cardio';

    if (!exerciseMap.has(lowerKey)) {
      exerciseMap.set(lowerKey, {
        name: cleanTitle,
        category,
        video: v,
      });
    } else {
      // If current video is male/standard and previous was female, prefer male
      const current = exerciseMap.get(lowerKey);
      if (/_female| female/i.test(current.video.file) && !/_female| female/i.test(v.file)) {
        current.video = v;
      }
    }
  });

  console.log(`Identified ${exerciseMap.size} unique exercises from library videos.`);

  // Calculate total upload size
  let plannedBytes = 0;
  for (const [_, item] of exerciseMap.entries()) {
    plannedBytes += item.video.size;
  }
  if (specialFiles['Bicep Curl']) plannedBytes += specialFiles['Bicep Curl'].size;
  if (specialFiles['Bench Press']) plannedBytes += specialFiles['Bench Press'].size;

  const plannedMB = (plannedBytes / (1024 * 1024)).toFixed(2);
  const plannedGB = (plannedBytes / (1024 * 1024 * 1024)).toFixed(3);
  console.log(`Total upload volume: ${plannedMB} MB (~${plannedGB} GB)`);
  console.log(`Percentage of 10 GB free tier: ${((plannedBytes / (10 * 1024 * 1024 * 1024)) * 100).toFixed(1)}%`);

  if (plannedBytes > MAX_UPLOAD_BYTES) {
    console.error(`ABORTING: Planned upload (${plannedGB} GB) exceeds safety limit of ${(MAX_UPLOAD_BYTES / (1024 * 1024 * 1024)).toFixed(1)} GB!`);
    process.exit(1);
  }
  console.log('');

  // 5. Plan Operations
  // A. Existing exercises to update
  const updates = [];
  existingExercises.forEach(ex => {
    let videoToUse = null;
    if (specialFiles[ex.name]) {
      videoToUse = specialFiles[ex.name];
    } else {
      const lower = ex.name.toLowerCase();
      if (exerciseMap.has(lower)) {
        videoToUse = exerciseMap.get(lower).video;
      }
    }
    if (videoToUse) {
      updates.push({
        type: 'update',
        exercise: ex,
        video: videoToUse,
      });
    }
  });

  // B. New exercises to insert
  const inserts = [];
  const existingNamesLower = new Set(existingExercises.map(e => e.name.toLowerCase()));

  for (const [lowerKey, item] of exerciseMap.entries()) {
    if (!existingNamesLower.has(lowerKey)) {
      inserts.push({
        type: 'insert',
        name: item.name,
        category: item.category,
        muscle_groups: CATEGORY_MUSCLE_GROUPS[item.category] || ['Full Body'],
        image_url: CATEGORY_IMAGES[item.category] || CATEGORY_IMAGES.Cardio,
        difficulty: 'Intermediate',
        default_sets: 3,
        default_reps: 12,
        default_rest_time: 60,
        video: item.video,
      });
    }
  }

  console.log(`Existing exercises to update with videos: ${updates.length}`);
  console.log(`New exercises to insert with videos: ${inserts.length}`);
  console.log(`Total exercises in database after run: ${existingExercises.length + inserts.length}`);
  console.log('');

  if (isDryRun) {
    console.log('--- Dry Run Preview (First 15 items) ---');
    [...updates, ...inserts].slice(0, 15).forEach((op, idx) => {
      const name = op.type === 'update' ? op.exercise.name : op.name;
      console.log(` ${idx + 1}. [${op.type.toUpperCase()}] "${name}" -> ${op.video.file} (${(op.video.size / 1024 / 1024).toFixed(1)} MB)`);
    });
    console.log('...');
    console.log('DRY RUN completed. Run without --dry-run to execute.');
    return;
  }

  // 6. Execute Uploads & Database Updates
  console.log('Starting uploads to Cloudflare R2...');
  let totalUploadedBytes = 0;
  let successCount = 0;
  let failCount = 0;

  const allOps = [...updates, ...inserts];

  for (let i = 0; i < allOps.length; i++) {
    const op = allOps[i];
    const name = op.type === 'update' ? op.exercise.name : op.name;
    const progress = `[${i + 1}/${allOps.length}]`;
    const mb = (op.video.size / 1024 / 1024).toFixed(1);

    if (totalUploadedBytes + op.video.size > MAX_UPLOAD_BYTES) {
      console.warn(`Safety limit reached! Halting further uploads to protect free tier.`);
      break;
    }

    console.log(`${progress} Uploading "${name}" (${mb} MB)...`);

    try {
      const fileBuffer = fs.readFileSync(op.video.path);
      const ext = path.extname(op.video.file).slice(1).toLowerCase() || 'mp4';
      const key = `exercises/videos/${slugify(name)}.${ext}`;

      // Upload to R2
      await s3Client.send(new PutObjectCommand({
        Bucket: env.R2_BUCKET_NAME,
        Key: key,
        Body: fileBuffer,
        ContentType: ext === 'webm' ? 'video/webm' : 'video/mp4',
      }));

      const publicUrl = `${env.R2_PUBLIC_URL.replace(/\/$/, '')}/${key}`;
      totalUploadedBytes += op.video.size;

      // Sync Database
      if (op.type === 'update') {
        const { error } = await supabase
          .from('exercises')
          .update({ video_url: publicUrl })
          .eq('id', op.exercise.id);
        if (error) throw error;
        console.log(`   ✓ Updated DB record for "${name}" -> ${publicUrl}`);
      } else {
        const { error } = await supabase
          .from('exercises')
          .insert({
            name: op.name,
            category: op.category,
            muscle_groups: op.muscle_groups,
            image_url: op.image_url,
            video_url: publicUrl,
            difficulty: op.difficulty,
            default_sets: op.default_sets,
            default_reps: op.default_reps,
            default_rest_time: op.default_rest_time,
          });
        if (error) throw error;
        console.log(`   ✓ Inserted new exercise "${name}" -> ${publicUrl}`);
      }

      successCount++;
    } catch (err) {
      console.error(`   ✕ Failed on "${name}":`, err.message);
      failCount++;
    }
  }

  console.log('');
  console.log('====================================================');
  console.log('                IMPORT COMPLETED');
  console.log('====================================================');
  console.log(`Successfully processed: ${successCount} exercises`);
  console.log(`Failed: ${failCount} exercises`);
  console.log(`Total storage uploaded: ${(totalUploadedBytes / 1024 / 1024).toFixed(2)} MB (${(totalUploadedBytes / 1024 / 1024 / 1024).toFixed(3)} GB)`);
  console.log(`Free quota remaining: ~${(10 - (totalUploadedBytes / 1024 / 1024 / 1024)).toFixed(2)} GB`);
}

main().catch(err => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});
