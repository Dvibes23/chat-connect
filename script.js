const supabaseUrl = "https://qcghfirmzxskrunrkwzf.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjZ2hmaXJtenhza3J1bnJrd3pmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAwNjY2OTgsImV4cCI6MjA1NTY0MjY5OH0.KKHUcku6UWOtoBnCIjJkI8sqwG2UFsaiDHXQrX9vUuk";
const supabase = supabase.createClient(supabaseUrl, supabaseKey);

// 🚀 Google Login
document.getElementById("login-btn")?.addEventListener("click", async () => {
    let { user, error } = await supabase.auth.signInWithOAuth({ provider: "google" });
    if (error) console.log("Login Error", error);
});

// 🔒 Get Authenticated User
async function getUser() {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
}

// 👤 Save Profile
document.getElementById("save-profile")?.addEventListener("click", async () => {
    const file = document.getElementById("profile-pic").files[0];
    let { data, error } = await supabase.storage.from("profile_pics").upload(`profiles/${file.name}`, file);
    
    if (error) console.log("Error uploading", error);
    else {
        let profileUrl = `${supabaseUrl}/storage/v1/object/public/profile_pics/profiles/${file.name}`;
        await supabase.from("users").insert({
            username: document.getElementById("username").value,
            bio: document.getElementById("bio").value,
            profile_pic: profileUrl
        });
    }
});

// 💬 Send Message
document.getElementById("send-message")?.addEventListener("click", async () => {
    let user = await getUser();
    await supabase.from("messages").insert({
        sender_id: user.id,
        receiver_id: "other_user_id", // Change as needed
        message: document.getElementById("message").value
    });
});

// 🔄 Display Messages in Real Time
supabase.from("messages").on("INSERT", payload => {
    document.getElementById("chat-box").innerHTML += `<p>${payload.new.message}</p>`;
}).subscribe();

// 📢 Post to Feed
document.getElementById("post-btn")?.addEventListener("click", async () => {
    const file = document.getElementById("post-image").files[0];
    const text = document.getElementById("post-text").value;
    const storageRef = supabase.storage.from("posts").upload(`post_images/${file.name}`, file);

    let { data, error } = await storageRef;
    if (!error) {
        let imageUrl = `${supabaseUrl}/storage/v1/object/public/posts/post_images/${file.name}`;
        await supabase.from("posts").insert({
            text: text,
            image_url: imageUrl,
            likes: 0
        });
    }
});
