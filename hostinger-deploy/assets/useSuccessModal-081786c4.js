import{aa as h,j as r}from"./index-61458a34.js";import{r as o,b as g}from"./vendor-36d2c7c1.js";import{u as y}from"./useBodyScrollLock-341c8b9f.js";import{X as x,u as v}from"./ui-28e30067.js";const S=({isOpen:t,onClose:c,title:d="Success!",message:s,actionButtons:l,icon:a,showCloseButton:i=!0,playSound:u=!0})=>{y(t);const m=s&&s.trim()!==""?s:"Operation completed successfully!";return o.useEffect(()=>{t&&(!s||s.trim()==="")&&console.warn("⚠️ SuccessModal: Empty message provided. Using fallback message.")},[t,s]),o.useEffect(()=>{t&&u&&h.playSuccessSound().catch(e=>{console.warn("Could not play success sound:",e)})},[t,u]),o.useEffect(()=>{const e=n=>{n.key==="Escape"&&t&&c()};if(t)return document.addEventListener("keydown",e),()=>document.removeEventListener("keydown",e)},[t,c]),t?g.createPortal(r.jsxs("div",{className:"fixed inset-0 z-[100000] flex items-center justify-center bg-black/40 animate-fadeIn p-4",onClick:e=>{e.target===e.currentTarget&&c()},children:[r.jsx("style",{children:`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes checkmark {
          0% {
            transform: scale(0);
            opacity: 0;
          }
          50% {
            transform: scale(1.1);
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }

        .animate-slideUp {
          animation: slideUp 0.3s ease-out;
        }

        .animate-checkmark {
          animation: checkmark 0.4s ease-out;
        }
      `}),r.jsxs("div",{className:"bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden relative animate-slideUp",onClick:e=>e.stopPropagation(),children:[i&&r.jsx("button",{onClick:e=>{e.stopPropagation(),e.preventDefault(),console.log("✖️ Success modal close button clicked"),c()},className:"absolute top-4 right-4 w-10 h-10 flex items-center justify-center bg-red-500 hover:bg-red-600 active:bg-red-700 text-white rounded-full transition-all shadow-lg hover:shadow-xl hover:scale-110 active:scale-95 z-50 cursor-pointer touch-manipulation","aria-label":"Close modal",type:"button",title:"Close",children:r.jsx(x,{className:"w-5 h-5",strokeWidth:2.5})}),r.jsxs("div",{className:"p-8 text-center transition-all duration-500 bg-gradient-to-br from-green-50 to-emerald-50",children:[r.jsx("div",{className:"w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 transition-all duration-500 animate-checkmark",style:{background:"linear-gradient(135deg, rgb(16, 185, 129) 0%, rgb(5, 150, 105) 100%)",boxShadow:"rgba(16, 185, 129, 0.3) 0px 8px 24px"},children:a||r.jsx(v,{className:"w-12 h-12 text-white",strokeWidth:2.5})}),r.jsx("h3",{className:"text-2xl font-bold text-gray-900",children:d})]}),r.jsx("div",{className:"p-6",children:r.jsx("p",{className:"text-center text-gray-600 leading-relaxed",children:m})}),l&&l.length>0&&r.jsx("div",{className:"p-6 pt-0",children:r.jsx("div",{className:"grid grid-cols-2 gap-3",children:l.map((e,n)=>r.jsx("button",{type:"button",onClick:f=>{f.stopPropagation(),e.disabled||(e.onClick(),c())},disabled:e.disabled,className:`
                    w-full px-6 py-3.5 rounded-xl transition-all font-semibold shadow-lg hover:shadow-xl active:scale-[0.98] text-lg
                    ${e.disabled?"bg-gray-300 text-gray-500 cursor-not-allowed opacity-60":"cursor-pointer"}
                    ${!e.disabled&&e.variant==="whatsapp"?"bg-green-600 hover:bg-green-700 active:bg-green-800 text-white":!e.disabled&&e.variant==="success"?"bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 active:from-emerald-800 active:to-emerald-900 text-white":!e.disabled&&e.variant==="secondary"?"bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 active:from-gray-800 active:to-gray-900 text-white":e.disabled?"":"bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 active:from-blue-800 active:to-blue-900 text-white"}
                  `,children:e.label},n))})})]})]}),document.body):null},j=()=>{const[t,c]=o.useState({isOpen:!1,message:"",title:"Success!",autoCloseDelay:3e3,showCloseButton:!0,playSound:!0}),d=o.useCallback((l,a)=>{const i=l&&l.trim()!==""?l:"Operation completed successfully!";(!l||l.trim()==="")&&console.warn("⚠️ useSuccessModal: Empty message provided. Using fallback message."),c({isOpen:!0,message:i,title:(a==null?void 0:a.title)||"Success!",autoCloseDelay:(a==null?void 0:a.autoCloseDelay)!==void 0?a.autoCloseDelay:3e3,actionButtons:a==null?void 0:a.actionButtons,icon:a==null?void 0:a.icon,showCloseButton:(a==null?void 0:a.showCloseButton)!==void 0?a.showCloseButton:!0,playSound:(a==null?void 0:a.playSound)!==void 0?a.playSound:!0})},[]),s=o.useCallback(()=>{c(l=>({...l,isOpen:!1}))},[]);return{show:d,hide:s,isOpen:t.isOpen,props:{isOpen:t.isOpen,onClose:s,message:t.message,title:t.title,autoCloseDelay:t.autoCloseDelay,actionButtons:t.actionButtons,icon:t.icon,showCloseButton:t.showCloseButton,playSound:t.playSound}}};export{S,j as u};
