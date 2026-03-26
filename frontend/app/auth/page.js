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

function initVkSdk(state, codeVerifier) {
  VKID.Config.init({
    app: VK_APP_ID,
    redirectUrl: VK_REDIRECT_URL,
    state,
    codeVerifier,
    scope: "groups",
  });
}

export default function AuthPage() {
  const [message, setMessage] = useState("Авторизация через VK...");

  useEffect(() => {
    const run = async () => {
      try {
        const params = new URLSearchParams(window.location.search);

        const code = params.get("code");
        const deviceId = params.get("device_id");
        const state = params.get("state");
        const error = params.get("error");
        const errorDescription = params.get("error_description");

        if (error) {
          setMessage(`Ошибка авторизации: ${errorDescription || error}`);
          return;
        }

        if (!code || !deviceId || !state) {
          setMessage("Не найдены параметры авторизации VK");
          return;
        }

        const savedState = localStorage.getItem(STORAGE_KEYS.state);
        const codeVerifier = localStorage.getItem(STORAGE_KEYS.codeVerifier);

        if (!savedState || !codeVerifier) {
          setMessage("Не найдены локальные данные авторизации");
          return;
        }

        if (savedState !== state) {
          setMessage("State не совпал. Авторизация прервана");
          return;
        }

        initVkSdk(savedState, codeVerifier);

        const tokenResult = await VKID.Auth.exchangeCode(
          code,
          deviceId,
          codeVerifier
        );

        localStorage.setItem(STORAGE_KEYS.token, tokenResult.access_token);
        localStorage.setItem(
          STORAGE_KEYS.refreshToken,
          tokenResult.refresh_token || ""
        );
        localStorage.setItem(
          STORAGE_KEYS.userId,
          String(tokenResult.user_id || "")
        );

        window.location.replace("/");
      } catch (error) {
        console.error("VK exchange error:", error);
        setMessage(
          `Не удалось завершить авторизацию VK${
            error?.message ? `: ${error.message}` : ""
          }`
        );
      }
    };

    run();
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
        padding: 24,
        textAlign: "center",
      }}
    >
      {message}
    </div>
  );
}