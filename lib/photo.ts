export const photoUrl = (name: string | null | undefined) => (name ? `/api/photos/${name}` : null);
