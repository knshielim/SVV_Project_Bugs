require("dotenv").config();
const express = require("express");
const cors = require("cors");
const db = require("./db"); 
const registerRoute = require("./routes/register"); 

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true })); 

app.use(express.static("public"));

app.get("/", (req, res) => {
    res.send("Node.js backend is running!");
});

app.use("/", registerRoute);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
	
	console.log(`\n🎉 Ready to sign up! Open this link in your browser:`);
    console.log(`   http://localhost:${PORT}/signup.html`);
    console.log(`\n`);

    const loginRoute = require("./routes/login");
    app.use("/", loginRoute);

});

const rateLimit = require("express-rate-limit");

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, 
    max: 5,
    message: {
        success: false,
        message: "Too many login attempts. Please try again after 15 minutes."
    },
    standardHeaders: true,
    legacyHeaders: false,
});

const loginRoute = require("./routes/login"); 

app.use("/login", loginLimiter, loginRoute);
