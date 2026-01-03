import { db, auth } from './config/firebase.js';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_FILE = path.join(__dirname, 'db.json');

console.log('🚀 Starting Firebase Realtime Database migration...\n');

async function migrateData() {
    try {
        // Read existing db.json
        const data = await fs.readJson(DB_FILE);
        console.log('📖 Loaded db.json');
        console.log(`   - ${data.users?.length || 0} users`);
        console.log(`   - ${data.posts?.length || 0} posts`);
        console.log(`   - ${data.requests?.length || 0} requests`);
        console.log(`   - ${data.chat?.length || 0} chat messages\n`);

        // Migrate Users
        console.log('👤 Migrating users...');
        let userCount = 0;
        const usersRef = db.ref('users');

        for (const user of data.users || []) {
            try {
                // Create Firebase Auth user if password exists
                if (user.password && user.email) {
                    try {
                        await auth.createUser({
                            uid: user.uid,
                            email: user.email,
                            password: user.password
                        });
                        console.log(`   ✅ Created auth user: ${user.email}`);
                    } catch (authError) {
                        console.log(`   ⚠️  Auth user exists: ${user.email}`);
                    }
                }

                // Store user data in Realtime Database (without password)
                const userData = { ...user };
                delete userData.password;

                await usersRef.child(user.uid).set(userData);
                userCount++;
                console.log(`   ✅ Migrated user: ${user.email || user.uid}`);
            } catch (error) {
                console.error(`   ❌ Error migrating user ${user.uid}:`, error.message);
            }
        }
        console.log(`✅ Migrated ${userCount} users\n`);

        // Migrate Posts
        console.log('📝 Migrating posts...');
        let postCount = 0;
        const postsRef = db.ref('posts');

        for (const post of data.posts || []) {
            try {
                await postsRef.child(post.id).set(post);
                postCount++;
            } catch (error) {
                console.error(`   ❌ Error migrating post ${post.id}:`, error.message);
            }
        }
        console.log(`✅ Migrated ${postCount} posts\n`);

        // Migrate Requests
        console.log('📋 Migrating requests...');
        let requestCount = 0;
        const requestsRef = db.ref('requests');

        for (const request of data.requests || []) {
            try {
                await requestsRef.child(request.id).set(request);
                requestCount++;
            } catch (error) {
                console.error(`   ❌ Error migrating request ${request.id}:`, error.message);
            }
        }
        console.log(`✅ Migrated ${requestCount} requests\n`);

        // Migrate Chat Messages
        console.log('💬 Migrating chat messages...');
        let chatCount = 0;
        const chatRef = db.ref('chat');

        for (const message of data.chat || []) {
            try {
                await chatRef.child(message.id).set(message);
                chatCount++;
            } catch (error) {
                console.error(`   ❌ Error migrating chat ${message.id}:`, error.message);
            }
        }
        console.log(`✅ Migrated ${chatCount} chat messages\n`);

        console.log('🎉 Migration completed successfully!');
        console.log('\n📊 Summary:');
        console.log(`   - Users: ${userCount}/${data.users?.length || 0}`);
        console.log(`   - Posts: ${postCount}/${data.posts?.length || 0}`);
        console.log(`   - Requests: ${requestCount}/${data.requests?.length || 0}`);
        console.log(`   - Chat: ${chatCount}/${data.chat?.length || 0}`);

        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

migrateData();
