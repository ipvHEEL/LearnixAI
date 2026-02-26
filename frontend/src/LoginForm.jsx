import React, { useState } from "react";
import "./LoginForm.css";

function LoginForm() {
  const [isLogin, setIsLogin] = useState(true);
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (!isLogin) {
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
        setError("Ошибка авторизации");
      } else {
        localStorage.setItem("userId", String(data.user_id));
        localStorage.setItem("jwtToken", data.access_token);
        window.location.href = "/news";
      }
    } catch (err) {
      console.error(err);
      setError(err.message || "Сервер недоступен");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <div className="form-container">
        <h1>{isLogin ? "Login" : "Sign Up"}</h1>

        <form onSubmit={handleSubmit}>
          <label>Username</label>
          <input
            type="text"
            name="username"
            value={form.username}
            onChange={handleChange}
            required
          />

          {!isLogin && (
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

          <label>Password</label>
          <input
            type="password"
            name="password"
            value={form.password}
            onChange={handleChange}
            minLength={6}
            required
          />

          {error && <p style={{ color: "red", marginTop: "10px" }}>{error}</p>}

          <button type="submit" disabled={loading}>
            {loading ? "Please wait..." : isLogin ? "Login" : "Sign Up"}
          </button>
        </form>

        <p style={{ marginTop: "15px", textAlign: "center" }}>
          {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
          <button
            type="button"
            onClick={() => {
              setIsLogin(!isLogin);
              setError("");
            }}
            style={{
              background: "none",
              border: "none",
              color: "#a87aff",
              cursor: "pointer",
            }}
          >
            {isLogin ? "Sign Up" : "Login"}
          </button>
        </p>
      </div>
    </div>
  );
}

export default LoginForm;
