import { createClient } from '@supabase/supabase-js';

// ============================================================
// CONFIGURATION
// ============================================================

// Old Supabase (Lovable) - anon key only (limited by RLS)
const OLD_URL = 'https://adgihdeigquuoozmvfai.supabase.co';
const OLD_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFkZ2loZGVpZ3F1dW9vem12ZmFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA0NjIzMjMsImV4cCI6MjA4NjAzODMyM30.yC3TI8UFXGTAm0Da-QGfQ9sBhTKFCgF7JyCYn0lDBD4';

// New Supabase - service_role key (full access, bypasses RLS)
const NEW_URL = 'https://dhteydvxnvfucvgnbovr.supabase.co';
const NEW_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRodGV5ZHZ4bnZmdWN2Z25ib3ZyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzI0MzA3OSwiZXhwIjoyMDg4ODE5MDc5fQ.4j9Ngq1X1CcsyKSWgTRH9YFRg1rBTMU-vUWsn17ewXo';

const oldClient = createClient(OLD_URL, OLD_KEY);
const newClient = createClient(NEW_URL, NEW_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

// ============================================================
// Tables in foreign-key dependency order
// ============================================================
// PUBLIC READ tables (anon key can read these via RLS)
const PUBLIC_TABLES = [
  { name: 'categories', conflict: 'id' },
  { name: 'store_settings', conflict: 'id' },
  { name: 'shipping_regions', conflict: 'id' },
  { name: 'gst_settings', conflict: 'id' },
  { name: 'delivery_settings', conflict: 'id' },
  { name: 'banners', conflict: 'id' },
  { name: 'products', conflict: 'id' },
  { name: 'product_reviews', conflict: 'id' },
];

// RESTRICTED tables (need service_role key for old Supabase)
const RESTRICTED_TABLES = [
  'profiles',
  'user_roles',
  'addresses',
  'coupons',
  'orders',
  'order_items',
  'invoices',
  'coupon_redemptions',
  'cart_items',
  'payment_logs',
  'audit_logs',
];

// ============================================================
// MIGRATION FUNCTIONS
// ============================================================

async function readAllRows(client, tableName) {
  // Supabase returns max 1000 rows per request, paginate to get all
  const allRows = [];
  let from = 0;
  const pageSize = 1000;

  while (true) {
    const { data, error } = await client
      .from(tableName)
      .select('*')
      .range(from, from + pageSize - 1);

    if (error) throw error;
    if (!data || data.length === 0) break;

    allRows.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
  }

  return allRows;
}

async function migrateTable(tableName, conflictColumn) {
  console.log(`\n--- ${tableName} ---`);

  try {
    // Read from old Supabase
    const data = await readAllRows(oldClient, tableName);

    if (data.length === 0) {
      console.log(`  (empty - no rows found)`);
      return { table: tableName, status: 'empty', count: 0 };
    }

    console.log(`  Read: ${data.length} rows`);

    // Write to new Supabase in batches
    const batchSize = 100;
    let inserted = 0;

    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);
      const { error: writeError } = await newClient
        .from(tableName)
        .upsert(batch, { onConflict: conflictColumn, ignoreDuplicates: false });

      if (writeError) {
        console.log(`  WRITE FAILED (batch ${Math.floor(i / batchSize) + 1}): ${writeError.message}`);
        return { table: tableName, status: 'write_failed', error: writeError.message, read: data.length };
      }
      inserted += batch.length;
    }

    console.log(`  Inserted: ${inserted} rows`);
    return { table: tableName, status: 'success', count: inserted };
  } catch (err) {
    console.log(`  READ FAILED: ${err.message}`);
    return { table: tableName, status: 'read_failed', error: err.message };
  }
}

