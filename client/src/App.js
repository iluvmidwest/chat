import React, { useEffect, useState, useRef } from 'react';
import { io } from "socket.io-client";
import { ChromePicker } from 'react-color';
import EmojiPicker from 'emoji-picker-react';
import './App.css';

const socket = io();

function App() {
  const [users, setUsers] = useState({});
  const [self, setSelf] = useState({});
  const [chat, setChat] = useState([]);
  const [msg, setMsg] = useState('');
  const [announcement, setAnnouncement] = useState('');
  const [showPicker, setShowPicker] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    socket.on('init', ({ users, chatHistory, announcement, self }) => {
      setUsers(users);
      setChat(chatHistory);
      setAnnouncement(announcement);
      setSelf(self);
    });
    socket.on('userList', setUsers);
    socket.on('chat', (data) => setChat(c => [...c, data]));
    socket.on('announcement', setAnnouncement);
    socket.on('kicked', () => alert('You were kicked by an admin.'));
    return () => socket.disconnect();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chat]);

  function send(e) {
    e.preventDefault();
    if (msg.trim()) {
      socket.emit('chat', msg);
      setMsg('');
    }
  }

  function changeColor(color) {
    socket.emit('color', color.hex);
    setShowPicker(false);
  }

  function pickEmoji(emojiData) {
    setMsg(msg + emojiData.emoji);
    setShowEmoji(false);
  }

  function becomeAdmin() {
    const password = prompt("Enter admin password:");
    socket.emit('admin', password);
  }

  return (
    <div className="retro-chat">
      <div className="announcement-banner">{announcement}</div>
      <div className="sidebar">
        <div className="section">
          <h3>Online Users</h3>
          <ul>
            {Object.values(users).map(u => (
              <li key={u.nick}
                  style={{ color: u.color, fontWeight: u.isAdmin ? "bold" : "normal" }}>
                {u.nick} {u.isAdmin && "⭐"}
              </li>
            ))}
          </ul>
          <button onClick={() => setShowPicker(!showPicker)}>Pick Name Color</button>
          {showPicker && <ChromePicker color={self.color || "#3498db"} onChangeComplete={changeColor} />}
          <button onClick={becomeAdmin}>Become Admin</button>
        </div>
      </div>
      <div className="chatbox">
        <div className="history">
          {chat.map((c, i) =>
            c.type === 'chat' ? (
              <div key={i} className="msg">
                <span style={{ color: c.user.color, fontWeight: c.user.isAdmin ? "bold" : "normal" }}>
                  {c.user.nick}
                </span>: <span>{c.msg}</span>
              </div>
            ) : (
              <div key={i} className="action">
                * <span style={{ color: c.user.color }}>{c.user.nick}</span> {c.msg}
              </div>
            )
          )}
          <div ref={chatEndRef}></div>
        </div>
        <form onSubmit={send} className="inputform">
          <input
            value={msg}
            onChange={e => setMsg(e.target.value)}
            placeholder="Type a message, or /nick newname"
          />
          <button type="submit">Send</button>
          <button type="button" onClick={() => setShowEmoji(!showEmoji)}>😊</button>
        </form>
        {showEmoji && <EmojiPicker onEmojiClick={pickEmoji} />}
      </div>
    </div>
  );
}

export default App;