import{j as t}from"./index-61458a34.js";import{r as l}from"./vendor-36d2c7c1.js";import{v as b}from"./ui-28e30067.js";const C=({onSearch:r,placeholder:c="Search by Device ID",className:i="",suggestions:n=[],searchKey:x="default_search"})=>{const[s,u]=l.useState(""),[y,o]=l.useState(!1);s&&n.length>0&&n.filter(e=>e.toLowerCase().includes(s.toLowerCase())).slice(0,8);const m=l.useCallback((()=>{let e;return a=>{clearTimeout(e);const f=a.length>=3?200:400;e=setTimeout(()=>{r(a)},f)}})(),[r]),d=e=>{e.preventDefault(),r(s),o(!1)},p=e=>{const a=e.target.value;u(a),o(!0),m(a)},h=()=>{u(""),r(""),o(!1)};return t.jsx("form",{onSubmit:d,className:`relative ${i}`,autoComplete:"off",children:t.jsxs("div",{className:"relative",children:[t.jsx("input",{type:"text",value:s,onChange:p,onFocus:()=>{},onBlur:()=>setTimeout(()=>o(!1),120),placeholder:c,className:`
            w-full py-2 sm:py-3 pl-10 sm:pl-12 pr-10 
            bg-white/20 backdrop-blur-md
            border border-white/30 rounded-lg
            text-gray-800 placeholder-gray-500 text-sm sm:text-base
            focus:outline-none focus:ring-2 focus:ring-blue-500/50
            transition-all duration-300
          `}),t.jsx("span",{className:"absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500",children:t.jsx(b,{size:18,className:"sm:w-5 sm:h-5"})}),s&&t.jsx("button",{type:"button",onClick:h,className:"absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none",tabIndex:-1,"aria-label":"Clear search",children:"✕"})]})})};export{C as S};
