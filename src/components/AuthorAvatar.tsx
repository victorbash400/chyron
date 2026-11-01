import "./AuthorAvatar.css";
import { authorColor } from "../lib/authorColor.ts";
export { authorColor } from "../lib/authorColor.ts";
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
