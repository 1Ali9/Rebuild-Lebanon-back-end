
const allowedOrigins =require('./allowedOrigins')

const corsOptions = {
    origin: (origin,Callback)=>{
        if(allowedOrigins.indexOf(origin) !== -1 || !origin){
            Callback(null,true)
        }else{
            Callback(new Error('Not allowed by CORS'))
        }
    },
    Credentials:true,
    optionsSuccessStatus: 200
}

module.exports = corsOptions