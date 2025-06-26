const User = require('../models/user')
const getUsers = async (req, res)=>{
    try{
        const users = await User.find();
        if(users == null){
            return res.status(404).json("No Users Found")
        }
        return res.status(200).json({"users": users});
    }catch(error){
        return res.status(500).json({"error": error.message});
    }
}

const createUser = async (req, res)=>{
    const body = req.body;
    try{
        if(body == null){
            return res.status(400).json("Please provide valid information")
        }
        const user = new User(body);
        const createdUser = await user.save();
        console.log(createdUser);
        return res.status(200).json({"users": createdUser});
    }catch(error){
        return res.status(500).json({"error": error.message});
    }
};

module.exports = {getUsers, createUser};