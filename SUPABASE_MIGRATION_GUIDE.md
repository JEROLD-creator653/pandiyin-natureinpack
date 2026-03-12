# Supabase Migration Guide: Lovable → Your Own Supabase

## Step-by-Step Instructions

### 1. Create Your New Supabase Project

1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Click **"New Project"**
3. Choose your organization
4. Set project name: `pandiyin-nature-in-pack`
5. Set a strong database password (save it!)
6. Choose a region close to your users (e.g., `South Asia (Mumbai)`)
7. Click **Create new project** and wait for it to be ready

---

### 2. Run the Schema Migration SQL

1. In your **new** Supabase dashboard, go to **SQL Editor**
2. Click **New Query**
3. Open the file `SUPABASE_MIGRATION_COMPLETE.sql` from this project
4. Copy and paste ALL content into the SQL editor
5. Click **Run** (or press Ctrl+Enter)
6. Verify all statements succeed (check for green checkmarks)

---

### 3. Export Data from Lovable Supabase

You need to export data from these tables in your **old (Lovable)** Supabase:

- `products`
- `categories`
- `banners`
- `orders`
- `order_items`
- `addresses`
- `profiles`
- `user_roles`
- `coupons`
- `coupon_redemptions`
- `cart_items`
- `product_reviews`
- `store_settings`
- `delivery_settings`
- `shipping_regions`
- `gst_settings`
- `invoices`
- `audit_logs`
- `payment_logs`

#### Option A: Export via Supabase Dashboard (Easiest)
1. Go to your **OLD** Supabase dashboard → **Table Editor**
2. For each table, click on it → click the **Export** button (top right) → **Export as CSV**
3. Save each CSV file

#### Option B: Export via pg_dump (Best for Large Data)
Run this command in your terminal (replace with your old Supabase DB connection string):

```bash
# Get the connection string from: OLD Supabase Dashboard → Settings → Database → Connection string (URI)
pg_dump "postgresql://postgres:[YOUR-PASSWORD]@db.adgihdeigquuoozmvfai.supabase.co:5432/postgres" \
  --data-only \
  --no-owner \
  --no-privileges \
  --schema=public \
  -t products -t categories -t banners -t orders -t order_items \
  -t addresses -t profiles -t user_roles -t coupons -t coupon_redemptions \
  -t cart_items -t product_reviews -t store_settings -t delivery_settings \
  -t shipping_regions -t gst_settings -t invoices -t audit_logs -t payment_logs \
  > data_export.sql
```

---

### 4. Import Data to New Supabase

#### If you used CSV export:
1. Go to your **NEW** Supabase → **Table Editor**
2. For each table, click on it → click **Import** → upload the CSV file
3. **Import in this order** (to respect foreign keys):
   1. `categories`
   2. `products`
   3. `store_settings`
   4. `delivery_settings`
   5. `shipping_regions`
   6. `gst_settings`
   7. `coupons`
   8. `banners`
   9. `profiles` (users must exist in auth.users first)
   10. `user_roles`
   11. `addresses`
   12. `orders`
   13. `order_items`
   14. `invoices`
   15. `coupon_redemptions`
   16. `cart_items`
   17. `product_reviews`
   18. `audit_logs`
   19. `payment_logs`

#### If you used pg_dump:
```bash
# Get the connection string from: NEW Supabase Dashboard → Settings → Database → Connection string (URI)
psql "postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-NEW-PROJECT-REF].supabase.co:5432/postgres" < data_export.sql
```

---

### 5. Migrate Storage (Product & Banner Images)

1. Go to your **OLD** Supabase → **Storage**
2. Download all files from the `product-images` bucket
3. Download all files from the `banner-images` bucket
4. Go to your **NEW** Supabase → **Storage**
5. The buckets `product-images` and `banner-images` were already created by the migration SQL
6. Upload all the downloaded files to the corresponding buckets
7. **Important**: Keep the same file paths/names so existing URLs work

---

### 6. Configure Authentication

