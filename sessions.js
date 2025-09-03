// sessions.js

async function fetchSessions() {
  const res = await fetch('https://sleepingpill.javazone.no/public/allSessions/javazone_2025');
  if (!res.ok) throw new Error('Failed to fetch sessions');
  return res.json();
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

function renderSessions(rooms) {
  const container = document.getElementById('sessions-container');
  container.innerHTML = '';
  const sortedRooms = sortRooms(rooms);
  sortedRooms.forEach(room => {
    const col = document.createElement('div');
    col.className = 'session-column';
    const header = document.createElement('h2');
    header.textContent = room;
    col.appendChild(header);
    rooms[room]
      .sort((a, b) => a.startTime.localeCompare(b.startTime))
      .forEach(session => {
        const card = document.createElement('div');
        card.className = 'session-card';
        card.innerHTML = `
          <div class="session-title">${session.title}</div>
          <div class="session-time">${session.startTime.substring(11,16)} - ${session.endTime.substring(11,16)}</div>
          <div class="session-speaker">${(session.speakers||[]).map(s=>s.name).join(', ')}</div>
        `;
        col.appendChild(card);
      });
    container.appendChild(col);
  });
}

fetchSessions()
  .then(data => renderSessions(groupByRoom(data.sessions)))
  .catch(err => {
    document.getElementById('sessions-container').textContent = 'Failed to load sessions.';
    console.error(err);
  });
