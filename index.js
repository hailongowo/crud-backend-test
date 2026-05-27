const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

app.use(express.json());
app.use(cors());

// dns.setDefaultResultOrder("ipv4first");

mongoose
    .connect("mongodb://lamdb:it4409-2026A@ac-xkinmm3-shard-00-00.jpbdhon.mongodb.net:27017,ac-xkinmm3-shard-00-01.jpbdhon.mongodb.net:27017,ac-xkinmm3-shard-00-02.jpbdhon.mongodb.net:27017/it4409-db?ssl=true&replicaSet=atlas-12xdrq-shard-0&authSource=admin&appName=Cluster0")
    .then(() => {
        console.log("Connected to MongoDB"); 
    })
    .catch(err => {
        console.error("Connection Error:", err);
    });


const UserSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Tên không được để trống'],
        minlength: [2, 'Tên phải có ít nhất 2 ký tự'],
        trim: true // Chuẩn hóa: loại bỏ khoảng trắng thừa
    },
    age: {
        type: Number,
        required: [true, 'Tuổi không được để trống'],
        min: [0, 'Tuổi phải >= 0'],
        validate: {
            validator: Number.isInteger, // Chuẩn hóa: Tuổi phải là số nguyên
            message: 'Tuổi phải là số nguyên'
        }
    },
    email: {
        type: String,
        required: [true, 'Email không được để trống'],
        match: [/^\S+@\S+\.\S+$/, 'Email không hợp lệ'],
        unique: true, // Chuẩn hóa: Email duy nhất
        trim: true,
        lowercase: true
    },
    address: {
        type: String,
        trim: true // Chuẩn hóa: loại bỏ khoảng trắng thừa
    }
}); 

const User = mongoose.model('User', UserSchema);


User.syncIndexes()
    .then(() => console.log("Đã đồng bộ indexes thành công"))
    .catch(err => console.error("Lỗi đồng bộ index:", err));

app.get("/api/users", async (req, res) => {
    try {
        // Lấy query params 
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 5;
        const search = req.query.search || "";
        // Tạo query filter cho search 
        const filter = search
            ? {
                $or: [
                    { name: { $regex: search, $options: "i" } },
                    { email: { $regex: search, $options: "i" } },
                    { address: { $regex: search, $options: "i" } }
                ]
            }
            : {};
        // Tính skip 
        const skip = (page - 1) * limit;
        // Query database 
        const users = await User.find(filter)
            .skip(skip)
            .limit(limit);
        // Đếm tổng số documents 
        const total = await User.countDocuments(filter);
        const totalPages = Math.ceil(total / limit);
        // Trả về response 
        res.json({
            page,
            limit,
            total,
            totalPages,
            data: users
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}); 

app.post("/api/users", async (req, res) => {
    try {
        const { name, age, email, address } = req.body;
        // Tạo user mới 
        const newUser = await User.create({ name, age, email, address });
        res.status(201).json({
            message: "Tạo người dùng thành công",
            data: newUser
        });
    } catch (err) {
        if (err.code === 11000 && err.keyPattern && err.keyPattern.email) {
            return res.status(400).json({ error: "Email đã tồn tại" });
        }
        res.status(400).json({ error: err.message });
    }
});

app.put("/api/users/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const { name, age, email, address } = req.body;
        const updatedUser = await User.findByIdAndUpdate(
            id,
            { name, age, email, address },
            { new: true, runValidators: true } // Quan trọng 
        );
        if (!updatedUser) {
            return res.status(404).json({ error: "Không tìm thấy người dùng" });
        }
        res.json({
            message: "Cập nhật người dùng thành công",
            data: updatedUser
        });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

app.delete("/api/users/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const deletedUser = await User.findByIdAndDelete(id);
        if (!deletedUser) {
            return res.status(404).json({ error: "Không tìm thấy người dùng" });
        }
        res.json({ message: "Xóa người dùng thành công" });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

app.listen(3001, () => { 
    console.log("Server running on http://localhost:3001"); 
}); 