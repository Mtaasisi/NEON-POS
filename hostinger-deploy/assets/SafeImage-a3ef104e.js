import{j as h}from"./index-61458a34.js";import{r as o}from"./vendor-36d2c7c1.js";const p=["via.placeholder.com","placehold.it","placehold.co","dummyimage.com","picsum.photos","lorempixel.com","loremflickr.com"];function c(t=400,e=400,s="Image"){const r=`
    <svg width="${t}" height="${e}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#f3f4f6"/>
      <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="16" fill="#6b7280" text-anchor="middle" dy=".3em">
        ${s}
      </text>
    </svg>
  `;return`data:image/svg+xml;base64,${btoa(r)}`}function I(t){if(!t)return!0;try{const e=new URL(t);return p.some(s=>e.hostname.includes(s))}catch{return!0}}function v(t){if(!t)return!1;try{const e=new URL(t),s=["http:","https:","data:"],r=[".jpg",".jpeg",".png",".gif",".webp",".svg"];return s.includes(e.protocol)?e.protocol==="data:"?t.includes("image/"):r.some(a=>e.pathname.toLowerCase().includes(a)):!1}catch{return!1}}function w(t,e="Image"){return!t||I(t)||!v(t)?c(400,400,e):t}function E(t,e="Image"){const s=t.target;s&&(s.src=c(400,400,e),s.alt=e)}const y=({src:t,alt:e,className:s="",width:r,height:m,fallbackText:a,onError:i,onLoad:n})=>{const[g,x]=o.useState(()=>w(t,a||e)),[S,l]=o.useState(!1),f=o.useCallback(d=>{l(!0),E(d,a||e),i==null||i(new Error("Image failed to load"))},[a,e,i]),u=o.useCallback(()=>{l(!1),n==null||n()},[n]);return h.jsx("img",{src:g,alt:e,className:s,width:r,height:m,onError:f,onLoad:u,style:{objectFit:"cover",backgroundColor:"#f3f4f6"}})};export{y as S};
