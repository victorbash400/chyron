import "./AuthorAvatar.css";
const colors = [
  "#8150d6",
  "#cf4887",
  "#277eb0",
  "#369677",
  "#bf6b32",
  "#5369c2",
  "#b34e5a",
];
export function authorColor(id: string) {
  let hash = 0;
  for (const character of id)
    hash = (hash * 31 + character.codePointAt(0)!) >>> 0;
  return colors[hash % colors.length];
}
export default function AuthorAvatar({
  id,
  name,
}: {
  id: string;
  name: string;
}) {
  return (
    <span
      className="author-avatar"
      aria-hidden="true"
      style={{ background: authorColor(id) }}
    >
      {Array.from(name)[0]?.toLocaleUpperCase()}
    </span>
  );
}
