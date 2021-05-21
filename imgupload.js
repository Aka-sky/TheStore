var multer = require("multer");
var path = require("path");

//Set storage engine image uploads
const storage = multer.diskStorage({
    destination: "./public/images",
    filename: function (req, file, cb) {
        cb(null, file.fieldname + Date.now() + path.extname(file.originalname));
    },
});

//Init image upload
const upload = multer({
    storage: storage,
    limits: { fileSize: 1000000 },
    fileFilter: function (req, file, cb) {
        checkFileType(file, cb);
    },
}).single("upImg");

//Check File type
function checkFileType(file, cb) {
    // allowed ext
    const fileTypes = /jpeg|jpg|png|gif/;
    //Check ext
    const extName = fileTypes.test(path.extname(file.originalname).toLowerCase());
    // Check mime
    const mimeType = fileTypes.test(file.mimetype);

    if (mimeType && extName) {
        return cb(null, true);
    } else {
        cb("Error : Images only!!!!!!");
    }
}

module.exports = upload;