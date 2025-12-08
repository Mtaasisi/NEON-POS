import{j as e,e as D,G as h,g as S}from"./index-61458a34.js";import{r as n}from"./vendor-36d2c7c1.js";import{n as a}from"./ui-28e30067.js";import{u as F}from"./useBodyScrollLock-341c8b9f.js";const J=({open:N,onClose:y,customers:A,onSend:M,sending:b=!1})=>{const[c,w]=n.useState("all"),[d,P]=n.useState("all"),[m,z]=n.useState("all"),[x,p]=n.useState(""),[r,L]=n.useState(!1),[v,T]=n.useState(""),[u,g]=n.useState(!1),[j,C]=n.useState([]),[I,k]=n.useState("");F(N);const o=n.useMemo(()=>A.filter(s=>{let t=!0;return c!=="all"&&(t=t&&s.loyaltyLevel===c),d!=="all"&&(t=t&&(d==="active"?s.isActive:!s.isActive)),m!=="all"&&(t=t&&s.colorTag===m),t}),[A,c,d,m]),G=async()=>{if(!v.trim()){a.error("Please enter a prompt for AI message generation");return}g(!0);try{const t=`${`Generate SMS messages for ${o.length} customers in a device repair and sales business.
      
Customer Segment Info:
- Loyalty Level: ${c==="all"?"Mixed":c}
- Status: ${d==="all"?"Mixed":d}
- Tag: ${m==="all"?"Mixed":m}
- Total Customers: ${o.length}

Business Context:
- Device repair and sales business
- Professional but friendly tone
- Quick response times
- Technical expertise available
- Customer service focused

Requirements:
- Generate 3 different message variations
- Each message should be under 160 characters
- Professional and friendly tone
- Address the specific prompt/context
- Include call-to-action if appropriate
- Use simple language (Swahili/English mix is okay)`}

Your prompt: ${v}

Generate 3 SMS message variations:`,l=await S.chat([{role:"user",content:t}]);if(l.success&&l.data){const i=l.data.split(`
`).filter(f=>f.trim().length>0&&f.trim().length<200).map(f=>f.replace(/^\d+\.\s*/,"").trim()).slice(0,3);C(i),a.success("AI generated message suggestions!")}else a.error("Failed to generate AI suggestions")}catch(s){console.error("AI generation error:",s),a.error("Error generating AI suggestions")}finally{g(!1)}},$=async()=>{if(o.length===0){a.error("No customers selected for analysis");return}g(!0);try{const s=o.map(i=>({name:i.name,loyaltyLevel:i.loyaltyLevel,totalSpent:i.totalSpent,points:i.points,colorTag:i.colorTag,isActive:i.isActive})),t=`Analyze this customer segment for a device repair and sales business:

Customer Data: ${JSON.stringify(s,null,2)}

Please provide:
1. Key insights about this customer segment
2. Recommended messaging approach
3. Best time to contact them
4. Potential offers or promotions
5. Risk factors to consider

Keep response concise and actionable.`,l=await S.chat([{role:"user",content:t}]);l.success&&l.data?(a.success("Customer insights generated! Check console for details."),console.log("AI Customer Insights:",l.data)):a.error("Failed to generate customer insights")}catch(s){console.error("Customer insights error:",s),a.error("Error generating customer insights")}finally{g(!1)}},E=async()=>{if(o.length===0){a.error("No customers selected");return}g(!0);try{const s=o[0],t=`Generate a personalized SMS template for a device repair business customer:

Customer Info:
- Name: ${s.name}
- Loyalty Level: ${s.loyaltyLevel}
- Total Spent: ${s.totalSpent}
- Points: ${s.points}
- Tag: ${s.colorTag}

Business Context:
- Device repair and sales
- Professional but friendly tone
- Include customer's name and loyalty level
- Make it personal and relevant

Generate a personalized message template with placeholders like {name}, {loyaltyLevel}, {totalSpent}, {points}.`,l=await S.chat([{role:"user",content:t}]);l.success&&l.data?(p(l.data.trim()),a.success("Personalized message template generated!")):a.error("Failed to generate personalized template")}catch(s){console.error("Personalized message error:",s),a.error("Error generating personalized template")}finally{g(!1)}},B=()=>{if(!x.trim())return;M(o,I||x),p(""),k(""),C([]),y()},R=s=>{k(s),p(s)};return N?e.jsx("div",{className:"fixed inset-0 z-50 flex items-center justify-center bg-black/30",children:e.jsxs(D,{className:"w-full max-w-4xl p-6 relative max-h-[90vh] overflow-y-auto",children:[e.jsx("button",{className:"absolute top-3 right-3 text-gray-400 hover:text-gray-700",onClick:y,children:"×"}),e.jsx("h2",{className:"text-xl font-bold mb-4 text-gray-900",children:"AI-Powered Bulk SMS"}),e.jsx("div",{className:"mb-4",children:e.jsxs("div",{className:"flex items-center gap-4",children:[e.jsxs("label",{className:"flex items-center gap-2",children:[e.jsx("input",{type:"checkbox",checked:r,onChange:s=>L(s.target.checked),className:"rounded"}),e.jsx("span",{className:"text-sm font-medium",children:"🤖 Enable AI Features"})]}),r&&e.jsxs("div",{className:"flex gap-2",children:[e.jsx(h,{size:"sm",variant:"secondary",onClick:$,disabled:u,children:u?"Analyzing...":"📊 Customer Insights"}),e.jsx(h,{size:"sm",variant:"secondary",onClick:E,disabled:u,children:u?"Generating...":"👤 Personalized Template"})]})]})}),e.jsxs("div",{className:"grid grid-cols-1 md:grid-cols-3 gap-3 mb-4",children:[e.jsxs("div",{children:[e.jsx("label",{className:"block text-sm font-medium text-gray-700 mb-1",children:"Loyalty"}),e.jsxs("select",{className:"w-full rounded-lg border-gray-300",value:c,onChange:s=>w(s.target.value),children:[e.jsx("option",{value:"all",children:"All"}),e.jsx("option",{value:"vip",children:"VIP"}),e.jsx("option",{value:"premium",children:"Premium"}),e.jsx("option",{value:"regular",children:"Regular"}),e.jsx("option",{value:"active",children:"Active"}),e.jsx("option",{value:"payment_customer",children:"Payment Customer"}),e.jsx("option",{value:"engaged",children:"Engaged"}),e.jsx("option",{value:"interested",children:"Interested"})]})]}),e.jsxs("div",{children:[e.jsx("label",{className:"block text-sm font-medium text-gray-700 mb-1",children:"Status"}),e.jsxs("select",{className:"w-full rounded-lg border-gray-300",value:d,onChange:s=>P(s.target.value),children:[e.jsx("option",{value:"all",children:"All"}),e.jsx("option",{value:"active",children:"Active"}),e.jsx("option",{value:"inactive",children:"Inactive"})]})]}),e.jsxs("div",{children:[e.jsx("label",{className:"block text-sm font-medium text-gray-700 mb-1",children:"Tag"}),e.jsxs("select",{className:"w-full rounded-lg border-gray-300",value:m,onChange:s=>z(s.target.value),children:[e.jsx("option",{value:"all",children:"All"}),e.jsx("option",{value:"vip",children:"VIP"}),e.jsx("option",{value:"new",children:"New"}),e.jsx("option",{value:"complainer",children:"Complainer"})]})]})]}),r&&e.jsxs("div",{className:"mb-4 p-4 bg-blue-50 rounded-lg",children:[e.jsx("h3",{className:"text-sm font-medium text-blue-800 mb-2",children:"🤖 AI Message Generation"}),e.jsxs("div",{className:"space-y-3",children:[e.jsxs("div",{children:[e.jsx("label",{className:"block text-sm font-medium text-blue-700 mb-1",children:"AI Prompt"}),e.jsx("textarea",{className:"w-full rounded-lg border-gray-300 min-h-[60px]",value:v,onChange:s=>T(s.target.value),placeholder:"Describe what kind of message you want to send (e.g., 'Promote our new phone repair service', 'Thank loyal customers', 'Announce special discount')"})]}),e.jsx(h,{onClick:G,disabled:u||!v.trim(),className:"w-full",children:u?"🤖 Generating...":"🤖 Generate AI Suggestions"}),j.length>0&&e.jsxs("div",{className:"space-y-2",children:[e.jsx("label",{className:"block text-sm font-medium text-blue-700",children:"AI Suggestions:"}),j.map((s,t)=>e.jsxs("div",{className:`p-2 rounded border cursor-pointer transition-colors ${I===s?"border-blue-500 bg-blue-100":"border-gray-200 hover:border-blue-300"}`,onClick:()=>R(s),children:[e.jsx("div",{className:"text-sm text-gray-700",children:s}),e.jsxs("div",{className:"text-xs text-gray-500 mt-1",children:[s.length," characters"]})]},t))]})]})]}),e.jsxs("div",{className:"mb-4",children:[e.jsxs("label",{className:"block text-sm font-medium text-gray-700 mb-1",children:["Message ",r&&"(AI-enhanced)"]}),e.jsx("textarea",{className:"w-full rounded-lg border-gray-300 min-h-[80px]",value:x,onChange:s=>p(s.target.value),placeholder:r?"Type your message or use AI suggestions above... (Use {name}, {loyaltyLevel}, {totalSpent}, {points} for personalization)":"Type your SMS message here...",maxLength:320}),r&&e.jsxs("div",{className:"text-xs text-gray-500 mt-1",children:["💡 Personalization variables: ","{name}",", ","{loyaltyLevel}",", ","{totalSpent}",", ","{points}"]})]}),e.jsxs("div",{className:"flex items-center justify-between mb-4",children:[e.jsxs("div",{className:"space-y-1",children:[e.jsxs("span",{className:"text-sm text-gray-600",children:["Recipients: ",e.jsx("b",{children:o.length})]}),r&&e.jsxs("div",{className:"text-xs text-blue-600",children:["🤖 AI Features: ",j.length>0?"Suggestions available":"Ready to generate"]})]}),e.jsxs("span",{className:"text-xs text-gray-400",children:[x.length,"/320"]})]}),e.jsxs("div",{className:"flex gap-2 justify-end",children:[e.jsx(h,{variant:"secondary",onClick:y,disabled:b,children:"Cancel"}),e.jsx(h,{onClick:B,disabled:b||!x.trim()||o.length===0,className:r?"bg-gradient-to-r from-blue-500 to-purple-600":"",children:b?"Sending...":r?"🤖 Send AI-Enhanced SMS":"Send SMS"})]}),r&&e.jsx("div",{className:"mt-4 p-3 bg-green-50 rounded-lg",children:e.jsxs("div",{className:"flex items-center gap-2 text-sm text-green-700",children:[e.jsx("span",{children:"🤖"}),e.jsx("span",{children:"AI-powered features enabled. Messages will be personalized automatically."})]})})]})}):null};export{J as B};
