/* OL Portal · proposals (PRD 3.4-3.5, 3.8). The editor is a conversation:
   you talk to The Optimist (OL's proposal writer) and the document forms in a
   live preview beside the chat. Every update it makes auto-saves as a new
   version. Humans keep the controls that matter: status, ★ Final, Send. */

function renderProposals() {
  const drawList = () => {
    const props = visibleProposals();
    document.getElementById("propRows").innerHTML = props.length ? props.map(p => `<tr class="rowlink" data-open="${p.id}" tabindex="0">
        <td><b>${p.title}</b><br><small style="color:var(--ink-mute)">${p.id} · deal ${p.deal} · ${p.client || ""}</small></td>
        <td>${labCell(p.lab)}</td>
        <td>${personCell(p.author)}</td>
        <td><span class="badge ${PROPOSAL_CLASS[p.status] || "b-draft"}"><i></i>${p.status}</span></td>
        <td>v${p.version}${p.final ? ' <span class="badge b-approved">★ Final</span>' : ""}
          ${p.sentAt ? `<small style="display:block;color:var(--ink-mute)">sent v${p.sentVersion}</small>` : ""}</td>
        <td>${p.updated}</td>
      </tr>`).join("") : '<tr><td colspan="6" class="empty">No proposals yet. Start one and The Optimist will build it with you.</td></tr>';
  };

  if (ROLE === "Admin" || ROLE === "Lab Leader") {
    const btn = document.createElement("button");
    btn.className = "pill pill-primary";
    btn.textContent = "+ New proposal";
    btn.onclick = () => openNewProposal(drawList);
    document.querySelector(".card-head").appendChild(btn);
  }

  document.getElementById("propRows").addEventListener("click", e => {
    const row = e.target.closest("[data-open]");
    if (row) openProposalEditor(row.dataset.open, drawList);
  });
  drawList();
}

function openNewProposal(onDone) {
  const dealOpts = DEALS.map(d =>
    `<option value="${d.id}">${d.client} (${d.id} · ${LABS[d.lab]?.name || d.lab})</option>`).join("");
  if (!dealOpts) { alert("Create a deal first — proposals are attached to deals."); return; }
  const back = overlay(`
    <div class="modal-head"><h2>New proposal</h2><button class="x" aria-label="Close">×</button></div>
    <div class="f-grid">
      <label class="field f-wide">Deal<select id="npDeal">${dealOpts}</select></label>
      <label class="field f-wide">Proposal title<input id="npTitle" placeholder="e.g. Capital campaign infrastructure — Phase 1"></label>
    </div>
    <div class="modal-foot">
      <button class="pill pill-outline" id="npCancel">Cancel</button>
      <button class="pill pill-primary" id="npCreate">Start with The Optimist</button>
    </div>`, "modal");
  back.querySelector(".x").onclick = back.querySelector("#npCancel").onclick = () => back.remove();
  back.querySelector("#npCreate").onclick = async e => {
    const title = back.querySelector("#npTitle").value.trim();
    if (!title) { alert("Give the proposal a title."); return; }
    e.target.disabled = true;
    try {
      const p = await createProposal(back.querySelector("#npDeal").value, title);
      back.remove(); onDone && onDone();
      openProposalEditor(p.id, onDone);
    } catch (ex) { alert(ex.message); e.target.disabled = false; }
  };
  back.querySelector("#npTitle").focus();
}

