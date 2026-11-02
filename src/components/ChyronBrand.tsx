import logo from "../assets/chyron.svg";
import "./ChyronBrand.css";
export default function ChyronBrand() {
  return (
    <a className="chyron-brand" href="/">
      <img src={logo} alt="" width={22} height={22} />
      <span>Chyron</span>
    </a>
  );
}
