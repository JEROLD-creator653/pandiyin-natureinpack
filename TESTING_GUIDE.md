# Address Form Fix - Testing Guide

## Quick Start Testing

### Test 1: Pincode Auto-fill (631209)
**Steps:**
1. Open Address Modal (Add or Edit)
2. Enter pincode: `631209`
3. Wait for auto-fill (debounce 300ms)
4. Verify fields:
   - Area: (should populate with area name from API)
   - City: `Tiruttani` ✓
   - District: `Tiruvallur` ✓
   - State: `Tamil Nadu` ✓

**Expected Behavior:**
- Loading spinner appears in all fields
- Fields are disabled during fetch
- After fetch, values auto-fill
- Form becomes editable agai

---

### Test 2: Pincode Auto-fill (631208)
**Steps:**
1. Clear previous form or open new modal
2. Enter pincode: `631208`
3. Verify fields:
   - Area: `Keechalam` ✓
   - City: `Pallipat` ✓
   - District: `Tiruvallur` ✓
   - State: `Tamil Nadu` ✓

---

### Test 3: Invalid Pincode
**Steps:**
1. Enter pincode: `000000`
2. Wait 300ms
3. Verify: Toast appears "Invalid pincode"
4. Fields remain unchanged

---

### Test 4: Phone Number Save (New Address)
**Steps:**
1. Open Add Address modal
2. Fill form:
   - Full Name: `John Doe`
   - Country Code: Select `+91` from dropdown
   - Phone Input: `7358803372` (no +91, no spaces)
   - Address Line 1: `123 Main Street`
   - Pincode: `600001`
   - Auto-fill other fields
3. Click "Save Address"
4. Check database:
   ```
   SELECT phone FROM addresses WHERE full_name='John Doe';
   -- Expected: 7358803372 (digits only, no +91)
   ```

---

### Test 5: Phone Number Load & Edit (Existing Address)
**Steps:**
1. Navigate to Profile/Checkout with saved address
2. Click Edit Address button on the card
3. Verify modal shows:
   - Country Code Dropdown: `+91` ✓
   - Phone Input: `7358803372` (no duplication) ✓
   - Combined display: `+91 7358803372` ✓
4. Edit phone to: `9876543210`
5. Click "Update Address"
6. Check database:
   ```
   SELECT phone FROM addresses WHERE id='<id>';
   -- Expected: 9876543210 (digits only)
   ```

---

### Test 6: Backward Compatibility (Old Records)
**Steps:**
1. Manually insert old format into database:
   ```sql
   INSERT INTO addresses (phone, ...) 
   VALUES ('+91 7358803372', ...);
   ```
2. Open edit modal for this address
3. Verify:
   - Dropdown shows: `+91` ✓
   - Input shows: `7358803372` ✓
   - NO duplication like `+91 +91 7358803372` ✓
4. Edit and save
5. Check database now stores: `9876543210` (new format)

---

### Test 7: Phone Number Too Long
**Steps:**
1. Set country code to: `+91` (max 10 digits)
2. Enter phone: `12345678901` (11 digits)
3. Click "Save Address"
4. Verify: Toast appears "Phone number too long for +91"
5. Address not saved

---

### Test 8: Pincode Partial Entry
**Steps:**
1. Enter pincode: `6312` (4 digits)
2. Wait 1 second
3. Verify: No API call, no loading spinner
4. Continue entering: `09` (now 6 digits: 631209)
5. Verify: API call triggers, auto-fill works

**Cleanup:**
1. Delete pincode to 5 digits: `63120`
2. Verify: No additional API call (optimized)

---

### Test 9: Rapid Pincode Changes (Debounce Test)
**Steps:**
1. Quickly type: `6`, `3`, `1`, `2`, `0`, `9` (each keystroke rapid)
2. Monitor network tab
3. Verify: **Only ONE API call** made (debounce working) ✓
4. Auto-fill populates correctly

---

### Test 10: Form Validation
**Steps:**
1. Try to save address without:
   - Full Name: Toast "Please fill required fields"
   - Phone: Toast "Please fill required fields"
   - Address Line 1: Toast "Please fill required fields"
   - Pincode: Toast "Please fill required fields"

---

## Display Tests

### Test 11: Address Card Display (Save)
**Expected on Address Card:**
```
John Doe
123 Main Street, Tiruttani - 631209
+91 7358803372
```
Note: Phone shows with +91 prefix for readability

---

### Test 12: Order Detail Display
**Expected in Order Detail page:**
```
Delivery Address:
John Doe
123 Main Street
Tiruttani, Tamil Nadu - 631209
+91 7358803372
```

---

### Test 13: PDF Invoice Download
**Steps:**
1. Place an order with new address format
2. Download Invoice PDF
3. Verify phone displays as: `+91 7358803372` (formatted)

---

## Edge Cases

### Test 14: Special Characters in City
**If Pincode API returns:**
```json
"Block": "Tiruppur / Thirpupur"
```
**Expected:** Field shows exactly as returned (no filtering)

---

### Test 15: All PostOffice Items Have Block="NA"
**Steps:**
1. Find/mock a pincode where all Block values are "NA"
2. Verify: City gets populated from District (fallback logic)
3. App doesn't crash

---

### Test 16: Empty PostOffice Array
**Steps:**
1. Find/mock a pincode with empty PostOffice array
2. Verify: Toast "Invalid pincode"
3. Fields don't auto-fill incorrectly

---

### Test 17: Different Country Codes
**Steps:**
1. Add address with +971 (UAE)
2. Enter phone: `501234567` (9 digits for UAE)
3. Save
4. Edit: Dropdown shows `+971`, input shows `501234567`
5. Change to +44 (UK), enter `2071838750` (10 digits)
6. Save and verify database

---

## Performance Tests

### Test 18: Loading State Visual Feedback
**While Pincode Loading:**
- [ ] Spinner animates in all 4 fields (Area, City, District, State)
- [ ] All 4 fields are disabled (can't type)
- [ ] User sees clear loading feedback
- [ ] After fetch: Fields become enabled, values populate

---

### Test 19: Debounce Performance
**Steps:**
1. Open Network tab in Dev Tools
2. Type full pincode: `631209`
3. Count API calls: **Should be exactly 1** (not 6 for each digit)

---

## Cleanup After Testing

### Database Check
```sql
-- Verify no phone numbers contain country code prefix
SELECT phone FROM addresses 
WHERE phone LIKE '+%' 
   OR phone LIKE ' %'
   OR LENGTH(phone) > 15;
-- Should return: 0 rows

-- Verify phone column has expected format
SELECT phone FROM addresses LIMIT 5;
-- Expected: All are digit-only strings like "7358803372"
```

---

## Demo Script (For Stakeholders)

1. **Show Pincode Magic**
   - Type `631209` → Watch auto-fill populate 4 fields instantly ✨
   
2. **Show Phone Handling**
   - Add new address with phone in format: `+91-7358803372`
   - Saved without duplication
   - Edit existing: Shows clean dropdown + digits
   
3. **Show Backward Compatibility**
   - Old record with country code loads correctly
   - No duplication bugs
   - Edits save in new format

4. **Show Error Handling**
   - Invalid pincode: Professional error toast
   - Phone too long: Clear validation message

---

## Notes

- **Debounce Duration:** 300ms is optimal (not too fast, not too slow)
- **Test with Real Pincodes:** Use India pincodes for testing
- **Browser Cache:** Clear cache if pincode lookups seem offline
- **API Rate Limit:** postalpincode.in allows ~100 requests/second

---

**After passing all tests, mark as PRODUCTION READY**
