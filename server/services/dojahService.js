/**
 * Dojah KYC Verification Service
 *
 * This service handles NIN and BVN verification using Dojah API
 *
 * QUICK START (TESTING):
 * 1. Sign up at https://dojah.io (takes 2 minutes)
 * 2. You get IMMEDIATE access to SANDBOX environment (no waiting!)
 * 3. Go to Dashboard → Developers → Configuration
 * 4. Create an app and get your Sandbox API keys
 * 5. Add to server/.env:
 *    DOJAH_APP_ID=your_sandbox_app_id
 *    DOJAH_PUBLIC_KEY=your_sandbox_public_key
 *
 * SANDBOX vs LIVE:
 * - Sandbox: Free, immediate access, uses mock data for testing
 * - Live: Requires verification (24-72hrs), real verifications, pay-as-you-go
 *
 * For testing, use sandbox keys - they work immediately!
 */

const DOJAH_BASE_URL =
  process.env.DOJAH_BASE_URL || "https://api.dojah.io/api/v1";

/**
 * Verify NIN (National Identification Number)
 * @param {string} nin - The NIN to verify
 * @returns {Promise<{success: boolean, data?: any, error?: string}>}
 */
export const verifyNIN = async (nin) => {
  try {
    const appId = process.env.DOJAH_APP_ID;
    const publicKey = process.env.DOJAH_PUBLIC_KEY;

    if (!appId || !publicKey) {
      console.error("❌ [DOJAH] Missing API credentials");
      return {
        success: false,
        error: "Dojah API credentials not configured",
      };
    }

    if (!nin || nin.trim().length === 0) {
      return {
        success: false,
        error: "NIN is required",
      };
    }

    const response = await fetch(`${DOJAH_BASE_URL}/kyc/nin`, {
      method: "POST",
      headers: {
        AppId: appId,
        Authorization: publicKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        nin: nin.trim(),
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("❌ [DOJAH] NIN verification failed:", data);
      return {
        success: false,
        error: data.message || data.error || "NIN verification failed",
        data: data,
      };
    }

    // Check if verification was successful
    const isVerified = data?.entity?.nin && data?.entity?.firstname;

    console.log(
      `✅ [DOJAH] NIN verification ${isVerified ? "successful" : "failed"}:`,
      nin
    );

    return {
      success: isVerified,
      data: data?.entity || data,
      verified: isVerified,
    };
  } catch (error) {
    console.error("❌ [DOJAH] Error verifying NIN:", error);
    return {
      success: false,
      error: error.message || "Network error during NIN verification",
    };
  }
};

/**
 * Verify BVN (Bank Verification Number)
 * @param {string} bvn - The BVN to verify
 * @param {string} firstName - Optional: First name for additional verification
 * @param {string} lastName - Optional: Last name for additional verification
 * @returns {Promise<{success: boolean, data?: any, error?: string}>}
 */
export const verifyBVN = async (bvn, firstName = null, lastName = null) => {
  try {
    const appId = process.env.DOJAH_APP_ID;
    const publicKey = process.env.DOJAH_PUBLIC_KEY;

    if (!appId || !publicKey) {
      console.error("❌ [DOJAH] Missing API credentials");
      return {
        success: false,
        error: "Dojah API credentials not configured",
      };
    }

    if (!bvn || bvn.trim().length === 0) {
      return {
        success: false,
        error: "BVN is required",
      };
    }

    const requestBody = {
      bvn: bvn.trim(),
    };

    // Add optional name fields if provided
    if (firstName) requestBody.first_name = firstName;
    if (lastName) requestBody.last_name = lastName;

    const response = await fetch(`${DOJAH_BASE_URL}/kyc/bvn`, {
      method: "POST",
      headers: {
        AppId: appId,
        Authorization: publicKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("❌ [DOJAH] BVN verification failed:", data);
      return {
        success: false,
        error: data.message || data.error || "BVN verification failed",
        data: data,
      };
    }

    // Check if verification was successful
    const isVerified = data?.entity?.bvn && data?.entity?.first_name;

    console.log(
      `✅ [DOJAH] BVN verification ${isVerified ? "successful" : "failed"}:`,
      bvn
    );

    return {
      success: isVerified,
      data: data?.entity || data,
      verified: isVerified,
    };
  } catch (error) {
    console.error("❌ [DOJAH] Error verifying BVN:", error);
    return {
      success: false,
      error: error.message || "Network error during BVN verification",
    };
  }
};

/**
 * Verify either NIN or BVN (whichever is provided)
 * @param {string} nin - Optional NIN
 * @param {string} bvn - Optional BVN
 * @param {string} firstName - Optional first name for BVN verification
 * @param {string} lastName - Optional last name for BVN verification
 * @returns {Promise<{success: boolean, type?: 'nin'|'bvn', data?: any, error?: string}>}
 */
export const verifyIdentity = async (
  nin = null,
  bvn = null,
  firstName = null,
  lastName = null
) => {
  // Prioritize NIN if both are provided
  if (nin && nin.trim().length > 0) {
    const result = await verifyNIN(nin);
    return {
      ...result,
      type: "nin",
    };
  }

  if (bvn && bvn.trim().length > 0) {
    const result = await verifyBVN(bvn, firstName, lastName);
    return {
      ...result,
      type: "bvn",
    };
  }

  return {
    success: false,
    error: "Either NIN or BVN is required",
  };
};
