// ✅ Supabase Configuration
const supabaseUrl = "https://qcghfirmzxskrunrkwzf.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjZ2hmaXJtenhza3J1bnJrd3pmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAwNjY2OTgsImV4cCI6MjA1NTY0MjY5OH0.KKHUcku6UWOtoBnCIjJkI8sqwG2UFsaiDHXQrX9vUuk";
const supabase = supabase.createClient(supabaseUrl, supabaseKey);

// ✅ Google Login (with Redirect Fix)
document.getElementById("login-btn")?.addEventListener("click", async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({ 
        provider: "google",
        options: { redirectTo: window.location.origin } // Redirect back to the site
    });
    if (error) console.error("Login Error:", error);
});

// ✅ Get Authenticated User
async function getUser() {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
}

// ✅ Auto-Fill Profile if Logged In
document.addEventListener("DOMContentLoaded", async () => {
    let user = await getUser();
    if (user) {
        document.getElementById("user-name")?.innerText = `Welcome, ${user.email}`;
    }
});

// ✅ Save Profile
document.getElementById("save-profile")?.addEventListener("click", async () => {
    let user = await getUser();
    if (!user) return alert("Please log in first!");

    const file = document.getElementById("profile-pic").files[0];
    if (!file) return alert("Please select a profile picture!");

    let { data, error } = await supabase.storage.from("profile_pics").upload(`profiles/${user.id}.jpg`, file, { upsert: true });
    
    if (error) console.log("Error uploading profile picture:", error);
    else {
        let profileUrl = `${supabaseUrl}/storage/v1/object/public/profile_pics/profiles/${user.id}.jpg`;
        await supabase.from("users").upsert({
            id: user.id,
            username: document.getElementById("username").value,
            bio: document.getElementById("bio").value,
            profile_pic: profileUrl
        });
        alert("Profile updated successfully!");
    }
});

// ✅ Send Message
document.getElementById("send-message")?.addEventListener("click", async () => {
    let user = await getUser();
    if (!user) return alert("Please log in first!");

    let messageText = document.getElementById("message").value.trim();
    if (!messageText) return alert("Cannot send an empty message!");

    await supabase.from("messages").insert({
        sender_id: user.id,
        receiver_id: "global",  // Change this to a specific user if needed
        message: messageText
    });

    document.getElementById("message").value = ""; // Clear input
});

// ✅ Real-Time Chat Messages
async function loadMessages() {
    const { data, error } = await supabase.from("messages").select("*").order("timestamp", { ascending: true });
    if (error) console.error("Error loading messages:", error);
    else {
        document.getElementById("chat-box").innerHTML = data.map(msg => `
            <p><b>${msg.sender_id}:</b> ${msg.message}</p>
        `).join("");
    }
}
loadMessages();

// ✅ Listen for New Messages in Real-Time
supabase.channel("chat").on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, payload => {
    document.getElementById("chat-box").innerHTML += `<p><b>${payload.new.sender_id}:</b> ${payload.new.message}</p>`;
}).subscribe();

// ✅ Create a Post
document.getElementById("post-btn")?.addEventListener("click", async () => {
    let user = await getUser();
    if (!user) return alert("Please log in first!");

    const text = document.getElementById("post-text").value.trim();
    const file = document.getElementById("post-image").files[0];

    if (!text && !file) return alert("Post cannot be empty!");

    let imageUrl = "";
    if (file) {
        let { data, error } = await supabase.storage.from("posts").upload(`post_images/${user.id}_${Date.now()}.jpg`, file);
        if (!error) imageUrl = `${supabaseUrl}/storage/v1/object/public/posts/post_images/${user.id}_${Date.now()}.jpg`;
    }

    await supabase.from("posts").insert({
        user_id: user.id,
        text: text,
        image_url: imageUrl,
        likes: 0
    });

    document.getElementById("post-text").value = "";
    document.getElementById("post-image").value = "";
    loadPosts();
});

// ✅ Load Posts
async function loadPosts() {
    const { data, error } = await supabase.from("posts").select("*").order("timestamp", { ascending: false });
    if (error) console.error("Error loading posts:", error);
    else {
        document.getElementById("feed").innerHTML = data.map(post => `
            <div class="post">
                <p>${post.text}</p>
                ${post.image_url ? `<img src="${post.image_url}" width="100%">` : ""}
                <button class="like-btn" onclick="likePost('${post.id}')">❤️ Like (${post.likes})</button>
            </div>
        `).join("");
    }
}
loadPosts();

// ✅ Listen for New Posts in Real-Time
supabase.channel("posts").on("postgres_changes", { event: "INSERT", schema: "public", table: "posts" }, payload => {
    loadPosts();
}).subscribe();

// ✅ Like Post
async function likePost(postId) {
    await supabase.from("posts").update({ likes: supabase.raw("likes + 1") }).eq("id", postId);
    loadPosts();
}