async function migrateStorageBucket(bucketName) {
  console.log(`\n--- Storage: ${bucketName} ---`);

  try {
    // List files in old bucket
    const { data: files, error: listError } = await oldClient.storage
      .from(bucketName)
      .list('', { limit: 1000 });

    if (listError) {
      console.log(`  LIST FAILED: ${listError.message}`);
      return { bucket: bucketName, status: 'failed', error: listError.message };
    }

    if (!files || files.length === 0) {
      console.log(`  (empty bucket)`);
      return { bucket: bucketName, status: 'empty', count: 0 };
    }

    // Filter out folder placeholders
    const realFiles = files.filter(f => f.name && !f.name.endsWith('/'));
    console.log(`  Found: ${realFiles.length} files`);

    let migrated = 0;
    let failed = 0;

    for (const file of realFiles) {
      try {
        // Download from old
        const { data: fileData, error: dlError } = await oldClient.storage
          .from(bucketName)
          .download(file.name);

        if (dlError) {
          console.log(`  Download failed: ${file.name} - ${dlError.message}`);
          failed++;
          continue;
        }

        // Upload to new
        const { error: upError } = await newClient.storage
          .from(bucketName)
          .upload(file.name, fileData, {
            contentType: file.metadata?.mimetype || 'application/octet-stream',
            upsert: true,
          });

        if (upError) {
          console.log(`  Upload failed: ${file.name} - ${upError.message}`);
          failed++;
          continue;
        }

        migrated++;
      } catch (e) {
        console.log(`  Error with ${file.name}: ${e.message}`);
        failed++;
      }
    }

    console.log(`  Migrated: ${migrated}/${realFiles.length} files${failed > 0 ? ` (${failed} failed)` : ''}`);
    return { bucket: bucketName, status: migrated > 0 ? 'success' : 'failed', count: migrated, failed };
  } catch (err) {
    console.log(`  ERROR: ${err.message}`);
    return { bucket: bucketName, status: 'failed', error: err.message };
  }
}

// Also try to list nested folders in storage
async function listAllStorageFiles(client, bucketName, folder = '') {
  const allFiles = [];

  const { data, error } = await client.storage
    .from(bucketName)
    .list(folder, { limit: 1000 });

  if (error || !data) return allFiles;

  for (const item of data) {
    const path = folder ? `${folder}/${item.name}` : item.name;
    if (item.id) {
      // It's a file
      allFiles.push({ ...item, fullPath: path });
    } else {
      // It's a folder, recurse
      const nested = await listAllStorageFiles(client, bucketName, path);
      allFiles.push(...nested);
    }
  }

  return allFiles;
}

async function migrateStorageBucketRecursive(bucketName) {
  console.log(`\n--- Storage: ${bucketName} ---`);

  try {
    const files = await listAllStorageFiles(oldClient, bucketName);

    if (files.length === 0) {
      console.log(`  (empty bucket)`);
      return { bucket: bucketName, status: 'empty', count: 0 };
    }

    console.log(`  Found: ${files.length} files`);

    let migrated = 0;
    let failed = 0;

    for (const file of files) {
      try {
        const { data: fileData, error: dlError } = await oldClient.storage
          .from(bucketName)
          .download(file.fullPath);

        if (dlError) {
          console.log(`    DL fail: ${file.fullPath} - ${dlError.message}`);
          failed++;
          continue;
        }

        const { error: upError } = await newClient.storage
          .from(bucketName)
          .upload(file.fullPath, fileData, {
            contentType: file.metadata?.mimetype || 'application/octet-stream',
            upsert: true,
          });

        if (upError) {
          console.log(`    UP fail: ${file.fullPath} - ${upError.message}`);
          failed++;
          continue;
        }

        migrated++;
      } catch (e) {
        console.log(`    Error: ${file.fullPath} - ${e.message}`);
        failed++;
      }
    }

    console.log(`  Migrated: ${migrated}/${files.length} files${failed > 0 ? ` (${failed} failed)` : ''}`);
    return { bucket: bucketName, status: migrated > 0 ? 'success' : 'failed', count: migrated, failed };
  } catch (err) {
    console.log(`  ERROR: ${err.message}`);
    return { bucket: bucketName, status: 'failed', error: err.message };
  }
}

// ============================================================
// FIX HELPERS
// ============================================================

async function fixShippingRegions() {
  console.log('\n--- shipping_regions (fix: clear seed data first) ---');
  try {
    const data = await readAllRows(oldClient, 'shipping_regions');
    if (data.length === 0) {
      console.log('  (empty)');
      return { table: 'shipping_regions', status: 'empty', count: 0 };
    }
    console.log(`  Read: ${data.length} rows`);

    // Delete existing seed data from new Supabase
    const { error: delErr } = await newClient.from('shipping_regions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (delErr) {
      console.log(`  DELETE FAILED: ${delErr.message}`);
      return { table: 'shipping_regions', status: 'write_failed', error: delErr.message };
    }
    console.log('  Cleared existing seed data');

    const { error: writeErr } = await newClient.from('shipping_regions').insert(data);
    if (writeErr) {
      console.log(`  INSERT FAILED: ${writeErr.message}`);
      return { table: 'shipping_regions', status: 'write_failed', error: writeErr.message };
    }
    console.log(`  Inserted: ${data.length} rows`);
    return { table: 'shipping_regions', status: 'success', count: data.length };
  } catch (err) {
    console.log(`  ERROR: ${err.message}`);
    return { table: 'shipping_regions', status: 'read_failed', error: err.message };
  }
}

