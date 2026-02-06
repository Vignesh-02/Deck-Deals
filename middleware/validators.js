var { body, validationResult, matchedData } = require("express-validator");

/**
 * Run validationResult(req). If errors: flash first message (for redirects) and return that message (string).
 * Caller can pass the returned message into the view when doing same-request render (e.g. register).
 * Returns false if no errors.
 */
function handleValidationErrors(req, res, flashKey) {
    var errors = validationResult(req);
    if (!errors.isEmpty()) {
        var first = errors.array()[0];
        req.flash(flashKey || "error", first.msg);
        return first.msg;
    }
    return false;
}

// ---- Auth ----
var registerValidators = [
    body("username")
        .trim()
        .escape()
        .isLength({ min: 5 })
        .withMessage("Username must be at least 5 characters long."),
    body("password")
        .isLength({ min: 8 })
        .withMessage("Password must be at least 8 characters long."),
];

var loginValidators = [
    body("username").trim().notEmpty().withMessage("Username is required."),
    body("password").notEmpty().withMessage("Password is required."),
];

// ---- Deck create (flat body: name, mobile, email, ...) ----
var deckCreateValidators = [
    body("name").trim().escape().notEmpty().withMessage("Deck name is required."),
    body("mobile").trim().escape().notEmpty().withMessage("Contact number is required."),
    body("email").trim().escape().isEmail().withMessage("Please enter a valid email."),
    body("address").trim().escape().notEmpty().withMessage("Address is required."),
    body("price")
        .trim()
        .isFloat({ min: 0 })
        .withMessage("Price must be a positive number."),
    body("image").trim().isURL().withMessage("Please enter a valid image URL."),
    body("stock")
        .trim()
        .isInt({ min: 0 })
        .withMessage("Stock must be 0 or more."),
    body("description").trim().escape(),
];

// ---- Deck update (nested body.group) ----
var deckUpdateValidators = [
    body("group.name").trim().escape().notEmpty().withMessage("Deck name is required."),
    body("group.mobile").trim().escape().notEmpty().withMessage("Contact number is required."),
    body("group.email").trim().escape().isEmail().withMessage("Please enter a valid email."),
    body("group.address").trim().escape().notEmpty().withMessage("Address is required."),
    body("group.price")
        .trim()
        .isFloat({ min: 0 })
        .withMessage("Price must be a positive number."),
    body("group.image").trim().isURL().withMessage("Please enter a valid image URL."),
    body("group.stock")
        .trim()
        .isInt({ min: 0 })
        .withMessage("Stock must be 0 or more."),
    body("group.description").trim().escape(),
];

// ---- Comment (comment.text) ----
var commentValidators = [
    body("comment.text")
        .trim()
        .escape()
        .notEmpty()
        .withMessage("Comment text is required.")
        .isLength({ max: 2000 })
        .withMessage("Comment must be at most 2000 characters."),
];

module.exports = {
    handleValidationErrors,
    registerValidators,
    loginValidators,
    deckCreateValidators,
    deckUpdateValidators,
    commentValidators,
    matchedData,
};
