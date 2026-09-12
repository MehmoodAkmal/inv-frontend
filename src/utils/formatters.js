/**
 * Capitalizes category name so the first letter is capitalized (Title Case).
 * Even if the user entered all small letters (e.g. "rice"), it will display as "Rice".
 * Handles multi-word names smoothly (e.g. "cooking oil" -> "Cooking Oil").
 */
export const formatCategoryName = (name) => {
  if (!name || typeof name !== 'string') return '';
  const trimmed = name.trim();
  if (!trimmed) return '';
  return trimmed.replace(/\b([a-z])/g, (char) => char.toUpperCase());
};
