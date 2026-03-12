/**
 * TypeScript types for postal API responses
 */
export interface PostOffice {
  Name: string;
  Block: string;
  District: string;
  State: string;
  Pincode: string;
  Division?: string;
}

export interface PostalApiResponse {
  Status: string;
  PostOffice: PostOffice[];
}

export interface PincodeResult {
  area: string;
  city: string;
  district: string;
  state: string;
}

/**
 * Select best PostOffice from array
 * Priority: Pick first entry where Block !== "NA"
 * Fallback: Use first entry if all have Block === "NA"
 */
function selectBestPostOffice(postOffices: PostOffice[]): PostOffice | null {
  if (!postOffices || postOffices.length === 0) return null;

  const validPostOffice = postOffices.find(
    (po) => po.Block && po.Block !== 'NA' && po.Block.trim() !== ''
  );

  return validPostOffice || postOffices[0];
}

/**
 * Fetch and parse pincode details via Edge Function proxy
 * Returns area, city (Block), district, and state
 */
export async function fetchPincodeDetails(
  pincode: string
): Promise<PincodeResult | null> {
  if (!/^\d{6}$/.test(pincode)) return null;

  // Try Supabase proxy first, then fallback to direct API
  let data: PostalApiResponse[] | null = null;

  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(`${supabaseUrl}/functions/v1/pincode-proxy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
      body: JSON.stringify({ pincode }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      data = await res.json();
    } else {
      console.warn('Pincode proxy returned', res.status, '— falling back to direct API');
    }
  } catch (proxyError) {
    console.warn('Pincode proxy failed — falling back to direct API:', proxyError);
  }

  // Fallback: use Nominatim search API (supports CORS, no proxy needed)
  if (!data) {
    try {
      console.log('[Pincode] Using Nominatim fallback for pincode:', pincode);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const url = `https://nominatim.openstreetmap.org/search?postalcode=${pincode}&country=India&format=json&addressdetails=1&limit=1`;
      const res = await fetch(url, {
        headers: {
          'Accept-Language': 'en',
          'User-Agent': 'PandiyinNatureInPack/1.0',
        },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        console.error('Nominatim pincode search returned', res.status);
        return null;
      }

      const results = await res.json();
      if (results && results.length > 0) {
        const addr = results[0].address || {};
        console.log('[Pincode] Nominatim fallback result:', JSON.stringify(addr, null, 2));

        return {
          area: addr.suburb || addr.neighbourhood || addr.village || '',
          city: addr.city || addr.town || addr.village || '',
          district: addr.state_district || addr.county || '',
          state: addr.state || '',
        };
      }

      console.warn('[Pincode] Nominatim returned no results for pincode:', pincode);
      return null;
    } catch (nominatimError) {
      console.error('Nominatim pincode fallback failed:', nominatimError);
      return null;
    }
  }

  try {
    if (data?.[0]?.Status === 'Success' && data[0].PostOffice?.length > 0) {
      const selectedPostOffice = selectBestPostOffice(data[0].PostOffice);

      if (!selectedPostOffice) {
        return null;
      }

      const city =
        selectedPostOffice.Block && selectedPostOffice.Block !== 'NA'
          ? selectedPostOffice.Block
          : selectedPostOffice.District || '';

      return {
        area: selectedPostOffice.Name || '',
        city: city,
        district: selectedPostOffice.District || '',
        state: selectedPostOffice.State || '',
      };
    }

    return null;
  } catch (error) {
    console.error('Pincode parsing error:', error);
    return null;
  }
}

/**
 * Legacy function for backward compatibility
 * @deprecated Use fetchPincodeDetails instead
 */
export async function lookupPincode(pincode: string): Promise<PincodeResult | null> {
  return fetchPincodeDetails(pincode);
}
