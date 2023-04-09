import dotenv from "dotenv";
import express from 'express'
import colors from 'colors'
const port = process.env.PORT || 4000
import mongoose from 'mongoose'
import cors from 'cors'
import jwt from "jsonwebtoken";
import multer from "multer";
const upload = multer({ dest: "uploads/" })

dotenv.config({ path: "./config.env" });

const app = express()
app.use('/uploads', express.static('uploads'))
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cors())
mongoose.set('strictQuery', true);
mongoose.connect(process.env.DATABASE)
    .then((res) => console.log('> Database Connected...'.bgCyan))
    .catch(err => console.log(`> Error while connecting to mongoDB : ${err.message}`.underline.bgRed))

const adminSchema = new mongoose.Schema(
    {
        email: { type: "string" },
        password: { type: "string" },
        type: { type: "string" },
    }
)
const adminUser = mongoose.model("adminUser", adminSchema)

const userSchema = new mongoose.Schema(
    {
        username: { type: "string" },
        email: { type: "string" },
        password: { type: "string" },
        type: { type: "string" },
        blogs: [{ type: mongoose.Schema.Types.ObjectId, ref: 'blogs' }],
        tokens: [
            {
                token: {
                    type: String,
                    required: true,
                },
            },
        ],
    }
)
userSchema.methods.generateAuthToken = async function () {
    try {
        // console.log(this._id);
        let token = jwt.sign({ _id: this._id.toString() }, process.env.JWT_KEY);
        this.tokens = this.tokens.concat({ token: token });
        await this.save();
        // console.log(token)
        return token;
    } catch (err) {
        console.log(err);
    }
};

const newUser = mongoose.model("User", userSchema)


// blog schema
const blogSchema = new mongoose.Schema(
    {
        title: { type: String },
        image: { type: String },
        content: { type: String },
        comments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'comments' }]
    },
    {
        timestamps: true,
    }
);

const Blogs = mongoose.model("blogs", blogSchema);
// blog schema
const commentSchema = new mongoose.Schema(
    {
        title: { type: String },
    },
    {
        timestamps: true,
    }
);
const Comments = mongoose.model("comments", commentSchema);

app.get('/comments', async (req, res) => {
    try {
        // const result = await newUser.find({})
        const result = await Comments.find({})
        // const result = await newUser.findByIdAndDelete({ blogs: new mongoose.Types.ObjectId("642d191e569169eb7c5bbe55") }).populate('blogs')
        if (result) {
            return res.status(200).json(result)
        }
        else {
            return res.status(400).json({ message: "failed to fetch data" })
        }
    }
    catch {
        res.status(500).json({ message: "server error" })
    }
})
app.post('/create-comment', upload.single("image"), async (req, res) => {
    const title = req.body.title
    console.log(title)
    console.log(req.body)
    try {
        if (!title) {
            return res.status(403).json({ message: "post field is empty" })
        }
        const create_new_post = new Comments({ title });
        const newPost = await create_new_post.save();
        if (newPost) {
            return res.status(201).json({ success: "new comment successfully created", newPost });
        }
        else {
            return res.status(404).json({ success: "failed to create comment" });
        }
    } catch (error) {
        res.status(500).json({ error: error })
    }
    res.send('hello from simple server :)')

})
app.post('/store-comment-to-each-blog', async (req, res) => {
    console.log("pro req", req.body)
    try {
        const product = await Blogs.updateOne({ _id: req.body.blogId }, { $addToSet: { comments: req.body.commentId } });

        if (product) {
            res.status(200).send("blog successfully added");
        } else {
            res.status(404).send({ message: "blog id not found" });
        }
    } catch (error) {
        res.status(500).send({ message: "server error", error });
    }
})

app.get('/', async (req, res) => {
    try {
        // const result = await newUser.find({})
        const result = await newUser.find({}).populate('blogs')
        // const result = await newUser.findByIdAndDelete({ blogs: new mongoose.Types.ObjectId("642d191e569169eb7c5bbe55") }).populate('blogs')
        if (result) {
            return res.status(200).json(result)
        }
        else {
            return res.status(400).json({ message: "failed to fetch data" })
        }
    }
    catch {
        res.status(500).json({ message: "server error" })
    }
})

app.get("/:id", async (req, res) => {
    const product = await Blogs.findOne({ _id: req.params.id }).populate("comments");
    if (product) {
        res.send(product);
    } else {
        res.status(404).send({ message: "Product not found" });
    }
});

