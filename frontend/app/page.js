"use client";

import { useEffect, useState } from "react";
import * as VKID from "@vkid/sdk";

const VK_APP_ID = 54509594;
const VK_REDIRECT_URL = "https://vk-inbox.vercel.app/auth";

const STORAGE_KEYS = {
  state: "vkid_state",
  codeVerifier: "vkid_code_verifier",
  token: "vk_user_token",
  refreshToken: "vk_refresh_token",
  userId: "vk_user_id",
};

function randomString(length = 64) {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
  let result = "";
  const array = new Uint32Array(length);
  crypto.getRandomValues(array);

  for (let i = 0; i < length; i += 1) {
    result += chars[array[i] % chars.length];
  }

  return result;
}

function initVkSdk(state, codeVerifier) {
  VKID.Config.init({
    app: VK_APP_ID,
    redirectUrl: VK_REDIRECT_URL,
    state,
    codeVerifier,
    scope: "groups",
  });
}

export default function Home() {
  const [vkUserToken, setVkUserToken] = useState("");
  const [vkUserId, setVkUserId] = useState("");
  const [vkGroups, setVkGroups] = useState([]);
  const [authError, setAuthError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem(STORAGE_KEYS.token) || "";
    const userId = localStorage.getItem(STORAGE_KEYS.userId) || "";

    setVkUserToken(token);
    setVkUserId(userId);

    if (token) {
      loadVkGroups(token);
    }
  }, []);

  const loadVkGroups = async (token) => {
    try {
      setAuthError("");

      const res = await fetch(
        `https://api.vk.com/method/groups.get?extended=1&filter=admin&access_token=${encodeURIComponent(
          token
        )}&v=5.131`
      );
      const data = await res.json();

      if (data.error) {
        setAuthError(data.error.error_msg || "Не удалось загрузить группы VK");
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

  const loginWithVk = async () => {
    try {
      setAuthError("");

      const state = randomString(32);
      const codeVerifier = randomString(64);

      localStorage.setItem(STORAGE_KEYS.state, state);
      localStorage.setItem(STORAGE_KEYS.codeVerifier, codeVerifier);

      initVkSdk(state, codeVerifier);

      await VKID.Auth.login();
    } catch (error) {
      console.error("VK login error:", error);
      alert(
        `Ошибка запуска авторизации VK${
          error?.message ? `: ${error.message}` : ""
        }`
      );
    }
  };

  const logoutVk = () => {
    localStorage.removeItem(STORAGE_KEYS.state);
    localStorage.removeItem(STORAGE_KEYS.codeVerifier);
    localStorage.removeItem(STORAGE_KEYS.token);
    localStorage.removeItem(STORAGE_KEYS.refreshToken);
    localStorage.removeItem(STORAGE_KEYS.userId);

    setVkUserToken("");
    setVkUserId("");
    setVkGroups([]);
    setAuthError("");
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

            <button
              onClick={logoutVk}
              style={{
                padding: "8px 14px",
                borderRadius: 8,
                border: "1px solid #666",
                backgroundColor: "#1f1f1f",
                color: "#ffffff",
                cursor: "pointer",
              }}
            >
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
            </div>
          ))}
        </div>
      )}
    </div>
  );
}