async function fixProducts() {
  console.log('\n--- products (fix: null out user_id) ---');
  try {
    const data = await readAllRows(oldClient, 'products');
    if (data.length === 0) {
      console.log('  (empty)');
      return { table: 'products', status: 'empty', count: 0 };
    }
    console.log(`  Read: ${data.length} rows`);

    // Null out user_id since auth.users aren't migrated
    const cleaned = data.map(row => ({ ...row, user_id: null }));

    const batchSize = 100;
    let inserted = 0;
    for (let i = 0; i < cleaned.length; i += batchSize) {
      const batch = cleaned.slice(i, i + batchSize);
      const { error } = await newClient.from('products').upsert(batch, { onConflict: 'id' });
      if (error) {
        console.log(`  WRITE FAILED: ${error.message}`);
        return { table: 'products', status: 'write_failed', error: error.message };
      }
      inserted += batch.length;
    }
    console.log(`  Inserted: ${inserted} rows`);
    return { table: 'products', status: 'success', count: inserted };
  } catch (err) {
    console.log(`  ERROR: ${err.message}`);
    return { table: 'products', status: 'read_failed', error: err.message };
  }
}

async function fixProductReviews() {
  console.log('\n--- product_reviews (fix: create placeholder user) ---');
  try {
    const data = await readAllRows(oldClient, 'product_reviews');
    if (data.length === 0) {
      console.log('  (empty)');
      return { table: 'product_reviews', status: 'empty', count: 0 };
    }
    console.log(`  Read: ${data.length} rows`);

    // Create a placeholder user in new Supabase for migrated reviews
    const placeholderEmail = 'migrated-reviews@pandiyin.placeholder';
    const { data: placeholderUser, error: createErr } = await newClient.auth.admin.createUser({
      email: placeholderEmail,
      password: 'MigratedUser_Placeholder_2024!',
      email_confirm: true,
      user_metadata: { full_name: 'Migrated Reviews Placeholder' }
    });

    let placeholderId;
    if (createErr) {
      // User might already exist from a previous run
      const { data: { users }, error: listErr } = await newClient.auth.admin.listUsers();
      if (!listErr && users) {
        const existing = users.find(u => u.email === placeholderEmail);
        if (existing) {
          placeholderId = existing.id;
          console.log(`  Using existing placeholder user: ${placeholderId}`);
        } else {
          console.log(`  Cannot create placeholder user: ${createErr.message}`);
          return { table: 'product_reviews', status: 'write_failed', error: createErr.message };
        }
      }
    } else {
      placeholderId = placeholderUser.user.id;
      console.log(`  Created placeholder user: ${placeholderId}`);
    }

    // Replace all user_ids with placeholder, keep user_name for display
    const cleaned = data.map(row => ({ ...row, user_id: placeholderId }));

    // Need to handle unique constraint (user_id, product_id) - group by product_id and keep latest
    const uniqueReviews = new Map();
    for (const review of cleaned) {
      const key = `${review.user_id}-${review.product_id}`;
      if (!uniqueReviews.has(key) || new Date(review.created_at) > new Date(uniqueReviews.get(key).created_at)) {
        uniqueReviews.set(key, review);
      }
    }

    // Since all user_ids are the same placeholder, we can only keep one review per product
    // For multiple reviews on same product, we keep the most recent one
    const deduped = [...uniqueReviews.values()];
    if (deduped.length < cleaned.length) {
      console.log(`  Note: ${cleaned.length - deduped.length} reviews deduplicated (same product, placeholder user)`);
    }

    const { error } = await newClient.from('product_reviews').upsert(deduped, { onConflict: 'id' });
    if (error) {
      console.log(`  WRITE FAILED: ${error.message}`);
      return { table: 'product_reviews', status: 'write_failed', error: error.message };
    }
    console.log(`  Inserted: ${deduped.length} rows`);
    return { table: 'product_reviews', status: 'success', count: deduped.length };
  } catch (err) {
    console.log(`  ERROR: ${err.message}`);
    return { table: 'product_reviews', status: 'read_failed', error: err.message };
  }
}

// ============================================================
// MAIN
// ============================================================

