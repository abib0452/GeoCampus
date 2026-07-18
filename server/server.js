require("dotenv").config();

const { initializeApp, cert } = require("firebase-admin/app");

initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n")
  })
});
const express = require("express");
const cors = require("cors");
const SibApiV3Sdk = require("sib-api-v3-sdk");


const app = express();

app.use(cors());
app.use(express.json());

const defaultClient = SibApiV3Sdk.ApiClient.instance;

const apiKey = defaultClient.authentications["api-key"];
apiKey.apiKey = process.env.BREVO_API_KEY;

const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
app.get("/", (req, res) => {
    res.send("GeoCampus Backend Running Successfully");
});

app.get("/test-email", async (req, res) => {

    const email = new SibApiV3Sdk.SendSmtpEmail();

    email.subject = "GeoCampus Login Test";
    email.sender = {
        name: "GeoCampus",
        email: "abinav0412@gmail.com"
    };

    email.to = [
        {
            email: "abinav0412@gmail.com"
        }
    ];

    email.htmlContent = `
        <h2>GeoCampus</h2>
        <p>This is a test email.</p>
    `;

    try {

        await apiInstance.sendTransacEmail(email);

        res.send("Email Sent Successfully");

    } catch (error) {

        console.log(error);

        res.send("Email Failed");

    }

});

const crypto = require("crypto");

const pendingLogins = {};

app.post("/request-login", async (req, res) => {

    const { email } = req.body;

    const token = crypto.randomUUID();

    pendingLogins[token] = {
        email,
        approved: false
    };

    const approveLink = `https://geocampus-api.onrender.com/approve/${token}`;

    const mail = new SibApiV3Sdk.SendSmtpEmail();

    mail.subject = "GeoCampus Login Approval";

    mail.sender = {
        name: "GeoCampus",
        email: "abinav0412@gmail.com"
    };

    mail.to = [
        {
            email: email
        }
    ];

    mail.htmlContent = `
        <h2>New Login Detected</h2>

        <p>Someone is trying to login to your GeoCampus account.</p>

        <a href="${approveLink}"
        style="
        background:green;
        color:white;
        padding:12px 20px;
        text-decoration:none;
        border-radius:6px;">
        YES, It's Me
        </a>

        <br><br>

        <p>If this wasn't you, change your password immediately.</p>
    `;

    try {

    await apiInstance.sendTransacEmail(mail);

    res.json({ token });

} catch (error) {

    console.error(error);

    res.status(500).json({
        error: error.message
    });

}

});

app.get("/approve/:token", (req, res) => {

    const token = req.params.token;

    if (!pendingLogins[token]) {
        return res.send("<h2>Invalid or Expired Link</h2>");
    }

    pendingLogins[token].approved = true;

    res.send(`
        <h2 style="color:green;">
            ✅ Login Approved Successfully
        </h2>

        <p>
            You can now return to GeoCampus and continue logging in.
        </p>
    `);

});

app.get("/check-login/:token", (req, res) => {

    const token = req.params.token;

    if (!pendingLogins[token]) {
        return res.json({
            approved: false
        });
    }

    res.json({
        approved: pendingLogins[token].approved
    });

});




const { getAuth } = require("firebase-admin/auth");

app.post("/reset-password", async (req, res) => {

    const { email, newPassword } = req.body;

    try {

        const user = await getAuth().getUserByEmail(email);

        await getAuth().updateUser(user.uid, {
            password: newPassword
        });

        res.json({
            success: true,
            message: "Password updated successfully"
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            success: false,
            message: error.message
        });

    }

});

const PORT = process.env.PORT || 3000;

app.get("/test-reset", (req, res) => {
    res.json({ ok: true });
});


app.listen(PORT, () => {

    console.log(`Server running on port ${PORT}`);

});
