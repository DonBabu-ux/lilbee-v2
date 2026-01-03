import { localAuth } from "./local-auth.js";
import { localDB } from "./local-db.js";

let currentOpenChatUid = null;

const tabs = document.querySelectorAll(".menu .tab");
const tabSections = document.querySelectorAll("main .tab");

tabs.forEach(tab => {
    tab.addEventListener("click", () => {
        if (tab.id === 'logoutBtn') return;

        const target = tab.dataset.tab;
        tabs.forEach(t => t.classList.remove("active"));
        tab.classList.add("active");

        tabSections.forEach(sec => {
            sec.classList.remove("active");
            sec.hidden = true;
        });
        const section = document.getElementById(target);
        if (section) {
            section.classList.add("active");
            section.hidden = false;
        }
    });
});

localAuth.onAuthStateChanged(async user => {
    if (!user) {
        window.location.href = "login.html";
        return;
    }

    if (user.role !== 'admin') {
        window.location.href = "dashboard.html";
        return;
    }

    const updateUI = (data) => {
        const displayName = data.name || data.email;
        document.getElementById("userEmail").innerText = displayName;
        document.getElementById("userRole").innerText = data.role || "user";
        document.getElementById("updateName").value = data.name || "";
        document.getElementById("updateEmail").value = data.email;
        document.getElementById("updateAvatar").value = data.avatar || "";
        if (data.avatar) {
            document.getElementById("userAvatar").style.backgroundImage = `url(${data.avatar})`;
            document.getElementById("userAvatar").style.backgroundSize = "cover";
        } else {
            document.getElementById("userAvatar").style.backgroundImage = "";
        }
    };

    updateUI(user);

    // Profile Update Logic
    const toggleBtn = document.getElementById("toggleUpdateBtn");
    const updateArea = document.getElementById("profileUpdateArea");
    if (toggleBtn && updateArea) {
        toggleBtn.onclick = () => {
            updateArea.hidden = !updateArea.hidden;
            toggleBtn.innerText = updateArea.hidden ? "Edit Profile" : "Cancel";
        };
    }

    const updateProfileBtn = document.getElementById("updateProfileBtn");
    if (updateProfileBtn) {
        updateProfileBtn.onclick = async () => {
            const newName = document.getElementById("updateName").value;
            const newEmail = document.getElementById("updateEmail").value;
            const newAvatar = document.getElementById("updateAvatar").value;

            try {
                const updated = await localDB.saveUser({
                    uid: user.uid,
                    name: newName,
                    email: newEmail,
                    avatar: newAvatar
                });
                localAuth.saveSession(updated);
                updateUI(updated);
                updateArea.hidden = true;
                toggleBtn.innerText = "Edit Profile";
                alert("Profile updated successfully!");
            } catch (e) {
                alert(e.message);
            }
        };
    }

    setupAdminListeners();
});

document.getElementById("logoutBtn").addEventListener("click", () => {
    localAuth.logout();
    window.location.href = "login.html";
});

