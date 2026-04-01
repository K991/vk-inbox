"use client";

import { useEffect } from "react";

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

    if (!accessToken) {
      alert("Нет access_token");
      window.location.href = "/";
      return;
    }

    localStorage.setItem("vk_token", accessToken);

    window.location.href = "/";
  }, []);

  return <div>Авторизация...</div>;
}