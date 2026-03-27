"use client";

import { useEffect } from "react";

const STORAGE_KEYS = {
  token: "vk_user_token",
  userId: "vk_user_id",
};

export default function AuthPage() {
  useEffect(() => {
    const hash = window.location.hash.replace(/^#/, "");
    const params = new URLSearchParams(hash);

    const accessToken = params.get("access_token");
    const userId = params.get("user_id");
    const error = params.get("error");
    const errorDescription = params.get("error_description");

    if (error) {
      alert(`Ошибка VK OAuth: ${errorDescription || error}`);
      window.location.replace("/");
      return;
    }

    if (!accessToken) {
      alert("VK не вернул access_token");
      window.location.replace("/");
      return;
    }

    localStorage.setItem(STORAGE_KEYS.token, accessToken);

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