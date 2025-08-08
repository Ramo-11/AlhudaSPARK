const session = require("express-session")
const MongoStore = require("connect-mongo")
require("dotenv").config()

if (process.env.NODE_ENV != "production") {
    process.env.MONGODB_URI = process.env.MONGODB_URI_DEV
    process.env.DB_NAME = process.env.DB_NAME_DEV
} else {
    process.env.MONGODB_URI = process.env.MONGODB_URI_PROD
    process.env.DB_NAME = process.env.DB_NAME_PROD
}
// const { getUser } = require('./userController')


// const sessionMiddleware = session({
//     secret: process.env.SESSION_SECRET,
//     resave: false,
//     saveUninitialized: false,
//     store: MongoStore.create({
//         mongoUrl: process.env.MONGODB_URI,
//         databaseName: process.env.DB_NAME,
//         collectionName: "sessions",
//     }),
//     cookie: {
//         maxAge: 5 * 60 * 60 * 1000 // 5 hours in milliseconds
//     }
// })

const userMiddleware = async (req, res, next) => {
    try {
        // const userData = await getUser(req) || {}
        const userData = {}
        res.locals.user = userData.user || null;
        res.locals.userLoggedIn = !!userData.isLoggedIn;
        res.locals.isUserAdmin = !!userData.isAdmin;
        
        if (!req.session) req.session = {};
        req.session.userLoggedIn = !!userData.isLoggedIn;
        req.session.isUserAdmin = !!userData.isAdmin;
    } catch (error) {
        console.error("Error retrieving user data:", error)
        res.locals.user = null
        res.locals.userLoggedIn = false
        res.locals.isUserAdmin = null
    }
    res.locals.currentRoute = req.path
    next()
}


module.exports = { userMiddleware }