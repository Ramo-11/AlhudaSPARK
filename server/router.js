const express = require("express")
const { logger } = require("./logger");
require('dotenv').config()

// Import controllers
const { 
    createZeffyPaymentSession,
    handleZeffyWebhook,
    getSponsorshipSuccess,
    getAllSponsors
} = require("./controllers/zeffyController");

const {
    registerSponsor
} = require("./controllers/sponsorController");

const {
    registerTeam
} = require("./controllers/teamRegistrationController");

// Import Cloudinary upload middleware
const { upload, handleMulterError } = require("./controllers/cloudinaryController");

const { 
    submitContactForm 
} = require("./controllers/contactController");

// Environment configuration
const isProd = process.env.NODE_ENV === "production"
process.env.STRIPE_PUBLIC_KEY = isProd ? process.env.STRIPE_PUBLIC_KEY_PROD : process.env.STRIPE_PUBLIC_KEY_TEST

const route = express.Router()

// *********** GET requests **********

// Home page
route.get("/", (req, res) => {
    res.render("index", {
        title: "Home",
        description: "Welcome to Alhuda SPARK 2025 - Midwest Basketball Tournament & Quran Competition",
        additionalCSS: ["index.css"],
        additionalJS: ["index.js"],
        layout: "layout"
    });
});

// Sponsorship page
route.get("/sponsorship", (req, res) => {
    res.render("sponsorship", {
        title: "Become a Sponsor",
        description: "Partner with Alhuda SPARK 2025 and make a lasting impact on youth development",
        additionalCSS: ["sponsorship.css"],
        additionalJS: ["sponsorship.js"],
        layout: "layout"
    });
});

// Sponsorship success page
route.get("/sponsorship/success", getSponsorshipSuccess);

// Team registration page
route.get("/teams-registration", (req, res) => {
    res.render("teams-registration", {
        title: "Team Registration",
        description: "Register your team for the Alhuda SPARK 2025 Basketball Tournament",
        additionalCSS: ["teams-registration.css"],
        additionalJS: ["teams-registration.js"],
        layout: "layout"
    });
});

// Vendor registration page
route.get("/vendors", (req, res) => {
    res.render("vendors", {
        title: "Vendor Registration",
        description: "Become a vendor at the Alhuda SPARK 2025 event",
        additionalCSS: ["vendors.css"],
        additionalJS: ["vendors.js"],
        layout: "layout"
    });
});

// Contact page
route.get("/contact", (req, res) => {
    res.render("contact", {
        title: "Contact Us",
        description: "Get in touch with the Alhuda SPARK 2025 team",
        additionalCSS: ["contact.css"],
        additionalJS: ["contact.js"],
        layout: "layout"
    });
});

// About page
route.get("/about", (req, res) => {
    res.render("about", {
        title: "About Us",
        description: "Learn more about Alhuda SPARK and our mission",
        additionalCSS: ["about.css"],
        layout: "layout"
    });
});

// Schedule page
route.get("/schedule", (req, res) => {
    res.render("schedule", {
        title: "Tournament Schedule",
        description: "View the complete schedule for Alhuda SPARK 2025",
        additionalCSS: ["schedule.css"],
        additionalJS: ["schedule.js"],
        layout: "layout"
    });
});

// Rules page
route.get("/rules", (req, res) => {
    res.render("rules", {
        title: "Tournament Rules",
        description: "Official rules and regulations for the basketball tournament",
        additionalCSS: ["rules.css"],
        layout: "layout"
    });
});

// Privacy Policy
route.get("/privacy-policy", (req, res) => {
    res.render("privacy-policy", {
        title: "Privacy Policy",
        description: "Privacy Policy for Alhuda SPARK",
        additionalCSS: ["legal.css"],
        layout: "layout"
    });
});

// Terms of Service
route.get("/terms-of-service", (req, res) => {
    res.render("terms-of-service", {
        title: "Terms of Service",
        description: "Terms of Service for Alhuda SPARK",
        additionalCSS: ["legal.css"],
        layout: "layout"
    });
});

// Admin route to view sponsors (protect this in production)
route.get("/admin/sponsors", getAllSponsors);

// *********** POST requests **********

// Sponsorship API endpoints
route.post("/api/sponsor/register", registerSponsor); // For manual payment methods
route.post("/api/sponsor/zeffy-payment", createZeffyPaymentSession); // For Zeffy payments

// Zeffy webhook endpoint
route.post("/api/webhooks/zeffy", express.raw({ type: 'application/json' }), handleZeffyWebhook);

// Team registration endpoint with Cloudinary upload
route.post("/api/team-registration", upload.any(), registerTeam, handleMulterError);

// Vendor registration endpoint (to be implemented)
route.post("/api/vendor-registration", (req, res) => {
    // Placeholder - implement vendor registration logic
    res.json({ success: true, message: "Vendor registration endpoint" });
});

// Contact form endpoint
route.post("/api/contact", submitContactForm);

// *********** Error handling **********

// 404 page
// route.get("*", (req, res) => {
//     res.status(404).render("404", {
//         title: "Page Not Found",
//         description: "The page you're looking for doesn't exist",
//         additionalCSS: ["error.css"],
//         layout: "layout"
//     });
// });

module.exports = route;