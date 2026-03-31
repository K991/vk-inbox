"use client";

import { useEffect, useMemo, useState } from "react";

const STORAGE_KEYS = {
  token: "vk_user_token",
  userId: "vk_user_id",
};

const BACKEND_BASE =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:8001";

export default function Home() {
  const [groups, setGroups] = useState([]);
  const [vkGroups, setVkGroups] = useState([]);
  const [vkUserToken, setVkUserToken] = useState("");
  const [vkUserId, setVkUserId] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [accessToken, setAccessToken] = useState("");
  const [userAccessToken, setUserAccessToken] = useState("");
  const [vkGroupId, setVkGroupId] = useState("");

  const [vkResults, setVkResults] = useState({});
  const [postsResults, setPostsResults] = useState({});
  const [messagesResults, setMessagesResults] = useState({});
  const [replyText, setReplyText] = useState({});
  const [authError, setAuthError] = useState("");

  const [connectModal, setConnectModal] = useState(null);
  const [groupTokenInput, setGroupTokenInput] = useState("");

  const oauthStartUrl = useMemo(
    () => `${BACKEND_BASE}/oauth/vk/start`,
    []
  );

  const loadGroups = () => {
    fetch(`${BACKEND_BASE}/groups`)
      .then((res) => res.json())
      .then((data) => setGroups(data))
      .catch(console.error);
  };

  const loadVkGroups = async (token) => {
    if (!token) {
      setVkGroups([]);
      return;
    }

    try {
      setAuthError("");

      const res = await fetch(
        `${BACKEND_BASE}/oauth/vk/my-groups?token=${encodeURIComponent(token)}`
      );
      const data = await res.json();

      if (!res.ok) {
        setAuthError(data.detail || "Не удалось загрузить группы VK");
        setVkGroups([]);
        return;
      }

      setVkGroups(data.response?.items || []);
    } catch (error) {
      console.error(error);
      setAuthError("Не удалось загрузить группы VK");
      setVkGroups([]);
    }
  };

  useEffect(() => {
    loadGroups();

    const token = localStorage.getItem(STORAGE_KEYS.token) || "";
    const userId = localStorage.getItem(STORAGE_KEYS.userId) || "";

    setVkUserToken(token);
    setVkUserId(userId);
    setUserAccessToken(token);

    if (token) {
      loadVkGroups(token);
    }
  }, []);

  const loginWithVk = () => {
    window.location.href = oauthStartUrl;
  };

  const logoutVk = () => {
    localStorage.removeItem(STORAGE_KEYS.token);
    localStorage.removeItem(STORAGE_KEYS.userId);

    setVkUserToken("");
    setVkUserId("");
    setVkGroups([]);
    setUserAccessToken("");
    setAuthError("");
  };

  const handleDelete = async (groupId) => {
    if (!confirm("Удалить группу?")) return;

    const res = await fetch(`${BACKEND_BASE}/groups/${groupId}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      alert("Ошибка при удалении группы");
      return;
    }

    const newVkResults = { ...vkResults };
    delete newVkResults[groupId];
    setVkResults(newVkResults);

    const newPostsResults = { ...postsResults };
    delete newPostsResults[groupId];
    setPostsResults(newPostsResults);

    const newMessagesResults = { ...messagesResults };
    delete newMessagesResults[groupId];
    setMessagesResults(newMessagesResults);

    loadGroups();
  };

  const handleCheckVk = async (groupId) => {
    if (vkResults[groupId]) {
      const newResults = { ...vkResults };
      delete newResults[groupId];
      setVkResults(newResults);
      return;
    }

    const res = await fetch(`${BACKEND_BASE}/vk/check/${groupId}`);
    const data = await res.json();

    setVkResults((prev) => ({
      ...prev,
      [groupId]: data,
    }));
  };

  const handleTogglePosts = async (groupId) => {
    if (postsResults[groupId]) {
      const newResults = { ...postsResults };
      delete newResults[groupId];
      setPostsResults(newResults);
      return;
    }

    const res = await fetch(`${BACKEND_BASE}/vk/posts/${groupId}`);
    const data = await res.json();

    setPostsResults((prev) => ({
      ...prev,
      [groupId]: data,
    }));
  };

  const handleToggleMessages = async (groupId) => {
    if (messagesResults[groupId]) {
      const newResults = { ...messagesResults };
      delete newResults[groupId];
      setMessagesResults(newResults);
      return;
    }

    const res = await fetch(`${BACKEND_BASE}/messages/${groupId}`);
    const data = await res.json();

    setMessagesResults((prev) => ({
      ...prev,
      [groupId]: data,
    }));
  };

  const handleSendMessage = async (groupId, peerId) => {
    const text = (replyText[peerId] || "").trim();

    if (!text) {
      alert("Введите сообщение");
      return;
    }

    const res = await fetch(`${BACKEND_BASE}/messages/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        group_id: groupId,
        peer_id: peerId,
        text,
      }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      alert(data.detail || "Ошибка отправки");
      return;
    }

    setReplyText((prev) => ({
      ...prev,
      [peerId]: "",
    }));

    const refreshRes = await fetch(`${BACKEND_BASE}/messages/${groupId}`);
    const refreshData = await refreshRes.json();

    setMessagesResults((prev) => ({
      ...prev,
      [groupId]: refreshData,
    }));
  };

  const handleEdit = (group) => {
    setEditingId(group.id);
    setVkGroupId(group.vk_group_id);
    setAccessToken(group.access_token);
    setUserAccessToken(group.user_access_token);
    setGroupTokenInput(group.access_token);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setVkGroupId("");
    setAccessToken("");
    setUserAccessToken(vkUserToken || "");
    setGroupTokenInput("");
  };

  const handleConnectGroup = async () => {
    if (!connectModal) return;

    if (!groupTokenInput.trim()) {
      alert("Вставь токен группы");
      return;
    }

    const payload = {
      name: connectModal.name,
      vk_group_id: String(connectModal.id),
      access_token: groupTokenInput.trim(),
      user_access_token: vkUserToken,
    };

    const res = await fetch(`${BACKEND_BASE}/groups`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      alert(data.detail || "Ошибка подключения группы");
      return;
    }

    setConnectModal(null);
    setGroupTokenInput("");
    loadGroups();
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();

    if (!editingId) return;

    if (!vkGroupId.trim() || !accessToken.trim() || !userAccessToken.trim()) {
      alert("Заполни все поля");
      return;
    }

    const res = await fetch(`${BACKEND_BASE}/groups/${editingId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: "Авто из VK",
        vk_group_id: vkGroupId,
        access_token: accessToken,
        user_access_token: userAccessToken,
      }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      alert(data.detail || "Ошибка сохранения");
      return;
    }

    handleCancelEdit();
    loadGroups();
  };

  const actionButtonStyle = {
    padding: "8px 14px",
    borderRadius: 8,
    border: "1px solid #666",
    backgroundColor: "#1f1f1f",
    color: "#ffffff",
    cursor: "pointer",
    marginRight: 10,
    marginBottom: 10,
  };

  const cardStyle = {
    border: "1px solid #444",
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
    backgroundColor: "#111111",
  };

  const postCardStyle = {
    marginTop: 10,
    padding: 12,
    borderRadius: 10,
    backgroundColor: "#0a0a0a",
    border: "1px solid #333",
  };

  const messageStyle = {
    marginTop: 10,
    padding: 10,
    borderRadius: 8,
    backgroundColor: "#0a0a0a",
    border: "1px solid #333",
  };

  const inputStyle = {
    width: "100%",
    padding: 10,
    borderRadius: 8,
    border: "1px solid #555",
    backgroundColor: "#ffffff",
    color: "#000000",
    fontSize: 16,
    outline: "none",
    display: "block",
    marginBottom: 12,
  };

  return (
    <div
      style={{
        padding: 24,
        minHeight: "100vh",
        backgroundColor: "#000000",
        color: "#ffffff",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <h1 style={{ fontSize: 28, marginBottom: 20 }}>Список пабликов</h1>

      <div style={{ marginBottom: 24 }}>
        {!vkUserToken ? (
          <button
            onClick={loginWithVk}
            style={{
              padding: "10px 16px",
              borderRadius: 8,
              border: "none",
              backgroundColor: "#4a76a8",
              color: "#ffffff",
              cursor: "pointer",
              fontSize: 15,
            }}
          >
            Войти через VK
          </button>
        ) : (
          <div
            style={{
              padding: 14,
              borderRadius: 10,
              border: "1px solid #333",
              backgroundColor: "#0b0b0b",
              maxWidth: 520,
            }}
          >
            <div style={{ marginBottom: 10 }}>
              Авторизован через VK
              {vkUserId ? ` | user_id: ${vkUserId}` : ""}
            </div>

            <button onClick={logoutVk} style={actionButtonStyle}>
              Выйти из VK
            </button>
          </div>
        )}

        {authError && (
          <div
            style={{
              marginTop: 12,
              padding: 12,
              borderRadius: 10,
              backgroundColor: "#220909",
              border: "1px solid #663333",
              color: "#ffb3b3",
              maxWidth: 700,
            }}
          >
            {authError}
          </div>
        )}
      </div>

      {vkUserToken && vkGroups.length > 0 && (
        <div
          style={{
            marginBottom: 30,
            padding: 16,
            border: "1px solid #333",
            borderRadius: 12,
            backgroundColor: "#0b0b0b",
          }}
        >
          <h2 style={{ marginTop: 0 }}>Мои группы VK</h2>

          {vkGroups.map((group) => (
            <div
              key={group.id}
              style={{
                border: "1px solid #333",
                borderRadius: 10,
                padding: 12,
                marginBottom: 10,
                backgroundColor: "#111111",
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}
            >
              {group.photo_100 && (
                <img
                  src={group.photo_100}
                  alt={group.name}
                  width={60}
                  height={60}
                  style={{ borderRadius: 10, objectFit: "cover" }}
                />
              )}

              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: "bold", marginBottom: 4 }}>
                  {group.name}
                </div>
                <div>ID: {group.id}</div>
              </div>

              <button
                onClick={() => {
                  setConnectModal(group);
                  setGroupTokenInput("");
                }}
                style={actionButtonStyle}
              >
                Подключить
              </button>
            </div>
          ))}
        </div>
      )}

      {editingId && (
        <form
          onSubmit={handleSaveEdit}
          style={{
            marginBottom: 30,
            padding: 16,
            border: "1px solid #333",
            borderRadius: 12,
            backgroundColor: "#0b0b0b",
            maxWidth: 420,
          }}
        >
          <h2 style={{ marginTop: 0 }}>Редактирование группы</h2>

          <input
            type="text"
            value={vkGroupId}
            onChange={(e) => setVkGroupId(e.target.value)}
            placeholder="VK Group ID"
            style={inputStyle}
          />

          <input
            type="text"
            value={accessToken}
            onChange={(e) => setAccessToken(e.target.value)}
            placeholder="Group Access Token"
            style={inputStyle}
          />

          <input
            type="text"
            value={userAccessToken}
            onChange={(e) => setUserAccessToken(e.target.value)}
            placeholder="User Access Token"
            style={inputStyle}
          />

          <button type="submit" style={actionButtonStyle}>
            Сохранить
          </button>

          <button
            type="button"
            onClick={handleCancelEdit}
            style={actionButtonStyle}
          >
            Отмена
          </button>
        </form>
      )}

      {groups.map((group) => {
        const vkData = vkResults[group.id]?.response?.[0];
        const vkError = vkResults[group.id]?.error;
        const postsData = postsResults[group.id]?.response?.items || [];
        const postsError = postsResults[group.id]?.error;
        const msgs = messagesResults[group.id]?.items || [];

        return (
          <div key={group.id} style={cardStyle}>
            <h3 style={{ margin: "0 0 8px 0" }}>
              {group.name || "Без названия"}
            </h3>

            <p style={{ margin: "0 0 12px 0" }}>
              VK ID: {group.vk_group_id || "-"}
            </p>

            <button onClick={() => handleEdit(group)} style={actionButtonStyle}>
              Редактировать
            </button>

            <button
              onClick={() => handleDelete(group.id)}
              style={actionButtonStyle}
            >
              Удалить
            </button>

            <button
              onClick={() => handleCheckVk(group.id)}
              style={actionButtonStyle}
            >
              {vkResults[group.id] ? "Скрыть VK" : "Проверить VK"}
            </button>

            <button
              onClick={() => handleTogglePosts(group.id)}
              style={actionButtonStyle}
            >
              {postsResults[group.id] ? "Скрыть посты" : "Показать посты"}
            </button>

            <button
              onClick={() => handleToggleMessages(group.id)}
              style={actionButtonStyle}
            >
              {messagesResults[group.id]
                ? "Скрыть сообщения"
                : "Показать сообщения"}
            </button>

            {vkData && (
              <div
                style={{
                  marginTop: 16,
                  padding: 12,
                  borderRadius: 10,
                  backgroundColor: "#0a0a0a",
                  border: "1px solid #333",
                  display: "flex",
                  gap: 12,
                  alignItems: "center",
                }}
              >
                <img
                  src={vkData.photo_100}
                  alt={vkData.name}
                  width={80}
                  height={80}
                  style={{
                    borderRadius: 10,
                    objectFit: "cover",
                    border: "1px solid #444",
                  }}
                />
                <div>
                  <div
                    style={{
                      fontSize: 18,
                      fontWeight: "bold",
                      marginBottom: 6,
                    }}
                  >
                    {vkData.name}
                  </div>
                  <div style={{ marginBottom: 4 }}>
                    short name: {vkData.screen_name}
                  </div>
                  <div style={{ marginBottom: 4 }}>
                    type: {vkData.type}
                  </div>
                  <div>closed: {vkData.is_closed === 0 ? "нет" : "да"}</div>
                </div>
              </div>
            )}

            {vkError && (
              <div
                style={{
                  marginTop: 16,
                  padding: 12,
                  borderRadius: 10,
                  backgroundColor: "#220909",
                  border: "1px solid #663333",
                  color: "#ffb3b3",
                }}
              >
                Ошибка VK: {vkError.error_msg}
              </div>
            )}

            {postsError && (
              <div
                style={{
                  marginTop: 16,
                  padding: 12,
                  borderRadius: 10,
                  backgroundColor: "#220909",
                  border: "1px solid #663333",
                  color: "#ffb3b3",
                }}
              >
                Ошибка постов VK: {postsError.error_msg}
              </div>
            )}

            {postsData.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <h4 style={{ marginBottom: 12 }}>Последние посты</h4>

                {postsData.map((post) => (
                  <div key={post.id} style={postCardStyle}>
                    <div style={{ marginBottom: 8, color: "#cccccc" }}>
                      Post ID: {post.id}
                    </div>

                    <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.5 }}>
                      {post.text ? post.text : "Без текста"}
                    </div>

                    {post.attachments?.map((att, i) => {
                      if (att.type === "photo") {
                        return (
                          <img
                            key={i}
                            src={att.url}
                            alt="photo"
                            style={{
                              maxWidth: "100%",
                              marginTop: 10,
                              borderRadius: 8,
                              display: "block",
                            }}
                          />
                        );
                      }

                      if (att.type === "video") {
                        return (
                          <div key={i} style={{ marginTop: 10 }}>
                            <div style={{ marginBottom: 8 }}>
                              Видео: {att.title || "Без названия"}
                            </div>

                            {att.player ? (
                              <iframe
                                src={att.player}
                                width="100%"
                                height="300"
                                allowFullScreen
                                style={{
                                  border: "none",
                                  borderRadius: 8,
                                }}
                              />
                            ) : att.vk_url ? (
                              <a
                                href={att.vk_url}
                                target="_blank"
                                rel="noreferrer"
                                style={{ color: "#6ea8ff" }}
                              >
                                Открыть видео в VK
                              </a>
                            ) : (
                              <div style={{ color: "#bbbbbb" }}>
                                Видео недоступно
                              </div>
                            )}
                          </div>
                        );
                      }

                      if (att.type === "audio") {
                        return (
                          <div
                            key={i}
                            style={{
                              marginTop: 10,
                              padding: 10,
                              borderRadius: 8,
                              backgroundColor: "#111111",
                              border: "1px solid #333",
                              color: "#dddddd",
                            }}
                          >
                            Аудио: {att.artist || "Неизвестный артист"} —{" "}
                            {att.title || "Без названия"}
                          </div>
                        );
                      }

                      return null;
                    })}

                    <div
                      style={{
                        marginTop: 10,
                        color: "#888888",
                        fontSize: 14,
                      }}
                    >
                      Лайки: {post.likes || 0} | Комментарии: {post.comments || 0} |
                      Репосты: {post.reposts || 0}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {msgs.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <h4>Последние сообщения</h4>

                {msgs.map((msg) => (
                  <div key={msg.id} style={messageStyle}>
                    <div style={{ marginBottom: 6, color: "#aaaaaa" }}>
                      {msg.direction === "in" ? "⬅ Входящее" : "➡ Исходящее"} |
                      peer_id: {msg.vk_peer_id}
                    </div>

                    <div style={{ marginBottom: 10 }}>
                      {msg.text || "Без текста"}
                    </div>

                    {msg.direction === "in" && (
                      <div>
                        <input
                          type="text"
                          placeholder="Ответить..."
                          value={replyText[msg.vk_peer_id] || ""}
                          onChange={(e) =>
                            setReplyText((prev) => ({
                              ...prev,
                              [msg.vk_peer_id]: e.target.value,
                            }))
                          }
                          style={{
                            padding: 8,
                            marginRight: 8,
                            borderRadius: 6,
                            border: "1px solid #555",
                            backgroundColor: "#ffffff",
                            color: "#000000",
                            width: 260,
                          }}
                        />

                        <button
                          onClick={() =>
                            handleSendMessage(group.id, msg.vk_peer_id)
                          }
                          style={{
                            padding: "8px 14px",
                            borderRadius: 8,
                            border: "1px solid #666",
                            backgroundColor: "#1f1f1f",
                            color: "#ffffff",
                            cursor: "pointer",
                          }}
                        >
                          Отправить
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {connectModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.8)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: 20,
          }}
        >
          <div
            style={{
              backgroundColor: "#111",
              padding: 20,
              borderRadius: 12,
              width: 420,
              maxWidth: "100%",
              border: "1px solid #333",
            }}
          >
            <h3 style={{ marginTop: 0 }}>Подключение группы</h3>

            <p style={{ fontSize: 14, color: "#aaa", lineHeight: 1.5 }}>
              1. Открой настройки группы
              <br />
              2. Перейди в раздел API
              <br />
              3. Создай ключ доступа сообщества
              <br />
              4. Вставь его ниже
            </p>

            <a
              href={`https://vk.com/club${connectModal.id}?act=manage`}
              target="_blank"
              rel="noreferrer"
              style={{
                color: "#6ea8ff",
                display: "block",
                marginBottom: 12,
              }}
            >
              Открыть настройки группы
            </a>

            <div style={{ marginBottom: 8, color: "#ccc" }}>
              Группа: <b>{connectModal.name}</b>
            </div>

            <div style={{ marginBottom: 12, color: "#888" }}>
              VK ID: {connectModal.id}
            </div>

            <input
              type="text"
              placeholder="Вставь токен группы"
              value={groupTokenInput}
              onChange={(e) => setGroupTokenInput(e.target.value)}
              style={inputStyle}
            />

            <button onClick={handleConnectGroup} style={actionButtonStyle}>
              Подключить
            </button>

            <button
              onClick={() => {
                setConnectModal(null);
                setGroupTokenInput("");
              }}
              style={actionButtonStyle}
            >
              Отмена
            </button>
          </div>
        </div>
      )}
    </div>
  );
}