async function main() {
  console.log('============================================');
  console.log('  PANDIYIN - Supabase Data Migration');
  console.log('============================================');
  console.log(`From: ${OLD_URL}`);
  console.log(`To:   ${NEW_URL}`);
  console.log(`Mode: anon key (public data only)\n`);

  // Test connectivity to new Supabase
  console.log('Testing new Supabase connection...');
  const { error: testErr } = await newClient.from('categories').select('id').limit(1);
  if (testErr) {
    if (testErr.message.includes('does not exist') || testErr.message.includes('relation')) {
      console.log('\nERROR: Schema not found on new Supabase!');
      console.log('Please run SUPABASE_MIGRATION_COMPLETE.sql in your new Supabase SQL Editor first.');
      console.log('Dashboard > SQL Editor > New Query > Paste & Run');
      process.exit(1);
    }
    console.log(`Warning: ${testErr.message}`);
  }
  console.log('Connected to new Supabase.\n');

  // ---- Phase 1: Migrate remaining public tables (skip already done ones) ----
  console.log('========== PHASE 1: ALREADY-MIGRATED TABLES (skip) ==========');
  console.log('  categories: already done (6 rows)');
  console.log('  store_settings: already done (1 row)');
  console.log('  gst_settings: already done (1 row)');
  console.log('  delivery_settings: already done (1 row)');

  const tableResults = [];

  // ---- Phase 2: Fix the 3 failed tables ----
  console.log('\n========== PHASE 2: FIXING FAILED TABLES ==========');

  tableResults.push(await fixShippingRegions());
  tableResults.push(await fixProducts());
  tableResults.push(await fixProductReviews());

  // Also try restricted tables (they'll likely return empty with anon key)
  console.log('\n========== PHASE 3: RESTRICTED TABLES (attempting) ==========');
  for (const name of RESTRICTED_TABLES) {
    const result = await migrateTable(name, 'id');
    tableResults.push(result);
  }

  // ---- Phase 4: Storage already migrated ----
  console.log('\n========== PHASE 4: STORAGE BUCKETS ==========');
  console.log('  product-images: already done (19 files)');
  console.log('  banner-images: already done (4 files)');
  const storageResults = [
    { bucket: 'product-images', status: 'success', count: 19 },
    { bucket: 'banner-images', status: 'success', count: 4 },
  ];
  /*  // Skip storage - already migrated
  const storageResults = [];
  for (const bucket of ['product-images', 'banner-images']) {
    const result = await migrateStorageBucketRecursive(bucket);
    storageResults.push(result);
  }
  */

  // ============================================================
  // SUMMARY
  // ============================================================
  console.log('\n\n============================================');
  console.log('  MIGRATION SUMMARY');
  console.log('============================================');

  const succeeded = tableResults.filter(r => r.status === 'success');
  const empty = tableResults.filter(r => r.status === 'empty');
  const readFailed = tableResults.filter(r => r.status === 'read_failed');
  const writeFailed = tableResults.filter(r => r.status === 'write_failed');

  if (succeeded.length > 0) {
    console.log(`\nSUCCESSFUL (${succeeded.length} tables):`);
    succeeded.forEach(r => console.log(`  + ${r.table}: ${r.count} rows`));
  }

  if (empty.length > 0) {
    console.log(`\nEMPTY (${empty.length} tables):`);
    empty.forEach(r => console.log(`  ~ ${r.table}`));
  }

  if (readFailed.length > 0) {
    console.log(`\nCOULD NOT READ (${readFailed.length} tables - need service_role key):`);
    readFailed.forEach(r => console.log(`  ! ${r.table}: ${r.error}`));
  }

  if (writeFailed.length > 0) {
    console.log(`\nWRITE FAILED (${writeFailed.length} tables):`);
    writeFailed.forEach(r => console.log(`  X ${r.table}: ${r.error}`));
  }

  if (storageResults.length > 0) {
    console.log('\nSTORAGE:');
    storageResults.forEach(r => {
      if (r.status === 'success') console.log(`  + ${r.bucket}: ${r.count} files`);
      else if (r.status === 'empty') console.log(`  ~ ${r.bucket}: empty`);
      else console.log(`  ! ${r.bucket}: ${r.error || 'failed'}`);
    });
  }

  if (readFailed.length > 0) {
    console.log('\n--------------------------------------------');
    console.log('NOTE: Some tables could not be read because');
    console.log('the old Supabase service_role key is missing.');
    console.log('');
    console.log('To migrate those tables manually:');
    console.log('1. Open Lovable > Supabase Dashboard > Table Editor');
    console.log('2. Select the table > Export as CSV');
    console.log('3. In new Supabase Dashboard > Table Editor > Import CSV');
    console.log('--------------------------------------------');
  }

  console.log('\nAuth users CANNOT be migrated without the old');
  console.log('service_role key. Users will need to sign up again.');
  console.log('\nDone!');
}

main().catch(err => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});
