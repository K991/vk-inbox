"use client";

import { useEffect } from "react";

const STORAGE_KEYS = {
  token: "vk_user_token",
  userId: "vk_user_id",
};

export default function AuthPage() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    const token = params.get("token");
    const userId = params.get("user_id");
    const error = params.get("error");
    const detail = params.get("detail");

    if (error || detail) {
      alert(`Ошибка VK OAuth: ${detail || error}`);
      window.location.replace("/");
      return;
    }

    if (!token) {
      alert("Backend не вернул токен VK");
      window.location.replace("/");
      return;
    }

    localStorage.setItem(STORAGE_KEYS.token, token);

    if (userId) {
      localStorage.setItem(STORAGE_KEYS.userId, userId);
    }

    window.location.replace("/");
  }, []);

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#000000",
        color: "#ffffff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "Arial, sans-serif",
      }}
    >
      Авторизация через VK...
    </div>
  );
}