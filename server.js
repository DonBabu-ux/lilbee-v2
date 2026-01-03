import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import { db, auth } from './config/firebase.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Auth Routes
app.post('/api/auth/signup', async (req, res) => {
    try {
        const { email, password, name, phone } = req.body;

        // Check if user already exists
        const usersRef = db.ref('users');
        const snapshot = await usersRef.orderByChild('email').equalTo(email).once('value');

        if (snapshot.exists()) {
            return res.status(400).json({ error: "Email already exists" });
        }

        // Create Firebase Auth user
        const userRecord = await auth.createUser({
            email,
            password
        });

        // Create user in Realtime Database
        const newUser = {
            uid: userRecord.uid,
            email,
            name: name || "",
            phone: phone || "",
            role: "user",
            avatar: "",
            isBanned: false,
            joinedAt: Date.now()
        };

        await usersRef.child(userRecord.uid).set(newUser);

        res.json(newUser);
    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Get user by email
        const usersRef = db.ref('users');
        const snapshot = await usersRef.orderByChild('email').equalTo(email).once('value');

        if (!snapshot.exists()) {
            return res.status(401).json({ error: "Invalid credentials" });
        }

        const users = snapshot.val();
        const user = Object.values(users)[0];

        res.json(user);
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Posts Routes
app.get('/api/posts', async (req, res) => {
    try {
        const postsRef = db.ref('posts');
        const snapshot = await postsRef.orderByChild('timestamp').once('value');

        if (!snapshot.exists()) {
            return res.json([]);
        }

        const posts = [];
        snapshot.forEach(child => {
            posts.unshift(child.val()); // Add to beginning for reverse chronological order
        });

        res.json(posts);
    } catch (error) {
        console.error('Get posts error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/posts', async (req, res) => {
    try {
        const { uid, email, content } = req.body;

        // Check if user is banned
        const userSnapshot = await db.ref(`users/${uid}`).once('value');
        if (userSnapshot.exists() && userSnapshot.val().isBanned) {
            return res.status(403).json({ error: "You are banned from posting" });
        }

        const newPost = {
            id: Date.now().toString(),
            uid,
            email,
            content,
            timestamp: Date.now()
        };

        await db.ref(`posts/${newPost.id}`).set(newPost);
        res.json(newPost);
    } catch (error) {
        console.error('Create post error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/posts/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await db.ref(`posts/${id}`).remove();
        res.json({ success: true });
    } catch (error) {
        console.error('Delete post error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Requests Routes
app.get('/api/requests', async (req, res) => {
    try {
        const { uid } = req.query;
        const requestsRef = db.ref('requests');

        if (uid) {
            const snapshot = await requestsRef.orderByChild('uid').equalTo(uid).once('value');
            const requests = [];
            if (snapshot.exists()) {
                snapshot.forEach(child => {
                    requests.unshift(child.val());
                });
            }
            res.json(requests);
        } else {
            const snapshot = await requestsRef.orderByChild('timestamp').once('value');
            const requests = [];
            if (snapshot.exists()) {
                snapshot.forEach(child => {
                    requests.unshift(child.val());
                });
            }
            res.json(requests);
        }
    } catch (error) {
        console.error('Get requests error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/requests', async (req, res) => {
    try {
        const { uid, type, desc } = req.body;

        const newRequest = {
            id: Date.now().toString(),
            uid,
            type,
            desc,
            status: "pending",
            timestamp: Date.now()
        };

        await db.ref(`requests/${newRequest.id}`).set(newRequest);
        res.json(newRequest);
    } catch (error) {
        console.error('Create request error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.patch('/api/requests/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const requestRef = db.ref(`requests/${id}`);
        const snapshot = await requestRef.once('value');

        if (snapshot.exists()) {
            await requestRef.update({ status });
            const updated = await requestRef.once('value');
            res.json(updated.val());
        } else {
            res.status(404).json({ error: "Request not found" });
        }
    } catch (error) {
        console.error('Update request error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Users Routes
app.get('/api/users', async (req, res) => {
    try {
        const usersRef = db.ref('users');
        const snapshot = await usersRef.once('value');

        if (!snapshot.exists()) {
            return res.json([]);
        }

        const users = [];
        snapshot.forEach(child => {
            users.push(child.val());
        });

        res.json(users);
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.patch('/api/users/:uid', async (req, res) => {
    try {
        const { uid } = req.params;
        const updates = req.body;

        const userRef = db.ref(`users/${uid}`);
        const snapshot = await userRef.once('value');

        if (snapshot.exists()) {
            await userRef.update(updates);
            const updated = await userRef.once('value');
            res.json(updated.val());
        } else {
            if (updates.email) {
                const newUser = {
                    uid: uid || "user_" + Date.now(),
                    isBanned: false,
                    role: "user",
                    joinedAt: Date.now(),
                    ...updates
                };
                await userRef.set(newUser);
                res.json(newUser);
            } else {
                res.status(404).json({ error: "User not found" });
            }
        }
    } catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/users', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Check if user exists
        const usersRef = db.ref('users');
        const snapshot = await usersRef.orderByChild('email').equalTo(email).once('value');

        if (snapshot.exists()) {
            return res.status(400).json({ error: "Email already exists" });
        }

        const newUser = {
            uid: "user_" + Date.now(),
            email,
            password,
            role: "user",
            name: "",
            avatar: "",
            isBanned: false,
            joinedAt: Date.now()
        };

        await usersRef.child(newUser.uid).set(newUser);
        res.json(newUser);
    } catch (error) {
        console.error('Create user error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Chat Routes
// Chat Routes
app.get('/api/chat', async (req, res) => {
    try {
        const { uid } = req.query;
        const chatRef = db.ref('chat');
        const snapshot = await chatRef.orderByChild('timestamp').once('value');

        if (!snapshot.exists()) {
            return res.json([]);
        }

        const messages = [];
        snapshot.forEach(child => {
            const msg = child.val();
            // If uid is provided, filter for that user's conversation (their messages + admin replies to them)
            // If no uid (Admin view), return all messages
            if (uid) {
                if (msg.uid === uid || msg.targetUid === uid) {
                    messages.push(msg);
                }
            } else {
                messages.push(msg);
            }
        });

        res.json(messages);
    } catch (error) {
        console.error('Get chat error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/chat', async (req, res) => {
    try {
        const { uid, email, msg, targetUid, name } = req.body;

        const newMsg = {
            id: Date.now().toString(),
            uid,
            email,
            name: name || "", // Store name, fallback to empty string
            msg,
            targetUid: targetUid || null, // If sent by admin to user
            timestamp: Date.now()
        };

        await db.ref(`chat/${newMsg.id}`).set(newMsg);
        res.json(newMsg);
    } catch (error) {
        console.error('Send chat error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/chat/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await db.ref(`chat/${id}`).remove();
        res.json({ success: true });
    } catch (error) {
        console.error('Delete chat error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Feedback Routes
app.get('/api/feedback', async (req, res) => {
    try {
        const feedbackRef = db.ref('feedback');
        const snapshot = await feedbackRef.orderByChild('timestamp').once('value');
        const items = [];
        if (snapshot.exists()) {
            snapshot.forEach(child => items.unshift(child.val()));
        }
        res.json(items);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/feedback', async (req, res) => {
    try {
        const { uid, email, name, message } = req.body;
        const newItem = {
            id: Date.now().toString(),
            uid,
            email,
            name,
            message,
            timestamp: Date.now()
        };
        await db.ref(`feedback/${newItem.id}`).set(newItem);
        res.json(newItem);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Export the app for Vercel
export default app;

// Only run the server manually if not in a Vercel environment
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`Server running at http://localhost:${PORT}`);
    });
}
