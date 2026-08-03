export type MusicTrack = Readonly<{
  artist: string;
  fileName: string;
  title: string;
  url: string;
}>;

const musicFiles = import.meta.glob<string>(
  "./assets/music/*.{mp3,ogg,wav,m4a}",
  {
    eager: true,
    import: "default",
    query: "?url",
  },
);

function displayWords(value: string) {
  return value
    .split(/[_-]+/)
    .filter(Boolean)
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
    .join(" ");
}

export function trackFromAsset(path: string, url: string): MusicTrack {
  const fileName = path.split("/").at(-1) ?? path;
  const baseName = fileName
    .replace(/\.[^.]+$/, "")
    .replace(/-\d+$/, "");
  const separator = baseName.indexOf("-");
  const artistSlug = separator === -1 ? "Give or Take" : baseName.slice(0, separator);
  const titleSlug = separator === -1 ? baseName : baseName.slice(separator + 1);

  return {
    artist: displayWords(artistSlug),
    fileName,
    title: displayWords(titleSlug),
    url,
  };
}

export const MUSIC_TRACKS = Object.freeze(
  Object.entries(musicFiles)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([path, url]) => trackFromAsset(path, url)),
);
