// sessions.js



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
  // Sort by room name, but Room I, II, ... VII first if present
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
  // Collect all unique start times (slots) across all rooms
  const slots = new Set();
  Object.values(rooms).forEach(sessions => {
    sessions.forEach(s => {
      slots.add(s.startTime);
    });
  });
  return Array.from(slots).sort();
}

function getSessionDurationInSlots(session, slots) {
  // Count how many slots this session spans (by start/endTime)
  if (!session.startTime || !session.endTime) return 1;
  const startIdx = slots.indexOf(session.startTime);
  const endIdx = slots.indexOf(session.endTime);
  if (startIdx === -1 || endIdx === -1) return 1;
  return Math.max(1, endIdx - startIdx);
}

function findSessionForSlot(sessions, slot) {
  return sessions.find(s => s.startTime === slot);
}


function renderSessionsTable(rooms) {
  const container = document.getElementById('sessions-table-container');
  container.innerHTML = '';
  const sortedRooms = sortRooms(rooms);
  const slots = getAllSlots(rooms);

  // Track which sessions are already rendered (for rowspan)
  const rendered = {};

  const table = document.createElement('table');
  table.border = '1';
  table.cellPadding = '6';
  table.cellSpacing = '0';
  table.style.width = '100%';
  table.style.background = '#fff';
  table.style.borderCollapse = 'collapse';
  table.style.fontFamily = 'Arial, sans-serif';
  table.style.fontSize = '15px';
  table.style.margin = '1em auto';
  table.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)';
  table.style.border = '1px solid #bbb';

  // Header row
  const thead = document.createElement('thead');
  const headRow = document.createElement('tr');
  headRow.appendChild(document.createElement('th')); // Empty for time column
  sortedRooms.forEach(room => {
    const th = document.createElement('th');
    th.textContent = room;
    headRow.appendChild(th);
  });
  thead.appendChild(headRow);
  table.appendChild(thead);

  // Body rows
  const tbody = document.createElement('tbody');
  for (let slotIdx = 0; slotIdx < slots.length; ++slotIdx) {
    const slot = slots[slotIdx];
    const row = document.createElement('tr');
    // Time column
    const timeCell = document.createElement('td');
    timeCell.textContent = slot.substring(11,16);
    row.appendChild(timeCell);
    // Session columns
    sortedRooms.forEach(room => {
      // Check if a session is already rendered for this room (rowspan)
      const roomSessions = rooms[room] || [];
      const session = findSessionForSlot(roomSessions, slot);
      if (session && !rendered[room + session.startTime]) {
        // Calculate rowspan
        const duration = getSessionDurationInSlots(session, slots);
        const cell = document.createElement('td');
        cell.rowSpan = duration;
        let titleHtml = `<a href='https://2025.javazone.no/en/program/${session.id}' target='_blank' rel='noopener' style='color:#007acc;text-decoration:underline;'>${session.title}</a>`;
        cell.innerHTML = `<b>${titleHtml}</b><br><small>${(session.speakers||[]).map(s=>s.name).join(', ')}</small>`;
        row.appendChild(cell);
        // Mark this session as rendered for the next (duration-1) slots
        for (let i = 0; i < duration; ++i) {
          rendered[room + slots[slotIdx + i]] = true;
        }
      } else if (!rendered[room + slot]) {
        // Empty cell
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
