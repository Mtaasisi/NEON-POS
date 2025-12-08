import{am as y,s as o,an as b}from"./index-61458a34.js";async function E(t){const{data:n,error:e}=await o.from("store_locations").select("id, is_active").eq("id",t).single();if(e||!n)throw new Error(`Branch not found: ${t}`);if(!n.is_active)throw new Error("Branch is not active");return!0}async function k(t,n,e){const{data:a,error:r}=await o.rpc("check_duplicate_transfer",{p_from_branch_id:t,p_to_branch_id:n,p_entity_id:e});return r?(console.warn("⚠️ Could not check for duplicates:",r),!1):a===!0}const R=async(t,n)=>{try{console.log("📦 [stockTransferApi] Fetching transfers...",{branchId:t,status:n}),console.log("📦 [DEBUG] Branch ID type:",typeof t,"Value:",t),console.log("📦 [DEBUG] Branch ID empty?",!t||t==="");let e;t&&n&&n!=="all"?(console.log("📦 [DEBUG] Applying branch and status filters:",{branchId:t,status:n}),e=await y`
        SELECT 
          bt.*,
          json_build_object(
            'id', fb.id, 
            'name', fb.name, 
            'code', fb.code, 
            'city', fb.city, 
            'is_active', fb.is_active
          ) as from_branch,
          json_build_object(
            'id', tb.id, 
            'name', tb.name, 
            'code', tb.code, 
            'city', tb.city, 
            'is_active', tb.is_active
          ) as to_branch,
          json_build_object(
            'id', pv.id,
            'variant_name', pv.variant_name,
            'sku', pv.sku,
            'quantity', pv.quantity,
            'reserved_quantity', pv.reserved_quantity,
            'product_id', pv.product_id,
            'product', json_build_object(
              'id', p.id,
              'name', p.name,
              'sku', p.sku
            )
          ) as variant
        FROM branch_transfers bt
        LEFT JOIN store_locations fb ON bt.from_branch_id = fb.id
        LEFT JOIN store_locations tb ON bt.to_branch_id = tb.id
        LEFT JOIN lats_product_variants pv ON bt.entity_id = pv.id
        LEFT JOIN lats_products p ON pv.product_id = p.id
        WHERE bt.transfer_type = 'stock'
        AND (bt.from_branch_id = ${t} OR bt.to_branch_id = ${t})
        AND bt.status = ${n}
        ORDER BY bt.created_at DESC
      `):t?(console.log("📦 [DEBUG] Applying branch filter only:",t),e=await y`
        SELECT 
          bt.*,
          json_build_object(
            'id', fb.id, 
            'name', fb.name, 
            'code', fb.code, 
            'city', fb.city, 
            'is_active', fb.is_active
          ) as from_branch,
          json_build_object(
            'id', tb.id, 
            'name', tb.name, 
            'code', tb.code, 
            'city', tb.city, 
            'is_active', tb.is_active
          ) as to_branch,
          json_build_object(
            'id', pv.id,
            'variant_name', pv.variant_name,
            'sku', pv.sku,
            'quantity', pv.quantity,
            'reserved_quantity', pv.reserved_quantity,
            'product_id', pv.product_id,
            'product', json_build_object(
              'id', p.id,
              'name', p.name,
              'sku', p.sku
            )
          ) as variant
        FROM branch_transfers bt
        LEFT JOIN store_locations fb ON bt.from_branch_id = fb.id
        LEFT JOIN store_locations tb ON bt.to_branch_id = tb.id
        LEFT JOIN lats_product_variants pv ON bt.entity_id = pv.id
        LEFT JOIN lats_products p ON pv.product_id = p.id
        WHERE bt.transfer_type = 'stock'
        AND (bt.from_branch_id = ${t} OR bt.to_branch_id = ${t})
        ORDER BY bt.created_at DESC
      `):(console.warn("⚠️ [WARNING] No branch ID provided - fetching ALL transfers"),e=await y`
        SELECT 
          bt.*,
          json_build_object(
            'id', fb.id, 
            'name', fb.name, 
            'code', fb.code, 
            'city', fb.city, 
            'is_active', fb.is_active
          ) as from_branch,
          json_build_object(
            'id', tb.id, 
            'name', tb.name, 
            'code', tb.code, 
            'city', tb.city, 
            'is_active', tb.is_active
          ) as to_branch,
          json_build_object(
            'id', pv.id,
            'variant_name', pv.variant_name,
            'sku', pv.sku,
            'quantity', pv.quantity,
            'reserved_quantity', pv.reserved_quantity,
            'product_id', pv.product_id,
            'product', json_build_object(
              'id', p.id,
              'name', p.name,
              'sku', p.sku
            )
          ) as variant
        FROM branch_transfers bt
        LEFT JOIN store_locations fb ON bt.from_branch_id = fb.id
        LEFT JOIN store_locations tb ON bt.to_branch_id = tb.id
        LEFT JOIN lats_product_variants pv ON bt.entity_id = pv.id
        LEFT JOIN lats_products p ON pv.product_id = p.id
        WHERE bt.transfer_type = 'stock'
        ORDER BY bt.created_at DESC
      `);const a=Array.isArray(e)?e:(e==null?void 0:e.rows)||[];if(console.log(`✅ Fetched ${(a==null?void 0:a.length)||0} transfers`),a&&a.length>0)console.log("📦 [DEBUG] Sample transfer:",a[0]),console.log("📦 [DEBUG] Transfer IDs:",a.map(r=>r.id));else{const r=localStorage.getItem("current_branch_id");r||(console.log("ℹ️ [INFO] No transfers found"+(r?" for this branch":" (no branch ID set)")),r||console.warn("⚠️ [WARNING] Branch ID not found in localStorage. Transfers may not be filtered correctly."))}return a||[]}catch(e){return console.error("❌ Failed to fetch transfers:",e),console.error("❌ Stack trace:",e.stack),[]}},D=async(t,n)=>{var e;try{if(console.log("📦 [stockTransferApi] Creating transfer...",t),await E(t.from_branch_id),await E(t.to_branch_id),t.from_branch_id===t.to_branch_id)throw new Error("Cannot transfer to the same branch");if(await k(t.from_branch_id,t.to_branch_id,t.entity_id))throw new Error("A pending transfer for this product between these branches already exists");const{data:r,error:i}=await o.from("lats_product_variants").select("quantity, reserved_quantity, branch_id, variant_name, sku, is_parent, variant_type").eq("id",t.entity_id).single();if(i)throw new Error("Product variant not found");let s=r.quantity,_=r.reserved_quantity||0;if(r.is_parent||r.variant_type==="parent"){const{data:h}=await o.from("lats_product_variants").select("quantity, reserved_quantity").eq("parent_variant_id",t.entity_id).eq("is_active",!0);h&&h.length>0&&(s=h.reduce((g,w)=>g+(w.quantity||0),0),_=h.reduce((g,w)=>g+(w.reserved_quantity||0),0))}const u=s-_;if(u<t.quantity)throw new Error(`Insufficient available stock. Total: ${s}, Reserved: ${_}, Available: ${u}, Requested: ${t.quantity}`);if(r.branch_id!==t.from_branch_id)throw new Error("Product variant does not belong to the source branch");const{error:c}=await o.rpc("reserve_variant_stock",{p_variant_id:t.entity_id,p_quantity:t.quantity});if(c)throw console.error("❌ Error reserving stock:",c),new Error(`Failed to reserve stock: ${c.message}`);const{data:d,error:l}=await o.from("branch_transfers").insert({from_branch_id:t.from_branch_id,to_branch_id:t.to_branch_id,transfer_type:"stock",entity_type:t.entity_type,entity_id:t.entity_id,quantity:t.quantity,status:"pending",requested_by:n,notes:t.notes,requested_at:new Date().toISOString(),metadata:{}}).select("*").single();if(l)throw console.error("❌ Error creating transfer:",l),await o.rpc("release_variant_stock",{p_variant_id:t.entity_id,p_quantity:t.quantity}),l;const[p,m,f]=await Promise.all([o.from("store_locations").select("id, name, code, city, is_active").eq("id",d.from_branch_id).single(),o.from("store_locations").select("id, name, code, city, is_active").eq("id",d.to_branch_id).single(),o.from("lats_product_variants").select("id, name, variant_name, sku, quantity, reserved_quantity, product_id").eq("id",d.entity_id).single()]);let v=null;if((e=f.data)!=null&&e.product_id){const{data:h}=await o.from("lats_products").select("id, name, sku").eq("id",f.data.product_id).single();v=h}const q={...d,from_branch:p.data,to_branch:m.data,variant:f.data?{...f.data,product:v}:null};return console.log("✅ Transfer created with stock reserved:",q),b.emit("lats:stock.updated",{variantId:t.entity_id,action:"transfer_created",quantity:t.quantity,reserved:!0}),q}catch(a){throw console.error("❌ Failed to create transfer:",a),a}},j=async(t,n)=>{var e;try{console.log("✅ [stockTransferApi] Approving transfer:",t);const{data:a,error:r}=await o.from("branch_transfers").select("requested_by, status").eq("id",t).single();if(r||!a)throw new Error("Transfer not found");if(a.status!=="pending")throw new Error(`Cannot approve transfer with status: ${a.status}`);const{data:i,error:s}=await o.from("branch_transfers").update({status:"approved",approved_by:n,approved_at:new Date().toISOString()}).eq("id",t).select("*").single();if(s)throw console.error("❌ Error approving transfer:",s),s;const[_,u,c]=await Promise.all([o.from("store_locations").select("id, name, code, city, is_active").eq("id",i.from_branch_id).single(),o.from("store_locations").select("id, name, code, city, is_active").eq("id",i.to_branch_id).single(),o.from("lats_product_variants").select("id, name, variant_name, sku, quantity, reserved_quantity, product_id").eq("id",i.entity_id).single()]);let d=null;if((e=c.data)!=null&&e.product_id){const{data:p}=await o.from("lats_products").select("id, name, sku").eq("id",c.data.product_id).single();d=p}const l={...i,from_branch:_.data,to_branch:u.data,variant:c.data?{...c.data,product:d}:null};return console.log("✅ Transfer approved:",l),l}catch(a){throw console.error("❌ Failed to approve transfer:",a),a}},O=async(t,n,e)=>{var a;try{console.log("❌ [stockTransferApi] Rejecting transfer:",t);const{data:r,error:i}=await o.from("branch_transfers").select("entity_id, quantity, status").eq("id",t).single();if(i||!r)throw new Error("Transfer not found");if(r.status!=="pending")throw new Error(`Cannot reject transfer with status: ${r.status}`);await o.rpc("release_variant_stock",{p_variant_id:r.entity_id,p_quantity:r.quantity});const{data:s,error:_}=await o.from("branch_transfers").update({status:"rejected",approved_by:n,approved_at:new Date().toISOString(),rejection_reason:e||null}).eq("id",t).select("*").single();if(_)throw console.error("❌ Error rejecting transfer:",_),_;const[u,c,d]=await Promise.all([o.from("store_locations").select("id, name, code, city, is_active").eq("id",s.from_branch_id).single(),o.from("store_locations").select("id, name, code, city, is_active").eq("id",s.to_branch_id).single(),o.from("lats_product_variants").select("id, name, variant_name, sku, quantity, reserved_quantity, product_id").eq("id",s.entity_id).single()]);let l=null;if((a=d.data)!=null&&a.product_id){const{data:m}=await o.from("lats_products").select("id, name, sku").eq("id",d.data.product_id).single();l=m}const p={...s,from_branch:u.data,to_branch:c.data,variant:d.data?{...d.data,product:l}:null};return console.log("✅ Transfer rejected and stock released:",p),b.emit("lats:stock.updated",{variantId:r.entity_id,action:"transfer_rejected",quantity:r.quantity,released:!0}),p}catch(r){throw console.error("❌ Failed to reject transfer:",r),r}},B=async t=>{var n;try{console.log("🚚 [stockTransferApi] Marking transfer in transit:",t);const{data:e,error:a}=await o.from("branch_transfers").select("status").eq("id",t).single();if(a||!e)throw new Error("Transfer not found");if(e.status!=="approved")throw new Error(`Transfer must be approved before marking as in transit. Current status: ${e.status}`);const{data:r,error:i}=await o.from("branch_transfers").update({status:"in_transit"}).eq("id",t).select("*").single();if(i)throw console.error("❌ Error marking transfer in transit:",i),i;const[s,_,u]=await Promise.all([o.from("store_locations").select("id, name, code, city, is_active").eq("id",r.from_branch_id).single(),o.from("store_locations").select("id, name, code, city, is_active").eq("id",r.to_branch_id).single(),o.from("lats_product_variants").select("id, name, variant_name, sku, quantity, reserved_quantity, product_id").eq("id",r.entity_id).single()]);let c=null;if((n=u.data)!=null&&n.product_id){const{data:l}=await o.from("lats_products").select("id, name, sku").eq("id",u.data.product_id).single();c=l}const d={...r,from_branch:s.data,to_branch:_.data,variant:u.data?{...u.data,product:c}:null};return console.log("✅ Transfer marked in transit:",d),d}catch(e){throw console.error("❌ Failed to mark transfer in transit:",e),e}},N=async(t,n)=>{var e;try{console.log("✅ [stockTransferApi] Completing transfer:",t);const{data:a,error:r}=await o.from("branch_transfers").select("status").eq("id",t).single();if(r)throw console.error("❌ Error checking transfer status:",r),new Error("Failed to verify transfer status");if(a.status==="completed")throw console.warn("⚠️ Transfer already completed:",t),new Error("This transfer has already been completed");if(a.status!=="in_transit")throw console.error("❌ Invalid status for completion:",a.status),new Error(`Transfer must be marked as "in_transit" (shipped) before it can be completed. Current status: ${a.status}. Please ask the sender to mark it as shipped first.`);const{data:i,error:s}=await o.rpc("complete_stock_transfer_transaction",{p_transfer_id:t,p_completed_by:n||null});if(s)throw console.error("❌ Error completing transfer:",s),new Error(`Transfer completion failed: ${s.message}`);console.log("✅ Transfer completed successfully:",i),b.emit("lats:stock.updated",{action:"transfer_completed",transferId:t,sourceVariantId:i.source_variant_id,destinationVariantId:i.destination_variant_id,quantity:i.quantity_transferred});const{data:_,error:u}=await o.from("branch_transfers").select("*").eq("id",t).single();if(u)throw console.error("❌ Error fetching updated transfer:",u),u;const[c,d,l]=await Promise.all([o.from("store_locations").select("id, name, code, city, is_active").eq("id",_.from_branch_id).single(),o.from("store_locations").select("id, name, code, city, is_active").eq("id",_.to_branch_id).single(),o.from("lats_product_variants").select("id, name, variant_name, sku, quantity, reserved_quantity, product_id").eq("id",_.entity_id).single()]);let p=null;if((e=l.data)!=null&&e.product_id){const{data:f}=await o.from("lats_products").select("id, name, sku").eq("id",l.data.product_id).single();p=f}const m={..._,from_branch:c.data,to_branch:d.data,variant:l.data?{...l.data,product:p}:null};if(console.log("✅ Transfer completed with full details:",m),!m){console.warn("⚠️ Transfer details not found after completion, fetching without joins");const{data:f,error:v}=await o.from("branch_transfers").select("*").eq("id",t).single();if(v||!f)throw console.error("❌ Error fetching transfer:",v),new Error("Transfer completed but could not retrieve details");return b.emit("lats:stock.updated",{variantId:f.entity_id,transferId:t,action:"transfer_completed",fromBranchId:f.from_branch_id,toBranchId:f.to_branch_id,quantity:f.quantity}),f}return b.emit("lats:stock.updated",{variantId:m.entity_id,transferId:t,action:"transfer_completed",fromBranchId:m.from_branch_id,toBranchId:m.to_branch_id,quantity:m.quantity}),m}catch(a){throw console.error("❌ Failed to complete transfer:",a),a}},S=async(t,n)=>{var e;try{console.log("🚫 [stockTransferApi] Cancelling transfer:",t);const{data:a,error:r}=await o.from("branch_transfers").select("entity_id, quantity, status").eq("id",t).single();if(r||!a)throw new Error("Transfer not found");(a.status==="pending"||a.status==="approved")&&await o.rpc("release_variant_stock",{p_variant_id:a.entity_id,p_quantity:a.quantity});const{data:i,error:s}=await o.from("branch_transfers").update({status:"cancelled",rejection_reason:n||null}).eq("id",t).select("*").single();if(s)throw console.error("❌ Error cancelling transfer:",s),s;const[_,u,c]=await Promise.all([o.from("store_locations").select("id, name, code, city, is_active").eq("id",i.from_branch_id).single(),o.from("store_locations").select("id, name, code, city, is_active").eq("id",i.to_branch_id).single(),o.from("lats_product_variants").select("id, name, variant_name, sku, quantity, reserved_quantity, product_id").eq("id",i.entity_id).single()]);let d=null;if((e=c.data)!=null&&e.product_id){const{data:p}=await o.from("lats_products").select("id, name, sku").eq("id",c.data.product_id).single();d=p}const l={...i,from_branch:_.data,to_branch:u.data,variant:c.data?{...c.data,product:d}:null};return console.log("✅ Transfer cancelled and stock released:",l),b.emit("lats:stock.updated",{variantId:a.entity_id,action:"transfer_cancelled",quantity:a.quantity,released:!0}),l}catch(a){throw console.error("❌ Failed to cancel transfer:",a),a}},F=async t=>{try{console.log("📊 [stockTransferApi] Fetching transfer stats for branch:",t),console.log("📊 [DEBUG] Stats query - Branch ID:",t);const n=await y`
      SELECT status, quantity
      FROM branch_transfers
      WHERE transfer_type = 'stock'
      AND (from_branch_id = ${t} OR to_branch_id = ${t})
    `,e=Array.isArray(n)?n:(n==null?void 0:n.rows)||[];console.log("📊 [DEBUG] Stats query returned:",e==null?void 0:e.length,"transfers"),e&&e.length>0&&console.log("📊 [DEBUG] Stats raw data:",e);const a={total:(e==null?void 0:e.length)||0,pending:(e==null?void 0:e.filter(r=>r.status==="pending").length)||0,approved:(e==null?void 0:e.filter(r=>r.status==="approved").length)||0,in_transit:(e==null?void 0:e.filter(r=>r.status==="in_transit").length)||0,completed:(e==null?void 0:e.filter(r=>r.status==="completed").length)||0,rejected:(e==null?void 0:e.filter(r=>r.status==="rejected").length)||0,cancelled:(e==null?void 0:e.filter(r=>r.status==="cancelled").length)||0,total_items:(e==null?void 0:e.reduce((r,i)=>r+(i.quantity||0),0))||0};return console.log("✅ Transfer stats:",a),console.log("📊 [DEBUG] IMPORTANT: Stats shows",a.total,"transfers but list might show 0 if there are RLS/join issues"),a}catch(n){return console.error("❌ Failed to get transfer stats:",n),{total:0,pending:0,approved:0,in_transit:0,completed:0,rejected:0,cancelled:0,total_items:0}}};export{F as a,j as b,D as c,N as d,S as e,R as g,B as m,O as r};
