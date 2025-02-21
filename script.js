// ✅ Supabase Configuration
const supabaseUrl = "https://qcghfirmzxskrunrkwzf.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjZ2hmaXJtenhza3J1bnJrd3pmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAwNjY2OTgsImV4cCI6MjA1NTY0MjY5OH0.KKHUcku6UWOtoBnCIjJkI8sqwG2UFsaiDHXQrX9vUuk";
const supabase = supabase.createClient(supabaseUrl, supabaseKey);

// ✅ Google Login Fix
document.getElementById("login-btn")?.addEventListener("click", async () => {
    try {
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: "google",
            options: { redirectTo: window.location.origin } // Redirect back to site after login
        });
        if (error) throw error;
        console.log("Login Successful:", data);
    } catch (error) {
        console.error("Google Login Error:", error);
    }
});

// ✅ Auto-Fill Profile if Logged In
document.addEventListener("DOMContentLoaded", async () => {
    let { data: { user }, error } = await supabase.auth.getUser();
    if (user) {
        document.getElementById("user-name")?.innerText = `Welcome, ${user.email}`;
    }
});

// ✅ Save Profile
document.getElementById("save-profile")?.addEventListener("click", async () => {
    try {
        let user = await supabase.auth.getUser();
        if (!user) return alert("Please log in first!");

        const file = document.getElementById("profile-pic").files[0];
        if (!file) return alert("Please select a profile picture!");

        let { data, error } = await supabase.storage.from("profile_pics").upload(`profiles/${user.id}.jpg`, file, { upsert: true });
        if (error) throw error;

        let profileUrl = `${supabaseUrl}/storage/v1/object/public/profile_pics/profiles/${user.id}.jpg`;
        await supabase.from("users").upsert({
            id: user.id,
            username: document.getElementById("username").value,
            bio: document.getElementById("bio").value,
            profile_pic: profileUrl
        });

        alert("Profile updated successfully!");
    } catch (error) {
        console.error("Profile Save Error:", error);
    }
});

// ✅ Send Message
document.getElementById("send-message")?.addEventListener("click", async () => {
    try {
        let user = await supabase.auth.getUser();
        if (!user) return alert("Please log in first!");

        let messageText = document.getElementById("message").value.trim();
        if (!messageText) return alert("Cannot send an empty message!");

        await supabase.from("messages").insert({
            sender_id: user.id,
            message: messageText
        });

        document.getElementById("message").value = ""; // Clear input
    } catch (error) {
        console.error("Message Send Error:", error);
    }
});

// ✅ Load Chat Messages
async function loadMessages() {
    try {
        const { data, error } = await supabase.from("messages").select("*").order("timestamp");
        if (error) throw error;

        document.getElementById("chat-box").innerHTML = data.map(msg => `
            <p><b>${msg.sender_id}:</b> ${msg.message}</p>
        `).join("");
    } catch (error) {
        console.error("Error loading messages:", error);
    }
}
loadMessages();

// ✅ Real-Time Chat Updates
supabase.channel("chat").on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, payload => {
    document.getElementById("chat-box").innerHTML += `<p><b>${payload.new.sender_id}:</b> ${payload.new.message}</p>`;
}).subscribe();

// ✅ Create a Post
document.getElementById("post-btn")?.addEventListener("click", async () => {
    try {
        let user = await supabase.auth.getUser();
        if (!user) return alert("Please log in first!");

        const text = document.getElementById("post-text").value.trim();
        if (!text) return alert("Post cannot be empty!");

        await supabase.from("posts").insert({
            user_id: user.id,
            text: text,
            likes: 0
        });

        document.getElementById("post-text").value = "";
        loadPosts();
    } catch (error) {
        console.error("Post Create Error:", error);
    }
});

// ✅ Load Posts
async function loadPosts() {
    try {
        const { data, error } = await supabase.from("posts").select("*").order("timestamp", { ascending: false });
        if (error) throw error;

        document.getElementById("feed").innerHTML = data.map(post => `
            <div class="post">
                <p>${post.text}</p>
                <button onclick="likePost('${post.id}')">❤️ Like (${post.likes})</button>
            </div>
        `).join("");
    } catch (error) {
        console.error("Error loading posts:", error);
    }
}
loadPosts();

// ✅ Real-Time Post Updates
supabase.channel("posts").on("postgres_changes", { event: "INSERT", schema: "public", table: "posts" }, payload => {
    loadPosts();
}).subscribe();

// ✅ Like Post
async function likePost(postId) {
    try {
        await supabase.from("posts").update({ likes: supabase.raw("likes + 1") }).eq("id", postId);
        loadPosts();
    } catch (error) {
        console.error("Like Post Error:", error);
    }
}
