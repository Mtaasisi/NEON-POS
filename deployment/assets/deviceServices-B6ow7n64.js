import{e as a,bM as n,bN as v}from"./index-DcOZFT5f.js";import"./vendor-DUDd7buf.js";import"./ui-DzCRF9nk.js";import"./pdf-DzeXGLrb.js";import"./routing-3XkJb5E8.js";import"./charts-DCYgcpIW.js";import"./qr-Q1J4G-1X.js";import"./forms-CBKP6T1Q.js";var p=Object.defineProperty,b=(r,e,t)=>e in r?p(r,e,{enumerable:!0,configurable:!0,writable:!0,value:t}):r[e]=t,m=(r,e,t)=>b(r,typeof e!="symbol"?e+"":e,t);const f=class _{constructor(){m(this,"queue",[]),m(this,"processing",!1),m(this,"maxConcurrent",2),m(this,"delayBetweenRequests",500)}static getInstance(){return _.instance||(_.instance=new _),_.instance}async execute(e){return new Promise((t,o)=>{this.queue.push(async()=>{try{await new Promise(c=>setTimeout(c,this.delayBetweenRequests));const s=await e();t(s)}catch(s){o(s)}}),this.processQueue()})}async processQueue(){if(!(this.processing||this.queue.length===0)){for(this.processing=!0;this.queue.length>0;){const e=this.queue.splice(0,this.maxConcurrent);await Promise.all(e.map(t=>t()))}this.processing=!1}}};m(f,"instance");let y=f;const E=["id","customer_id","brand","model","serial_number","issue_description","status","assigned_to","estimated_hours","expected_return_date","warranty_start","warranty_end","warranty_status","repair_count","last_return_date","created_at","updated_at"];function k(r){const e={};for(const t of E)r[t]!==void 0&&(e[t]=r[t]);return e}const D={async getAllDevices(){try{console.log("🔍 deviceServices.getAllDevices() called");const r=localStorage.getItem("current_branch_id");let e=a.from("devices").select(`
          id,
          customer_id,
          brand,
          model,
          serial_number,
          issue_description,
          status,
          assigned_to,
          estimated_hours,
          expected_return_date,
          created_at,
          updated_at
        `).order("created_at",{ascending:!1});r&&(e=e.eq("branch_id",r));const{data:t,error:o}=await e;if(o)throw console.error("❌ Database error:",o),new Error(`Failed to fetch devices: ${o.message}`);return console.log("📱 Database query successful, devices found:",t?.length||0),t?.map(n)||[]}catch(r){throw console.error("❌ Network error in getAllDevices:",r),new Error("Network error: Unable to connect to database")}},async getDeviceById(r){try{const{data:e,error:t}=await a.from("devices").select(`
          id,
          customer_id,
          brand,
          model,
          serial_number,
          issue_description,
          status,
          assigned_to,
          estimated_hours,
          expected_return_date,
          created_at,
          updated_at
        `).eq("id",r).single();if(t)throw new Error(`Failed to fetch device: ${t.message}`);return n(e)}catch{throw new Error("Network error: Unable to connect to database")}},async createDevice(r){try{const e=localStorage.getItem("current_branch_id"),t=k(r),o=v(t),{id:s,...c}=o;c.status||(c.status="received"),c.branch_id=e||"00000000-0000-0000-0000-000000000001",console.log("Inserting sanitized device:",c);const{data:d,error:l}=await a.from("devices").insert(c).select("*").single();if(l)throw new Error(`Failed to create device: ${l.message}`);return n(d)}catch{throw new Error("Network error: Unable to connect to database")}},async updateDevice(r,e){console.log("[deviceServices.updateDevice] Called with:",{id:r,updates:e});const t=Object.fromEntries(Object.entries(e).map(([c,d])=>[v(c),d]));console.log("[deviceServices.updateDevice] Snake case updates:",t);const{data:o,error:s}=await a.from("devices").update(t).eq("id",r).select().single();if(s)throw console.error("[deviceServices.updateDevice] ❌ Update failed:",s),console.error("[deviceServices.updateDevice] Error details:",{message:s.message,details:s.details,hint:s.hint,code:s.code}),s;return console.log("[deviceServices.updateDevice] ✅ Update successful:",o),e.status&&await a.from("device_notifications").insert({device_id:r,type:"info",title:"Device Status Updated",message:`Device status changed to ${e.status}`,sent_at:new Date().toISOString(),is_read:!1}),o},async deleteDevice(r){try{const{error:e}=await a.from("devices").delete().eq("id",r);if(e)throw new Error(`Failed to delete device: ${e.message}`);return!0}catch{throw new Error("Network error: Unable to connect to database")}},async addDeviceChecklist(r){try{const{data:e,error:t}=await a.from("device_checklists").insert(r).select().single();if(t)throw console.error("Error adding device checklist:",t),new Error(`Failed to add device checklist: ${t.message}`);return e}catch(e){throw console.error("Network error adding device checklist:",e),new Error("Network error: Unable to connect to database")}},async updateDeviceChecklist(r,e){try{const{data:t,error:o}=await a.from("device_checklists").update({...e,updated_at:new Date().toISOString()}).eq("id",r).select().single();if(o)throw console.error("Error updating device checklist:",o),new Error(`Failed to update device checklist: ${o.message}`);return t}catch(t){throw console.error("Network error updating device checklist:",t),new Error("Network error: Unable to connect to database")}},async addDeviceRemark(r){try{const{data:e,error:t}=await a.from("device_remarks").insert(r).select().single();if(t)throw console.error("Error adding device remark:",t),new Error(`Failed to add device remark: ${t.message}`);return await a.from("device_notifications").insert({device_id:r.device_id,type:"info",title:"New Device Remark",message:`A new remark/message was added to device ${r.device_id}.`,sent_at:new Date().toISOString(),is_read:!1}),e}catch(e){throw console.error("Network error adding device remark:",e),new Error("Network error: Unable to connect to database")}},async addDeviceTransition(r){try{const{data:e,error:t}=await a.from("device_transitions").insert(r).select().single();if(t)throw console.error("Error adding device transition:",t),new Error(`Failed to add device transition: ${t.message}`);return await a.from("device_notifications").insert({device_id:r.device_id,type:"info",title:"Device Status Updated",message:`Device ${r.device_id} status changed from ${r.from_status} to ${r.to_status}.`,sent_at:new Date().toISOString(),is_read:!1}),e}catch(e){throw console.error("Network error adding device transition:",e),new Error("Network error: Unable to connect to database")}},async addDeviceRating(r){try{const{data:e,error:t}=await a.from("device_ratings").insert(r).select().single();if(t)throw console.error("Error adding device rating:",t),new Error(`Failed to add device rating: ${t.message}`);return e}catch(e){throw console.error("Network error adding device rating:",e),new Error("Network error: Unable to connect to database")}},async searchDevices(r){try{const e=localStorage.getItem("current_branch_id");let t=a.from("devices").select(`
          id,
          customer_id,
          brand,
          model,
          serial_number,
          issue_description,
          status,
          assigned_to,
          estimated_hours,
          expected_return_date,
          created_at,
          updated_at
        `).or(`brand.ilike.%${r}%,model.ilike.%${r}%,serial_number.ilike.%${r}%,id.ilike.%${r}%`).order("created_at",{ascending:!1});e&&(t=t.eq("branch_id",e));const{data:o,error:s}=await t;if(s)throw console.error("Error searching devices:",s),new Error(`Failed to search devices: ${s.message}`);return n(o||[])}catch(e){throw console.error("Network error searching devices:",e),new Error("Network error: Unable to connect to database")}},async filterDevicesByStatus(r){try{const e=localStorage.getItem("current_branch_id");let t=a.from("devices").select(`
          id,
          customer_id,
          brand,
          model,
          serial_number,
          issue_description,
          status,
          assigned_to,
          estimated_hours,
          expected_return_date,
          created_at,
          updated_at
        `).eq("status",r).order("created_at",{ascending:!1});e&&(t=t.eq("branch_id",e));const{data:o,error:s}=await t;if(s)throw console.error("Error filtering devices by status:",s),new Error(`Failed to filter devices: ${s.message}`);return n(o||[])}catch(e){throw console.error("Network error filtering devices by status:",e),new Error("Network error: Unable to connect to database")}},async getDevicesByTechnician(r){try{console.log("🔧 Fetching devices for technician:",r);const e=localStorage.getItem("current_branch_id");let t=a.from("devices").select(`
          id,
          customer_id,
          brand,
          model,
          serial_number,
          issue_description,
          status,
          assigned_to,
          estimated_hours,
          expected_return_date,
          created_at,
          updated_at
        `).eq("assigned_to",r).order("created_at",{ascending:!1});e&&(t=t.eq("branch_id",e));const{data:o,error:s}=await t;if(s)throw console.error("❌ Error fetching devices by technician:",s),new Error(`Failed to fetch devices: ${s.message}`);return console.log("✅ Devices fetched for technician:",o?.length||0),n(o||[])}catch(e){throw console.error("❌ Network error fetching devices by technician:",e),new Error("Network error: Unable to connect to database")}},async getDevicesByCustomer(r){try{return await y.getInstance().execute(async()=>{const o=localStorage.getItem("current_branch_id");let s=a.from("devices").select(`
            id,
            customer_id,
            brand,
            model,
            serial_number,
            issue_description,
            status,
            assigned_to,
            estimated_hours,
            expected_return_date,
            created_at,
            updated_at
          `).eq("customer_id",r).order("created_at",{ascending:!1});o&&(s=s.eq("branch_id",o));const{data:c,error:d}=await s;if(d)throw console.error("Error fetching devices by customer:",d),new Error(`Failed to fetch devices: ${d.message}`);return n(c||[])})}catch(e){throw console.error("Network error fetching devices by customer:",e),new Error("Network error: Unable to connect to database")}},async getDevicePaymentRecords(r){try{const{data:e,error:t}=await a.from("customer_payments").select(`
          *,
          devices(brand, model)
        `).eq("device_id",r).order("payment_date",{ascending:!1});if(t)throw console.error("Error fetching device payment records:",t),new Error(`Failed to fetch payment records: ${t.message}`);const o=(e||[]).map(s=>({...s,device_name:s.devices?`${s.devices.brand||""} ${s.devices.model||""}`.trim():void 0,customer_name:s.customers?.name||void 0}));return n(o)}catch(e){throw console.error("Network error fetching device payment records:",e),new Error("Network error: Unable to connect to database")}},async getCustomerPaymentRecords(r){try{const{data:e,error:t}=await a.from("customer_payments").select(`
          *,
          devices(brand, model)
        `).eq("customer_id",r).order("payment_date",{ascending:!1});if(t)return console.log("⚠️ DeviceServices: customer_payments table not found or error:",t),[];const o=(e||[]).map(s=>({...s,device_name:s.devices?`${s.devices.brand||""} ${s.devices.model||""}`.trim():void 0}));return n(o)}catch(e){return console.error("Network error fetching customer payment records:",e),[]}},async addPaymentRecord(r){try{if(!r.customer_id)throw new Error("Customer ID is required for payment record");const{data:e,error:t}=await a.from("customer_payments").insert([r]).select().single();if(t)throw console.error("Error adding payment record:",t),new Error(`Failed to add payment record: ${t.message}`);return await a.from("device_notifications").insert({device_id:r.device_id,type:r.status==="failed"?"error":"info",title:r.status==="failed"?"Payment Failed":"Payment Received",message:r.status==="failed"?`A payment for device ${r.device_id} failed.`:`Payment received for device ${r.device_id}.`,sent_at:new Date().toISOString(),is_read:!1}),n(e)}catch(e){throw console.error("Network error adding payment record:",e),new Error("Network error: Unable to connect to database")}},async getDeviceStatistics(){try{const r=localStorage.getItem("current_branch_id");let e=a.from("devices").select("id",{count:"exact"}),t=a.from("devices").select("id",{count:"exact"}).in("status",["received","in_progress"]),o=a.from("devices").select("id",{count:"exact"}).eq("status","completed"),s=a.from("devices").select("id",{count:"exact"}).eq("status","completed");r&&(e=e.eq("branch_id",r),t=t.eq("branch_id",r),o=o.eq("branch_id",r),s=s.eq("branch_id",r));const{data:c,error:d}=await e,{data:l,error:u}=await t,{data:h,error:i}=await o,{data:w,error:g}=await s;if(d||u||i||g)throw console.error("Error fetching device statistics:",{totalError:d,repairError:u,pickupError:i,completedError:g}),new Error("Failed to fetch device statistics");return{totalDevices:c?.length||0,inRepair:l?.length||0,readyForPickup:h?.length||0,completed:w?.length||0}}catch(r){throw console.error("Network error fetching device statistics:",r),new Error("Network error: Unable to connect to database")}},async getTechnicianRating(r){try{const{data:e,error:t}=await a.from("device_ratings").select("*").eq("technician_id",r);if(t)throw console.error("Error getting technician rating:",t),new Error(`Failed to get technician rating: ${t.message}`);return!e||e.length===0?0:e.reduce((s,c)=>s+(c.score||5),0)/e.length}catch(e){throw console.error("Network error getting technician rating:",e),new Error("Network error: Unable to connect to database")}},async updateDeviceReturnDate(r,e){try{const{data:t,error:o}=await a.from("devices").update({expected_return_date:e,updated_at:new Date().toISOString()}).eq("id",r).select().single();if(o)throw console.error("Error updating device return date:",o),new Error(`Failed to update device return date: ${o.message}`);return n(t)}catch(t){throw console.error("Network error updating device return date:",t),new Error("Network error: Unable to connect to database")}},async sendCustomerNotification(r,e){try{const{error:t}=await a.from("device_notifications").insert({device_id:r,message:e,sent_at:new Date().toISOString(),is_read:!1});if(t)throw t;return!0}catch(t){return console.error("Error sending customer notification:",t),!1}},async assignTechnicianToDevice(r,e){try{const{data:t,error:o}=await a.from("devices").update({assigned_to:e,updated_at:new Date().toISOString()}).eq("id",r).select(`
          id,
          customer_id,
          brand,
          model,
          serial_number,
          issue_description,
          status,
          assigned_to,
          estimated_hours,
          expected_return_date,
          created_at,
          updated_at
        `).single();if(o)throw console.error("Error assigning technician to device:",o),new Error(`Failed to assign technician: ${o.message}`);return await a.from("device_notifications").insert({device_id:r,type:"info",title:"Technician Assigned",message:`A technician has been assigned to device ${r}.`,sent_at:new Date().toISOString(),is_read:!1}),n(t)}catch(t){throw console.error("Network error assigning technician to device:",t),new Error("Network error: Unable to assign technician")}},async saveReceipt(r){try{const{data:e,error:t}=await a.from("receipts").insert({receipt_number:`RCP-${Date.now()}-${Math.random().toString(36).substr(2,9).toUpperCase()}`,device_id:r.deviceId,customer_id:r.customerId,payment_id:r.paymentId,technician_id:r.technicianId,device_brand:r.deviceBrand,device_model:r.deviceModel,device_serial_number:r.deviceSerialNumber,device_issue:r.deviceIssue,customer_name:r.customerName,customer_phone:r.customerPhone,customer_email:r.customerEmail,payment_method:r.paymentMethod,payment_reference:r.paymentReference,payment_amount:r.paymentAmount,total_cost:r.totalCost,deposit_amount:r.depositAmount,remaining_balance:r.remainingBalance,repair_cost:r.repairCost,labor_cost:r.laborCost,parts_cost:r.partsCost,device_status:r.deviceStatus,generated_by:r.generatedBy,receipt_content:r.receiptContent}).select().single();if(t)throw console.error("Error saving receipt:",t),new Error(`Failed to save receipt: ${t.message}`);return n(e)}catch(e){throw console.error("Network error saving receipt:",e),new Error("Network error: Unable to connect to database")}},async getReceipt(r){try{const{data:e,error:t}=await a.from("receipts").select("*").eq("id",r).single();if(t)throw console.error("Error fetching receipt:",t),new Error(`Failed to fetch receipt: ${t.message}`);if(!e)throw new Error("Receipt not found");const[o,s,c]=await Promise.all([e.device_id?a.from("devices").select("*").eq("id",e.device_id).single():Promise.resolve({data:null,error:null}),e.customer_id?a.from("customers").select("*").eq("id",e.customer_id).single():Promise.resolve({data:null,error:null}),a.from("customer_payments").select("*").eq("receipt_id",r)]),d={...e,devices:o.data,customers:s.data,customer_payments:c.data||[]};return n(d)}catch(e){throw console.error("Network error fetching receipt:",e),new Error("Network error: Unable to connect to database")}},async getDeviceReceipts(r){try{const{data:e,error:t}=await a.from("receipts").select("*").eq("device_id",r).order("receipt_date",{ascending:!1});if(t)throw console.error("Error fetching device receipts:",t),new Error(`Failed to fetch device receipts: ${t.message}`);if(!e||e.length===0)return[];const o=e.map(i=>i.customer_id).filter(Boolean),s=e.map(i=>i.id),[c,d]=await Promise.all([o.length>0?a.from("customers").select("*").in("id",o):Promise.resolve({data:[],error:null}),a.from("customer_payments").select("*").in("receipt_id",s)]),l=new Map(c.data?.map(i=>[i.id,i])||[]),u=new Map;d.data?.forEach(i=>{const w=u.get(i.receipt_id)||[];w.push(i),u.set(i.receipt_id,w)});const h=e.map(i=>({...i,customers:i.customer_id?l.get(i.customer_id):null,customer_payments:u.get(i.id)||[]}));return n(h)}catch(e){throw console.error("Network error fetching device receipts:",e),new Error("Network error: Unable to connect to database")}},async getCustomerReceipts(r){try{const{data:e,error:t}=await a.from("receipts").select(`
          *,
          devices(*),
          customer_payments(*),
          auth_users!receipts_technician_id_fkey(*)
        `).eq("customer_id",r).order("receipt_date",{ascending:!1});if(t)throw console.error("Error fetching customer receipts:",t),new Error(`Failed to fetch customer receipts: ${t.message}`);return n(e||[])}catch(e){throw console.error("Network error fetching customer receipts:",e),new Error("Network error: Unable to connect to database")}},async markReceiptPrinted(r){try{const{data:e,error:t}=await a.from("receipts").update({is_printed:!0}).eq("id",r).select().single();if(t)throw console.error("Error marking receipt as printed:",t),new Error(`Failed to mark receipt as printed: ${t.message}`);return n(e)}catch(e){throw console.error("Network error marking receipt as printed:",e),new Error("Network error: Unable to connect to database")}},async markReceiptSent(r,e){try{const{data:t,error:o}=await a.from("receipts").update({is_sent_to_customer:!0,sent_via:e,sent_at:new Date().toISOString()}).eq("id",r).select().single();if(o)throw console.error("Error marking receipt as sent:",o),new Error(`Failed to mark receipt as sent: ${o.message}`);return n(t)}catch(t){throw console.error("Network error marking receipt as sent:",t),new Error("Network error: Unable to connect to database")}}};export{D as deviceServices};
