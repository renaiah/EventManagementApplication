import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./AdminDashboard.css";

export default function AdminDashboard() {
  const [users, setUsers] = useState([]);
  const [events, setEvents] = useState([]);

  const [userForm, setUserForm] = useState({
    userId: "",
    name: "",
    phnNumber: "",
    email: "",
    role: "",
    gender: "",
    status: "",
    dept: ""
  });

  const [eventForm, setEventForm] = useState({
    eventId: "",
    name: "",
    startDate: "",
    endDate: "",
    venue: "",
    eventOrganizer: "",
    eventCapacity: "",
    participantCount: "",
    event_status: ""
  });

  const [editingUser, setEditingUser] = useState(null);
  const [editingEvent, setEditingEvent] = useState(null);
  const [activeTab, setActiveTab] = useState("addUser");

  const navigate = useNavigate();
  const userId = localStorage.getItem("userId");
  const role = localStorage.getItem("role");

  useEffect(() => {
    if (!userId || role !== "ADMIN") {
      alert("Unauthorized access");
      navigate("/");
    } else {
      fetchUsers();
      fetchEvents();
    }
  }, [userId, role, navigate]);

  const fetchUsers = async () => {
    try {
      const res = await axios.get("http://localhost:8080/api/user/users", { withCredentials: true });
      setUsers(res.data);
    } catch (e) {
      console.error(e);
      alert("Failed to fetch users");
    }
  };

  const fetchEvents = async () => {
    try {
      const res = await axios.get("http://localhost:8080/api/eventCreation/events", { withCredentials: true });
      setEvents(res.data);
    } catch (e) {
      console.error(e);
      alert("Failed to fetch events");
    }
  };

  const handleUserChange = (e) => {
    const { name, value } = e.target;
    setUserForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleEventChange = (e) => {
    const { name, value } = e.target;
    setEventForm((prev) => ({ ...prev, [name]: value }));
  };

  const resetUserForm = () => {
    setUserForm({
      userId: "",
      name: "",
      phnNumber: "",
      email: "",
      role: "",
      gender: "",
      status: "",
      dept: ""
    });
  };

  const resetEventForm = () => {
    setEventForm({
      eventId: "",
      name: "",
      startDate: "",
      endDate: "",
      venue: "",
      eventOrganizer: "",
      eventCapacity: "",
      participantCount: "",
      event_status: ""
    });
  };

  const handleAddUser = async () => {
    try {
      await axios.post("http://localhost:8080/api/user/add", userForm, { withCredentials: true });
      fetchUsers();
      alert("User added successfully");
      resetUserForm();
    } catch (e) {
      console.error(e);
      alert("Failed to add user");
    }
  };

  const handleUpdateUser = async () => {
    try {
      await axios.put("http://localhost:8080/api/user/update", userForm, { withCredentials: true });
      fetchUsers();
      alert("User updated successfully");
      resetUserForm();
      setEditingUser(null);
    } catch (e) {
      console.error(e);
      alert("Failed to update user");
    }
  };

  const handleDeleteUser = async (id) => {
    try {
      await axios.delete(`http://localhost:8080/api/user/delete?userId=${id}`, { withCredentials: true });
      fetchUsers();
      alert("User deleted successfully");
    } catch (e) {
      console.error(e);
      alert("Failed to delete user");
    }
  };

  const handleEditUser = (user) => {
    setUserForm({
      userId: user.userId || "",
      name: user.name || "",
      phnNumber: user.phnNumber || "",
      email: user.email || "",
      role: user.role || "",
      gender: user.gender || "",
      status: user.status || "",
      dept: user.dept || ""
    });
    setEditingUser(user.userId);
    setActiveTab("updateUser");
  };

  const cancelEditUser = () => {
    setEditingUser(null);
    resetUserForm();
  };

  const handleAddEvent = async () => {
    try {
      await axios.post(
        "http://localhost:8080/api/eventCreation/createEvent",
        {
          ...eventForm,
          createdBy: userId,
          createdAt: new Date().toISOString(),
          updatedBy: userId,
          updatedAt: new Date().toISOString()
        },
        { withCredentials: true }
      );
      fetchEvents();
      alert("Event added successfully");
      resetEventForm();
    } catch (e) {
      console.error(e);
      alert("Failed to add event");
    }
  };

  const handleUpdateEvent = async () => {
    try {
      await axios.put(
        "http://localhost:8080/api/eventCreation/updateEvent",
        { ...eventForm, updatedBy: userId, updatedAt: new Date().toISOString() },
        { withCredentials: true }
      );
      fetchEvents();
      alert("Event updated successfully");
      resetEventForm();
      setEditingEvent(null);
    } catch (e) {
      console.error(e);
      alert("Failed to update event");
    }
  };

  const handleDeleteEvent = async (id) => {
    try {
      await axios.delete(
        `http://localhost:8080/api/eventCreation/deleteEvent?eventId=${id}`,
        { withCredentials: true }
      );
      fetchEvents();
      alert("Event deleted successfully");
    } catch (e) {
      console.error(e);
      alert("Failed to delete event");
    }
  };

  const handleEditEvent = (event) => {
    setEventForm({
      eventId: event.eventId || "",
      name: event.name || "",
      startDate: event.startDate || "",
      endDate: event.endDate || "",
      venue: event.venue || "",
      eventOrganizer: event.eventOrganizer || "",
      eventCapacity: event.eventCapacity || "",
      participantCount: event.participantCount || "",
      event_status: event.event_status || ""
    });
    setEditingEvent(event.eventId);
    setActiveTab("updateEvent");
  };

  const cancelEditEvent = () => {
    setEditingEvent(null);
    resetEventForm();
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    resetUserForm();
    resetEventForm();
    setEditingUser(null);
    setEditingEvent(null);
  };

  function logout() {
    localStorage.removeItem("role");
    localStorage.removeItem("userId");
    console.log("Logged out. Items removed from localStorage.");
    window.location.href = "/";
  }

  const isUserActionsDisabled = editingUser !== null;
  const isEventActionsDisabled = editingEvent !== null;

  return (
    <div className="admin-dashboard">
      <h1>
        Welcome Admin, User ID: {userId}
        <span>
          <button onClick={logout} className="btn btn-danger">
            Logout
          </button>
        </span>
      </h1>

      {/* TABS */}
      <div className="tabs">
        <button onClick={() => handleTabChange("addUser")}>Add User</button>
        <button onClick={() => handleTabChange("updateUser")}>Users</button>
        <button onClick={() => handleTabChange("addEvent")}>Add Event</button>
        <button onClick={() => handleTabChange("updateEvent")}>Events</button>
      </div>

      {/* ADD USER */}
      {activeTab === "addUser" && (
        <div className="form-section vertical-form">
          <h3>Add User</h3>
          <label>User ID<input name="userId" value={userForm.userId} onChange={handleUserChange} /></label>
          <label>Name<input name="name" value={userForm.name} onChange={handleUserChange} /></label>
          <label>Phone<input name="phnNumber" value={userForm.phnNumber} onChange={handleUserChange} /></label>
          <label>Email<input name="email" value={userForm.email} onChange={handleUserChange} /></label>
          <label>Role
            <select name="role" value={userForm.role} onChange={handleUserChange}>
              <option value="">Select</option>
              <option value="USER">USER</option>
              <option value="ADMIN">ADMIN</option>
              <option value="FACULTY">FACULTY</option>
            </select>
          </label>
          <label>Gender
            <select name="gender" value={userForm.gender} onChange={handleUserChange}>
              <option value="">Select</option>
              <option value="M">Male</option>
              <option value="F">Female</option>
              <option value="O">Other</option>
            </select>
          </label>
          <label>Status
            <select name="status" value={userForm.status} onChange={handleUserChange}>
              <option value="">Select</option>
              <option value="A">Active</option>
              <option value="I">Inactive</option>
            </select>
          </label>
          <label>Department<input name="dept" value={userForm.dept} onChange={handleUserChange} /></label>
          <button onClick={handleAddUser} disabled={isUserActionsDisabled || isEventActionsDisabled}>
            Add User
          </button>
        </div>
      )}

      {/* USERS TABLE */}
      {activeTab === "updateUser" && (
        <div className="table-section">
          <h3>Users</h3>
          <table>
            <thead>
              <tr>
                <th>ID</th><th>Name</th><th>Email</th><th>Mobile</th><th>Gender</th><th>Role</th><th>Status</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.userId}>
                  <td>{u.userId}</td><td>{u.name}</td><td>{u.email}</td>
                  <td>{u.phnNumber}</td>
                  <td>{u.gender === "M" ? "MALE" : u.gender === "F" ? "FEMALE" : "OTHER"}</td>
                  <td>{u.role}</td>
                  <td>{u.status === "A" ? "ACTIVE" : "INACTIVE"}</td>
                  <td>
                    <button onClick={() => handleEditUser(u)} disabled={isUserActionsDisabled}
                      className={isUserActionsDisabled ? "disabled-button" : "active-button"}>Edit</button>
                    <button onClick={() => handleDeleteUser(u.userId)} disabled={isUserActionsDisabled}
                      className={isUserActionsDisabled ? "disabled-button" : "active-button"}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {editingUser && (
            <div className="form-section vertical-form">
              <h4>Edit User</h4>
              <label>User ID<input value={userForm.userId} disabled /></label>
              <label>Name<input name="name" value={userForm.name || ""} onChange={handleUserChange} /></label>
              <label>Phone<input name="phnNumber" value={userForm.phnNumber || ""} onChange={handleUserChange} /></label>
              <label>Email<input name="email" value={userForm.email || ""} onChange={handleUserChange} /></label>
              <label>Role<input name="role" value={userForm.role || ""} onChange={handleUserChange} /></label>
              <label>Gender
                <select name="gender" value={userForm.gender || ""} onChange={handleUserChange}>
                  <option value="M">Male</option><option value="F">Female</option><option value="O">Other</option>
                </select>
              </label>
              <label>Status
                <select name="status" value={userForm.status || ""} onChange={handleUserChange}>
                  <option value="A">Active</option><option value="I">Inactive</option>
                </select>
              </label>
              <label>Department<input name="dept" value={userForm.dept || ""} onChange={handleUserChange} /></label>
              <div className="actions">
                <button onClick={handleUpdateUser}>Update</button>
                <button className="btn btn-secondary" onClick={cancelEditUser}>Cancel</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ADD EVENT */}
      {activeTab === "addEvent" && (
        <div className="form-section vertical-form">
          <h3>Add Event</h3>
          <label>Event ID<input name="eventId" value={eventForm.eventId} onChange={handleEventChange} /></label>
          <label>Name<input name="name" value={eventForm.name} onChange={handleEventChange} /></label>
          <label>Start Date<input type="datetime-local" name="startDate" value={eventForm.startDate} onChange={handleEventChange} /></label>
          <label>End Date<input type="datetime-local" name="endDate" value={eventForm.endDate} onChange={handleEventChange} /></label>
          <label>Venue<input name="venue" value={eventForm.venue} onChange={handleEventChange} /></label>
          <label>Organizer<input name="eventOrganizer" value={eventForm.eventOrganizer} onChange={handleEventChange} /></label>
          <label>Capacity<input name="eventCapacity" value={eventForm.eventCapacity} onChange={handleEventChange} /></label>
          <label>Participants<input name="participantCount" value={eventForm.participantCount} onChange={handleEventChange} /></label>
          <label>Status<input name="event_status" value={eventForm.event_status} onChange={handleEventChange} /></label>
          <button onClick={handleAddEvent} disabled={isUserActionsDisabled || isEventActionsDisabled}>Add Event</button>
        </div>
      )}

      {/* EVENTS TABLE */}
      {activeTab === "updateEvent" && (
        <div className="table-section">
          <h3>Events</h3>
          <table>
            <thead>
              <tr>
                <th>ID</th><th>Name</th><th>Venue</th><th>Start</th><th>End</th>
                <th>Organizer</th><th>Capacity</th><th>Participants</th><th>Status</th>
                <th>Created By</th><th>Created At</th><th>Updated By</th><th>Updated At</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {events.map((e) => {
                const startDate = new Date(e.startDate);
                const currentDate = new Date();
                const daysToStartEvent = Math.ceil((startDate - currentDate) / (1000 * 3600 * 24));
                const isDisabled = isEventActionsDisabled || daysToStartEvent <= 1;
                return (
                  <tr key={e.eventId}>
                    <td>{e.eventId}</td><td>{e.name}</td><td>{e.venue}</td><td>{e.startDate}</td>
                    <td>{e.endDate}</td><td>{e.eventOrganizer}</td><td>{e.eventCapacity}</td><td>{e.participantCount}</td>
                    <td>{e.event_status === "A" ? "ACTIVE" : e.event_status === "C" ? "CANCELLED" : "FINISHED"}</td>
                    <td>{e.createdBy}</td><td>{e.createdAt}</td><td>{e.updatedBy}</td><td>{e.updatedAt}</td>
                    <td>
                      <button onClick={() => handleEditEvent(e)} disabled={isDisabled}
                        className={isDisabled ? "disabled-button" : "active-button"}>Edit</button>
                      <button onClick={() => handleDeleteEvent(e.eventId)} disabled={isDisabled}
                        className={isDisabled ? "disabled-button" : "active-button"}>Delete</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {editingEvent && (
            <div className="form-section vertical-form">
              <h4>Edit Event</h4>
              <label>Event ID<input value={eventForm.eventId} disabled /></label>
              <label>Name<input name="name" value={eventForm.name || ""} onChange={handleEventChange} /></label>
              <label>Start<input type="datetime-local" name="startDate" value={eventForm.startDate || ""} onChange={handleEventChange} /></label>
              <label>End<input type="datetime-local" name="endDate" value={eventForm.endDate || ""} onChange={handleEventChange} /></label>
              <label>Venue<input name="venue" value={eventForm.venue || ""} onChange={handleEventChange} /></label>
              <label>Organizer<input name="eventOrganizer" value={eventForm.eventOrganizer || ""} onChange={handleEventChange} /></label>
              <label>Capacity<input name="eventCapacity" value={eventForm.eventCapacity || ""} onChange={handleEventChange} /></label>
              <label>Participants<input name="participantCount" value={eventForm.participantCount || ""} onChange={handleEventChange} /></label>
              <label>Status
                <select name="event_status" value={eventForm.event_status || ""} onChange={handleEventChange}>
                  <option value="">Select</option><option value="A">Active</option><option value="F">Finished</option><option value="C">Cancel</option>
                </select>
              </label>
              <div className="actions">
                <button onClick={handleUpdateEvent}>Update</button>
                <button className="btn btn-secondary" onClick={cancelEditEvent}>Cancel</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
