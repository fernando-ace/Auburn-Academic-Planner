export const SUPPORTED_NODE_MAJOR = 22;

export function getNodeMajor(version = process.versions.node): number | null {
  const match = /^(\d+)\./.exec(version.trim());
  if (!match) {
    return null;
  }

  const major = Number(match[1]);
  return Number.isSafeInteger(major) ? major : null;
}

export function isSupportedNodeRuntime(version = process.versions.node) {
  return getNodeMajor(version) === SUPPORTED_NODE_MAJOR;
}