function setupAdminListeners() {
    // State tracking to prevent flickering
    let lastState = {
        users: "",
        requests: "",
        posts: "",
        allChats: "",
        activeChat: ""
    };

    document.getElementById("adminCreateUserBtn").onclick = async () => {
        const email = document.getElementById("adminNewUserEmail").value.trim();
        const password = document.getElementById("adminNewUserPass").value.trim();

        if (!email || !password) {
            alert("Please enter email and password");
            return;
        }

        try {
            await localDB.saveUser({ email, password });
            alert(`User ${email} created!`);
            document.getElementById("adminNewUserEmail").value = "";
            document.getElementById("adminNewUserPass").value = "";
        } catch (e) {
            alert(e.message);
        }
    };

    const renderAdmin = async () => {
        const users = await localDB.getUsers();
        const requests = await localDB.getRequests();
        const allChats = await localDB.getChat();
        const posts = await localDB.getPosts();

        // --- User Management ---
        const usersJson = JSON.stringify(users);
        if (usersJson !== lastState.users) {
            lastState.users = usersJson;
            const userContainer = document.getElementById("userTableBody");
            if (userContainer) {
                userContainer.innerHTML = "";
                users.forEach(user => {
                    const card = document.createElement("div");
                    card.className = "user-card glass-card";
                    card.innerHTML = `
                        <div class="user-card-header">
                            <div class="user-info-main">
                                <strong title="${user.email}">${user.email}</strong>
                                <span class="badge ${user.role === 'admin' ? 'admin-badge' : ''}">${user.role || 'user'}</span>
                            </div>
                            <div class="user-card-status">
                                <span class="status-indicator ${user.isBanned ? 'banned' : 'active'}"></span>
                                <span class="status-text">${user.isBanned ? 'Inactive' : 'Active'}</span>
                            </div>
                        </div>
                        <div class="user-card-body">
                            <div class="user-meta">
                                <span class="meta-label">UID:</span>
                                <span class="meta-value">${user.uid.substring(0, 8)}...</span>
                            </div>
                        </div>
                        <div class="user-card-actions">
                            <div class="action-group">
                                <button class="small-btn" onclick="window.updateUserRole('${user.uid}', 'admin')" title="Set as Admin">Admin</button>
                                <button class="small-btn" onclick="window.updateUserRole('${user.uid}', 'user')" title="Set as User">User</button>
                            </div>
                            <div class="action-group">
                                <button class="small-btn msg-btn" onclick="window.initiateChat('${user.uid}', '${user.email}')" title="Message Operative">Message</button>
                                <button class="small-btn ${user.isBanned ? 'unban-btn' : 'ban-btn'}" onclick="window.toggleUserBan('${user.uid}')" title="${user.isBanned ? 'Activate' : 'Deactivate'}">
                                    ${user.isBanned ? 'Activate' : 'Deactivate'}
                                </button>
                            </div>
                        </div>
                    `;
                    userContainer.appendChild(card);
                });
            }
        }

        // --- Service Requests ---
        const requestsJson = JSON.stringify(requests);
        if (requestsJson !== lastState.requests) {
            lastState.requests = requestsJson;
            const adminServiceList = document.getElementById("adminServiceList");
            if (adminServiceList) {
                adminServiceList.innerHTML = "";
                requests.forEach(req => {
                    const div = document.createElement("div");
                    div.className = "service-card";
                    div.style.textAlign = "left";
                    div.innerHTML = `
                        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom: 10px;">
                            <strong style="color:var(--accent); font-size: 14px;">${req.type}</strong>
                            <span class="status-badge status-${req.status}">${req.status}</span>
                        </div>
                        <p style="margin-bottom: 15px; font-size: 13px; color:rgba(255,255,255,0.7);">${req.desc}</p>
                        <div style="display:flex; gap:10px; align-items:center;">
                            <select class="status-select" onchange="window.updateRequestStatus('${req.id}', this.value)">
                                <option value="pending" ${req.status === 'pending' ? 'selected' : ''}>Pending</option>
                                <option value="active" ${req.status === 'active' ? 'selected' : ''}>Active</option>
                                <option value="completed" ${req.status === 'completed' ? 'selected' : ''}>Completed</option>
                            </select>
                        </div>
                    `;
                    adminServiceList.appendChild(div);
                });
            }
        }

        // --- Community Posts ---
        const postsJson = JSON.stringify(posts);
        if (postsJson !== lastState.posts) {
            lastState.posts = postsJson;
            const adminPostList = document.getElementById("adminPostList");
            if (adminPostList) {
                adminPostList.innerHTML = "";
                posts.forEach(post => {
                    const div = document.createElement("div");
                    div.className = "mod-item glass-card";
                    div.style.marginBottom = "12px";
                    div.style.padding = "15px";
                    const user = users.find(u => u.uid === post.uid);
                    const authorName = user?.name || post.email;
                    div.innerHTML = `
                        <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                            <strong style="color:var(--accent); font-size: 13px;">${authorName}</strong>
                            <button class="delete-btn-sm" onclick="window.deleteContent('posts', '${post.id}')" style="background:transparent; border:none; color:#f44336; font-size: 10px; cursor:pointer;">Delete</button>
                        </div>
                        <p style="margin: 8px 0; font-size: 13px; line-height: 1.4;">${post.content}</p>
                    `;
                    adminPostList.appendChild(div);
                });
            }
        }

        // --- Support Messages ---
        const conversations = {};
        allChats.forEach(msg => {
            let conversationUser = msg.uid;
            if (msg.targetUid) {
                conversationUser = msg.targetUid;
            }
            if (!conversations[conversationUser]) {
                conversations[conversationUser] = [];
            }
            conversations[conversationUser].push(msg);
        });

        // Hashing chat objects to detect user navigation or history updates
        const chatsJson = JSON.stringify(conversations) + currentOpenChatUid;
        if (chatsJson !== lastState.allChats) {
            lastState.allChats = chatsJson;

            const userListDiv = document.getElementById("adminUserList");
            if (userListDiv) {
                userListDiv.innerHTML = "";

                const getDisplayName = (uid, msgs) => {
                    const userMsg = msgs ? msgs.find(m => m.uid === uid && !m.targetUid) : null;
                    if (userMsg && userMsg.name) return userMsg.name;
                    const user = users.find(u => u.uid === uid);
                    if (user && user.name) return user.name;
                    if (userMsg && userMsg.email) return userMsg.email;
                    if (user && user.email) return user.email;
                    return "Unknown Operative";
                };

                if (currentOpenChatUid && !conversations[currentOpenChatUid]) {
                    conversations[currentOpenChatUid] = [];
                }

                Object.keys(conversations).forEach(uid => {
                    const userMsgs = conversations[uid];
                    const lastMsg = userMsgs.length > 0 ? userMsgs[userMsgs.length - 1] : { timestamp: Date.now() };
                    const displayName = getDisplayName(uid, userMsgs);

                    const div = document.createElement("div");
                    div.className = "mod-item glass-card";
                    div.style.padding = "10px 15px";
                    div.style.margin = "0";
                    div.style.display = "flex";
                    div.style.flexDirection = "column";
                    div.style.gap = "4px";

                    if (uid === currentOpenChatUid) {
                        div.style.background = "rgba(255,184,107,0.1)";
                        div.style.borderColor = "rgba(255,184,107,0.2)";
                    }
                    div.style.cursor = "pointer";

                    const timeStr = userMsgs.length > 0 ? new Date(lastMsg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'New Stream';
                    div.innerHTML = `<strong style="font-size: 13px; color: ${uid === currentOpenChatUid ? 'var(--accent)' : '#fff'}">${displayName}</strong><small style="font-size: 10px; opacity: 0.5;">Last sync: ${timeStr}</small>`;

                    div.onclick = () => {
                        currentOpenChatUid = uid;
                        loadAdminChat(uid, displayName, conversations[uid]);
                        renderAdmin(); // Re-render to highlight selection
                    };
                    userListDiv.appendChild(div);
                });

                // If there's an open chat, refresh its view seamlessly
                if (currentOpenChatUid && conversations[currentOpenChatUid]) {
                    const displayName = getDisplayName(currentOpenChatUid, conversations[currentOpenChatUid]);
                    loadAdminChat(currentOpenChatUid, displayName, conversations[currentOpenChatUid]);
                }
            }
        }
    };

    renderAdmin();
    window.addEventListener("localDBUpdate:users", renderAdmin);
    window.addEventListener("localDBUpdate:posts", renderAdmin);
    window.addEventListener("localDBUpdate:requests", renderAdmin);
    window.addEventListener("localDBUpdate:chat", renderAdmin);

    // POLL for updates every 3 seconds to keep the chat and user status active
    setInterval(renderAdmin, 3000);
}

let lastChatState = "";

function loadAdminChat(targetUid, userName, messages) {
    const chatBox = document.getElementById("adminChatBox");
    const chatHeader = document.getElementById("adminChatHeader");
    const chatContainer = document.getElementById("adminChatContainer");
    const placeholder = document.getElementById("adminChatPlaceholder");

    // Skip if nothing changed in this chat
    const chatHash = targetUid + JSON.stringify(messages);
    if (chatHash === lastChatState) return;
    lastChatState = chatHash;

    chatContainer.hidden = false;
    placeholder.hidden = true;
    chatHeader.innerText = `Chat with ${userName}`;

    // Preserve scroll position
    const wasAtBottom = chatBox.scrollHeight - chatBox.scrollTop <= chatBox.clientHeight + 50;
    const previousScroll = chatBox.scrollTop;

    chatBox.innerHTML = "";

    const validMessages = messages.filter(m => m.timestamp);
    validMessages.sort((a, b) => a.timestamp - b.timestamp);

    if (validMessages.length === 0) {
        chatBox.innerHTML = `<div style="text-align:center; padding:20px; color:var(--muted)">No messages yet. Send a message to start the conversation.</div>`;
    }

    validMessages.forEach(msg => {
        const isAdmin = !!msg.targetUid;
        const div = document.createElement("div");
        div.className = isAdmin ? "chat-message self" : "chat-message other";
        div.style.alignSelf = isAdmin ? "flex-end" : "flex-start";

        const time = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        div.innerHTML = `
        <div class="message-content">${msg.msg}</div>
        <small style="opacity:0.7; font-size:0.7em;">${time}</small>
      `;
        chatBox.appendChild(div);
    });

    if (wasAtBottom) {
        chatBox.scrollTop = chatBox.scrollHeight;
    } else {
        chatBox.scrollTop = previousScroll;
    }

    const replyBtn = document.getElementById("adminReplyBtn");

    // Prevent multiple listeners
    const newBtn = replyBtn.cloneNode(true);
    replyBtn.parentNode.replaceChild(newBtn, replyBtn);

    newBtn.onclick = async () => {
        const input = document.getElementById("adminReplyInput");
        const msg = input.value.trim();
        if (!msg) return;

        // UI Optimistic update
        const div = document.createElement("div");
        div.className = "chat-message self";
        div.style.alignSelf = "flex-end";
        div.innerHTML = `<div class="message-content">${msg}</div><small style="opacity:0.7; font-size:0.7em;">Sending...</small>`;
        chatBox.appendChild(div);
        chatBox.scrollTop = chatBox.scrollHeight;

        const adminUser = localAuth.getCurrentUser();
        await localDB.addChatMessage({
            uid: adminUser.uid,
            email: adminUser.email,
            name: "Support Team",
            msg: msg,
            targetUid: targetUid
        });
        input.value = "";
    };

    const input = document.getElementById("adminReplyInput");
    input.onkeydown = (e) => {
        if (e.key === 'Enter') newBtn.click();
    };
}

// Global functions
window.initiateChat = (uid, email) => {
    // Switch to messages tab
    const tab = document.querySelector('button[data-tab="adminModeration"]');
    if (tab) tab.click();

    // Set active chat
    currentOpenChatUid = uid;

    // Trigger render to show empty chat box immediately
    // We can manually trigger the load function first to be snappy
    loadAdminChat(uid, email, []);

    // Force a re-render to update the list
    window.dispatchEvent(new CustomEvent("localDBUpdate:users")); // Hack to trigger render
};

window.updateUserRole = async (uid, newRole) => {
    await localDB.saveUser({ uid, role: newRole });
    alert("User role updated!");
};

window.updateRequestStatus = async (reqId, newStatus) => {
    await localDB.updateRequest(reqId, { status: newStatus });
    alert("Status updated!");
};

window.toggleUserBan = async (uid) => {
    await localDB.toggleUserBan(uid);
    alert("User status updated!");
};

window.deleteContent = async (type, id) => {
    if (!confirm("Delete this permanently?")) return;
    if (type === "posts") await localDB.deletePost(id);
    else await localDB.deleteChat(id);
    alert("Deleted!");
};
