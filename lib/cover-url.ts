export function getCoverUrl(path?: string | null): string | null {
  if (!path) return null;
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return baseUrl
    ? `${baseUrl}/storage/v1/object/public/covers/${path.split("/").map(encodeURIComponent).join("/")}`
    : null;
}
