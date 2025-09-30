import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../api/api';
import { useNavigate } from 'react-router-dom';
import './StudentDashboard.css';

export default function StudentDashboard() {
  const navigate = useNavigate();

  const [events, setEvents] = useState([]);
  const [activeEvents, setActiveEvents] = useState([]);
  const [registeredEvents, setRegisteredEvents] = useState([]);
  const [cancelledEvents, setCancelledEvents] = useState([]);
  const [attendedEvents, setAttendedEvents] = useState([]);
  const [notAttendedEvents, setNotAttendeEvents] = useState([]);

  const [selectedSection, setSelectedSection] = useState(null);

  const [feedbackEventId, setFeedbackEventId] = useState(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [rating, setRating] = useState(5);
  const [myFeedbacks, setMyFeedbacks] = useState([]);

  const [loadingIds, setLoadingIds] = useState(new Set());

  const userId = localStorage.getItem('userId');
  const role = localStorage.getItem('role');

  const isPast = (e) => new Date(e.endDate) < new Date();
  const isFinishedOrCancelled = (e) => e.event_status === 'F' || e.event_status === 'C';

  const statusByEventId = useMemo(() => {
    const map = new Map();
    notAttendedEvents.forEach((e) => map.set(e.eventId, 'N'));
    attendedEvents.forEach((e) => map.set(e.eventId, 'A'));
    cancelledEvents.forEach((e) => map.set(e.eventId, 'C'));
    registeredEvents.forEach((e) => map.set(e.eventId, 'R'));
    return map;
  }, [registeredEvents, cancelledEvents, attendedEvents, notAttendedEvents]);

  const feedbackGivenIds = useMemo(
    () => new Set(myFeedbacks.map((f) => f.eventId)),
    [myFeedbacks]
  );

  const canRegister = (e) =>
    e.event_status === 'A' && !statusByEventId.has(e.eventId);

  const isCancelDisabled = (e) =>
    isPast(e) || isFinishedOrCancelled(e) || statusByEventId.get(e.eventId) === 'C';

  const isFeedbackDisabled = (e) => feedbackGivenIds.has(e.eventId);

  const withLoading = async (key, fn) => {
    setLoadingIds((prev) => new Set(prev).add(key));
    try {
      await fn();
    } finally {
      setLoadingIds((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  };

  const resetTransientState = () => {
    setFeedbackEventId(null);
    setFeedbackText('');
    setRating(5);
    setLoadingIds(new Set());
  };

  const handleSelect = async (section, fetchFn) => {
    resetTransientState();
    setSelectedSection(section);
    if (typeof fetchFn === 'function') await fetchFn();
  };

  useEffect(() => {
    if (!userId || role !== 'USER') {
      alert('Unauthorized access');
      navigate('/');
    } else {
      loadEvents();
      fetchActiveEvents();
      fetchRegisteredEvents(userId);
      fetchCancelledEvents(userId);
      fetchAttendedEvents(userId);
      fetchNotAttendedEvents(userId);
      fetchMyFeedbacks(userId);
    }
  }, [userId, role, navigate]);

  const loadEvents = async () => {
    try {
      const res = await api.get('eventCreation/events');
      setEvents(res.data);
    } catch {
      alert('Failed to load events');
    }
  };

  const fetchActiveEvents = async () => {
    try {
      const res = await api.get('/eventCreation/activeEvents');
      setActiveEvents(res.data);
    } catch {
      alert('Failed to load active events');
    }
  };

  const fetchRegisteredEvents = async (uid) => {
    try {
      const res = await api.get(`/eventCreation/eventsStatus?userId=${uid}&status=R`);
      setRegisteredEvents(res.data);
    } catch {
      alert('Failed to load registered events');
    }
  };

  const fetchCancelledEvents = async (uid) => {
    try {
      const res = await api.get(`/eventCreation/eventsStatus?userId=${uid}&status=C`);
      setCancelledEvents(res.data);
    } catch {
      alert('Failed to load cancelled events');
    }
  };

  const fetchAttendedEvents = async (uid) => {
    try {
      const res = await api.get(`/eventCreation/eventsStatus?userId=${uid}&status=A`);
      setAttendedEvents(res.data);
    } catch {
      alert('Failed to load attended events');
    }
  };

  const fetchNotAttendedEvents = async (uid) => {
    try {
      const res = await api.get(`/eventCreation/eventsStatus?userId=${uid}&status=N`);
      setNotAttendeEvents(res.data);
    } catch {
      alert('Failed to load not attended events');
    }
  };

  const fetchMyFeedbacks = async (uid) => {
    try {
      const res = await api.get(`/feedback/byUser/${uid}`);
      setMyFeedbacks(res.data || []);
    } catch {
      setMyFeedbacks([]);
    }
  };

  const register = async (eventId) => {
    await withLoading(`reg-${eventId}`, async () => {
      try {
        await api.post('/eventRegistration/register', {
          userId: Number(userId),
          eventId,
          registration_status: 'R',
          registeredBy: Number(userId),
          registeredAt: new Date().toISOString(),
        });
        alert('Registered successfully');
        await Promise.all([fetchRegisteredEvents(userId), fetchActiveEvents()]);
      } catch (err) {
        alert('Registration failed');
      }
    });
  };

  const cancel = async (eventId) => {
    await withLoading(`can-${eventId}`, async () => {
      try {
        await api.put('/eventRegistration/update', {
          userId: Number(userId),
          eventId,
          registration_status: 'C',
          updatedBy: Number(userId),
          updatedAt: new Date().toISOString(),
        });
        alert('Registration cancelled');
        await Promise.all([
          fetchRegisteredEvents(userId),
          fetchCancelledEvents(userId),
        ]);
      } catch (err) {
        alert('Cancellation failed');
      }
    });
  };

  function logout() {
    localStorage.removeItem('role');
    localStorage.removeItem('userId');
    window.location.href = '/';
  }

  const submitFeedback = async () => {
    if (!feedbackText.trim()) {
      alert('Please write some feedback.');
      return;
    }

    try {
      await api.post('/feedback/add', {
        userId: Number(userId),
        eventId: feedbackEventId,
        rating: Number(rating),
        feedback: feedbackText,
      });
      alert('Feedback submitted');
      await fetchMyFeedbacks(userId);
      resetTransientState();
    } catch {
      alert('Feedback submission failed');
    }
  };

  return (
    <div className="student-dashboard">
      <h1>
        Welcome Student, User ID: {userId}{' '}
        <span>
          <button onClick={logout} className="btn btn-danger">
            Logout
          </button>
        </span>
      </h1>

      <div className="tabs">
        <button onClick={() => handleSelect('events', loadEvents)}>
          View All Events
        </button>
        <button onClick={() => handleSelect('activeEvents', fetchActiveEvents)}>
          Active Events
        </button>
        <button onClick={() => handleSelect('registeredEvents', () => fetchRegisteredEvents(userId))}>
          Registered Events
        </button>
        <button
          onClick={() =>
            handleSelect('attendedEvents', async () => {
              await Promise.all([fetchAttendedEvents(userId), fetchMyFeedbacks(userId)]);
            })
          }
        >
          Attended Events
        </button>
        <button onClick={() => handleSelect('cancelledEvents', () => fetchCancelledEvents(userId))}>
          Cancelled Events
        </button>
        <button onClick={() => handleSelect('notAttendedEvents', () => fetchNotAttendedEvents(userId))}>
          Not Attended Events
        </button>
      </div>

      {/* ALL EVENTS */}
      {selectedSection === 'events' && (
        <div>
          <h3>All Events</h3>
          {events.length === 0 ? (
            <p>No events available</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Venue</th>
                  <th>Organizer</th>
                  <th>Start</th>
                  <th>End</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {events.map((e) => (
                  <tr key={e.eventId}>
                    <td>{e.eventId}</td>
                    <td>{e.name}</td>
                    <td>{e.venue}</td>
                    <td>{e.eventOrganizer}</td>
                    <td>{new Date(e.startDate).toLocaleString()}</td>
                    <td>{new Date(e.endDate).toLocaleString()}</td>
                    <td>
                      {e.event_status === 'A'
                        ? 'ACTIVE'
                        : e.event_status === 'C'
                        ? 'CANCELLED'
                        : 'FINISHED'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Active EVENTS */}
      {selectedSection === 'activeEvents' && (
        <div>
          <h3>Active Events</h3>
          {activeEvents.length === 0 ? (
            <p>No Active events available</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Venue</th>
                  <th>Start</th>
                  <th>End</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {activeEvents.map((e) => {
                  const can = canRegister(e);
                  const loading = loadingIds.has(`reg-${e.eventId}`);
                  return (
                    <tr key={e.eventId}>
                      <td>{e.eventId}</td>
                      <td>{e.name}</td>
                      <td>{e.venue}</td>
                      <td>{new Date(e.startDate).toLocaleString()}</td>
                      <td>{new Date(e.endDate).toLocaleString()}</td>
                      <td>
                        {e.event_status === 'A'
                          ? 'ACTIVE'
                          : e.event_status === 'C'
                          ? 'CANCELLED'
                          : 'FINISHED'}
                      </td>
                      <td>
                        <button
                          className="registerBtn"
                          disabled={!can || loading}
                          onClick={() => register(e.eventId)}
                          title={
                            !can
                              ? 'You Can Register only if event is ACTIVE and you are Not yet Registered'
                              : 'Register for this event'
                          }
                        >
                          {loading ? 'Registering...' : 'Register'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Registered Events */}
      {selectedSection === 'registeredEvents' && (
        <div>
          <h3>Registered Events</h3>
          {registeredEvents.length === 0 ? (
            <p>No registered events available</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Venue</th>
                  <th>Start</th>
                  <th>End</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {registeredEvents.map((e) => {
                  const disabled = isCancelDisabled(e);
                  const loading = loadingIds.has(`can-${e.eventId}`);
                  return (
                    <tr key={e.eventId}>
                      <td>{e.eventId}</td>
                      <td>{e.name}</td>
                      <td>{e.venue}</td>
                      <td>{new Date(e.startDate).toLocaleString()}</td>
                      <td>{new Date(e.endDate).toLocaleString()}</td>
                      <td>
                        <button
                          className="cancelBtn"
                          disabled={disabled || loading}
                          onClick={() => cancel(e.eventId)}
                          title={
                            disabled
                              ? isPast(e) || isFinishedOrCancelled(e)
                                ? 'Cannot cancel past/finished/cancelled event'
                                : 'Already cancelled'
                              : 'Cancel registration'
                          }
                        >
                          {loading ? 'Cancelling...' : 'Cancel'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Cancelled Events */}
      {selectedSection === 'cancelledEvents' && (
        <div>
          <h3>Cancelled Events</h3>
          {cancelledEvents.length === 0 ? (
            <p>No user cancelled events available</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Venue</th>
                  <th>Start</th>
                  <th>End</th>
                </tr>
              </thead>
              <tbody>
                {cancelledEvents.map((e) => (
                  <tr key={e.eventId}>
                    <td>{e.eventId}</td>
                    <td>{e.name}</td>
                    <td>{e.venue}</td>
                    <td>{new Date(e.startDate).toLocaleString()}</td>
                    <td>{new Date(e.endDate).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Attended Events */}
      {selectedSection === 'attendedEvents' && (
        <div>
          <h3>Attended Events</h3>
          {attendedEvents.length === 0 ? (
            <p>No Attended events available</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Venue</th>
                  <th>Start</th>
                  <th>End</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {attendedEvents.map((e) => {
                  const disabled = isFeedbackDisabled(e);
                  return (
                    <tr key={e.eventId}>
                      <td>{e.eventId}</td>
                      <td>{e.name}</td>
                      <td>{e.venue}</td>
                      <td>{new Date(e.startDate).toLocaleString()}</td>
                      <td>{new Date(e.endDate).toLocaleString()}</td>
                      <td>
                        <button
                          className="feedbackBtn"
                          disabled={disabled}
                          onClick={() => setFeedbackEventId(e.eventId)}
                          title={
                            disabled
                              ? 'Feedback already submitted'
                              : 'Give feedback'
                          }
                        >
                          {disabled ? 'Feedback Submitted' : 'Give Feedback'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Not Attended Events */}
      {selectedSection === 'notAttendedEvents' && (
        <div>
          <h3>Not Attended Events</h3>
          {notAttendedEvents.length === 0 ? (
            <p>No events available</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Venue</th>
                  <th>Start</th>
                  <th>End</th>
                </tr>
              </thead>
              <tbody>
                {notAttendedEvents.map((e) => (
                  <tr key={e.eventId}>
                    <td>{e.eventId}</td>
                    <td>{e.name}</td>
                    <td>{e.venue}</td>
                    <td>{new Date(e.startDate).toLocaleString()}</td>
                    <td>{new Date(e.endDate).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {feedbackEventId && (
        <div className="feedback-form">
          <h3>Feedback for Event ID: {feedbackEventId}</h3>
          <textarea
            placeholder="Write your feedback..."
            value={feedbackText}
            onChange={(e) => setFeedbackText(e.target.value)}
          ></textarea>
          <div className="rating-input">
            <label>Rating (1–10):</label>
            <input
              type="number"
              min="1"
              max="10"
              value={rating}
              onChange={(e) => setRating(e.target.value)}
            />
          </div>
          <button onClick={submitFeedback}>Submit</button>
          <button onClick={resetTransientState} className="cancel-btn">
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
