// sessions2.js

async function fetchSessions() {
  const res = await fetch('https://sleepingpill.javazone.no/public/allSessions/javazone_2025');
  if (!res.ok) throw new Error('Failed to fetch sessions');
  const data = await res.json();
  // Filter out workshops
  data.sessions = data.sessions.filter(s => (s.format || '').toLowerCase() !== 'workshop');
  // Filter out sessions older than 1 hour from now
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  data.sessions = data.sessions.filter(s => {
    if (!s.startTime) return false;
    const start = new Date(s.startTime);
    return start >= oneHourAgo;
  });
  return data;
}

function groupByRoom(sessions) {
  const rooms = {};
  sessions.forEach(session => {
    if (!rooms[session.room]) rooms[session.room] = [];
    rooms[session.room].push(session);
  });
  return rooms;
}

function sortRooms(rooms) {
  const order = ['Room I','Room II','Room III','Room IV','Room V','Room VI','Room VII'];
  return Object.keys(rooms).sort((a, b) => {
    const ia = order.indexOf(a);
    const ib = order.indexOf(b);
    if (ia !== -1 && ib !== -1) return ia - ib;
    if (ia !== -1) return -1;
    if (ib !== -1) return 1;
    return a.localeCompare(b);
  });
}

function getAllSlots(rooms) {
  const slots = new Set();
  Object.values(rooms).forEach(sessions => {
    sessions.forEach(s => {
      slots.add(s.startTime);
    });
  });
  return Array.from(slots).sort();
}

function getSessionDurationInSlots(session, slots) {
  if (!session.startTime || !session.endTime) return 1;
  const startIdx = slots.indexOf(session.startTime);
  const endIdx = slots.indexOf(session.endTime);
  if (startIdx === -1 || endIdx === -1) return 1;
  return Math.max(1, endIdx - startIdx);
}

function findSessionForSlot(sessions, slot) {
  return sessions.find(s => s.startTime === slot);
}

function showModal(session) {
  const modalBg = document.getElementById('modal-bg');
  const modalContent = document.getElementById('modal-content');
  modalContent.innerHTML = `
    <h2>${session.title}</h2>
    <div><b>Time:</b> ${session.startTime.substring(11,16)} - ${session.endTime.substring(11,16)}</div>
    <div><b>Room:</b> ${session.room}</div>
    <div><b>Speakers:</b> ${(session.speakers||[]).map(s=>s.name).join(', ')}</div>
    <div><b>Format:</b> ${session.format || ''}</div>
    <div style="margin:1em 0;"><b>Abstract:</b><br>${session.abstract || ''}</div>
    <div><a href='https://2025.javazone.no/en/program/${session.id}' target='_blank' rel='noopener'>Open info page</a></div>
    ${session.video ? `<div><a href='https://vimeo.com/${session.video}' target='_blank' rel='noopener'>Watch video</a></div>` : ''}
  `;
  modalBg.classList.add('active');
}

function closeModal() {
  document.getElementById('modal-bg').classList.remove('active');
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('modal-close').onclick = closeModal;
  document.getElementById('modal-bg').onclick = function(e) {
    if (e.target === this) closeModal();
  };
});

function renderSessionsTable(rooms) {
  const container = document.getElementById('sessions-table-container');
  container.innerHTML = '';
  const sortedRooms = sortRooms(rooms);
  const slots = getAllSlots(rooms);
  const rendered = {};
  const table = document.createElement('table');
  table.className = 'sessions-table';
  const thead = document.createElement('thead');
  const headRow = document.createElement('tr');
  headRow.appendChild(document.createElement('th'));
  sortedRooms.forEach(room => {
    const th = document.createElement('th');
    th.textContent = room;
    headRow.appendChild(th);
  });
  thead.appendChild(headRow);
  table.appendChild(thead);
  const tbody = document.createElement('tbody');
  for (let slotIdx = 0; slotIdx < slots.length; ++slotIdx) {
    const slot = slots[slotIdx];
    const row = document.createElement('tr');
    const timeCell = document.createElement('td');
    timeCell.textContent = slot.substring(11,16);
    row.appendChild(timeCell);
    sortedRooms.forEach(room => {
      const roomSessions = rooms[room] || [];
      const session = findSessionForSlot(roomSessions, slot);
      if (session && !rendered[room + session.startTime]) {
        const duration = getSessionDurationInSlots(session, slots);
        const cell = document.createElement('td');
        cell.rowSpan = duration;
        let titleHtml = `<a href="#" class="session-link" data-session-id="${session.id}">${session.title}</a>`;
        cell.innerHTML = `<b>${titleHtml}</b><br><small>${(session.speakers||[]).map(s=>s.name).join(', ')}</small>`;
        cell.querySelector('.session-link').onclick = (e) => {
          e.preventDefault();
          showModal(session);
        };
        row.appendChild(cell);
        for (let i = 0; i < duration; ++i) {
          rendered[room + slots[slotIdx + i]] = true;
        }
      } else if (!rendered[room + slot]) {
        const cell = document.createElement('td');
        cell.innerHTML = '';
        row.appendChild(cell);
      }
    });
    tbody.appendChild(row);
  }
  table.appendChild(tbody);
  container.appendChild(table);
}

fetchSessions()
  .then(data => renderSessionsTable(groupByRoom(data.sessions)))
  .catch(err => {
    document.getElementById('sessions-table-container').textContent = 'Failed to load sessions.';
    console.error(err);
  });
