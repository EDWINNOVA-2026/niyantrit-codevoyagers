import { ImgHTMLAttributes, useState } from "react";

const placeholder =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='640' height='360' viewBox='0 0 640 360'>
      <defs>
        <linearGradient id='g' x1='0' x2='1' y1='0' y2='1'>
          <stop offset='0%' stop-color='#dbeafe'/>
          <stop offset='100%' stop-color='#f5f3ff'/>
        </linearGradient>
      </defs>
      <rect width='640' height='360' fill='url(#g)'/>
      <circle cx='320' cy='160' r='48' fill='#2563eb' fill-opacity='0.15'/>
      <path d='M280 210h80' stroke='#1f2937' stroke-width='10' stroke-linecap='round'/>
      <text x='320' y='270' text-anchor='middle' fill='#1f2937' font-size='20' font-family='Arial'>Image unavailable</text>
    </svg>`
  );

type Props = ImgHTMLAttributes<HTMLImageElement>;

function ImageWithFallback(props: Props) {
  const [failed, setFailed] = useState(false);

  return (
    <img
      {...props}
      src={failed ? placeholder : props.src}
      onError={() => setFailed(true)}
      alt={props.alt || "Project image"}
    />
  );
}

export default ImageWithFallback;
