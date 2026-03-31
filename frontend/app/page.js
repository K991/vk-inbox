"use client";

import { useEffect, useState } from "react";

export default function Home() {
  const [groups, setGroups] = useState([]);

  const API_URL = "http://127.0.0.1:8001";

  const fetchGroups = async () => {
    try {
      const res = await fetch(`${API_URL}/groups`);
      const data = await res.json();
      setGroups(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  const loginVK = () => {
    window.location.href = ${API_URL}/auth/vk;
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>Список пабликов</h1>

      <button onClick={loginVK}>Войти через VK</button>

      <h2 style={{ marginTop: 30 }}>Мои группы</h2>

      {groups.length === 0 && <p>Нет подключённых групп</p>}

      {groups.map((g) => (
        <div
          key={g.id}
          style={{
            border: "1px solid #444",
            padding: 10,
            marginTop: 10,
          }}
        >
          <p>{g.name}</p>
          <p>ID: {g.group_id}</p>
        </div>
      ))}
    </div>
  );
}