"use client";

import { useEffect, useState } from "react";

const STORAGE_KEYS = {
  token: "vk_user_token",
  userId: "vk_user_id",
};

const VK_CLIENT_ID = "54520048"; //
const REDIRECT_URI = "https://vk-inbox.vercel.app/auth";
const API_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "https://vk-inbox.onrender.com";

export default function Home() {
  const [groups, setGroups] = useState([]);
  const [vkGroups, setVkGroups] = useState([]);
  const [vkUserToken, setVkUserToken] = useState("");
  const [vkUserId, setVkUserId] = useState("");
  const [authError, setAuthError] = useState("");
  const [loadingVkGroups, setLoadingVkGroups] = useState(false);

  const fetchConnectedGroups = async () => {
    try {
      const res = await fetch(`${API_URL}/groups`);
      const data = await res.json();
      setGroups(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchVkGroups = async (token) => {
    if (!token) {
      setVkGroups([]);
      return;
    }

    try {
      setLoadingVkGroups(true);
      setAuthError("");

      const res = await fetch(
        `${API_URL}/oauth/vk/my-groups?token=${encodeURIComponent(token)}`
      );
      const data = await res.json();

      if (!res.ok) {
        setAuthError(data.detail || "Не удалось загрузить группы VK");
        setVkGroups([]);
        return;
      }

      setVkGroups(data.response?.items || []);
    } catch (e) {
      console.error(e);
      setAuthError("Не удалось загрузить группы VK");
      setVkGroups([]);
    } finally {
      setLoadingVkGroups(false);
    }
  };

  useEffect(() => {
    fetchConnectedGroups();

    const token = localStorage.getItem(STORAGE_KEYS.token) || "";
    const userId = localStorage.getItem(STORAGE_KEYS.userId) || "";

    setVkUserToken(token);
    setVkUserId(userId);

    if (token) {
      fetchVkGroups(token);
    }
  }, []);

  const loginVK = () => {
    const authUrl =
      `https://oauth.vk.com/authorize` +
      `?client_id=${encodeURIComponent(VK_CLIENT_ID)}` +
      `&display=page` +
      `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
      `&scope=${encodeURIComponent("groups,offline")}` +
      `&response_type=token` +
      `&v=5.131`;

    window.location.href = authUrl;
  };

  const logoutVK = () => {
    localStorage.removeItem(STORAGE_KEYS.token);
    localStorage.removeItem(STORAGE_KEYS.userId);
    setVkUserToken("");
    setVkUserId("");
    setVkGroups([]);
    setAuthError("");
  };

  return (
    <div
      style={{
        padding: 20,
        minHeight: "100vh",
        background: "#0b0b0b",
        color: "#fff",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <h1>Список пабликов</h1>

      {!vkUserToken ? (
        <button
          onClick={loginVK}
          style={{
            padding: "10px 16px",
            borderRadius: 8,
            border: "none",
            background: "#3b82f6",
            color: "#fff",
            cursor: "pointer",
            marginBottom: 20,
          }}
        >
          Войти через VK
        </button>
      ) : (
        <div style={{ marginBottom: 24 }}>
          <div style={{ marginBottom: 10 }}>
            Вход выполнен
            {vkUserId ? ` | user_id: ${vkUserId}` : ""}
          </div>

          <button
            onClick={logoutVK}
            style={{
              padding: "10px 16px",
              borderRadius: 8,
              border: "1px solid #555",
              background: "#1f1f1f",
              color: "#fff",
              cursor: "pointer",
            }}
          >
            Выйти
          </button>
        </div>
      )}

      {authError && (
        <div
          style={{
            background: "#2a0f0f",
            color: "#ffb4b4",
            padding: 12,
            borderRadius: 8,
            marginBottom: 20,
            border: "1px solid #6b2c2c",
          }}
        >
          {authError}
        </div>
      )}

      <h2 style={{ marginTop: 30 }}>Мои группы VK</h2>

      {loadingVkGroups && <p>Загрузка групп VK...</p>}

      {!loadingVkGroups && vkUserToken && vkGroups.length === 0 && (
        <p>Группы не найдены</p>
      )}

      {vkGroups.map((g) => (
        <div
          key={g.id}
          style={{
            border: "1px solid #444",
            padding: 12,
            marginTop: 10,
            borderRadius: 10,
            background: "#111",
          }}
        >
          <p style={{ margin: 0, fontWeight: "bold" }}>{g.name}</p>
          <p style={{ margin: "8px 0 0 0" }}>ID: {g.id}</p>
        </div>
      ))}

      <h2 style={{ marginTop: 40 }}>Подключённые группы</h2>

      {groups.length === 0 && <p>Нет подключённых групп</p>}

      {groups.map((g) => (
        <div
          key={g.id}
          style={{
            border: "1px solid #444",
            padding: 12,
            marginTop: 10,
            borderRadius: 10,
            background: "#111",
          }}
        >
          <p style={{ margin: 0, fontWeight: "bold" }}>{g.name}</p>
          <p style={{ margin: "8px 0 0 0" }}>ID: {g.vk_group_id}</p>
        </div>
      ))}
    </div>
  );
}