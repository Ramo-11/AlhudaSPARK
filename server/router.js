const express = require("express")
require('dotenv').config()
// const { 
//     getAllEvents,
//     getEventsAPI,
//     getCalendarEvents,
//     getEventDetails,  
//     trackEventShare
// } = require("./controllers/eventController");

// const { getContactPage, submitContactForm } = require("./controllers/contactController");

// const { 
//     createDonationPaymentIntent,
//     confirmDonationPayment
// } = require("./controllers/stripeController");

const isProd = process.env.NODE_ENV === "production"
// process.env.STRIPE_PUBLIC_KEY = isProd ? process.env.STRIPE_PUBLIC_KEY_PROD : process.env.STRIPE_PUBLIC_KEY_TEST

const route = express.Router()

// *********** GET requests **********
route.get("/", (req, res) => {
    res.render("index", {
        title: "Home",
        description: "Welcome to Alhuda SPARK 2025 - Midwest Basketball Tournament & Quran Competition",
        additionalCSS: ["index.css"],
        layout: "layout"
    });
});

// route.get("/contact", getContactPage);

// route.get("/privacy-policy", (req, res) => {
//     res.render("privacy-policy", {
//         title: "Privacy Policy",
//         description: "MAS Central Indy's commitment to protecting your privacy",
//         additionalCSS: ["legal.css"],
//         layout: "layout"
//     });
// });

// route.get("/terms-of-service", (req, res) => {
//     res.render("terms-of-service", {
//         title: "Terms of Service",
//         description: "Terms and conditions for using MAS Central Indy's services",
//         additionalCSS: ["legal.css"],
//         layout: "layout"
//     });
// });

// *********** POST requests **********

module.exports = route