#### Enable Google OAuth:
1. Go to your **NEW** Supabase → **Authentication** → **Providers**
2. Enable **Google**
3. Set:
   - **Client ID**: `129285036997-q31kas2ki7kvkkn5majpp5ssvakdol3f.apps.googleusercontent.com`
   - **Client Secret**: `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`
4. Copy the **Callback URL** shown by Supabase
5. Go to [Google Cloud Console](https://console.cloud.google.com) → **APIs & Services** → **Credentials**
6. Edit your OAuth 2.0 Client → add the new callback URL to **Authorized redirect URIs**
7. Add your new Supabase project URL to **Authorized JavaScript origins**

#### Enable Email Auth (if used):
1. Go to **Authentication** → **Providers** → Enable **Email**

---

### 7. Set Admin Role for Your Email

After pandiyinnatureinpack@gmail.com signs up/logs in to the new Supabase, run this in the **SQL Editor**:

```sql
-- First, find the user's ID
SELECT id, email FROM auth.users WHERE email = 'pandiyinnatureinpack@gmail.com';

-- Then insert admin role (replace USER_ID with the actual UUID from above)
INSERT INTO public.user_roles (user_id, role) 
VALUES ('USER_ID_HERE', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;
```

**OR** if the user already exists:
```sql
INSERT INTO public.user_roles (user_id, role) 
SELECT id, 'admin'::app_role 
FROM auth.users 
WHERE email = 'pandiyinnatureinpack@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;
```

---

### 8. Update Your App's Environment Variables

Update the `.env` file in your project with the new Supabase credentials:

```env
VITE_SUPABASE_PROJECT_ID="YOUR_NEW_PROJECT_REF"
VITE_SUPABASE_PUBLISHABLE_KEY="YOUR_NEW_ANON_KEY"
VITE_SUPABASE_URL="https://YOUR_NEW_PROJECT_REF.supabase.co"
```

Find these values in your **NEW** Supabase → **Settings** → **API**:
- **Project URL** → `VITE_SUPABASE_URL`
- **anon/public key** → `VITE_SUPABASE_PUBLISHABLE_KEY`
- **Project Reference ID** → `VITE_SUPABASE_PROJECT_ID`

If deploying on Vercel, update these environment variables there too.

---

### 9. Deploy Edge Functions (If Using)

Your project has 6 edge functions. To deploy them to your new Supabase:

```bash
# Install Supabase CLI (if not installed)
npm install -g supabase

# Login to Supabase
supabase login

# Link to your new project
supabase link --project-ref YOUR_NEW_PROJECT_REF

# Deploy all functions
supabase functions deploy pincode-proxy
supabase functions deploy razorpay-order
supabase functions deploy razorpay-verify
supabase functions deploy razorpay-webhook
supabase functions deploy sitemap
supabase functions deploy verify-order
```

Set the required secrets for edge functions:
```bash
# Razorpay keys
supabase secrets set RAZORPAY_KEY_ID=your_razorpay_key_id
supabase secrets set RAZORPAY_KEY_SECRET=your_razorpay_key_secret

# Supabase service role key (find in Dashboard → Settings → API)
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

---

### 10. Update supabase/config.toml

Update the project ID in `supabase/config.toml`:

```toml
project_id = "YOUR_NEW_PROJECT_REF"
```

---

### 11. Verify Everything Works

- [ ] Tables are created correctly (check Table Editor)
- [ ] Data is imported (spot check a few tables)
- [ ] Storage buckets have images
- [ ] Google OAuth login works
- [ ] Admin user can access admin panel
- [ ] Products display correctly with images
- [ ] Orders can be placed
- [ ] Reviews work
- [ ] Coupons work

---

## Quick Reference

| Item | Old (Lovable) | New (Your Own) |
|------|---------------|----------------|
| Project Ref | `adgihdeigquuoozmvfai` | `YOUR_NEW_REF` |
| URL | `https://adgihdeigquuoozmvfai.supabase.co` | `https://YOUR_NEW_REF.supabase.co` |
| Admin Email | `pandiyinnatureinpack@gmail.com` | Same |
