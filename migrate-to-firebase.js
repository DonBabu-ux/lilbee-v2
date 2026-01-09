import { db, auth } from "./config/firebase.js";
import fs from "fs-extra";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_FILE = path.join(__dirname, "db.json");

console.log("Starting Firebase Realtime Database migration...\n");

async function migrateData() {
  try {
    const data = await fs.readJson(DB_FILE);

    console.log("Loaded db.json");
    console.log(`- ${data.users?.length || 0} users`);
    console.log(`- ${data.posts?.length || 0} posts`);
    console.log(`- ${data.requests?.length || 0} requests`);
    console.log(`- ${data.chat?.length || 0} chat messages\n`);

    /* =======================
       USERS
       ======================= */

    console.log("Migrating users...");
    const usersRef = db.ref("users");
    let userCount = 0;

    for (const user of data.users || []) {
      if (!user.email) continue;

      try {
        // Create Auth user with temporary password
        const tempPassword = crypto.randomUUID();

        const authUser = await auth.createUser({
          email: user.email,
          password: tempPassword,
          emailVerified: false
        });

        // Send password reset email
        await auth.generatePasswordResetLink(user.email);

        // Store user data WITHOUT password, using AUTH UID
        const cleanUser = {
          uid: authUser.uid,
          email: user.email,
          name: user.name || "",
          role: user.role || "user",
          createdAt: Date.now(),
          migrated: true
        };

        await usersRef.child(authUser.uid).set(cleanUser);
        userCount++;

        console.log(`Migrated user: ${user.email}`);
      } catch (err) {
        console.error(`Failed user: ${user.email}`, err.message);
      }
    }

    console.log(`Users migrated: ${userCount}\n`);

    /* =======================
       POSTS
       ======================= */

    console.log("Migrating posts...");
    const postsRef = db.ref("posts");
    let postCount = 0;

    for (const post of data.posts || []) {
      try {
        await postsRef.child(post.id).set(post);
        postCount++;
      } catch (err) {
        console.error(`Post error ${post.id}`, err.message);
      }
    }

    console.log(`Posts migrated: ${postCount}\n`);

    /* =======================
       REQUESTS
       ======================= */

    console.log("Migrating requests...");
    const requestsRef = db.ref("requests");
    let requestCount = 0;

    for (const request of data.requests || []) {
      try {
        await requestsRef.child(request.id).set(request);
        requestCount++;
      } catch (err) {
        console.error(`Request error ${request.id}`, err.message);
      }
    }

    console.log(`Requests migrated: ${requestCount}\n`);

    /* =======================
       CHAT
       ======================= */

    console.log("Migrating chat messages...");
    const chatRef = db.ref("chat");
    let chatCount = 0;

    for (const message of data.chat || []) {
      try {
        await chatRef.child(message.id).set(message);
        chatCount++;
      } catch (err) {
        console.error(`Chat error ${message.id}`, err.message);
      }
    }

    console.log(`Chat messages migrated: ${chatCount}\n`);

    console.log("Migration completed successfully");
    process.exit(0);
  } catch (error) {
    console.error("Migration failed", error);
    process.exit(1);
  }
}

migrateData();
