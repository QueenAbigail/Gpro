// lib/versionCheck.ts

export const needsNativeUpdate = (localVersion: string, serverVersion: string): boolean => {
  if (!localVersion || !serverVersion) return false;

  const [localMajor, localMinor] = localVersion.split(".").map(Number);
  const [serverMajor, serverMinor] = serverVersion.split(".").map(Number);

  if (serverMajor > localMajor) return true;
  if (serverMajor === localMajor && serverMinor > localMinor) return true;

  return false;
};