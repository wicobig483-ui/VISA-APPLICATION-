const $=s=>document.querySelector(s);
async function api(url,options={}){const r=await fetch(url,{credentials:"same-origin",headers:{"Content-Type":"application/json"},...options});const d=await r.json().catch(()=>({error:"Unexpected server response."}));if(!r.ok)throw new Error(d.error||"Request failed.");return d;}
function msg(el,s,bad=false){el.textContent=s;el.classList.toggle("error",bad);}
async function showDashboard(){try{await api("/api/admin/me");$("#loginPanel").hidden=true;$("#dashboard").hidden=false;await loadApplications();}catch{$("#loginPanel").hidden=false;$("#dashboard").hidden=true;}}
$("#loginForm").addEventListener("submit",async e=>{e.preventDefault();const f=Object.fromEntries(new FormData(e.currentTarget).entries());try{await api("/api/admin/login",{method:"POST",body:JSON.stringify(f)});msg($("#loginResult"),"Signed in.");await showDashboard();}catch(err){msg($("#loginResult"),err.message,true);}});
$("#logout").addEventListener("click",async()=>{try{await api("/api/admin/logout",{method:"POST",body:"{}"});}finally{location.reload();}});
$("#jobForm").addEventListener("submit",async e=>{e.preventDefault();const f=Object.fromEntries(new FormData(e.currentTarget).entries());try{await api("/api/admin/jobs",{method:"POST",body:JSON.stringify(f)});msg($("#jobResult"),"Vacancy published.");e.currentTarget.reset();}catch(err){msg($("#jobResult"),err.message,true);}});
async function loadApplications(){
  const box=$("#applications");box.textContent="Loading…";
  try{
    const rows=await api("/api/admin/applications");
    if(!rows.length){box.textContent="No applications have been received.";return;}
    const table=document.createElement("table");
    const head=document.createElement("tr");["Reference / candidate","Contact & profile","Vacancy","Status","Submitted"].forEach(t=>{const th=document.createElement("th");th.textContent=t;head.append(th);});
    const thead=document.createElement("thead");thead.append(head);table.append(thead);const body=document.createElement("tbody");
    rows.forEach(a=>{
      const tr=document.createElement("tr");
      const c1=document.createElement("td");c1.textContent=`${a.reference}\n${a.full_name}`;
      const c2=document.createElement("td");c2.textContent=`${a.email}\n${a.country}\n${a.occupation}\nExperience: ${a.experience}\nEducation: ${a.education}\nCV: ${a.cv_status}\n${a.message||""}`;
      const c3=document.createElement("td");c3.textContent=a.job_title||"General profile";
      const c4=document.createElement("td");const sel=document.createElement("select");
      ["Received","Under review","Shortlisted","Interview","Offer made","Not selected","Closed"].forEach(s=>{const o=document.createElement("option");o.value=s;o.textContent=s;sel.append(o);});
      sel.value=a.status;sel.addEventListener("change",async()=>{try{await api(`/api/admin/applications/${a.id}/status`,{method:"PATCH",body:JSON.stringify({status:sel.value})});}catch(err){alert(err.message);sel.value=a.status;}});
      c4.append(sel);const c5=document.createElement("td");c5.textContent=new Date(a.created_at).toLocaleString();
      [c1,c2,c3,c4,c5].forEach(c=>tr.append(c));body.append(tr);
    });
    table.append(body);box.innerHTML="";box.append(table);
  }catch(err){box.textContent=err.message;}
}
$("#loadApplications").addEventListener("click",loadApplications);
showDashboard();