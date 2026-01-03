import { localAuth } from "./local-auth.js";
import { localDB } from "./local-db.js";

const tabs = document.querySelectorAll(".menu .tab");
const tabSections = document.querySelectorAll("main .tab");

tabs.forEach(tab => {
  tab.addEventListener("click", () => {
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

  try {
    const users = await localDB.getUsers();
    const freshUser = users.find(u => u.uid === user.uid);
    if (freshUser) {
      if (JSON.stringify(freshUser) !== JSON.stringify(user)) {
        user = freshUser;
        localAuth.saveSession(user);
      }
    }
  } catch (err) {
    console.warn("Could not sync session:", err);
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
    }
  };

  updateUI(user);

  window.addEventListener("localDBUpdate:users", () => {
    const updatedUser = localAuth.getCurrentUser();
    if (updatedUser) updateUI(updatedUser);
  });

  const toggleBtn = document.getElementById("toggleUpdateBtn");
  const updateArea = document.getElementById("profileUpdateArea");
  if (toggleBtn && updateArea) {
    toggleBtn.onclick = () => {
      updateArea.hidden = !updateArea.hidden;
      toggleBtn.innerText = updateArea.hidden ? "Edit Profile" : "Cancel";
    };
  }

  setupPresence(user.uid);
  setupFeed(user);
  setupServices(user.uid);
  setupChat(user.uid);
});

document.getElementById("logoutBtn").addEventListener("click", () => {
  localAuth.logout();
  window.location.href = "login.html";
});

document.getElementById("updateProfileBtn").addEventListener("click", async () => {
  const user = localAuth.getCurrentUser();
  const updatedData = {
    ...user,
    name: document.getElementById("updateName").value,
    email: document.getElementById("updateEmail").value,
    avatar: document.getElementById("updateAvatar").value
  };

  const updated = await localDB.saveUser(updatedData);
  localAuth.saveSession(updated);
  alert("Profile updated!");
  document.getElementById("profileUpdateArea").hidden = true;
  document.getElementById("toggleUpdateBtn").innerText = "Edit Profile";
});

function setupPresence(uid) {
  const statusSpan = document.getElementById("userStatus");
  statusSpan.innerText = "Online";
}

function setupFeed(currentUser) {
  const publicFeedDiv = document.getElementById("publicFeed");
  const myPostsDiv = document.getElementById("myPostsFeed");

  const feedTabs = document.querySelectorAll(".feed-tab");
  feedTabs.forEach(tab => {
    tab.addEventListener("click", () => {
      feedTabs.forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      const target = tab.dataset.feed;
      publicFeedDiv.hidden = target !== "public";
      myPostsDiv.hidden = target === "public";
    });
  });

  let lastPostsJson = "";
  const renderFeed = async () => {
    const posts = await localDB.getPosts();
    const users = await localDB.getUsers();

    const currentJson = JSON.stringify(posts);
    if (currentJson === lastPostsJson) return; // Skip if no changes
    lastPostsJson = currentJson;

    publicFeedDiv.innerHTML = "";
    myPostsDiv.innerHTML = "";

    posts.forEach(post => {
      const isMine = post.uid === currentUser.uid;
      const div = document.createElement("div");
      div.className = "feed-post glass-card";
      if (isMine) div.classList.add("my-post");

      const userRecord = users.find(u => u.uid === post.uid);
      const displayName = post.name || userRecord?.name || post.email || "Unknown Operative";

      div.innerHTML = `
        ${isMine ? `<div class="post-actions"><button class="delete-btn-sm" onclick="window.deleteMyPost('${post.id}')">Delete</button></div>` : ""}
        <strong>${displayName}</strong> ${isMine ? '<span class="badge" style="font-size:9px">You</span>' : ''}
        <p>${post.content}</p>
        <small style="color:var(--muted)">${new Date(post.timestamp).toLocaleString()}</small>
      `;

      if (isMine) myPostsDiv.appendChild(div);
      else publicFeedDiv.appendChild(div);
    });

    if (publicFeedDiv.innerHTML === "") publicFeedDiv.innerHTML = "<p>No posts from others yet.</p>";
    if (myPostsDiv.innerHTML === "") myPostsDiv.innerHTML = "<p>You haven't posted anything yet.</p>";
  };

  renderFeed();
  window.addEventListener("localDBUpdate:posts", renderFeed);

  document.getElementById("postBtn").onclick = async () => {
    const content = document.getElementById("postContent").value.trim();
    if (!content) return;
    try {
      await localDB.addPost({
        uid: currentUser.uid,
        email: currentUser.email,
        name: currentUser.name || currentUser.email.split('@')[0],
        content
      });
      document.getElementById("postContent").value = "";
      alert("Post shared!");
    } catch (e) {
      alert(e.message);
    }
  };

  window.deleteMyPost = async (postId) => {
    if (confirm("Delete your post?")) {
      await localDB.deletePost(postId);
      alert("Post removed.");
    }
  };
}

function setupServices(uid) {
  const listDiv = document.getElementById("serviceList");

  const renderRequests = async () => {
    const requests = await localDB.getRequests(uid);
    listDiv.innerHTML = "";
    requests.forEach(req => {
      const div = document.createElement("div");
      div.className = "glass-card";
      div.style.marginBottom = "10px";
      div.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:flex-start;">
          <strong>${req.type}</strong>
          <span class="status-badge status-${req.status}">${req.status}</span>
        </div>
        <p>${req.desc}</p>
        <small style="color:var(--muted)">Submitted: ${new Date(req.timestamp).toLocaleDateString()}</small>
      `;
      listDiv.appendChild(div);
    });
  };

  renderRequests();
  window.addEventListener("localDBUpdate:requests", renderRequests);

  document.getElementById("requestServiceBtn").onclick = async () => {
    const type = document.getElementById("serviceType").value.trim();
    const desc = document.getElementById("serviceDesc").value.trim();
    if (!type || !desc) return;
    await localDB.addRequest({
      uid,
      type,
      desc
    });
    document.getElementById("serviceType").value = "";
    document.getElementById("serviceDesc").value = "";
    alert("Service request submitted!");
  };
}

function setupChat(uid) {
  const chatBox = document.getElementById("chatBox");

  const renderChat = async () => {
    const chat = await localDB.getChat(uid);
    chatBox.innerHTML = "";

    if (chat.length === 0) {
      chatBox.innerHTML = `<div style="text-align:center; padding:20px; color:var(--muted)">Start a conversation with Support.</div>`;
      return;
    }

    // Process messages
    chat.forEach(msg => {
      // Message is 'self' if msg.uid === uid AND it's NOT a targeted admin message
      // In dashboard, admin replies have targetUid === uid
      const isFromAdmin = msg.targetUid === uid;
      const isMe = msg.uid === uid && !msg.targetUid;

      const div = document.createElement("div");
      div.className = isMe ? "chat-message self" : "chat-message other";

      const time = msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

      let sender = isFromAdmin ? "Support Team" : (isMe ? "You" : (msg.name || msg.email));

      div.innerHTML = `
        <div class="chat-meta">
          <span>${sender}</span>
          <span class="chat-time">${time}</span>
        </div>
        <div class="message-content">${msg.msg}</div>
      `;
      chatBox.appendChild(div);
    });
    chatBox.scrollTop = chatBox.scrollHeight;
  };

  renderChat();
  window.addEventListener("localDBUpdate:chat", renderChat);

  // POLL for new messages every 3 seconds to ensure we receive admin replies
  setInterval(renderChat, 3000);

  document.getElementById("sendMessageBtn").innerHTML = `
    <svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"></path></svg>
  `;

  const sendMsg = async () => {
    const input = document.getElementById("chatMessage");
    const msg = input.value.trim();
    if (!msg) return;

    const user = localAuth.getCurrentUser();
    await localDB.addChatMessage({
      uid,
      email: user.email,
      name: user.name || user.email.split('@')[0], // Send name
      msg
    });
    input.value = "";
  };

  document.getElementById("sendMessageBtn").onclick = sendMsg;
  const input = document.getElementById("chatMessage");
  input.onkeydown = (e) => { if (e.key === 'Enter') sendMsg(); };
}

// Global Helpers
window.requestService = async (type) => {
  const desc = prompt(`Describe your needs for ${type}:`);
  if (!desc) return;
  const user = localAuth.getCurrentUser();
  try {
    await localDB.addRequest({
      uid: user.uid,
      email: user.email,
      type: type,
      desc: desc
    });
    alert("Request sent successfully!");
    window.dispatchEvent(new CustomEvent("localDBUpdate:requests"));
  } catch (e) {
    alert("Error: " + e.message);
  }
};

// Feedback Logic
const fbBtn = document.getElementById("submitFeedbackBtn");
if (fbBtn) {
  fbBtn.onclick = async () => {
    const nameInp = document.getElementById("fbName");
    const msgInp = document.getElementById("fbMessage");
    const name = nameInp.value.trim();
    const message = msgInp.value.trim();

    if (!message) {
      alert("Please enter a message.");
      return;
    }

    const user = localAuth.getCurrentUser();
    try {
      await localDB.submitFeedback({
        uid: user.uid,
        email: user.email,
        name: name || user.name,
        message
      });
      alert("Thank you for your feedback!");
      nameInp.value = "";
      msgInp.value = "";
    } catch (e) {
      alert("Error sending feedback: " + e.message);
    }
  };
}