function openProposalEditor(id, onDone) {
  const p = PROPOSALS.find(x => x.id === id);
  if (!p) return;
  const editable = can.editProposal(p);
  const statuses = can.approveProposal()
    ? ["Draft", "In Review", "Internally Approved", "Sent", "Customer Approved", "Customer Rejected", "Revision Requested"]
    : ["Draft", "In Review", "Sent"];

  const versionsHTML = () => (p.versions || []).slice().reverse().slice(0, 6).map(v =>
    `<button class="btn-mini" data-ver="${v.v}" title="Restore this snapshot (saves as a new version)">v${v.v} · ${v.date} · ${v.status}</button>`).join(" ")
    || '<small style="color:var(--ink-mute)">Every change The Optimist makes is saved as a version.</small>';

  const back = overlay(`
    <div class="modal-head">
      <div><h2>${p.title}</h2>
        <small class="drawer-sub">${p.id} · deal ${p.deal} · ${LABS[p.lab]?.name || p.lab} ·
          <span class="badge ${PROPOSAL_CLASS[p.status] || "b-draft"}"><i></i>${p.status}</span>
          <span id="peVer">v${p.version}</span>${p.final ? " · ★ Final" : ""}</small></div>
      <button class="x" aria-label="Close">×</button>
    </div>
    ${p.decision ? `<div class="todo" style="margin-bottom:10px"><span class="dot" style="background:${p.decision.action === "approve" ? "var(--green,#3B6D11)" : "var(--red,#C0392B)"}"></span>
      <span><b>Client ${p.decision.action === "approve" ? "approved" : p.decision.action === "reject" ? "rejected" : "requested revisions on"} v${p.decision.version}</b>
      <small>${p.decision.name ? p.decision.name + " · " : ""}${(p.decision.at || "").slice(0, 10)}${p.decision.comment ? " · “" + p.decision.comment + "”" : ""}</small></span></div>` : ""}
    <div class="prop-grid${editable ? "" : " solo"}">
      ${editable ? `
      <div class="chat-col">
        <div class="chat-name">✦ The Optimist <small>OL's proposal writer — everything in the document is written through this conversation</small></div>
        <div class="chat-log" id="peChat"></div>
        <div style="display:flex;gap:8px;margin-top:8px">
          <input id="peChatIn" placeholder="Tell The Optimist about this engagement…"
            style="flex:1;padding:9px 12px;border:1.5px solid #ddd7ce;border-radius:9px;font:inherit">
          <button class="pill pill-outline" id="peChatSend">Send</button>
        </div>
      </div>` : ""}
      <div class="doc-col">
        <div class="doc-preview" id="peDoc"></div>
        <div style="margin-top:10px"><b style="font-size:12px">VERSIONS</b><br><span id="peVers">${versionsHTML()}</span></div>
      </div>
    </div>
    <div class="modal-foot" style="flex-wrap:wrap;gap:8px">
      ${editable ? `<select id="peStatus" class="row-sel" aria-label="Status">
        ${statuses.includes(p.status) ? "" : `<option selected>${p.status}</option>`}
        ${statuses.map(s => `<option${s === p.status ? " selected" : ""}>${s}</option>`).join("")}</select>
      <button class="pill pill-outline" id="peFinal">${p.final ? "Unmark Final" : "★ Mark Final"}</button>
      <button class="pill pill-outline" id="peSend" ${p.final ? "" : 'disabled title="Mark Final first"'}>Send to client</button>` : ""}
      <span style="flex:1"></span>
      <button class="pill pill-outline" id="peClose">Close</button>
    </div>
    <div id="peLink" style="display:none;margin-top:10px;padding:10px;background:#f6f3ee;border-radius:8px;font-size:13px;word-break:break-all"></div>`,
    "modal modal-xl");

  const $$ = sel => back.querySelector(sel);
  let sections = { ...(p.sections || {}) };
  const reopen = () => { back.remove(); onDone && onDone(); openProposalEditor(id, onDone); };

  const renderDoc = () => {
    $$("#peDoc").innerHTML = Object.entries(SECTION_LABELS).map(([k, label]) => `
      <h4>${label}</h4>
      ${(sections[k] || "").trim()
        ? `<div class="doc-sec">${sections[k].replace(/</g, "&lt;").replace(/\n/g, "<br>")}</div>`
        : '<div class="doc-sec doc-empty">Not written yet</div>'}`).join("");
  };
  renderDoc();

  $$(".x").onclick = $$("#peClose").onclick = () => { back.remove(); onDone && onDone(); };

  back.querySelectorAll("[data-ver]").forEach(b => b.onclick = async () => {
    const snap = (p.versions || []).find(v => String(v.v) === b.dataset.ver);
    if (!snap || !editable) return;
    if (!confirm(`Restore the v${snap.v} snapshot? It saves as a new version, so nothing is lost.`)) return;
    b.disabled = true;
    try { await saveProposalSections(id, snap.sections || {}); reopen(); }
    catch (ex) { alert(ex.message); b.disabled = false; }
  });

  if (!editable) return;

  $$("#peStatus").onchange = async e => {
    e.target.disabled = true;
    try { await setProposalStatus(id, e.target.value); reopen(); }
    catch (ex) { alert(ex.message); e.target.disabled = false; }
  };
  $$("#peFinal").onclick = async e => {
    e.target.disabled = true;
    try { await toggleProposalFinal(id); reopen(); }
    catch (ex) { alert(ex.message); e.target.disabled = false; }
  };
  $$("#peSend").onclick = async e => {
    if (!confirm("Send this proposal to the client? The current Final version gets locked as what they see, and you'll get a share link to pass along.")) return;
    e.target.disabled = true;
    try {
      const out = await sendProposalToClient(id);
      const link = $$("#peLink");
      link.style.display = "block";
      link.innerHTML = `Client link (v${out.sentVersion} locked): <b>${out.url}</b> <button class="btn-mini" id="peCopy">Copy</button>`;
      $$("#peCopy").onclick = () => navigator.clipboard.writeText(out.url);
    } catch (ex) { alert(ex.message); e.target.disabled = false; }
  };

  /* ---------- the conversation (history survives editor reopen) ---------- */
  const chats = window._propChats = window._propChats || {};
  const chat = chats[id] = chats[id] || [{
    role: "assistant",
    content: "Hi, I'm The Optimist — I write OL's proposals. Tell me about this engagement: who's the client, what problem are we solving for them, and roughly what should OL do? I'll build the document as we talk."
  }];
  const log = $$("#peChat");
  const drawChat = (thinking) => {
    log.innerHTML = chat.map(m =>
      `<div class="msg ${m.role}"><span>${m.content.replace(/</g, "&lt;").replace(/\n/g, "<br>")}${m.applied ? ` <em class="applied">✦ document updated · v${m.ver} saved</em>` : ""}</span></div>`).join("") +
      (thinking ? '<div class="msg assistant"><span class="typing">writing…</span></div>' : "");
    log.scrollTop = log.scrollHeight;
  };
  const sendChat = async () => {
    const input = $$("#peChatIn"), btn = $$("#peChatSend");
    const text = input.value.trim();
    if (!text) return;
    chat.push({ role: "user", content: text });
    input.value = ""; input.disabled = btn.disabled = true;
    drawChat(true);
    try {
      const out = await assistChat(id,
        chat.map(({ role, content }) => ({ role, content })), sections);
      let applied = false;
      for (const k of Object.keys(SECTION_LABELS)) {
        const v = out.sections?.[k];
        if (v && v.trim()) { sections[k] = v; applied = true; }
      }
      let ver;
      if (applied) {
        const saved = await saveProposalSections(id, sections);
        p.versions = saved.versions; p.version = saved.version; p.updated = saved.updated;
        ver = saved.version;
        $$("#peVer").textContent = "v" + ver;
        $$("#peVers").innerHTML = versionsHTML();
        renderDoc();
      }
      chat.push({ role: "assistant", content: out.reply, applied, ver });
    } catch (ex) {
      chat.pop();
      input.value = text;
      alert(ex.message);
    }
    input.disabled = btn.disabled = false;
    drawChat();
    input.focus();
  };
  $$("#peChatSend").onclick = sendChat;
  $$("#peChatIn").addEventListener("keydown", e => { if (e.key === "Enter") sendChat(); });
  drawChat();
  $$("#peChatIn").focus();
}
