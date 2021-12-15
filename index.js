const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const ejsMate = require('ejs-mate');
const methodOverride = require('method-override');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const morgan = require('morgan');
const AppError = require('./utils/AppError');
const helmet = require('helmet');
const dbUrl = process.env.DB_URL

const flash = require('connect-flash');
const storeRoutes = require('./routes/store');
const checkoutRoutes = require('./routes/checkout');
const webhookRoutes = require('./routes/webhooks');


if (process.env.NODE_ENV !== 'production') { //if we ar enot in production mode
    require('dotenv').config();//require our .env file,
}


// mongoose.connect('mongodb://localhost:27017/neon-noir');
mongoose.connect(process.env.DB_URL);

const db = mongoose.connection;
db.on("error", console.error.bind(console, "connection error:"));
db.once("open", () => {
    console.log("Database Connected")
})

const app = express();
app.enable("trust proxy");

const unless = function (path, middleware) { // if any route does not match this path, run the middleware. If it does, don't run the middleware.
    return function (req, res, next) {
        if (path === req.path) {
            return next();
        } else {
            return middleware(req, res, next);
        }
    };
};



app.engine('ejs', ejsMate);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(unless('/webhooks/stripe', express.json())); //use json parsing for all routes except the stripe webhook
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride('_method'));
// app.use(morgan('tiny'))


app.use(express.static(path.join(__dirname, 'public')))

const store = MongoStore.create({
    mongoUrl: process.env.DB_URL,
    touchAfter: 24 * 60 * 60,
    crypto: {
        secret: process.env.SESSION_STORE
    }
});

store.on('error', function (e) {
    console.log('SESSION STORE ERROR', e)
})
const sessionConfig = {
    store,
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    unset: 'destroy',
    name: 'sessionId',
    cookie: { //this is for the cookie our server sends to the browser
        httpOnly: true, //looks like this is already default, but a good security feature
        expires: Date.now() + 1000 * 60 * 60 * 24, //since expirations are in milliseconds, we add a day to the date
        maxAge: 1000 * 60 * 60 * 24 //also a day
    }
}

app.use(session(sessionConfig));
app.use(flash());
app.use(helmet())

const scriptSrcUrls = [
    "https://stackpath.bootstrapcdn.com",
    "https://kit.fontawesome.com",
    "https://cdnjs.cloudflare.com",
    "https://cdn.jsdelivr.net",
    "https://unpkg.com/aos@next/dist/aos.js",
    "https://code.jquery.com/jquery-3.6.0.min.js"
];
const styleSrcUrls = [
    "https://kit-free.fontawesome.com",
    "https://stackpath.bootstrapcdn.com",
    "https://fonts.googleapis.com",
    "https://use.fontawesome.com",
    "https://cdn.jsdelivr.net",
    "https://cdnjs.cloudflare.com",
    "https://unpkg.com"
];
const childSrcUrls = [
    "https://www.youtube.com",
    "https://drive.google.com"
]

const fontSrcUrls = [
    "https://fonts.gstatic.com",
    "https://cdnjs.cloudflare.com",
];

const imageSrcUrls = [
    "https://images.unsplash.com",
    "https://i.ytimg.com",
    "https://files.cdn.printful.com",
    "https://globehall.com"
]

app.use(
    helmet.contentSecurityPolicy({
        directives: {
            defaultSrc: [
            ],
            connectSrc: ["'self'"],
            scriptSrc: ["'unsafe-inline'", "'self'", "'unsafe-eval'", ...scriptSrcUrls],
            styleSrc: ["'self'", "'unsafe-inline'", ...styleSrcUrls],
            workerSrc: ["'self'", "blob:"],
            childSrc: ["blob:", ...childSrcUrls],
            objectSrc: [],
            imgSrc: ["'self'", "blob:", "data:", ...imageSrcUrls],
            fontSrc: ["'self'", ...fontSrcUrls],
        },
    })
);


app.use((req, res, next) => {
    res.locals.success = req.flash('success');
    res.locals.error = req.flash('error');
    res.locals.path = req.path;
    next();
})

app.use('/store', storeRoutes);
app.use('/store/checkout', checkoutRoutes);
app.use('/webhooks', webhookRoutes);

app.get('/', (req, res) => {
    res.render('home')
})

app.get('/shows', (req, res) => {
    res.render('shows')
})

app.get('/music', (req, res) => {
    res.render('music')
})


app.all('*', (req, res, next) => {
    next(new AppError('Page Not Found', 404))
})

app.use((err, req, res, next) => {
    const { statusCode = 500 } = err;
    if (!err.message) err.message = 'Oh No, Something Went Wrong!'
    res.status(statusCode).render('error', { err })
    // res.redirect(`${req.originalUrl}`) //save this for flash error redirection
})

const port = process.env.PORT || 3000

app.listen(port, () => {
    console.log(`SERVING ON PORT ${port}`)
})

