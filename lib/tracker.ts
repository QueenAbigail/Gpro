import { getDeviceMetadataString, getUniqueDeviceId } from "./device";

interface ExtraTrackerData {
  action?: string;
  latitude?: number | null;
  longitude?: number | null;
  isMockLocation?: boolean;
  distance?: number | null;
}

export const sendActivityLog = async (
  resultStatus: string,
  token: string | null = null,
  currentEmail: string,
  extraData?: ExtraTrackerData,
) => {
  try {
    const baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
    if (!baseUrl) {
      console.warn("API_BASE_URL belum diatur di .env");
      return;
    }

    const userAgentStr = getDeviceMetadataString();
    const deviceIdStr = await getUniqueDeviceId();

    const headers: any = { "Content-Type": "application/json" };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    // Susun payload dasar
    const payload: any = {
      email: currentEmail,
      channel: "MOBILE",
      result: resultStatus,
      deviceId: deviceIdStr,
      userAgent: userAgentStr,
    };

    // Masukin extra data dari absen
    if (extraData) {
      if (extraData.action) payload.action = extraData.action;
      if (extraData.latitude !== undefined)
        payload.latitude = extraData.latitude;
      if (extraData.longitude !== undefined)
        payload.longitude = extraData.longitude;
      if (extraData.isMockLocation !== undefined)
        payload.isMockLocation = extraData.isMockLocation;
      if (extraData.distance !== undefined)
        payload.distance = extraData.distance;
    }

    // Tembak ke API
    await fetch(`${baseUrl}/api/auth/mobile/activity`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });
  } catch (error: any) {
    console.error("Gagal mengirim activity log:", error.message);
  }
};
