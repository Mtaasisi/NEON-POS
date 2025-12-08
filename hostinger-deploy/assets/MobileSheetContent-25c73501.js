import{j as e}from"./index-61458a34.js";import{r as c}from"./vendor-36d2c7c1.js";import{b as p,v as f}from"./ui-28e30067.js";const y=({isOpen:t,onClose:s,title:i,subtitle:a="",leftButtonText:l="Cancel",leftButtonDisabled:n=!1,rightButtonText:r="Add",rightButtonDisabled:o=!1,onRightButtonClick:d,children:x})=>(c.useEffect(()=>(t?document.body.style.overflow="hidden":document.body.style.overflow="",()=>{document.body.style.overflow=""}),[t]),t?e.jsxs(e.Fragment,{children:[e.jsx("div",{className:"fixed inset-0 bg-black/40 z-40 animate-fade-in",onClick:s}),e.jsx("div",{className:"fixed inset-0 z-50 pointer-events-none flex items-end",children:e.jsxs("div",{className:"w-full bg-white pointer-events-auto animate-slide-up-sheet",style:{height:"calc(100vh - 40px)",borderTopLeftRadius:"20px",borderTopRightRadius:"20px",boxShadow:"0 -2px 20px rgba(0, 0, 0, 0.1)",display:"flex",flexDirection:"column"},children:[e.jsx("div",{className:"flex-shrink-0 border-b border-gray-200 bg-white",style:{borderTopLeftRadius:"20px",borderTopRightRadius:"20px",paddingTop:"12px",paddingBottom:"12px",paddingLeft:"16px",paddingRight:"16px"},children:e.jsxs("div",{className:"flex items-center justify-between",style:{height:"44px"},children:[e.jsx("button",{onClick:s,disabled:n,className:"text-blue-500 disabled:opacity-50 min-w-[70px] text-left",style:{fontSize:"17px",fontWeight:"400",letterSpacing:"-0.41px"},children:l}),e.jsxs("div",{className:"flex-1 text-center px-4",children:[e.jsx("div",{className:"font-semibold text-gray-900 leading-tight",style:{fontSize:"17px",letterSpacing:"-0.41px"},children:i}),a&&e.jsx("div",{className:"text-gray-500 mt-0.5",style:{fontSize:"11px",fontWeight:"400",letterSpacing:"-0.07px"},children:a})]}),e.jsx("button",{onClick:d||s,disabled:o,className:`min-w-[70px] text-right transition-colors ${o?"text-gray-400":"text-blue-500"}`,style:{fontSize:"17px",fontWeight:"400",letterSpacing:"-0.41px"},children:r})]})}),e.jsx("div",{className:"flex-1 overflow-y-auto bg-white",style:{overscrollBehavior:"contain"},children:x}),e.jsx("div",{className:"flex-shrink-0 bg-white",style:{paddingTop:"8px",paddingBottom:"8px"},children:e.jsx("div",{className:"mx-auto bg-gray-300 rounded-full",style:{width:"134px",height:"5px"}})})]})}),e.jsx("style",{children:`
        @keyframes slide-up-sheet {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }

        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        .animate-slide-up-sheet {
          animation: slide-up-sheet 0.4s cubic-bezier(0.32, 0.72, 0, 1);
        }

        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }

        /* Smooth scrolling on iOS */
        .overflow-y-auto {
          -webkit-overflow-scrolling: touch;
        }

        /* Hide scrollbar but keep functionality */
        .overflow-y-auto::-webkit-scrollbar {
          display: none;
        }
        .overflow-y-auto {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `})]}):null),b=({placeholder:t,value:s,onChange:i,type:a="text",disabled:l=!1,autoFocus:n=!1})=>e.jsx("div",{style:{padding:"14px 16px"},children:e.jsx("input",{type:a,placeholder:t,value:s,onChange:r=>i(r.target.value),disabled:l,autoFocus:n,className:"w-full outline-none bg-transparent border-0 p-0 disabled:text-gray-400",style:{fontSize:"17px",fontWeight:"400",color:s?"#000000":"#C7C7CC",letterSpacing:"-0.41px"}})}),u=({children:t})=>e.jsx("div",{className:"divide-y divide-gray-200",children:t}),v=({label:t,value:s,onClick:i})=>e.jsx("div",{onClick:i,className:i?"cursor-pointer active:bg-gray-50":"",style:{padding:"14px 16px"},children:e.jsxs("div",{className:"flex items-center justify-between",children:[e.jsx("span",{className:"text-gray-900",style:{fontSize:"17px",fontWeight:"400",letterSpacing:"-0.41px"},children:t}),e.jsx("span",{className:"text-gray-900 font-semibold",style:{fontSize:"17px",letterSpacing:"-0.41px"},children:s})]})}),j=()=>e.jsx("div",{style:{height:"8px",backgroundColor:"#F2F2F7"}}),S=({title:t,subtitle:s,isOpen:i,onToggle:a,children:l})=>e.jsxs("div",{className:"border-t border-b border-gray-200",children:[e.jsxs("button",{type:"button",onClick:a,className:"w-full flex items-center justify-between active:bg-gray-50 transition-colors",style:{padding:"14px 16px"},children:[e.jsxs("div",{className:"flex-1 text-left",children:[e.jsx("div",{className:"text-gray-900 font-semibold",style:{fontSize:"17px",letterSpacing:"-0.41px"},children:t}),e.jsx("div",{className:"text-gray-500 mt-1",style:{fontSize:"13px",fontWeight:"400",letterSpacing:"-0.08px"},children:s})]}),e.jsx(p,{size:20,className:`text-gray-400 transition-transform ml-3 flex-shrink-0 ${i?"rotate-180":""}`,strokeWidth:2.5})]}),i&&l&&e.jsx("div",{className:"border-t border-gray-200",children:l})]}),N=({title:t,subtitle:s,onClick:i})=>e.jsx("div",{className:"border-t border-b border-gray-200",children:e.jsxs("button",{type:"button",onClick:i,className:"w-full flex items-center justify-between active:bg-gray-50 transition-colors",style:{padding:"14px 16px"},children:[e.jsxs("div",{className:"flex-1 text-left",children:[e.jsx("div",{className:"text-gray-900 font-semibold",style:{fontSize:"17px",letterSpacing:"-0.41px"},children:t}),e.jsx("div",{className:"text-gray-500 mt-1",style:{fontSize:"13px",fontWeight:"400",letterSpacing:"-0.08px"},children:s})]}),e.jsx(f,{size:22,className:"text-gray-400 ml-3 flex-shrink-0",strokeWidth:2})]})}),w=({height:t=80})=>e.jsx("div",{style:{height:`${t}px`}});export{y as M,u as S,b as a,j as b,S as c,w as d,v as e,N as f};
