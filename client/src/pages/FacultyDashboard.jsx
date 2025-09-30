import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/api';
import './FacultyDashboard.css';

const dbg = (...args) => console.debug('[FacultyDashboard]', ...args);

export default function FacultyDashboard() {
  const navigate = useNavigate();

  const [selectedSection, setSelectedSection] = useState(null);

  const [events, setEvents] = useState([]);
  const [feedbacks, setFeedbacks] = useState([]);
  const [users, setUsers] = useState([]);

  const [eventIdInput, setEventIdInput] = useState('');
  const [selectedEvent, setSelectedEvent] = useState(null);

  const userId = localStorage.getItem('userId');
  const role = localStorage.getItem('role');

  useEffect(() => {
    dbg('mounted. userId=', userId, 'role=', role);
    if (!userId || role !== 'FACULTY') {
      alert('Unauthorized access');
      navigate('/');
    }
  }, [userId, role, navigate]);

  /* ---------------- Helpers ---------------- */
  const resetTabState = () => {
    dbg('resetTabState()');
    setEvents([]);
    setFeedbacks([]);
    setUsers([]);
    setSelectedEvent(null);
    setEventIdInput('');
  };

  const handleTabChange = async (section) => {
    dbg('handleTabChange ->', section);
    resetTabState();
    setSelectedSection(section);
    if (section === 'events') {
      await loadEvents();
    }
  };

  // Make any axios error human-readable (even when backend returns Blob)
  const errorMsg = async (err, fallback) => {
    const d = err?.response?.data;
    if (d instanceof Blob) {
      try {
        const text = await d.text();
        try {
          const json = JSON.parse(text);
          return json.message || text;
        } catch {
          return text;
        }
      } catch {
        return fallback;
      }
    }
    if (typeof d === 'string') return d;
    if (d && typeof d === 'object' && d.message) return d.message;
    return fallback;
  };

  /** ---------------- Attendance rule (simplified) ----------------
   * Enable buttons ONLY WHEN event_status === 'F'
   */
  const canGiveAttendance = () => {
    const can = selectedEvent && selectedEvent.event_status === 'F';
    dbg('canGiveAttendance ->', can, 'event_status=', selectedEvent?.event_status);
    return can;
  };

  const attendanceInfo = () => {
    if (!selectedEvent) return 'Enter an Event ID first';
    return 'Attendance can be marked only when the event is FINISHED (status F).';
  };

  const attendanceDisabledTitle = () =>
    canGiveAttendance()
      ? 'You can mark attendance'
      : 'Allowed only when event status is FINISHED (F)';

  const noEventId = !eventIdInput;

  /* ---------------- API calls ---------------- */
  const loadEvents = async () => {
    dbg('API: GET /eventCreation/events');
    try {
      const res = await api.get('/eventCreation/events');
      dbg('API OK: /eventCreation/events ->', res.status, 'items:', Array.isArray(res.data) ? res.data.length : 'n/a');
      setEvents(res.data);
    } catch (err) {
      const msg = await errorMsg(err, 'Failed to load events');
      console.error('API ERR: /eventCreation/events', err);
      alert(msg);
    }
  };

  const fetchEventMeta = async (id) => {
    if (!id) {
      dbg('fetchEventMeta -> empty id, clearing selectedEvent');
      setSelectedEvent(null);
      return;
    }
    const url = `/eventCreation/event?eventId=${id}`;
    dbg('API: GET', url);
    try {
      const res = await api.get(url);
      dbg('API OK:', url, '->', res.status, res.data);
      setSelectedEvent(res.data);
    } catch (err) {
      console.error('API ERR:', url, err);
      setSelectedEvent(null);
    }
  };

  const downloadPdf = async (type, eventId, filenamePrefix) => {
    if (!eventId) {
      alert('Please enter an Event ID');
      return;
    }
    const url = `/pdf/${type}?eventId=${eventId}`;
    dbg('API: GET (blob)', url);
    try {
      const res = await api.get(url, { responseType: 'blob' });
      dbg('API OK (blob):', url, 'status:', res.status, 'size:', res.data?.size);
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const dlUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = dlUrl;
      a.download = `${filenamePrefix}_event_${eventId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(dlUrl);
    } catch (err) {
      console.error('API ERR (blob):', url, err);
      alert(await errorMsg(err, 'PDF download failed!'));
    }
  };

  const fetchFeedbacks = async () => {
    dbg('fetchFeedbacks for eventId=', eventIdInput);
    try {
      await fetchEventMeta(eventIdInput);
      const url = `/feedback/feedbacks?eventId=${eventIdInput}`;
      dbg('API: GET', url);
      const res = await api.get(url);
      dbg('API OK:', url, '->', res.status, 'items:', res.data?.length);
      setFeedbacks(res.data);
    } catch (err) {
      const msg = await errorMsg(err, 'Failed to fetch feedbacks');
      console.error('API ERR: feedbacks', err);
      alert(msg);
    }
  };

  const fetchUsers = async (type) => {
    dbg('fetchUsers type=', type, 'eventId=', eventIdInput);
    try {
      await fetchEventMeta(eventIdInput);
      const statusMap = {
        attendants: 'A',
        registered: 'R',
        absentees: 'N',
        cancelled: 'C',
      };
      const url = `/eventRegistration/users?eventId=${eventIdInput}&status=${statusMap[type]}`;
      dbg('API: GET', url);
      const res = await api.get(url);
      dbg('API OK:', url, '->', res.status, 'items:', res.data?.length);
      setUsers(res.data);
    } catch (err) {
      const msg = await errorMsg(err, 'Failed to fetch users');
      console.error('API ERR: users', err);
      alert(msg);
    }
  };

  const giveAttendance = async (targetUserId, status) => {
    dbg('giveAttendance to userId=', targetUserId, 'status=', status, 'eventId=', eventIdInput);
    try {
      if (!canGiveAttendance()) {
        alert('You can give attendance only when event status is FINISHED (F).');
        return;
      }
      const url = '/eventRegistration/attendance';
      const payload = {
        userId: Number(targetUserId),
        eventId: Number(eventIdInput),
        registration_status: status, // 'A' or 'N'
        updatedBy: Number(userId),
        updatedAt: new Date().toISOString(),
      };
      dbg('API: PUT', url, payload);
      const res = await api.put(url, payload);
      dbg('API OK: attendance ->', res.status);
      alert('Attendance marked successfully');
      await fetchUsers('registered');
    } catch (err) {
      const msg = await errorMsg(err, 'Failed to mark attendance');
      console.error('API ERR: attendance', err);
      alert(msg);
    }
  };

  function logout() {
    dbg('logout() called');
    localStorage.removeItem('role');
    localStorage.removeItem('userId');
    window.location.href = '/';
  }

  // Watch eventId changes (optional – just to see it)
  useEffect(() => {
    dbg('eventIdInput changed ->', eventIdInput);
  }, [eventIdInput]);

  return (
    <div className="faculty-dashboard">
      <h1>
        Welcome Faculty, User ID: {userId}{' '}
        <span>
          <button onClick={logout} className="btn btn-danger">Logout</button>
        </span>
      </h1>

      <div className="tabs">
        <button onClick={() => handleTabChange('events')}>Events</button>
        <button onClick={() => handleTabChange('registered')}>Registered Members</button>
        <button onClick={() => handleTabChange('feedback')}>Feedbacks</button>
        <button onClick={() => handleTabChange('attendants')}>Attendants</button>
        <button onClick={() => handleTabChange('cancelled')}>Cancelled / Absentees</button>
      </div>

      {/* All Events */}
      {selectedSection === 'events' && (
        <div>
          <h3>All Events</h3>
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Venue</th>
                <th>Start</th>
                <th>End</th>
                <th>Organizer</th>
                <th>Capacity</th>
                <th>Status</th>
                <th>Created By</th>
                <th>Created At</th>
                <th>Updated By</th>
                <th>Updated At</th>
              </tr>
            </thead>
            <tbody>
              {events.length === 0 ? (
                <tr>
                  <td colSpan={12} style={{ textAlign: 'center', padding: '12px' }}>
                    No events found
                  </td>
                </tr>
              ) : (
                events.map((e) => (
                  <tr key={e.eventId}>
                    <td>{e.eventId}</td>
                    <td>{e.name}</td>
                    <td>{e.venue}</td>
                    <td>{e.startDate}</td>
                    <td>{e.endDate}</td>
                    <td>{e.eventOrganizer}</td>
                    <td>{e.eventCapacity}</td>
                    <td>
                      {e.event_status === 'A'
                        ? 'ACTIVE'
                        : e.event_status === 'C'
                        ? 'CANCELLED'
                        : 'FINISHED'}
                    </td>
                    <td>{e.createdBy}</td>
                    <td>{e.createdAt}</td>
                    <td>{e.updatedBy}</td>
                    <td>{e.updatedAt}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Feedback Section */}
      {selectedSection === 'feedback' && (
        <div>
          <h3>View Feedbacks</h3>
          <input
            type="number"
            placeholder="Enter Event ID"
            value={eventIdInput}
            onChange={(e) => setEventIdInput(e.target.value)}
            onBlur={() => fetchEventMeta(eventIdInput)}
          />
          <button
            onClick={fetchFeedbacks}
            disabled={noEventId}
            title={noEventId ? 'Enter an Event ID first' : undefined}
          >
            Get Feedback
          </button>
          <button
            onClick={() => downloadPdf('feedback', eventIdInput, 'feedback')}
            title={noEventId ? 'Enter an Event ID first' : 'Download PDF'}
            disabled={noEventId}
          >
            Download PDF
          </button>

          <table className="data-table">
            <thead>
              <tr>
                <th>User ID</th>
                <th>Feedback</th>
                <th>Rating</th>
              </tr>
            </thead>
            <tbody>
              {feedbacks.length === 0 ? (
                <tr>
                  <td colSpan={3} style={{ textAlign: 'center', padding: '12px' }}>
                    No feedbacks found
                  </td>
                </tr>
              ) : (
                feedbacks.map((f, idx) => (
                  <tr key={idx}>
                    <td>{f.userId}</td>
                    <td>{f.feedback}</td>
                    <td>{f.rating}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Registered Members + Give Attendance */}
      {selectedSection === 'registered' && (
        <div>
          <h3>Registered Members</h3>
          <input
            type="number"
            placeholder="Enter Event ID"
            value={eventIdInput}
            onChange={(e) => setEventIdInput(e.target.value)}
            onBlur={() => fetchUsers('registered')}
          />
          <div style={{ marginTop: 10, marginBottom: 10, fontSize: 13, color: '#555' }}>
            {selectedEvent ? (
              <>
                <strong>Event status:</strong>{' '}
                {selectedEvent.event_status === 'F'
                  ? 'FINISHED'
                  : selectedEvent.event_status === 'A'
                  ? 'ACTIVE'
                  : 'CANCELLED'}
                <br />
                <strong>End date:</strong>{' '}
                {new Date(selectedEvent.endDate).toLocaleString()}
                <br />
                <strong>Attendance rule:</strong> {attendanceInfo()}
              </>
            ) : (
              <>Enter an Event ID to check attendance possibility.</>
            )}
          </div>

          <button
            onClick={() => fetchUsers('registered')}
            disabled={noEventId}
            title={noEventId ? 'Enter an Event ID first' : undefined}
          >
            Get Registered Members
          </button>
          <button
            onClick={() => downloadPdf('registered', eventIdInput, 'registered')}
            title={noEventId ? 'Enter an Event ID first' : 'Download PDF'}
            disabled={noEventId}
          >
            Download PDF
          </button>

          <table className="data-table">
            <thead>
              <tr>
                <th>User ID</th>
                <th>Name</th>
                <th>Email</th>
                <th>Give Attendance</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', padding: '12px' }}>
                    No registered members found
                  </td>
                </tr>
              ) : (
                users.map((u, idx) => (
                  <tr key={idx}>
                    <td>{u.userId}</td>
                    <td>{u.name}</td>
                    <td>{u.email}</td>
                    <td>
                      <button
                        className="registerBtn"
                        disabled={!canGiveAttendance()}
                        title={attendanceDisabledTitle()}
                        onClick={() => giveAttendance(u.userId, 'A')}
                      >
                        Present
                      </button>{' '}
                      <button
                        className="cancelBtn"
                        disabled={!canGiveAttendance()}
                        title={attendanceDisabledTitle()}
                        onClick={() => giveAttendance(u.userId, 'N')}
                      >
                        Absent
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Attendants */}
      {selectedSection === 'attendants' && (
        <div>
          <h3>Event Attendants</h3>
          <input
            type="number"
            placeholder="Enter Event ID"
            value={eventIdInput}
            onChange={(e) => setEventIdInput(e.target.value)}
            onBlur={() => fetchEventMeta(eventIdInput)}
          />
          <button
            onClick={() => fetchUsers('attendants')}
            disabled={noEventId}
            title={noEventId ? 'Enter an Event ID first' : undefined}
          >
            Get Attendants
          </button>
          <button
            onClick={() => downloadPdf('attended', eventIdInput, 'attended')}
            title={noEventId ? 'Enter an Event ID first' : 'Download PDF'}
            disabled={noEventId}
          >
            Download PDF
          </button>

          <table className="data-table">
            <thead>
              <tr>
                <th>User ID</th>
                <th>Name</th>
                <th>Email</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan={3} style={{ textAlign: 'center', padding: '12px' }}>
                    No attendants found
                  </td>
                </tr>
              ) : (
                users.map((u, idx) => (
                  <tr key={idx}>
                    <td>{u.userId}</td>
                    <td>{u.name}</td>
                    <td>{u.email}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Cancelled / Absentees */}
      {selectedSection === 'cancelled' && (
        <div>
          <h3>Cancelled / Absentees</h3>
          <input
            type="number"
            placeholder="Enter Event ID"
            value={eventIdInput}
            onChange={(e) => setEventIdInput(e.target.value)}
            onBlur={() => fetchEventMeta(eventIdInput)}
          />
          <div className="tabs" style={{ marginTop: 10 }}>
            <button
              onClick={() => fetchUsers('absentees')}
              disabled={noEventId}
              title={noEventId ? 'Enter an Event ID first' : undefined}
            >
              View Absentees
            </button>
            <button
              onClick={() => fetchUsers('cancelled')}
              disabled={noEventId}
              title={noEventId ? 'Enter an Event ID first' : undefined}
            >
              View Cancelled
            </button>
          </div>

          <button
            onClick={() => downloadPdf('cancelled', eventIdInput, 'cancelled')}
            title={noEventId ? 'Enter an Event ID first' : 'Download PDF'}
            disabled={noEventId}
          >
            Download Cancelled PDF
          </button>
          <button
            onClick={() => downloadPdf('absentees', eventIdInput, 'absentees')}
            title={noEventId ? 'Enter an Event ID first' : 'Download PDF'}
            disabled={noEventId}
          >
            Download Absentees PDF
          </button>

          <table className="data-table">
            <thead>
              <tr>
                <th>User ID</th>
                <th>Name</th>
                <th>Email</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan={3} style={{ textAlign: 'center', padding: '12px' }}>
                    No cancelled / absentees found
                  </td>
                </tr>
              ) : (
                users.map((u, idx) => (
                  <tr key={idx}>
                    <td>{u.userId}</td>
                    <td>{u.name}</td>
                    <td>{u.email}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
