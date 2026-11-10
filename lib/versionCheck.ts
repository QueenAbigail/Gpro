// lib/versionCheck.ts

export const needsNativeUpdate = (localVersion: string, serverVersion: string): boolean => {
  if (!localVersion || !serverVersion) return false;

  const parseVersion = (v: string) =>
    v
      .replace(/^v/i, "")
      .trim()
      .split(".")
      .map((num) => Number(num) || 0);

  const [localMajor = 0, localMinor = 0, localPatch = 0] = parseVersion(localVersion);
  const [serverMajor = 0, serverMinor = 0, serverPatch = 0] = parseVersion(serverVersion);

  if (serverMajor > localMajor) return true;
  if (serverMajor < localMajor) return false;

  if (serverMinor > localMinor) return true;
  if (serverMinor < localMinor) return false;

  if (serverPatch > localPatch) return true;

  return false;
};
