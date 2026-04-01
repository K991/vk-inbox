"use client";

import { useEffect } from "react";

const STORAGE_KEYS = {
  token: "vk_user_token",
  userId: "vk_user_id",
};

export default function AuthPage() {
  useEffect(() => {
    const hash = window.location.hash;

    if (!hash) {
      alert("VK не вернул токен");
      window.location.href = "/";
      return;
    }

    const params = new URLSearchParams(hash.replace("#", ""));

    const accessToken = params.get("access_token");
    const userId = params.get("user_id");
    const error = params.get("error");
    const errorDescription = params.get("error_description");

    if (error) {
      alert(`Ошибка VK OAuth: ${errorDescription || error}`);
      window.location.href = "/";
      return;
    }

    if (!accessToken) {
      alert("Нет access_token");
      window.location.href = "/";
      return;
    }

    localStorage.setItem(STORAGE_KEYS.token, accessToken);

    if (userId) {
      localStorage.setItem(STORAGE_KEYS.userId, userId);
    }

    window.location.href = "/";
  }, []);

  return <div>Авторизация...</div>;
}