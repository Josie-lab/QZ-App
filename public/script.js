(() => {
  const monthYearEl = document.getElementById('monthYear');
  const calendarEl = document.getElementById('calendar');
  const prevBtn = document.getElementById('prevMonth');
  const nextBtn = document.getElementById('nextMonth');

  const showCalendarBtn = document.getElementById('showCalendar');
  const showTableBtn = document.getElementById('showTable');
  const calendarSection = document.getElementById('calendarSection');
  const tableSection = document.getElementById('tableSection');
  const eventTableBody = document.querySelector('#eventTable tbody');

  const addEventBtn = document.getElementById("addEvent");
  const addEventModal = document.getElementById("addEventModal");
  const addEventForm = document.getElementById("addEventForm");
  const cancelAddEventBtn = document.getElementById("cancelAddEvent");

  const editEventsBtn = document.getElementById('editEvents');
  const adSidebar = document.getElementById('adSidebar');

  let events = [];
  let ads = [];
  let blogPosts = [];
  let editingEventIndex = null;
  const blogPostsEl = document.getElementById('blogPosts');

  // --- API Calls ---
  async function loadEvents() {
    const res = await fetch("/api/events");
    events = await res.json();
    return events;
  }

  async function addEventToServer(event) {
    await fetch("/api/events/add", {
      method: "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify(event)
    });
  }

  async function updateEventOnServer(event) {
    if (!event.id) return;
    await fetch(`/api/events/update/${event.id}`, {
      method: "PUT",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify(event)
    });
  }

  // --- Hilfsfunktionen ---
  function formatMonthYear(d) {
    return d.toLocaleString('de-DE', { month:'long', year:'numeric' });
  }

  function clearChildren(n) { while(n.firstChild) n.removeChild(n.firstChild); }

  function formatDateToISO(d) {
    const y = d.getFullYear(), m = String(d.getMonth()+1).padStart(2,'0'), day = String(d.getDate()).padStart(2,'0');
    return `${y}-${m}-${day}`;
  }

  function groupEventsByDate(list) {
    const map = {};
    list.forEach(ev => {
      const iso = formatDateToISO(new Date(ev.date));
      if (!map[iso]) map[iso] = [];
      map[iso].push(ev);
    });
    return map;
  }

  let currentDate = new Date();
  let viewDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);

  // --- Rendering ---
  function renderCalendar() {
    if (!calendarEl || !monthYearEl) return;
    monthYearEl.textContent = formatMonthYear(viewDate);
    clearChildren(calendarEl);

    const weekdays = ["Mo","Di","Mi","Do","Fr","Sa","So"];
    weekdays.forEach(w => {
      const div = document.createElement("div");
      div.className = "weekday";
      div.textContent = w;
      calendarEl.appendChild(div);
    });

    const firstDay = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
    const startDay = (firstDay.getDay() + 6) % 7; // Mo=0
    const daysInMonth = new Date(viewDate.getFullYear(), viewDate.getMonth()+1, 0).getDate();
    const byDate = groupEventsByDate(events);

    for (let i=0;i<startDay;i++){
      const blank = document.createElement("div");
      blank.className = "day-cell";
      blank.style.opacity = "0.3";
      calendarEl.appendChild(blank);
    }

    for (let day=1; day<=daysInMonth; day++){
      const cell = document.createElement("div");
      cell.className = "day-cell";

      const d = document.createElement("div");
      d.className = "date";
      d.textContent = day;
      cell.appendChild(d);

      const iso = formatDateToISO(new Date(viewDate.getFullYear(), viewDate.getMonth(), day));
      (byDate[iso] || []).forEach(ev => {
        const a = document.createElement("a");
        a.href = ev.link || "#";
        a.target = "_blank";
        a.className = "event" +
          (ev.honorar ? " paid" : "") +
          (ev.mode && ev.mode.toLowerCase().includes("online") ? " online" : " presence");
        a.innerHTML = `<span class="evt-title">${ev.thema}</span>`;
        cell.appendChild(a);
      });

      cell.addEventListener("click", () => {
        const dayInfoModal = document.getElementById("dayInfoModal");
        const dayInfoTitle = document.getElementById("dayInfoTitle");
        const dayInfoEvents = document.getElementById("dayInfoEvents");
        const addEventFromDay = document.getElementById("addEventFromDay");

        const dateObj = new Date(iso);
        const eventsToday = events.filter(ev => ev.date === iso);

        dayInfoTitle.textContent = dateObj.toLocaleDateString("de-DE", {
          weekday: "long",
          day: "2-digit",
          month: "long",
          year: "numeric"
        });

        dayInfoEvents.innerHTML = "";
        if(eventsToday.length === 0) {
          dayInfoEvents.innerHTML = "<p>Keine Termine an diesem Tag.</p>";
        } else {
          eventsToday.forEach(ev => {
      const wrapper = document.createElement("div");
      wrapper.className = "day-info-event";
      wrapper.innerHTML = `
        <h4>${ev.thema || "Unbenanntes Event"}</h4>
        <p><strong>Veranstaltung:</strong> ${ev.veranstaltung || "-"}</p>
        <p><strong>Sponsor:</strong> ${ev.sponsor || "-"}</p>
        <p><strong>Modus:</strong> ${ev.mode || "-"}</p>
        <p><strong>Kostenpflichtig:</strong> ${ev.honorar ? "Ja" : "Nein"}</p>
        <p><strong>Kommentar:</strong> ${ev.comment || "-"}</p>
        ${ev.pdf ? `<p><a href="${ev.pdf}" target="_blank">📄 Zusätzliche Informationen öffnen</a></p>` : ""}
        ${ev.link ? `<p><a href="${ev.link}" target="_blank">Zur Anmeldung</a></p>` : ""}
      `;

      if(isAdmin){
                const deleteBtn = document.createElement("button");
                deleteBtn.className = 'delete-btn admin-edit';
                deleteBtn.textContent = "Termin löschen";
                deleteBtn.style.marginTop = "5px";
                deleteBtn.addEventListener("click", async () => {
                  if(confirm("Diesen Termin wirklich löschen?")){
                    await fetch(`/api/events/${ev.id}`, { method: "DELETE" });
                    events = events.filter(e => e.id !== ev.id); // lokal
                    renderAll(); // neu rendern
                    dayInfoModal.classList.add("hidden");
                  }
                });
                wrapper.appendChild(deleteBtn);
      }

      dayInfoEvents.appendChild(wrapper);
    });
  }

  if(isAdmin){
    addEventFromDay.style.display = "inline-block";
    addEventFromDay.onclick = () => {
      document.getElementById("newEventDate").value = iso;
      dayInfoModal.classList.add("hidden");
      addEventModal.classList.remove("hidden");
    };
  } else addEventFromDay.style.display = "none";

  dayInfoModal.classList.remove("hidden");
  document.getElementById("closeDayInfo").onclick = () => dayInfoModal.classList.add("hidden");
});

      calendarEl.appendChild(cell);
    }
  }

function renderTable() {
  if (!eventTableBody) return;
  clearChildren(eventTableBody);

  // Tabelle ggf. Kopfzeile anpassen:
  const table = document.getElementById("eventTable");
  if (isAdmin) {
    table.classList.add("admin");
  } else {
    table.classList.remove("admin");
  }

  const filtered = events.filter(ev => {
    const d = new Date(ev.date);
    return d.getFullYear() === viewDate.getFullYear() &&
           d.getMonth() === viewDate.getMonth();
  });
  const sorted = filtered.slice().sort((a,b)=> a.date.localeCompare(b.date));
  sorted.forEach(ev => {
    const tr = document.createElement("tr");

  // Klasse für honrarpflichtige Events
  if(ev.honorar) tr.classList.add("paid-event");

    tr.innerHTML = `
      <td>${new Date(ev.date).toLocaleDateString('de-DE')}</td>
      <td>${ev.veranstaltung || ""}</td>
      <td>${ev.thema || ""}</td>
      <td>${ev.sponsor || ""}</td>
      <td class="mode-cell">${ev.mode || ""}</td>
      <td>${ev.honorar ? "Ja" : "Nein"}</td>
      <td>
        ${ev.comment || ""}
        ${ev.pdf ? `<br><a href="${ev.pdf}" target="_blank">📄 Zusätzliche Informationen</a>` : ""}
      </td>
      <td>${ev.link ? `<a href="${ev.link}" target="_blank">Anmeldung</a>` : "-"}</td>
      ${isAdmin ? '<td class="delete-cell"><button class="delete-btn" style="color:red; font-weight:bold; cursor:pointer;">✖</button></td>' : ''}
    `;

 // Farbe der „Ort/Modus“-Zelle setzen
  const modeCell = tr.querySelector(".mode-cell");
if (modeCell) {
  const modeText = (ev.mode || "").toLowerCase();
  if (modeText.includes("online")) {
    modeCell.style.color = "#1a73e8"; modeCell.style.fontWeight = "bold";// blau
  } else if (modeText.includes("präsenz") || modeText.includes("presence")) {
    modeCell.style.color = "#25923eff";  modeCell.style.fontWeight = "bold";  // grün
  }
}

    if (isAdmin) {
      tr.querySelector(".delete-btn").addEventListener("click", async () => {
        if (!ev.id) return;
        if (!confirm("Diesen Termin wirklich löschen?")) return;
        events = events.filter(e => e.id !== ev.id);
        await fetch(`/api/events/${ev.id}`, { method: "DELETE" });
        renderAll();
      });
    }

    eventTableBody.appendChild(tr);
  });
}

  // --- Navigation (attach only if elements exist) ---
  if (prevBtn) prevBtn.addEventListener('click', () => { 
    viewDate = new Date(viewDate.getFullYear(), viewDate.getMonth()-1, 1); 
    renderAll(); 
  });
  if (nextBtn) nextBtn.addEventListener('click', () => { 
    viewDate = new Date(viewDate.getFullYear(), viewDate.getMonth()+1, 1); 
    renderAll(); 
  });

  if (showCalendarBtn && showTableBtn && calendarSection && tableSection) {
    showCalendarBtn.addEventListener("click", ()=> {
      showCalendarBtn.classList.add("active");
      showTableBtn.classList.remove("active");
      calendarSection.classList.remove("hidden");
      tableSection.classList.add("hidden");
    });

    showTableBtn.addEventListener("click", ()=> {
      showTableBtn.classList.add("active");
      showCalendarBtn.classList.remove("active");
      tableSection.classList.remove("hidden");
      calendarSection.classList.add("hidden");
    });
  }

  // --- Admin Login ---
  let isAdmin = false;
  const adminLoginBtn = document.getElementById("adminLoginBtn");
  const adminLoginModal = document.getElementById("adminLoginModal");
  const adminLoginForm = document.getElementById("adminLoginForm");
  const adminPasswordInput = document.getElementById("adminPassword");
  const cancelAdminLogin = document.getElementById("cancelAdminLogin");
  // Admin login button: opens login modal when logged out, logs out when logged in
    if (adminLoginBtn) adminLoginBtn.addEventListener("click", () => {
      if (isAdmin) {
        if (confirm('Abmelden?')) {
          isAdmin = false;
          localStorage.removeItem('qz_isAdmin');
          document.body.classList.remove('admin-mode');
          if (editEventsBtn) editEventsBtn.style.display = 'none';
          if (addEventBtn) addEventBtn.style.display = 'none';
          if (adminLoginBtn) adminLoginBtn.textContent = 'Admin';
          // update ad edit buttons
          const adminButtons = document.querySelectorAll('.admin-edit');
          adminButtons.forEach(b => b.style.display = 'none');
          alert('Abgemeldet.');
        }
      } else {
        if (adminLoginModal) adminLoginModal.classList.remove('hidden');
      }
  });
  if (cancelAdminLogin) cancelAdminLogin.addEventListener("click", () => { 
    adminLoginModal.classList.add("hidden"); 
    if (adminPasswordInput) adminPasswordInput.value = ""; 
  });

  if (adminLoginForm) adminLoginForm.addEventListener("submit", (e) => {
    e.preventDefault();
    if (adminPasswordInput && adminPasswordInput.value === "drei#2351zwei#3") {
      isAdmin = true;
      localStorage.setItem('qz_isAdmin', '1');
      if (editEventsBtn) editEventsBtn.style.display = "inline-block";
      if (addEventBtn) addEventBtn.style.display = "inline-block";
      if (adminLoginModal) adminLoginModal.classList.add("hidden");
      document.body.classList.add('admin-mode');
      // load ads when admin mode activated (shows edit buttons)
      loadAds();
      if (adminLoginBtn) adminLoginBtn.textContent = 'Abmelden';
      alert("Adminmodus aktiviert.");
    } else {
      alert("Falsches Passwort!");
    }
    if (adminPasswordInput) adminPasswordInput.value = "";
  });

  // --- Ads (Werbung) ---
  async function loadAds(){
    try{
      const res = await fetch('/api/ads');
      ads = await res.json();
    } catch(err) {
      console.error('ads load error', err);
      ads = [];
    }
    console.log('loadAds: received', Array.isArray(ads) ? ads.length : 0, 'items');
    renderAds();
  }

  function renderAds(){
    if(!adSidebar) { console.warn('renderAds: no #adSidebar on this page'); return; }
    console.log('renderAds: rendering', ads.length, 'ads to adSidebar');
    adSidebar.innerHTML = '';
    ads.forEach((ad, idx) => {
      const wrap = document.createElement('div');
      wrap.className = 'ad-item';
      const hasContent = ad && (ad.img || ad.text || ad.link);

      // If no image/text/link -> show subtle placeholder
      if (!hasContent) {
        wrap.classList.add('ad-placeholder');
        wrap.innerHTML = `
          <div class="ad-placeholder-content">
            <div class="ad-placeholder-box">Werbeplatz frei</div>
            <p class="ad-placeholder-sub">Hier könnte Ihre Anzeige stehen</p>
          </div>
        `;
      } else if (ad && ad.link) {
        // If an ad has a link, make image+text clickable
        wrap.innerHTML = `
          <a href="${ad.link}" target="_blank" rel="noopener noreferrer">
            <img src="${ad.img || '#'}" alt="Werbung ${idx+1}">
            <p class="ad-text">${ad.text || ''}</p>
          </a>
        `;
      } else {
        wrap.innerHTML = `
          <img src="${ad.img || '#'}" alt="Werbung ${idx+1}">
          <p class="ad-text">${ad.text || ''}</p>
        `;
      }

      const editBtn = document.createElement('button');
      editBtn.className = 'admin-edit';
      editBtn.textContent = 'Bearbeiten';
      editBtn.style.marginTop = '6px';
      editBtn.addEventListener('click', ()=> openAdEditor(idx));

      // put edit button into a centered action row under the ad content
      const actions = document.createElement('div');
      actions.className = 'ad-actions';
      actions.appendChild(editBtn);
      wrap.appendChild(actions);

      adSidebar.appendChild(wrap);
    });
    // show/hide edit buttons based on admin mode
    const adminButtons = document.querySelectorAll('.admin-edit');
    adminButtons.forEach(b => b.style.display = isAdmin ? 'inline-block' : 'none');
  }

const links = document.querySelectorAll('.main-nav a');
links.forEach(link => {
  if(link.href === window.location.href) {
    link.classList.add('active');
  }
});

  // --- Blog (Aktuelles) ---
  async function loadBlog(){
    if (!blogPostsEl) return;
    try{
      const res = await fetch('/api/blog');
      blogPosts = await res.json();
    }catch(e){
      console.error('loadBlog error', e);
      blogPosts = [];
    }
    renderBlog();
  }

  function renderBlog(){
    if (!blogPostsEl) return;
    blogPostsEl.innerHTML = '';

    // admin add button
    if (isAdmin) {
      const addBtn = document.createElement('button');
      addBtn.className = 'admin-primary-btn admin-edit';
      addBtn.textContent = '+ Neuen Beitrag';
      addBtn.style.marginBottom = '1rem';
      addBtn.addEventListener('click', ()=> {
        const modal = document.getElementById('editorModal');
        if (modal) modal.classList.remove('hidden');
      });
      blogPostsEl.appendChild(addBtn);
    }

    blogPosts.forEach(p => {
      const art = document.createElement('article');
      art.className = 'blog-post';
      const date = new Date(p.date).toLocaleDateString('de-DE');
      art.innerHTML = `
        <h3>${p.title || ''}</h3>
        <div class="meta">${date}</div>
        ${p.image ? `<img src="${p.image}" alt="" style="max-width:100%;border-radius:6px;margin:8px 0">` : ''}
        ${p.image2 ? `<img src="${p.image2}" alt="" style="max-width:100%;border-radius:6px;margin:8px 0">` : ''}
        <p>${p.content || ''}</p>
        ${p.link ? `<p><a href="${p.link}" target="_blank" rel="noopener">Weiter zum Link</a></p>` : ''}
        ${p.pdf ? `<p><a href="${p.pdf}" target="_blank" rel="noopener">📄 Zusätzliche Informationen</a></p>` : ''}
      `;

      if (isAdmin) {
        const del = document.createElement('button');
        del.className = 'delete-btn admin-edit';
        del.textContent = 'Beitrag löschen';
        del.addEventListener('click', async ()=>{
          if (!p.id) return; if (!confirm('Diesen Beitrag wirklich löschen?')) return;
          await fetch(`/api/blog/${p.id}`, { method: 'DELETE' });
          await loadBlog();
        });
        art.appendChild(del);
      }

      blogPostsEl.appendChild(art);
    });
  }

  // handle new post form
  const addPostForm = document.getElementById('addPostForm');
  if (addPostForm) {
    addPostForm.addEventListener('submit', async (e)=>{
      e.preventDefault();
      const title = document.getElementById('postTitle').value;
      const date = document.getElementById('postDate').value;
      const content = document.getElementById('postContent').value;
      const imgInput1 = document.getElementById('postImage1');
      const imgInput2 = document.getElementById('postImage2');
      const postLink = document.getElementById('postLink');
      const pdfInput1 = document.getElementById('postPdf1');
      let imgPath = null, imgPath2 = null, pdfPath = null;

      if (imgInput1 && imgInput1.files && imgInput1.files.length>0){
        const fd1 = new FormData(); fd1.append('image', imgInput1.files[0]);
        const res1 = await fetch('/api/upload/image', { method:'POST', body: fd1 });
        const data1 = await res1.json(); imgPath = data1.path;
      }
      if (imgInput2 && imgInput2.files && imgInput2.files.length>0){
        const fd2 = new FormData(); fd2.append('image', imgInput2.files[0]);
        const res2 = await fetch('/api/upload/image', { method:'POST', body: fd2 });
        const data2 = await res2.json(); imgPath2 = data2.path;
      }
      if (pdfInput1 && pdfInput1.files && pdfInput1.files.length>0){
        const fdp1 = new FormData(); fdp1.append('pdf', pdfInput1.files[0]);
        const resp1 = await fetch('/api/upload/pdf', { method:'POST', body: fdp1 });
        const datap1 = await resp1.json(); pdfPath = datap1.path;
      }

      await fetch('/api/blog', { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify({ title, date, content, image: imgPath, image2: imgPath2, link: postLink ? postLink.value : null, pdf: pdfPath }) });
      if (document.getElementById('editorModal')) document.getElementById('editorModal').classList.add('hidden');
      addPostForm.reset();
      await loadBlog();
    });

    const cancelAddPost = document.getElementById('cancelAddPost');
    if (cancelAddPost) cancelAddPost.addEventListener('click', ()=>{ const m = document.getElementById('editorModal'); if (m) m.classList.add('hidden'); });
  }

  function openAdEditor(index){
    const modal = document.getElementById('adEditorModal');
    const imgPreview = document.getElementById('adImagePreview');
    const textInput = document.getElementById('adTextInput');
    const adIndex = document.getElementById('adIndex');
    const linkInput = document.getElementById('adLinkInput');

    const ad = ads[index] || {};
    imgPreview.src = ad.img || '';
    textInput.value = ad.text || '';
    if (linkInput) linkInput.value = ad.link || '';
    adIndex.value = index;
    
    // Remove old remove button if exists
    const oldBtn = document.getElementById('removeImageBtn');
    if (oldBtn) oldBtn.remove();
    
    // Create and insert remove button dynamically
    const previewDiv = imgPreview.parentElement;
    const removeBtn = document.createElement('button');
    removeBtn.id = 'removeImageBtn';
    removeBtn.className = 'remove-image-btn';
    removeBtn.type = 'button';
    removeBtn.textContent = 'Bild entfernen';
    removeBtn.style.cssText = 'display:block;margin-top:8px;padding:0.5rem 1rem;background:#fff;color:#e63946;border:1px solid #e63946;border-radius:6px;font-size:0.9rem;cursor:pointer;font-weight:600;width:100%;';
    removeBtn.addEventListener('click', (e) => {
      e.preventDefault();
      imgPreview.src = '';
      adEditorForm.dataset.imageRemoved = 'true';
    });
    previewDiv.appendChild(removeBtn);

    modal.classList.remove('hidden');
  }

  // Ad editor submit
  const adEditorForm = document.getElementById('adEditorForm');
  if(adEditorForm){
    adEditorForm.addEventListener('submit', async (e)=>{
      e.preventDefault();
      const idx = Number(document.getElementById('adIndex').value);
      const fileInput = document.getElementById('adImageInput');
      const textVal = document.getElementById('adTextInput').value;
      const linkVal = document.getElementById('adLinkInput') ? document.getElementById('adLinkInput').value : '';

      let imgPath = ads[idx] && ads[idx].img ? ads[idx].img : null;

      // If image was removed, clear it
      if (adEditorForm.dataset.imageRemoved === 'true') {
        imgPath = null;
      } else if(fileInput.files && fileInput.files.length > 0){
        const fd = new FormData();
        fd.append('image', fileInput.files[0]);
        const res = await fetch('/api/upload/image', { method: 'POST', body: fd });
        const data = await res.json();
        imgPath = data.path;
      }

      // update ads array (include link)
      ads[idx] = { ...(ads[idx] || {}), img: imgPath, text: textVal, link: linkVal };

      // persist to server
      await fetch('/api/ads', { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify(ads) });

      // close modal and re-render
      document.getElementById('adEditorModal').classList.add('hidden');
      adEditorForm.dataset.imageRemoved = 'false';
      const oldBtn = document.getElementById('removeImageBtn');
      if (oldBtn) oldBtn.remove();
      renderAds();
    });

    const cancelAdEditBtn = document.getElementById('cancelAdEdit');
    if (cancelAdEditBtn) cancelAdEditBtn.addEventListener('click', ()=>{
      const adModal = document.getElementById('adEditorModal');
      if (adModal) adModal.classList.add('hidden');
      adEditorForm.dataset.imageRemoved = 'false';
      const oldBtn = document.getElementById('removeImageBtn');
      if (oldBtn) oldBtn.remove();
    });
  }

const editEventModal = document.getElementById("editEventModal");
const editEventList = document.getElementById("editEventList");
const closeEditEventModal = document.getElementById("closeEditEventModal");

if (editEventsBtn) editEventsBtn.addEventListener("click", () => {
  editEventList.innerHTML = ""; // Liste leeren
  events.forEach((ev, index) => {
    const div = document.createElement("div");
    div.className = "day-info-event"; // gleiche Optik wie Tagesansicht
    div.innerHTML = `
      <h4>${ev.thema || "Unbenanntes Event"}</h4>
      <p><strong>Datum:</strong> ${new Date(ev.date).toLocaleDateString('de-DE')}</p>
      <p><strong>Veranstaltung:</strong> ${ev.veranstaltung || "-"}</p>
      <p><strong>Sponsor:</strong> ${ev.sponsor || "-"}</p>
      <p><strong>Modus:</strong> ${ev.mode || "-"}</p>
      <p><strong>Kostenpflichtig:</strong> ${ev.honorar ? "Ja" : "Nein"}</p>
      <p><strong>Kommentar:</strong> ${ev.comment || "-"}</p>
        ${ev.pdf ? `
    <p>
      <strong>PDF:</strong>
      <a href="${ev.pdf}" target="_blank">📄 Zusätzliche Informationen öffnen</a>
    </p>
  ` : `
    <p><strong>PDF:</strong> –</p>
  `}
`;
    div.addEventListener("click", () => {
      // Modal zum Bearbeiten öffnen
      editingEventIndex = index;
      document.getElementById("newEventDate").value = ev.date;
      document.getElementById("newEventVeranstaltung").value = ev.veranstaltung;
      document.getElementById("newEventThema").value = ev.thema;
      document.getElementById("newEventSponsor").value = ev.sponsor;
      document.getElementById("newEventMode").value = ev.mode;
      document.getElementById("newEventHonorar").checked = ev.honorar;
      document.getElementById("newEventKommentar").value = ev.comment;
      document.getElementById("newEventLink").value = ev.link;

      editEventModal.classList.add("hidden");
      addEventModal.classList.remove("hidden");
    });
    editEventList.appendChild(div);
  });
  editEventModal.classList.remove("hidden");
});

if (closeEditEventModal) closeEditEventModal.addEventListener("click", () => {
  if (editEventModal) editEventModal.classList.add("hidden");
});

  // --- Add / Edit Event ---
  if (addEventBtn) addEventBtn.addEventListener("click", () => { if (addEventModal) addEventModal.classList.remove("hidden"); });
  if (cancelAddEventBtn) cancelAddEventBtn.addEventListener("click", () => { if (addEventModal) addEventModal.classList.add("hidden"); });

  if (addEventForm) addEventForm.addEventListener("submit", async (e) => {
    e.preventDefault();
const pdfInput = document.getElementById("newEventPdf");
let pdfPath = null;

if (pdfInput.files.length > 0) {
  const formData = new FormData();
  formData.append("pdf", pdfInput.files[0]);

  const res = await fetch("/api/upload/pdf", {
    method: "POST",
    body: formData
  });
  const data = await res.json();
  pdfPath = data.path;
}

    const eventData = {
      date: document.getElementById("newEventDate").value,
      veranstaltung: document.getElementById("newEventVeranstaltung").value,
      thema: document.getElementById("newEventThema").value,
      sponsor: document.getElementById("newEventSponsor").value,
      mode: document.getElementById("newEventMode").value,
      honorar: document.getElementById("newEventHonorar").checked,
      comment: document.getElementById("newEventKommentar").value,
      link: document.getElementById("newEventLink").value,
      pdf: pdfPath
    };
    if(editingEventIndex !== null){
      if(!events[editingEventIndex].id) events[editingEventIndex].id = Date.now();
      events[editingEventIndex] = { ...eventData, id: events[editingEventIndex].id };
      await updateEventOnServer(events[editingEventIndex]);
      editingEventIndex = null;
    } else {
      eventData.id = Date.now();
      events.push(eventData);
      await addEventToServer(eventData);
    }
    addEventModal.classList.add("hidden");
    addEventForm.reset();
    renderAll();
  });

const burger = document.getElementById('burgerBtn');
const nav = document.getElementById('mainNav');

if (burger && nav) {
  burger.addEventListener('click', () => {
    nav.classList.toggle('open');
  });
}

  // --- Initial Load ---
  async function init() {
    // restore admin state from localStorage
    try {
      if (localStorage.getItem('qz_isAdmin') === '1') {
        isAdmin = true;
        document.body.classList.add('admin-mode');
        if (editEventsBtn) editEventsBtn.style.display = 'inline-block';
        if (addEventBtn) addEventBtn.style.display = 'inline-block';
        if (adminLoginBtn) adminLoginBtn.textContent = 'Abmelden';
      }
    } catch(e) {
      console.warn('localStorage unavailable', e);
    }

    await Promise.all([loadEvents(), loadAds(), loadBlog()]);
    renderAll();
  }

  async function renderAll() {
    renderCalendar();
    renderTable();
    renderAds();
    renderBlog();
  }

  init();
})();
