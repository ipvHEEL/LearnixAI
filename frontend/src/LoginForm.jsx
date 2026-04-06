import React, { useState } from "react";
import "./LoginForm.css";

const API_URL = "http://127.0.0.1:8000";

function LoginForm() {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    resetToken: "",
    newPassword: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const isLogin = mode === "login";
  const isRegister = mode === "register";
  const isRecoverRequest = mode === "recover-request";
  const isRecoverConfirm = mode === "recover-confirm";

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      if (isRegister) {
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

      if (isLogin || isRegister) {
        const res = await fetch(`${API_URL}/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ login: form.username, password: form.password }),
        });

        const data = await res.json();

        if (!res.ok || !data?.access_token) {
          setError(data.detail || "Ошибка авторизации");
          return;
        }

        localStorage.setItem("userId", String(data.user_id));
        localStorage.setItem("jwtToken", data.access_token);
        window.location.href = "/news";
        return;
      }

      if (isRecoverRequest) {
        const res = await fetch(`${API_URL}/password-recovery/request`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: form.email }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.detail || "Не удалось создать запрос на восстановление");
          return;
        }

        setSuccess(data.message || "Проверьте email для дальнейших шагов");
        setMode("recover-confirm");
        return;
      }

      if (isRecoverConfirm) {
        const res = await fetch(`${API_URL}/password-recovery/confirm`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            token: form.resetToken,
            new_password: form.newPassword,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.detail || "Не удалось обновить пароль");
          return;
        }

        setSuccess("Пароль успешно обновлён. Теперь войдите в аккаунт.");
        setMode("login");
        setForm((prev) => ({
          ...prev,
          password: "",
          newPassword: "",
          resetToken: "",
        }));
      }
    } catch (err) {
      console.error(err);
      setError(err.message || "Сервер недоступен");
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (nextMode) => {
    setMode(nextMode);
    setError("");
    setSuccess("");
  };

  return (
    <div className="container">
      <div className="form-container">
        <h1>
          {isLogin && "Login"}
          {isRegister && "Sign Up"}
          {isRecoverRequest && "Reset Password"}
          {isRecoverConfirm && "Set New Password"}
        </h1>

        <form onSubmit={handleSubmit}>
          {(isLogin || isRegister) && (
            <>
              <label>Username</label>
              <input
                type="text"
                name="username"
                value={form.username}
                onChange={handleChange}
                required
              />
            </>
          )}

          {(isRegister || isRecoverRequest) && (
            <>
              <label>Email</label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                required
              />
            </>
          )}

          {(isLogin || isRegister) && (
            <>
              <label>Password</label>
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

          {isRecoverConfirm && (
            <>
              <label>Reset token</label>
              <input
                type="text"
                name="resetToken"
                value={form.resetToken}
                onChange={handleChange}
                required
              />

              <label>New password</label>
              <input
                type="password"
                name="newPassword"
                value={form.newPassword}
                onChange={handleChange}
                minLength={6}
                required
              />
            </>
          )}

          {error && <p style={{ color: "red", marginTop: "10px" }}>{error}</p>}
          {success && <p style={{ color: "#9effaf", marginTop: "10px" }}>{success}</p>}
          <button type="submit" disabled={loading}>
            {loading
              ? "Please wait..."
              : isLogin
                ? "Login"
                : isRegister
                  ? "Sign Up"
                  : isRecoverRequest
                    ? "Request reset"
                    : "Update password"}
          </button>
        </form>

        <div className="form-actions">
          {(isLogin || isRegister) && (
            <>
              <p>
                {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
                <button type="button" onClick={() => switchMode(isLogin ? "register" : "login")}>
                  {isLogin ? "Sign Up" : "Login"}
                </button>
              </p>
              {isLogin && (
                <p>
                  Forgot your password?{" "}
                  <button type="button" onClick={() => switchMode("recover-request")}>
                    Recover
                  </button>
                </p>
              )}
            </>
          )}
          {(isRecoverRequest || isRecoverConfirm) && (
            <p>
              Remembered your password?{" "}
              <button type="button" onClick={() => switchMode("login")}>
                Back to login
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default LoginForm;
