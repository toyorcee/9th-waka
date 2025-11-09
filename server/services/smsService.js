/**
 * SMS Service for sending text messages
 * Supports multiple providers (Twilio, Termii, etc.)
 */

/**
 * Send SMS using configured provider
 * @param {string} phoneNumber - Phone number in international format (+234...)
 * @param {string} message - Message to send
 */
export const sendSMS = async (phoneNumber, message) => {
  // Skip SMS in dev mode if SKIP_SMS is set
  if (process.env.SKIP_SMS === "true") {
    console.log("📱 [SMS] Skipped (SKIP_SMS=true)");
    console.log("   To:", phoneNumber);
    console.log("   Message:", message);
    return Promise.resolve();
  }

  const provider = (process.env.SMS_PROVIDER || "termii").toLowerCase();

  try {
    switch (provider) {
      case "termii":
        return await sendViaTermii(phoneNumber, message);
      case "twilio":
        return await sendViaTwilio(phoneNumber, message);
      default:
        console.warn(`📱 [SMS] Unknown provider: ${provider}`);
        return Promise.resolve();
    }
  } catch (error) {
    console.error("📱 [SMS] Error sending SMS:", error.message);
    throw error;
  }
};

/**
 * Send SMS via Termii (Nigerian SMS provider)
 */
const sendViaTermii = async (phoneNumber, message) => {
  const apiKey = process.env.TERMII_API_KEY;
  const senderId = process.env.TERMII_SENDER_ID || "9thWaka";

  if (!apiKey) {
    console.log("📱 [SMS] Termii not configured (TERMII_API_KEY missing)");
    return Promise.resolve();
  }

  // Format phone number (remove + if present, ensure it starts with 234)
  let formattedNumber = phoneNumber.replace(/^\+/, "");
  if (!formattedNumber.startsWith("234")) {
    formattedNumber = "234" + formattedNumber;
  }

  try {
    const response = await fetch("https://api.termii.com/api/sms/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: formattedNumber,
        from: senderId,
        sms: message,
        type: "plain",
        channel: "generic",
        api_key: apiKey,
      }),
    });

    const data = await response.json();

    if (response.ok && data.code === "ok") {
      console.log(`📱 [SMS] Sent via Termii to ${phoneNumber}`);
      return true;
    } else {
      console.warn(`📱 [SMS] Termii error:`, data.message || "Unknown error");
      return false;
    }
  } catch (error) {
    console.error("📱 [SMS] Termii request failed:", error.message);
    throw error;
  }
};

/**
 * Send SMS via Twilio
 */
const sendViaTwilio = async (phoneNumber, message) => {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !fromNumber) {
    console.log("📱 [SMS] Twilio not configured (TWILIO_* missing)");
    return Promise.resolve();
  }

  try {
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${Buffer.from(
            `${accountSid}:${authToken}`
          ).toString("base64")}`,
        },
        body: new URLSearchParams({
          To: phoneNumber,
          From: fromNumber,
          Body: message,
        }),
      }
    );

    const data = await response.json();

    if (response.ok && data.sid) {
      console.log(`📱 [SMS] Sent via Twilio to ${phoneNumber}`);
      return true;
    } else {
      console.warn(`📱 [SMS] Twilio error:`, data.message || "Unknown error");
      return false;
    }
  } catch (error) {
    console.error("📱 [SMS] Twilio request failed:", error.message);
    throw error;
  }
};
