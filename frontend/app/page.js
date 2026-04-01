"use client";

import { useEffect, useState } from "react";

const STORAGE_KEYS = {
  token: "vk_user_token",
  userId: "vk_user_id",
};

const VK_CLIENT_ID = "54520140"; //
const REDIRECT_URI = "https://vk-inbox.vercel.app/auth";

const API_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "https://vk-inbox.onrender.com";

export default function Home() {
  const [groups, setGroups] = useState([]);
  const [vkGroups, setVkGroups] = useState([]);
  const [vkUserToken, setVkUserToken] = useState("");
  const [vkUserId, setVkUserId] = useState("");
  const [loading, setLoading] = useState(false);

  // ====== загрузка сохранённых токенов ======
  useEffect(() => {
    const token = localStorage.getItem(STORAGE_KEYS.token);
    const userId = localStorage.getItem(STORAGE_KEYS.userId);

    if (token) {
      setVkUserToken(token);
      fetchVkGroups(token);
    }

    if (userId) {
      setVkUserId(userId);
    }

    fetchConnectedGroups();
  }, []);

  // ====== вход через VK ======
  const loginVK = () => {
    const authUrl =
      `https://oauth.vk.com/authorize` +
      `?client_id=${encodeURIComponent(VK_CLIENT_ID)}` +
      `&display=page` +
      `&redirect_uri=${REDIRECT_URI}` +
      `&scope=${encodeURIComponent("groups,offline")}` +
      `&response_type=token` +
      `&v=5.131`;

    window.location.href = authUrl;
  };

  // ====== выход ======
  const logoutVK = () => {
    localStorage.removeItem(STORAGE_KEYS.token);
    localStorage.removeItem(STORAGE_KEYS.userId);
    setVkUserToken("");
    setVkUserId("");
    setVkGroups([]);
  };

  // ====== получить группы VK ======
  const fetchVkGroups = async (token) => {
    try {
      setLoading(true);

      const res = await fetch(
        `${API_URL}/oauth/vk/my-groups?token=${encodeURIComponent(token)}`
      );
      const data = await res.json();

      if (res.ok) {
        setVkGroups(data.response?.items || []);
      } else {
        console.error(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // ====== получить подключённые группы из БД ======
  const fetchConnectedGroups = async () => {
    try {
      const res = await fetch(`${API_URL}/groups`);
      const data = await res.json();
      setGroups(data);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div
      style={{
        padding: 20,
        background: "#0b0b0b",
        color: "#fff",
        minHeight: "100vh",
      }}
    >
      <h1>Список пабликов</h1>

      {/* ===== КНОПКА ВХОДА ===== */}
      {!vkUserToken ? (
        <button onClick={loginVK} style={btn}>
          Войти через VK
        </button>
      ) : (
        <div>
          <p>Вошёл как user_id: {vkUserId}</p>
          <button onClick={logoutVK} style={btnSecondary}>
            Выйти
          </button>
        </div>
      )}

      {/* ===== ГРУППЫ VK ===== */}
      <h2 style={{ marginTop: 30 }}>Мои группы VK</h2>

      {loading && <p>Загрузка...</p>}

      {!loading && vkGroups.length === 0 && vkUserToken && (
        <p>Группы не найдены</p>
      )}

      {vkGroups.map((g) => (
        <div key={g.id} style={card}>
          <p>{g.name}</p>
          <p>ID: {g.id}</p>
        </div>
      ))}

      {/* ===== ПОДКЛЮЧЁННЫЕ ===== */}
      <h2 style={{ marginTop: 40 }}>Подключённые группы</h2>

      {groups.length === 0 && <p>Нет подключённых групп</p>}

      {groups.map((g) => (
        <div key={g.id} style={card}>
          <p>{g.name}</p>
          <p>ID: {g.vk_group_id}</p>
        </div>
      ))}
    </div>
  );
}

// ===== стили =====
const btn = {
  padding: "10px 16px",
  background: "#3b82f6",
  color: "#fff",
  border: "none",
  borderRadius: 8,
  cursor: "pointer",
};

const btnSecondary = {
  ...btn,
  background: "#444",
};

const card = {
  border: "1px solid #444",
  padding: 10,
  marginTop: 10,
  borderRadius: 8,
};