app.post('/create-post', upload.single("image"), async (req, res) => {
    // const { title, image, content } = req.body
    const title = req.body.title
    const image = req.file ? req.file.filename : 'no image'
    const content = req.body.content
    // console.log(image)
    // console.log(req.file)
    // console.log(title)
    // console.log(content)

    try {
        if (!title || !content) {
            return res.status(403).json({ message: "post field is empty" })
        }
        const create_new_post = new Blogs({ title, image, content });
        const newPost = await create_new_post.save();
        if (newPost) {
            return res.status(201).json({ success: "new post successfully created", newPost });
        }
        else {
            return res.status(404).json({ success: "failed to create post" });
        }
    } catch (error) {
        res.status(500).json({ error: error })
    }
    res.send('hello from simple server :)')

})

app.post('/store-post-to-each-user', async (req, res) => {
    // console.log("pro req", req.body)
    try {
        const product = await newUser.updateOne({ _id: req.body.userId.userId }, { $addToSet: { blogs: req.body.blogId } });

        if (product) {
            res.status(200).send("blog successfully added");
        } else {
            res.status(404).send({ message: "blog id not found" });
        }
    } catch (error) {
        res.status(500).send({ message: "server error", error });
    }
})

// get user
app.post('/get-user', async (req, res) => {
    const userId = req.body.userId
    try {
        const data = await newUser.findOne({ _id: userId }).populate("blogs")
        if (data) {
            res.status(201).send({ message: "get product successful", data: data });
        } else {
            res.status(404).send({ message: "Product failed" });
        }
    } catch (error) {
        res.status(500).send({ message: "server error", error });
    }
})
// user update post
app.put('/update/:id', upload.single("image"), async (req, res) => {
    const { id, blog_index } = req.params
    // const { title, image, content } = req.body
    const title = req.body.title
    const image = req.file ? req.file.filename : null
    const content = req.body.content
    // console.log(req.body)
    // console.log(req.file)
    try {
        await Blogs.findByIdAndUpdate({ _id: id }, { title: title, image: image, content: content }, { new: true })


            .then((result) => {
                res.status(200).json(result)
            })
            .catch((error) => {
                res.status(499).json(error)
            })

    } catch (error) {
        res.status(500).json({ error: error })
    }

})
//user delete post
app.delete('/:id/:product_index', async (req, res) => {
    const { id, product_index } = req.params
    console.log(req.params)
    newUser.findOne({ _id: new mongoose.Types.ObjectId(id) })
        .then((result) => {
            const book = result.blogs[product_index]
            newUser.findOneAndUpdate(
                { _id: new mongoose.Types.ObjectId(id) },
                {
                    $pull: {
                        blogs: book
                    }
                },
                { new: true }
            )
                .then((result) => {
                    // console.log("document", result)
                    res.status(200).send({ message: "user", result }).end();
                })
            // console.log("success", result)
        })
})

// user signup
app.post("/signup", async (req, res) => {
    const { username, email, password } = req.body
    try {
        const userExit = await newUser.findOne({ email: email });

        if (userExit) {
            return res.status(409).json({ message: "user already exits" });
        }
        if (!username || !email || !password) {
            return res.status(403).json({ message: "user field is empty" })
        }
        const user = new newUser({ username, email, password, type: "user" });
        const new_created_User = await user.save();
        if (new_created_User) {
            return res.status(201).json({ success: "user successfully created" });
        }
    } catch (err) {
        return res.status(422).json({ message: "error" });
    }
})
//user login
app.post("/login", async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(403).json({ message: "user field is empty" })
    }
    try {
        const userAvailable = await newUser.findOne({
            email: email,
            password: password,
        });
        const adminAvailable = await adminUser.findOne({
            email: email,
            password: password,
        });

        // console.log('userAvailable', userAvailable);
        if (userAvailable) {
            if (
                password === userAvailable.password &&
                email === userAvailable.email
            ) {
                const token = await userAvailable.generateAuthToken();

                // const token = jwt.sign(
                //   { _id: userAvailable._id },
                //   process.env.JWT_KEY,
                //   { expiresIn: "1h" }
                // );

                res.cookie("jwtoken", token, {
                    expires: new Date(Date.now() + 2592000000),
                    httpOnly: true,
                });

                res.status(200).json({
                    message: "login successful",
                    userAvailable: userAvailable,
                    token,
                    userId: userAvailable._id
                });
            } else {
                res.status(401).json({ message: "email or password incorrect" });
            }
        }
        else if (adminAvailable) {
            if (
                password === adminAvailable.password &&
                email === adminAvailable.email
            ) {
                res.status(200).json({
                    message: "login successful",
                    adminAvailable: adminAvailable,
                });
            } else {
                res.status(401).json({ message: "email or password incorrect" });
            }
        }
        else {
            res.status(404).json({ message: "user not found" });
        }
    } catch (err) {
        res.send({ message: err });
    }
});

