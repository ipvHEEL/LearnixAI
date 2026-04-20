import React, { useMemo, useState } from "react";
import "./LoginForm.css";

function LoginForm() {
  const tokenFromUrl = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("token") || "";
  }, []);

  const initialMode = window.location.pathname === "/reset-password" ? "reset" : "login";
  const [mode, setMode] = useState(initialMode);
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    token: tokenFromUrl,
  });
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const switchMode = (nextMode) => {
    setMode(nextMode);
    setError("");
    setMessage("");
  };

  const handleLoginOrRegister = async () => {
    if (mode === "register" && form.password !== form.confirmPassword) {
      throw new Error("Пароли не совпадают");
    }

    if (mode === "register") {
      const registerRes = await fetch("http://127.0.0.1:8000/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          login: form.username,
          email: form.email,
          password: form.password,
        }),
      });

      if (!registerRes.ok) {
        const registerData = await registerRes.json();
        throw new Error(registerData.detail || "Ошибка регистрации");
      }
    }

    const res = await fetch("http://127.0.0.1:8000/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ login: form.username, password: form.password }),
    });

    const data = await res.json();

    if (!res.ok || !data?.access_token) {
      throw new Error(data?.detail || "Ошибка авторизации");
    }

    localStorage.setItem("userId", String(data.user_id));
    localStorage.setItem("jwtToken", data.access_token);
    window.location.href = "/news";
  };

  const handleRequestReset = async () => {
    const res = await fetch("http://127.0.0.1:8000/password-reset/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: form.email }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.detail || "Не удалось отправить письмо для сброса пароля");
    }

    setMessage(data?.message || "Если пользователь с таким email существует, письмо отправлено.");
  };

  const handleConfirmReset = async () => {
    if (form.password !== form.confirmPassword) {
      throw new Error("Пароли не совпадают");
    }

    const res = await fetch("http://127.0.0.1:8000/password-reset/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: form.token, password: form.password }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.detail || "Не удалось сбросить пароль");
    }

    setMessage(data?.message || "Пароль успешно обновлён");
    setTimeout(() => {
      window.location.href = "/";
    }, 1200);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    try {
      if (mode === "login" || mode === "register") {
        await handleLoginOrRegister();
      } else if (mode === "forgot") {
        await handleRequestReset();
      } else if (mode === "reset") {
        await handleConfirmReset();
      }
    } catch (err) {
      console.error(err);
      setError(err.message || "Сервер недоступен");
    } finally {
      setLoading(false);
    }
  };

  const isLogin = mode === "login";
  const isRegister = mode === "register";
  const isForgot = mode === "forgot";
  const isReset = mode === "reset";

  return (
    <div className="container">
      <div className="form-container">
        <h1>
          {isLogin
            ? "Вход"
            : isRegister
              ? "Регистрация"
              : isForgot
                ? "Сброс пароля"
                : "Новый пароль"}
        </h1>

        <form onSubmit={handleSubmit}>
          {(isLogin || isRegister) && (
            <>
              <label>Имя пользователя</label>
              <input
                type="text"
                name="username"
                value={form.username}
                onChange={handleChange}
                required
              />
            </>
          )}

          {(isRegister || isForgot) && (
            <>
              <label>Электронная почта</label>
              <input type="email" name="email" value={form.email} onChange={handleChange} required />
            </>
          )}

          {(isLogin || isRegister || isReset) && (
            <>
              <label>Пароль</label>
              <input
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                minLength={6}
                required
              />
            </>
          )}

          {(isRegister || isReset) && (
            <>
              <label>Подтвердите пароль</label>
              <input
                type="password"
                name="confirmPassword"
                value={form.confirmPassword}
                onChange={handleChange}
                minLength={6}
                required
              />
            </>
          )}

          {isReset && (
            <>
              <label>Токен сброса</label>
              <input type="text" name="token" value={form.token} onChange={handleChange} required />
            </>
          )}

          {error && <p style={{ color: "red", marginTop: "10px" }}>{error}</p>}
          {message && <p style={{ color: "#0f0", marginTop: "10px" }}>{message}</p>}

          <button type="submit" disabled={loading}>
            {loading
              ? "Пожалуйста, подождите..."
              : isLogin
                ? "Войти"
                : isRegister
                  ? "Зарегистрироваться"
                  : isForgot
                    ? "Отправить письмо"
                    : "Обновить пароль"}
          </button>
        </form>

        {(isLogin || isRegister) && (
          <p style={{ marginTop: "15px", textAlign: "center" }}>
            {isLogin ? "Нет аккаунта?" : "Уже есть аккаунт?"}{" "}
            <button
              type="button"
              onClick={() => switchMode(isLogin ? "register" : "login")}
              style={{ background: "none", border: "none", color: "#a87aff", cursor: "pointer" }}
            >
              {isLogin ? "Зарегистрироваться" : "Войти"}
            </button>
          </p>
        )}

        {(isLogin || isRegister) && (
          <p style={{ marginTop: "10px", textAlign: "center" }}>
            <button
              type="button"
              onClick={() => switchMode("forgot")}
              style={{ background: "none", border: "none", color: "#a87aff", cursor: "pointer" }}
            >
              Забыли пароль?
            </button>
          </p>
        )}

        {(isForgot || isReset) && (
          <p style={{ marginTop: "10px", textAlign: "center" }}>
            <button
              type="button"
              onClick={() => switchMode("login")}
              style={{ background: "none", border: "none", color: "#a87aff", cursor: "pointer" }}
            >
              Вернуться ко входу
            </button>
          </p>
        )}
      </div>
    </div>
  );
}

export default LoginForm;
