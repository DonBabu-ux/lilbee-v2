const API_URL = "";

export const localAuth = {
    getCurrentUser() {
        const session = localStorage.getItem("localSession");
        return session ? JSON.parse(session) : null;
    },

    async signup(email, password, name = "", phone = "") {
        const res = await fetch(`${API_URL}/api/auth/signup`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password, name, phone })
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || "Signup failed");
        }
        const user = await res.json();
        this.saveSession(user);
        return user;
    },

    async login(email, password) {
        const res = await fetch(`${API_URL}/api/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password })
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || "Login failed");
        }
        const user = await res.json();
        this.saveSession(user);
        return user;
    },

    saveSession(user) {
        localStorage.setItem("localSession", JSON.stringify(user));
        window.dispatchEvent(new CustomEvent("authStateChanged", { detail: user }));
    },

    logout() {
        localStorage.removeItem("localSession");
        window.dispatchEvent(new CustomEvent("authStateChanged", { detail: null }));
    },

    onAuthStateChanged(callback) {
        const user = this.getCurrentUser();
        callback(user);
        window.addEventListener("authStateChanged", (e) => callback(e.detail));
    }
};
