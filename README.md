# Code With Me

## Stop Struggling Alone. Start Coding Together.

### 💡 Inspiration

Learning to code is often a solitary, frustrating experience, which disproportionately impacts individuals without existing networks or resources, leading to high dropout rates. We were inspired to solve the "stuck on a bug for hours" problem by democratizing the mentorship process. We believe the best way to learn is by **doing**—and the best way to do it is with a peer or mentor by your side.

Our mission is to foster a supportive, one-on-one community where anyone can learn, grow, and build the future, together.

### 🚀 Alignment with the Core Challenge: Code for Empowerment

**Code With Me** directly tackles the Core Challenge by:

1. **Breaking Down Barriers to Access & Education:** Our platform is 100% browser-based and free, removing the need for specialized software or expensive tuition, making quality, guided coding education accessible to everyone, everywhere.

2. **Fostering Inclusion and Support:** We provide a dedicated space for learners to instantly connect with mentors and peers. This ensures that every developer feels **seen, heard, and supported**, transforming the lonely struggle of debugging into a positive, collaborative learning opportunity.

### 💻 What it does

**Code With Me** instantly connects beginner developers with peers, mentors, and fellow learners for live, collaborative coding sessions, all directly in the browser—no downloads required!

Key features include:

* **Real-Time Collaborative Editor:** Instantly share your coding environment with a partner.

* **Live Review & Debugging:** Turn code reviews into a fluid, real-time conversation. Debug issues together, line-by-line.

* **Code Execution:** Run and test code snippets instantly within the platform.

* **Accessible Learning:** Find a partner, launch a session, and start learning immediately.

### ⚙️ How we built it

**Code With Me** is a powerful, full-stack application built for real-time performance and reliability.

| Component | Technology | Description | 
 | ----- | ----- | ----- | 
| **Frontend** | Vite, React, TypeScript, JavaScript | Provides a fast, modern, and type-safe user interface. | 
| **Backend** | Node.js, WebSockets | Handles persistent, low-latency, real-time connections required for collaboration. | 
| **Collaborative Editor** | Yjs, Real-Time Monaco Library | Yjs (a high-performance CRDT framework) powers the document synchronization, ensuring every participant sees the exact same code state instantly. This is integrated via a custom component based on the `shauryag2002/real-time-monaco` library. | 
| **Code Execution** | Piston API | We utilize the **Piston API** (`https://emkc.org/api/v2/piston`) via a custom `axios` setup to execute code submitted by users in a secure, sandboxed environment. | 

### 🚧 Challenges we ran into

The primary challenge was ensuring true, low-latency, conflict-free synchronization across multiple users in the code editor. Implementing Yjs correctly to handle concurrent edits—especially for complex structures like code—required careful state management and robust WebSocket handling on the backend. Integrating the code execution API also presented challenges in managing asynchronous responses and displaying error messages cleanly within our real-time environment.

### 🏆 Accomplishments that we're proud of

We are most proud of achieving a truly seamless, real-time collaborative coding experience. The ability to instantly share and modify code without lag, combined with integrated code execution, means the platform genuinely mimics an in-person, over-the-shoulder debugging session. We've successfully built a complex application that remains accessible and intuitive for beginners.

### 🚀 What's next for Code With Me

1. **Dedicated Mentorship Tracks:** Creating structured paths to connect learners with experienced developers.

2. **Video/Audio Integration:** Adding native video and audio conferencing within the coding room for richer interaction.

3. **Language-Specific Templates:** Providing pre-configured environments for popular languages (Python, JavaScript, Java) to speed up session setup.

## Run Locally

```bash
# install dependencies

npm install

# start the dev server

npm run dev
```
## Architecture
<img width="5344" height="1868" alt="diagram" src="https://github.com/user-attachments/assets/e6794ed4-c033-4b6e-8ada-8dfa90b5c235" />