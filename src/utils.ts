/**
 * Replace paths placeholders with channel names
 */
export function generateNixPathsChromium(paths: string[], channels: string[]) {
  const generatedPaths: string[] = [];

  for (const path of paths) {
    for (const channel of channels) {
      generatedPaths.push(path.replace('{channel}', channel));
    }
  }

  return generatedPaths;
}

/**
 * Replace paths placeholders with channel names for Windows paths
 */
export function generateWinPathsChromium(paths: string[], channels: string[]) {
  const generatedPaths: string[] = [];

  for (const path of paths) {
    for (const channel of channels) {
      generatedPaths.push(path.replace('{channel}', channel));
    }
  }

  return generatedPaths;
}
