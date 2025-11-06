/**
 * Expo Push Notification Service
 * Sends push notifications via Expo's Push Notification API
 */

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

/**
 * Send push notification to Expo push token
 * @param {string} pushToken - Expo push token (ExponentPushToken[...])
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {object} data - Additional data payload
 */
export const sendExpoPushNotification = async (
  pushToken,
  title,
  body,
  data = {}
) => {
  if (!pushToken) {
    console.warn("[PUSH] No push token provided");
    return false;
  }

  try {
    const response = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-Encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: pushToken,
        sound: "default",
        title,
        body,
        data,
        priority: "high",
        channelId: "default",
      }),
    });

    const result = await response.json();
    if (result.data?.status === "ok") {
      console.log(`✅ [PUSH] Sent to ${pushToken.substring(0, 20)}...`);
      return true;
    } else {
      console.warn(`⚠️ [PUSH] Failed:`, result.data);
      return false;
    }
  } catch (error) {
    console.error(`❌ [PUSH] Error sending notification:`, error.message);
    return false;
  }
};

/**
 * Send push notification to multiple tokens
 */
export const sendExpoPushNotifications = async (
  tokens,
  title,
  body,
  data = {}
) => {
  if (!tokens || tokens.length === 0) {
    return { success: 0, failed: 0 };
  }

  // Filter out invalid tokens
  const validTokens = tokens.filter((t) => t && typeof t === "string");

  if (validTokens.length === 0) {
    return { success: 0, failed: 0 };
  }

  try {
    const messages = validTokens.map((token) => ({
      to: token,
      sound: "default",
      title,
      body,
      data,
      priority: "high",
      channelId: "default",
    }));

    const response = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-Encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(messages),
    });

    const results = await response.json();
    const success = results.data?.filter((r) => r.status === "ok").length || 0;
    const failed = validTokens.length - success;

    console.log(
      `📱 [PUSH] Sent ${success}/${validTokens.length} notifications`
    );
    return { success, failed };
  } catch (error) {
    console.error(`❌ [PUSH] Batch error:`, error.message);
    return { success: 0, failed: validTokens.length };
  }
};