// admin signup 
app.post("/admin/signup", async (req, res) => {
    const { email, password } = req.body
    try {
        const userExit = await adminUser.findOne({ email: email });

        if (userExit) {
            return res.status(409).json({ message: "user already exits" });
        }
        if (!email || !password) {
            return res.status(403).json({ message: "field is empty" })
        }
        const user = new adminUser({ email, password, type: "admin" });
        const new_created_User = await user.save();
        if (new_created_User) {
            return res.status(201).json({ success: " successfully created admin" });
        }
    } catch (err) {
        return res.status(500).json({ message: "error" });
    }
})

// admin login
app.post("/admin/login", async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(403).json({ message: "user field is empty" })
    }
    try {
        const userAvailable = await adminUser.findOne({
            email: email,
            password: password,
        });

        // console.log('userAvailable', userAvailable);
        if (userAvailable) {
            if (
                password === userAvailable.password &&
                email === userAvailable.email
            ) {
                res.status(200).json({
                    message: "login successful",
                    userAvailable: userAvailable,
                    userId: userAvailable._id
                });
            } else {
                res.status(401).json({ message: "email or password incorrect" });
            }
        } else {
            res.status(404).json({ message: "user not found" });
        }
    } catch (err) {
        res.send({ message: err });
    }
});

//admin update post // not in use ignore this
// app.put('/admin/update/:id/:blog_id', async (req, res) => {
//     const { id, blog_id } = req.params
//     const { title, image, content } = req.body
//     console.log(req.body)
//     console.log(req)
//     try {
//         // const admin = await adminUser.findOne({ _id: id })
//         // if (admin.type === "admin") {
//         //     await Blogs.findByIdAndUpdate({ _id: blog_id }, { title: title, image: image, content: content }, { new: true })

//         //         .then((result) => {
//         //             res.status(200).json(result)
//         //         })
//         //         .catch((error) => {
//         //             res.status(499).json(error)
//         //         })
//         // }
//     } catch (error) {
//         res.status(500).json({ error: error })
//     }
// })

// admin delete post //not in use
// app.delete('/admin/:admin_id/:id/:product_index', async (req, res) => {
//     const { admin_id, id, product_index } = req.params
//     console.log(req.params)

//     try {
//         const admin = await adminUser.findOne({ _id: admin_id })
//         if (admin.type === "admin") {
//             newUser.findOne({ _id: new mongoose.Types.ObjectId(id) })
//                 .then((result) => {
//                     const book = result.blogs[product_index]
//                     newUser.findOneAndUpdate(
//                         { _id: new mongoose.Types.ObjectId(id) },
//                         {
//                             $pull: {
//                                 blogs: book
//                             }
//                         },
//                         { new: true }
//                     )
//                         .then((result) => {
//                             // console.log("document", result)
//                             res.status(200).json({ message: "user", result }).end();
//                         })
//                     // console.log("success", result)
//                 })
//         }
//         else {
//             res.status(404).json({ message: "your are not admin" })
//         }
//     }
//     catch {
//         res.status(500).json({ message: "server error" })
//     }

// })

app.delete('/admin/:admin_id/:id', async (req, res) => {
    console.log(req.params)
    try {
        const admin = await adminUser.findOne({ _id: new mongoose.Types.ObjectId(req.params.admin_id) })
        if (admin.type === "admin") {
            const result = await Blogs.findByIdAndDelete({ _id: req.params.id })
            if (result) {
                res.status(200).json({ message: "done", result })
            }
            else {
                res.status(500).json({ message: "failed" })
            }
        }
    }
    catch {

        res.status(500).json({ message: "server error" })
    }
})
app.listen(port, () => console.log(`> Server is up and running on port : http://localhost:${port}`.underline.bgMagenta))