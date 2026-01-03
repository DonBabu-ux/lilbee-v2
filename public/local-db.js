const API_URL = "";

export const localDB = {
    async getUsers() {
        const res = await fetch(`${API_URL}/api/users`);
        return await res.json();
    },
    async saveUser(user) {
        if (user.uid) {
            const res = await fetch(`${API_URL}/api/users/${user.uid}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(user)
            });
            const updated = await res.json();
            window.dispatchEvent(new CustomEvent(`localDBUpdate:users`, { detail: updated }));
            return updated;
        } else {
            const res = await fetch(`${API_URL}/api/users`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(user)
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({ error: "Creation failed with status " + res.status }));
                throw new Error(err.error || "User creation failed");
            }
            const created = await res.json();
            window.dispatchEvent(new CustomEvent(`localDBUpdate:users`, { detail: created }));
            return created;
        }
    },
    async toggleUserBan(uid) {
        const users = await this.getUsers();
        const user = users.find(u => u.uid === uid);
        if (user) {
            return await this.saveUser({ uid, isBanned: !user.isBanned });
        }
    },

    async getPosts() {
        const res = await fetch(`${API_URL}/api/posts`);
        return await res.json();
    },
    async addPost(post) {
        const res = await fetch(`${API_URL}/api/posts`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(post)
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || "Failed to post");
        }
        const newPost = await res.json();
        window.dispatchEvent(new CustomEvent(`localDBUpdate:posts`, { detail: newPost }));
        return newPost;
    },
    async deletePost(id) {
        await fetch(`${API_URL}/api/posts/${id}`, { method: "DELETE" });
        window.dispatchEvent(new CustomEvent(`localDBUpdate:posts`));
    },

    async getRequests(uid) {
        const url = uid ? `${API_URL}/api/requests?uid=${uid}` : `${API_URL}/api/requests`;
        const res = await fetch(url);
        return await res.json();
    },
    async addRequest(req) {
        const res = await fetch(`${API_URL}/api/requests`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(req)
        });
        const newReq = await res.json();
        window.dispatchEvent(new CustomEvent(`localDBUpdate:requests`, { detail: newReq }));
        return newReq;
    },
    async updateRequest(id, updates) {
        const res = await fetch(`${API_URL}/api/requests/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(updates)
        });
        const updated = await res.json();
        window.dispatchEvent(new CustomEvent(`localDBUpdate:requests`, { detail: updated }));
        return updated;
    },

    async getFeedback() {
        const res = await fetch(`${API_URL}/api/feedback`);
        return await res.json();
    },
    async submitFeedback(data) {
        const res = await fetch(`${API_URL}/api/feedback`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data)
        });
        const newItem = await res.json();
        // window.dispatchEvent(new CustomEvent(`localDBUpdate:feedback`, { detail: newItem }));
        return newItem;
    },
    async getChat(uid) {
        const url = uid ? `${API_URL}/api/chat?uid=${uid}` : `${API_URL}/api/chat`;
        const res = await fetch(url);
        return await res.json();
    },
    async addChatMessage(msg) {
        const res = await fetch(`${API_URL}/api/chat`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(msg)
        });
        const newMsg = await res.json();
        window.dispatchEvent(new CustomEvent(`localDBUpdate:chat`, { detail: newMsg }));
        return newMsg;
    },
    async deleteChat(id) {
        await fetch(`${API_URL}/api/chat/${id}`, { method: "DELETE" });
        window.dispatchEvent(new CustomEvent(`localDBUpdate:chat`));
    }
};
